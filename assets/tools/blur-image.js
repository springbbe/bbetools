/* Che, làm mờ vùng nhạy cảm: kéo trên ảnh để chọn nhiều vùng (số CCCD, biển số, khuôn mặt…), làm mờ / ô vuông / tô đen,
   hình chữ nhật hoặc bầu dục; AI tự tìm khuôn mặt (chạy trên máy). Bàn phím: Tab chọn vùng, mũi tên di chuyển, Shift + mũi tên đổi cỡ, Delete xoá. */
import { h, icon, baseName, sampleFiles, toast } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode, EXT, formatOptions, outType, softBlur } from "../image.js";
import { clampRect, moveRect, resizeRect, roundRect } from "../lib/image-geom.js";

let S = null, F = null, stage, view, layer, getFmt = null, faceBtn;

/** Áp hiệu ứng cho vùng r (toạ độ của src) lên g; src là ảnh sạch cùng cỡ với g */
function applyRegion(g, src, r, o) {
  const W = src.width, H = src.height;
  const R = clampRect(roundRect(r), W, H, 1);
  g.save();
  g.beginPath();
  if (o.shape === "ellipse") g.ellipse(R.x + R.w / 2, R.y + R.h / 2, R.w / 2, R.h / 2, 0, 0, Math.PI * 2);
  else g.rect(R.x, R.y, R.w, R.h);
  g.clip();
  if (o.mode === "black") { g.fillStyle = "#000"; g.fillRect(R.x, R.y, R.w, R.h); }
  else if (o.mode === "pixel") {
    const block = Math.max(3, Math.round((Math.max(W, H) * (o.strength + 2)) / 300));
    const t = canvas(Math.max(1, R.w / block), Math.max(1, R.h / block));
    t.getContext("2d").drawImage(src, R.x, R.y, R.w, R.h, 0, 0, t.width, t.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(t, R.x, R.y, R.w, R.h);
  } else {
    // làm mờ: lấy rộng ra một chút để mép vùng không bị lộ nét gốc
    const pad = Math.round(Math.max(R.w, R.h) * 0.25);
    const x = Math.max(0, R.x - pad), y = Math.max(0, R.y - pad), w = Math.min(W, R.x + R.w + pad) - x, hh = Math.min(H, R.y + R.h + pad) - y;
    const t = canvas(w, hh); t.getContext("2d").drawImage(src, x, y, w, hh, 0, 0, w, hh);
    const amount = Math.max(4, Math.round((Math.max(w, hh) * (o.strength + 1)) / 60));
    g.drawImage(softBlur(t, amount), x, y, w, hh);
  }
  g.restore();
}

fileTool({
  accept: ["image", "heic"], multiple: false, noun: "ảnh",
  action: "Lưu ảnh đã che",
  sample: () => sampleFiles("chan-dung-mau.jpg"),
  custom: { mount },
  options(el) {
    const str = h("input", { type: "range", id: "str", min: 1, max: 10, value: 6, "aria-label": "Độ mạnh" });
    el.append(
      seg("mode", [["blur", "Làm mờ"], ["pixel", "Ô vuông"], ["black", "Tô đen"]], "blur", "Kiểu che"),
      h("div", { class: "opt-group", id: "g-str" }, h("p", { class: "opt-title", text: "Độ mạnh" }), h("div", { class: "range-row" }, str, h("output", { id: "str-v" }))),
      seg("shape", [["rect", "Chữ nhật"], ["ellipse", "Bầu dục"]], "rect", "Hình vùng che"),
      h("p", { class: "hint", text: "Che chữ, số (CCCD, biển số, số tài khoản) nên chọn “Tô đen”: làm mờ nhẹ đôi khi vẫn đoán lại được." }));
    getFmt = formatOptions(el, { q: 92 });
    const upd = () => { el.querySelector("#str-v").textContent = str.value; el.querySelector("#g-str").hidden = radioVal(el, "mode") === "black"; };
    el.addEventListener("input", upd); upd();
    return () => ({ mode: radioVal(el, "mode"), strength: +str.value, shape: radioVal(el, "shape"), ...getFmt() });
  },
  async onAdd(items, ctx) { await start(items[0], ctx); },
  onChange() { draw(true); }, // quiet: không gọi refresh() lần nữa (tránh vòng lặp)
  ready: () => (!S ? "Đang đọc ảnh…" : S.regions.length ? true : "Kéo trên ảnh để chọn vùng cần che, hoặc bấm “Tìm khuôn mặt”."),
  async run(items, o, ctx) {
    ctx.status("Đang che các vùng đã chọn…"); ctx.progress(-1);
    const type = outType(S.it.file, o);
    const src = canvas(S.W, S.H); src.getContext("2d").drawImage(S.bmp, 0, 0);
    const c = canvas(S.W, S.H), g = c.getContext("2d");
    g.drawImage(src, 0, 0);
    for (const r of S.regions) applyRegion(g, src, r, o);
    const blob = await encode(c, type, o.q);
    src.width = src.height = c.width = c.height = 0;
    return [{ blob, name: `${baseName(S.it.name)}-da-che.${EXT[type]}`, note: `${S.W}×${S.H} · ${S.regions.length} vùng đã che` }];
  },
  doneTitle: () => "Đã che xong!",
  summary: () => "Ảnh mới không còn chứa thông tin EXIF/GPS của ảnh gốc."
});

function mount(ctx) {
  F = ctx;
  view = h("canvas", { role: "img", "aria-label": "Ảnh cần che. Kéo để chọn vùng." });
  layer = h("div", { class: "bl-layer" });
  stage = h("div", { class: "ist-stage bl-stage", hidden: true }, view, layer);
  const loading = h("p", { class: "ist-loading", html: '<span class="spinner sm"></span> Đang đọc ảnh…' });
  faceBtn = h("button", { class: "btn ghost sm", type: "button", onclick: findFaces }, h("span", { html: icon("scan-face"), style: { display: "contents" } }), "Tìm khuôn mặt (AI)");
  ctx.workMain.append(h("div", { class: "ist" }, loading, stage,
    h("div", { class: "row" }, faceBtn,
      h("button", { class: "btn ghost sm", type: "button", onclick: () => { if (S) { S.regions = []; draw(); } } }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Bỏ hết vùng"),
      h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Chọn ảnh khác")),
    h("p", { class: "hint", html: "Kéo trên ảnh để thêm vùng che (thêm được nhiều vùng). Kéo vùng để di chuyển, kéo góc để đổi cỡ, bấm ✕ để bỏ. Bàn phím: <kbd>Tab</kbd> tới vùng, mũi tên để di chuyển, <kbd>Shift</kbd> + mũi tên đổi cỡ, <kbd>Delete</kbd> để xoá." })));
  ctx.loading = loading;

  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (!S || e.button > 0 || e.target.closest(".bl-x")) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    const box = e.target.closest(".bl-box"), idx = box ? +box.dataset.i : -1;
    const b = view.getBoundingClientRect(), k = S.W / b.width;
    const p = [(e.clientX - b.left) * k, (e.clientY - b.top) * k];
    drag = { idx, mode: e.target.dataset.h ? "resize" : box ? "move" : "new", hd: e.target.dataset.h, r0: idx >= 0 ? { ...S.regions[idx] } : { x: p[0], y: p[1], w: 0, h: 0 }, sx: e.clientX, sy: e.clientY, k, moved: false };
    if (box) box.focus({ preventScroll: true });
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
    const dx = (e.clientX - drag.sx) * drag.k, dy = (e.clientY - drag.sy) * drag.k;
    if (!drag.moved && drag.mode === "new") { S.regions.push(drag.r0); drag.idx = S.regions.length - 1; }
    drag.moved = true;
    const r = drag.mode === "move" ? moveRect(drag.r0, dx, dy, S.W, S.H)
      : drag.mode === "resize" ? resizeRect(drag.r0, drag.hd, dx, dy, S.W, S.H, 0, 6)
      : resizeRect(drag.r0, (dy < 0 ? "n" : "s") + (dx < 0 ? "w" : "e"), dx, dy, S.W, S.H, 0, 1);
    S.regions[drag.idx] = r;
    draw();
  });
  const end = () => {
    if (!drag) return;
    const i = drag.idx; drag = null;
    if (i >= 0 && S.regions[i] && (S.regions[i].w < 6 || S.regions[i].h < 6)) S.regions.splice(i, 1);
    draw();
  };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  layer.addEventListener("keydown", (e) => {
    const box = e.target.closest(".bl-box");
    if (!box || !S) return;
    const i = +box.dataset.i;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); S.regions.splice(i, 1); draw(); focusBox(Math.min(i, S.regions.length - 1)); return; }
    const st = Math.max(1, Math.round(Math.max(S.W, S.H) / 100));
    const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (!d) return;
    e.preventDefault();
    S.regions[i] = e.shiftKey ? resizeRect(S.regions[i], d[0] ? "e" : "s", d[0], d[1], S.W, S.H, 0, 6) : moveRect(S.regions[i], d[0], d[1], S.W, S.H);
    draw(); focusBox(i);
  });
}
const focusBox = (i) => { const b = layer.querySelector(`[data-i="${i}"]`); if (b) b.focus({ preventScroll: true }); };

