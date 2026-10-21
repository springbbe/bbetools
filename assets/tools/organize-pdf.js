/* Sắp xếp trang PDF: kéo thả / nút ← → đổi thứ tự, xoay, xoá, chèn trang trắng, thêm trang của file PDF khác */
import { h, icon, toast, baseName, sampleFiles } from "../core.js";
import { pageTool, firstItem, visDims } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";

let blankKey = 1e9;
const b = (ico, label, onclick, title) => h("button", { class: "btn ghost sm", type: "button", title: title || null, onclick }, h("span", { html: icon(ico), style: { display: "contents" } }), label);

pageTool({
  action: "Lưu PDF", multiple: true,
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  reorder: true, rotate: true, remove: true,
  tools: (B) => [
    b("arrow-left-right", "Đảo ngược", () => { B.pages.reverse(); B.changed(true); }, "Đảo ngược thứ tự trang"),
    b("file-plus", "Trang trắng", () => {
      const ref = B.pages[B.pages.length - 1];
      const [w, hh] = ref ? visDims(ref) : [595.28, 841.89];
      B.pages.push({ key: ++blankKey, blank: true, n: 0, rot: 0, w, h: hh });
      B.changed(true);
      toast("Đã thêm trang trắng ở cuối, dùng ← → hoặc kéo thả để đưa đến chỗ cần.");
    }, "Thêm một trang trắng ở cuối"),
    b("refresh-cw", "Đặt lại", () => {
      const order = B.ctx.items;
      B.pages = B.pages.filter((p) => !p.blank).sort((x, y) => order.indexOf(x.it) - order.indexOf(y.it) || x.n - y.n);
      B.pages.forEach((p) => { p.rot = 0; });
      B.changed(true);
    }, "Về thứ tự và chiều ban đầu (trang đã xoá không khôi phục)")
  ],
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Sắp xếp trang" }),
      h("p", { class: "hint", text: "Kéo thả trang (trên máy tính) hoặc dùng nút ← → dưới mỗi trang để đổi thứ tự. Nút ↺ ↻ để xoay, 🗑 để xoá trang." }),
      h("p", { class: "hint", text: "Bấm “Thêm PDF” để chèn trang của file khác vào; trang của mỗi file được đánh chữ A, B, C…" })));
  },
  summary(B) {
    const files = new Set(B.pages.filter((p) => !p.blank).map((p) => p.it)).size;
    const blanks = B.pages.filter((p) => p.blank).length;
    return `File mới sẽ có <b>${B.pages.length}</b> trang${files > 1 ? ` từ <b>${files}</b> file` : ""}${blanks ? ` (gồm ${blanks} trang trắng)` : ""}.`;
  },
  ready: (B) => (B.pages.some((p) => !p.blank) ? true : "Cần ít nhất một trang có nội dung."),
  async run(B, o, ctx) {
    ctx.status("Đang lưu file…"); ctx.progress(-1);
    const doc = await B.build(B.pages);
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(firstItem(B).name) + "-da-sap-xep.pdf", note: B.pages.length + " trang" }];
  },
  doneTitle: () => "Đã lưu thứ tự trang mới!"
});
