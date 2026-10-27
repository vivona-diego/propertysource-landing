import { bigint, boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"), email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const roomAccounts = mysqlTable("room_accounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "investor"]).notNull().default("investor"),
  status: mysqlEnum("status", ["invited", "active", "revoked"]).notNull().default("invited"),
  passwordHash: varchar("password_hash", { length: 256 }),
  expiresAt: bigint("expires_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  lastLoginAt: bigint("last_login_at", { mode: "number" }),
});
export const roomInvites = mysqlTable("room_invites", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("account_id").notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  consumedAt: bigint("consumed_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, t => [index("room_invites_account_idx").on(t.accountId)]);
export const roomSessions = mysqlTable("room_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).notNull().primaryKey(),
  accountId: int("account_id").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, t => [index("room_sessions_account_idx").on(t.accountId)]);
export const roomDocuments = mysqlTable("room_documents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  filename: varchar("filename", { length: 200 }).notNull(),
  storageKey: varchar("storage_key", { length: 400 }).notNull(),
  sizeBytes: int("size_bytes").notNull(),
  version: int("version").notNull().default(1),
  published: boolean("published").notNull().default(false),
  allowDownload: boolean("allow_download").notNull().default(true),
  archived: boolean("archived").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
export const roomAudit = mysqlTable("room_audit", {
  id: int("id").autoincrement().primaryKey(),
  actor: varchar("actor", { length: 254 }).notNull(),
  event: varchar("event", { length: 80 }).notNull(),
  detail: varchar("detail", { length: 500 }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
export const roomAuthLimits = mysqlTable("room_auth_limits", {
  key: varchar("limit_key", { length: 64 }).notNull().primaryKey(),
  attempts: int("attempts").notNull().default(0),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});
