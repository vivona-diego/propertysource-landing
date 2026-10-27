import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import app from "./vercelApp";

let server: Server;
let origin: string;
beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });

describe("portable API routing", () => {
  it("returns a JSON 404 instead of marketing HTML for an unknown API route", async () => {
    const response = await fetch(`${origin}/api/not-a-real-route`);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ error: "API route not found." });
  });
  it("never releases a private document to an anonymous visitor", async () => {
    const response = await fetch(`${origin}/api/data-room/documents/1?mode=download`);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toHaveProperty("error");
  });
  it("serves the real tRPC endpoint without inventing an anonymous room session", async () => {
    const response = await fetch(`${origin}/api/trpc/dataRoom.me`);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.result.data.json).toBeNull();
  });
});
