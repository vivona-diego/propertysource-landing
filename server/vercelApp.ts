import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./_core/context";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { registerDataRoomFiles } from "./dataRoomFiles";

// Shared API implementation for the portable Node server and Vercel Function.
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
registerDataRoomFiles(app);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
app.use("/api", (_req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.status(404).json({ error: "API route not found." });
});
export default app;
