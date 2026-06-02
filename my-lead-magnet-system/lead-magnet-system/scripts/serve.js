#!/usr/bin/env node
/**
 * serve.js
 *
 * Minimal static file server for previewing generated landing pages and
 * lead-magnet HTML locally. Zero dependencies.
 *
 * Usage:
 *   npm run serve            # serves repo root on http://localhost:4321
 *   npm run serve -- 8080    # custom port
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const PORT = Number(process.argv[2]) || 4321;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    let filePath = path.join(ROOT, urlPath);

    // Prevent path traversal outside ROOT.
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }

    if (!info) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Server error");
    console.error(err);
  }
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`→ http://localhost:${PORT}/`);
  console.log(`→ http://localhost:${PORT}/website/lead-magnets/`);
});
