/* Chèn watermark PDF: chữ (tiếng Việt có dấu, vẽ thành ảnh nét) hoặc logo, chỉnh độ đậm, góc xoay, vị trí, lặp kín trang;
   xem trước ngay trên các trang */
import { h, icon, lib, toast, baseName, sampleFiles, nextFrame } from "../core.js";
import { seg, radioVal } from "../frames/file.js";
import { pageTool, firstItem, visDims, posGrid, colorPick } from "../pdf-pages.js";
import { libDoc, pdfBlob } from "../pdf.js";
import { decodeImage } from "../image.js";
import { geom, place, markLayout } from "../lib/pdf-geom.js";
import { parseRanges } from "../lib/page-ranges.js";

const GRID = [["tl", "Trên trái"], ["tc", "Trên giữa"], ["tr", "Trên phải"], ["ml", "Giữa trái"], ["mc", "Chính giữa"], ["mr", "Giữa phải"], ["bl", "Dưới trái"], ["bc", "Dưới giữa"], ["br", "Dưới phải"]];
const COLORS = [["#9AA0A6", "Xám"], ["#E5484D", "Đỏ"], ["#1A4FA0", "Xanh"], ["#18794E", "Xanh lá"], ["#000000", "Đen"]];
const FONT = "800 {px}px 'Be Vietnam Pro', sans-serif";
let get = null, logo = null, mark = null, board = null, el = null;

// chữ → PNG trong suốt, 4 px mỗi pt để in vẫn nét; giữ nguyên dấu tiếng Việt
function textMark(o) {
  const K = 4, px = o.fsize * K, font = FONT.replace("{px}", px);
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = font;
  const tw = Math.ceil(g.measureText(o.text).width);
  c.width = Math.max(1, tw + px * 0.2); c.height = Math.ceil(px * 1.35);
  g.font = font; g.fillStyle = o.color; g.textBaseline = "middle";
  g.fillText(o.text, px * 0.1, c.height / 2);
  return { url: c.toDataURL("image/png"), w: c.width / K, h: c.height / K };
}
function makeMark() {
  const o = get();
  if (o.kind === "text") mark = o.text ? textMark(o) : null;
  else mark = logo ? { url: logo.url, ratio: logo.ratio } : null;
}
// kích thước dấu (pt) trên trang rộng vw
const markSize = (o, vw) => (logo && o.kind === "image" ? [vw * o.lsize, vw * o.lsize * mark.ratio] : [mark.w, mark.h]);
function chosen(o, n) { return o.which === "all" ? null : new Set(parseRanges(o.pages, n).pages); }

