/* Tự sinh bởi scripts/build.js từ assets/tools/split-excel.js và i18n/en/js/ — đừng sửa tay. */
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
  accept: ["excel", "csv"], multiple: false, noun: "Excel or CSV files",
  action: "Split file",
  sample: () => sampleFiles("nhan-vien.xlsx"),
  warm: () => XL(),
  async load(it) {
    book = await readBook(it.file);
    const list = book.sheets.map((s, i) => [i, s]).filter(([, s]) => s.rows.length);
    if (!list.length) { const e = new Error("empty"); e.userMsg = it.name + " has no data."; throw e; }
    it.info = `${book.sheets.length} sheet`;
    sheetSel.textContent = "";
    list.forEach(([i, s]) => sheetSel.append(h("option", { value: i, text: `${s.name} (${fmtNum(s.rows.length)} rows)` })));
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
      h("label", { class: "switch" }, headChk, h("span", null, "First row is the header", h("small", { text: "The header row is copied into each part." }))),
      h("div", { class: "field" }, h("label", { for: "sx-col", text: "Split by column" }), colSel),
      groupsBox,
      seg("out", [["sheets", "1 file, many sheets"], ["files", "Many Excel files"], ["csv", "Many CSV files"]], "sheets", "Result"));
    return () => ({ out: radioVal(el, "out") });
  },
  onChange() {
    const g = groups();
    groupsBox.textContent = "";
    if (!g.length) return;
    const shown = g.slice(0, 12);
    groupsBox.append(h("p", { class: "opt-title", text: `${g.length} ${(g.length) == 1 ? "part" : "parts"}` }),
      h("ul", { class: "chip-list" }, shown.map((x) => h("li", { class: "chip" }, x.key || "(empty)", h("small", { text: " " + fmtNum(x.rows.length - (headChk.checked ? 1 : 0)) })))),
      g.length > shown.length ? h("p", { class: "hint", text: `… and ${g.length - shown.length} more parts` }) : "",
      g.length > 200 ? h("p", { class: "alert warn", text: "This column has a lot of distinct values; you may have picked the wrong column." }) : "");
  },
  ready: () => { const g = groups(); return !g.length ? "Choose a column to split by." : g.length < 2 ? "This column has only one value, nothing to split." : true; },
  async run(items, o, ctx) {
    const X = await XL();
    const it = items[0], s = sheet(), g = groups();
    const base = baseName(it.name);
    const names = fileNames(g.map((x) => x.key || "Empty"));
    if (o.out === "sheets") {
      ctx.status("Creating files…");
      return [{ blob: writeXlsx(X, g.map((x) => ({ name: x.key || "Empty", rows: x.rows })), { filter: headChk.checked }), name: `${base} - by ${fileNames([(headChk.checked && cellText(s.rows[0][+colSel.value]).trim()) || "column " + colName(+colSel.value)])[0]}.xlsx`, note: `${g.length} sheet`,
        extra: h("p", { class: "hint", text: g.map((x) => `${x.key || "(empty)"}: ${fmtNum(x.rows.length - (headChk.checked ? 1 : 0))}`).join(" · ") }) }];
    }
    const outs = [];
    for (let i = 0; i < g.length; i++) {
      ctx.check();
      ctx.progress((i + 1) / g.length);
      const x = g[i], n = x.rows.length - (headChk.checked ? 1 : 0);
      outs.push(o.out === "csv"
        ? { blob: writeCsv(x.rows), name: `${base} - ${names[i]}.csv`, note: fmtNum(n) + " rows" }
        : { blob: writeXlsx(X, [{ name: s.name, rows: x.rows }], { filter: headChk.checked }), name: `${base} - ${names[i]}.xlsx`, note: fmtNum(n) + " rows" });
    }
    return outs;
  },
  zipName: "split-excel",
  doneTitle: (outs) => (outs.length > 1 ? `Split into ${outs.length} files!` : "Split done!")
});

const css = document.createElement("style");
css.textContent = ".sx-groups .chip-list{margin:4px 0 0;gap:6px}.sx-groups .chip{font-size:13px;padding:4px 10px;min-height:0}.sx-groups .chip small{opacity:.7}";
document.head.append(css);
