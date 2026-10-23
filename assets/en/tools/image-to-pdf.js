/* Tự sinh bởi scripts/build.js từ assets/tools/image-to-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Ảnh sang PDF: ghép ảnh (JPG, PNG, HEIC, ảnh chụp màn hình…) thành một PDF hoặc mỗi ảnh một PDF;
   chọn khổ giấy, hướng trang, lề, chất lượng; sắp thứ tự và xoay từng ảnh */
import { h, icon, lib, baseName, sampleFiles, nextFrame } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage } from "../image.js";
import { pdfBlob } from "../pdf.js";
import { MM, imagePageSize, fitBox } from "../lib/pdf-geom.js";

const QUALITY = { low: { max: 1240, q: 0.62 }, mid: { max: 1754, q: 0.8 }, high: { max: 2480, q: 0.92 } };
const rotDims = (it) => (it.rot % 180 ? [it.bmp.height, it.bmp.width] : [it.bmp.width, it.bmp.height]);

// vẽ ảnh đã xoay vào canvas, cạnh dài tối đa maxSide px, nền trắng (ảnh PNG trong suốt)
function drawRotated(it, maxSide) {
  const [rw, rh] = rotDims(it);
  const s = Math.min(1, maxSide / Math.max(rw, rh));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(rw * s)); c.height = Math.max(1, Math.round(rh * s));
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2); g.rotate((it.rot * Math.PI) / 180);
  g.imageSmoothingQuality = "high";
  g.drawImage(it.bmp, (-it.bmp.width * s) / 2, (-it.bmp.height * s) / 2, it.bmp.width * s, it.bmp.height * s);
  return c;
}
const jpegBytes = (c, q) => new Promise((res, rej) => c.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error("Image too large"))), "image/jpeg", q));
const thumb = (it) => { it.thumb = drawRotated(it, 160).toDataURL("image/jpeg", 0.8); };

async function pdfFor(list, o, ctx, step) {
  const L = await lib("pdflib");
  const Q = QUALITY[o.quality];
  const doc = await L.PDFDocument.create();
  doc.setProducer("BbeTools"); doc.setCreator("BbeTools – Image to PDF");
  for (const it of list) {
    ctx.check();
    const [iw, ih] = rotDims(it);
    const [pw, ph] = imagePageSize(iw, ih, o).map((v) => v * MM);
    const page = doc.addPage([pw, ph]);
    const c = drawRotated(it, Q.max);
    const img = await doc.embedJpg(await jpegBytes(c, Q.q));
    const b = fitBox(pw, ph, o.margin * MM, c.width, c.height);
    page.drawImage(img, { x: b.x, y: b.y, width: b.w, height: b.h });
    c.width = c.height = 0;
    await step();
  }
  return pdfBlob(await doc.save({ useObjectStreams: true }));
}

fileTool({
  accept: ["image", "heic"], multiple: true, reorder: true, noun: "images",
  action: "Convert to PDF",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png", "ma-qr-mau.png"),
  warm: () => lib("pdflib"),
  async load(it) {
    it.bmp = await decodeImage(it.file);
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    thumb(it);
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  itemActions: (it, ctx) => it.bmp ? h("button", { class: "ib sm", type: "button", title: "Rotate 90°", "aria-label": "Rotate " + it.name, html: icon("rotate-cw"),
    onclick: () => { it.rot = (it.rot + 90) % 360; thumb(it); it.info = `${it.bmp.width}×${it.bmp.height}` + (it.rot ? ` · rotated ${it.rot}°` : ""); ctx.render(); } }) : null,
  options(el, ctx) {
    const size = h("select", { class: "select", id: "size" },
      [["a4", "A4 (210 × 297 mm)"], ["a5", "A5 (148 × 210 mm)"], ["letter", "US Letter (216 × 279 mm)"], ["fit", "Fit to image"]].map(([v, l]) => h("option", { value: v, text: l })));
    const merge = h("input", { type: "checkbox", id: "merge", checked: true });
    el.append(
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Paper size" }), size)),
      h("div", { id: "orient-g" }, seg("orient", [["p", "Portrait"], ["l", "Landscape"], ["auto", "Match image"]], "auto", "Orientation")),
      seg("margin", [["0", "No margin"], ["10", "Small margin"], ["20", "Large margin"]], "0", "Margin"),
      seg("quality", [["low", "Light"], ["mid", "Medium"], ["high", "Sharp"]], "mid", "Image quality"),
      h("p", { class: "hint", id: "q-hint" }),
      h("label", { class: "switch" }, merge, h("span", null, "Combine all images into one PDF", h("small", { text: "Turn off to make a separate PDF for each image." }))),
      h("p", { class: "hint", text: "Tip: drag and drop or use ↑↓ to order the pages; click ↻ to rotate an upside-down image." }),
      h("button", { class: "btn ghost sm", type: "button", onclick: () => { ctx.state.items.sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true })); ctx.render(); } },
        h("span", { html: icon("list-ordered"), style: { display: "contents" } }), "Sort by file name"));
    const hints = { low: "Small file, good for messaging apps and email.", mid: "Recommended: sharp, moderate size.", high: "Sharpest, good for printing; larger file." };
    const upd = () => {
      el.querySelector("#q-hint").textContent = hints[radioVal(el, "quality")];
      el.querySelector("#orient-g").hidden = size.value === "fit";
    };
    el.addEventListener("change", upd); upd();
    return () => ({ size: size.value, orient: radioVal(el, "orient"), margin: +radioVal(el, "margin"), quality: radioVal(el, "quality"), merge: merge.checked });
  },
  async run(items, o, ctx) {
    let done = 0;
    const step = async () => { done++; ctx.progress(done / items.length); ctx.status(`Processing image ${Math.min(done + 1, items.length)}/${items.length}…`); await nextFrame(); };
    ctx.status(`Processing image 1/${items.length}…`);
    if (o.merge || items.length === 1) {
      const blob = await pdfFor(items, o, ctx, step);
      return [{ blob, name: items.length === 1 ? baseName(items[0].name) + ".pdf" : `anh-ghep-${items.length}-trang.pdf`, note: items.length + " trang" }];
    }
    const outs = [];
    for (const it of items) outs.push({ blob: await pdfFor([it], o, ctx, step), name: baseName(it.name) + ".pdf", note: "1 page" });
    return outs;
  },
  zipName: "images-to-pdf",
  doneTitle: (outs, items) => (outs.length > 1 ? `Converted ${items.length} images into ${outs.length} PDF ${(outs.length) == 1 ? "file" : "files"}!` : "The image has been converted to PDF!")
});