async function setLogo(file) {
  try {
    const bmp = await decodeImage(file);
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    logo = { url: c.toDataURL("image/png"), ratio: c.height / c.width, name: file.name };
    const box = el.querySelector("#logo-prev");
    box.textContent = "";
    box.append(h("img", { src: logo.url, alt: "Logo đã chọn", style: { maxHeight: "72px", maxWidth: "100%", display: "block" } }));
    el.querySelector('input[name="kind"][value="image"]').checked = true;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (e) { toast(e.userMsg || "Không đọc được ảnh này. Hãy thử ảnh PNG hoặc JPG.", { type: "err" }); }
}

pageTool({
  action: "Chèn watermark",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  decorate(sheet, p, idx, B) {
    if (!get || !mark) return;
    const o = get(), sel = chosen(o, B.pages.length);
    if (sel && !sel.has(idx + 1)) return;
    const [vw, vh] = visDims(p), [w, hh] = markSize(o, vw);
    markLayout(vw, vh, w, hh, o).forEach((s) => sheet.append(h("img", { class: "deco", src: mark.url, alt: "", style: {
      opacity: o.opacity, maxWidth: "none", left: ((s.cx - w / 2) / vw) * 100 + "%", top: ((s.cy - hh / 2) / vh) * 100 + "%",
      width: (w / vw) * 100 + "%", height: (hh / vh) * 100 + "%", transform: `rotate(${-o.angle}deg)` } })));
  },
  options(e, ctx, B) {
    el = e; board = B;
    const text = h("input", { class: "input", id: "wm-text", value: "BẢN SAO", maxlength: 80, autocomplete: "off" });
    const fsize = h("input", { type: "range", id: "fsize", min: 16, max: 160, value: 64, "aria-label": "Cỡ chữ" });
    const lsize = h("input", { type: "range", id: "lsize", min: 5, max: 100, value: 40, "aria-label": "Độ rộng logo" });
    const opacity = h("input", { type: "range", id: "opacity", min: 5, max: 100, value: 30, "aria-label": "Độ đậm" });
    const tile = h("input", { type: "checkbox", id: "tile" });
    const pages = h("input", { class: "input", id: "wm-pages", inputmode: "numeric", autocomplete: "off", placeholder: "VD: 1-3, 5" });
    const logoIn = h("input", { type: "file", accept: "image/*", hidden: true, onchange: () => { if (logoIn.files[0]) setLogo(logoIn.files[0]); logoIn.value = ""; } });
    const out = (id) => h("output", { id: id + "-v" });
    e.append(
      seg("kind", [["text", "Chữ"], ["image", "Ảnh / logo"]], "text", "Loại watermark"),
      h("div", { class: "opt-group", id: "g-text" },
        h("label", { class: "field" }, h("span", { text: "Nội dung" }), text),
        colorPick("color", COLORS, COLORS[0][0], "Màu chữ"),
        h("p", { class: "opt-title", text: "Cỡ chữ" }), h("div", { class: "range-row" }, fsize, out("fsize"))),
      h("div", { class: "opt-group", id: "g-image", hidden: true },
        h("div", { id: "logo-prev", class: "hint", text: "Chưa có ảnh. Nên dùng logo PNG nền trong suốt." }), logoIn,
        h("button", { class: "btn ghost sm", type: "button", onclick: () => logoIn.click() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Chọn ảnh / logo…"),
        h("p", { class: "opt-title", text: "Độ rộng (so với trang)" }), h("div", { class: "range-row" }, lsize, out("lsize"))),
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Độ đậm" }), h("div", { class: "range-row" }, opacity, out("opacity"))),
      seg("angle", [["0", "Ngang"], ["45", "Chéo lên"], ["-45", "Chéo xuống"]], "45", "Góc xoay"),
      posGrid("pos", GRID, "mc", "Vị trí"),
      h("label", { class: "switch" }, tile, h("span", null, "Lặp kín trang", h("small", { text: "Khó cắt bỏ hơn; bỏ qua vị trí ở trên." }))),
      seg("which", [["all", "Mọi trang"], ["some", "Một số trang"]], "all", "Áp dụng cho"),
      h("div", { id: "g-pages", hidden: true }, pages));
    get = () => ({
      kind: radioVal(e, "kind"), text: text.value.trim(), color: radioVal(e, "color"), fsize: +fsize.value,
      lsize: +lsize.value / 100, opacity: +opacity.value / 100, angle: +radioVal(e, "angle"), pos: radioVal(e, "pos"), tile: tile.checked,
      which: radioVal(e, "which"), pages: pages.value
    });
    return get;
  },
  onChange(B, ctx) {
    const o = get(), e = ctx.optsEl;
    e.querySelector("#g-text").hidden = o.kind !== "text";
    e.querySelector("#g-image").hidden = o.kind !== "image";
    e.querySelector("#g-pages").hidden = o.which !== "some";
    e.querySelector("#fsize-v").textContent = o.fsize;
    e.querySelector("#lsize-v").textContent = Math.round(o.lsize * 100) + "%";
    e.querySelector("#opacity-v").textContent = Math.round(o.opacity * 100) + "%";
    e.querySelectorAll('input[name="pos"]').forEach((r) => { r.disabled = o.tile; });
    makeMark();
    B.redecorate();
  },
  summary(B, o) {
    if (!mark) return o.kind === "image" ? "Hãy chọn ảnh / logo làm watermark." : "Hãy nhập nội dung watermark.";
    const sel = chosen(o, B.pages.length), n = sel ? sel.size : B.pages.length;
    return `Chèn watermark vào <b>${n}</b>/${B.pages.length} trang.`;
  },
  ready(B, o) {
    if (!mark) return o.kind === "image" ? "Hãy chọn ảnh / logo làm watermark." : "Hãy nhập nội dung watermark.";
    const sel = chosen(o, B.pages.length);
    return sel && !sel.size ? "Nhập các trang cần chèn, ví dụ 1-3, 5." : true;
  },
  async run(B, o, ctx) {
    ctx.status("Đang chèn watermark…"); ctx.progress(-1);
    const L = await lib("pdflib");
    const it = firstItem(B);
    const doc = await libDoc(it.bytes, it.password);
    const img = await doc.embedPng(await (await fetch(mark.url)).arrayBuffer());
    const pages = doc.getPages(), sel = chosen(o, pages.length);
    for (let i = 0; i < pages.length; i++) {
      if (sel && !sel.has(i + 1)) continue;
      const page = pages[i], g = geom(page.getCropBox(), page.getRotation().angle);
      const [w, hh] = markSize(o, g.VW);
      for (const s of markLayout(g.VW, g.VH, w, hh, o)) {
        const pl = place(g, { x: s.cx - w / 2, y: s.cy - hh / 2, w, h: hh, angle: o.angle });
        page.drawImage(img, { x: pl.x, y: pl.y, width: pl.width, height: pl.height, rotate: L.degrees(pl.rotate), opacity: o.opacity });
      }
      if (i % 20 === 19) await nextFrame();
    }
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + "-watermark.pdf", note: pages.length + " trang" }];
  },
  doneTitle: () => "Đã chèn watermark!"
});

// font Be Vietnam Pro đậm cần tải xong mới vẽ chữ đúng
if (document.fonts) document.fonts.load(FONT.replace("{px}", 40), "BẢN SAO Đã ký").then(() => { if (get && board && board.ctx) board.ctx.refresh(); }).catch(() => {});
