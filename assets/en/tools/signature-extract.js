/* Tự sinh bởi scripts/build.js từ assets/tools/signature-extract.js và i18n/en/js/ — đừng sửa tay. */
/* Tách chữ ký, con dấu: ảnh chụp trên giấy → PNG nền trong suốt. Ước lượng nền giấy theo từng vùng (chịu được bóng đổ),
   lọc riêng mực xanh (chữ ký) / đỏ (con dấu) / đen, đổi màu mực, kéo chọn vùng, tự cắt sát. */
import { h, icon, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode } from "../image.js";
import { paperLevel, extractInk } from "../lib/image-data.js";
import { clampRect, resizeRect, roundRect } from "../lib/image-geom.js";

const COLORS = { keep: null, black: [17, 17, 17], blue: [16, 52, 166], red: [200, 30, 40] };
let S = null, F = null, stage, view, selBox, showOrig = false, timer = 0;

fileTool({
  accept: ["image", "heic"], multiple: false, noun: "signature or stamp photos",
  action: "Download transparent PNG",
  pickLabel: "Choose photo",
  sample: () => sampleFiles("chu-ky-chup.jpg"),
  custom: { mount },
  options(el) {
    el.append(
      seg("only", [["all", "All"], ["blue", "Blue"], ["red", "Red"], ["dark", "Black"]], "all", "Ink to extract"),
      h("p", { class: "hint", text: "Blue ink signature over a red stamp: choose “Blue” for just the signature, “Red” for just the stamp." }),
      seg("color", [["keep", "As original"], ["black", "Black"], ["blue", "Blue"], ["red", "Red"]], "keep", "Change ink color"),
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Sensitivity" }),
        h("div", { class: "range-row" }, h("input", { type: "range", id: "sens", min: 0, max: 100, value: 50, "aria-label": "Sensitivity" }), h("output", { id: "sens-v" })),
        h("p", { class: "hint", text: "Increase if thin strokes break up, decrease if smudges or paper shadows remain." })),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "trim", checked: true }), h("span", null, "Auto-trim to the strokes", h("small", { text: "Removes the extra transparent area around it." }))));
    const upd = () => { el.querySelector("#sens-v").textContent = el.querySelector("#sens").value; };
    el.addEventListener("input", upd); upd();
    return () => ({ only: radioVal(el, "only"), color: radioVal(el, "color"), sens: +el.querySelector("#sens").value / 100, trim: el.querySelector("#trim").checked });
  },
  async onAdd(items, ctx) { await start(items[0], ctx); },
  onChange(ctx) {
    // chỉ xử lý lại khi tuỳ chọn đổi (process() gọi refresh() → onChange)
    const key = JSON.stringify(ctx.opts);
    if (S && key !== S.key) { S.key = key; clearTimeout(timer); timer = setTimeout(process, 60); }
  },
  ready: () => (!S || !S.res ? "Processing image…" : S.res.box ? true : "No ink strokes found. Increase the sensitivity or choose “All”."),
  async run(items, o, ctx) {
    ctx.status("Creating PNG…"); ctx.progress(-1);
    const { data, box } = S.res, W = S.img.width, H = S.img.height;
    const full = canvas(W, H); full.getContext("2d").putImageData(new ImageData(data, W, H), 0, 0);
    let r = S.sel ? roundRect(S.sel) : { x: 0, y: 0, w: W, h: H };
    if (o.trim && box) { const pad = Math.round(Math.max(box.w, box.h) * 0.03) + 2; r = clampRect({ x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad }, W, H); }
    const c = canvas(r.w, r.h);
    c.getContext("2d").drawImage(full, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    const blob = await encode(c, "image/png");
    const kind = o.only === "red" ? "stamp" : "signature";
    return [{ blob, name: `${baseName(S.it.name)}-${kind}.png`, note: `${r.w}×${r.h} · transparent background` }];
  },
  doneTitle: () => "Done!",
  summary: () => "Use this PNG in Sign PDF, Word or Canva: with its transparent background it fits on any document."
});

