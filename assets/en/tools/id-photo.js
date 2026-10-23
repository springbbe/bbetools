/* Tự sinh bởi scripts/build.js từ assets/tools/id-photo.js và i18n/en/js/ — đừng sửa tay. */
/* Làm ảnh thẻ: AI tách nền (MODNet, chạy trên máy) → đổi nền → căn khung theo cỡ ảnh → ảnh lẻ 300 dpi + tờ in 10x15 / A4 */
import { h, icon, lib, toast, sampleFiles, fmtNum } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, encode, setJpegDpi } from "../image.js";
import { loadMatting, matte, composite, headBox, detectFaces, headFromFace } from "../ai/matting.js";

const DPI = 300, MM = DPI / 25.4;
const SIZES = {
  "3x4": { w: 30, h: 40, label: "3×4 cm", use: "Applications, résumés, ID cards", head: 0.62, top: 0.1 },
  "4x6": { w: 40, h: 60, label: "4×6 cm", use: "Passports, diplomas, applications", head: 0.6, top: 0.1 },
  "2x3": { w: 20, h: 30, label: "2×3 cm", use: "School and student cards", head: 0.62, top: 0.1 },
  "35x45": { w: 35, h: 45, label: "3,5×4,5 cm", use: "Schengen, Korea, Japan, Australia visas…", head: 0.74, top: 0.07 },
  "5x5": { w: 50.8, h: 50.8, label: "5×5 cm (2×2 in)", use: "US visa", head: 0.6, top: 0.12 }
};
const BGS = [["#FFFFFF", "White"], ["#DCE9F7", "Light blue"], ["#3D7FD1", "Blue"], ["#E6E6E6", "Light gray"], ["keep", "Keep original background"]];
const PAPERS = { "10x15": { w: 101.6, h: 152.4, label: "Photo paper 4×6 in (10×15 cm, 4R)" }, "13x18": { w: 127, h: 177.8, label: "Photo paper 5×7 in (13×18 cm, 5R)" }, a4: { w: 210, h: 297, label: "A4 paper (print at home)" } };

const css = document.createElement("style");
css.textContent = `.idp{display:flex;flex-direction:column;gap:14px;align-items:center}
.idp-stage{position:relative;width:min(100%,320px);border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px var(--line-2),var(--shadow);touch-action:none;cursor:grab;background:repeating-conic-gradient(var(--surface-2) 0 25%,var(--surface) 0 50%) 0 0/16px 16px}
.idp-stage:active{cursor:grabbing}.idp-cv,.idp-ov{position:absolute;inset:0;width:100%;height:100%}.idp-ov{pointer-events:none}
.idp-info{position:absolute;left:8px;right:8px;bottom:8px;background:rgba(0,0,0,.72);color:#fff;border-radius:10px;padding:8px 10px;font-size:13.5px;display:flex;gap:8px;align-items:center}
.idp-ctrl{display:grid;gap:12px;width:min(100%,420px)}.idp-ctrl .field span{display:flex;align-items:center;gap:6px}.idp-ctrl .i{width:17px;height:17px}
.swatches{display:flex;flex-wrap:wrap;gap:10px}.swatches label{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;width:64px;text-align:center}
.swatches input[type=radio]{position:absolute;opacity:0;pointer-events:none}.swatches small{font-size:12px;color:var(--muted);line-height:1.2}
.sw{width:40px;height:40px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);display:grid;place-items:center;overflow:hidden}
.sw.keep{background:linear-gradient(135deg,#8fb4d8,#d9c6a5 55%,#7d9a6a)}.sw.custom{background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)}
.sw.custom input{opacity:0;width:100%;height:100%;cursor:pointer;border:0;padding:0}
.swatches input[type=radio]:checked+.sw{box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--brand)}.swatches input[type=radio]:focus-visible+.sw{outline:3px solid var(--brand);outline-offset:4px}`;
document.head.append(css);

