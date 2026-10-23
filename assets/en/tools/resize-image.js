/* Tự sinh bởi scripts/build.js từ assets/tools/resize-image.js và i18n/en/js/ — đừng sửa tay. */
/* Đổi kích thước ảnh: theo pixel (giữ hoặc không giữ tỉ lệ), theo %, theo cạnh dài nhất; hàng loạt, thu nhỏ mịn (từng nửa) */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, encode, EXT, thumbUrl, formatOptions, outType } from "../image.js";
import { fitSize } from "../lib/image-geom.js";

const LONGS = [3840, 2560, 1920, 1280, 1080, 800, 640];
let getFmt = null;

const sizeOf = (it, o) => fitSize(it.bmp.width, it.bmp.height, o);

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "images",
  action: "Resize",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png"),
  async load(it) {
    it.bmp = await decodeImage(it.file);
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    it.thumb = await thumbUrl(it.bmp, 112);
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  options(el) {
    const num = (id, label, attrs = {}) => h("label", { class: "field" }, h("span", { text: label }), h("input", { class: "input", id, type: "number", min: 1, max: 20000, inputmode: "numeric", placeholder: "auto", ...attrs }));
    const pct = h("input", { type: "range", min: 5, max: 200, step: 5, value: 50, id: "pct", "aria-label": "Percent of original size" });
    const pctOut = h("output", { for: "pct", text: "50%" });
    const long = h("input", { class: "input", id: "long", type: "number", min: 1, max: 20000, value: 1920, inputmode: "numeric", "aria-label": "Longest side (px)", style: { width: "120px" } });
    el.append(
      seg("mode", [["px", "Pixel"], ["pct", "%"], ["long", "Long side"]], "px", "Resize by"),
      h("div", { class: "opt-group", id: "g-px" },
        h("div", { class: "rs-grid" }, num("w", "Width (px)", { value: 1200 }), num("h", "Cao (px)")),
        h("label", { class: "switch" }, h("input", { type: "checkbox", id: "keep", checked: true }), h("span", null, "Keep aspect ratio", h("small", { text: "Leave one box empty to calculate it automatically; enter both to fit the image inside the box." })))),
      h("div", { class: "opt-group", id: "g-pct", hidden: true }, h("p", { class: "opt-title", text: "Percent of original size" }), h("div", { class: "range-row" }, pct, pctOut)),
      h("div", { class: "opt-group", id: "g-long", hidden: true }, h("p", { class: "hint", text: "The longest side of each image (landscape or portrait) will equal this number." }),
        h("div", { class: "row" }, long, h("span", { text: "px" })),
        h("div", { class: "chip-list sm-chips", role: "group", "aria-label": "Common sizes" }, LONGS.map((v) => h("button", { class: "chip", type: "button", text: String(v), onclick: () => { long.value = v; long.dispatchEvent(new Event("input", { bubbles: true })); } })))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "noup", checked: true }), h("span", null, "Don't enlarge small images", h("small", { text: "Images already smaller than the requested size keep their size (enlarging makes them blurry)." }))),
      h("p", { class: "hint rs-prev", id: "rs-prev", "aria-live": "polite" }));
    getFmt = formatOptions(el, { q: 90, avif: true });
    const upd = () => {
      const m = radioVal(el, "mode");
      for (const k of ["px", "pct", "long"]) el.querySelector("#g-" + k).hidden = m !== k;
      pctOut.textContent = pct.value + "%";
    };
    el.addEventListener("input", upd); upd();
    return () => ({
      mode: radioVal(el, "mode"), width: +el.querySelector("#w").value || 0, height: +el.querySelector("#h").value || 0, keep: el.querySelector("#keep").checked,
      pct: +pct.value, long: +long.value || 0, noUpscale: el.querySelector("#noup").checked, ...getFmt()
    });
  },
  onChange(ctx) {
    const p = document.getElementById("rs-prev");
    if (!p) return;
    const o = ctx.opts, items = ctx.items.filter((i) => i.bmp);
    p.textContent = items.slice(0, 3).map((it) => { const [w, hh] = sizeOf(it, o); return `${it.bmp.width}×${it.bmp.height} → ${w}×${hh}`; }).join(" · ") + (items.length > 3 ? " · …" : "");
  },
  ready(items, o) {
    if (o.mode === "px" && !o.width && !o.height) return "Enter a width or height.";
    if (o.mode === "long" && !o.long) return "Enter the pixel length of the longest side.";
    return true;
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      ctx.status(`Resizing ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      const type = outType(it.file, o);
      const [w, hh] = sizeOf(it, o);
      const c = drawScaled(it.bmp, w, hh, type === "image/jpeg" ? "#ffffff" : null);
      const blob = await encode(c, type, o.q);
      c.width = c.height = 0;
      outs.push({ blob, name: `${baseName(it.name)}-${w}x${hh}.${EXT[type]}`, note: `${it.bmp.width}×${it.bmp.height} → <b>${w}×${hh}</b>` });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "resized-images",
  doneTitle: (outs) => (outs.length > 1 ? `Resized ${outs.length} images!` : "Image resized!")
});

const css = document.createElement("style");
css.textContent = ".rs-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rs-prev{font-variant-numeric:tabular-nums;min-height:1.4em}";
document.head.append(css);
