import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: dbMocks.getDb,
}));

import { ENV } from "./_core/env";
import { documentProjection } from "./dataRoomAdminRouter";
import { getRoomActor, ROOM_COOKIE } from "./dataRoomAccess";
import { dataRoomRouter } from "./dataRoomRouter";

type RoomAccount = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "investor";
  status: "invited" | "active" | "revoked";
  passwordHash: string | null;
  expiresAt: number | null;
  createdAt: number;
  lastLoginAt: number | null;
};

type RoomSessionRecord = { account: RoomAccount };

const ownerOpenId = "security-test-owner";
const validToken = "A".repeat(43);

function context(options: {
  cookie?: string;
  headers?: Record<string, string>;
  user?: Partial<NonNullable<TrpcContext["user"]>> | null;
} = {}): TrpcContext {
  const headers = { ...options.headers };
  if (options.cookie) headers.cookie = options.cookie;

  const user = options.user === null || options.user === undefined
    ? null
    : {
        id: 9,
        openId: "ordinary-user",
        email: "ordinary@example.test",
        name: "Ordinary User",
        loginMethod: "manus",
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        ...options.user,
      };

  return {
    user,
    req: {
      headers,
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {
      setHeader: vi.fn(),
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

/** Builds only the Drizzle fluent path used by getRoomActor. */
function sessionDb(records: RoomSessionRecord[]) {
  const limit = vi.fn().mockResolvedValue(records);
  const where = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ innerJoin }));
  return {
    select: vi.fn(() => ({ from })),
    calls: { from, innerJoin, where, limit },
  };
}

/** Returns select results in order while supporting the narrow paths used below. */
function queuedDb(selectResults: unknown[][], transactionUpdateResults: number[] = []) {
  const select = vi.fn(() => {
    const result = selectResults.shift() ?? [];
    const limit = vi.fn().mockResolvedValue(result);
    const where = vi.fn(() => ({ limit }));
    const innerJoin = vi.fn(() => ({ where }));
    const from = vi.fn(() => ({ where, innerJoin }));
    return { from };
  });

  const values = vi.fn(() => ({
    onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
    $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
  }));
  const insert = vi.fn(() => ({ values }));
  const updates: ReturnType<typeof vi.fn>[] = [];
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      update: vi.fn(() => {
        const affectedRows = transactionUpdateResults.shift() ?? 1;
        const where = vi.fn().mockResolvedValue([{ affectedRows }]);
        const set = vi.fn(() => ({ where }));
        updates.push(where);
        return { set };
      }),
    };
    return callback(tx);
  });

  return { select, insert, transaction, updates };
}

function activeInvestor(overrides: Partial<RoomAccount> = {}): RoomAccount {
  return {
    id: 42,
    name: "Approved Investor",
    email: "investor@example.test",
    role: "investor",
    status: "active",
    passwordHash: "scrypt-v1:0123456789abcdef0123456789abcdef:" + "a".repeat(128),
    expiresAt: null,
    createdAt: 1,
    lastLoginAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  ENV.ownerOpenId = ownerOpenId;
  dbMocks.getDb.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  ENV.ownerOpenId = "";
});

