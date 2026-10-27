import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { router } from "./_core/trpc";
import { roomAccounts, roomAudit, roomDocuments, roomInvites, roomSessions } from "../drizzle/schema";
import { audit, roomAdminProcedure, roomDb, validExpiry } from "./dataRoomAccess";
import { digest, encryptDocument, newToken, safeFilename } from "./dataRoomCrypto";
import { decodeRoomDocument, MAX_DOCUMENT_BYTES } from "./dataRoomFileTypes";
import { storagePut } from "./storage";

const idInput=z.object({id:z.number().int().positive()});
const expiryInput=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();
const documentFields={title:z.string().trim().min(1).max(160),description:z.string().trim().max(1000),category:z.string().trim().min(1).max(80),allowDownload:z.boolean(),published:z.boolean()};
export const documentProjection={id:roomDocuments.id,title:roomDocuments.title,description:roomDocuments.description,category:roomDocuments.category,filename:roomDocuments.filename,sizeBytes:roomDocuments.sizeBytes,version:roomDocuments.version,published:roomDocuments.published,allowDownload:roomDocuments.allowDownload,createdAt:roomDocuments.createdAt,updatedAt:roomDocuments.updatedAt};
const investorProjection={id:roomAccounts.id,name:roomAccounts.name,email:roomAccounts.email,status:roomAccounts.status,expiresAt:roomAccounts.expiresAt,createdAt:roomAccounts.createdAt,lastLoginAt:roomAccounts.lastLoginAt};
async function existingInvestor(id:number){const db=await roomDb();const [a]=await db.select().from(roomAccounts).where(and(eq(roomAccounts.id,id),eq(roomAccounts.role,"investor"))).limit(1);if(!a)throw new TRPCError({code:"NOT_FOUND",message:"Investor not found."});return a;}
async function makeInvitation(account:{id:number,name:string,email:string,expiresAt:number|null}){
  const token=newToken(),db=await roomDb(),now=Date.now(),expiresAt=account.expiresAt===null?now+7*86400000:Math.min(now+7*86400000,account.expiresAt);
  await db.insert(roomInvites).values({accountId:account.id,tokenHash:digest(token),expiresAt,createdAt:now});return {token,name:account.name,email:account.email};
}
export const dataRoomAdminRouter=router({
  overview:roomAdminProcedure.query(async()=>{
    const db=await roomDb();const [documents]=await db.select({n:count()}).from(roomDocuments).where(eq(roomDocuments.archived,false));const all=await db.select(investorProjection).from(roomAccounts).where(eq(roomAccounts.role,"investor"));const recentActivity=await db.select().from(roomAudit).orderBy(desc(roomAudit.id)).limit(6);return {documents:documents.n,activeInvestors:all.filter(a=>a.status==="active"&&validExpiry(a.expiresAt)).length,pendingInvites:all.filter(a=>a.status==="invited"&&validExpiry(a.expiresAt)).length,recentActivity};
  }),
  investors:roomAdminProcedure.query(async()=>{const db=await roomDb();return db.select(investorProjection).from(roomAccounts).where(eq(roomAccounts.role,"investor")).orderBy(desc(roomAccounts.createdAt));}),
  invite:roomAdminProcedure.input(z.object({email:z.string().trim().email().max(254),name:z.string().trim().min(1).max(120),expiresAt:expiryInput})).mutation(async({ctx,input})=>{
    if(!validExpiry(input.expiresAt))throw new TRPCError({code:"BAD_REQUEST",message:"Choose a future access expiration date."});const db=await roomDb(),email=input.email.toLowerCase();const [existing]=await db.select({id:roomAccounts.id}).from(roomAccounts).where(eq(roomAccounts.email,email)).limit(1);if(existing)throw new TRPCError({code:"CONFLICT",message:"That email already has an account. Use Renew invitation or manage its access."});
    const [inserted]=await db.insert(roomAccounts).values({name:input.name,email,role:"investor",status:"invited",expiresAt:input.expiresAt,createdAt:Date.now()}).$returningId();const result=await makeInvitation({id:inserted.id,name:input.name,email,expiresAt:input.expiresAt});await audit(ctx.roomActor.email||ctx.roomActor.name,"Investor invited",`${input.name} (${email})`);return result;
  }),
  resetInvite:roomAdminProcedure.input(idInput).mutation(async({ctx,input})=>{
    const a=await existingInvestor(input.id);if(!validExpiry(a.expiresAt))throw new TRPCError({code:"BAD_REQUEST",message:"Extend this investor’s expiration date before renewing the invitation."});const db=await roomDb();await db.transaction(async tx=>{await tx.delete(roomSessions).where(eq(roomSessions.accountId,a.id));await tx.update(roomInvites).set({consumedAt:Date.now()}).where(and(eq(roomInvites.accountId,a.id),isNull(roomInvites.consumedAt)));await tx.update(roomAccounts).set({status:"invited",passwordHash:null}).where(eq(roomAccounts.id,a.id));});const result=await makeInvitation(a);await audit(ctx.roomActor.email||ctx.roomActor.name,"Invitation renewed",`${a.name} — previous sessions and invitations invalidated`);return result;
  }),
  setInvestorAccess:roomAdminProcedure.input(idInput.extend({status:z.enum(["active","revoked","invited"]),expiresAt:expiryInput})).mutation(async({ctx,input})=>{
    const a=await existingInvestor(input.id);if(input.status==="active"&&(!a.passwordHash||!validExpiry(input.expiresAt)))throw new TRPCError({code:"BAD_REQUEST",message:"An accepted invitation and future expiration are required to activate access."});if(input.status==="invited"&&(a.status!=="invited"||!validExpiry(input.expiresAt)))throw new TRPCError({code:"BAD_REQUEST",message:"Only a pending invitation can keep invited status, with a future expiration."});const db=await roomDb();await db.update(roomAccounts).set({status:input.status,expiresAt:input.expiresAt}).where(eq(roomAccounts.id,a.id));await db.delete(roomSessions).where(eq(roomSessions.accountId,a.id));if(input.status==="revoked")await db.update(roomInvites).set({consumedAt:Date.now()}).where(and(eq(roomInvites.accountId,a.id),isNull(roomInvites.consumedAt)));await audit(ctx.roomActor.email||ctx.roomActor.name,input.status==="revoked"?"Investor revoked":"Investor access updated",`${a.name} (${a.email})`);return {success:true as const};
  }),
  documents:roomAdminProcedure.query(async()=>{const db=await roomDb();return db.select(documentProjection).from(roomDocuments).where(eq(roomDocuments.archived,false)).orderBy(desc(roomDocuments.updatedAt));}),
  uploadDocument:roomAdminProcedure.input(z.object({...documentFields,filename:z.string().min(1).max(200),base64:z.string().max(Math.ceil(MAX_DOCUMENT_BYTES*4/3)+4),replaceId:z.number().int().positive().optional()})).mutation(async({ctx,input})=>{
    let bytes:Buffer;try{bytes=decodeRoomDocument(input.base64,input.filename).bytes;}catch{throw new TRPCError({code:"BAD_REQUEST",message:"Choose a complete PDF or Excel (.xlsx or .xls) file no larger than 15 MB. Password-encrypted workbooks are not supported."});}const db=await roomDb();let existing:typeof roomDocuments.$inferSelect|undefined;
    if(input.replaceId){[existing]=await db.select().from(roomDocuments).where(and(eq(roomDocuments.id,input.replaceId),eq(roomDocuments.archived,false))).limit(1);if(!existing)throw new TRPCError({code:"NOT_FOUND",message:"Document not found."});}
    const {key}=await storagePut(`investor-room/${randomUUID()}.enc`,encryptDocument(bytes),"application/octet-stream");const now=Date.now(),values={title:input.title,description:input.description,category:input.category,filename:safeFilename(input.filename),storageKey:key,sizeBytes:bytes.length,published:input.published,allowDownload:input.allowDownload,updatedAt:now};let id:number;
    if(existing){id=existing.id;await db.update(roomDocuments).set({...values,version:existing.version+1}).where(eq(roomDocuments.id,id));}else{const [created]=await db.insert(roomDocuments).values({...values,createdAt:now}).$returningId();id=created.id;}
    await audit(ctx.roomActor.email||ctx.roomActor.name,existing?"Document replaced":"Document uploaded",`${input.title} — ${input.published?"published":"draft"}`);return {id};
  }),
  updateDocument:roomAdminProcedure.input(z.object({id:z.number().int().positive(),...documentFields})).mutation(async({ctx,input})=>{
    const db=await roomDb();const {id,...fields}=input;const result=await db.update(roomDocuments).set({...fields,updatedAt:Date.now()}).where(and(eq(roomDocuments.id,id),eq(roomDocuments.archived,false)));if(result[0].affectedRows!==1)throw new TRPCError({code:"NOT_FOUND",message:"Document not found."});await audit(ctx.roomActor.email||ctx.roomActor.name,"Document updated",`${input.title} — ${input.published?"published":"draft"}`);return {success:true as const};
  }),
  archiveDocument:roomAdminProcedure.input(idInput).mutation(async({ctx,input})=>{
    const db=await roomDb();const [doc]=await db.select({title:roomDocuments.title}).from(roomDocuments).where(and(eq(roomDocuments.id,input.id),eq(roomDocuments.archived,false))).limit(1);if(!doc)throw new TRPCError({code:"NOT_FOUND",message:"Document not found."});await db.update(roomDocuments).set({archived:true,published:false,updatedAt:Date.now()}).where(eq(roomDocuments.id,input.id));await audit(ctx.roomActor.email||ctx.roomActor.name,"Document archived",doc.title);return {success:true as const};
  }),
  activity:roomAdminProcedure.query(async()=>{const db=await roomDb();return db.select().from(roomAudit).orderBy(desc(roomAudit.id)).limit(100);}),
});
