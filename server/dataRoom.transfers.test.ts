import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTableColumns, getTableName, type SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getRoomActor: vi.fn(), throttle: vi.fn(), storagePut: vi.fn(), storageGetSignedUrl: vi.fn(), fetch: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./_core/env", () => ({ ENV: { cookieSecret: "transfer-test-encryption-key-only", ownerOpenId: "upload-test-owner" } }));
vi.mock("./dataRoomAccess", async importOriginal => {
  const original = await importOriginal<typeof import("./dataRoomAccess")>();
  return { ...original, getRoomActor: mocks.getRoomActor, throttle: mocks.throttle };
});
vi.mock("./storage", () => ({ storagePut: mocks.storagePut, storageGetSignedUrl: mocks.storageGetSignedUrl }));
import { roomAccounts, roomAudit, roomAuthLimits, roomDocuments, roomUploadChunks, roomUploadJobs } from "../drizzle/schema";
import { digest, decryptDocument, encryptDocument } from "./dataRoomCrypto";
import { DOCUMENT_CHUNK_BYTES, MAX_DOCUMENT_BYTES } from "./dataRoomFileTypes";
import { router } from "./_core/trpc";
import { dataRoomTransferProcedures, MAX_ACTIVE_UPLOADS, UPLOAD_EXPIRY_MS } from "./dataRoomTransfers";

const transferRouter = router(dataRoomTransferProcedures);
type Row = Record<string, any>;
const dialect = new MySqlDialect();
const tables = [roomAccounts, roomAudit, roomAuthLimits, roomDocuments, roomUploadChunks, roomUploadJobs];

/** In-memory Drizzle adapter: serializes transactions and rolls back failed writes.
 * Predicates are interpreted from Drizzle's SQL/parameters; no production DB is ever accessed.
 */