function mount(ctx) {
  F = ctx;
  view = h("canvas", { role: "img", "aria-label": "Extracted strokes on a checkerboard (transparent) background" });
  selBox = h("div", { class: "sg-sel", hidden: true });
  stage = h("div", { class: "ist-stage sg-stage", hidden: true }, view, selBox);
  const loading = h("p", { class: "ist-loading", html: "<span class=\"spinner sm\"></span> Reading image…" });
  const origBtn = h("button", { class: "btn ghost sm", type: "button", "aria-pressed": "false", onclick: () => { showOrig = !showOrig; origBtn.setAttribute("aria-pressed", String(showOrig)); origBtn.lastChild.textContent = showOrig ? "View result" : "View original"; paint(); } }, h("span", { html: icon("eye"), style: { display: "contents" } }), "View original");
  ctx.workMain.append(h("div", { class: "ist" }, loading, stage,
    h("div", { class: "row" }, origBtn,
      h("button", { class: "btn ghost sm", type: "button", onclick: () => { if (S) { S.sel = null; process(); } } }, h("span", { html: icon("maximize"), style: { display: "contents" } }), "Use the whole image"),
      h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Choose another image")),
    h("p", { class: "hint", text: "Drag on the image to outline the signature / stamp (skipping the printed text around it). Straight, well-lit photos on white paper give the best results." })));
  ctx.loading = loading;
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (!S) return;
    e.preventDefault(); stage.setPointerCapture(e.pointerId);
    const b = view.getBoundingClientRect(), k = S.img.width / b.width;
    drag = { p: [(e.clientX - b.left) * k, (e.clientY - b.top) * k], sx: e.clientX, sy: e.clientY, k };
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    const dx = (e.clientX - drag.sx) * drag.k, dy = (e.clientY - drag.sy) * drag.k;
    S.sel = resizeRect({ x: drag.p[0], y: drag.p[1], w: 0, h: 0 }, (dy < 0 ? "n" : "s") + (dx < 0 ? "w" : "e"), dx, dy, S.img.width, S.img.height, 0, 1);
    drag.moved = true;
    paint();
  });
  const end = () => { if (drag && drag.moved) process(); drag = null; };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
}

async function start(it, ctx) {
  S = null; stage.hidden = true; ctx.loading.hidden = false; ctx.refresh();
  try {
    const bmp = await decodeImage(it.file);
    const c = drawScaled(bmp, ...fit(bmp, 2400), "#ffffff");
    if (bmp.close) bmp.close();
    const img = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
    S = { it, src: c, img, sel: null, key: JSON.stringify(ctx.opts), level: paperLevel(img, Math.max(16, Math.round(Math.max(c.width, c.height) / 48))) };
    view.width = c.width; view.height = c.height;
    it.info = `${c.width}×${c.height}`;
    stage.hidden = false; ctx.loading.hidden = true;
    process();
  } catch (e) { console.error(e); ctx.loading.hidden = true; ctx.status(e.userMsg || "Couldn't read this image.", "err"); }
  ctx.refresh();
}

function process() {
  if (!S || !F) return;
  const o = F.opts, W = S.img.width, H = S.img.height;
  let res = extractInk(S.img, { level: S.level, sens: o.sens, color: COLORS[o.color], only: o.only === "all" ? null : o.only });
  if (S.sel) {
    // chỉ giữ nét trong vùng đã khoanh
    const r = roundRect(S.sel);
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (x < r.x || x >= r.x + r.w || y < r.y || y >= r.y + r.h) { res.data[i + 3] = 0; continue; }
      if (res.data[i + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    res = { data: res.data, box: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
  }
  S.res = res;
  paint();
  F.refresh();
}

function paint() {
  if (!S) return;
  const g = view.getContext("2d");
  g.clearRect(0, 0, view.width, view.height);
  if (showOrig) g.drawImage(S.src, 0, 0);
  else if (S.res) g.putImageData(new ImageData(S.res.data, S.img.width, S.img.height), 0, 0);
  const r = S.sel;
  selBox.hidden = !r;
  if (r) Object.assign(selBox.style, { left: (r.x / S.img.width) * 100 + "%", top: (r.y / S.img.height) * 100 + "%", width: (r.w / S.img.width) * 100 + "%", height: (r.h / S.img.height) * 100 + "%" });
}
function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }

const css = document.createElement("style");
css.textContent = ".sg-stage{cursor:crosshair;background:repeating-conic-gradient(#e6e8ec 0 25%,#fff 0 50%) 0 0/16px 16px}.sg-sel{position:absolute;outline:2px dashed var(--brand);background:rgba(62,91,242,.08);pointer-events:none}";
document.head.append(css);
