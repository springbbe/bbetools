/* Chèn trang trắng: sau / trước các trang chọn, sau mỗi trang, cuối file, hoặc thêm cho đủ số trang chẵn (in hai mặt).
   Trang trắng cùng khổ với trang liền trước. */
import { h, baseName, sampleFiles } from "../core.js";
import { pageTool, firstItem, visDims } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";
import { blankPlan, parseRanges } from "../lib/page-ranges.js";

let base = [], key = 2e9, el = null, sig = "";
const modeOf = () => (el ? el.querySelector("#mode-sel").value : "after");
const HINTS = {
  after: "Bấm vào trang để chèn trang trắng ngay sau nó, hoặc gõ số trang.",
  before: "Bấm vào trang để chèn trang trắng ngay trước nó, hoặc gõ số trang.",
  each: "Xen một trang trắng sau mỗi trang, ví dụ để ghi chú hoặc in một mặt khi máy in tự đảo mặt.",
  end: "Thêm trang trắng ở cuối file.",
  even: "Thêm một trang trắng ở cuối nếu số trang đang lẻ, để in hai mặt không bị lệch tờ."
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
  action: "Chèn trang trắng",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: () => (/after|before/.test(modeOf()) ? "sel" : null),
  clickLabel: "Bấm để chọn chỗ chèn trang trắng",
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
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Chèn ở đâu" }),
        h("select", { class: "select", id: "mode-sel" },
          [["after", "Sau các trang chọn"], ["before", "Trước các trang chọn"], ["each", "Sau mỗi trang"], ["end", "Cuối file"], ["even", "Cho đủ số trang chẵn (in hai mặt)"]].map(([v, l]) => h("option", { value: v, text: l }))))),
      h("p", { class: "hint", id: "mode-hint" }),
      h("div", { class: "opt-group", id: "g-at" }, h("label", { class: "field" }, h("span", { text: "Các trang" }), at)),
      h("div", { class: "opt-group", id: "g-count" }, h("label", { class: "field" }, h("span", { text: "Số trang trắng mỗi chỗ" }), count)));
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
    if (blanks) return `Thêm <b>${blanks}</b> trang trắng · file mới có <b>${B.pages.length}</b> trang.`;
    return o.mode === "even" ? `File đã có số trang chẵn (${B.pages.length} trang), không cần thêm.` : "Chưa có trang trắng nào được thêm.";
  },
  ready: (B, o) => (B.pages.some((p) => p.blank) ? true : o.mode === "even" ? "File đã có số trang chẵn, không cần thêm trang trắng." : "Chọn chỗ cần chèn trang trắng."),
  async run(B, o, ctx) {
    ctx.status("Đang tạo file…"); ctx.progress(-1);
    const doc = await B.build(B.pages);
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(firstItem(B).name) + "-them-trang-trang.pdf", note: B.pages.length + " trang" }];
  },
  doneTitle: () => "Đã chèn trang trắng!"
});