let S = null; // trạng thái biên tập của ảnh đang làm
let F = null; // ctx của khung file
let stage, cv, overlay, zoomIn, rotIn, info; // phần tử của vùng biên tập

fileTool({
  accept: ["image", "heic"], multiple: false, noun: "portrait photos",
  action: "Create ID photo",
  pickLabel: "Choose a portrait photo",
  sample: () => sampleFiles("chan-dung-mau.jpg"),
  warm: () => Promise.all([lib("ort"), loadMatting()]),
  custom: { mount },
  options(el) {
    el.append(
      seg("size", Object.entries(SIZES).map(([k, s]) => [k, s.label]), "3x4", "Photo size"),
      h("p", { class: "hint", id: "size-use" }),
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", id: "bg-l", text: "Background color" }),
        h("div", { class: "swatches", role: "radiogroup", "aria-labelledby": "bg-l" },
          BGS.map(([v, l], i) => h("label", { title: l }, h("input", { type: "radio", name: "bg", value: v, checked: i === 0 }), h("span", { class: "sw" + (v === "keep" ? " keep" : ""), style: v !== "keep" ? { background: v } : null }), h("small", { text: l }))),
          h("label", { title: "Other color" }, h("input", { type: "radio", name: "bg", value: "custom" }), h("span", { class: "sw custom" }, h("input", { type: "color", id: "bg-custom", value: "#9EC5F0", "aria-label": "Choose another background color", onclick: (e) => { e.currentTarget.closest("label").querySelector("input[type=radio]").checked = true; } })), h("small", { text: "Other color" })))),
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Print sheet with multiple photos" }),
        h("select", { id: "paper" }, Object.entries(PAPERS).map(([k, p]) => h("option", { value: k, text: p.label })))),
        h("p", { class: "hint", id: "paper-info" })),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "guides", checked: true }), h("span", { text: "Show guide frame" })));
    return () => ({
      size: radioVal(el, "size"),
      bg: radioVal(el, "bg") === "custom" ? el.querySelector("#bg-custom").value : radioVal(el, "bg"),
      paper: el.querySelector("#paper").value,
      guides: el.querySelector("#guides").checked
    });
  },
  onChange(ctx) {
    const o = ctx.opts;
    const s = SIZES[o.size];
    const u = document.getElementById("size-use"); if (u) u.textContent = s.use;
    const p = PAPERS[o.paper], lay = layout(p, s);
    const pi = document.getElementById("paper-info"); if (pi) pi.textContent = `Fits ${lay.n} ${s.label} photos on one sheet (${lay.cols}×${lay.rows}).`;
    if (S) { if (S.size !== o.size) { S.size = o.size; autoPlace(); } draw(); }
  },
  async onAdd(items, ctx) { await start(items[0], ctx); },
  ready: () => (S && S.mask !== undefined && !S.busy ? true : S && S.busy ? "Removing background…" : "Choose a portrait photo."),
  async run(items, o, ctx) {
    const s = SIZES[o.size];
    ctx.status("Creating photo…"); ctx.progress(-1);
    const W = Math.round(s.w * MM), H = Math.round(s.h * MM);
    const photo = document.createElement("canvas"); photo.width = W; photo.height = H;
    render(photo.getContext("2d"), W, H, o, false);
    const jpg = await setJpegDpi(await encode(photo, "image/jpeg", 0.95, { fast: true }), DPI);
    const outs = [{ blob: jpg, name: `id-photo-${o.size}.jpg`, note: `${W}×${H} px · ${DPI} dpi` }];
    const p = PAPERS[o.paper], lay = layout(p, s);
    if (o.paper === "a4") {
      const L = await lib("pdflib");
      const doc = await L.PDFDocument.create();
      const pt = 72 / 25.4;
      const page = doc.addPage([p.w * pt, p.h * pt]);
      const img = await doc.embedJpg(await jpg.arrayBuffer());
      for (const c of lay.cells) {
        page.drawImage(img, { x: c.x * pt, y: (p.h - c.y - s.h) * pt, width: s.w * pt, height: s.h * pt });
        page.drawRectangle({ x: c.x * pt, y: (p.h - c.y - s.h) * pt, width: s.w * pt, height: s.h * pt, borderColor: L.rgb(0.75, 0.75, 0.75), borderWidth: 0.3 });
      }
      page.drawText(`BbeTools - ${lay.n} anh ${s.w}x${s.h} mm. In dung 100% (khong "vua trang"), cat theo duong vien.`, { x: 8 * pt, y: 5 * pt, size: 7, color: L.rgb(0.55, 0.55, 0.55) });
      outs.push({ blob: new Blob([await doc.save()], { type: "application/pdf" }), name: `id-photo-sheet-${o.size}-a4.pdf`, note: `${lay.n} photos · print at exactly 100% size` });
    } else {
      const sheet = document.createElement("canvas");
      sheet.width = Math.round(lay.pw * MM); sheet.height = Math.round(lay.ph * MM);
      const g = sheet.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, sheet.width, sheet.height);
      for (const c of lay.cells) {
        g.drawImage(photo, Math.round(c.x * MM), Math.round(c.y * MM), W, H);
        g.strokeStyle = "#c8c8c8"; g.lineWidth = 1; g.strokeRect(Math.round(c.x * MM) - 0.5, Math.round(c.y * MM) - 0.5, W + 1, H + 1);
      }
      const b = await setJpegDpi(await encode(sheet, "image/jpeg", 0.95, { fast: true }), DPI);
      outs.push({ blob: b, name: `id-photo-sheet-${o.size}-${o.paper}.jpg`, note: `${lay.n} photos · ${sheet.width}×${sheet.height} px, ${DPI} dpi` });
    }
    return outs;
  },
  doneTitle: () => "Your ID photo is ready!",
  summary: (outs) => "Use the single photo for online submissions; take the print sheet to a photo shop like a normal photo or print at home at exactly 100% size."
});

