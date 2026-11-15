#!/usr/bin/env node
/* Xuất ảnh thương hiệu từ HTML/SVG bằng Chrome headless:
     assets/og.png (1200×630), assets/apple-touch-icon.png (180×180), assets/icon-512.png, assets/icon-192.png,
     assets/icon-maskable-512.png (icon "maskable" cho Android: logo nằm trong vùng an toàn, nền tràn viền),
     assets/og/<nhóm>.png và assets/og/<lang>/<nhóm>.png: ảnh Open Graph theo nhóm (màu nhóm, tên nhóm, logo),
     dùng cho trang nhóm, trang công cụ và bài hướng dẫn của nhóm đó (scripts/brand/og-group.html).
   Chạy: node scripts/make-brand.js            (mọi ảnh)
         node scripts/make-brand.js --groups   (chỉ ảnh theo nhóm)
         node scripts/make-brand.js --icons    (chỉ icon ứng dụng) */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, statSync, mkdirSync } from "node:fs";
import { ROOT } from "./registry.js";
import { LANGS } from "./i18n.js";

const CHROME = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const PORT = 8792, BASE = `http://localhost:${PORT}/bbetools/`;
const ONLY_GROUPS = process.argv.includes("--groups"), ONLY_ICONS = process.argv.includes("--icons");
const server = spawn(process.execPath, [ROOT + "scripts/serve.js", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const shot = (url, file, w, h) => execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=8000", `--screenshot=${ROOT + file}`, `--window-size=${w},${h}`, BASE + url], { stdio: "ignore" });
const out = [];
try {
  if (!ONLY_GROUPS && !ONLY_ICONS) { shot("scripts/brand/og.html", "assets/og.png", 1200, 630); out.push("assets/og.png"); }
  if (!ONLY_GROUPS) {
    shot("scripts/brand/icon.html", "assets/icon-512.png", 512, 512);
    shot("scripts/brand/icon-maskable.html", "assets/icon-maskable-512.png", 512, 512);
    out.push("assets/icon-512.png", "assets/icon-maskable-512.png");
  }
  // ảnh theo nhóm: chỉ nhóm có công cụ ở ngôn ngữ đó (registry đã sinh bởi build.js)
  if (!ONLY_ICONS) for (const lang of ["vi", ...Object.keys(LANGS)]) {
    const reg = await import(ROOT + `assets/${lang === "vi" ? "" : lang + "/"}registry.js`);
    const dir = `assets/og/${lang === "vi" ? "" : lang + "/"}`;
    mkdirSync(ROOT + dir, { recursive: true });
    for (const g of reg.groups) {
      shot(`scripts/brand/og-group.html?id=${g.id}&lang=${lang}`, `${dir}${g.id}.png`, 1200, 630);
      out.push(`${dir}${g.id}.png`);
    }
  }
} finally { server.kill(); }
if (!ONLY_GROUPS) {
  // cửa sổ headless quá nhỏ sẽ không vẽ được → thu nhỏ từ bản 512 px (sips có sẵn trên macOS)
  execFileSync("sips", ["-z", "180", "180", ROOT + "assets/icon-512.png", "--out", ROOT + "assets/apple-touch-icon.png"], { stdio: "ignore" });
  execFileSync("sips", ["-z", "192", "192", ROOT + "assets/icon-512.png", "--out", ROOT + "assets/icon-192.png"], { stdio: "ignore" });
  out.push("assets/apple-touch-icon.png", "assets/icon-192.png");
}
for (const f of out) console.log("✓", f, (statSync(ROOT + f).size / 1024).toFixed(0) + " KB");
