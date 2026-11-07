import type { Express } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(),
  getRoomActor: vi.fn(),
  privateHeaders: vi.fn(),
  roomDb: vi.fn(),
  audit: vi.fn(),
  storageGetSignedUrl: vi.fn(),
  decryptDocument: vi.fn(),
  safeFilename: vi.fn((filename: string) => filename),
  fetch: vi.fn(),
}));

vi.mock("./_core/context", () => ({ createContext: mocks.createContext }));
vi.mock("./dataRoomAccess", () => ({
  getRoomActor: mocks.getRoomActor,
  privateHeaders: mocks.privateHeaders,
  roomDb: mocks.roomDb,
  audit: mocks.audit,
}));
vi.mock("./storage", () => ({ storageGetSignedUrl: mocks.storageGetSignedUrl }));
vi.mock("./dataRoomCrypto", () => ({
  decryptDocument: mocks.decryptDocument,
  safeFilename: mocks.safeFilename,
}));

import { registerDataRoomFiles } from "./dataRoomFiles";

type RoomActor = { id: number; name: string; email: string; role: "admin" | "investor"; authSource: "owner" | "password"; expiresAt: number | null };
type RoomDocument = {
  id: number;
  title: string;
  filename: string;
  storageKey: string;
  sizeBytes: number;
  version: number;
  published: boolean;
  allowDownload: boolean;
  archived: boolean;
};
type Request = { params: { id: string }; query: { mode?: string; chunk?: string; version?: string } };
type Response = {
  statusCode: number;
  body?: unknown;
  sent?: Buffer;
  headersSent: boolean;
  headers: Map<string, string>;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => Response;
  json: (body: unknown) => void;
  send: (body: Buffer) => void;
};
type DeliveryHandler = (req: Request, res: Response) => Promise<void>;

const investor: RoomActor = {
  id: 42,
  name: "Approved Investor",
  email: "investor@example.test",
  role: "investor",
  authSource: "password",
  expiresAt: null,
};

function roomDocument(overrides: Partial<RoomDocument> = {}): RoomDocument {
  return {
    id: 7,
    title: "Financial Model",
    filename: "financial-model.xlsx",
    storageKey: "investor-room/private-object.enc",
    sizeBytes: 0,
    version: 3,
    published: true,
    allowDownload: true,
    archived: false,
    ...overrides,
  };
}

/** Provides precisely the select/from/where/limit path used by the delivery route. */
function selectQueue(...results: RoomDocument[][]) {
  const select = vi.fn(() => {
    const rows = results.shift() ?? [];
    const limit = vi.fn().mockResolvedValue(rows);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    return { from };
  });
  return { select };
}

function response(): Response {
  const result: Response = {
    statusCode: 200,
    headersSent: false,
    headers: new Map(),
    setHeader(name, value) { this.headers.set(name, value); },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; this.headersSent = true; },
    send(body) { this.sent = body; this.headersSent = true; },
  };
  return result;
}

function registerHandler(): DeliveryHandler {
  let captured: DeliveryHandler | undefined;
  const app = {
    use: vi.fn(),
    get: vi.fn((_path: string, handler: DeliveryHandler) => { captured = handler; }),
  } as unknown as Express;
  registerDataRoomFiles(app);
  if (!captured) throw new Error("Data-room document delivery handler was not registered");
  return captured;
}

function successfulStorage(bytes: Buffer) {
  mocks.storageGetSignedUrl.mockResolvedValue("https://storage.example.test/private-object.enc");
  mocks.fetch.mockResolvedValue({ ok: true, arrayBuffer: async () => Buffer.from("encrypted-object") });
  mocks.decryptDocument.mockReturnValue(bytes);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.privateHeaders.mockImplementation(({res}: {res: Response}) => {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  });
  mocks.createContext.mockResolvedValue({ req: {}, res: {} });
});

