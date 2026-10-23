/* Tự sinh bởi scripts/build.js từ assets/sheet.js và i18n/en/js/ — đừng sửa tay. */
/* Tiện ích dùng chung cho nhóm Văn phòng & dữ liệu: đọc Excel (.xlsx, .xls, .ods) bằng SheetJS và CSV bằng bộ đọc riêng
   (tự nhận UTF-8 / Windows-1258, dấu phân cách), hiển thị ô kiểu Việt Nam, ghi ra .xlsx / .csv, bảng xem trước.
   Bảng = mảng các dòng, mỗi ô là ô SheetJS { t, v, w, z } hoặc null. */
import { h, lib, extOf, baseName } from "./core.js";
import { decodeText, toNumber, trimTable, sheetNames, colName } from "./lib/bang.js";
import { parseCsv, sniffDelimiter, toCsvCell } from "./lib/csv.js";

export const XL = () => lib("xlsx");
export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const isCsvName = (n) => ["csv", "tsv", "txt"].includes(extOf(n));
export const isEmpty = (c) => c == null || c.t === "z" || (c.t === "s" && c.v === "");

const pad = (n) => String(n).padStart(2, "0");
/** Ô ngày của SheetJS (cellDates) mang giờ UTC = giờ hiển thị trong Excel */
function dateText(d, z) {
  if (!(d instanceof Date) || isNaN(d)) return "";
  const date = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  if (z && /h/i.test(z) && !/[dy]/i.test(z)) return time; // định dạng chỉ có giờ
  return d.getUTCHours() || d.getUTCMinutes() || (z && /h/i.test(z)) ? date + " " + time : date;
}
export function isoDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  const s = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return d.getUTCHours() || d.getUTCMinutes() || d.getUTCSeconds() ? s + `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` : s;
}

/** Chữ hiển thị của một ô, kiểu Việt Nam: 15.000.000; 1234,5; 15/01/2026 */
export function cellText(c) {
  if (c == null) return "";
  if (typeof c !== "object") return String(c);
  if (c instanceof Date) return dateText(c);
  if (c.t === "d") return !c.z || /^m+\/d+\/y+/i.test(c.z) || c.z === "General" ? dateText(c.v, c.z) : c.w ?? dateText(c.v, c.z);
  if (c.t === "n") {
    if (c.src != null) return c.src; // số đọc từ CSV: giữ đúng chữ trong file
    const w = c.w ?? String(c.v);
    return /\d/.test(w) ? w.replace(/\d[\d,.]*/g, (m) => m.replace(/[,.]/g, (x) => (x === "," ? "." : ","))) : w;
  }
  if (c.t === "b") return c.v ? "TRUE" : "FALSE";
  if (c.t === "e") return c.w || "#ERROR";
  return c.v == null ? "" : String(c.v);
}
/** Giá trị thô: số, chuỗi, true/false, Date (giờ UTC), null */
export function cellValue(c) {
  if (c == null || typeof c !== "object" || c instanceof Date) return c ?? null;
  if (c.t === "z") return null;
  if (c.t === "e") return c.w || null;
  return c.v ?? null;
}
/** Giá trị cho JSON: ngày → "yyyy-mm-dd" */
export const cellJson = (c) => { const v = cellValue(c); return v instanceof Date ? isoDate(v) : v; };
/** Chữ cho CSV: số không phân cách hàng nghìn, dấu thập phân theo tuỳ chọn; ngày dd/mm/yyyy */
export function cellCsv(c, decimal = ".") {
  if (c == null || typeof c !== "object") return c == null ? "" : String(c);
  if (c.t === "n") return decimal === "," ? String(c.v).replace(".", ",") : String(c.v);
  return cellText(c);
}
/** Ô SheetJS sạch để ghi sang bảng khác (bỏ công thức vì địa chỉ ô đã đổi) */
export function plainCell(c) {
  if (c == null) return null;
  if (typeof c !== "object" || c instanceof Date) return c;
  if (c.t === "z" || (c.t === "s" && c.v === "")) return null;
  const o = { t: c.t, v: c.v };
  if (c.z && c.z !== "General") o.z = c.z;
  if (c.t === "e") return { t: "s", v: c.w || "#ERROR" };
  return o;
}
/** Chuỗi → ô (CSV). numbers: nhận số và ngày (dd/mm/yyyy kiểu Việt Nam, yyyy-mm-dd) */
export function textCell(s, decimal = ".", numbers = true) {
  if (s == null || s === "") return null;
  if (numbers) {
    const n = toNumber(s, decimal);
    if (typeof n === "number") {
      // giữ kiểu hiển thị có phân cách hàng nghìn như trong file
      const grouped = (decimal === "," ? /\d\.\d{3}/ : /\d,\d{3}/).test(s);
      return grouped ? { t: "n", v: n, src: s, z: Number.isInteger(n) ? "#,##0" : "#,##0.00" } : { t: "n", v: n, src: s };
    }
    const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim()) || /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
    if (d) {
      const [y, m, day] = d[1].length === 4 ? [+d[1], +d[2], +d[3]] : [+d[3], +d[2], +d[1]];
      const dt = new Date(Date.UTC(y, m - 1, day));
      if (m >= 1 && m <= 12 && dt.getUTCDate() === day) return { t: "d", v: dt, z: "dd/mm/yyyy" };
    }
  }
  return { t: "s", v: s };
}

