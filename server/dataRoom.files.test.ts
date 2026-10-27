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
type Request = { params: { id: string }; query: { mode?: string } };
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
