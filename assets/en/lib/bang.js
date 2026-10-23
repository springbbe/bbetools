/* Tự sinh bởi scripts/build.js từ assets/lib/bang.js và i18n/en/js/ — đừng sửa tay. */
/* Bảng tính (hàm thuần) dùng cho nhóm Văn phòng & dữ liệu: giải mã file chữ (UTF-8 / Windows-1258), nhận số trong CSV,
   tên sheet hợp lệ, gộp bảng theo tiêu đề, tách bảng theo cột, lọc / sắp xếp kiểu tiếng Việt.
   "Ô" ở đây là giá trị bất kỳ; hàm nhận thêm text(ô) → chuỗi để so sánh (mặc định String). */
import { fold, stripAccents } from "./search.js";

/** Bytes → chuỗi: theo BOM, thử UTF-8 chặt, không được thì Windows-1258 (CSV từ Excel tiếng Việt cũ) */
export function decodeText(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { text: new TextDecoder("utf-8").decode(b.subarray(3)), encoding: "UTF-8" };
  if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(b.subarray(2)), encoding: "UTF-16" };
  if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder("utf-16be").decode(b.subarray(2)), encoding: "UTF-16" };
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(b), encoding: "UTF-8" }; }
  catch (_) { return { text: new TextDecoder("windows-1258").decode(b), encoding: "Windows-1258" }; }
}

/** Chuỗi trong CSV → số nếu chắc chắn là số. decimal: "." hoặc ",". Giữ nguyên chuỗi có số 0 đứng đầu (điện thoại, mã),
    số dài hơn 15 chữ số (Excel làm tròn mất), và số có dấu phân cách hàng nghìn sai chỗ. */
export function toNumber(s, decimal = ".") {
  if (typeof s !== "string") return s;
  const t = s.trim();
  if (!t || t.length > 24) return s;
  const th = decimal === "." ? "," : ".";
  const d = decimal === "." ? "\\." : ",";
  const re = new RegExp(`^(-?)(\\d{1,3}(?:\\${th}\\d{3})+|\\d+)(?:${d}(\\d+))?$`);
  const m = re.exec(t);
  if (!m) return s;
  const int = m[2].split(th).join("");
  if (int.length > 1 && int[0] === "0") return s;
  if (int.replace(/^0+/, "").length + (m[3] || "").length > 15) return s;
  return Number(m[1] + int + (m[3] ? "." + m[3] : ""));
}

