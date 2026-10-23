/* Tự sinh bởi scripts/build.js từ assets/tools/extract-images-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Trích ảnh trong PDF: lấy ảnh JPEG nguyên bản (không nén lại), ảnh khác xuất PNG giữ nền trong suốt; bỏ qua ảnh trùng và ảnh quá nhỏ */
import { h, lib, baseName, sampleFiles, nextFrame, fmtNum } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, LOCKED_MSG } from "../pdf.js";
import { walk, filters, imagePixels } from "../pdf-objects.js";

const toPng = (px) => {
  const c = document.createElement("canvas"); c.width = px.width; c.height = px.height;
  c.getContext("2d").putImageData(new ImageData(px.rgba, px.width, px.height), 0, 0);
  return new Promise((res) => c.toBlob(res, "image/png"));
};

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Extract images",
  sample: () => sampleFiles("tai-lieu-co-anh.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => openItem(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx),
  options(el) {
    const min = h("select", { class: "select", id: "min" }, [["0", "Get all"], ["50", "Skip images smaller than 50 px"], ["150", "Skip images smaller than 150 px (icons, lines)"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === "50" })));
    el.append(h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Minimum size" }), min)),
      h("p", { class: "hint", text: "JPEG images are extracted as is, without recompression. Other images are saved as PNG, keeping transparency. Images reused many times are extracted once." }),
      h("p", { class: "hint", text: "Text and vector drawings aren't images, so they're not extracted; to capture whole pages use PDF to Image." }));
    return () => ({ min: +min.value });
  },
  ready: (items) => (items.some((i) => i.locked) ? LOCKED_MSG : true),
  async run(items, o, ctx) {
    const L = await lib("pdflib");
    const outs = [];
    let skipped = 0, small = 0;
    for (let f = 0; f < items.length; f++) {
      const it = items[f], doc = await libDoc(it.bytes, it.password), base = baseName(it.name);
      const imgs = [];
      walk(L, doc, (x) => { if (x.kind === "image") imgs.push(x); });
      const perPage = {};
      for (let i = 0; i < imgs.length; i++) {
        ctx.check();
        ctx.status(`Extracting image ${i + 1}/${imgs.length}${items.length > 1 ? " of " + it.name : ""}…`);
        const { stream, index } = imgs[i], d = stream.dict;
        const w = d.lookup(L.PDFName.of("Width")).asNumber(), hh = d.lookup(L.PDFName.of("Height")).asNumber();
        if (Math.min(w, hh) < o.min) { small++; continue; }
        const fl = filters(L, d), n = (perPage[index] = (perPage[index] || 0) + 1);
        const name = `${base}-page-${index + 1}-image-${n}`;
        let blob = null, ext = "png";
        if (fl.length === 1 && fl[0] === "DCTDecode" && stream instanceof L.PDFRawStream) { blob = new Blob([stream.contents], { type: "image/jpeg" }); ext = "jpg"; }
        else if (fl.length === 1 && fl[0] === "JPXDecode" && stream instanceof L.PDFRawStream) { blob = new Blob([stream.contents], { type: "image/jp2" }); ext = "jp2"; }
        else {
          const px = imagePixels(L, doc.context, stream);
          if (px) blob = await toPng(px);
        }
        if (!blob) { skipped++; continue; }
        outs.push({ blob, name: `${name}.${ext}`, note: `${fmtNum(w)}×${fmtNum(hh)} px · page ${index + 1}` });
        ctx.progress((f + (i + 1) / imgs.length) / items.length);
        if (i % 4 === 3) await nextFrame();
      }
    }
    if (!outs.length) {
      ctx.status(small ? `No images large enough (skipped ${small} small ${(small) == 1 ? "image" : "images"}). Choose “Get all” to include small images.` : "No images found in the file: the content may be all text and vector drawings.", "err");
      return null;
    }
    outs.info = { skipped, small };
    return outs;
  },
  zipName: "pdf-images",
  doneTitle: (outs) => `Extracted ${outs.length} ${(outs.length) == 1 ? "image" : "images"}!`,
  summary: (outs) => [outs.info.small ? `Skipped ${outs.info.small} small ${(outs.info.small) == 1 ? "image" : "images"}.` : "", outs.info.skipped ? `${outs.info.skipped} ${(outs.info.skipped) == 1 ? "image uses" : "images use"} special formats (CCITT, JBIG2…) that can't be extracted yet.` : ""].filter(Boolean).join(" ") || null
});
