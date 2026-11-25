import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const rawUrl = (req.url || "/").split("?")[0];
  let relPath = decodeURIComponent(rawUrl);
  if (relPath === "/") relPath = "/index.html";

  const fullPath = path.resolve(__dirname, "." + relPath);
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(fullPath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const total = stat.size;
    const baseHeaders = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    };

    const range = req.headers.range;
    if (range && range.startsWith("bytes=")) {
      const [startStr, endStr] = range.replace("bytes=", "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : total - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        res.writeHead(416, { "Content-Range": `bytes */${total}` });
        res.end();
        return;
      }
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(chunkSize),
      });
      if (method === "HEAD") { res.end(); return; }
      fs.createReadStream(fullPath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      ...baseHeaders,
      "Content-Length": String(total),
    });
    if (method === "HEAD") { res.end(); return; }
    fs.createReadStream(fullPath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`BeatFrame dev server running at http://localhost:${PORT}`);
});
