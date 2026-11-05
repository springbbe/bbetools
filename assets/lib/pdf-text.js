/* Ghép chữ của một trang PDF từ các mảnh (text items) mà pdf.js trả về, và nối dòng bị ngắt giữa câu.
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/pdf-text.test.js */

/** items: [{ str, transform: [a,b,c,d,x,y], width, height, hasEOL }] (từ page.getTextContent()) → chuỗi */
export function itemsToText(items) {
  let out = "", lastY = null, lastEnd = null;
  for (const it of items) {
    if (!it || typeof it.str !== "string") continue;
    const x = it.transform[4], y = it.transform[5], hgt = it.height || 10;
    if (lastY !== null && Math.abs(y - lastY) > Math.max(2, hgt * 0.6) && !out.endsWith("\n")) out += "\n";
    else if (lastEnd !== null && x - lastEnd > hgt * 0.25 && !/\s$/.test(out) && it.str && !/^\s/.test(it.str)) out += " ";
    out += it.str;
    if (it.hasEOL && !out.endsWith("\n")) out += "\n";
    if (it.str || it.hasEOL) { lastY = y; lastEnd = x + (it.width || 0); }
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Nối các dòng bị ngắt giữa câu (dòng sau bắt đầu bằng chữ thường, số hoặc ngoặc) — hợp khi dán vào Word, Zalo */
export const joinLines = (t) => t.replace(/([^\n.!?:;])\n(?=[\p{Ll}0-9(“"])/gu, "$1 ");

/** Đếm ký tự không phải khoảng trắng (để nhận ra PDF scan, gần như không có chữ) */
export const charCount = (t) => t.replace(/\s/g, "").length;

// bỏ dấu, chữ thường từng ký tự (giữ nguyên độ dài để vị trí khớp với chuỗi gốc)
const foldChar = (c) => { const f = c.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase(); return f.length === 1 ? f : c.toLowerCase().charAt(0) || c; };
export const foldKeep = (s) => Array.from(s, foldChar).join("");

/** Tìm query trong các mảnh chữ của một trang (không phân biệt hoa thường, có dấu hay không). Các mảnh được ghép liền nhau
    (PDF hay tách một từ thành nhiều mảnh), mảnh có eol[i] = true thì coi như có dấu cách sau nó.
    → [[{ item, start, end }, …], …]: mỗi chỗ tìm thấy gồm các đoạn trên một hoặc nhiều mảnh */
export function findAll(strs, query, eol = []) {
  const q = foldKeep(String(query || "").trim().replace(/\s+/g, " "));
  if (!q) return [];
  const { all, owner } = joinItems(strs, eol);
  const f = foldKeep(all).replace(/\s/g, " ");
  const out = [];
  for (let i = f.indexOf(q); i >= 0; i = f.indexOf(q, i + q.length)) out.push(partsOf(owner, i, i + q.length));
  return out;
}

/** Như findAll nhưng tìm theo biểu thức chính quy re (cờ g) trên chuỗi gốc đã ghép (giữ dấu, phân biệt hoa thường theo re)
    → [{ text, parts }] */
export function findPattern(strs, re, eol = []) {
  const { all, owner } = joinItems(strs, eol);
  const out = [];
  const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const m of all.matchAll(r)) if (m[0]) out.push({ text: m[0], parts: partsOf(owner, m.index, m.index + m[0].length) });
  return out;
}

// ghép các mảnh liền nhau; owner[k] = [mảnh, vị trí trong mảnh] của ký tự thứ k (null = dấu cách thêm vào sau mảnh có xuống dòng)
function joinItems(strs, eol) {
  let all = "";
  const owner = [];
  strs.forEach((s, item) => {
    s = s || "";
    for (let j = 0; j < s.length; j++) owner.push([item, j]);
    all += s;
    if (eol[item] && !/\s$/.test(s)) { all += " "; owner.push(null); }
  });
  return { all, owner };
}
function partsOf(owner, from, to) {
  const parts = [];
  for (let k = from; k < to; k++) {
    const o = owner[k];
    if (!o) continue;
    const last = parts[parts.length - 1];
    if (last && last.item === o[0] && last.end === o[1]) last.end++;
    else parts.push({ item: o[0], start: o[1], end: o[1] + 1 });
  }
  return parts;
}
