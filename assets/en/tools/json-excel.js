/* Tự sinh bởi scripts/build.js từ assets/tools/json-excel.js và i18n/en/js/ — đừng sửa tay. */
/* JSON ↔ Excel: mảng đối tượng JSON → bảng Excel (đối tượng lồng nhau thành cột "a.b", mỗi mảng con một sheet);
   Excel/CSV → JSON (theo dòng tiêu đề, nhận số, ngày ISO, tạo lại đối tượng lồng từ tiêu đề "a.b"). */
import { h, sampleFiles, fmtNum, baseName, extOf, copyText, icon } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { readBook, writeXlsx, previewTable, cellText, cellJson, XL } from "../sheet.js";
import { jsonToTable, unflatten } from "../lib/csv.js";
import { trimTable } from "../lib/bang.js";

const isJson = (it) => extOf(it.name) === "json" || it.json !== undefined;

/** JSON → các bảng: { a: [...], b: [...] } thành nhiều sheet, còn lại một sheet */
function jsonSheets(data, flat, name) {
  if (data && !Array.isArray(data) && typeof data === "object") {
    const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object"));
    if (arrays.length > 1) return arrays.map(([k, v]) => ({ name: k, rows: jsonToTable(v, { flat }) }));
  }
  return [{ name, rows: jsonToTable(data, { flat }) }];
}
const cellOut = (v) => (v == null ? null : typeof v === "object" ? JSON.stringify(v) : v);

/** Sheet → mảng đối tượng (hoặc mảng các mảng) */
function sheetJson(rows, o) {
  rows = trimTable(rows, (c) => cellJson(c) == null || cellJson(c) === "");
  if (!rows.length) return [];
  if (!o.header) return rows.map((r) => r.map(cellJson));
  const keys = [];
  const seen = {};
  rows[0].forEach((c, j) => { let k = cellText(c).trim() || "cot" + (j + 1); if (seen[k]) k += "_" + ++seen[k]; else seen[k] = 1; keys.push(k); });
  return rows.slice(1).filter((r) => r.some((c) => cellJson(c) != null && cellJson(c) !== "")).map((r) => {
    const obj = {};
    keys.forEach((k, j) => { const v = cellJson(r[j]); obj[k] = v === undefined ? null : v === "" ? null : v; if (!o.nulls && obj[k] === null) delete obj[k]; });
    return o.nested ? unflatten(obj) : obj;
  });
}

fileTool({
  accept: ["json", "excel", "csv"], multiple: false, noun: "JSON, Excel or CSV files",
  action: "Convert",
  sample: () => sampleFiles("san-pham.json"),
  warm: () => XL(),
  async load(it) {
    if (extOf(it.name) === "json") {
      const text = (await it.file.text()).replace(/^\ufeff/, "");
      try { it.json = JSON.parse(text); }
      catch (e) { const err = new Error("json"); err.userMsg = `${it.name} isn't valid JSON: ${e.message}`; throw err; }
      const n = Array.isArray(it.json) ? it.json.length : Object.keys(it.json || {}).length;
      it.info = `JSON → Excel · ${fmtNum(n)} ${Array.isArray(it.json) ? "items" : "keys"}`;
    } else {
      it.book = await readBook(it.file);
      it.info = `${it.book.kind === "csv" ? "CSV" : "Excel"} → JSON · ${it.book.sheets.filter((s) => s.rows.length).length} sheet`;
    }
  },
  options(el) {
    const toXl = h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "JSON → Excel" }),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "flat", checked: true }), h("span", null, "Flatten nested objects", h("small", { text: "{\"price\": {\"list\": 1}} becomes the column “price.list”. Off: keep the JSON as is in the cell." }))));
    const toJs = h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Excel/CSV → JSON" }),
      seg("which", [["first", "First sheet"], ["all", "All sheets"]], "first", "Sheets"),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "header", checked: true }), h("span", null, "First row is field names", h("small", { text: "Off: each row is an array of values." }))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "nested", checked: true }), h("span", null, "Create nested objects from dotted column names", h("small", { text: "The column “price.list” becomes {\"price\": {\"list\": …}}." }))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "nulls" }), h("span", null, "Keep empty cells (null)")),
      seg("indent", [["2", "Pretty"], ["0", "Compact"]], "2", "JSON format"));
    el.append(toXl, toJs);
    return () => ({ flat: el.querySelector("[name=flat]").checked, which: radioVal(el, "which"), header: el.querySelector("[name=header]").checked, nested: el.querySelector("[name=nested]").checked, nulls: el.querySelector("[name=nulls]").checked, indent: +radioVal(el, "indent") });
  },
  onChange(ctx) {
    const it = ctx.items[0];
    const [g1, g2] = ctx.optsEl.children;
    g1.hidden = !(it && isJson(it));
    g2.hidden = !(it && !isJson(it));
  },
  async run(items, o) {
    const it = items[0];
    if (isJson(it)) {
      const X = await XL();
      let sheets;
      try { sheets = jsonSheets(it.json, o.flat, baseName(it.name)); }
      catch (e) { const err = new Error(e.message); err.userMsg = e.message; throw err; }
      sheets = sheets.map((s) => ({ name: s.name, rows: s.rows.map((r) => r.map(cellOut)) }));
      const n = sheets.reduce((a, s) => a + Math.max(0, s.rows.length - 1), 0);
      return [{ blob: writeXlsx(X, sheets, { filter: true }), name: baseName(it.name) + ".xlsx", note: `${sheets.length > 1 ? sheets.length + " sheet, " : ""}${fmtNum(n)} rows`, extra: previewTable(sheets[0].rows, { max: 15 }) }];
    }
    const list = it.book.sheets.filter((s) => s.rows.length);
    const use = o.which === "all" ? list : list.slice(0, 1);
    const data = o.which === "all" && use.length > 1 ? Object.fromEntries(use.map((s) => [s.name, sheetJson(s.rows, o)])) : sheetJson(use[0].rows, o);
    const text = JSON.stringify(data, null, o.indent || undefined);
    const count = Array.isArray(data) ? data.length : Object.values(data).reduce((a, v) => a + v.length, 0);
    const pre = h("pre", { class: "out-pre jx-pre", tabindex: "0", text: text.length > 60000 ? text.slice(0, 60000) + "\n… (more, download the file to see everything)" : text });
    const extra = h("div", null, h("div", { class: "row", style: { justifyContent: "space-between", alignItems: "center", margin: "14px 0 8px" } },
      h("b", { text: `${fmtNum(count)} records` }),
      h("button", { class: "btn soft sm", type: "button", onclick: () => copyText(text) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy JSON")), pre);
    return [{ blob: new Blob([text + "\n"], { type: "application/json" }), name: baseName(it.name) + ".json", note: `${fmtNum(count)} records`, extra }];
  },
  doneTitle: () => "Converted!"
});

const css = document.createElement("style");
css.textContent = ".jx-pre{max-height:50vh;overflow:auto;font-size:13px;white-space:pre}";
document.head.append(css);