function memoryDatabase() {
  let state: Record<string, Row[]> = Object.fromEntries(tables.map(table => [getTableName(table), []]));
  let tail = Promise.resolve();
  const rows = (table: any) => state[getTableName(table)];
  const matches = (table: any, row: Row, expression?: SQL) => {
    if (!expression) return true;
    const query = dialect.sqlToQuery(expression);
    const names = Object.fromEntries(Object.entries(getTableColumns(table)).map(([key, column]) => [column.name, key]));
    let offset = 0;
    const predicates = [...query.sql.matchAll(/`[^`]+`\.`([^`]+)`\s*(=|<=|in)\s*(\?|\([^)]*\))/g)];
    if (!predicates.length) throw new Error(`Unsupported test predicate ${query.sql}`);
    return predicates.map(match => {
      const value = row[names[match[1]]], values = query.params.slice(offset, offset += (match[3].match(/\?/g) ?? []).length);
      return match[2] === "=" ? value === values[0] : match[2] === "<=" ? value <= values[0] : values.includes(value);
    }).every(Boolean);
  };
  const db = {
    rows,
    select(projection?: Record<string, any>) {
      return { from(table: any) {
        let condition: SQL | undefined, maximum = Infinity, sessionJoin = false;
        const result = () => {
          if (sessionJoin) return db.rows(roomAccounts).map(account => ({ account: { ...account } }));
          const selected = rows(table).filter(row => matches(table, row, condition));
          if (projection?.n) return [{ n: selected.length }];
          return selected.slice(0, maximum).map(row => projection ? Object.fromEntries(Object.entries(projection).map(([key, column]) => {
            const entry = Object.entries(getTableColumns(table)).find(([, value]) => value === column);
            return [key, entry ? row[entry[0]] : undefined];
          })) : { ...row });
        };
        const chain: any = { innerJoin() { sessionJoin = true; return chain; }, where(expression: SQL) { condition = expression; return chain; }, limit(n: number) { maximum = n; return chain; }, for() { return chain; }, orderBy() { return chain; }, then(resolve: any, reject: any) { return Promise.resolve().then(result).then(resolve, reject); } };
        return chain;
      } };
    },
    insert(table: any) {
      return { values(value: Row) {
        let performed = false;
        const execute = (duplicate = false) => {
          if (performed) return; performed = true;
          if (duplicate && rows(table).some(row => row.key === value.key)) return;
          const row = { ...value };
          if (table === roomDocuments) row.id = rows(table).length + 1;
          rows(table).push(row);
          return [{ id: row.id }];
        };
        return { then(resolve: any, reject: any) { return Promise.resolve().then(() => execute()).then(resolve, reject); }, onDuplicateKeyUpdate() { return Promise.resolve().then(() => execute(true)); }, $returningId() { return Promise.resolve().then(() => execute()); } };
      } };
    },
    update(table: any) { return { set(values: Row) { return { where(expression: SQL) {
      for (const row of rows(table)) if (matches(table, row, expression)) Object.assign(row, values);
      return Promise.resolve([{ affectedRows: 1 }]);
    } }; } }; },
    delete(table: any) { return { where(expression: SQL) { state[getTableName(table)] = rows(table).filter(row => !matches(table, row, expression)); return Promise.resolve(); } }; },
    async transaction<T>(callback: (transaction: any) => Promise<T>) {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>(resolve => { release = resolve; });
      await previous;
      const before = structuredClone(state);
      try { return await callback(db); } catch (error) { state = before; throw error; } finally { release(); }
    },
  };
  return db;
}
let db: ReturnType<typeof memoryDatabase>;
let objects: Map<string, Buffer>;
let currentAdmin = true;
const fields = { title: "Investment report", description: "Private report", category: "Investment", filename: "report.pdf", allowDownload: false, published: true };
function context(): TrpcContext {
  return { user: { id: 9, openId: "upload-test-owner", role: "admin", name: "Owner", email: "owner@example.test" } as NonNullable<TrpcContext["user"]>,
    req: { headers: { "x-data-room-request": "1" }, ip: "127.0.0.1" } as TrpcContext["req"], res: { setHeader: vi.fn() } as unknown as TrpcContext["res"] };
}
function caller(accountId = 0) {
  const ctx = context();
  if (accountId) {
    ctx.req.headers.cookie = `__Host-phe_data_room=${"A".repeat(43)}`;
    ctx.user = null;
  }
  return transferRouter.createCaller(ctx);
}
function pdf(size: number) {
  const bytes = Buffer.alloc(size, 32); bytes.write("%PDF-1.7\n"); bytes.write("\n%%EOF\n", size - 7); return bytes;
}
async function upload(bytes: Buffer, overrides: Partial<typeof fields> & { replaceId?: number } = {}) {
  const client = caller();
  const job = await client.beginDocumentUpload({ ...fields, ...overrides, sizeBytes: bytes.length });
  for (let index = 0; index < job.totalChunks; index++) await client.uploadDocumentChunk({ uploadId: job.uploadId, index, base64: bytes.subarray(index * DOCUMENT_CHUNK_BYTES, (index + 1) * DOCUMENT_CHUNK_BYTES).toString("base64") });
  return { client, job };
}
beforeEach(() => {
  vi.clearAllMocks(); currentAdmin = true; db = memoryDatabase(); objects = new Map();
  vi.stubEnv("DATA_ROOM_ENCRYPTION_KEY", "transfer-test-encryption-key-only");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.getDb.mockResolvedValue(db); mocks.throttle.mockResolvedValue(undefined);
  mocks.getRoomActor.mockImplementation(async (ctx: TrpcContext) => currentAdmin ? { id: ctx.req.headers.cookie ? 42 : 0, name: "Owner", email: "owner@example.test", role: "admin", authSource: ctx.req.headers.cookie ? "password" : "owner", expiresAt: null } : null);
  mocks.storagePut.mockImplementation(async (key: string, bytes: Buffer) => { objects.set(key, Buffer.from(bytes)); return { key, url: "https://never-returned.example/private" }; });
  mocks.storageGetSignedUrl.mockImplementation(async (key: string) => key);
  mocks.fetch.mockImplementation(async (key: string) => ({ ok: true, arrayBuffer: async () => objects.get(key)! }));
});
afterEach(() => vi.unstubAllEnvs());

