/* Tự sinh bởi scripts/build.js từ assets/tools/remove-pages-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Xoá trang PDF: bấm chọn (hoặc gõ) những trang không cần rồi lưu file mới không còn các trang đó */
import { h, baseName, sampleFiles } from "../core.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";

let field = null;
const offCount = (B) => B.pages.filter((p) => p.off).length;

pageTool({
  action: "Delete pages",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "off", rangeProp: "off",
  clickLabel: "Click to mark for deletion or keep",
  click(p) { p.off = !p.off; },
  tools: (B) => [h("button", { class: "btn ghost sm", type: "button", text: "Clear marks", onclick: () => { B.pages.forEach((p) => { p.off = false; }); B.changed(false); } })],
  options(el, ctx, B) {
    field = B.rangeField("off", "Pages to delete", "VD: 2, 5-7", "You can type page numbers instead of clicking.");
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Delete PDF pages" }),
      h("p", { class: "hint", html: "Click the pages you want to remove. Hold <kbd>Shift</kbd> and click to select a range." }), field.el));
  },
  onChange() { if (field) field.sync(); },
  summary(B) {
    const off = offCount(B);
    return off ? `Delete <b>${off}</b> ${(off) == 1 ? "page" : "pages"} · <b>${B.pages.length - off}</b> ${(B.pages.length - off) == 1 ? "page" : "pages"} left.` : "No pages selected for deletion.";
  },
  ready(B) {
    const off = offCount(B);
    if (!off) return "Click the pages to delete.";
    if (off === B.pages.length) return "You can't delete every page; keep at least one.";
    return true;
  },
  async run(B, o, ctx) {
    ctx.status("Creating the new file…"); ctx.progress(-1);
    const keep = B.pages.filter((p) => !p.off);
    const doc = await B.build(keep);
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(firstItem(B).name) + "-da-xoa-trang.pdf", note: keep.length + " trang" }];
  },
  doneTitle: () => "Pages deleted!"
});
