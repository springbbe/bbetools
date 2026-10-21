/* Excel ↔ CSV: Excel (.xlsx, .xls, .ods) → CSV UTF-8 (có BOM để Excel mở đúng tiếng Việt), mỗi sheet một file;
   CSV → Excel (tự nhận UTF-8 / Windows-1258, dấu phân cách; giữ số 0 đầu của số điện thoại, mã). */
import { h, sampleFiles, fmtNum, baseName } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { readBook, writeCsv, writeXlsx, previewTable, outName, XL, isCsvName } from "../sheet.js";

const isCsv = (it) => isCsvName(it.name) || (it.book && it.book.kind === "csv");

fileTool({
  accept: ["excel", "csv"], multiple: true, noun: "file Excel hoặc CSV",
  action: "Chuyển đổi",
  sample: () => sampleFiles("nhan-vien.xlsx", "ban-hang-thang-11.csv"),
  warm: () => XL(),
  async load(it) {
    it.book = await readBook(it.file);
    const n = it.book.sheets.filter((s) => s.rows.length).length;
    it.info = it.book.kind === "csv" ? `CSV → Excel · ${it.book.encoding} · ${fmtNum(it.book.sheets[0].rows.length)} dòng` : `Excel → CSV · ${n} sheet có dữ liệu`;
  },
  options(el) {
    const toCsv = h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Excel → CSV" }),
      seg("sheets", [["all", "Mọi sheet"], ["first", "Chỉ sheet đầu"]], "all", "Lấy sheet"),
      seg("delim", [[",", "Dấu phẩy ,"], [";", "Chấm phẩy ;"], ["\t", "Tab"]], ",", "Dấu phân cách"),
      h("small", { class: "hint", text: "Excel đặt vùng Việt Nam thường dùng dấu chấm phẩy (;), khi đó số thập phân ghi bằng dấu phẩy." }),
      h("label", { class: "switch", style: { marginTop: "10px" } }, h("input", { type: "checkbox", name: "bom", checked: true }), h("span", null, "Thêm BOM UTF-8", h("small", { text: "Để Excel mở thẳng file CSV không lỗi font tiếng Việt. Tắt nếu dùng cho phần mềm khác." }))));
    const toXl = h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "CSV → Excel" }),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "numbers", checked: true }), h("span", null, "Nhận dạng số", h("small", { text: "Ô toàn chữ số thành số để tính toán được; số có 0 ở đầu (điện thoại, mã) và số dài hơn 15 chữ số vẫn giữ dạng chữ." }))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", name: "one" }), h("span", null, "Gộp các CSV vào một file Excel", h("small", { text: "Mỗi file CSV thành một sheet." }))));
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
      ctx.status(`Đang chuyển ${it.name}…`);
      if (isCsv(it)) {
        // đọc lại theo tuỳ chọn nhận số
        const b = o.numbers ? it.book : await readBook(it.file, { numbers: false });
        csvItems.push({ it, sheet: b.sheets[0] });
      } else {
        const sheets = it.book.sheets.filter((s) => s.rows.length);
        const list = o.sheets === "first" ? sheets.slice(0, 1) : sheets;
        for (const s of list) outs.push({ blob: writeCsv(s.rows, { delim: o.delim, bom: o.bom }), name: outName(it.name, s.name, "csv", list.length > 1), note: `${fmtNum(s.rows.length)} dòng`, preview: s.rows });
      }
      ctx.progress(++k / items.length);
    }
    if (csvItems.length) {
      if (o.one && csvItems.length > 1) outs.push({ blob: writeXlsx(X, csvItems.map((c) => ({ name: baseName(c.it.name), rows: c.sheet.rows }))), name: "gop-" + csvItems.length + "-file-csv.xlsx", note: csvItems.length + " sheet", preview: csvItems[0].sheet.rows });
      else for (const c of csvItems) outs.push({ blob: writeXlsx(X, [{ name: c.sheet.name, rows: c.sheet.rows }]), name: baseName(c.it.name) + ".xlsx", note: `${fmtNum(c.sheet.rows.length)} dòng`, preview: c.sheet.rows });
    }
    if (outs[0]) outs[0].extra = h("div", null, h("p", { class: "opt-title", style: { marginTop: "16px" }, text: "Xem trước dữ liệu: " + outs[0].name }), previewTable(outs[0].preview, { max: 15 }));
    return outs;
  },
  zipName: "excel-csv",
  doneTitle: (outs) => (outs.length > 1 ? `Đã tạo ${outs.length} file!` : "Đã chuyển xong!")
});
