/* CSV (hàm thuần): đọc theo RFC 4180 (ngoặc kép, xuống dòng trong ô), tự nhận dấu phân cách,
   chuyển qua lại với mảng đối tượng JSON (làm phẳng đối tượng lồng nhau thành "a.b"). */

/** Đoán dấu phân cách từ vài dòng đầu */
export function sniffDelimiter(text) {
  const head = text.split(/\r?\n/).slice(0, 10).join("\n");
  let best = ",", bestScore = -1;
  for (const d of [",", ";", "\t", "|"]) {
    const counts = head.split("\n").filter(Boolean).map((l) => l.split(d).length - 1);
    if (!counts.length || !counts[0]) continue;
    const same = counts.filter((c) => c === counts[0]).length;
    const score = same * 100 + counts[0];
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

/** CSV → mảng các dòng (mảng chuỗi) */
export function parseCsv(text, delim) {
  text = String(text ?? "").replace(/^\ufeff/, "");
  delim = delim || sniffDelimiter(text);
  const rows = [];
  let row = [], cell = "", q = false, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } q = false; i++; continue; }
      cell += c; i++; continue;
    }
    if (c === '"' && cell === "") { q = true; i++; continue; }
    if (c === delim) { row.push(cell); cell = ""; i++; continue; }
    if (c === "\r" || c === "\n") {
      row.push(cell); rows.push(row); row = []; cell = "";
      i += c === "\r" && text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    cell += c; i++;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function toCsvCell(v, delim = ",") {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.includes(delim) || /["\r\n]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export const stringifyCsv = (rows, delim = ",") => rows.map((r) => r.map((v) => toCsvCell(v, delim)).join(delim)).join("\r\n");

/** Làm phẳng: { a: { b: 1 }, c: [1, 2] } → { "a.b": 1, c: "[1,2]" } (mảng đối tượng giữ dạng JSON) */
export function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? prefix + "." + k : k;
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length) flatten(v, key, out);
    else out[key] = Array.isArray(v) ? (v.every((x) => x == null || typeof x !== "object") ? v.join("; ") : JSON.stringify(v)) : v;
  }
  return out;
}
export function unflatten(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = k.split(".");
    let cur = out;
    path.forEach((p, i) => {
      if (i === path.length - 1) cur[p] = v;
      else { if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {}; cur = cur[p]; }
    });
  }
  return out;
}

/** JSON (mảng đối tượng, một đối tượng, hoặc mảng các mảng) → bảng [[tiêu đề…], [ô…], …] */
export function jsonToTable(data, { flat = true } = {}) {
  if (data && !Array.isArray(data) && typeof data === "object") {
    // { "items": [...] } → lấy mảng đầu tiên; đối tượng đơn → một dòng
    const arr = Object.values(data).find((v) => Array.isArray(v) && v.length && typeof v[0] === "object");
    data = arr || [data];
  }
  if (!Array.isArray(data)) throw new Error("JSON cần là mảng (danh sách) các đối tượng để chuyển thành bảng.");
  if (data.length && data.every(Array.isArray)) return data;
  const rows = data.map((x) => (x && typeof x === "object" ? (flat ? flatten(x) : x) : { value: x }));
  const cols = [];
  const seen = new Set();
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
  return [cols, ...rows.map((r) => cols.map((c) => r[c]))];
}

/** JSON (mảng đối tượng, một đối tượng, hoặc mảng các mảng) → CSV */
export function jsonToCsv(data, { delim = ",", flat = true } = {}) {
  return stringifyCsv(jsonToTable(data, { flat }), delim);
}

/** Đoán kiểu giá trị ô: số, true/false, null; giữ chuỗi số có 0 đứng đầu (số điện thoại, mã) */
export function inferValue(s) {
  if (s === "") return "";
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === "true";
  if (/^null$/i.test(s)) return null;
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return Number(s);
  return s;
}

/** CSV → mảng đối tượng theo dòng tiêu đề */
export function csvToJson(text, { delim, infer = true, nested = true, header = true } = {}) {
  const rows = parseCsv(text, delim).filter((r) => !(r.length === 1 && r[0] === ""));
  if (!rows.length) return [];
  if (!header) return rows.map((r) => r.map((v) => (infer ? inferValue(v) : v)));
  const [head, ...body] = rows;
  const keys = head.map((h, i) => h.trim() || "cot" + (i + 1));
  return body.map((r) => {
    const o = {};
    keys.forEach((k, i) => { const v = r[i] ?? ""; o[k] = infer ? inferValue(v) : v; });
    return nested ? unflatten(o) : o;
  });
}