/* ---------- biên tập ---------- */
function mount(ctx) {
  F = ctx;
  cv = h("canvas", { class: "idp-cv", "aria-label": "ID photo preview. Drag to move, scroll or pinch to zoom.", role: "img" });
  overlay = h("canvas", { class: "idp-ov", "aria-hidden": "true" });
  info = h("div", { class: "idp-info", role: "status" });
  stage = h("div", { class: "idp-stage", tabindex: "0" }, cv, overlay, info);
  zoomIn = h("input", { type: "range", min: 20, max: 400, value: 100, "aria-label": "Zoom in / out", oninput: () => { if (S) { S.z = S.baseZ * (+zoomIn.value / 100); draw(); } } });
  rotIn = h("input", { type: "range", min: -15, max: 15, step: 0.5, value: 0, "aria-label": "Tilt", oninput: () => { if (S) { S.rot = +rotIn.value; draw(); } } });
  ctx.workMain.append(h("div", { class: "idp" },
    stage,
    h("div", { class: "idp-ctrl" },
      h("label", { class: "field" }, h("span", { html: icon("zoom-in") + " Zoom" }), zoomIn),
      h("label", { class: "field" }, h("span", { html: icon("rotate-cw") + " Tilt" }), rotIn),
      h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => { autoPlace(); draw(); } }, h("span", { html: icon("wand-sparkles"), style: { display: "contents" } }), "Auto align"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Choose another photo"))),
    h("p", { class: "hint", html: "Drag the photo to move, scroll / pinch to zoom. Keyboard: click the photo, then use the arrow keys and <kbd>+</kbd> <kbd>−</kbd>. Tip: a straight-on, well-lit photo showing both shoulders gives the best result." })));
  // kéo, phóng to bằng chuột / cảm ứng
  const pts = new Map();
  let last = null;
  stage.addEventListener("pointerdown", (e) => { if (!S) return; stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = snapshot(); });
  stage.addEventListener("pointermove", (e) => {
    if (!S || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const k = S.W / stage.clientWidth;
    if (pts.size === 1) { const [x, y] = [...pts.values()][0]; S.cx = last.cx + (x - last.p[0][0]) * k; S.cy = last.cy + (y - last.p[0][1]) * k; }
    else if (pts.size === 2) {
      const p = [...pts.values()], d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), d0 = Math.hypot(last.p[0][0] - last.p[1][0], last.p[0][1] - last.p[1][1]);
      if (d0 > 0) S.z = Math.max(S.baseZ * 0.2, Math.min(S.baseZ * 4, last.z * d / d0));
    }
    draw();
  });
  const up = (e) => { pts.delete(e.pointerId); last = snapshot(); };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  stage.addEventListener("wheel", (e) => { if (!S) return; e.preventDefault(); S.z = Math.max(S.baseZ * 0.2, Math.min(S.baseZ * 4, S.z * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); draw(); }, { passive: false });
  stage.addEventListener("keydown", (e) => {
    if (!S) return;
    const step = S.W * 0.02;
    const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { S.cx += m[0]; S.cy += m[1]; }
    else if (e.key === "+" || e.key === "=") S.z *= 1.05;
    else if (e.key === "-" || e.key === "_") S.z /= 1.05;
    else return;
    e.preventDefault(); draw();
  });
  function snapshot() { return { cx: S.cx, cy: S.cy, z: S.z, p: [...pts.values()].map((x) => [...x]) }; }
  new ResizeObserver(() => draw()).observe(stage);
}

async function start(it, ctx) {
  S = null;
  info.hidden = false;
  info.textContent = "Reading photo…";
  ctx.status("");
  try {
    const bmp = await decodeImage(it.file);
    const k = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const src = drawScaled(bmp, bmp.width * k, bmp.height * k);
    if (bmp.close) bmp.close();
    S = { src, mask: undefined, comp: null, size: ctx.opts.size, cx: 0, cy: 0, z: 1, baseZ: 1, rot: 0, busy: true };
    rotIn.value = 0;
    autoPlace(); draw();
    info.innerHTML = "<span class=\"spinner sm\"></span> Loading the background-removal AI model…";
    await loadMatting((f) => { info.innerHTML = `<span class="spinner sm"></span> Loading the AI model (${Math.round(f * 100)}%, first time only)…`; });
    info.innerHTML = "<span class=\"spinner sm\"></span> AI is removing the background right on your device…";
    await new Promise((r) => setTimeout(r, 30));
    const t0 = performance.now();
    S.mask = await matte(src);
    S.comp = composite(src, S.mask, null);
    const faces = await detectFaces(src).catch((e) => { console.warn(e); return []; });
    S.faces = faces.length;
    S.head = faces.length ? headFromFace(faces[0], S.mask) : headBox(S.mask);
    S.busy = false;
    autoPlace(); draw();
    info.hidden = true;
    ctx.status(S.faces > 1 ? "The photo has several faces; aligned to the largest one." : S.faces ? `Background removed and framed in ${fmtNum((performance.now() - t0) / 1000, 1)} seconds. Drag or zoom to adjust further.` : "No clear face detected; drag and zoom to fit the frame yourself.", S.faces ? "ok" : "err");
  } catch (e) {
    console.error(e);
    if (S) { S.busy = false; S.mask = null; }
    info.hidden = true;
    ctx.status((e.userMsg || "Couldn't remove the background.") + " You can still use “Keep original background”.", "err");
  }
  ctx.refresh();
}

function autoPlace() {
  if (!S) return;
  const s = SIZES[S.size];
  S.W = Math.round(s.w * MM); S.H = Math.round(s.h * MM);
  const src = S.src;
  if (S.head && S.head.bottom > S.head.top) {
    const headH = S.head.bottom - S.head.top;
    S.z = (S.H * s.head) / headH;
    S.cx = S.W / 2 - (S.head.cx - src.width / 2) * S.z;
    S.cy = S.H * s.top + headH * S.z / 2 + (src.height / 2 - (S.head.top + headH / 2)) * S.z;
    // ảnh chụp sát (thiếu vai): dời xuống để mép dưới ảnh chạm đáy khung, nhưng đỉnh đầu không thấp quá 20%
    const gap = S.H - (S.cy + (src.height / 2) * S.z);
    if (gap > 0) S.cy += Math.min(gap, S.H * (0.2 - s.top));
  } else {
    S.z = Math.max(S.W / src.width, S.H / src.height);
    S.cx = S.W / 2; S.cy = S.H / 2;
  }
  S.baseZ = S.z; S.rot = 0;
  if (zoomIn) zoomIn.value = 100;
  if (rotIn) rotIn.value = 0;
}

/** Vẽ ảnh thẻ vào g (kích thước w×h). preview: vẽ thêm khung hướng dẫn */
function render(g, w, hh, o, preview) {
  const k = w / S.W;
  const bg = o.bg === "keep" || !S.comp ? null : o.bg;
  g.save();
  g.fillStyle = bg || "#ffffff"; g.fillRect(0, 0, w, hh);
  g.translate(S.cx * k, S.cy * k);
  g.rotate((S.rot * Math.PI) / 180);
  g.scale(S.z * k, S.z * k);
  g.imageSmoothingQuality = "high";
  g.drawImage(bg ? S.comp : S.src, -S.src.width / 2, -S.src.height / 2);
  g.restore();
}

function draw() {
  if (!stage || !F) return;
  const o = F.opts, s = SIZES[o.size];
  stage.style.aspectRatio = s.w + " / " + s.h;
  if (!S) return;
  if (S.size !== o.size) { S.size = o.size; autoPlace(); }
  S.W = Math.round(s.w * MM); S.H = Math.round(s.h * MM);
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = Math.max(1, Math.round(stage.clientWidth * dpr)), hh = Math.round((w * s.h) / s.w);
  cv.width = overlay.width = w; cv.height = overlay.height = hh;
  render(cv.getContext("2d"), w, hh, o, true);
  const g = overlay.getContext("2d");
  g.clearRect(0, 0, w, hh);
  if (o.guides) {
    const top = s.top * hh, chin = (s.top + s.head) * hh;
    g.strokeStyle = "rgba(229,72,77,.85)"; g.lineWidth = Math.max(1, dpr); g.setLineDash([6 * dpr, 5 * dpr]);
    g.beginPath(); g.moveTo(0, top); g.lineTo(w, top); g.moveTo(0, chin); g.lineTo(w, chin); g.stroke();
    g.beginPath(); g.ellipse(w / 2, (top + chin) / 2 + (chin - top) * 0.04, (chin - top) * 0.36, (chin - top) * 0.47, 0, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = "rgba(229,72,77,.95)"; g.font = `600 ${11 * dpr}px system-ui, sans-serif`;
    g.fillText("top of head", 6 * dpr, top - 4 * dpr); g.fillText("chin", 6 * dpr, chin - 4 * dpr);
  }
}

/** Xếp ảnh lên giấy: lề 4 mm, khe 2 mm */
function layout(p, s) {
  // A4 luôn để dọc cho dễ in; giấy ảnh thì chọn hướng vừa nhiều ảnh nhất
  const orients = p === PAPERS.a4 ? [[p.w, p.h]] : [[p.w, p.h], [p.h, p.w]];
  return orients.map(([pw, ph]) => {
    const m = 4, gap = 2;
    const cols = Math.max(0, Math.floor((pw - 2 * m + gap) / (s.w + gap))), rows = Math.max(0, Math.floor((ph - 2 * m + gap) / (s.h + gap)));
    const usedW = cols * s.w + (cols - 1) * gap, usedH = rows * s.h + (rows - 1) * gap;
    const x0 = (pw - usedW) / 2, y0 = (ph - usedH) / 2;
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ x: x0 + c * (s.w + gap), y: y0 + r * (s.h + gap) });
    return { pw, ph, cols, rows, n: cols * rows, cells };
  }).sort((a, b) => b.n - a.n)[0];
}

