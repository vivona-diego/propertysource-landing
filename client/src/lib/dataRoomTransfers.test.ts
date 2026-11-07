import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DOCUMENT_CHUNK_BYTES,
  createDocumentObjectUrl,
  documentTransferErrorMessage,
  fetchDocumentBlob,
  isTransferCancelled,
  type DocumentSnapshot,
} from "./dataRoomTransfers";

const metadata = (sizeBytes: number, version = 3): DocumentSnapshot => ({ id: 17, filename: "investor.pdf", sizeBytes, version });
const options = (signal = new AbortController().signal) => ({ mode: "view" as const, signal });
function chunkResponse(bytes: Uint8Array, document: DocumentSnapshot, overrides: Record<string, string> = {}) {
  return {
    ok: true, status: 200,
    headers: new Headers({
      "X-Document-Size": String(document.sizeBytes),
      "X-Document-Version": String(document.version),
      "X-Document-Chunk-Count": String(Math.ceil(document.sizeBytes / DOCUMENT_CHUNK_BYTES)),
      ...overrides,
    }),
    arrayBuffer: vi.fn(async () => bytes.slice().buffer),
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("authenticated document chunk transfers", () => {
  it("assembles a 6.3 MB PDF byte-for-byte with sequential 1 MiB chunks and progress", async () => {
    const bytes = Uint8Array.from({ length: 6_300_000 }, (_, index) => index % 251);
    const document = metadata(bytes.length);
    let concurrent = 0;
    let maxConcurrent = 0;
    fetchMock.mockImplementation(async (url: string) => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await Promise.resolve();
      const index = Number(new URL(url, "https://private.example").searchParams.get("chunk"));
      concurrent -= 1;
      return chunkResponse(bytes.slice(index * DOCUMENT_CHUNK_BYTES, (index + 1) * DOCUMENT_CHUNK_BYTES), document);
    });
    const onProgress = vi.fn();
    const blob = await fetchDocumentBlob(document, { ...options(), onProgress });
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBe(bytes.length);
    expect(Buffer.from(await blob.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(maxConcurrent).toBe(1);
    fetchMock.mock.calls.forEach(([url, init], index) => {
      expect(url).toBe(`/api/data-room/documents/17?mode=view&chunk=${index}&version=3`);
      expect(init).toMatchObject({ credentials: "same-origin", cache: "no-store", redirect: "error" });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
    expect(onProgress.mock.calls[0][0]).toEqual({ loadedBytes: 0, totalBytes: bytes.length, percent: 0 });
    expect(onProgress.mock.lastCall?.[0]).toEqual({ loadedBytes: bytes.length, totalBytes: bytes.length, percent: 100 });
  });

  it("snapshots expected size and version before any asynchronous work", async () => {
    const document = metadata(DOCUMENT_CHUNK_BYTES + 1);
    const expected = { ...document };
    fetchMock.mockImplementation(async (_url: string) => {
      const index = fetchMock.mock.calls.length - 1;
      document.version = 99;
      document.sizeBytes = 42;
      return chunkResponse(new Uint8Array(index === 0 ? DOCUMENT_CHUNK_BYTES : 1), expected);
    });
    const blob = await fetchDocumentBlob(document, options());
    expect(blob.size).toBe(expected.sizeBytes);
    expect(fetchMock.mock.calls[1][0]).toContain("version=3");
  });

  it.each([
    ["X-Document-Version", "4"],
    ["X-Document-Size", "9"],
    ["X-Document-Chunk-Count", "2"],
  ])("rejects mismatching %s before reading any bytes", async (header, value) => {
    const document = metadata(3);
    const response = chunkResponse(new Uint8Array([1, 2, 3]), document, { [header]: value });
    fetchMock.mockResolvedValue(response);
    await expect(fetchDocumentBlob(document, options())).rejects.toThrow(/changed|inconsistent/);
    expect(response.arrayBuffer).not.toHaveBeenCalled();
  });

  it("rejects a document version change on a later chunk", async () => {
    const document = metadata(DOCUMENT_CHUNK_BYTES + 1);
    fetchMock.mockResolvedValueOnce(chunkResponse(new Uint8Array(DOCUMENT_CHUNK_BYTES), document));
    fetchMock.mockResolvedValueOnce(chunkResponse(new Uint8Array([1]), document, { "X-Document-Version": "4" }));
    await expect(fetchDocumentBlob(document, options())).rejects.toThrow(/changed/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([2, 4])("rejects a short or oversized chunk (%i bytes instead of 3)", async size => {
    const document = metadata(3);
    fetchMock.mockResolvedValue(chunkResponse(new Uint8Array(size), document));
    await expect(fetchDocumentBlob(document, options())).rejects.toThrow(/incomplete/);
  });

  it("rejects an incorrect final-chunk length", async () => {
    const document = metadata(DOCUMENT_CHUNK_BYTES + 2);
    fetchMock.mockResolvedValueOnce(chunkResponse(new Uint8Array(DOCUMENT_CHUNK_BYTES), document));
    fetchMock.mockResolvedValueOnce(chunkResponse(new Uint8Array([1]), document));
    await expect(fetchDocumentBlob(document, options())).rejects.toThrow(/incomplete/);
  });

  it.each(["", "abc", "1.5", "9007199254740992"])("rejects malformed header value %s", async value => {
    const document = metadata(3);
    fetchMock.mockResolvedValue(chunkResponse(new Uint8Array(3), document, { "X-Document-Size": value }));
    await expect(fetchDocumentBlob(document, options())).rejects.toThrow(/metadata/);
  });

  it("rejects missing transfer headers", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, headers: new Headers(), arrayBuffer: vi.fn() });
    await expect(fetchDocumentBlob(metadata(3), options())).rejects.toThrow(/metadata/);
  });

  it.each([[401, /session has expired/], [403, /permission/], [404, /no longer available/], [409, /changed/], [412, /changed/], [429, /Too many/]])("explains HTTP %i without exposing response contents", async (status, message) => {
    const readBytes = vi.fn();
    fetchMock.mockResolvedValue({ ok: false, status, arrayBuffer: readBytes });
    await expect(fetchDocumentBlob(metadata(3), options())).rejects.toThrow(message);
    expect(readBytes).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cancels before requesting any bytes", async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await fetchDocumentBlob(metadata(3), options(controller.signal)).catch(error => error);
    expect(isTransferCancelled(error)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes cancellation into an in-flight fetch", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    }));
    const result = fetchDocumentBlob(metadata(3), options(controller.signal));
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("cancels during body reading without assembling a blob or fetching the next chunk", async () => {
    const controller = new AbortController();
    const document = metadata(DOCUMENT_CHUNK_BYTES + 1);
    const response = chunkResponse(new Uint8Array(DOCUMENT_CHUNK_BYTES), document);
    response.arrayBuffer.mockImplementation(async () => { controller.abort(); return new ArrayBuffer(DOCUMENT_CHUNK_BYTES); });
    fetchMock.mockResolvedValue(response);
    const createUrl = vi.spyOn(URL, "createObjectURL");
    await expect(createDocumentObjectUrl(document, options(controller.signal))).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createUrl).not.toHaveBeenCalled();
  });

  it.each([
    ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["legacy.xls", "application/vnd.ms-excel"],
    ["investor.pdf", "application/pdf"],
  ])("uses the same mode=download helper for %s", async (filename, mime) => {
    const document = { ...metadata(3), filename };
    fetchMock.mockResolvedValue(chunkResponse(new Uint8Array([0, 127, 255]), document));
    const blob = await fetchDocumentBlob(document, { ...options(), mode: "download" });
    expect(blob.type).toBe(mime);
    expect(fetchMock.mock.calls[0][0]).toContain("mode=download");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([0, 127, 255]));
  });

  it("creates a local PDF URL only after full assembly and revokes it once", async () => {
    const document = metadata(3);
    fetchMock.mockResolvedValue(chunkResponse(new Uint8Array([1, 2, 3]), document));
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:local-authorized-pdf");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const loaded = await createDocumentObjectUrl(document, options());
    expect(loaded.url).toBe("blob:local-authorized-pdf");
    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect((createUrl.mock.calls[0][0] as Blob).type).toBe("application/pdf");
    loaded.dispose();
    loaded.dispose();
    expect(revokeUrl).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledWith("blob:local-authorized-pdf");
  });

  it.each([0, -1, 15 * DOCUMENT_CHUNK_BYTES + 1, 1.5])("rejects invalid document size %i before fetch", async size => {
    await expect(fetchDocumentBlob(metadata(size), options())).rejects.toThrow(/invalid size/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not preview Excel files", async () => {
    await expect(fetchDocumentBlob({ ...metadata(3), filename: "sheet.xlsx" }, options())).rejects.toThrow(/Only PDFs/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps network and tRPC authorization errors to useful user-facing text", () => {
    expect(documentTransferErrorMessage(new TypeError("Failed to fetch"))).toMatch(/connection/);
    expect(documentTransferErrorMessage({ data: { code: "UNAUTHORIZED" } })).toMatch(/session has expired/);
    expect(documentTransferErrorMessage({ data: { code: "FORBIDDEN" } })).toMatch(/permission/);
  });
});
