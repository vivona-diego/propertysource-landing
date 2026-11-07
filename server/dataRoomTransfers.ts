import { createHash, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import type { TrpcContext } from "./_core/context";
import { roomAccounts, roomAudit, roomAuthLimits, roomDocuments, roomUploadChunks, roomUploadJobs } from "../drizzle/schema";
import { getRoomActor, roomAdminProcedure, roomDb, throttle, type RoomActor } from "./dataRoomAccess";
import { decryptDocument, digest, encryptDocument, newToken, safeFilename } from "./dataRoomCrypto";
import { decodeRoomDocument, DOCUMENT_CHUNK_BYTES, MAX_DOCUMENT_BYTES, roomFileKind } from "./dataRoomFileTypes";
import { storageGetSignedUrl, storagePut } from "./storage";

export const UPLOAD_EXPIRY_MS = 30 * 60 * 1000;
export const MAX_ACTIVE_UPLOADS = 3;
const tokenInput = z.object({ uploadId: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const beginInput = z.object({
  title: z.string().trim().min(1).max(160), description: z.string().trim().max(1000),
  category: z.string().trim().min(1).max(80), filename: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(16).max(MAX_DOCUMENT_BYTES),
  allowDownload: z.boolean(), published: z.boolean(), replaceId: z.number().int().positive().optional(),
});
type UploadJob = typeof roomUploadJobs.$inferSelect;
type Database = Awaited<ReturnType<typeof roomDb>>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type UploadContext = TrpcContext & { roomActor: RoomActor };
const contentDigest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const ownerDigest = (ctx: UploadContext) => digest(`room-upload:${ctx.roomActor.authSource}:${ctx.roomActor.id}:${ctx.roomActor.authSource === "owner" ? ctx.user?.openId : ""}`);
const invalid = (message: string): never => { throw new TRPCError({ code: "BAD_REQUEST", message }); };

/** All transactions roll back on storage/validation failure, including the finalizing state. */
async function transfer<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The private upload could not be processed. Please retry." });
  }
}
async function uploadThrottle(ctx: UploadContext, begin = false) {
  await throttle(`room-upload-ip:${ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown"}`, 1200);
  await throttle(`room-upload-owner:${ownerDigest(ctx)}:${begin ? "begin" : "transfer"}`, begin ? 20 : 600);
}
/** Drop bounded batches of expired references; storage intentionally has no delete API. */
export async function cleanupExpiredUploads(db: Database) {
  await db.transaction(async tx => {
    const expired = await tx.select({ tokenHash: roomUploadJobs.tokenHash }).from(roomUploadJobs)
      .where(lte(roomUploadJobs.expiresAt, Date.now())).limit(100).for("update");
    if (!expired.length) return;
    const hashes = expired.map(row => row.tokenHash);
    await tx.delete(roomUploadChunks).where(inArray(roomUploadChunks.jobHash, hashes));
    await tx.delete(roomUploadJobs).where(inArray(roomUploadJobs.tokenHash, hashes));
  });
}
async function requireCurrentAdmin(ctx: UploadContext, tx: Transaction) {
  const actor = await getRoomActor(ctx);
  if (!actor || actor.role !== "admin" || actor.id !== ctx.roomActor.id || actor.authSource !== ctx.roomActor.authSource)
    throw new TRPCError({ code: "FORBIDDEN", message: "Active administrator access is required." });
  // Lock the current account until commit so a concurrent account revocation cannot race writes.
  if (actor.authSource === "password") {
    const [account] = await tx.select().from(roomAccounts).where(eq(roomAccounts.id, actor.id)).limit(1).for("update");
    if (!account || account.role !== "admin" || account.status !== "active" || (account.expiresAt !== null && account.expiresAt <= Date.now()))
      throw new TRPCError({ code: "FORBIDDEN", message: "Active administrator access is required." });
  }
}
async function lockJob(tx: Transaction, ctx: UploadContext, uploadId: string) {
  const [job] = await tx.select().from(roomUploadJobs).where(eq(roomUploadJobs.tokenHash, digest(uploadId))).limit(1).for("update");
  if (!job || job.ownerHash !== ownerDigest(ctx) || job.accountId !== ctx.roomActor.id || job.expiresAt <= Date.now())
    throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found or expired. Start a new upload." });
  return job;
}
function requireUploading(job: UploadJob) {
  if (job.status !== "uploading") invalid("This upload is no longer accepting chunks.");
}
export function decodeUploadChunk(base64: string, index: number, job: Pick<UploadJob, "sizeBytes" | "totalChunks">) {
  if (!Number.isInteger(index) || index < 0 || index >= job.totalChunks) invalid("Invalid upload chunk index.");
  const expected = Math.min(DOCUMENT_CHUNK_BYTES, job.sizeBytes - index * DOCUMENT_CHUNK_BYTES);
  if (base64.length !== 4 * Math.ceil(expected / 3) || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) invalid("Invalid upload chunk encoding or size.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length !== expected || bytes.toString("base64") !== base64) invalid("Invalid upload chunk encoding or size.");
  return bytes;
}
async function readChunk(key: string, expected: number) {
  const signed = await storageGetSignedUrl(key);
  const response = await fetch(signed, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Private chunk fetch failed");
  const encrypted = Buffer.from(await response.arrayBuffer());
  if (encrypted.length !== expected + 32) throw new Error("Invalid private chunk length");
  return decryptDocument(encrypted);
}

export const dataRoomTransferProcedures = {
  beginDocumentUpload: roomAdminProcedure.input(beginInput).mutation(({ ctx, input }) => transfer(async () => {
    try { roomFileKind(input.filename); } catch { invalid("Choose a PDF or Excel (.xlsx or .xls) file no larger than 15 MB."); }
    await uploadThrottle(ctx, true);
    const db = await roomDb();
    await cleanupExpiredUploads(db);
    const ownerHash = ownerDigest(ctx), lockHash = digest(`room-upload-lock:${ownerHash}`);
    // A persistent owner mutex bounds concurrent begins across serverless instances.
    await db.insert(roomAuthLimits).values({ key: lockHash, attempts: 0, windowStart: Date.now() }).onDuplicateKeyUpdate({ set: { key: lockHash } });
    const uploadId = newToken(), totalChunks = Math.ceil(input.sizeBytes / DOCUMENT_CHUNK_BYTES);
    await db.transaction(async tx => {
      await tx.select().from(roomAuthLimits).where(eq(roomAuthLimits.key, lockHash)).limit(1).for("update");
      await requireCurrentAdmin(ctx, tx);
      const [active] = await tx.select({ n: count() }).from(roomUploadJobs).where(and(eq(roomUploadJobs.ownerHash, ownerHash), inArray(roomUploadJobs.status, ["uploading", "finalizing"])));
      if (active.n >= MAX_ACTIVE_UPLOADS) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Finish or cancel an existing upload before starting another." });
      if (input.replaceId) {
        const [doc] = await tx.select({ id: roomDocuments.id }).from(roomDocuments).where(and(eq(roomDocuments.id, input.replaceId), eq(roomDocuments.archived, false))).limit(1);
        if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
      }
      const now = Date.now();
      await tx.insert(roomUploadJobs).values({ ...input, filename: safeFilename(input.filename), replaceId: input.replaceId ?? null,
        tokenHash: digest(uploadId), ownerHash, accountId: ctx.roomActor.id, status: "uploading", totalChunks,
        nextChunk: 0, documentId: null, expiresAt: now + UPLOAD_EXPIRY_MS, createdAt: now });
    });
    return { uploadId, chunkBytes: DOCUMENT_CHUNK_BYTES, totalChunks };
  })),
  uploadDocumentChunk: roomAdminProcedure.input(tokenInput.extend({ index: z.number().int().nonnegative().max(14), base64: z.string().max(4 * Math.ceil(DOCUMENT_CHUNK_BYTES / 3)) })).mutation(({ ctx, input }) => transfer(async () => {
    await uploadThrottle(ctx);
    const db = await roomDb(); await cleanupExpiredUploads(db);
    await db.transaction(async tx => {
      const job = await lockJob(tx, ctx, input.uploadId); requireUploading(job);
      const bytes = decodeUploadChunk(input.base64, input.index, job), contentHash = contentDigest(bytes);
      try {
        if (input.index < job.nextChunk) {
          const [existing] = await tx.select().from(roomUploadChunks).where(eq(roomUploadChunks.id, `${job.tokenHash}:${input.index}`)).limit(1);
          if (!existing || existing.contentHash !== contentHash || existing.sizeBytes !== bytes.length) invalid("This chunk was already uploaded with different content.");
          await requireCurrentAdmin(ctx, tx); return;
        }
        if (input.index !== job.nextChunk) invalid("Upload chunks in order without gaps.");
        const { key } = await storagePut(`investor-room/upload-chunks/${randomUUID()}.enc`, encryptDocument(bytes), "application/octet-stream");
        await requireCurrentAdmin(ctx, tx);
        if (job.expiresAt <= Date.now()) invalid("Upload expired. Start a new upload.");
        await tx.insert(roomUploadChunks).values({ id: `${job.tokenHash}:${input.index}`, jobHash: job.tokenHash, chunkIndex: input.index, contentHash, sizeBytes: bytes.length, storageKey: key });
        await tx.update(roomUploadJobs).set({ nextChunk: job.nextChunk + 1 }).where(eq(roomUploadJobs.tokenHash, job.tokenHash));
      } finally { bytes.fill(0); }
    });
    return { success: true as const };
  })),
  completeDocumentUpload: roomAdminProcedure.input(tokenInput).mutation(({ ctx, input }) => transfer(async () => {
    await uploadThrottle(ctx);
    const db = await roomDb(); await cleanupExpiredUploads(db);
    // Holding the job row lock through storage makes concurrent completion wait for the same id.
    return db.transaction(async tx => {
      const job = await lockJob(tx, ctx, input.uploadId);
      if (job.status === "complete" && job.documentId !== null) { await requireCurrentAdmin(ctx, tx); return { id: job.documentId }; }
      requireUploading(job);
      if (job.nextChunk !== job.totalChunks) invalid("Upload is incomplete. Upload all chunks before completing.");
      await tx.update(roomUploadJobs).set({ status: "finalizing" }).where(eq(roomUploadJobs.tokenHash, job.tokenHash));
      const chunks = await tx.select().from(roomUploadChunks).where(eq(roomUploadChunks.jobHash, job.tokenHash)).orderBy(asc(roomUploadChunks.chunkIndex));
      if (chunks.length !== job.totalChunks) invalid("Upload is incomplete.");
      const parts: Buffer[] = [];
      let bytes: Buffer | undefined;
      try {
        for (let index = 0; index < chunks.length; index++) {
          const chunk = chunks[index], expected = Math.min(DOCUMENT_CHUNK_BYTES, job.sizeBytes - index * DOCUMENT_CHUNK_BYTES);
          if (chunk.chunkIndex !== index || chunk.sizeBytes !== expected) invalid("Upload is incomplete or invalid.");
          const part = await readChunk(chunk.storageKey, expected); parts.push(part);
          if (part.length !== expected || contentDigest(part) !== chunk.contentHash) invalid("Upload chunk integrity check failed.");
        }
        bytes = Buffer.concat(parts);
        if (bytes.length !== job.sizeBytes || bytes.length > MAX_DOCUMENT_BYTES) invalid("Invalid document size.");
        try { const validated = decodeRoomDocument(bytes.toString("base64"), job.filename); validated.bytes.fill(0); }
        catch { invalid("Choose a complete PDF or Excel file no larger than 15 MB. Password-encrypted workbooks are not supported."); }
        const { key } = await storagePut(`investor-room/${randomUUID()}.enc`, encryptDocument(bytes), "application/octet-stream");
        await requireCurrentAdmin(ctx, tx);
        if (job.expiresAt <= Date.now()) invalid("Upload expired. Start a new upload.");
        const now = Date.now(), values = { title: job.title, description: job.description, category: job.category, filename: job.filename,
          sizeBytes: job.sizeBytes, storageKey: key, allowDownload: job.allowDownload, published: job.published, updatedAt: now };
        let id: number;
        if (job.replaceId !== null) {
          const [existing] = await tx.select().from(roomDocuments).where(and(eq(roomDocuments.id, job.replaceId), eq(roomDocuments.archived, false))).limit(1).for("update");
          if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
          id = existing.id;
          await tx.update(roomDocuments).set({ ...values, version: existing.version + 1 }).where(eq(roomDocuments.id, id));
        } else {
          const [created] = await tx.insert(roomDocuments).values({ ...values, version: 1, archived: false, createdAt: now }).$returningId(); id = created.id;
        }
        await tx.update(roomUploadJobs).set({ status: "complete", documentId: id }).where(eq(roomUploadJobs.tokenHash, job.tokenHash));
        await tx.delete(roomUploadChunks).where(eq(roomUploadChunks.jobHash, job.tokenHash));
        await tx.insert(roomAudit).values({ actor: (ctx.roomActor.email || ctx.roomActor.name).slice(0, 254), event: job.replaceId === null ? "Document uploaded" : "Document replaced", detail: `${job.title} — ${job.published ? "published" : "draft"}`.slice(0, 500), createdAt: now });
        return { id };
      } finally { bytes?.fill(0); parts.forEach(part => part.fill(0)); }
    });
  })),
  cancelDocumentUpload: roomAdminProcedure.input(tokenInput).mutation(({ ctx, input }) => transfer(async () => {
    await uploadThrottle(ctx);
    const db = await roomDb(); await cleanupExpiredUploads(db);
    await db.transaction(async tx => {
      const job = await lockJob(tx, ctx, input.uploadId); await requireCurrentAdmin(ctx, tx);
      // Cancelling a completed upload never archives or deletes the completed document.
      if (job.status === "complete" || job.status === "cancelled") return;
      await tx.update(roomUploadJobs).set({ status: "cancelled" }).where(eq(roomUploadJobs.tokenHash, job.tokenHash));
      await tx.delete(roomUploadChunks).where(eq(roomUploadChunks.jobHash, job.tokenHash));
    });
    return { success: true as const };
  })),
};
