import type { DataRoomDocument } from "./dataRoom";

export const DOCUMENT_CHUNK_BYTES = 1024 * 1024;
const MAX_DOCUMENT_BYTES = 15 * DOCUMENT_CHUNK_BYTES;

export type DocumentSnapshot = Pick<DataRoomDocument, "id" | "filename" | "sizeBytes" | "version">;
export type DocumentTransferProgress = { loadedBytes: number; totalBytes: number; percent: number };
export type DocumentTransferOptions = {
  mode: "view" | "download";
  signal: AbortSignal;
  onProgress?: (progress: DocumentTransferProgress) => void;
};

export class DocumentTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentTransferError";
  }
}

export function isTransferCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function documentTransferErrorMessage(error: unknown): string {
  if (error instanceof DocumentTransferError) return error.message;
  const code = (error as { data?: { code?: string } } | null)?.data?.code;
  if (code === "UNAUTHORIZED") return "Your session has expired. Sign in again before transferring this document.";
  if (code === "FORBIDDEN") return "You no longer have permission to transfer this document. Contact the room administrator.";
  if (code === "PAYLOAD_TOO_LARGE") return "This file is too large. Choose a PDF or Excel file no larger than 15 MB (15 MiB).";
  if (code === "TOO_MANY_REQUESTS") return "Too many transfer requests. Wait a moment, then try again.";
  if (code === "CONFLICT") return "This document or upload has changed. Refresh the document list and try again.";
  if (code === "NOT_FOUND") return "This document or upload is no longer available. Refresh the page and try again.";
  if (code === "BAD_REQUEST") return "The document could not be validated. Check the file and try the upload again.";
  if (code === "SERVICE_UNAVAILABLE") return "Secure document transfers are temporarily unavailable. Please try again shortly.";
  return "The secure document transfer was interrupted. Check your connection and try again.";
}

function checkCancelled(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Document transfer cancelled.", "AbortError");
}

function headerInteger(response: Response, name: string): number {
  const value = response.headers.get(name);
  if (value === null || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new DocumentTransferError("The server returned incomplete document metadata. Please retry or contact the room administrator.");
  }
  return Number(value);
}

function responseError(status: number): DocumentTransferError {
  if (status === 401) return new DocumentTransferError("Your session has expired. Sign in again to access this document.");
  if (status === 403) return new DocumentTransferError("You do not have permission to access or download this document. Contact the room administrator.");
  if (status === 404 || status === 410) return new DocumentTransferError("This document is no longer available. Refresh the document list.");
  if (status === 409 || status === 412 || status === 416) return new DocumentTransferError("This document has changed. Close the viewer, refresh the document list, and open the latest version.");
  if (status === 429) return new DocumentTransferError("Too many document requests. Wait a moment, then try again.");
  return new DocumentTransferError("The server could not transfer this document. Please try again shortly.");
}

/** Fetch only authorized, bounded chunks; never persist bytes or use a public storage URL. */
export async function fetchDocumentBlob(document: DocumentSnapshot, options: DocumentTransferOptions): Promise<Blob> {
  // Snapshot before the first await so a metadata refresh cannot mix document versions.
  const { id, filename, sizeBytes, version } = document;
  const { mode, signal, onProgress } = options;
  checkCancelled(signal);
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(version) || version < 1 ||
      !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new DocumentTransferError("This document has invalid size or version information. Refresh the document list before trying again.");
  }
  if (mode === "view" && !filename.toLowerCase().endsWith(".pdf")) {
    throw new DocumentTransferError("Only PDFs can be previewed. Download this spreadsheet to open it in Excel.");
  }
  const chunkCount = Math.ceil(sizeBytes / DOCUMENT_CHUNK_BYTES);
  const parts: ArrayBuffer[] = [];
  let loadedBytes = 0;
  onProgress?.({ loadedBytes, totalBytes: sizeBytes, percent: 0 });

  // Strictly sequential to bound memory and avoid overwhelming the authenticated route.
  for (let index = 0; index < chunkCount; index += 1) {
    checkCancelled(signal);
    const query = new URLSearchParams({ mode, chunk: String(index), version: String(version) });
    const response = await fetch(`/api/data-room/documents/${id}?${query}`, {
      signal,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: { Accept: "application/octet-stream" },
    });
    checkCancelled(signal);
    if (!response.ok) throw responseError(response.status);
    const returnedSize = headerInteger(response, "X-Document-Size");
    const returnedVersion = headerInteger(response, "X-Document-Version");
    const returnedCount = headerInteger(response, "X-Document-Chunk-Count");
    if (returnedSize !== sizeBytes || returnedVersion !== version || returnedCount !== chunkCount) {
      throw new DocumentTransferError("This document has changed or its transfer metadata is inconsistent. Refresh the document list and open the latest version.");
    }
    const bytes = await response.arrayBuffer();
    checkCancelled(signal);
    const expectedLength = Math.min(DOCUMENT_CHUNK_BYTES, sizeBytes - index * DOCUMENT_CHUNK_BYTES);
    if (bytes.byteLength !== expectedLength) {
      throw new DocumentTransferError("The document transfer was incomplete. Please retry; no partial file has been opened or saved.");
    }
    parts.push(bytes);
    loadedBytes += bytes.byteLength;
    onProgress?.({ loadedBytes, totalBytes: sizeBytes, percent: Math.floor(loadedBytes / sizeBytes * 100) });
  }
  checkCancelled(signal);
  const type = filename.toLowerCase().endsWith(".pdf") ? "application/pdf"
    : filename.toLowerCase().endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/vnd.ms-excel";
  return new Blob(parts, { type });
}

/** The caller owns this in-memory URL and must dispose it when closing/unmounting. */
export async function createDocumentObjectUrl(document: DocumentSnapshot, options: DocumentTransferOptions) {
  const blob = await fetchDocumentBlob(document, options);
  checkCancelled(options.signal);
  const url = URL.createObjectURL(blob);
  let disposed = false;
  return {
    url,
    dispose: () => {
      if (!disposed) URL.revokeObjectURL(url);
      disposed = true;
    },
  };
}
