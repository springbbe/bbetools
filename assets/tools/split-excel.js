/* Tách Excel theo cột: chia một bảng thành nhiều sheet hoặc nhiều file theo giá trị của một cột
   (ví dụ mỗi chi nhánh, mỗi phòng ban một file), mỗi phần giữ dòng tiêu đề. */
import { h, sampleFiles, fmtNum, baseName } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { readBook, writeCsv, writeXlsx, cellText, XL } from "../sheet.js";
import { splitBy, fileNames, colName } from "../lib/bang.js";

let book = null, sheetSel, colSel, headChk, groupsBox;
const sheet = () => (book ? book.sheets[+sheetSel.value] || book.sheets[0] : null);

function fillCols(keep) {
  const s = sheet();
  const n = s ? s.rows.reduce((m, r) => Math.max(m, r.length), 0) : 0;
  const prev = keep ? colSel.value : "";
  colSel.textContent = "";
  for (let j = 0; j < n; j++) {
    const t = headChk.checked && s.rows[0] ? cellText(s.rows[0][j]).trim() : "";
    colSel.append(h("option", { value: j, text: `${colName(j)}${t ? " – " + t : ""}` }));
  }
  // đoán cột hợp để tách: không phải cột số, ít giá trị khác nhau
  if (prev && +prev < n) colSel.value = prev;
  else if (s) {
    let best = 0, bestScore = -1;
    for (let j = 0; j < n; j++) {
      const body = s.rows.slice(headChk.checked ? 1 : 0);
      const vals = new Set(body.map((r) => cellText(r[j]).trim()).filter(Boolean));
      const numeric = body.some((r) => r[j] && r[j].t === "n");
      // ưu tiên cột có 3–30 giá trị (chi nhánh, phòng ban…), sau đó mới tới cột hai giá trị (giới tính)
      const score = numeric || vals.size < 2 || vals.size > 50 ? -1 : vals.size === 2 ? 10 : 100 - vals.size;
      if (score > bestScore) { best = j; bestScore = score; }
    }
    colSel.value = String(best);
  }
}

function groups() {
  const s = sheet();
  if (!s || colSel.value === "") return [];
  return splitBy(s.rows, +colSel.value, { header: headChk.checked, text: cellText });
}

fileTool({
  accept: ["excel", "csv"], multiple: false, noun: "file Excel hoặc CSV",
  action: "Tách file",
  sample: () => sampleFiles("nhan-vien.xlsx"),
  warm: () => XL(),
  async load(it) {
    book = await readBook(it.file);
    const list = book.sheets.map((s, i) => [i, s]).filter(([, s]) => s.rows.length);
    if (!list.length) { const e = new Error("trống"); e.userMsg = it.name + " không có dữ liệu."; throw e; }
    it.info = `${book.sheets.length} sheet`;
    sheetSel.textContent = "";
    list.forEach(([i, s]) => sheetSel.append(h("option", { value: i, text: `${s.name} (${fmtNum(s.rows.length)} dòng)` })));
    sheetSel.closest(".field").hidden = list.length < 2;
    fillCols(false);
  },
  options(el) {
    sheetSel = h("select", { id: "sx-sheet", onchange: () => fillCols(false) });
    colSel = h("select", { id: "sx-col" });
    headChk = h("input", { type: "checkbox", checked: true, onchange: () => fillCols(true) });
    groupsBox = h("div", { class: "sx-groups", "aria-live": "polite" });
    el.append(
      h("div", { class: "field" }, h("label", { for: "sx-sheet", text: "Sheet" }), sheetSel),
      h("label", { class: "switch" }, headChk, h("span", null, "Dòng đầu là tiêu đề", h("small", { text: "Mỗi phần đều được chép dòng tiêu đề." }))),
      h("div", { class: "field" }, h("label", { for: "sx-col", text: "Tách theo cột" }), colSel),
      groupsBox,
      seg("out", [["sheets", "1 file, nhiều sheet"], ["files", "Nhiều file Excel"], ["csv", "Nhiều file CSV"]], "sheets", "Kết quả"));
    return () => ({ out: radioVal(el, "out") });
  },
  onChange() {
    const g = groups();
    groupsBox.textContent = "";
    if (!g.length) return;
    const shown = g.slice(0, 12);
    groupsBox.append(h("p", { class: "opt-title", text: `${g.length} phần` }),
      h("ul", { class: "chip-list" }, shown.map((x) => h("li", { class: "chip" }, x.key || "(trống)", h("small", { text: " " + fmtNum(x.rows.length - (headChk.checked ? 1 : 0)) })))),
      g.length > shown.length ? h("p", { class: "hint", text: `… và ${g.length - shown.length} phần nữa` }) : "",
      g.length > 200 ? h("p", { class: "alert warn", text: "Cột này có rất nhiều giá trị khác nhau, có thể bạn đã chọn nhầm cột." }) : "");
  },
  ready: () => { const g = groups(); return !g.length ? "Chọn cột để tách." : g.length < 2 ? "Cột này chỉ có một giá trị, không cần tách." : true; },
  async run(items, o, ctx) {
    const X = await XL();
    const it = items[0], s = sheet(), g = groups();
    const base = baseName(it.name);
    const names = fileNames(g.map((x) => x.key || "Trống"));
    if (o.out === "sheets") {
      ctx.status("Đang tạo file…");
      return [{ blob: writeXlsx(X, g.map((x) => ({ name: x.key || "Trống", rows: x.rows })), { filter: headChk.checked }), name: `${base} - theo ${fileNames([(headChk.checked && cellText(s.rows[0][+colSel.value]).trim()) || "cot " + colName(+colSel.value)])[0]}.xlsx`, note: `${g.length} sheet`,
        extra: h("p", { class: "hint", text: g.map((x) => `${x.key || "(trống)"}: ${fmtNum(x.rows.length - (headChk.checked ? 1 : 0))}`).join(" · ") }) }];
    }
    const outs = [];
    for (let i = 0; i < g.length; i++) {
      ctx.check();
      ctx.progress((i + 1) / g.length);
      const x = g[i], n = x.rows.length - (headChk.checked ? 1 : 0);
      outs.push(o.out === "csv"
        ? { blob: writeCsv(x.rows), name: `${base} - ${names[i]}.csv`, note: fmtNum(n) + " dòng" }
        : { blob: writeXlsx(X, [{ name: s.name, rows: x.rows }], { filter: headChk.checked }), name: `${base} - ${names[i]}.xlsx`, note: fmtNum(n) + " dòng" });
    }
    return outs;
  },
  zipName: "tach-excel",
  doneTitle: (outs) => (outs.length > 1 ? `Đã tách thành ${outs.length} file!` : "Đã tách xong!")
});

const css = document.createElement("style");
css.textContent = ".sx-groups .chip-list{margin:4px 0 0;gap:6px}.sx-groups .chip{font-size:13px;padding:4px 10px;min-height:0}.sx-groups .chip small{opacity:.7}";
document.head.append(css);
