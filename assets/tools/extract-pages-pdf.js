/* Trích xuất trang PDF: bấm chọn (hoặc gõ) các trang cần lấy, lưu thành một PDF mới hoặc mỗi trang một file */
import { h, baseName, sampleFiles, nextFrame } from "../core.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";
import { rangeSlug } from "../lib/page-ranges.js";

let field = null, sep = null;
const picked = (B) => B.pages.flatMap((p, i) => (p.sel ? [i + 1] : []));

pageTool({
  action: "Trích xuất trang",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "sel", rangeProp: "sel",
  clickLabel: "Bấm để chọn hoặc bỏ chọn trang",
  click(p) { p.sel = !p.sel; },
  tools: (B) => [
    h("button", { class: "btn ghost sm", type: "button", text: "Chọn hết", onclick: () => { B.pages.forEach((p) => { p.sel = true; }); B.changed(false); } }),
    h("button", { class: "btn ghost sm", type: "button", text: "Bỏ chọn", onclick: () => { B.pages.forEach((p) => { p.sel = false; }); B.changed(false); } })],
  options(el, ctx, B) {
    field = B.rangeField("sel", "Trang cần lấy", "VD: 1, 3-5", "Gõ số trang hoặc bấm chọn trên các trang.");
    sep = h("input", { type: "checkbox", id: "separate" });
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Trích xuất trang" }),
      h("p", { class: "hint", html: "Bấm vào những trang muốn lấy. Giữ <kbd>Shift</kbd> rồi bấm để chọn cả dãy." }), field.el),
      h("label", { class: "switch" }, sep, h("span", null, "Mỗi trang thành một file riêng", h("small", { text: "Tải từng file hoặc cả .zip." }))));
    return () => ({ separate: sep.checked });
  },
  onChange() { if (field) field.sync(); },
  summary(B, o) {
    const n = picked(B).length;
    return n ? `Lấy <b>${n}</b>/${B.pages.length} trang thành <b>${o.separate ? n : 1}</b> file PDF.` : "Chưa chọn trang nào.";
  },
  ready: (B) => (picked(B).length ? true : "Bấm chọn ít nhất một trang."),
  async run(B, o, ctx) {
    const nums = picked(B), base = baseName(firstItem(B).name);
    const groups = o.separate ? nums.map((n) => [n]) : [nums];
    const outs = [];
    for (let i = 0; i < groups.length; i++) {
      ctx.check();
      ctx.status(`Đang tạo file ${i + 1}/${groups.length}…`);
      const doc = await B.build(groups[i].map((n) => B.pages[n - 1]));
      outs.push({ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: `${base}-trang-${rangeSlug(groups[i])}.pdf`, note: groups[i].length + " trang" });
      ctx.progress((i + 1) / groups.length);
      await nextFrame();
    }
    return outs;
  },
  zipName: "trang-da-trich",
  doneTitle: (outs) => (outs.length > 1 ? `Đã trích ${outs.length} trang thành ${outs.length} file!` : "Đã trích xuất trang!")
});
