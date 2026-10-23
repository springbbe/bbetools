/* Tự sinh bởi scripts/build.js từ assets/tools/merge-images.js và i18n/en/js/ — đừng sửa tay. */
/* Ghép ảnh: nối ngang, dọc hoặc xếp lưới; khoảng cách, màu nền, bo góc; xem trước trực tiếp; kéo thả đổi thứ tự */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode, EXT, thumbUrl } from "../image.js";
import { mergeLayout } from "../lib/image-geom.js";

const MAX_SIDE = 8000, MAX_AREA = 16.7e6; // Safari không vẽ được canvas lớn hơn ~16,7 triệu điểm ảnh
let prev = null;

function layout(items, o, sizeOf) {
  const sizes = items.map(sizeOf);
  let L = mergeLayout(sizes, { dir: o.dir, cols: o.cols, gap: o.gap, match: o.match, fit: o.fit, cell: 1000, max: MAX_SIDE });
  if (L.W * L.H > MAX_AREA) { const k = Math.sqrt(MAX_AREA / (L.W * L.H)); L = { W: Math.floor(L.W * k), H: Math.floor(L.H * k), cells: L.cells.map((c) => ({ ...c, x: c.x * k, y: c.y * k, w: c.w * k, h: c.h * k })) }; }
  return L;
}
function paint(g, L, items, o, src, k = 1) {
  g.fillStyle = o.bg || "rgba(0,0,0,0)";
  if (o.bg) g.fillRect(0, 0, L.W * k, L.H * k); else g.clearRect(0, 0, L.W * k, L.H * k);
  g.imageSmoothingQuality = "high";
  L.cells.forEach((c, i) => {
    const im = src(items[i]), s = im.width / items[i].bmp.width; // nguồn có thể là ảnh thu nhỏ
    g.save();
    if (o.radius) { g.beginPath(); const r = Math.min(c.w, c.h) * k * o.radius; if (g.roundRect) g.roundRect(c.x * k, c.y * k, c.w * k, c.h * k, r); else g.rect(c.x * k, c.y * k, c.w * k, c.h * k); g.clip(); }
    g.drawImage(im, c.sx * s, c.sy * s, c.sw * s, c.sh * s, c.x * k, c.y * k, c.w * k, c.h * k);
    g.restore();
  });
}

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "images", reorder: true,
  action: "Merge images",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png", "ma-qr-mau.png"),
  async load(it, ctx) {
    it.bmp = await decodeImage(it.file);
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    it.thumb = await thumbUrl(it.bmp, 112);
    it.small = drawScaled(it.bmp, ...fit(it.bmp, 700));
    if (!prev) { prev = h("div", { class: "ist-preview" }, h("canvas", { role: "img", "aria-label": "Merged image preview" })); ctx.workMain.append(prev); }
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  options(el) {
    const gap = h("input", { type: "range", id: "gap", min: 0, max: 80, value: 0, "aria-label": "Spacing" });
    const rad = h("input", { type: "range", id: "rad", min: 0, max: 30, value: 0, "aria-label": "Corner radius" });
    const bg = h("input", { type: "color", id: "bgc", value: "#ffffff", "aria-label": "Background color" });
    el.append(
      seg("dir", [["h", "Horizontal"], ["v", "Vertical"], ["grid", "Grid"]], "h", "Layout"),
      h("label", { class: "switch", id: "g-match" }, h("input", { type: "checkbox", id: "match", checked: true }), h("span", null, "Same size", h("small", { id: "match-hint" }))),
      h("div", { class: "opt-group", id: "g-grid", hidden: true },
        h("label", { class: "field" }, h("span", { text: "Columns" }), h("input", { class: "input", id: "cols", type: "number", min: 1, max: 10, value: 2, inputmode: "numeric" })),
        seg("fit", [["cover", "Crop to fill cells"], ["contain", "Keep whole image"]], "cover")),
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Spacing" }), h("div", { class: "range-row" }, gap, h("output", { id: "gap-v" })),
        h("p", { class: "opt-title", text: "Rounded image corners" }), h("div", { class: "range-row" }, rad, h("output", { id: "rad-v" }))),
      seg("bgm", [["color", "Color"], ["none", "Transparent"]], "color", "Background"),
      h("label", { class: "field color-in", id: "g-bg" }, h("span", { text: "Background color" }), bg),
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Save as" }),
        h("select", { id: "to" }, [["image/jpeg", "JPG (light)"], ["image/png", "PNG"], ["image/webp", "WebP"]].map(([v, l]) => h("option", { value: v, text: l }))))),
      h("p", { class: "hint", id: "mg-info", "aria-live": "polite" }));
    const upd = () => {
      const d = radioVal(el, "dir");
      el.querySelector("#g-grid").hidden = d !== "grid";
      el.querySelector("#g-match").hidden = d === "grid";
      el.querySelector("#match-hint").textContent = d === "v" ? "Makes all images the same width." : "Makes all images the same height.";
      el.querySelector("#gap-v").textContent = gap.value + " px";
      el.querySelector("#rad-v").textContent = rad.value + "%";
      el.querySelector("#g-bg").hidden = radioVal(el, "bgm") !== "color";
    };
    el.addEventListener("input", upd); el.addEventListener("change", upd); upd();
    return () => {
      const to = el.querySelector("#to").value;
      return { dir: radioVal(el, "dir"), match: el.querySelector("#match").checked, cols: Math.max(1, +el.querySelector("#cols").value || 2), fit: radioVal(el, "fit"),
        gap: +gap.value, radius: +rad.value / 100, bg: radioVal(el, "bgm") === "color" || to === "image/jpeg" ? bg.value : null, to };
    };
  },
  onChange(ctx) {
    const items = ctx.items.filter((i) => i.bmp), info = document.getElementById("mg-info");
    if (!prev) return;
    prev.hidden = items.length < 1;
    if (!items.length) return;
    const o = ctx.opts, L = layout(items, o, (it) => [it.bmp.width, it.bmp.height]);
    const k = Math.min(1, 900 / Math.max(L.W, L.H)), c = prev.firstChild;
    c.width = Math.max(1, Math.round(L.W * k)); c.height = Math.max(1, Math.round(L.H * k));
    paint(c.getContext("2d"), L, items, o, (it) => it.small, k);
    if (info) info.textContent = `Merged image: ${L.W}×${L.H} px.`;
  },
  ready: (items) => (items.filter((i) => i.bmp).length < 2 ? "Choose at least 2 images to merge." : true),
  async run(items, o, ctx) {
    ctx.status("Merging images…"); ctx.progress(-1);
    const list = items.filter((i) => i.bmp);
    const L = layout(list, o, (it) => [it.bmp.width, it.bmp.height]);
    const c = canvas(L.W, L.H);
    paint(c.getContext("2d"), L, list, o, (it) => it.bmp);
    const blob = await encode(c, o.to, 0.9);
    c.width = c.height = 0;
    return [{ blob, name: `${baseName(list[0].name)}-merged-${list.length}-images.${EXT[o.to]}`, note: `${L.W}×${L.H} px · ${list.length} images` }];
  },
  doneTitle: () => "Images merged!"
});

function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }
