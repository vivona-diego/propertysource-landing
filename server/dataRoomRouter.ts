import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { parse } from "cookie";
import { z } from "zod";
import { router } from "./_core/trpc";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { roomAccounts, roomInvites, roomSessions, roomDocuments } from "../drizzle/schema";
import { audit, authThrottle, COOKIE_OPTIONS, getRoomActor, ROOM_COOKIE, roomDb, roomProcedure, roomPublicProcedure, startRoomSession, validExpiry } from "./dataRoomAccess";
import { digest, hashPassword, newToken, verifyPassword } from "./dataRoomCrypto";
import { dataRoomAdminRouter, documentProjection } from "./dataRoomAdminRouter";

export const passwordInput = z.string().min(12, "Use at least 12 characters.").max(128);
const tokenInput = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid invitation.") });
const dummyPasswordHash = hashPassword(newToken());
const invalidInvite = () => new TRPCError({ code: "BAD_REQUEST", message: "This invitation is invalid, expired or already used. Please ask the administrator for a new invitation." });
async function invitation(token: string) {
  const db = await roomDb();
  const [entry] = await db.select({ invite: roomInvites, account: roomAccounts }).from(roomInvites).innerJoin(roomAccounts,eq(roomAccounts.id,roomInvites.accountId)).where(and(eq(roomInvites.tokenHash,digest(token)),isNull(roomInvites.consumedAt),gt(roomInvites.expiresAt,Date.now()))).limit(1);
  if (!entry || entry.account.status !== "invited" || !validExpiry(entry.account.expiresAt)) throw invalidInvite();
  return entry;
}
export const dataRoomRouter = router({
  me: roomPublicProcedure.query(({ ctx }) => getRoomActor(ctx)),
  login: roomPublicProcedure.input(z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
    const email = input.email.toLowerCase(); await authThrottle(ctx,email);
    const db = await roomDb();const [account] = await db.select().from(roomAccounts).where(eq(roomAccounts.email,email)).limit(1);
    const matches = await verifyPassword(input.password,account?.passwordHash || await dummyPasswordHash);
    if (!account || !matches || account.status !== "active" || !validExpiry(account.expiresAt)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Unable to sign in. Check your email and password, or ask the administrator to confirm your access." });
    await db.update(roomAccounts).set({ lastLoginAt:Date.now() }).where(eq(roomAccounts.id,account.id));
    await startRoomSession(ctx,account.id,account.expiresAt);await audit(account.email,"Signed in","Individual password login");return { success:true as const };
  }),
  logout: roomPublicProcedure.mutation(async ({ ctx }) => {
    const raw = parse(ctx.req.headers.cookie ?? "")[ROOM_COOKIE];
    ctx.res.clearCookie(ROOM_COOKIE,COOKIE_OPTIONS);ctx.res.clearCookie(COOKIE_NAME,getSessionCookieOptions(ctx.req));
    if(raw) { const db=await roomDb(); await db.delete(roomSessions).where(eq(roomSessions.tokenHash,digest(raw))); }
    return { success:true as const };
  }),
  inviteInfo: roomPublicProcedure.input(tokenInput).query(async ({ ctx,input }) => {
    await authThrottle(ctx,`invite-info:${digest(input.token)}`);const entry=await invitation(input.token);return { name:entry.account.name,email:entry.account.email };
  }),
  acceptInvite: roomPublicProcedure.input(tokenInput.extend({password:passwordInput})).mutation(async ({ctx,input}) => {
    await authThrottle(ctx,`accept:${digest(input.token)}`);const entry=await invitation(input.token),encoded=await hashPassword(input.password),db=await roomDb(),now=Date.now();
    await db.transaction(async tx=>{
      const consumed=await tx.update(roomInvites).set({consumedAt:now}).where(and(eq(roomInvites.id,entry.invite.id),isNull(roomInvites.consumedAt),gt(roomInvites.expiresAt,now)));
      if(consumed[0].affectedRows!==1)throw invalidInvite();
      const activated=await tx.update(roomAccounts).set({passwordHash:encoded,status:"active",lastLoginAt:now}).where(and(eq(roomAccounts.id,entry.account.id),eq(roomAccounts.status,"invited")));
      if(activated[0].affectedRows!==1)throw invalidInvite();
    });
    await startRoomSession(ctx,entry.account.id,entry.account.expiresAt);await audit(entry.account.email,"Invitation accepted","Individual investor account activated");return {success:true as const};
  }),
  setupAdmin: roomProcedure.input(z.object({email:z.string().trim().email().max(254),name:z.string().trim().min(1).max(120),password:passwordInput})).mutation(async ({ctx,input})=>{
    if(ctx.roomActor.authSource!=="owner")throw new TRPCError({code:"FORBIDDEN",message:"Only the verified website owner can configure the administrator login."});
    await authThrottle(ctx,`admin-setup:${ctx.roomActor.email}`);const db=await roomDb(),email=input.email.toLowerCase(),encoded=await hashPassword(input.password);const [existing]=await db.select().from(roomAccounts).where(eq(roomAccounts.email,email)).limit(1);let id:number;
    if(existing) {
      if(existing.role!=="admin")throw new TRPCError({code:"CONFLICT",message:"That email is already assigned to an investor. Choose a separate administrator email."});
      id=existing.id;await db.update(roomAccounts).set({name:input.name,passwordHash:encoded,status:"active",expiresAt:null}).where(eq(roomAccounts.id,id));await db.delete(roomSessions).where(eq(roomSessions.accountId,id));
    }else{const [inserted]=await db.insert(roomAccounts).values({name:input.name,email,role:"admin",status:"active",passwordHash:encoded,expiresAt:null,createdAt:Date.now()}).$returningId();id=inserted.id;}
    await startRoomSession(ctx,id,null);await audit(email,"Administrator configured","Verified website owner configured individual administrator login");return {success:true as const};
  }),
  changePassword: roomProcedure.input(z.object({currentPassword:z.string().min(1).max(128),newPassword:passwordInput})).mutation(async({ctx,input})=>{
    if(ctx.roomActor.authSource!=="password")throw new TRPCError({code:"BAD_REQUEST",message:"Set up an administrator email login first."});await authThrottle(ctx,`password-change:${ctx.roomActor.email}`);const db=await roomDb();const [account]=await db.select().from(roomAccounts).where(eq(roomAccounts.id,ctx.roomActor.id)).limit(1);
    if(!account?.passwordHash || !(await verifyPassword(input.currentPassword,account.passwordHash)))throw new TRPCError({code:"BAD_REQUEST",message:"The current password was not accepted."});
    await db.update(roomAccounts).set({passwordHash:await hashPassword(input.newPassword)}).where(eq(roomAccounts.id,account.id));await db.delete(roomSessions).where(eq(roomSessions.accountId,account.id));await startRoomSession(ctx,account.id,account.expiresAt);await audit(account.email,"Password changed","Previous sessions invalidated");return {success:true as const};
  }),
  documents:router({list:roomProcedure.query(async({ctx})=>{
    const db=await roomDb();return db.select(documentProjection).from(roomDocuments).where(ctx.roomActor.role==="admin"?eq(roomDocuments.archived,false):and(eq(roomDocuments.archived,false),eq(roomDocuments.published,true))).orderBy(desc(roomDocuments.updatedAt));
  })}),
  admin:dataRoomAdminRouter,
});
