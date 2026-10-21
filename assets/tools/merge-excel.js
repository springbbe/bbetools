/* Gộp nhiều file Excel/CSV: xếp chồng mọi sheet vào một bảng (cột cùng tên được ghép đúng chỗ dù khác thứ tự,
   thêm cột Nguồn), hoặc gom các sheet vào một file Excel. */
import { h, sampleFiles, fmtNum } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { readBook, writeCsv, writeXlsx, previewTable, cellText, XL } from "../sheet.js";
import { stackTables } from "../lib/bang.js";

fileTool({
  accept: ["excel", "csv"], multiple: true, reorder: true, noun: "file Excel hoặc CSV",
  action: "Gộp file",
  sample: () => sampleFiles("ban-hang-thang-9.xlsx", "ban-hang-thang-10.xlsx", "ban-hang-thang-11.csv"),
  warm: () => XL(),
  async load(it) {
    it.book = await readBook(it.file);
    const s = it.book.sheets.filter((x) => x.rows.length);
    it.info = s.length > 1 ? `${s.length} sheet, ${fmtNum(s.reduce((a, x) => a + x.rows.length, 0))} dòng` : `${fmtNum(s[0] ? s[0].rows.length : 0)} dòng`;
  },
  options(el) {
    el.append(
      seg("mode", [["stack", "Nối thành một bảng"], ["sheets", "Mỗi sheet giữ riêng"]], "stack", "Cách gộp"),
      h("p", { class: "hint", "data-for": "sheets", hidden: true, text: "Tất cả sheet của các file được chép vào một file Excel, mỗi sheet một trang tính (tên trùng được đánh số)." }),
      seg("which", [["all", "Mọi sheet"], ["first", "Sheet đầu mỗi file"]], "all", "Lấy sheet nào"),
      h("div", { class: "opt-group", "data-for": "stack" },
        h("label", { class: "switch" }, h("input", { type: "checkbox", name: "header", checked: true }), h("span", null, "Dòng đầu là tiêu đề", h("small", { text: "Cột cùng tên được xếp chung (không phân biệt hoa thường, có dấu hay không), dù thứ tự cột mỗi file khác nhau. Chỉ giữ một dòng tiêu đề." }))),
        h("label", { class: "switch" }, h("input", { type: "checkbox", name: "source", checked: true }), h("span", null, "Thêm cột “Nguồn”", h("small", { text: "Ghi tên file (và sheet) của từng dòng." })))),
      seg("fmt", [["xlsx", "Excel (.xlsx)"], ["csv", "CSV"]], "xlsx", "Lưu dưới dạng"));
    return () => ({ mode: radioVal(el, "mode"), which: radioVal(el, "which"), header: el.querySelector("[name=header]").checked, source: el.querySelector("[name=source]").checked, fmt: radioVal(el, "fmt") });
  },
  onChange(ctx) {
    const o = ctx.opts;
    ctx.optsEl.querySelectorAll("[data-for]").forEach((x) => { x.hidden = x.dataset.for !== o.mode; });
    const fmt = ctx.optsEl.querySelector("[name=fmt]").closest(".opt-group");
    fmt.hidden = o.mode === "sheets";
  },
  ready: (items) => (items.length < 2 && !(items[0] && items[0].book && items[0].book.sheets.filter((s) => s.rows.length).length > 1) ? "Thêm ít nhất 2 file (hoặc 1 file có nhiều sheet) để gộp." : true),
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
      return [{ blob, name: `gop-${tables.length}-sheet.xlsx`, note: `${tables.length} sheet`, extra: h("ul", { class: "hint" }, tables.map((t) => h("li", { text: `${t.label}: ${fmtNum(t.rows.length)} dòng` }))) }];
    }
    const r = stackTables(tables, { header: o.header, source: o.source ? "Nguồn" : "", text: cellText });
    const total = r.added.reduce((a, b) => a + b, 0);
    const name = `gop-${tables.length}-bang`;
    const blob = o.fmt === "csv" ? writeCsv(r.rows) : writeXlsx(X, [{ name: "Gộp", rows: r.rows }], { filter: o.header });
    const notes = tables.map((t, i) => h("li", null, `${t.label}: ${fmtNum(r.added[i])} dòng`, r.newCols[i] && r.newCols[i].length ? h("small", { text: " · thêm cột " + r.newCols[i].join(", ") }) : null));
    const extra = h("div", null, h("ul", { class: "hint" }, notes), previewTable(r.rows, { max: 15, header: o.header }));
    return [{ blob, name: name + "." + o.fmt, note: `${fmtNum(total)} dòng × ${r.columns} cột`, extra }];
  },
  doneTitle: () => "Đã gộp xong!"
});
