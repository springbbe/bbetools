/* Tự sinh bởi scripts/build.js từ assets/tools/crop-image.js và i18n/en/js/ — đừng sửa tay. */
/* Cắt ảnh: kéo khung trên ảnh (tay nắm 8 hướng, vẽ khung mới), tỉ lệ tự do / gốc / 1:1 / 4:3 / 16:9…, nhập số pixel,
   bàn phím: mũi tên di chuyển, Shift + mũi tên đổi cỡ. Cắt trên ảnh gốc, không thu nhỏ. */
import { h, icon, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode, EXT, formatOptions, outType } from "../image.js";
import { centeredRect, clampRect, roundRect, moveRect, resizeRect, applyRatio } from "../lib/image-geom.js";

const RATIOS = [["0", "Free"], ["orig", "Original"], ["1", "1:1"], ["4/3", "4:3"], ["3/4", "3:4"], ["16/9", "16:9"], ["9/16", "9:16"], ["3/2", "3:2"], ["2/3", "2:3"]];
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

let S = null;   // { it, bmp, W, H, r, ratioKey }
let F = null;   // ctx của khung file
let stage, view, box, shade, badge, fields = {}, getFmt = null;

const ratioOf = (key) => (key === "orig" ? (S ? S.W / S.H : 0) : key.includes("/") ? key.split("/")[0] / key.split("/")[1] : +key || 0);

