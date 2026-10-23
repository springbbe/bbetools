/* Tự sinh bởi scripts/build.js từ assets/tools/insert-blank-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Chèn trang trắng: sau / trước các trang chọn, sau mỗi trang, cuối file, hoặc thêm cho đủ số trang chẵn (in hai mặt).
   Trang trắng cùng khổ với trang liền trước. */
import { h, baseName, sampleFiles } from "../core.js";
import { pageTool, firstItem, visDims } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";
import { blankPlan, parseRanges } from "../lib/page-ranges.js";

let base = [], key = 2e9, el = null, sig = "";
const modeOf = () => (el ? el.querySelector("#mode-sel").value : "after");
const HINTS = {
  after: "Click a page to insert a blank page right after it, or type page numbers.",
  before: "Click a page to insert a blank page right before it, or type page numbers.",
  each: "Insert a blank page after every page, e.g. for notes or for printing single-sided when the printer duplexes automatically.",
  end: "Add blank pages at the end of the file.",
  even: "Add one blank page at the end if the page count is odd, so double-sided printing lines up."
};

// dựng lại danh sách trang (gốc + trang trắng) theo tuỳ chọn hiện tại
function apply(B, o) {
  if (!base.length) return;
  const at = parseRanges(o.pages, base.length).pages;
  const s = JSON.stringify([o.mode, o.count, at, base[0].key, base.length, base.map((p) => p.rot)]);
  if (s === sig) return;
  sig = s;
  let prev = base[0];
  B.pages = blankPlan(base.length, { mode: o.mode, pages: at, count: o.count }).map((n) => {
    if (n) { prev = base[n - 1]; prev.sel = at.includes(n); return prev; }
    const [w, hh] = visDims(prev);
    return { key: ++key, blank: true, n: 0, rot: 0, w, h: hh };
  });
  B.render();
}

pageTool({
  action: "Insert blank pages",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: () => (/after|before/.test(modeOf()) ? "sel" : null),
  clickLabel: "Click to choose where to insert blank pages",
  click(p, idx, e, B) {
    if (p.blank) return;
    const input = el.querySelector("#at"), cur = new Set(parseRanges(input.value, base.length).pages), n = base.indexOf(p) + 1;
    if (cur.has(n)) cur.delete(n); else cur.add(n);
    input.value = [...cur].sort((a, b) => a - b).join(", ");
    if (!/after|before/.test(modeOf())) el.querySelector("#mode-sel").value = "after";
    B.ctx.refresh();
  },
  onPages(B, it) { base = B.pages.filter((p) => p.it === it); sig = ""; },
  options(e) {
    el = e;
    const at = h("input", { class: "input", id: "at", inputmode: "numeric", autocomplete: "off", placeholder: "VD: 1, 4" });
    const count = h("input", { class: "input", id: "count", type: "number", min: 1, max: 50, value: 1, inputmode: "numeric" });
    e.append(
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Where to insert" }),
        h("select", { class: "select", id: "mode-sel" },
          [["after", "After selected pages"], ["before", "Before selected pages"], ["each", "After every page"], ["end", "End of file"], ["even", "Make the page count even (double-sided)"]].map(([v, l]) => h("option", { value: v, text: l }))))),
      h("p", { class: "hint", id: "mode-hint" }),
      h("div", { class: "opt-group", id: "g-at" }, h("label", { class: "field" }, h("span", { text: "Pages" }), at)),
      h("div", { class: "opt-group", id: "g-count" }, h("label", { class: "field" }, h("span", { text: "Blank pages per spot" }), count)));
    return () => ({ mode: modeOf(), pages: at.value, count: +count.value || 1 });
  },
  onChange(B, ctx) {
    const o = ctx.opts;
    el.querySelector("#mode-hint").textContent = HINTS[o.mode];
    el.querySelector("#g-at").hidden = !/after|before/.test(o.mode);
    el.querySelector("#g-count").hidden = o.mode === "even";
    if (!B.pages.length) { base = []; sig = ""; }
    apply(B, o);
    B.repaint();
  },
  summary(B, o) {
    const blanks = B.pages.filter((p) => p.blank).length;
    if (blanks) return `Adding <b>${blanks}</b> blank ${(blanks) == 1 ? "page" : "pages"} · the new file has <b>${B.pages.length}</b> pages.`;
    return o.mode === "even" ? `The file already has an even number of pages (${B.pages.length}), nothing to add.` : "No blank pages added yet.";
  },
  ready: (B, o) => (B.pages.some((p) => p.blank) ? true : o.mode === "even" ? "The file already has an even number of pages, no blank page needed." : "Choose where to insert blank pages."),
  async run(B, o, ctx) {
    ctx.status("Creating file…"); ctx.progress(-1);
    const doc = await B.build(B.pages);
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(firstItem(B).name) + "-blank-pages.pdf", note: B.pages.length + " pages" }];
  },
  doneTitle: () => "Blank pages inserted!"
});