function sheetRows(X, ws) {
  if (!ws || !ws["!ref"]) return [];
  const r = X.utils.decode_range(ws["!ref"]);
  const data = ws["!data"] || [];
  const out = [];
  const last = Math.min(r.e.r, data.length - 1);
  for (let i = r.s.r; i <= last; i++) {
    const row = data[i] || [];
    const line = [];
    for (let j = r.s.c; j < Math.min(row.length, r.e.c + 1); j++) line.push(row[j] || null);
    out.push(line);
  }
  return trimTable(out, isEmpty);
}

/** Đọc file → { kind: "csv"|"excel", encoding, delim, sheets: [{ name, rows, hidden }] } */
export async function readBook(file, o = {}) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (isCsvName(file.name) || (!/\.(xlsx|xlsm|xls|ods)$/i.test(file.name) && /^text\//.test(file.type))) {
    const { text, encoding } = decodeText(buf);
    const delim = extOf(file.name) === "tsv" ? "\t" : o.delim || sniffDelimiter(text);
    const decimal = delim === ";" ? "," : ".";
    const rows = parseCsv(text, delim).map((r) => r.map((s) => textCell(s, decimal, o.numbers !== false)));
    return { kind: "csv", encoding, delim, decimal, sheets: [{ name: sheetNames([baseName(file.name)])[0], rows: trimTable(rows, isEmpty) }] };
  }
  const X = await XL();
  let wb;
  try { wb = X.read(buf, { type: "array", cellDates: true, cellNF: true, dense: true, password: o.password }); }
  catch (e) {
    const err = new Error(/password|encrypt/i.test(e.message) ? `${file.name} has an open password. Open it in Excel, remove the password, then try again.` : `Couldn't read ${file.name}: the file is corrupted or not an Excel file.`);
    err.userMsg = err.message; throw err;
  }
  const meta = (wb.Workbook && wb.Workbook.Sheets) || [];
  return { kind: "excel", sheets: wb.SheetNames.map((name, i) => ({ name, hidden: !!(meta[i] && meta[i].Hidden), rows: sheetRows(X, wb.Sheets[name]) })) };
}

