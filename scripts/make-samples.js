#!/usr/bin/env node
/* Tạo lại các file mẫu trong samples/ (dùng cho nút "Thử với file mẫu").
   Cần: Google Chrome (chạy headless) và sips (có sẵn trên macOS) để xuất HEIC.
   Chạy:  node scripts/make-samples.js
   Ảnh chân dung mẫu (chan-dung-mau.jpg) không tạo ở đây: xem nguồn và giấy phép trong samples/README.md. */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { ROOT } from "./registry.js";
import { makeGpsJpeg } from "./samples/anh-co-gps.js";
import { makeOfficeSamples } from "./samples/van-phong.js";
import { makeSecuritySamples } from "./samples/bao-mat.js";

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
// file PDF tạo bằng pdf-lib trong trình duyệt (scripts/samples/pdf-lib.html): đọc base64 trong <pre id="out"> từ --dump-dom
const pdfLib = (mau, file, page = "pdf-lib.html?mau=" + mau) => {
  const html = execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--virtual-time-budget=30000", ...(process.getuid && process.getuid() === 0 ? ["--no-sandbox"] : []), "--dump-dom", BASE + "scripts/samples/" + page], { encoding: "utf8", maxBuffer: 64 << 20, timeout: 120000 });
  const b64 = (/<pre id="out">([A-Za-z0-9+/=]+)<\/pre>/.exec(html) || [])[1];
  if (!b64) throw new Error("Không tạo được " + file);
  writeFileSync(OUT + file, Buffer.from(b64, "base64"));
};

try {
  pdf("scripts/samples/bao-cao.html?t=" + encodeURIComponent("Báo cáo quý 1") + "&c=%23E5484D&p=2", "bao-cao-quy-1.pdf");
  pdf("scripts/samples/bao-cao.html?t=" + encodeURIComponent("Báo cáo quý 2") + "&c=%233E63DD&p=3", "bao-cao-quy-2.pdf");
  pdf("scripts/samples/scan.html", "tai-lieu-scan.pdf");
  pdf("scripts/samples/so-tay.html", "so-tay-nhan-vien.pdf");
  pdfLib("co-anh", "tai-lieu-co-anh.pdf");
  pdfLib("to-khai", "to-khai-mau.pdf");
  pdfLib("to-khai-da-dien", "to-khai-da-dien.pdf");
  pdfLib("mat-khau", "mau-co-mat-khau-1234.pdf"); // cần bao-cao-quy-2.pdf ở trên
  pdfLib("", "giay-to-chup.jpg", "giay-chup.html");
  pdfLib("", "chu-ky-chup.jpg", "anh-mau.html?mau=chu-ky");
  pdfLib("", "van-ban-chup.jpg", "anh-mau.html?mau=van-ban");
  shot("scripts/samples/phong-canh.html", TMP + "phong-canh.png", 2400, 1600);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "92", TMP + "phong-canh.png", "--out", OUT + "anh-phong-canh.jpg"], { stdio: "ignore" });
  execFileSync("sips", ["-Z", "2016", "-s", "format", "heic", "-s", "formatOptions", "80", TMP + "phong-canh.png", "--out", OUT + "anh-iphone.heic"], { stdio: "ignore" });
  // ảnh có EXIF/GPS giả (Xoá thông tin EXIF/GPS): bản JPEG và bản HEIC (sips giữ nguyên EXIF khi chuyển)
  execFileSync("sips", ["-Z", "1600", "-s", "format", "jpeg", "-s", "formatOptions", "85", OUT + "anh-phong-canh.jpg", "--out", TMP + "pc.jpg"], { stdio: "ignore" });
  makeGpsJpeg(TMP + "pc.jpg", OUT + "anh-co-gps.jpg");
  execFileSync("sips", ["-s", "format", "heic", OUT + "anh-co-gps.jpg", "--out", OUT + "anh-iphone-co-gps.heic"], { stdio: "ignore" });
  shot("", OUT + "anh-chup-man-hinh.png", 1280, 800);
  shot("scripts/samples/qr.html", OUT + "ma-qr-mau.png", 600, 600);
  await makeOfficeSamples(); // Excel, CSV, JSON, Word (không cần Chrome)
  await makeSecuritySamples(); // file mã hoá, file checksum (cần bao-cao-quy-1.pdf ở trên)
} finally {
  server.kill();
  execFileSync("rm", ["-rf", TMP]);
}
for (const f of ["bao-cao-quy-1.pdf", "bao-cao-quy-2.pdf", "tai-lieu-scan.pdf", "so-tay-nhan-vien.pdf", "tai-lieu-co-anh.pdf", "to-khai-mau.pdf", "to-khai-da-dien.pdf", "mau-co-mat-khau-1234.pdf", "giay-to-chup.jpg", "chu-ky-chup.jpg", "van-ban-chup.jpg", "anh-phong-canh.jpg", "anh-iphone.heic", "anh-co-gps.jpg", "anh-iphone-co-gps.heic", "anh-chup-man-hinh.png", "ma-qr-mau.png", "chan-dung-mau.jpg", "nhan-vien.xlsx", "ban-hang-thang-9.xlsx", "ban-hang-thang-10.xlsx", "ban-hang-thang-11.csv", "san-pham.json", "khach-moi.xlsx", "giay-moi-mau.docx", "bao-cao-mat-khau-1234.pdf.bbe", "bao-cao-quy-1.pdf.sha256"]) {
  console.log(existsSync(OUT + f) ? `✓ ${f}  ${(statSync(OUT + f).size / 1024).toFixed(0)} KB` : `✗ thiếu ${f}`);
}
