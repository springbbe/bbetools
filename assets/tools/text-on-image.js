/* Chèn chữ lên ảnh: nhiều lớp chữ tiếng Việt, chọn font, cỡ, màu, viền, bóng đổ, nền chữ; kéo chữ trên ảnh để đặt chỗ.
   Cỡ chữ và vị trí tính theo tỉ lệ ảnh nên ảnh xuất ra giống hệt bản xem trước. */
import { h, icon, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode, EXT, formatOptions, outType } from "../image.js";
import { FONTS, fontCss, loadFont } from "../fonts.js";

let S = null, F = null, stage, view, panel, layerList, getFmt = null, sel = 0, boxes = [];
const newLayer = (n) => ({ text: n ? "Chữ mới" : "Chào buổi sáng!", font: "bvp-800", size: 8, color: "#FFFFFF", stroke: true, strokeColor: "#000000", strokeW: 12, shadow: true, band: false, align: "center", x: 0.5, y: n ? 0.5 : 0.85 });
const fontOf = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

/** Vẽ một lớp chữ lên g (ảnh W×H); trả về hộp bao { x, y, w, h } (toạ độ g) để bấm chọn */
function paintLayer(g, L, W, H) {
  const lines = L.text.split("\n");
  const px = (W * L.size) / 100, lh = px * 1.22, f = fontOf(L.font);
  g.save();
  g.font = fontCss(f, px); g.textAlign = L.align; g.textBaseline = "middle"; g.lineJoin = "round";
  const widths = lines.map((l) => g.measureText(l).width), bw = Math.max(1, ...widths), bh = lh * lines.length;
  const cx = L.x * W, cy = L.y * H;
  const left = L.align === "left" ? cx : L.align === "right" ? cx - bw : cx - bw / 2;
  const box = { x: left - px * 0.3, y: cy - bh / 2 - px * 0.15, w: bw + px * 0.6, h: bh + px * 0.3 };
  if (L.band) { g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); if (g.roundRect) g.roundRect(box.x, box.y, box.w, box.h, px * 0.2); else g.rect(box.x, box.y, box.w, box.h); g.fill(); }
  lines.forEach((l, i) => {
    const y = cy - bh / 2 + lh * (i + 0.5);
    if (L.shadow) { g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = px * 0.12; g.shadowOffsetY = px * 0.05; }
    if (L.stroke && L.strokeW) { g.strokeStyle = L.strokeColor; g.lineWidth = (px * L.strokeW) / 100; g.strokeText(l, cx, y); g.shadowColor = "transparent"; }
    g.fillStyle = L.color; g.fillText(l, cx, y);
    g.shadowColor = "transparent";
  });
  g.restore();
  return box;
}

