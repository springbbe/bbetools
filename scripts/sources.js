/* Mã nguồn của một công cụ cùng các module nó nhập (đi theo import tương đối, kể cả import động),
   dùng cho check.js để đối chiếu tên nút trong "howto" với chuỗi thật trên giao diện. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { ROOT } from "./registry.js";

const cache = new Map();
/** Toàn bộ mã nguồn (nối lại) của assets/tools/<id>.js và mọi module nó nhập */
export function toolSource(id, lang = "vi") {
  const key = lang + ":" + id;
  if (cache.has(key)) return cache.get(key);
  const seen = new Set(), parts = [];
  const visit = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    parts.push(src);
    for (const m of src.matchAll(/(?:import\s[^"']*?from\s*|import\s*\(\s*|export\s[^"']*?from\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const p = join(dirname(file), m[1]);
      if (relative(ROOT + "assets", p).startsWith("..")) continue;
      visit(p);
    }
  };
  // bản ngôn ngữ khác: module đã dịch do build.js sinh ở assets/<lang>/
  visit(ROOT + `assets/${lang === "vi" ? "" : lang + "/"}tools/${id}.js`);
  const all = parts.join("\n");
  cache.set(key, all);
  return all;
}

/** Tên nút trong ngoặc kép “…” của một câu (bỏ qua cụm là ví dụ nội dung: đứng sau "ví dụ", "vd", "e.g.") */
export const quoted = (s) => [...String(s).matchAll(/“([^”]+)”/g)].filter((m) => !/(ví dụ|VD:?|e\.g\.,?|for example,?|such as)\s*$/i.test(s.slice(0, m.index))).map((m) => m[1]);

/** Tên nút trong howto có mặt trong mã nguồn không. Chuẩn hoá khoảng trắng và bỏ thẻ HTML đơn giản (<kbd>…). */
export function inSource(src, label) {
  const norm = (x) => x.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  if (src.includes(label) || norm(src).includes(norm(label))) return true;
  // "…" trong tên nút là phần thay đổi (số đếm, tên file): "Tải … file dạng .zip" khớp `Tải ${n} file dạng .zip`
  if (label.includes("…")) {
    const re = new RegExp(label.split("…").map((x) => x.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]{1,120}?"));
    return re.test(src);
  }
  return false;
}
