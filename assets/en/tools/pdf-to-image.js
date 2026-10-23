/* Tự sinh bởi scripts/build.js từ assets/tools/pdf-to-image.js và i18n/en/js/ — đừng sửa tay. */
/* PDF sang ảnh: vẽ các trang đã chọn thành ảnh JPG hoặc PNG ở độ nét tuỳ chọn (DPI) */
import { h, baseName, sampleFiles, copyImage, nextFrame, fmtNum } from "../core.js";
import { seg, radioVal } from "../frames/file.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { renderPage } from "../pdf.js";
import { setJpegDpi } from "../image.js";

const MAX_PIXELS = 40e6; // giới hạn mỗi ảnh để điện thoại không hết bộ nhớ
const DPIS = [["96", "96"], ["150", "150"], ["220", "220"], ["300", "300"]];
const DPI_HINT = { 96: "Light, for phones and messaging apps.", 150: "Recommended: sharp on a computer screen.", 220: "High detail, small text stays clear when zoomed.", 300: "Print quality, fairly large files." };
let field = null;
const selCount = (B) => B.pages.filter((p) => p.sel).length;
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't create the image; the page may be too large."))), type, q));

pageTool({
  action: "Convert to images",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "sel", rangeProp: "sel", rotate: true,
  clickLabel: "Click to select or deselect a page",
  initPage(p) { p.sel = true; },
  click(p) { p.sel = !p.sel; },
  tools: (B) => [
    h("button", { class: "btn ghost sm", type: "button", text: "Select all", onclick: () => { B.pages.forEach((p) => { p.sel = true; }); B.changed(false); } }),
    h("button", { class: "btn ghost sm", type: "button", text: "Deselect", onclick: () => { B.pages.forEach((p) => { p.sel = false; }); B.changed(false); } })],
  options(el, ctx, B) {
    field = B.rangeField("sel", "Pages to convert", "VD: 1-3, 5", "All pages by default. Click a page to deselect or reselect it.");
    el.append(
      seg("fmt", [["jpg", "JPG"], ["png", "PNG"]], "jpg", "Image format"),
      h("p", { class: "hint", id: "fmt-hint" }),
      seg("dpi", DPIS, "150", "Resolution (DPI)"),
      h("p", { class: "hint", id: "dpi-hint" }),
      h("div", { class: "opt-group" }, field.el));
    return () => ({ fmt: radioVal(el, "fmt"), dpi: +radioVal(el, "dpi") });
  },
  onChange(B, ctx) {
    const o = ctx.opts, el = ctx.optsEl;
    el.querySelector("#fmt-hint").textContent = o.fmt === "png" ? "Sharpest, text isn't blurred, larger files." : "Light, good for sharing and viewing.";
    el.querySelector("#dpi-hint").textContent = DPI_HINT[o.dpi];
    if (field) field.sync();
  },
  summary(B, o) {
    const n = selCount(B);
    if (!n) return "No pages selected.";
    const p = B.pages.find((x) => x.sel), k = o.dpi / 72;
    const [w, hh] = p.rot % 180 ? [p.h, p.w] : [p.w, p.h];
    return `Will create <b>${n}</b> ${o.fmt.toUpperCase()} ${(n) == 1 ? "image" : "images"}${n > 1 ? " (download each image or a .zip)" : ""}. First page: ${fmtNum(Math.round(w * k))}×${fmtNum(Math.round(hh * k))} px.`;
  },
  ready: (B) => (selCount(B) ? true : "Select at least one page."),
  async run(B, o, ctx) {
    const mime = o.fmt === "png" ? "image/png" : "image/jpeg";
    const list = B.pages.map((p, i) => [p, i + 1]).filter(([p]) => p.sel);
    const base = baseName(firstItem(B).name), outs = [];
    let capped = false;
    for (let i = 0; i < list.length; i++) {
      ctx.check();
      const [p] = list[i];
      ctx.status(`Converting page ${p.n} (${i + 1}/${list.length})…`);
      const c = await renderPage(p.it.doc, p.n, { scale: o.dpi / 72, maxPixels: MAX_PIXELS, rotation: p.rot });
      const dpi = Math.round(72 * c.width / (p.rot % 180 ? p.h : p.w));
      if (dpi < o.dpi - 1) capped = true;
      let blob = await toBlob(c, mime, 0.9);
      if (mime === "image/jpeg") blob = await setJpegDpi(blob, dpi);
      outs.push({ blob, name: `${base}-page-${p.n}.${o.fmt}`, note: `${fmtNum(c.width)}×${fmtNum(c.height)} px`, actions: [{ icon: "copy", label: "Copy image", run: (out) => copyImage(out.blob) }] });
      c.width = c.height = 0;
      ctx.progress((i + 1) / list.length);
      await nextFrame();
    }
    if (capped) outs[0].capped = true;
    return outs;
  },
  zipName: "pdf-to-image",
  doneTitle: (outs) => (outs.length > 1 ? `Converted ${outs.length} pages to images!` : "Converted to image!"),
  resultSummary: (outs) => (outs[0] && outs[0].capped ? "Some pages are very large, so the image resolution was reduced to avoid running out of memory." : null)
});
