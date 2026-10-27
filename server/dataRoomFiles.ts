import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { createContext } from "./_core/context";
import { roomDocuments } from "../drizzle/schema";
import { audit, getRoomActor, privateHeaders, roomDb } from "./dataRoomAccess";
import { decryptDocument, safeFilename } from "./dataRoomCrypto";
import { MAX_DOCUMENT_BYTES, ROOM_FILE_MIME, roomFileKind } from "./dataRoomFileTypes";
import { storageGetSignedUrl } from "./storage";

export function registerDataRoomFiles(app: Express) {
  app.use("/data-room", (_req,res,next)=>{ privateHeaders({res});next(); });
  app.get("/api/data-room/documents/:id",async(req,res)=>{
    privateHeaders({res});res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","no-referrer");
    try {
      const ctx=await createContext({req,res}),actor=await getRoomActor(ctx);
      if(!actor){res.status(401).json({error:"An active investor login is required."});return;}
      if(!/^[1-9][0-9]{0,9}$/.test(req.params.id)||!['view','download'].includes(String(req.query.mode||'view'))){res.status(404).json({error:"Document not found."});return;}
      const db=await roomDb();const [doc]=await db.select().from(roomDocuments).where(and(eq(roomDocuments.id,Number(req.params.id)),eq(roomDocuments.archived,false))).limit(1);
      if(!doc||(!doc.published&&actor.role!=="admin")){res.status(404).json({error:"Document not found."});return;}
      const kind=roomFileKind(doc.filename);
      // Browsers cannot safely render Excel workbooks; never expose them through public viewers.
      const download=req.query.mode==='download'||kind!=="pdf";
      if(download&&!doc.allowDownload&&actor.role!=="admin"){res.status(403).json({error:"Download is not enabled for this document."});return;}
      const signed=await storageGetSignedUrl(doc.storageKey),stored=await fetch(signed,{signal:AbortSignal.timeout(30000)});
      if(!stored.ok)throw new Error("Private object fetch failed");
      const encrypted=Buffer.from(await stored.arrayBuffer());if(encrypted.length>MAX_DOCUMENT_BYTES+32)throw new Error("Invalid object length");
      const bytes=decryptDocument(encrypted);if(bytes.length!==doc.sizeBytes)throw new Error("Invalid document length");
      // Recheck access after storage fetch so a concurrent revocation cannot release bytes.
      const stillAuthorized=await getRoomActor(ctx);const [current]=await db.select().from(roomDocuments).where(eq(roomDocuments.id,doc.id)).limit(1);
      if(!stillAuthorized||!current||current.archived||current.storageKey!==doc.storageKey||(!current.published&&stillAuthorized.role!=="admin")||(download&&!current.allowDownload&&stillAuthorized.role!=="admin")){res.status(403).json({error:"Access is no longer available."});return;}
      await audit(actor.email||actor.name,download?"Document downloaded":"Document viewed",`${doc.title} — version ${doc.version}`);
      res.setHeader("Content-Type",ROOM_FILE_MIME[kind]);res.setHeader("Content-Length",String(bytes.length));
      const filename=safeFilename(doc.filename),ascii=filename.replace(/[^\x20-\x7e]/g,'_');
      res.setHeader("Content-Disposition",`${download?'attachment':'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader("Content-Security-Policy","frame-ancestors 'self'; script-src 'none'; object-src 'none'");res.send(bytes);
    } catch { if(!res.headersSent)res.status(503).json({error:"The private document could not be opened. Please try again."}); }
  });
}
