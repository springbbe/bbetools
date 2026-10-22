#!/usr/bin/env node
/* File mẫu cho nhóm Âm thanh & video (cần Google Chrome, mạng để tải Mediabunny từ CDN):
   nhac-mau.mp3    – 30 giây nhạc tự tổng hợp, MP3 160 kbps     (Cắt, Đổi định dạng, Ghép âm thanh)
   nhac-mau-2.m4a  – 16 giây nhạc khác, AAC 128 kbps             (Ghép, Đổi định dạng âm thanh)
   video-mau.mp4   – 12 giây 1280×720 30 khung/giây, H.264 + AAC, khung hình khoá mỗi 2 giây, đồng hồ lớn trên hình
                     và tiếng bíp mỗi giây tròn (dễ kiểm tra cắt, khớp hình–tiếng)  (mọi công cụ video)
   Trang scripts/samples/media.html tạo file bằng WebCodecs + Mediabunny; script này điều khiển Chrome headless qua
   DevTools Protocol (WebSocket có sẵn trong Node 22) rồi ghi file ra samples/.
   Chạy:  node scripts/samples/media.js   (tự bật server ở cổng 8791 nếu chưa có) */
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = ROOT + "samples/";
const CHROME = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
export const MEDIA_SAMPLES = ["nhac-mau.mp3", "nhac-mau-2.m4a", "video-mau.mp4"];

async function up(url) { try { return (await fetch(url)).ok; } catch (_) { return false; } }

export async function makeMediaSamples(port = 8791) {
  if (!CHROME) throw new Error("Không tìm thấy Chrome. Đặt biến CHROME=/đường/dẫn/chrome");
  const page = `http://localhost:${port}/bbetools/scripts/samples/media.html`;
  let server = null;
  if (!(await up(page))) { server = spawn(process.execPath, [ROOT + "scripts/serve.js", String(port)], { stdio: "ignore" }); await new Promise((r) => setTimeout(r, 800)); }
  const dir = mkdtempSync(join(tmpdir(), "bbe-media-"));
  const proxy = process.env.HTTPS_PROXY ? ["--proxy-server=" + process.env.HTTPS_PROXY, "--proxy-bypass-list=localhost"] : [];
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + dir, "--no-first-run", "--no-default-browser-check", ...proxy, ...(process.getuid && process.getuid() === 0 ? ["--no-sandbox"] : []), "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    const wsUrl = await new Promise((res, rej) => {
      let buf = "";
      chrome.stderr.on("data", (d) => { buf += d; const m = /DevTools listening on (ws:\S+)/.exec(buf); if (m) res(m[1]); });
      setTimeout(() => rej(new Error("Chrome không khởi động được")), 20000);
    });
    const ws = new WebSocket(wsUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0;
    const pend = new Map(), events = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
      else events.forEach((f) => f(m));
    };
    const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const S = (m, p) => send(m, p, sessionId);
    await S("Page.enable");
    const loaded = new Promise((r) => events.push((m) => m.method === "Page.loadEventFired" && r()));
    await S("Page.navigate", { url: page });
    await loaded;
    for (let i = 0; i < 100; i++) {
      const r = await S("Runtime.evaluate", { expression: "!!window.sampleReady", returnByValue: true });
      if (r.result.value) break;
      await new Promise((ok) => setTimeout(ok, 100));
    }
    for (const name of MEDIA_SAMPLES) {
      const r = await S("Runtime.evaluate", { expression: `makeSample(${JSON.stringify(name)})`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(name + ": " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      writeFileSync(OUT + name, Buffer.from(r.result.value, "base64"));
    }
    ws.close();
  } finally {
    chrome.kill();
    if (server) server.kill();
    setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await makeMediaSamples();
  for (const f of MEDIA_SAMPLES) console.log(`✓ ${f}`);
}