fileTool({
  accept: ["image", "heic"], multiple: false, noun: "images",
  action: "Crop image",
  sample: () => sampleFiles("anh-phong-canh.jpg"),
  custom: { mount },
  options(el) {
    const num = (k, label) => {
      const inp = h("input", { class: "input", id: "c-" + k, type: "number", min: 0, step: 1, inputmode: "numeric" });
      inp.addEventListener("input", () => fromFields(k));
      fields[k] = inp;
      return h("label", { class: "field" }, h("span", { text: label }), inp);
    };
    el.append(seg("ratio", RATIOS, "0", "Aspect ratio"),
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Crop area (pixels)" }), h("div", { class: "rs-grid" }, num("x", "From left (X)"), num("y", "From top (Y)"), num("w", "Width"), num("h", "Height"))));
    getFmt = formatOptions(el, { q: 92, avif: true });
    return () => ({ ratio: radioVal(el, "ratio"), ...getFmt() });
  },
  async onAdd(items, ctx) { await start(items[0], ctx); },
  onChange(ctx) {
    if (!S) return;
    const key = ctx.opts.ratio;
    if (key !== S.ratioKey) {
      S.ratioKey = key;
      const k = ratioOf(key);
      S.r = k ? applyRatio(S.r, k, S.W, S.H) : S.r;
      // khung quá nhỏ sau khi đổi tỉ lệ: lấy khung lớn nhất giữa ảnh
      if (k && S.r.w * S.r.h < S.W * S.H * 0.15) S.r = centeredRect(S.W, S.H, k, 0.9);
      draw();
    }
  },
  ready() {
    if (!S) return "Reading image…";
    const r = roundRect(S.r);
    if (r.w < 1 || r.h < 1) return "The crop box is too small.";
    if (r.x === 0 && r.y === 0 && r.w === S.W && r.h === S.H) return "Drag the box or choose a ratio to select the area to keep.";
    return true;
  },
  async run(items, o, ctx) {
    ctx.status("Cropping image…"); ctx.progress(-1);
    const r = roundRect(S.r), type = outType(S.it.file, o);
    const c = canvas(r.w, r.h), g = c.getContext("2d");
    if (type === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, r.w, r.h); }
    g.drawImage(S.bmp, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    const blob = await encode(c, type, o.q);
    c.width = c.height = 0;
    return [{ blob, name: `${baseName(S.it.name)}-crop-${r.w}x${r.h}.${EXT[type]}`, note: `${S.W}×${S.H} → <b>${r.w}×${r.h}</b>` }];
  },
  doneTitle: () => "Image cropped!"
});

/* ---------- vùng làm việc ---------- */
function mount(ctx) {
  F = ctx;
  view = h("canvas", { class: "ci-view", role: "img", "aria-label": "Image to crop" });
  badge = h("span", { class: "ci-badge", "aria-hidden": "true" });
  box = h("div", { class: "ci-box", tabindex: "0", role: "group", "aria-label": "Crop box. Arrow keys move it, Shift + arrows resize it." },
    HANDLES.map((k) => h("span", { class: "ci-h ci-" + k, "data-h": k, "aria-hidden": "true" })), badge);
  shade = h("div", { class: "ci-shade" });
  stage = h("div", { class: "ci-stage", hidden: true }, h("div", { class: "ci-clip" }, view, shade), box);
  const loading = h("p", { class: "ci-loading", html: "<span class=\"spinner sm\"></span> Reading image…" });
  ctx.workMain.append(h("div", { class: "ci" }, loading, stage,
    h("div", { class: "row" },
      h("button", { class: "btn ghost sm", type: "button", onclick: () => { if (S) { S.r = initial(); draw(); } } }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Reset box"),
      h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Choose another image")),
    h("p", { class: "hint", html: "Drag inside the box to move, drag corners/edges to resize, drag outside to draw a new box. Keyboard: click the box, then use the arrow keys (hold <kbd>Shift</kbd> to resize)." })));
  ctx.loading = loading;

  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (!S || e.button > 0) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    const hd = e.target.dataset && e.target.dataset.h;
    const p = toImg(e);
    drag = { mode: hd ? "resize" : e.target === box || box.contains(e.target) ? "move" : "new", h: hd, r0: { ...S.r }, sx: e.clientX, sy: e.clientY, p0: p, moved: false };
    box.focus({ preventScroll: true });
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const k = S.W / view.clientWidth, dx = (e.clientX - drag.sx) * k, dy = (e.clientY - drag.sy) * k;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
    drag.moved = true;
    const ratio = ratioOf(S.ratioKey);
    if (drag.mode === "move") S.r = moveRect(drag.r0, dx, dy, S.W, S.H);
    else if (drag.mode === "resize") S.r = resizeRect(drag.r0, drag.h, dx, dy, S.W, S.H, ratio, 8);
    else S.r = resizeRect({ x: drag.p0[0], y: drag.p0[1], w: 0, h: 0 }, (dy < 0 ? "n" : "s") + (dx < 0 ? "w" : "e"), dx, dy, S.W, S.H, ratio, 1);
    draw();
  });
  const end = () => { if (drag) { drag = null; if (S.r.w < 8 || S.r.h < 8) S.r = clampRect({ ...S.r, w: Math.max(8, S.r.w), h: Math.max(8, S.r.h) }, S.W, S.H); draw(); } };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  box.addEventListener("keydown", (e) => {
    if (!S) return;
    const step = Math.max(1, Math.round(Math.max(S.W, S.H) / (e.altKey ? 400 : 100)));
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    S.r = e.shiftKey ? resizeRect(S.r, d[0] ? "e" : "s", d[0], d[1], S.W, S.H, ratioOf(S.ratioKey), 8) : moveRect(S.r, d[0], d[1], S.W, S.H);
    draw();
  });
}

function toImg(e) {
  const b = view.getBoundingClientRect(), k = S.W / b.width;
  return [Math.min(S.W, Math.max(0, (e.clientX - b.left) * k)), Math.min(S.H, Math.max(0, (e.clientY - b.top) * k))];
}
const initial = () => { const k = ratioOf(S.ratioKey); return k ? centeredRect(S.W, S.H, k, 0.9) : { x: 0, y: 0, w: S.W, h: S.H }; };

async function start(it, ctx) {
  if (S && S.bmp.close) S.bmp.close();
  S = null;
  stage.hidden = true; ctx.loading.hidden = false;
  ctx.refresh();
  try {
    const bmp = await decodeImage(it.file);
    S = { it, bmp, W: bmp.width, H: bmp.height, ratioKey: ctx.opts.ratio };
    S.r = initial();
    // ảnh xem trước: tối đa 1600 px để kéo mượt
    const k = Math.min(1, 1600 / Math.max(S.W, S.H));
    const pv = drawScaled(bmp, S.W * k, S.H * k);
    view.width = pv.width; view.height = pv.height;
    view.getContext("2d").drawImage(pv, 0, 0);
    pv.width = pv.height = 0;
    for (const k2 of ["x", "y", "w", "h"]) fields[k2].max = k2 === "x" || k2 === "w" ? S.W : S.H;
    it.info = `${S.W}×${S.H}`;
    stage.hidden = false; ctx.loading.hidden = true;
    draw();
  } catch (e) {
    console.error(e);
    ctx.loading.hidden = true;
    ctx.status(e.userMsg || "Couldn't read this image.", "err");
  }
  ctx.refresh();
}

function draw() {
  if (!S) return;
  const r = S.r, pct = (v, d) => (v / d) * 100 + "%";
  const st = { left: pct(r.x, S.W), top: pct(r.y, S.H), width: pct(r.w, S.W), height: pct(r.h, S.H) };
  Object.assign(box.style, st); Object.assign(shade.style, st);
  const R = roundRect(r);
  badge.textContent = `${R.w} × ${R.h}`;
  for (const k of ["x", "y", "w", "h"]) if (document.activeElement !== fields[k]) fields[k].value = R[k];
  if (F) F.refresh();
}

// nhập số: giữ tỉ lệ nếu đang khoá
function fromFields(changed) {
  if (!S) return;
  const v = (k) => Math.max(0, +fields[k].value || 0);
  let r = { x: v("x"), y: v("y"), w: Math.max(1, v("w")), h: Math.max(1, v("h")) };
  const k = ratioOf(S.ratioKey);
  if (k) { if (changed === "h") r.w = r.h * k; else r.h = r.w / k; }
  if (k && (r.w > S.W || r.h > S.H)) { const s = Math.min(S.W / r.w, S.H / r.h); r.w *= s; r.h *= s; }
  S.r = clampRect(r, S.W, S.H);
  draw();
}

const css = document.createElement("style");
css.textContent = `.ci{display:flex;flex-direction:column;gap:12px;align-items:center}
.ci-loading{display:flex;gap:8px;align-items:center;color:var(--muted);padding:40px 0}
.ci-stage{position:relative;line-height:0;touch-action:none;user-select:none;-webkit-user-select:none;cursor:crosshair;max-width:100%;margin:6px}
.ci-clip{position:relative;overflow:hidden;border-radius:4px;box-shadow:0 0 0 1px var(--line-2);background:repeating-conic-gradient(var(--surface-2) 0 25%,var(--surface) 0 50%) 0 0/16px 16px}
.ci-view{display:block;max-width:100%;max-height:68vh;width:auto;height:auto}
.ci-shade{position:absolute;box-shadow:0 0 0 9999px rgba(10,12,20,.55);pointer-events:none}
.ci-box{position:absolute;outline:1.5px solid #fff;cursor:move;
background:linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.5)) 33.33% 0/1px 100% no-repeat,linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.5)) 66.66% 0/1px 100% no-repeat,linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.5)) 0 33.33%/100% 1px no-repeat,linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.5)) 0 66.66%/100% 1px no-repeat}
.ci-box:focus-visible{outline:3px solid var(--brand)}
.ci-h{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px}
.ci-h::after{content:"";position:absolute;inset:6px;background:#fff;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
.ci-nw{left:0;top:0;cursor:nwse-resize}.ci-n{left:50%;top:0;cursor:ns-resize}.ci-ne{left:100%;top:0;cursor:nesw-resize}.ci-e{left:100%;top:50%;cursor:ew-resize}
.ci-se{left:100%;top:100%;cursor:nwse-resize}.ci-s{left:50%;top:100%;cursor:ns-resize}.ci-sw{left:0;top:100%;cursor:nesw-resize}.ci-w{left:0;top:50%;cursor:ew-resize}
@media (hover:none){.ci-h{width:34px;height:34px;margin:-17px 0 0 -17px}.ci-h::after{inset:11px}}
.ci-badge{position:absolute;left:6px;top:6px;background:rgba(0,0,0,.7);color:#fff;font-size:12px;line-height:1;padding:5px 7px;border-radius:6px;font-variant-numeric:tabular-nums;pointer-events:none;white-space:nowrap}
.rs-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}`;
document.head.append(css);
