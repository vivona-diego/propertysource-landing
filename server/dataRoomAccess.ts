import { TRPCError } from "@trpc/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { parse } from "cookie";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import { publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { roomAccounts, roomSessions, roomAuthLimits, roomAudit } from "../drizzle/schema";
import { digest, newToken } from "./dataRoomCrypto";

export const ROOM_COOKIE = "__Host-phe_data_room";
export const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export const SESSION_MS = 12 * 60 * 60 * 1000;
export type RoomActor = { id: number; name: string; email: string; role: "admin" | "investor"; authSource: "owner" | "password"; expiresAt: number | null };
export async function roomDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The secure data room is temporarily unavailable. Please try again later." });
  return db;
}
export function privateHeaders(ctx: Pick<TrpcContext, "res">) {
  ctx.res.setHeader("Cache-Control", "private, no-store, max-age=0");
  ctx.res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
}
export function requireMutationHeader(ctx: Pick<TrpcContext, "req">) {
  if (ctx.req.headers["x-data-room-request"] !== "1" || ctx.req.headers["sec-fetch-site"] === "cross-site") throw new TRPCError({ code: "FORBIDDEN", message: "This action must be submitted from the secure data room." });
}
export async function getRoomActor(ctx: TrpcContext): Promise<RoomActor | null> {
  const raw = parse(ctx.req.headers.cookie ?? "")[ROOM_COOKIE];
  if (raw) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const db = await roomDb();
    const [record] = await db.select({ account: roomAccounts }).from(roomSessions).innerJoin(roomAccounts, eq(roomAccounts.id, roomSessions.accountId)).where(and(eq(roomSessions.tokenHash, digest(raw)),gt(roomSessions.expiresAt, Date.now()))).limit(1);
    if (!record || record.account.status !== "active" || (record.account.expiresAt !== null && record.account.expiresAt <= Date.now())) return null;
    const a = record.account;
    return { id: a.id, name: a.name, email: a.email, role: a.role, authSource: "password", expiresAt: a.expiresAt };
  }
  if (ENV.ownerOpenId && ctx.user?.openId === ENV.ownerOpenId && ctx.user.role === "admin") {
    return { id: 0, name: ctx.user.name || "Administrator", email: ctx.user.email || "", role: "admin", authSource: "owner", expiresAt: null };
  }
  return null;
}
export const roomPublicProcedure = publicProcedure.use(async ({ ctx, type, next }) => {
  privateHeaders(ctx);
  if (type === "mutation") requireMutationHeader(ctx);
  return next({ ctx });
});
export const roomProcedure = roomPublicProcedure.use(async ({ ctx, next }) => {
  const actor = await getRoomActor(ctx);
  if (!actor) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in with an active investor invitation." });
  return next({ ctx: { ...ctx, roomActor: actor } });
});
export const roomAdminProcedure = roomProcedure.use(({ ctx, next }) => {
  if (ctx.roomActor.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  return next({ ctx });
});
export async function audit(actor: string, event: string, detail: string) {
  const db = await roomDb();
  await db.insert(roomAudit).values({ actor: actor.slice(0,254), event: event.slice(0,80), detail: detail.slice(0,500), createdAt: Date.now() });
}
export async function startRoomSession(ctx: TrpcContext, accountId: number, accountExpiry: number | null) {
  const db = await roomDb(), token = newToken(), now = Date.now();
  const expiresAt = accountExpiry === null ? now + SESSION_MS : Math.min(now + SESSION_MS, accountExpiry);
  await db.insert(roomSessions).values({ tokenHash: digest(token), accountId, createdAt: now, expiresAt });
  ctx.res.cookie(ROOM_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: expiresAt - now });
}
export async function throttle(key: string, maximum = 8) {
  const db = await roomDb(), now = Date.now(), boundary = now - 15 * 60 * 1000, hash = digest(key);
  await db.insert(roomAuthLimits).values({ key: hash, attempts: 1, windowStart: now }).onDuplicateKeyUpdate({ set: {
    attempts: sql`CASE WHEN ${roomAuthLimits.windowStart} < ${boundary} THEN 1 ELSE ${roomAuthLimits.attempts} + 1 END`,
    windowStart: sql`CASE WHEN ${roomAuthLimits.windowStart} < ${boundary} THEN ${now} ELSE ${roomAuthLimits.windowStart} END`,
  } });
  const [row] = await db.select().from(roomAuthLimits).where(eq(roomAuthLimits.key, hash)).limit(1);
  if (row && row.attempts > maximum) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again in 15 minutes." });
}
export async function authThrottle(ctx: TrpcContext, identity: string) {
  await throttle(`ip:${ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown"}`, 100);
  await throttle(`identity:${identity}`, 8);
}
export const validExpiry = (expiresAt: number | null) => expiresAt === null || expiresAt > Date.now();