/** Tên sheet Excel hợp lệ (≤ 31 ký tự, không có : \ / ? * [ ], không trống, không trùng — không phân biệt hoa thường) */
export function sheetNames(names) {
  const used = new Set(), out = [];
  for (const raw of names) {
    let base = String(raw ?? "").replace(/[:\\/?*[\]]/g, "-").replace(/^'+|'+$/g, "").replace(/\s+/g, " ").trim() || "Sheet";
    if (base.toLowerCase() === "history") base = "History-1";
    base = base.slice(0, 31);
    let name = base, k = 1;
    while (used.has(name.toLowerCase())) { const suf = ` (${++k})`; name = base.slice(0, 31 - suf.length) + suf; }
    used.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

/** Tên file an toàn (giữ dấu tiếng Việt), không trùng trong danh sách */
export function fileNames(names, ext) {
  const used = new Set();
  return names.map((raw) => {
    const base = String(raw ?? "").replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-").replace(/\s+/g, " ").replace(/^[.\s-]+|[.\s]+$/g, "").slice(0, 80) || "empty";
    let name = base, k = 1;
    while (used.has(name.toLowerCase())) name = `${base} (${++k})`;
    used.add(name.toLowerCase());
    return name + (ext ? "." + ext : "");
  });
}

/** Khoá so sánh tiêu đề: bỏ dấu, không phân biệt hoa thường, gộp khoảng trắng/gạch dưới */
export const headKey = (s) => fold(String(s ?? "")).replace(/[\s_]+/g, " ").trim();

/** Bỏ dòng trống ở cuối và cột trống ở bên phải */
export function trimTable(rows, isEmpty = (v) => v == null || v === "") {
  let r = rows.length;
  while (r > 0 && (rows[r - 1] || []).every(isEmpty)) r--;
  let c = 0;
  for (let i = 0; i < r; i++) { const row = rows[i] || []; for (let j = row.length - 1; j >= c; j--) if (!isEmpty(row[j])) { c = j + 1; break; } }
  return rows.slice(0, r).map((row) => Array.from({ length: c }, (_, j) => (row || [])[j] ?? null));
}

/** Số cột lớn nhất */
export const width = (rows) => rows.reduce((m, r) => Math.max(m, r ? r.length : 0), 0);

/**
 * Gộp nhiều bảng thành một.
 * tables: [{ label, rows }]; o: { header: true (dòng đầu là tiêu đề, cột cùng tên được xếp chung),
 *   source: "Nguồn" (tên cột ghi bảng gốc, bỏ trống thì không thêm), text: (ô) → chuỗi }
 * → { rows, columns: số cột, added: [số dòng mỗi bảng], newCols: [[tên cột mới mà bảng đó thêm vào]] }
 */
export function stackTables(tables, o = {}) {
  const text = o.text || ((v) => (v == null ? "" : String(v)));
  const out = [];
  const counts = [];
  if (!o.header) {
    for (const t of tables) {
      const body = t.rows.filter((r) => r && r.some((v) => text(v) !== ""));
      body.forEach((r) => out.push(o.source ? [t.label, ...r] : [...r]));
      counts.push(body.length);
    }
    const w = width(out);
    return { rows: out.map((r) => Array.from({ length: w }, (_, j) => r[j] ?? null)), columns: w, added: counts, newCols: tables.map(() => []) };
  }
  const head = [], keys = new Map(), newCols = [];
  const maps = tables.map((t) => {
    const hr = t.rows[0] || [];
    const seen = new Map();
    const added = [];
    const map = hr.map((v, j) => {
      let name = text(v).trim() || "Column " + (j + 1);
      let k = headKey(name);
      // tiêu đề trùng trong cùng bảng: "Ghi chú", "Ghi chú (2)"
      const n = (seen.get(k) || 0) + 1; seen.set(k, n);
      if (n > 1) { name += ` (${n})`; k += ` (${n})`; }
      if (!keys.has(k)) { keys.set(k, head.length); head.push(name); if (tables.length > 1) added.push(name); }
      return keys.get(k);
    });
    newCols.push(added);
    return map;
  });
  // bảng đầu tiên không tính là "thêm cột"
  if (newCols.length) newCols[0] = [];
  tables.forEach((t, ti) => {
    const body = t.rows.slice(1).filter((r) => r && r.some((v) => text(v) !== ""));
    const map = maps[ti];
    for (const r of body) {
      const row = Array.from({ length: head.length }, () => null);
      r.forEach((v, j) => { if (j < map.length) row[map[j]] = v; else if (text(v) !== "") { /* ô nằm ngoài vùng tiêu đề */ const name = "Column " + (j + 1); const k = headKey(name); if (!keys.has(k)) { keys.set(k, head.length); head.push(name); } map[j] = keys.get(k); row[map[j]] = v; } });
      out.push(o.source ? [t.label, ...row] : row);
    }
    counts.push(body.length);
  });
  const fullHead = o.source ? [o.source, ...head] : head;
  const w = fullHead.length;
  return { rows: [fullHead, ...out.map((r) => Array.from({ length: w }, (_, j) => r[j] ?? null))], columns: w, added: counts, newCols };
}

/**
 * Tách bảng theo giá trị một cột. o: { header: true, text } → [{ key, rows }] theo thứ tự gặp lần đầu
 * (mỗi nhóm có dòng tiêu đề nếu header). Ô trống gom vào nhóm key "".
 */
export function splitBy(rows, col, o = {}) {
  const text = o.text || ((v) => (v == null ? "" : String(v)));
  const head = o.header ? rows[0] : null;
  const body = (o.header ? rows.slice(1) : rows).filter((r) => r && r.some((v) => text(v) !== ""));
  const groups = new Map();
  for (const r of body) {
    const key = text(r[col]).trim();
    const k = o.exact ? key : headKey(key);
    if (!groups.has(k)) groups.set(k, { key, rows: head ? [head] : [] });
    groups.get(k).rows.push(r);
  }
  return [...groups.values()];
}

/** So sánh kiểu tiếng Việt: số theo giá trị, chuỗi theo bảng chữ cái tiếng Việt, ô trống luôn ở cuối */
const coll = typeof Intl !== "undefined" ? new Intl.Collator("vi", { numeric: true, sensitivity: "base" }) : null;
export function compareCells(a, b) {
  const ea = a == null || a === "", eb = b == null || b === "";
  if (ea || eb) return ea - eb;
  if (a instanceof Date && b instanceof Date) return a - b;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return coll ? coll.compare(String(a), String(b)) : String(a).localeCompare(String(b));
}
/** Chỉ số dòng sau khi sắp xếp theo cột col (ổn định). dir: 1 tăng, -1 giảm (ô trống vẫn ở cuối) */
export function sortIndex(rows, col, dir = 1, value = (v) => v) {
  return rows.map((_, i) => i).sort((i, j) => {
    const a = value(rows[i][col]), b = value(rows[j][col]);
    const ea = a == null || a === "", eb = b == null || b === "";
    if (ea || eb) return (ea - eb) || i - j;
    return compareCells(a, b) * dir || i - j;
  });
}

/** Lọc dòng chứa chuỗi q (không cần dấu, không phân biệt hoa thường) ở cột col (−1 = mọi cột) */
export function filterIndex(rows, q, col = -1, text = (v) => (v == null ? "" : String(v))) {
  const norm = (x) => stripAccents(x).toLowerCase();
  const f = norm(q).trim();
  if (!f) return rows.map((_, i) => i);
  const parts = f.split(/\s+/);
  const out = [];
  rows.forEach((r, i) => {
    const hay = norm(col >= 0 ? text(r[col]) : r.map(text).join(" \u0001 "));
    if (parts.every((p) => hay.includes(p))) out.push(i);
  });
  return out;
}

/** Chỉ số cột → tên cột Excel: 0 → A, 26 → AA */
export function colName(i) {
  let s = "";
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}
