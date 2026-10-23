/* Tự sinh bởi scripts/build.js từ assets/tools/excel-csv.js và i18n/en/js/ — đừng sửa tay. */
/* Excel ↔ CSV: Excel (.xlsx, .xls, .ods) → CSV UTF-8 (có BOM để Excel mở đúng tiếng Việt), mỗi sheet một file;
   CSV → Excel (tự nhận UTF-8 / Windows-1258, dấu phân cách; giữ số 0 đầu của số điện thoại, mã). */
import { h, sampleFiles, fmtNum, baseName } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { readBook, writeCsv, writeXlsx, previewTable, outName, XL, isCsvName } from "../sheet.js";

const isCsv = (it) => isCsvName(it.name) || (it.book && it.book.kind === "csv");

fileTool({
  accept: ["excel", "csv"], multiple: true, noun: "Excel or CSV files",
  action: "Convert",
  sample: () => sampleFiles("nhan-vien.xlsx", "ban-hang-thang-11.csv"),
  warm: () => XL(),
  async load(it) {
    it.book = await readBook(it.file);
    const n = it.book.sheets.filter((s) => s.rows.length).length;
    it.info = it.book.kind === "csv" ? `CSV → Excel · ${it.book.encoding} · ${fmtNum(it.book.sheets[0].rows.length)} rows` : `Excel → CSV · ${n} ${(n) == 1 ? "sheet" : "sheets"} with data`;
  },
  options(el) {
    const toCsv = h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Excel → CSV" }),
      seg("sheets", [["all", "All sheets"], ["first", "First sheet only"]], "all", "Sheets"),
      seg("delim", [[",", "Comma ,"], [";", "Semicolon ;"], ["\t", "Tab"]], ",", "Delimiter"),
      h("small", { class: "hint", text: "Excel set to some European locales (and Vietnam) uses a semicolon (;), with a comma as the decimal separator." }),
      h("label", { class: "switch", style: { marginTop: "10px" } }, h("input", { type: "checkbox", name: "bom", checked: true }), h("span", null, "Add UTF-8 BOM", h("small", { text: "So Excel opens the CSV directly without garbled accented characters. Turn off for other software." }))));
    const toXl = h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "CSV → Excel" }),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "numbers", checked: true }), h("span", null, "Detect numbers", h("small", { text: "All-digit cells become numbers you can calculate with; numbers with leading zeros (phones, codes) and longer than 15 digits stay as text." }))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "one" }), h("span", null, "Combine the CSVs into one Excel file", h("small", { text: "Each CSV file becomes a sheet." }))));
    el.append(toCsv, toXl);
    return () => ({ sheets: radioVal(el, "sheets"), delim: radioVal(el, "delim"), bom: el.querySelector("[name=bom]").checked, numbers: el.querySelector("[name=numbers]").checked, one: el.querySelector("[name=one]").checked });
  },
  onChange(ctx) {
    const items = ctx.items.filter((i) => i.book);
    const [g1, g2] = ctx.optsEl.children;
    g1.hidden = !items.some((i) => !isCsv(i));
    g2.hidden = !items.some(isCsv);
    if (g2.querySelector("[name=one]")) g2.querySelector("[name=one]").closest("label").hidden = items.filter(isCsv).length < 2;
  },
  async run(items, o, ctx) {
    const X = await XL();
    const outs = [], csvItems = [];
    let k = 0;
    for (const it of items) {
      ctx.check();
      ctx.status(`Converting ${it.name}…`);
      if (isCsv(it)) {
        // đọc lại theo tuỳ chọn nhận số
        const b = o.numbers ? it.book : await readBook(it.file, { numbers: false });
        csvItems.push({ it, sheet: b.sheets[0] });
      } else {
        const sheets = it.book.sheets.filter((s) => s.rows.length);
        const list = o.sheets === "first" ? sheets.slice(0, 1) : sheets;
        for (const s of list) outs.push({ blob: writeCsv(s.rows, { delim: o.delim, bom: o.bom }), name: outName(it.name, s.name, "csv", list.length > 1), note: `${fmtNum(s.rows.length)} rows`, preview: s.rows });
      }
      ctx.progress(++k / items.length);
    }
    if (csvItems.length) {
      if (o.one && csvItems.length > 1) outs.push({ blob: writeXlsx(X, csvItems.map((c) => ({ name: baseName(c.it.name), rows: c.sheet.rows }))), name: "combined-" + csvItems.length + "-csv-files.xlsx", note: csvItems.length + " sheet", preview: csvItems[0].sheet.rows });
      else for (const c of csvItems) outs.push({ blob: writeXlsx(X, [{ name: c.sheet.name, rows: c.sheet.rows }]), name: baseName(c.it.name) + ".xlsx", note: `${fmtNum(c.sheet.rows.length)} rows`, preview: c.sheet.rows });
    }
    if (outs[0]) outs[0].extra = h("div", null, h("p", { class: "opt-title", style: { marginTop: "16px" }, text: "Data preview: " + outs[0].name }), previewTable(outs[0].preview, { max: 15 }));
    return outs;
  },
  zipName: "excel-csv",
  doneTitle: (outs) => (outs.length > 1 ? `Created ${outs.length} files!` : "Converted!")
});