describe("getRoomActor", () => {
  it("fails closed on a malformed data-room cookie and does not fall back to the website owner", async () => {
    const actor = await getRoomActor(context({
      cookie: `${ROOM_COOKIE}=not-a-32-byte-token`,
      user: { openId: ownerOpenId, role: "admin" },
    }));

    expect(actor).toBeNull();
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("only synthesizes an owner actor for the configured website owner with the website admin role", async () => {
    await expect(getRoomActor(context({ user: { openId: ownerOpenId, role: "admin" } }))).resolves.toMatchObject({
      id: 0,
      role: "admin",
      authSource: "owner",
    });
    await expect(getRoomActor(context({ user: { openId: ownerOpenId, role: "user" } }))).resolves.toBeNull();
    await expect(getRoomActor(context({ user: { openId: "different-admin", role: "admin" } }))).resolves.toBeNull();
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("accepts only a database-backed active session/account and exposes no session token", async () => {
    const db = sessionDb([{ account: activeInvestor() }]);
    dbMocks.getDb.mockResolvedValue(db);

    const actor = await getRoomActor(context({ cookie: `${ROOM_COOKIE}=${validToken}` }));

    expect(actor).toEqual({
      id: 42,
      name: "Approved Investor",
      email: "investor@example.test",
      role: "investor",
      authSource: "password",
      expiresAt: null,
    });
    expect(db.calls.innerJoin).toHaveBeenCalledTimes(1);
    expect(db.calls.where).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(actor)).not.toContain(validToken);
  });

  it.each([
    ["a revoked account", { status: "revoked" as const }],
    ["an invitation that was never accepted", { status: "invited" as const }],
    ["an expired account", { expiresAt: Date.now() - 1 }],
  ])("fails closed for %s even if a session row is returned", async (_label, overrides) => {
    const db = sessionDb([{ account: activeInvestor(overrides) }]);
    dbMocks.getDb.mockResolvedValue(db);

    await expect(getRoomActor(context({ cookie: `${ROOM_COOKIE}=${validToken}` }))).resolves.toBeNull();
  });

  it("does not treat an unavailable session database as owner authentication when a cookie is presented", async () => {
    dbMocks.getDb.mockResolvedValue(undefined);

    await expect(getRoomActor(context({
      cookie: `${ROOM_COOKIE}=${validToken}`,
      user: { openId: ownerOpenId, role: "admin" },
    }))).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});

describe("data-room router authorization boundaries", () => {
  it("rejects unauthenticated protected document queries before any database query", async () => {
    const caller = dataRoomRouter.createCaller(context());

    await expect(caller.documents.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects an investor session at the admin-router boundary before executing admin queries", async () => {
    const db = sessionDb([{ account: activeInvestor() }]);
    dbMocks.getDb.mockResolvedValue(db);
    const caller = dataRoomRouter.createCaller(context({ cookie: `${ROOM_COOKIE}=${validToken}` }));

    await expect(caller.admin.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("limits administrator-password bootstrap to the verified website owner, not a room admin session", async () => {
    const roomAdmin = activeInvestor({ role: "admin", email: "room-admin@example.test" });
    const db = sessionDb([{ account: roomAdmin }]);
    dbMocks.getDb.mockResolvedValue(db);
    const caller = dataRoomRouter.createCaller(context({
      cookie: `${ROOM_COOKIE}=${validToken}`,
      headers: { "x-data-room-request": "1" },
    }));

    await expect(caller.setupAdmin({
      name: "Replacement Admin",
      email: "replacement@example.test",
      password: "a-strong-test-password",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("rejects bootstrap attempts from a different website administrator", async () => {
    const caller = dataRoomRouter.createCaller(context({
      headers: { "x-data-room-request": "1" },
      user: { openId: "another-website-admin", role: "admin" },
    }));

    await expect(caller.setupAdmin({
      name: "Untrusted Admin",
      email: "untrusted@example.test",
      password: "a-strong-test-password",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("requires the custom mutation header before logout can touch server state", async () => {
    const caller = dataRoomRouter.createCaller(context());

    await expect(caller.logout()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects a cross-site mutation even when the custom header is present", async () => {
    const caller = dataRoomRouter.createCaller(context({
      headers: { "x-data-room-request": "1", "sec-fetch-site": "cross-site" },
      user: { openId: ownerOpenId, role: "admin" },
    }));

    await expect(caller.setupAdmin({
      name: "Cross Site",
      email: "cross-site@example.test",
      password: "a-strong-test-password",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects an invite acceptance race when conditional invite consumption loses", async () => {
    const investor = activeInvestor({ status: "invited", passwordHash: null });
    const db = queuedDb([
      [{ attempts: 1 }],
      [{ attempts: 1 }],
      [{ invite: { id: 77 }, account: investor }],
    ], [0]);
    dbMocks.getDb.mockResolvedValue(db);
    const caller = dataRoomRouter.createCaller(context({ headers: { "x-data-room-request": "1" } }));

    await expect(caller.acceptInvite({ token: validToken, password: "a-strong-test-password" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("already used"),
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.updates).toHaveLength(1);
  });
});

describe("document response data", () => {
  it("keeps the private object storage key out of document-list projections", () => {
    expect(Object.keys(documentProjection)).toEqual(expect.arrayContaining([
      "id", "title", "filename", "published", "allowDownload",
    ]));
    expect(documentProjection).not.toHaveProperty("storageKey");
    expect(Object.keys(documentProjection)).not.toContain("archived");
  });
});

describe("Investor status changes", () => {
  it("cannot activate an investor whose invitation has not been accepted", async () => {
    const db = queuedDb([
      [{ account: activeInvestor({ role: "admin" }) }],
      [activeInvestor({ status: "invited", passwordHash: null })],
    ]);
    dbMocks.getDb.mockResolvedValue(db);
    const caller = dataRoomRouter.createCaller(context({ cookie: `${ROOM_COOKIE}=${validToken}`, headers: { "x-data-room-request": "1" } }));
    await expect(caller.admin.setInvestorAccess({ id: 42, status: "active", expiresAt: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("cannot downgrade an accepted account into invited status through expiry editing", async () => {
    const db = queuedDb([
      [{ account: activeInvestor({ role: "admin" }) }],
      [activeInvestor()],
    ]);
    dbMocks.getDb.mockResolvedValue(db);
    const caller = dataRoomRouter.createCaller(context({ cookie: `${ROOM_COOKIE}=${validToken}`, headers: { "x-data-room-request": "1" } }));
    await expect(caller.admin.setInvestorAccess({ id: 42, status: "invited", expiresAt: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
