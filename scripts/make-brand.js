#!/usr/bin/env node
/* Xuất ảnh thương hiệu từ HTML/SVG bằng Chrome headless: assets/og.png (1200×630),
   assets/apple-touch-icon.png (180×180), assets/icon-512.png.  Chạy: node scripts/make-brand.js */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { ROOT } from "./registry.js";

const CHROME = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
const PORT = 8792, BASE = `http://localhost:${PORT}/bbetools/`;
const server = spawn(process.execPath, [ROOT + "scripts/serve.js", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const shot = (url, file, w, h) => execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=8000", `--screenshot=${ROOT + file}`, `--window-size=${w},${h}`, BASE + url], { stdio: "ignore" });
try {
  shot("scripts/brand/og.html", "assets/og.png", 1200, 630);
  shot("scripts/brand/icon.html", "assets/icon-512.png", 512, 512);
} finally { server.kill(); }
// cửa sổ headless quá nhỏ sẽ không vẽ được → thu nhỏ từ bản 512 px (sips có sẵn trên macOS)
execFileSync("sips", ["-z", "180", "180", ROOT + "assets/icon-512.png", "--out", ROOT + "assets/apple-touch-icon.png"], { stdio: "ignore" });
for (const f of ["assets/og.png", "assets/apple-touch-icon.png", "assets/icon-512.png"]) console.log("✓", f, (statSync(ROOT + f).size / 1024).toFixed(0) + " KB");