async function start(it, ctx) {
  if (S && S.bmp.close) S.bmp.close();
  S = null; stage.hidden = true; ctx.loading.hidden = false; ctx.refresh();
  try {
    const bmp = await decodeImage(it.file);
    const small = drawScaled(bmp, ...fit(bmp, 1400));
    S = { it, bmp, W: bmp.width, H: bmp.height, small, regions: [] };
    view.width = small.width; view.height = small.height;
    it.info = `${S.W}×${S.H}`;
    stage.hidden = false; ctx.loading.hidden = true;
    draw();
  } catch (e) { console.error(e); ctx.loading.hidden = true; ctx.status(e.userMsg || "Không đọc được ảnh này.", "err"); }
  ctx.refresh();
}

function draw(quiet) {
  if (!S || !F) return;
  const o = F.opts, k = S.small.width / S.W, g = view.getContext("2d");
  g.drawImage(S.small, 0, 0);
  for (const r of S.regions) applyRegion(g, S.small, { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k }, o);
  // khung điều khiển cho từng vùng
  const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest(".bl-box");
  const fi = focused ? +focused.dataset.i : -1;
  layer.textContent = "";
  S.regions.forEach((r, i) => {
    const pct = (v, d) => (v / d) * 100 + "%";
    layer.append(h("div", { class: "bl-box" + (o.shape === "ellipse" ? " ell" : ""), tabindex: "0", "data-i": i, role: "group", "aria-label": `Vùng che ${i + 1}`, style: { left: pct(r.x, S.W), top: pct(r.y, S.H), width: pct(r.w, S.W), height: pct(r.h, S.H) } },
      h("span", { class: "bl-h", "data-h": "nw", "aria-hidden": "true", style: { left: 0, top: 0 } }),
      h("span", { class: "bl-h", "data-h": "se", "aria-hidden": "true", style: { left: "100%", top: "100%" } }),
      h("button", { class: "bl-x", type: "button", "aria-label": `Bỏ vùng che ${i + 1}`, html: icon("x"), onclick: () => { S.regions.splice(i, 1); draw(); } })));
  });
  if (fi >= 0) focusBox(fi);
  if (!quiet) F.refresh();
}

