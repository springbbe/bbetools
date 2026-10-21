#!/usr/bin/env node
/* Tạo lại các file mẫu trong samples/ (dùng cho nút "Thử với file mẫu").
   Cần: Google Chrome (chạy headless) và sips (có sẵn trên macOS) để xuất HEIC.
   Chạy:  node scripts/make-samples.js
   Ảnh chân dung mẫu (chan-dung-mau.jpg) không tạo ở đây: xem nguồn và giấy phép trong samples/README.md. */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, statSync, mkdirSync } from "node:fs";
import { ROOT } from "./registry.js";

const CHROME = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
if (!CHROME) { console.error("Không tìm thấy Chrome. Đặt biến CHROME=/đường/dẫn/chrome"); process.exit(1); }
const PORT = 8791, BASE = `http://localhost:${PORT}/bbetools/`;
const OUT = ROOT + "samples/", TMP = ROOT + "samples/.tmp/";
mkdirSync(TMP, { recursive: true });

const server = spawn(process.execPath, [ROOT + "scripts/serve.js", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const chrome = (...args) => execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--virtual-time-budget=15000", ...(process.getuid && process.getuid() === 0 ? ["--no-sandbox"] : []), ...args], { stdio: "ignore", timeout: 120000 });
const pdf = (url, file) => chrome("--no-pdf-header-footer", `--print-to-pdf=${OUT + file}`, BASE + url);
const shot = (url, file, w, h) => chrome(`--screenshot=${file}`, `--window-size=${w},${h}`, BASE + url);

try {
  pdf("scripts/samples/bao-cao.html?t=" + encodeURIComponent("Báo cáo quý 1") + "&c=%23E5484D&p=2", "bao-cao-quy-1.pdf");
  pdf("scripts/samples/bao-cao.html?t=" + encodeURIComponent("Báo cáo quý 2") + "&c=%233E63DD&p=3", "bao-cao-quy-2.pdf");
  pdf("scripts/samples/scan.html", "tai-lieu-scan.pdf");
  pdf("scripts/samples/so-tay.html", "so-tay-nhan-vien.pdf");
  shot("scripts/samples/phong-canh.html", TMP + "phong-canh.png", 2400, 1600);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "92", TMP + "phong-canh.png", "--out", OUT + "anh-phong-canh.jpg"], { stdio: "ignore" });
  execFileSync("sips", ["-Z", "2016", "-s", "format", "heic", "-s", "formatOptions", "80", TMP + "phong-canh.png", "--out", OUT + "anh-iphone.heic"], { stdio: "ignore" });
  shot("", OUT + "anh-chup-man-hinh.png", 1280, 800);
  shot("scripts/samples/qr.html", OUT + "ma-qr-mau.png", 600, 600);
} finally {
  server.kill();
  execFileSync("rm", ["-rf", TMP]);
}
for (const f of ["bao-cao-quy-1.pdf", "bao-cao-quy-2.pdf", "tai-lieu-scan.pdf", "so-tay-nhan-vien.pdf", "anh-phong-canh.jpg", "anh-iphone.heic", "anh-chup-man-hinh.png", "ma-qr-mau.png", "chan-dung-mau.jpg"]) {
  console.log(existsSync(OUT + f) ? `✓ ${f}  ${(statSync(OUT + f).size / 1024).toFixed(0)} KB` : `✗ thiếu ${f}`);
}
