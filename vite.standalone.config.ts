import fs from "node:fs";
import path from "node:path";
import { defineConfig, mergeConfig, type Plugin } from "vite";
import managedConfig from "./vite.config";

// The managed site resolves these URLs through hosted storage. The GitHub export
// includes the exact same files and serves them locally, without storage secrets.
function bundledMarketplaceAssets(): Plugin {
  return {
    name: "bundled-marketplace-assets",
    configureServer(server) {
      server.middlewares.use("/manus-storage", (req, res, next) => {
        const name = (req.url ?? "").split("?")[0].replace(/^\//, "");
        if (!/^[A-Za-z0-9_.-]+$/.test(name)) return next();
        const file = path.resolve(import.meta.dirname, "static-assets", "manus-storage", name);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        const types: Record<string, string> = {
          ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
          ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif",
        };
        res.setHeader("Content-Type", types[path.extname(name)] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "public, max-age=3600");
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      fs.cpSync(
        path.resolve(import.meta.dirname, "static-assets", "manus-storage"),
        path.resolve(import.meta.dirname, "dist", "public", "manus-storage"),
        { recursive: true },
      );
    },
  };
}

// Prepend the local handler before the original managed-storage middleware.
export default defineConfig(mergeConfig(
  { plugins: [bundledMarketplaceAssets()] },
  managedConfig,
));
