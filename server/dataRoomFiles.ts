import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { createContext } from "./_core/context";
import { roomDocuments } from "../drizzle/schema";
import { audit, getRoomActor, privateHeaders, roomDb } from "./dataRoomAccess";
import { decryptDocument, safeFilename } from "./dataRoomCrypto";
import { DOCUMENT_CHUNK_BYTES, MAX_DOCUMENT_BYTES, ROOM_FILE_MIME, roomFileKind } from "./dataRoomFileTypes";
import { storageGetSignedUrl } from "./storage";

export const MAX_LEGACY_RESPONSE_BYTES = 3 * 1024 * 1024;
export function registerDataRoomFiles(app: Express) {
  app.use("/data-room", (_req, res, next) => { privateHeaders({ res }); next(); });
  app.get("/api/data-room/documents/:id", async (req, res) => {
    privateHeaders({ res });
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    let bytes: Buffer | undefined;
    try {
      const ctx = await createContext({ req, res }), actor = await getRoomActor(ctx);
      if (!actor) { res.status(401).json({ error: "An active investor login is required." }); return; }
      const chunked = req.query.chunk !== undefined;
      const mode = req.query.mode ?? "view";
      if (!/^[1-9][0-9]{0,9}$/.test(req.params.id) || typeof mode !== "string" || !["view", "download"].includes(mode)) {
        res.status(404).json({ error: "Document not found." }); return;
      }
      if (chunked && (typeof req.query.chunk !== "string" || !/^(0|[1-9][0-9]{0,9})$/.test(req.query.chunk) || typeof req.query.version !== "string" || !/^[1-9][0-9]{0,9}$/.test(req.query.version))) {
        res.status(404).json({ error: "Invalid document chunk or version." }); return;
      }
      const db = await roomDb();
      const [doc] = await db.select().from(roomDocuments).where(and(eq(roomDocuments.id, Number(req.params.id)), eq(roomDocuments.archived, false))).limit(1);
      if (!doc || (!doc.published && actor.role !== "admin")) { res.status(404).json({ error: "Document not found." }); return; }
      if (doc.sizeBytes < 1 || doc.sizeBytes > MAX_DOCUMENT_BYTES) throw new Error("Invalid document size");
      if (chunked && Number(req.query.version) !== doc.version) {
        res.status(409).json({ error: "The document version changed. Reload the document before requesting more chunks." }); return;
      }
      const kind = roomFileKind(doc.filename);
      // Preserve legacy Excel attachment behavior; chunked view requests are PDF-only.
      const download = mode === "download" || kind !== "pdf";
      if (download && !doc.allowDownload && actor.role !== "admin") { res.status(403).json({ error: "Download is not enabled for this document." }); return; }
      if (chunked && mode === "view" && kind !== "pdf") { res.status(400).json({ error: "Excel workbooks are download-only. Use mode=download." }); return; }
      const totalChunks = Math.ceil(doc.sizeBytes / DOCUMENT_CHUNK_BYTES), index = chunked ? Number(req.query.chunk) : 0;
      if (chunked && index >= totalChunks) {
        res.status(416).json({ error: "Document chunk is outside the document range." }); return;
      }
      // Never let a legacy response exceed the safe body limit on Vercel.
      if (!chunked && doc.sizeBytes > MAX_LEGACY_RESPONSE_BYTES) {
        res.status(413).json({ error: "This document requires chunked delivery. Request chunk=N&version=V&mode=view|download (1 MiB chunks)." }); return;
      }
      const signed = await storageGetSignedUrl(doc.storageKey), stored = await fetch(signed, { signal: AbortSignal.timeout(30000) });
      if (!stored.ok) throw new Error("Private object fetch failed");
      const encrypted = Buffer.from(await stored.arrayBuffer());
      if (encrypted.length > MAX_DOCUMENT_BYTES + 32) throw new Error("Invalid object length");
      bytes = decryptDocument(encrypted);
      if (bytes.length !== doc.sizeBytes) throw new Error("Invalid document length");
      // Recheck identity, permissions AND version after the fetch on every chunk request.
      const stillAuthorized = await getRoomActor(ctx);
      const [current] = await db.select().from(roomDocuments).where(eq(roomDocuments.id, doc.id)).limit(1);
      if (!stillAuthorized || stillAuthorized.id !== actor.id || stillAuthorized.authSource !== actor.authSource || !current || current.archived ||
          (!current.published && stillAuthorized.role !== "admin") || (download && !current.allowDownload && stillAuthorized.role !== "admin")) {
        res.status(403).json({ error: "Access is no longer available." }); return;
      }
      if (current.version !== doc.version || current.storageKey !== doc.storageKey || current.sizeBytes !== doc.sizeBytes || current.filename !== doc.filename || (chunked && current.version !== Number(req.query.version))) {
        res.status(409).json({ error: "The document version changed. Reload the document before requesting more chunks." }); return;
      }
      // Chunk zero records one audit event per reconstruction rather than an event for every byte slice.
      if (!chunked || index === 0) await audit(actor.email || actor.name, download ? "Document downloaded" : "Document viewed", `${doc.title} — version ${doc.version}`);
      const body = chunked ? bytes.subarray(index * DOCUMENT_CHUNK_BYTES, Math.min(bytes.length, (index + 1) * DOCUMENT_CHUNK_BYTES)) : bytes;
      res.setHeader("X-Document-Size", String(doc.sizeBytes));
      res.setHeader("X-Document-Version", String(doc.version));
      res.setHeader("X-Document-Chunk-Count", String(totalChunks));
      res.setHeader("Content-Type", ROOM_FILE_MIME[kind]);
      res.setHeader("Content-Length", String(body.length));
      const filename = safeFilename(doc.filename), ascii = filename.replace(/[^\x20-\x7e]/g, "_");
      res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'; script-src 'none'; object-src 'none'");
      res.send(body);
      // Do not zero the response Buffer: Express may still be asynchronously writing it.
      bytes = undefined;
    } catch {
      if (!res.headersSent) res.status(503).json({ error: "The private document could not be opened. Please try again." });
    } finally { bytes?.fill(0); }
  });
}
