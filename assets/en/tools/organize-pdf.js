/* Tự sinh bởi scripts/build.js từ assets/tools/organize-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Sắp xếp trang PDF: kéo thả / nút ← → đổi thứ tự, xoay, xoá, chèn trang trắng, thêm trang của file PDF khác */
import { h, icon, toast, baseName, sampleFiles } from "../core.js";
import { pageTool, firstItem, visDims } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";

let blankKey = 1e9;
const b = (ico, label, onclick, title) => h("button", { class: "btn ghost sm", type: "button", title: title || null, onclick }, h("span", { html: icon(ico), style: { display: "contents" } }), label);

pageTool({
  action: "Save PDF", multiple: true,
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  reorder: true, rotate: true, remove: true,
  tools: (B) => [
    b("arrow-left-right", "Reverse", () => { B.pages.reverse(); B.changed(true); }, "Reverse page order"),
    b("file-plus", "Blank page", () => {
      const ref = B.pages[B.pages.length - 1];
      const [w, hh] = ref ? visDims(ref) : [595.28, 841.89];
      B.pages.push({ key: ++blankKey, blank: true, n: 0, rot: 0, w, h: hh });
      B.changed(true);
      toast("Added a blank page at the end; use ← → or drag and drop to move it where you need.");
    }, "Add a blank page at the end"),
    b("refresh-cw", "Reset", () => {
      const order = B.ctx.items;
      B.pages = B.pages.filter((p) => !p.blank).sort((x, y) => order.indexOf(x.it) - order.indexOf(y.it) || x.n - y.n);
      B.pages.forEach((p) => { p.rot = 0; });
      B.changed(true);
    }, "Back to the original order and orientation (deleted pages aren't restored)")
  ],
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Organize pages" }),
      h("p", { class: "hint", text: "Drag and drop pages (on a computer) or use the ← → buttons under each page to reorder. ↺ ↻ rotate, 🗑 deletes a page." }),
      h("p", { class: "hint", text: "Click “Add PDF” to insert pages from another file; each file's pages are labeled A, B, C…" })));
  },
  summary(B) {
    const files = new Set(B.pages.filter((p) => !p.blank).map((p) => p.it)).size;
    const blanks = B.pages.filter((p) => p.blank).length;
    return `The new file will have <b>${B.pages.length}</b> ${(B.pages.length) == 1 ? "page" : "pages"}${files > 1 ? ` from <b>${files}</b> files` : ""}${blanks ? ` (including ${blanks} blank ${(blanks) == 1 ? "page" : "pages"})` : ""}.`;
  },
  ready: (B) => (B.pages.some((p) => !p.blank) ? true : "At least one page with content is needed."),
  async run(B, o, ctx) {
    ctx.status("Saving file…"); ctx.progress(-1);
    const doc = await B.build(B.pages);
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(firstItem(B).name) + "-da-sap-xep.pdf", note: B.pages.length + " trang" }];
  },
  doneTitle: () => "New page order saved!"
});