async function findFaces() {
  if (!S) return;
  faceBtn.disabled = true;
  const old = faceBtn.lastChild.textContent;
  faceBtn.lastChild.textContent = "Đang tìm…";
  try {
    const { detectFaces } = await import("../ai/matting.js");
    const faces = await detectFaces(S.small);
    const k = S.W / S.small.width;
    if (!faces.length) toast("Không tìm thấy khuôn mặt nào rõ ràng. Hãy kéo để chọn vùng thủ công.");
    for (const f of faces) {
      const w = (f.x2 - f.x1) * k, hh = (f.y2 - f.y1) * k;
      S.regions.push(clampRect({ x: f.x1 * k - w * 0.12, y: f.y1 * k - hh * 0.18, w: w * 1.24, h: hh * 1.3 }, S.W, S.H));
    }
    if (faces.length) toast(`Đã thêm ${faces.length} vùng che khuôn mặt.`);
    draw();
  } catch (e) { console.error(e); toast(e.userMsg || "Không chạy được AI tìm khuôn mặt.", { type: "err" }); }
  faceBtn.disabled = false; faceBtn.lastChild.textContent = old;
}

function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }

const css = document.createElement("style");
css.textContent = `.bl-stage{cursor:crosshair}.bl-layer{position:absolute;inset:0}
.bl-box{position:absolute;outline:2px dashed #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5);cursor:move}.bl-box.ell{border-radius:50%}
.bl-box:focus-visible{outline:3px solid var(--brand)}
.bl-h{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;cursor:nwse-resize}.bl-h::after{content:"";position:absolute;inset:6px;background:#fff;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
.bl-x{position:absolute;right:-12px;top:-12px;width:24px;height:24px;border-radius:50%;border:0;background:#E5484D;color:#fff;display:grid;place-items:center;cursor:pointer;padding:0}.bl-x .i{width:14px;height:14px}
@media (hover:none){.bl-h{width:34px;height:34px;margin:-17px 0 0 -17px}.bl-h::after{inset:11px}.bl-x{width:30px;height:30px;right:-15px;top:-15px}}`;
document.head.append(css);