fileTool({
  accept: ["image", "heic"], multiple: false, noun: "ảnh",
  action: "Lưu ảnh",
  sample: () => sampleFiles("anh-phong-canh.jpg"),
  custom: { mount },
  options(el) {
    const inp = (id, attrs) => h("input", { id, ...attrs });
    layerList = h("div", { class: "seg full tx-layers", role: "radiogroup", "aria-label": "Các lớp chữ" });
    panel = h("div", { class: "opt-group" },
      h("label", { class: "field" }, h("span", { text: "Nội dung (Enter để xuống dòng)" }), h("textarea", { class: "textarea", id: "t-text", rows: 3, value: newLayer(0).text })),
      h("label", { class: "field" }, h("span", { text: "Font chữ" }), h("select", { id: "t-font" }, FONTS.map((f) => h("option", { value: f.id, text: f.label })))),
      h("p", { class: "opt-title", text: "Cỡ chữ" }), h("div", { class: "range-row" }, inp("t-size", { type: "range", min: 2, max: 30, step: 0.5, value: 8, "aria-label": "Cỡ chữ" }), h("output", { id: "t-size-v" })),
      h("div", { class: "two" },
        h("label", { class: "field color-in" }, h("span", { text: "Màu chữ" }), inp("t-color", { type: "color", value: "#ffffff", "aria-label": "Màu chữ" })),
        h("label", { class: "field color-in" }, h("span", { text: "Màu viền" }), inp("t-scolor", { type: "color", value: "#000000", "aria-label": "Màu viền" }))),
      h("label", { class: "switch" }, inp("t-stroke", { type: "checkbox", checked: true }), h("span", { text: "Viền chữ" })),
      h("div", { class: "range-row", id: "g-sw" }, inp("t-sw", { type: "range", min: 2, max: 30, value: 12, "aria-label": "Độ dày viền" }), h("output", { id: "t-sw-v" })),
      h("label", { class: "switch" }, inp("t-shadow", { type: "checkbox", checked: true }), h("span", { text: "Bóng đổ" })),
      h("label", { class: "switch" }, inp("t-band", { type: "checkbox" }), h("span", { text: "Dải nền tối sau chữ" })),
      seg("t-align", [["left", "Trái"], ["center", "Giữa"], ["right", "Phải"]], "center", "Căn lề"),
      h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => { if (!S) return; S.layers.push(newLayer(S.layers.length)); sel = S.layers.length - 1; syncPanel(); draw(); } }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Thêm chữ"),
        h("button", { class: "btn ghost sm", type: "button", id: "t-del", onclick: () => { if (!S || !S.layers.length) return; S.layers.splice(sel, 1); sel = Math.max(0, sel - 1); syncPanel(); draw(); } }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Xoá lớp này")));
    el.append(h("div", { class: "opt-group", id: "g-layers" }, h("p", { class: "opt-title", text: "Lớp chữ" }), layerList), panel);
    getFmt = formatOptions(el, { q: 92 });
    panel.addEventListener("input", fromPanel); panel.addEventListener("change", fromPanel);
    return () => getFmt();
  },
  async onAdd(items, ctx) { await start(items[0], ctx); },
  ready: () => (!S ? "Đang đọc ảnh…" : S.layers.some((l) => l.text.trim()) ? true : "Hãy nhập chữ cần chèn."),
  async run(items, o, ctx) {
    ctx.status("Đang vẽ chữ lên ảnh…"); ctx.progress(-1);
    await Promise.all(S.layers.map((l) => loadFont(fontOf(l.font))));
    const type = outType(S.it.file, o), c = canvas(S.W, S.H), g = c.getContext("2d");
    if (type === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, S.W, S.H); }
    g.drawImage(S.bmp, 0, 0);
    for (const L of S.layers) if (L.text.trim()) paintLayer(g, L, S.W, S.H);
    const blob = await encode(c, type, o.q);
    c.width = c.height = 0;
    return [{ blob, name: `${baseName(S.it.name)}-chen-chu.${EXT[type]}`, note: `${S.W}×${S.H}` }];
  },
  doneTitle: () => "Đã chèn chữ lên ảnh!"
});

function fromPanel() {
  if (!S || !S.layers[sel]) return;
  const v = (id) => panel.querySelector("#" + id);
  Object.assign(S.layers[sel], {
    text: v("t-text").value, font: v("t-font").value, size: +v("t-size").value, color: v("t-color").value, strokeColor: v("t-scolor").value,
    stroke: v("t-stroke").checked, strokeW: +v("t-sw").value, shadow: v("t-shadow").checked, band: v("t-band").checked, align: radioVal(panel, "t-align")
  });
  labels();
  loadFont(fontOf(S.layers[sel].font)).then(draw);
  draw();
}
function syncPanel() {
  const L = S && S.layers[sel];
  panel.hidden = !L;
  labels();
  if (!L) return;
  const v = (id) => panel.querySelector("#" + id);
  v("t-text").value = L.text; v("t-font").value = L.font; v("t-size").value = L.size; v("t-color").value = L.color; v("t-scolor").value = L.strokeColor;
  v("t-stroke").checked = L.stroke; v("t-sw").value = L.strokeW; v("t-shadow").checked = L.shadow; v("t-band").checked = L.band;
  panel.querySelector(`input[name="t-align"][value="${L.align}"]`).checked = true;
  labels();
}
function labels() {
  const v = (id) => panel.querySelector("#" + id), L = S && S.layers[sel];
  if (L) { v("t-size-v").textContent = L.size + "%"; v("t-sw-v").textContent = L.strokeW; v("g-sw").hidden = !L.stroke; }
  layerList.textContent = "";
  layerList.parentNode.hidden = !S || S.layers.length < 2;
  (S ? S.layers : []).forEach((l, i) => layerList.append(h("label", null,
    h("input", { type: "radio", name: "t-layer", value: i, checked: i === sel, onchange: () => { sel = i; syncPanel(); draw(); } }),
    h("span", { text: (l.text.split("\n")[0] || "(trống)").slice(0, 14) }))));
}

