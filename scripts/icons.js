#!/usr/bin/env node
/* Tạo sprite icon assets/icons.svg từ bộ icon Lucide (giấy phép ISC).
   Lấy mọi icon được dùng trong tools.json + các icon giao diện bên dưới, tải từ jsDelivr (ghim phiên bản).
   Chỉ cần chạy lại khi thêm icon mới:  node scripts/icons.js */
import { readFile, writeFile } from "node:fs/promises";

const LUCIDE = "https://cdn.jsdelivr.net/npm/lucide-static@1.52.0/icons/";
const UI = [
  "search", "x", "menu", "sun", "moon", "monitor", "star", "upload", "download", "clipboard-paste", "copy", "check",
  "chevron-down", "chevron-right", "chevron-left", "arrow-right", "arrow-left", "arrow-up", "arrow-down", "rotate-cw", "rotate-ccw",
  "trash-2", "grip-vertical", "file", "file-archive", "lock", "eye", "eye-off", "link", "share-2", "refresh-cw", "play", "pause",
  "skip-forward", "settings", "bell", "volume-2", "volume-x", "camera", "camera-off", "image", "info", "triangle-alert", "circle-check",
  "plus", "minus", "external-link", "history", "sparkles", "maximize", "minimize", "wand-sparkles", "zoom-in", "zoom-out", "printer",
  "file-down", "shield-check", "move", "house", "layers", "palette", "type", "wifi", "contact", "message-square", "mail", "phone",
  "flip-horizontal-2", "square", "circle", "corner-down-left", "keyboard", "list", "calendar", "clock", "coffee", "repeat", "rotate-ccw-square",
  "scan-line", "flashlight", "switch-camera", "file-text", "code", "heart", "git-branch"
];

const reg = JSON.parse(await readFile(new URL("../tools.json", import.meta.url), "utf8"));
const names = [...new Set([...UI, ...reg.groups.map((g) => g.icon), ...reg.tools.map((t) => t.icon)])].sort();

const symbols = [];
const missing = [];
await Promise.all(names.map(async (n) => {
  const r = await fetch(LUCIDE + n + ".svg");
  if (!r.ok) { missing.push(n); return; }
  const svg = await r.text();
  const inner = svg.replace(/<!--[\s\S]*?-->/g, "").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/\s*\n\s*/g, "").trim();
  symbols.push([n, `<symbol id="${n}" viewBox="0 0 24 24">${inner}</symbol>`]);
}));
symbols.sort((a, b) => a[0].localeCompare(b[0]));
const out = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n<!-- Lucide icons (ISC License, https://lucide.dev) -->\n${symbols.map((s) => s[1]).join("\n")}\n</svg>\n`;
await writeFile(new URL("../assets/icons.svg", import.meta.url), out);
console.log("assets/icons.svg:", symbols.length, "icon", (out.length / 1024).toFixed(1) + " KB");
if (missing.length) { console.error("Không tìm thấy:", missing.join(", ")); process.exitCode = 1; }
