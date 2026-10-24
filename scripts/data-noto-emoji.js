#!/usr/bin/env node
/* Tạo lại data/noto-emoji.json (cần mạng):  node scripts/data-noto-emoji.js
   - Danh sách emoji có bản động: api.json của trang Noto Animated Emoji (Google, xếp theo độ phổ biến).
   - Tên, từ khoá tiếng Việt: chú giải CLDR (gói npm cldr-annotations-full, cldr-annotations-derived-full).
   Mỗi mục: [mã ("1f44b_1f3fb"), số thứ tự nhóm, tên tiếng Anh (từ thẻ :tag:), tên tiếng Việt, từ khoá tiếng Việt]. */
import { writeFile } from "node:fs/promises";
import { ROOT } from "./registry.js";

const CLDR = "47.0.0";
const API = "https://googlefonts.github.io/noto-emoji-animation/data/api.json";
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u + ": HTTP " + r.status); return r.json(); };

const [api, base, derived] = await Promise.all([
  get(API),
  get(`https://cdn.jsdelivr.net/npm/cldr-annotations-full@${CLDR}/annotations/vi/annotations.json`),
  get(`https://cdn.jsdelivr.net/npm/cldr-annotations-derived-full@${CLDR}/annotationsDerived/vi/annotations.json`)
]);
const FE0F = String.fromCharCode(0xfe0f);
const noFe0f = (s) => s.split(FE0F).join("");
const vi = new Map();
for (const src of [base.annotations.annotations, derived.annotationsDerived.annotations]) {
  for (const [ch, a] of Object.entries(src)) vi.set(noFe0f(ch), a);
}
const groups = [];
const items = [];
let missing = 0;
for (const ic of api.icons) {
  const cp = ic.codepoint;
  const ch = String.fromCodePoint(...cp.split("_").map((x) => parseInt(x, 16)));
  const cat = (ic.categories || [])[0] || "Other";
  if (!groups.includes(cat)) groups.push(cat);
  const en = (ic.tags || []).map((t) => t.replace(/^:|:$/g, "").replace(/-/g, " ")).filter(Boolean);
  const a = vi.get(noFe0f(ch));
  if (!a) missing++;
  const name = a ? (a.tts || a.default || [""])[0] : "";
  const kw = a ? (a.default || []).filter((k) => k !== name).join(", ") : "";
  items.push([cp, groups.indexOf(cat), en.join(", "), name, kw]);
}
const out = {
  title: "danh sách Noto Animated Emoji",
  updated: new Date().toISOString().slice(0, 10),
  source: `trang Noto Animated Emoji của Google (googlefonts.github.io/noto-emoji-animation), tên tiếng Việt theo chú giải Unicode CLDR ${CLDR}`,
  groups,
  items
};
const json = JSON.stringify(out).replace(/\],\[/g, "],\n[");
await writeFile(ROOT + "data/noto-emoji.json", json + "\n");
console.log(`✓ data/noto-emoji.json: ${items.length} emoji, ${groups.length} nhóm, ${missing} emoji chưa có tên tiếng Việt`);