describe("persistent private upload jobs", () => {
  it("returns only the opaque contract, stores token digest and metadata, and exposes no document until completion", async () => {
    const result = await caller().beginDocumentUpload({ ...fields, sizeBytes: 100 });
    expect(Object.keys(result).sort()).toEqual(["chunkBytes", "totalChunks", "uploadId"]);
    expect(result.uploadId).toMatch(/^[A-Za-z0-9_-]{43}$/); expect(result.chunkBytes).toBe(1048576);
    const job = db.rows(roomUploadJobs)[0];
    expect(job.tokenHash).toBe(digest(result.uploadId)); expect(JSON.stringify(job)).not.toContain(result.uploadId);
    expect(job.title).toBe(fields.title); expect(job.status).toBe("uploading");
    expect(job.expiresAt - job.createdAt).toBe(UPLOAD_EXPIRY_MS); expect(db.rows(roomDocuments)).toHaveLength(0);
  });
  it.each(["uploadDocumentChunk", "completeDocumentUpload", "cancelDocumentUpload"] as const)("rejects job ownership mismatch in %s", async method => {
    const { uploadId } = await caller().beginDocumentUpload({ ...fields, sizeBytes: 100 });
    db.rows(roomUploadJobs)[0].ownerHash = digest("different-owner");
    const input = { uploadId, index: 0, base64: pdf(100).toString("base64") };
    await expect(caller()[method](input)).rejects.toMatchObject({ code: "NOT_FOUND" }); expect(mocks.storagePut).not.toHaveBeenCalled();
  });
  it("rejects incomplete completion and remains resumable", async () => {
    const client = caller(), bytes = pdf(DOCUMENT_CHUNK_BYTES + 25);
    const { uploadId } = await client.beginDocumentUpload({ ...fields, sizeBytes: bytes.length });
    await client.uploadDocumentChunk({ uploadId, index: 0, base64: bytes.subarray(0, DOCUMENT_CHUNK_BYTES).toString("base64") });
    await expect(client.completeDocumentUpload({ uploadId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.rows(roomUploadJobs)[0].status).toBe("uploading"); expect(db.rows(roomDocuments)).toHaveLength(0);
    await client.uploadDocumentChunk({ uploadId, index: 1, base64: bytes.subarray(DOCUMENT_CHUNK_BYTES).toString("base64") });
    await expect(client.completeDocumentUpload({ uploadId })).resolves.toEqual({ id: 1 });
  });
  it("accepts same-content duplicates, rejects changed duplicates, gaps, sizes and noncanonical base64", async () => {
    const client = caller(), bytes = pdf(DOCUMENT_CHUNK_BYTES + 25);
    const { uploadId } = await client.beginDocumentUpload({ ...fields, sizeBytes: bytes.length });
    const first = { uploadId, index: 0, base64: bytes.subarray(0, DOCUMENT_CHUNK_BYTES).toString("base64") };
    await expect(client.uploadDocumentChunk({ uploadId, index: 1, base64: bytes.subarray(DOCUMENT_CHUNK_BYTES).toString("base64") })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(client.uploadDocumentChunk({ ...first, base64: "not-base64" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await client.uploadDocumentChunk(first); await client.uploadDocumentChunk(first);
    expect(mocks.storagePut).toHaveBeenCalledTimes(1);
    await expect(client.uploadDocumentChunk({ ...first, base64: Buffer.alloc(DOCUMENT_CHUNK_BYTES, 42).toString("base64") })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(client.uploadDocumentChunk({ uploadId, index: 1, base64: "YQ==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // Same decoded bytes with noncanonical trailing bits must not be accepted.
    await expect(client.uploadDocumentChunk({ uploadId, index: 1, base64: bytes.subarray(DOCUMENT_CHUNK_BYTES).toString("base64").replace(/A==$/, "B==") + " " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("serializes concurrent/idempotent completion to one single PHE1 document and audit record", async () => {
    const bytes = pdf(150), { client, job } = await upload(bytes);
    const results = await Promise.all([client.completeDocumentUpload(job), client.completeDocumentUpload(job)]);
    expect(results).toEqual([{ id: 1 }, { id: 1 }]);
    expect(db.rows(roomDocuments)).toHaveLength(1); expect(db.rows(roomUploadChunks)).toHaveLength(0);
    expect(mocks.storagePut).toHaveBeenCalledTimes(2);
    const stored = objects.get(db.rows(roomDocuments)[0].storageKey)!;
    expect(stored.subarray(0, 4).toString()).toBe("PHE1"); expect(decryptDocument(stored).equals(bytes)).toBe(true);
    await expect(client.completeDocumentUpload(job)).resolves.toEqual({ id: 1 });
    expect(mocks.storagePut).toHaveBeenCalledTimes(2);
  });
  it.each([Math.ceil(6.3 * 1024 * 1024), MAX_DOCUMENT_BYTES])("reconstructs a %i-byte PDF from individually encrypted <=1MiB chunks", async size => {
    const bytes = pdf(size), { client, job } = await upload(bytes);
    for (const row of db.rows(roomUploadChunks)) {
      expect(row.sizeBytes).toBeLessThanOrEqual(DOCUMENT_CHUNK_BYTES);
      const encrypted = objects.get(row.storageKey)!; expect(encrypted.length).toBe(row.sizeBytes + 32);
      expect(encrypted.subarray(0, 4).toString()).toBe("PHE1"); expect(row).not.toHaveProperty("base64");
    }
    await client.completeDocumentUpload(job);
    const doc = db.rows(roomDocuments)[0]; expect(doc.sizeBytes).toBe(size); expect(doc.allowDownload).toBe(false); expect(doc.published).toBe(true);
    expect(decryptDocument(objects.get(doc.storageKey)!).equals(bytes)).toBe(true);
  });
  it("validates final content server-side and rolls back to uploading on invalid PDFs or corrupted stored chunks", async () => {
    const invalidBytes = Buffer.alloc(50), { client, job } = await upload(invalidBytes);
    await expect(client.completeDocumentUpload(job)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.rows(roomUploadJobs)[0].status).toBe("uploading"); expect(db.rows(roomDocuments)).toHaveLength(0);
    const chunk = db.rows(roomUploadChunks)[0]; objects.set(chunk.storageKey, encryptDocument(pdf(50)));
    await expect(client.completeDocumentUpload(job)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.rows(roomUploadJobs)[0].status).toBe("uploading");
  });
  it("atomically replaces a document with incremented version and chosen permissions", async () => {
    db.rows(roomDocuments).push({ id: 7, version: 5, archived: false, storageKey: "old-encrypted", published: true, allowDownload: true });
    const { client, job } = await upload(pdf(50), { replaceId: 7, published: false, allowDownload: false });
    await expect(client.completeDocumentUpload(job)).resolves.toEqual({ id: 7 });
    expect(db.rows(roomDocuments)).toHaveLength(1); expect(db.rows(roomDocuments)[0]).toMatchObject({ id: 7, version: 6, published: false, allowDownload: false });
  });
  it("rejects expired jobs and lazily deletes their chunk references", async () => {
    const { client, job } = await upload(pdf(50));
    db.rows(roomUploadJobs)[0].expiresAt = Date.now() - 1;
    await expect(client.completeDocumentUpload(job)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.rows(roomUploadJobs)).toHaveLength(0); expect(db.rows(roomUploadChunks)).toHaveLength(0);
  });
  it.each(["chunk", "complete"])("rolls back %s writes when administrator is revoked during storage", async operation => {
    const client = caller(), bytes = pdf(50);
    const { uploadId } = await client.beginDocumentUpload({ ...fields, sizeBytes: bytes.length });
    if (operation === "complete") await client.uploadDocumentChunk({ uploadId, index: 0, base64: bytes.toString("base64") });
    mocks.storagePut.mockImplementationOnce(async (key: string, data: Buffer) => { objects.set(key, Buffer.from(data)); currentAdmin = false; return { key }; });
    await expect(operation === "complete" ? client.completeDocumentUpload({ uploadId }) : client.uploadDocumentChunk({ uploadId, index: 0, base64: bytes.toString("base64") })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getRoomActor).toHaveBeenCalled(); expect(db.rows(roomDocuments)).toHaveLength(0);
    expect(db.rows(roomUploadJobs)[0].status).toBe("uploading");
    expect(db.rows(roomUploadJobs)[0].nextChunk).toBe(operation === "complete" ? 1 : 0);
  });
  it("bounds concurrent active jobs and throttles authenticated upload operations", async () => {
    const attempts = await Promise.allSettled(Array.from({ length: MAX_ACTIVE_UPLOADS + 2 }, () => caller().beginDocumentUpload({ ...fields, sizeBytes: 50 })));
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(MAX_ACTIVE_UPLOADS);
    expect(db.rows(roomUploadJobs)).toHaveLength(MAX_ACTIVE_UPLOADS); expect(mocks.throttle).toHaveBeenCalled();
  });
  it("cancels idempotently without exposing or writing a document", async () => {
    const { client, job } = await upload(pdf(50));
    await client.cancelDocumentUpload(job); await client.cancelDocumentUpload(job);
    expect(db.rows(roomUploadJobs)[0].status).toBe("cancelled"); expect(db.rows(roomUploadChunks)).toHaveLength(0);
    await expect(client.completeDocumentUpload(job)).rejects.toMatchObject({ code: "BAD_REQUEST" }); expect(db.rows(roomDocuments)).toHaveLength(0);
  });
});


describe("upload account/session security and retry boundaries", () => {
  function adminAccount() { return { id: 42, role: "admin", status: "active", expiresAt: null, email: "admin@example.test", name: "Room Administrator" }; }
  it.each(["expired", "revoked", "demoted"])("rejects a password administrator %s during final storage write", async state => {
    db.rows(roomAccounts).push(adminAccount());
    const client = caller(42), bytes = pdf(50);
    const { uploadId } = await client.beginDocumentUpload({ ...fields, sizeBytes: bytes.length });
    expect(db.rows(roomUploadJobs)[0].accountId).toBe(42);
    await client.uploadDocumentChunk({ uploadId, index: 0, base64: bytes.toString("base64") });
    mocks.storagePut.mockImplementationOnce(async (key: string, data: Buffer) => {
      objects.set(key, Buffer.from(data));
      const account = db.rows(roomAccounts)[0];
      if (state === "expired") account.expiresAt = Date.now() - 1;
      if (state === "revoked") account.status = "revoked";
      if (state === "demoted") account.role = "investor";
      return { key };
    });
    await expect(client.completeDocumentUpload({ uploadId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.rows(roomDocuments)).toHaveLength(0); expect(db.rows(roomUploadJobs)[0].status).toBe("uploading");
  });
  it("does not allow the website owner to complete another room administrator's upload", async () => {
    db.rows(roomAccounts).push(adminAccount());
    const client = caller(42), bytes = pdf(50), job = await client.beginDocumentUpload({ ...fields, sizeBytes: bytes.length });
    await client.uploadDocumentChunk({ ...job, index: 0, base64: bytes.toString("base64") });
    await expect(caller().completeDocumentUpload(job)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.rows(roomDocuments)).toHaveLength(0);
  });
  it("leaves complete upload resumable after final storage failure and succeeds on retry", async () => {
    const { client, job } = await upload(pdf(50));
    mocks.storagePut.mockRejectedValueOnce(new Error("storage endpoint details must not leak"));
    await expect(client.completeDocumentUpload(job)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "The private upload could not be processed. Please retry." });
    expect(db.rows(roomUploadJobs)[0].status).toBe("uploading"); expect(db.rows(roomUploadChunks)).toHaveLength(1);
    await expect(client.completeDocumentUpload(job)).resolves.toEqual({ id: 1 });
  });
  it("checks expiry again after final storage before document writes", async () => {
    const { client, job } = await upload(pdf(50));
    // Simulate elapsed wall-clock time without changing the lock snapshot.
    const now = Date.now(); const clock = vi.spyOn(Date, "now");
    mocks.storagePut.mockImplementationOnce(async (key: string, bytes: Buffer) => {
      objects.set(key, Buffer.from(bytes)); clock.mockReturnValue(now + UPLOAD_EXPIRY_MS + 1); return { key };
    });
    try {
      await expect(client.completeDocumentUpload(job)).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Upload expired. Start a new upload." });
      expect(db.rows(roomDocuments)).toHaveLength(0);
      expect(db.rows(roomUploadJobs)[0].status).toBe("uploading");
    } finally { clock.mockRestore(); }
  });
  it("rejects files larger than the existing fifteen-MiB cap without allocating an upload job", async () => {
    await expect(caller().beginDocumentUpload({ ...fields, sizeBytes: MAX_DOCUMENT_BYTES + 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.rows(roomUploadJobs)).toHaveLength(0);
  });
});
