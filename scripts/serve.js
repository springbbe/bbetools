#!/usr/bin/env node
/* Server tĩnh để chạy thử ở máy, giống GitHub Pages:
   - phục vụ site dưới /bbetools/ (đúng như trên springbbe.github.io/bbetools/) để bắt lỗi đường dẫn tuyệt đối
   - /bbetools/ghep-pdf → chuyển hướng sang /bbetools/ghep-pdf/
   - đường dẫn không tồn tại → trả 404.html với mã 404
   - tắt cache hoàn toàn
   Chạy:  node scripts/serve.js [cổng]   rồi mở http://localhost:8080/bbetools/ */
import http from "node:http";
import { createReadStream } from "node:fs";
import { stat, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { ROOT, loadRegistry } from "./registry.js";

const reg = await loadRegistry();
const PREFIX = new URL(reg.site.baseUrl).pathname; // "/bbetools/"
const PORT = +(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".avif": "image/avif",
  ".heic": "image/heic", ".pdf": "application/pdf", ".wasm": "application/wasm", ".onnx": "application/octet-stream",
  ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".csv": "text/csv; charset=utf-8"
};
const isFile = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };
const isDir = async (p) => { try { return (await stat(p)).isDirectory(); } catch { return false; } };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let path = decodeURIComponent(url.pathname);
  const send = (code, file, extra = {}) => {
    res.writeHead(code, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store", ...extra });
    createReadStream(file).pipe(res);
    console.log(code, req.method, url.pathname);
  };
  if (path === "/" || path === PREFIX.slice(0, -1)) { res.writeHead(302, { Location: PREFIX }); return res.end(); }
  if (!path.startsWith(PREFIX)) return send(404, join(ROOT, "404.html"));
  const rel = normalize(path.slice(PREFIX.length)).replace(/^(\.\.(\/|\\|$))+/, "");
  let file = join(ROOT, rel);
  if (!(file + "/").startsWith(ROOT)) return send(404, join(ROOT, "404.html"));
  if (await isDir(file)) {
    if (!path.endsWith("/")) { res.writeHead(301, { Location: path + "/" + url.search }); return res.end(); }
    file = join(file, "index.html");
  }
  if (await isFile(file)) return send(200, file);
  return send(404, join(ROOT, "404.html"));
}).listen(PORT, () => console.log(`BbeTools đang chạy: http://localhost:${PORT}${PREFIX}  (Ctrl+C để dừng)`));
