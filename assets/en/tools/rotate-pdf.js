/* Tự sinh bởi scripts/build.js từ assets/tools/rotate-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Xoay PDF: bấm vào trang để xoay 90°, hoặc xoay tất cả / chỉ trang ngang / chỉ trang dọc cùng lúc */
import { h, icon, baseName, sampleFiles } from "../core.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";

const turned = (B) => B.pages.filter((p) => p.rot).length;
const rotAll = (B, d, which) => {
  B.pages.forEach((p) => {
    const land = p.w > p.h;
    if (which === "land" && !land) return;
    if (which === "port" && land) return;
    p.rot = (p.rot + d + 360) % 360;
  });
  B.changed(true);
};
const big = (ico, label, onclick) => h("button", { class: "btn ghost", type: "button", onclick }, h("span", { html: icon(ico), style: { display: "contents" } }), label);

pageTool({
  action: "Xoay PDF",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  rotate: true,
  clickLabel: "Click to rotate right 90°",
  click(p) { p.rot = (p.rot + 90) % 360; },
  tools: (B) => [h("button", { class: "btn ghost sm", type: "button", text: "Reset", onclick: () => { B.pages.forEach((p) => { p.rot = 0; }); B.changed(true); } })],
  options(el, ctx, B) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Rotate all pages" }),
      h("div", { class: "row" }, big("rotate-ccw", "Rotate left", () => rotAll(B, -90)), big("rotate-cw", "Rotate right", () => rotAll(B, 90))),
      h("p", { class: "hint", html: "Or click a page to rotate it 90°; use the ↺ ↻ buttons on a page to rotate left/right." })),
    h("div", { class: "opt-group", id: "g-mixed", hidden: true }, h("p", { class: "opt-title", text: "The file has both landscape and portrait pages" }),
      h("div", { class: "row" }, h("button", { class: "btn ghost sm", type: "button", text: "Rotate landscape pages ↻", onclick: () => rotAll(B, 90, "land") }),
        h("button", { class: "btn ghost sm", type: "button", text: "Rotate portrait pages ↻", onclick: () => rotAll(B, 90, "port") }))));
  },
  onChange(B, ctx) {
    const g = ctx.optsEl.querySelector("#g-mixed");
    if (g) g.hidden = !(B.pages.some((p) => p.w > p.h) && B.pages.some((p) => p.w <= p.h));
  },
  summary: (B) => (turned(B) ? `Rotated <b>${turned(B)}</b>/${B.pages.length} pages.` : "No pages rotated yet."),
  ready: (B) => (turned(B) ? true : "Click the pages to rotate, or rotate all."),
  async run(B, o, ctx) {
    ctx.status("Saving file…"); ctx.progress(-1);
    const doc = await B.build(B.pages);
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(firstItem(B).name) + "-da-xoay.pdf", note: B.pages.length + " trang" }];
  },
  doneTitle: () => "PDF rotated!"
});