function mount(ctx) {
  F = ctx;
  view = h("canvas", { role: "img", "aria-label": "Xem trước ảnh có chữ. Kéo chữ để di chuyển." });
  stage = h("div", { class: "ist-stage tx-stage", tabindex: "0", hidden: true, "aria-label": "Ảnh. Bấm vào rồi dùng phím mũi tên để di chuyển lớp chữ đang chọn." }, view);
  const loading = h("p", { class: "ist-loading", html: '<span class="spinner sm"></span> Đang đọc ảnh…' });
  ctx.workMain.append(h("div", { class: "ist" }, loading, stage,
    h("div", { class: "row" }, h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Chọn ảnh khác")),
    h("p", { class: "hint", text: "Kéo chữ trên ảnh để đặt vị trí; bấm vào một chữ để chọn và sửa. Bàn phím: bấm vào ảnh rồi dùng phím mũi tên." })));
  ctx.loading = loading;
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (!S) return;
    const b = view.getBoundingClientRect(), k = view.width / b.width;
    const x = (e.clientX - b.left) * k, y = (e.clientY - b.top) * k;
    // chọn lớp trên cùng chứa điểm bấm
    let hit = -1;
    for (let i = boxes.length - 1; i >= 0; i--) { const q = boxes[i]; if (q && x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) { hit = i; break; } }
    if (hit < 0) return;
    e.preventDefault();
    stage.setPointerCapture(e.pointerId);
    if (hit !== sel) { sel = hit; syncPanel(); }
    drag = { sx: e.clientX, sy: e.clientY, x0: S.layers[sel].x, y0: S.layers[sel].y, bw: b.width, bh: b.height };
    draw();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const L = S.layers[sel];
    L.x = Math.min(1, Math.max(0, drag.x0 + (e.clientX - drag.sx) / drag.bw));
    L.y = Math.min(1, Math.max(0, drag.y0 + (e.clientY - drag.sy) / drag.bh));
    draw();
  });
  const end = () => { drag = null; };
  stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
  stage.addEventListener("keydown", (e) => {
    const L = S && S.layers[sel];
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!L || !d) return;
    e.preventDefault();
    const st = e.shiftKey ? 0.05 : 0.01;
    L.x = Math.min(1, Math.max(0, L.x + d[0] * st)); L.y = Math.min(1, Math.max(0, L.y + d[1] * st));
    draw();
  });
}

async function start(it, ctx) {
  if (S && S.bmp.close) S.bmp.close();
  S = null; stage.hidden = true; ctx.loading.hidden = false; ctx.refresh();
  try {
    const bmp = await decodeImage(it.file);
    const small = drawScaled(bmp, ...fit(bmp, 1400));
    S = { it, bmp, W: bmp.width, H: bmp.height, small, layers: [newLayer(0)] };
    sel = 0;
    view.width = small.width; view.height = small.height;
    it.info = `${S.W}×${S.H}`;
    stage.hidden = false; ctx.loading.hidden = true;
    syncPanel();
    await loadFont(FONTS[0]);
    draw();
  } catch (e) { console.error(e); ctx.loading.hidden = true; ctx.status(e.userMsg || "Không đọc được ảnh này.", "err"); }
  ctx.refresh();
}

function draw() {
  if (!S) return;
  const g = view.getContext("2d");
  g.drawImage(S.small, 0, 0);
  boxes = S.layers.map((L) => (L.text ? paintLayer(g, L, view.width, view.height) : null));
  const b = boxes[sel];
  if (b && S.layers.length) { g.save(); g.setLineDash([6, 4]); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = Math.max(1, view.width / 600); g.strokeRect(b.x, b.y, b.w, b.h); g.restore(); }
  if (F) F.refresh();
}

function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }

const css = document.createElement("style");
css.textContent = ".tx-stage{cursor:move}.tx-layers span{max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}";
document.head.append(css);
