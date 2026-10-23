/* Tự sinh bởi scripts/build.js từ assets/tools/crop-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Cắt lề PDF: tự tìm và bỏ lề trắng, hoặc nhập lề cần cắt (mm); xem trước vùng bị cắt ngay trên các trang.
   Đặt lại CropBox/MediaBox của trang: nội dung không bị xoá, chỉ phần nằm ngoài khung bị ẩn. */
import { h, lib, baseName, sampleFiles, nextFrame } from "../core.js";
import { seg, radioVal } from "../frames/file.js";
import { pageTool, firstItem, visDims } from "../pdf-pages.js";
import { libDoc, pdfBlob, renderPage } from "../pdf.js";
import { MM, geom, cropBoxFor, inkBounds, autoMargins } from "../lib/pdf-geom.js";

const SIDES = [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"]];
let get = null, board = null, scanning = false, scanned = 0;

// tìm vùng có nội dung của từng trang (vẽ nhỏ rồi dò điểm khác trắng)
async function scan(B) {
  if (scanning) return;
  scanning = true;
  const todo = B.pages.filter((p) => !p.blank && !p.ink);
  scanned = B.pages.length - todo.length;
  for (const p of todo) {
    try {
      const c = await renderPage(p.it.doc, p.n, { width: 320, rotation: p.rot });
      const g = c.getContext("2d", { willReadFrequently: true });
      const b = inkBounds(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
      p.ink = { b, px: c.width, py: c.height, k: c.width / visDims(p)[0] };
      c.width = c.height = 0;
    } catch (_) { p.ink = { b: null, px: 1, py: 1, k: 1 }; }
    scanned++;
    if (scanned % 3 === 0 || scanned === B.pages.length) { B.redecorate(); B.ctx.refresh(); await nextFrame(); }
  }
  scanning = false;
  B.redecorate(); B.ctx.refresh();
}

// lề (pt, theo chiều nhìn thấy) của trang p
function marginsOf(p, o, B) {
  if (o.mode === "manual") return Object.fromEntries(SIDES.map(([k]) => [k, o[k] * MM]));
  const one = (q) => (q.ink ? autoMargins(q.ink.b, q.ink.px, q.ink.py, q.ink.k, o.pad * MM) : { top: 0, right: 0, bottom: 0, left: 0 });
  if (!o.same) return one(p);
  // cắt đều: lấy lề nhỏ nhất của mọi trang cùng khổ để các trang giữ cùng kích thước
  const [w, hh] = visDims(p), same = B.pages.filter((q) => !q.blank && Math.abs(visDims(q)[0] - w) < 2 && Math.abs(visDims(q)[1] - hh) < 2 && q.ink && q.ink.b);
  if (!same.length) return one(p);
  const ms = same.map(one);
  return Object.fromEntries(SIDES.map(([k]) => [k, Math.min(...ms.map((m) => m[k]))]));
}

pageTool({
  action: "Crop margins",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  decorate(sheet, p, idx, B) {
    if (!get) return;
    const o = get(), m = marginsOf(p, o, B), [vw, vh] = visDims(p);
    const pct = (v, d) => Math.min(100, (v / d) * 100) + "%";
    const box = h("div", { class: "deco crop-keep", style: { left: pct(m.left, vw), right: pct(m.right, vw), top: pct(m.top, vh), bottom: pct(m.bottom, vh) } });
    sheet.append(box);
  },
  options(el, ctx, B) {
    board = B;
    const num = (id, label) => h("label", { class: "field" }, h("span", { text: label }), h("input", { class: "input", id, type: "number", min: 0, max: 200, step: 1, value: 10, inputmode: "decimal" }));
    const pad = h("input", { class: "input", id: "pad", type: "number", min: 0, max: 50, step: 1, value: 4, inputmode: "decimal" });
    const same = h("input", { type: "checkbox", id: "same", checked: true });
    el.append(
      seg("mode", [["auto", "Auto-remove white margins"], ["manual", "Enter margins (mm)"]], "auto", "Crop method"),
      h("div", { class: "opt-group", id: "g-auto" },
        h("label", { class: "field" }, h("span", { text: "Padding around content (mm)" }), pad),
        h("label", { class: "switch" }, same, h("span", null, "Crop all pages evenly", h("small", { text: "Keeps the same size for pages of the same format; good for books and scanned documents." })))),
      h("div", { class: "opt-group", id: "g-manual", hidden: true }, h("div", { class: "crop-grid" }, SIDES.map(([k, l]) => num("m-" + k, l)))),
      h("p", { class: "hint", text: "The blue frame on the page is the part that's kept. Content outside the frame is only hidden, not deleted from the file." }));
    get = () => ({ mode: radioVal(el, "mode"), pad: Math.max(0, +pad.value || 0), same: same.checked, ...Object.fromEntries(SIDES.map(([k]) => [k, Math.max(0, +el.querySelector("#m-" + k).value || 0)])) });
    return get;
  },
  onChange(B, ctx) {
    const o = get(), e = ctx.optsEl;
    e.querySelector("#g-auto").hidden = o.mode !== "auto";
    e.querySelector("#g-manual").hidden = o.mode !== "manual";
    if (o.mode === "auto" && B.pages.some((p) => !p.blank && !p.ink)) scan(B);
    B.redecorate();
  },
  summary(B, o) {
    if (o.mode === "auto" && scanning) return `Finding white margins… ${scanned}/${B.pages.length} pages`;
    const bad = B.pages.filter((p) => { const m = marginsOf(p, o, B), [w, hh] = visDims(p); return m.left + m.right >= w - 1 || m.top + m.bottom >= hh - 1; }).length;
    if (bad) return `Margins too large: ${bad} ${(bad) == 1 ? "page" : "pages"} would be cropped away entirely. Reduce the margins.`;
    const p = B.pages[0], m = marginsOf(p, o, B), [w, hh] = visDims(p);
    return `Page 1 becomes <b>${Math.round((w - m.left - m.right) / MM)} × ${Math.round((hh - m.top - m.bottom) / MM)} mm</b> (originally ${Math.round(w / MM)} × ${Math.round(hh / MM)} mm).`;
  },
  ready(B, o) {
    if (o.mode === "auto" && scanning) return "Finding white margins…";
    if (B.pages.some((p) => { const m = marginsOf(p, o, B), [w, hh] = visDims(p); return m.left + m.right >= w - 1 || m.top + m.bottom >= hh - 1; })) return "The margins are too large for the page.";
    if (B.pages.every((p) => { const m = marginsOf(p, o, B); return m.top + m.bottom + m.left + m.right < 0.5; })) return o.mode === "auto" ? "No white margins found to crop." : "Enter the margins to crop.";
    return true;
  },
  async run(B, o, ctx) {
    ctx.status("Cropping margins…"); ctx.progress(-1);
    const it = firstItem(B), doc = await libDoc(it.bytes, it.password);
    const pages = doc.getPages();
    B.pages.forEach((p) => {
      const page = pages[p.n - 1], g = geom(page.getCropBox(), page.getRotation().angle), r = cropBoxFor(g, marginsOf(p, o, B));
      if (!r) return;
      page.setMediaBox(r.x, r.y, r.width, r.height);
      page.setCropBox(r.x, r.y, r.width, r.height);
      for (const k of ["TrimBox", "BleedBox", "ArtBox"]) page.node.delete(page.node.context.obj(k));
    });
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + "-cropped.pdf", note: pages.length + " pages" }];
  },
  doneTitle: () => "PDF margins cropped!"
});

const css = document.createElement("style");
css.textContent = ".crop-keep{position:absolute;box-shadow:0 0 0 999px rgba(15,18,28,.45);outline:2px solid #12A594;z-index:1}.crop-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}";
document.head.append(css);
