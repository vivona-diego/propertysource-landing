import "dotenv/config";
import express from "express";
import path from "node:path";
import { createServer } from "node:http";
import api from "../api/index";
import { serveStatic, setupVite } from "./_core/vite";

async function start() {
  const app = express();
  const server = createServer(app);
  // Public marketing images only. Confidential room documents never live here.
  app.use("/manus-storage", express.static(path.resolve("static-assets/manus-storage")));
  app.use(api);
  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);
  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => console.log(`Property Hub Exchange listening on ${port}`));
}
start().catch(error => { console.error(error); process.exitCode = 1; });
