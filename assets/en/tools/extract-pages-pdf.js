/* Tự sinh bởi scripts/build.js từ assets/tools/extract-pages-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Trích xuất trang PDF: bấm chọn (hoặc gõ) các trang cần lấy, lưu thành một PDF mới hoặc mỗi trang một file */
import { h, baseName, sampleFiles, nextFrame } from "../core.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";
import { rangeSlug } from "../lib/page-ranges.js";

let field = null, sep = null;
const picked = (B) => B.pages.flatMap((p, i) => (p.sel ? [i + 1] : []));

pageTool({
  action: "Extract pages",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "sel", rangeProp: "sel",
  clickLabel: "Click to select or deselect a page",
  click(p) { p.sel = !p.sel; },
  tools: (B) => [
    h("button", { class: "btn ghost sm", type: "button", text: "Select all", onclick: () => { B.pages.forEach((p) => { p.sel = true; }); B.changed(false); } }),
    h("button", { class: "btn ghost sm", type: "button", text: "Deselect", onclick: () => { B.pages.forEach((p) => { p.sel = false; }); B.changed(false); } })],
  options(el, ctx, B) {
    field = B.rangeField("sel", "Pages to extract", "VD: 1, 3-5", "Type page numbers or click the pages.");
    sep = h("input", { type: "checkbox", id: "separate" });
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Extract pages" }),
      h("p", { class: "hint", html: "Click the pages you want. Hold <kbd>Shift</kbd> and click to select a range." }), field.el),
      h("label", { class: "switch" }, sep, h("span", null, "Each page as a separate file", h("small", { text: "Download each file or a .zip." }))));
    return () => ({ separate: sep.checked });
  },
  onChange() { if (field) field.sync(); },
  summary(B, o) {
    const n = picked(B).length;
    return n ? `Extract <b>${n}</b>/${B.pages.length} pages into <b>${o.separate ? n : 1}</b> PDF ${(o.separate ? n : 1) == 1 ? "file" : "files"}.` : "No pages selected.";
  },
  ready: (B) => (picked(B).length ? true : "Select at least one page."),
  async run(B, o, ctx) {
    const nums = picked(B), base = baseName(firstItem(B).name);
    const groups = o.separate ? nums.map((n) => [n]) : [nums];
    const outs = [];
    for (let i = 0; i < groups.length; i++) {
      ctx.check();
      ctx.status(`Creating file ${i + 1}/${groups.length}…`);
      const doc = await B.build(groups[i].map((n) => B.pages[n - 1]));
      outs.push({ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: `${base}-page-${rangeSlug(groups[i])}.pdf`, note: groups[i].length + " pages" });
      ctx.progress((i + 1) / groups.length);
      await nextFrame();
    }
    return outs;
  },
  zipName: "extracted-pages",
  doneTitle: (outs) => (outs.length > 1 ? `Extracted ${outs.length} pages into ${outs.length} files!` : "Pages extracted!")
});
