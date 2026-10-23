/* Tự sinh bởi scripts/build.js từ assets/tools/merge-excel.js và i18n/en/js/ — đừng sửa tay. */
/* Gộp nhiều file Excel/CSV: xếp chồng mọi sheet vào một bảng (cột cùng tên được ghép đúng chỗ dù khác thứ tự,
   thêm cột Nguồn), hoặc gom các sheet vào một file Excel. */
import { h, sampleFiles, fmtNum } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { readBook, writeCsv, writeXlsx, previewTable, cellText, XL } from "../sheet.js";
import { stackTables } from "../lib/bang.js";

fileTool({
  accept: ["excel", "csv"], multiple: true, reorder: true, noun: "Excel or CSV files",
  action: "Merge files",
  sample: () => sampleFiles("ban-hang-thang-9.xlsx", "ban-hang-thang-10.xlsx", "ban-hang-thang-11.csv"),
  warm: () => XL(),
  async load(it) {
    it.book = await readBook(it.file);
    const s = it.book.sheets.filter((x) => x.rows.length);
    it.info = s.length > 1 ? `${s.length} ${(s.length) == 1 ? "sheet" : "sheets"}, ${fmtNum(s.reduce((a, x) => a + x.rows.length, 0))} rows` : `${fmtNum(s[0] ? s[0].rows.length : 0)} rows`;
  },
  options(el) {
    el.append(
      seg("mode", [["stack", "Stack into one table"], ["sheets", "Keep each sheet separate"]], "stack", "Merge method"),
      h("p", { class: "hint", "data-for": "sheets", hidden: true, text: "All sheets of all files are copied into one Excel file, one worksheet each (duplicate names are numbered)." }),
      seg("which", [["all", "All sheets"], ["first", "First sheet of each file"]], "all", "Which sheets"),
      h("div", { class: "opt-group", "data-for": "stack" },
        h("label", { class: "switch" }, h("input", { type: "checkbox", name: "header", checked: true }), h("span", null, "First row is the header", h("small", { text: "Columns with the same name are lined up together (case- and accent-insensitive), even if the column order differs between files. Only one header row is kept." }))),
        h("label", { class: "switch" }, h("input", { type: "checkbox", name: "source", checked: true }), h("span", null, "Add a “Source” column", h("small", { text: "Records the file (and sheet) name of each row." })))),
      seg("fmt", [["xlsx", "Excel (.xlsx)"], ["csv", "CSV"]], "xlsx", "Save as"));
    return () => ({ mode: radioVal(el, "mode"), which: radioVal(el, "which"), header: el.querySelector("[name=header]").checked, source: el.querySelector("[name=source]").checked, fmt: radioVal(el, "fmt") });
  },
  onChange(ctx) {
    const o = ctx.opts;
    ctx.optsEl.querySelectorAll("[data-for]").forEach((x) => { x.hidden = x.dataset.for !== o.mode; });
    const fmt = ctx.optsEl.querySelector("[name=fmt]").closest(".opt-group");
    fmt.hidden = o.mode === "sheets";
  },
  ready: (items) => (items.length < 2 && !(items[0] && items[0].book && items[0].book.sheets.filter((s) => s.rows.length).length > 1) ? "Add at least 2 files (or 1 file with several sheets) to merge." : true),
  async run(items, o) {
    const X = await XL();
    const tables = [];
    for (const it of items) {
      const sheets = it.book.sheets.filter((s) => s.rows.length);
      const list = o.which === "first" ? sheets.slice(0, 1) : sheets;
      for (const s of list) tables.push({ label: it.name + (list.length > 1 || it.book.sheets.length > 1 ? " / " + s.name : ""), sheet: s.name, file: it.name, rows: s.rows });
    }
    if (o.mode === "sheets") {
      const blob = writeXlsx(X, tables.map((t) => ({ name: t.sheet, rows: t.rows })));
      return [{ blob, name: `merged-${tables.length}-sheets.xlsx`, note: `${tables.length} sheet`, extra: h("ul", { class: "hint" }, tables.map((t) => h("li", { text: `${t.label}: ${fmtNum(t.rows.length)} rows` }))) }];
    }
    const r = stackTables(tables, { header: o.header, source: o.source ? "Source" : "", text: cellText });
    const total = r.added.reduce((a, b) => a + b, 0);
    const name = `merged-${tables.length}-tables`;
    const blob = o.fmt === "csv" ? writeCsv(r.rows) : writeXlsx(X, [{ name: "Merged", rows: r.rows }], { filter: o.header });
    const notes = tables.map((t, i) => h("li", null, `${t.label}: ${fmtNum(r.added[i])} rows`, r.newCols[i] && r.newCols[i].length ? h("small", { text: " · added column " + r.newCols[i].join(", ") }) : null));
    const extra = h("div", null, h("ul", { class: "hint" }, notes), previewTable(r.rows, { max: 15, header: o.header }));
    return [{ blob, name: name + "." + o.fmt, note: `${fmtNum(total)} rows × ${r.columns} columns`, extra }];
  },
  doneTitle: () => "Merged!"
});
