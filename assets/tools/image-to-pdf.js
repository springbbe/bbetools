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
const jpegBytes = (c, q) => new Promise((res, rej) => c.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : rej(new Error("Ảnh quá lớn"))), "image/jpeg", q));
const thumb = (it) => { it.thumb = drawRotated(it, 160).toDataURL("image/jpeg", 0.8); };

async function pdfFor(list, o, ctx, step) {
  const L = await lib("pdflib");
  const Q = QUALITY[o.quality];
  const doc = await L.PDFDocument.create();
  doc.setProducer("BbeTools"); doc.setCreator("BbeTools – Ảnh sang PDF");
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
  accept: ["image", "heic"], multiple: true, reorder: true, noun: "ảnh",
  action: "Chuyển sang PDF",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png", "ma-qr-mau.png"),
  warm: () => lib("pdflib"),
  async load(it) {
    it.bmp = await decodeImage(it.file);
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    thumb(it);
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  itemActions: (it, ctx) => it.bmp ? h("button", { class: "ib sm", type: "button", title: "Xoay 90°", "aria-label": "Xoay " + it.name, html: icon("rotate-cw"),
    onclick: () => { it.rot = (it.rot + 90) % 360; thumb(it); it.info = `${it.bmp.width}×${it.bmp.height}` + (it.rot ? ` · xoay ${it.rot}°` : ""); ctx.render(); } }) : null,
  options(el, ctx) {
    const size = h("select", { class: "select", id: "size" },
      [["a4", "A4 (210 × 297 mm)"], ["a5", "A5 (148 × 210 mm)"], ["letter", "US Letter (216 × 279 mm)"], ["fit", "Vừa khít ảnh"]].map(([v, l]) => h("option", { value: v, text: l })));
    const merge = h("input", { type: "checkbox", id: "merge", checked: true });
    el.append(
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Khổ giấy" }), size)),
      h("div", { id: "orient-g" }, seg("orient", [["p", "Dọc"], ["l", "Ngang"], ["auto", "Theo ảnh"]], "auto", "Hướng trang")),
      seg("margin", [["0", "Không lề"], ["10", "Lề nhỏ"], ["20", "Lề lớn"]], "0", "Lề"),
      seg("quality", [["low", "Nhẹ"], ["mid", "Vừa"], ["high", "Nét"]], "mid", "Chất lượng ảnh"),
      h("p", { class: "hint", id: "q-hint" }),
      h("label", { class: "switch" }, merge, h("span", null, "Gộp tất cả ảnh vào một PDF", h("small", { text: "Tắt để mỗi ảnh thành một file PDF riêng." }))),
      h("p", { class: "hint", text: "Mẹo: kéo thả hoặc dùng ↑↓ để sắp thứ tự trang; bấm ↻ để xoay ảnh bị ngược." }),
      h("button", { class: "btn ghost sm", type: "button", onclick: () => { ctx.state.items.sort((a, b) => a.name.localeCompare(b.name, "vi", { numeric: true })); ctx.render(); } },
        h("span", { html: icon("list-ordered"), style: { display: "contents" } }), "Sắp xếp theo tên file"));
    const hints = { low: "File nhỏ, hợp gửi Zalo, email.", mid: "Khuyên dùng: rõ nét, dung lượng vừa phải.", high: "Nét nhất, hợp để in; file nặng hơn." };
    const upd = () => {
      el.querySelector("#q-hint").textContent = hints[radioVal(el, "quality")];
      el.querySelector("#orient-g").hidden = size.value === "fit";
    };
    el.addEventListener("change", upd); upd();
    return () => ({ size: size.value, orient: radioVal(el, "orient"), margin: +radioVal(el, "margin"), quality: radioVal(el, "quality"), merge: merge.checked });
  },
  async run(items, o, ctx) {
    let done = 0;
    const step = async () => { done++; ctx.progress(done / items.length); ctx.status(`Đang xử lý ảnh ${Math.min(done + 1, items.length)}/${items.length}…`); await nextFrame(); };
    ctx.status(`Đang xử lý ảnh 1/${items.length}…`);
    if (o.merge || items.length === 1) {
      const blob = await pdfFor(items, o, ctx, step);
      return [{ blob, name: items.length === 1 ? baseName(items[0].name) + ".pdf" : `anh-ghep-${items.length}-trang.pdf`, note: items.length + " trang" }];
    }
    const outs = [];
    for (const it of items) outs.push({ blob: await pdfFor([it], o, ctx, step), name: baseName(it.name) + ".pdf", note: "1 trang" });
    return outs;
  },
  zipName: "anh-sang-pdf",
  doneTitle: (outs, items) => (outs.length > 1 ? `Đã chuyển ${items.length} ảnh thành ${outs.length} file PDF!` : "Ảnh đã được chuyển sang PDF!")
});
