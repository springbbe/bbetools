/* Xoá trang PDF: bấm chọn (hoặc gõ) những trang không cần rồi lưu file mới không còn các trang đó */
import { h, baseName, sampleFiles } from "../core.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";

let field = null;
const offCount = (B) => B.pages.filter((p) => p.off).length;

pageTool({
  action: "Xoá trang",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "off", rangeProp: "off",
  clickLabel: "Bấm để đánh dấu xoá hoặc giữ lại",
  click(p) { p.off = !p.off; },
  tools: (B) => [h("button", { class: "btn ghost sm", type: "button", text: "Bỏ đánh dấu", onclick: () => { B.pages.forEach((p) => { p.off = false; }); B.changed(false); } })],
  options(el, ctx, B) {
    field = B.rangeField("off", "Trang sẽ xoá", "VD: 2, 5-7", "Có thể gõ số trang thay vì bấm chọn.");
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Xoá trang PDF" }),
      h("p", { class: "hint", html: "Bấm vào những trang muốn bỏ đi. Giữ <kbd>Shift</kbd> rồi bấm để chọn cả dãy." }), field.el));
  },
  onChange() { if (field) field.sync(); },
  summary(B) {
    const off = offCount(B);
    return off ? `Xoá <b>${off}</b> trang · còn lại <b>${B.pages.length - off}</b> trang.` : "Chưa chọn trang nào để xoá.";
  },
  ready(B) {
    const off = offCount(B);
    if (!off) return "Bấm vào trang cần xoá.";
    if (off === B.pages.length) return "Không thể xoá hết mọi trang, hãy giữ lại ít nhất một trang.";
    return true;
  },
  async run(B, o, ctx) {
    ctx.status("Đang tạo file mới…"); ctx.progress(-1);
    const keep = B.pages.filter((p) => !p.off);
    const doc = await B.build(keep);
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(firstItem(B).name) + "-da-xoa-trang.pdf", note: keep.length + " trang" }];
  },
  doneTitle: () => "Đã xoá trang!"
});