describe("private data-room document delivery", () => {
  it("returns 401 before database, private storage, or fetch access when no investor login is active", async () => {
    const handler = registerHandler();
    const res = response();
    mocks.getRoomActor.mockResolvedValue(null);

    await handler({ params: { id: "7" }, query: { mode: "view" } }, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "An active investor login is required." });
    expect(mocks.roomDb).not.toHaveBeenCalled();
    expect(mocks.storageGetSignedUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("delivers a valid Excel workbook with its Office MIME type and attachment disposition", async () => {
    const bytes = Buffer.from("xlsx workbook formula bytes: =SUM(A1:A2)");
    const doc = roomDocument({ sizeBytes: bytes.length });
    const handler = registerHandler();
    const res = response();
    mocks.getRoomActor.mockResolvedValueOnce(investor).mockResolvedValueOnce(investor);
    mocks.roomDb.mockResolvedValue(selectQueue([doc], [doc]));
    successfulStorage(bytes);

    await handler({ params: { id: "7" }, query: { mode: "view" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="financial-model\.xlsx"/);
    expect(res.sent).toEqual(bytes);
    expect(mocks.audit).toHaveBeenCalledWith(investor.email, "Document downloaded", "Financial Model — version 3");
  });

  it("treats an Excel mode=view request as a download and denies it when downloads are disabled", async () => {
    const doc = roomDocument({ allowDownload: false, sizeBytes: 10 });
    const handler = registerHandler();
    const res = response();
    mocks.getRoomActor.mockResolvedValue(investor);
    mocks.roomDb.mockResolvedValue(selectQueue([doc]));

    await handler({ params: { id: "7" }, query: { mode: "view" } }, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Download is not enabled for this document." });
    expect(mocks.storageGetSignedUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("blocks bytes after the private fetch when access is revoked mid-flight", async () => {
    const bytes = Buffer.from("xlsx contents");
    const doc = roomDocument({ sizeBytes: bytes.length });
    const handler = registerHandler();
    const res = response();
    mocks.getRoomActor.mockResolvedValueOnce(investor).mockResolvedValueOnce(null);
    mocks.roomDb.mockResolvedValue(selectQueue([doc], [doc]));
    successfulStorage(bytes);

    await handler({ params: { id: "7" }, query: { mode: "download" } }, res);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Access is no longer available." });
    expect(res.sent).toBeUndefined();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("keeps an allowed PDF view inline, including when PDF downloads are disabled", async () => {
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj\n%%EOF\n");
    const doc = roomDocument({ filename: "investment-teaser.pdf", allowDownload: false, sizeBytes: bytes.length });
    const handler = registerHandler();
    const res = response();
    mocks.getRoomActor.mockResolvedValueOnce(investor).mockResolvedValueOnce(investor);
    mocks.roomDb.mockResolvedValue(selectQueue([doc], [doc]));
    successfulStorage(bytes);

    await handler({ params: { id: "7" }, query: { mode: "view" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toMatch(/^inline; filename="investment-teaser\.pdf"/);
    expect(res.sent).toEqual(bytes);
    expect(mocks.audit).toHaveBeenCalledWith(investor.email, "Document viewed", "Financial Model — version 3");
  });

  it.each([
    ["hidden", []],
    ["draft", [roomDocument({ published: false })]],
    ["archived", []],
  ] as const)("does not expose %s documents", async (_state, firstQuery) => {
    const handler = registerHandler();
    const res = response();
    mocks.getRoomActor.mockResolvedValue(investor);
    mocks.roomDb.mockResolvedValue(selectQueue([...firstQuery]));

    await handler({ params: { id: "7" }, query: { mode: "view" } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Document not found." });
    expect(mocks.storageGetSignedUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});


describe("version-bound private document chunks", () => {
  const chunkBytes = 1048576;
  function chunkRequest(index: string, version = "3", mode = "view"): Request { return { params: { id: "7" }, query: { chunk: index, version, mode } }; }
  it.each([Math.ceil(6.3 * 1024 * 1024), 15 * 1024 * 1024])("reconstructs %i bytes using <=1MiB no-store responses with safe metadata only", async size => {
    const bytes = Buffer.alloc(size, 45); bytes.write("%PDF-1.7\n"); bytes.write("\n%%EOF\n", size - 7);
    const doc = roomDocument({ filename: "investment-report.pdf", sizeBytes: size, allowDownload: false });
    const totalChunks = Math.ceil(size / chunkBytes), handler = registerHandler(), parts: Buffer[] = [];
    mocks.getRoomActor.mockResolvedValue(investor);
    mocks.roomDb.mockResolvedValue(selectQueue(...Array.from({ length: totalChunks * 2 }, () => [doc])));
    successfulStorage(bytes);
    for (let index = 0; index < totalChunks; index++) {
      const res = response(); await handler(chunkRequest(String(index)), res);
      expect(res.statusCode).toBe(200); expect(res.sent!.length).toBeLessThanOrEqual(chunkBytes);
      expect(res.headers.get("Content-Length")).toBe(String(res.sent!.length));
      expect(res.headers.get("X-Document-Size")).toBe(String(size));
      expect(res.headers.get("X-Document-Version")).toBe("3");
      expect(res.headers.get("X-Document-Chunk-Count")).toBe(String(totalChunks));
      expect(res.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
      expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
      expect(JSON.stringify([...res.headers])).not.toContain(doc.storageKey); expect(res.body).toBeUndefined(); parts.push(res.sent!);
    }
    expect(Buffer.concat(parts).equals(bytes)).toBe(true); expect(mocks.getRoomActor).toHaveBeenCalledTimes(totalChunks * 2);
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });
  it("rejects legacy whole-body responses above 3MiB before storage fetch with clear 413", async () => {
    const doc = roomDocument({ filename: "report.pdf", sizeBytes: 3 * 1024 * 1024 + 1 });
    const handler = registerHandler(), res = response();
    mocks.getRoomActor.mockResolvedValue(investor); mocks.roomDb.mockResolvedValue(selectQueue([doc]));
    await handler({ params: { id: "7" }, query: { mode: "view" } }, res);
    expect(res.statusCode).toBe(413); expect(res.body).toEqual({ error: expect.stringContaining("chunked delivery") });
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
  it.each([
    ["-1", "3", 404], ["1.5", "3", 404], ["00", "3", 404], ["0", "", 404], ["0", "3.0", 404], ["0", "2", 409], ["2", "3", 416],
  ])("rejects invalid index=%s or version=%s with %i before storage", async (chunk, version, status) => {
    const doc = roomDocument({ filename: "report.pdf", sizeBytes: chunkBytes + 25 }), handler = registerHandler(), res = response();
    mocks.getRoomActor.mockResolvedValue(investor); mocks.roomDb.mockResolvedValue(selectQueue([doc]));
    await handler(chunkRequest(String(chunk), String(version)), res);
    expect(res.statusCode).toBe(status); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("denies PDF download chunks while permitting view when download is disabled", async () => {
    const doc = roomDocument({ filename: "report.pdf", sizeBytes: 50, allowDownload: false }), handler = registerHandler(), res = response();
    mocks.getRoomActor.mockResolvedValue(investor); mocks.roomDb.mockResolvedValue(selectQueue([doc]));
    await handler(chunkRequest("0", "3", "download"), res);
    expect(res.statusCode).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("only allows Excel chunk delivery in explicit permitted download mode", async () => {
    const bytes = Buffer.from("test-workbook-contents"), doc = roomDocument({ sizeBytes: bytes.length });
    const handler = registerHandler(), view = response(), download = response();
    mocks.getRoomActor.mockResolvedValue(investor); mocks.roomDb.mockResolvedValue(selectQueue([doc], [doc], [doc]));
    successfulStorage(bytes);
    await handler(chunkRequest("0"), view); expect(view.statusCode).toBe(400); expect(mocks.fetch).not.toHaveBeenCalled();
    await handler(chunkRequest("0", "3", "download"), download); expect(download.statusCode).toBe(200);
    expect(download.headers.get("Content-Disposition")).toMatch(/^attachment/); expect(download.sent!.equals(bytes)).toBe(true);
  });
  it.each([
    ["replaced version", { version: 4 }, 409], ["changed storage", { storageKey: "another-private-key" }, 409],
    ["archived", { archived: true }, 403], ["unpublished", { published: false }, 403], ["download disabled", { allowDownload: false }, 403],
  ] as const)("blocks bytes if %s occurs during fetch", async (_label, change, status) => {
    const bytes = Buffer.from("%PDF-1.7\n%%EOF\n"), doc = roomDocument({ filename: "report.pdf", sizeBytes: bytes.length });
    const handler = registerHandler(), res = response(); mocks.getRoomActor.mockResolvedValue(investor);
    mocks.roomDb.mockResolvedValue(selectQueue([doc], [{ ...doc, ...change }])); successfulStorage(bytes);
    await handler(chunkRequest("0", "3", "download"), res);
    expect(res.statusCode).toBe(status); expect(res.sent).toBeUndefined(); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("blocks a view chunk after account revocation during storage fetch", async () => {
    const bytes = Buffer.from("%PDF-1.7\n%%EOF\n"), doc = roomDocument({ filename: "report.pdf", sizeBytes: bytes.length });
    const handler = registerHandler(), res = response(); mocks.getRoomActor.mockResolvedValueOnce(investor).mockResolvedValueOnce(null);
    mocks.roomDb.mockResolvedValue(selectQueue([doc], [doc])); successfulStorage(bytes);
    await handler(chunkRequest("0"), res); expect(res.statusCode).toBe(403); expect(res.sent).toBeUndefined();
  });
});