/** Một sheet SheetJS từ bảng (ô SheetJS hoặc giá trị thường). o: { widths: true, filter: true (bật lọc ở dòng tiêu đề) } */
export function toSheet(X, rows, o = {}) {
  const clean = rows.map((r) => r.map(plainCell));
  const ws = X.utils.aoa_to_sheet(clean, { cellDates: true, dense: true, UTC: true });
  if (o.widths !== false) {
    const w = [];
    rows.slice(0, 500).forEach((r) => r.forEach((c, j) => { const len = Math.min(60, [...cellText(c)].length); if (len > (w[j] || 0)) w[j] = len; }));
    ws["!cols"] = w.map((n) => ({ wch: Math.max(6, (n || 0) + 2) }));
  }
  if (o.filter && rows.length > 1 && rows[0].length) ws["!autofilter"] = { ref: `A1:${colName(rows[0].length - 1)}${rows.length}` };
  return ws;
}
/** Ghi nhiều sheet ra Blob .xlsx. sheets: [{ name, rows }] */
export function writeXlsx(X, sheets, o = {}) {
  const wb = X.utils.book_new();
  const names = sheetNames(sheets.map((s) => s.name));
  sheets.forEach((s, i) => X.utils.book_append_sheet(wb, toSheet(X, s.rows.length ? s.rows : [[]], o), names[i]));
  const out = X.write(wb, { type: "array", bookType: "xlsx", compression: true });
  return new Blob([out], { type: XLSX_TYPE });
}
/** Bảng → Blob CSV. o: { delim: ",", bom: true } (dấu ; thì số dùng dấu phẩy thập phân) */
export function writeCsv(rows, o = {}) {
  const delim = o.delim || ",", decimal = delim === ";" ? "," : ".";
  const text = rows.map((r) => r.map((c) => toCsvCell(cellCsv(c, decimal), delim)).join(delim)).join("\r\n");
  return new Blob([(o.bom !== false ? "\ufeff" : "") + text + "\r\n"], { type: "text/csv;charset=utf-8" });
}

/** Bảng xem trước (tối đa max dòng). o: { header: true, max: 30, caption } */
export function previewTable(rows, o = {}) {
  const max = o.max || 30;
  const head = o.header !== false && rows.length ? rows[0] : null;
  const body = (head ? rows.slice(1) : rows).slice(0, max);
  const w = Math.max(0, ...rows.slice(0, max + 1).map((r) => r.length));
  const td = (c, tag = "td") => { const t = cellText(c); return h(tag, { class: c && c.t === "n" ? "num" : null, title: t.length > 40 ? t : null, scope: tag === "th" ? "col" : null }, t); };
  const more = (head ? rows.length - 1 : rows.length) - body.length;
  return h("div", { class: "xl-prev" },
    h("div", { class: "tbl-wrap xl-wrap", tabindex: "0", role: "region", "aria-label": o.caption || "Table preview" },
      h("table", { class: "tbl xl-tbl" },
        h("thead", null, h("tr", null, Array.from({ length: w }, (_, j) => (head ? td(head[j], "th") : h("th", { scope: "col", text: colName(j) }))))),
        h("tbody", null, body.map((r) => h("tr", null, Array.from({ length: w }, (_, j) => td(r[j]))))))),
    more > 0 ? h("p", { class: "hint", text: `… and ${more.toLocaleString("en-US")} more rows` }) : null);
}

/** Tên file kết quả: "ten-goc - Sheet.csv" */
export const outName = (file, sheet, ext, many) => baseName(file) + (many && sheet ? " - " + sheet.replace(/[\\/:*?"<>|]+/g, "-") : "") + "." + ext;

const css = document.createElement("style");
css.textContent = `
.xl-wrap{max-height:60vh;overflow:auto}
.xl-tbl{font-size:13.5px}
.xl-tbl th,.xl-tbl td{white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis;text-align:left}
.xl-tbl td.num{text-align:right;font-variant-numeric:tabular-nums}
.xl-tbl thead th{position:sticky;top:0;z-index:1;background:var(--surface-2)}
.xl-prev{margin-top:12px}
`;
document.head.append(css);
