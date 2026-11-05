/* In CCCD 2 mặt trên 1 trang A4: nhận ảnh chụp mặt trước, mặt sau căn cước → tự tìm mép thẻ (lib/scan.js), bù góc bo tròn,
   nắn về đúng tỉ lệ thẻ ID-1 (85,6 × 54 mm), cân sáng, thêm dòng chữ chéo "Bản sao dùng để…" (tuỳ chọn)
   rồi đặt lên trang A4 đúng kích thước thật bằng pdf-lib. Ảnh chỉ xử lý trên máy, không lưu lại. */
import { h, icon, lib, toast, save, fmtSize, sampleFiles, intake, acceptAttr, takeHandoff, nextFrame, IS_TOUCH, MOD } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { seg, radioVal } from "../frames/file.js";
import { decodeImage } from "../image.js";
import { embedVnFont } from "../pdf.js";
import { MM } from "../lib/pdf-geom.js";
import { toGray, detectCorners, warp } from "../lib/scan.js";
import { CARD, turnQuad, landscapeTurns, cornerFix, refineQuad, layoutCards, toneCard, stampFit, splitStamp } from "../lib/the-cccd.js";
import { FONTS, fontCss, loadFont } from "../fonts.js";

const MAX_SRC = 3000, DETECT = 360, REFINE = 1600, PX = 15; // ảnh thẻ 15 px/mm (~380 dpi)
const OW = Math.round(CARD.w * PX), OH = Math.round(CARD.h * PX);
const SIDES = ["Mặt trước", "Mặt sau"];
const CORNERS = ["trên trái", "trên phải", "dưới phải", "dưới trái"];
const INKS = { gray: "rgba(40,40,40,.42)", red: "rgba(200,30,30,.5)", blue: "rgba(25,60,170,.5)" };
const STAMP_FONT = FONTS.find((f) => f.id === "bvp-800");

const css = document.createElement("style");
css.textContent = `
.cc{display:grid;gap:18px}
.cc-note{display:flex;gap:8px;align-items:flex-start;margin:0;padding:10px 12px;border-radius:12px;background:var(--ok-soft);color:var(--ink);font-size:14px}
.cc-note .i{color:var(--ok);flex:0 0 auto;margin-top:2px}
.cc-slots{display:grid;gap:14px}
@media (min-width:640px){.cc-slots{grid-template-columns:1fr 1fr}}
.cc-slot{display:grid;gap:8px;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--surface);min-width:0}
.cc-slot h3{margin:0;font-size:16px}
.cc-empty{display:grid;place-items:center;gap:6px;aspect-ratio:85.6/54;border:2px dashed var(--line-2);border-radius:12px;background:var(--surface-2);color:var(--muted);cursor:pointer;font:inherit;padding:8px;text-align:center}
.cc-empty:hover,.cc-empty:focus-visible{border-color:var(--brand);color:var(--ink)}
.cc-empty .i{width:30px;height:30px}
.cc-card{width:100%;aspect-ratio:85.6/54;display:block;border-radius:${(CARD.r / CARD.w) * 100}%/${(CARD.r / CARD.h) * 100}%;box-shadow:var(--shadow);background:#fff}
.cc-slot .row{gap:6px}
.cc-warn{color:var(--warn);font-size:13.5px;margin:0}
.cc-ok{color:var(--muted);font-size:13.5px;margin:0}
.cc-edit{display:grid;gap:12px;justify-items:center}
.cc-stage{position:relative;touch-action:none;user-select:none;max-width:100%}
.cc-stage canvas{display:block;max-width:100%;max-height:62vh;border-radius:6px}
.cc-stage svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.cc-h{fill:#fff;stroke:#12A594;cursor:grab;outline:none}
.cc-h.first{fill:#12A594}
.cc-h:focus-visible{stroke:#3E5BF2}
.cc-poly{fill:rgba(18,165,148,.14);stroke:#12A594}
.cc-cols{display:grid;gap:18px}
@media (min-width:900px){.cc-cols{grid-template-columns:minmax(0,1fr) 320px;align-items:start}}
.cc-page{display:grid;justify-items:center;gap:8px;padding:16px;border-radius:14px;background:var(--surface-2)}
.cc-page canvas{width:min(100%,420px);height:auto;background:#fff;box-shadow:var(--shadow);border-radius:2px}
.cc-out{display:grid;gap:10px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
.cc-print{margin:0;padding:10px 12px;border-radius:12px;background:var(--warn-soft);font-size:14px}
`;
document.head.append(css);

// trạng thái (khai báo trước interactiveTool vì mount dùng ngay)
let C = null, slotsEl, editEl, colsEl, pageCv, outEl, optEl, stampIn;
const slots = [null, null]; // { name, src (canvas), pix (ImageData), quad (toạ độ ảnh nguồn, theo hướng thẻ), found, card (canvas OW×OH đã cân sáng) }
let editing = -1, editQuad = null;
const inputs = [];

/* ---------- nhận ảnh ---------- */
async function setSlot(i, file) {
  slotsEl.children[i].querySelector(".cc-body").innerHTML = '<span class="spinner"></span>';
  try {
    const bmp = await decodeImage(file);
    const s = Math.min(1, MAX_SRC / Math.max(bmp.width, bmp.height));
    const src = document.createElement("canvas"); src.width = Math.round(bmp.width * s); src.height = Math.round(bmp.height * s);
    const g = src.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#fff"; g.fillRect(0, 0, src.width, src.height);
    g.drawImage(bmp, 0, 0, src.width, src.height);
    if (bmp.close) bmp.close();
    const q = detectCard(src);
    slots[i] = { name: file.name, src, pix: g.getImageData(0, 0, src.width, src.height), quad: q || defaultQuad(src), found: !!q };
    renderCard(i);
  } catch (e) {
    console.error(e);
    toast(e.userMsg || "Không đọc được ảnh " + file.name, { type: "err" });
    slots[i] = null;
  }
  renderSlot(i);
  refresh();
}
async function addFiles(files) {
  files = [...files];
  for (const f of files) {
    const i = slots.findIndex((s) => !s);
    if (i < 0) { toast("Đã đủ 2 mặt. Bấm “Đổi ảnh” ở mặt cần thay."); break; }
    slots[i] = { loading: true };
    await setSlot(i, f);
  }
}

// tìm mép thẻ trên ảnh thu nhỏ → 4 góc theo hướng thẻ (thẻ nằm ngang), đã bù góc bo tròn
function detectCard(src) {
  const k = DETECT / Math.max(src.width, src.height), w = Math.round(src.width * k), hh = Math.round(src.height * k);
  const c = document.createElement("canvas"); c.width = w; c.height = hh;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(src, 0, 0, w, hh);
  let q = detectCorners(toGray({ data: g.getImageData(0, 0, w, hh).data, width: w, height: hh }), w, hh);
  if (!q) return null;
  // dò lại từng cạnh ở độ phân giải cao (cạnh dài ~1600 px), lấy giao điểm 4 cạnh làm góc thật
  const k2 = Math.min(1, REFINE / Math.max(src.width, src.height)), w2 = Math.round(src.width * k2), h2 = Math.round(src.height * k2);
  c.width = w2; c.height = h2; g.drawImage(src, 0, 0, w2, h2);
  const fine = refineQuad(toGray({ data: g.getImageData(0, 0, w2, h2).data, width: w2, height: h2 }), w2, h2, q.map(([x, y]) => [(x / k) * k2, (y / k) * k2]));
  if (fine) { q = fine.map(([x, y]) => [x / k2, y / k2]); return turnQuad(q, landscapeTurns(q)); }
  // không chắc: dùng góc sơ bộ, bù phần góc bo tròn
  q = q.map(([x, y]) => [x / k, y / k]);
  return cornerFix(turnQuad(q, landscapeTurns(q)));
}
// không tìm thấy: khung đúng tỉ lệ thẻ ở giữa ảnh để người dùng kéo chỉnh
function defaultQuad(src) {
  const land = src.width >= src.height, r = CARD.w / CARD.h;
  let w = src.width * 0.8, hh = w / (land ? r : 1 / r);
  if (hh > src.height * 0.8) { hh = src.height * 0.8; w = hh * (land ? r : 1 / r); }
  const x0 = (src.width - w) / 2, y0 = (src.height - hh) / 2;
  const q = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + hh], [x0, y0 + hh]];
  return land ? q : turnQuad(q, 1);
}
// nắn + cân sáng → ảnh thẻ OW×OH
function renderCard(i) {
  const s = slots[i];
  const img = warp({ data: s.pix.data, width: s.pix.width, height: s.pix.height }, s.quad, OW, OH);
  toneCard(img, opt().filter);
  const c = document.createElement("canvas"); c.width = OW; c.height = OH;
  c.getContext("2d").putImageData(new ImageData(img.data, OW, OH), 0, 0);
  s.card = c;
}

/* ---------- ảnh thẻ hoàn chỉnh: bo góc, chữ chéo, viền ---------- */
function finalCard(s, o, scale = 1) {
  const w = Math.round(OW * scale), hh = Math.round(OH * scale), r = CARD.r * PX * scale;
  const c = document.createElement("canvas"); c.width = w; c.height = hh;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, hh);
  g.save(); g.beginPath(); g.roundRect(0, 0, w, hh, r); g.clip();
  g.imageSmoothingQuality = "high";
  g.drawImage(s.card, 0, 0, w, hh);
  const lines = splitStamp(o.stamp);
  if (lines.length) {
    g.font = fontCss(STAMP_FONT, 100);
    const tw = Math.max(...lines.map((l) => g.measureText(l).width));
    const { angle, size } = stampFit(w, hh, tw, lines.length);
    g.translate(w / 2, hh / 2); g.rotate((angle * Math.PI) / 180);
    g.font = fontCss(STAMP_FONT, size); g.fillStyle = INKS[o.ink] || INKS.gray; g.textAlign = "center"; g.textBaseline = "middle";
    lines.forEach((l, k) => g.fillText(l, 0, (k - (lines.length - 1) / 2) * size * 1.25));
  }
  g.restore();
  if (o.border) { const lw = Math.max(1, 0.2 * PX * scale); g.strokeStyle = "#8a8f98"; g.lineWidth = lw; g.beginPath(); g.roundRect(lw / 2, lw / 2, w - lw, hh - lw, r); g.stroke(); }
  return c;
}

/* ---------- tuỳ chọn ---------- */
function opt() {
  if (!optEl) return { filter: C ? C.store.get("filter", "color") : "color" };
  return {
    filter: radioVal(optEl, "filter"), arrange: radioVal(optEl, "arrange"), copies: +radioVal(optEl, "copies"), pos: radioVal(optEl, "pos"),
    border: optEl.querySelector("#cc-border").checked, ruler: optEl.querySelector("#cc-ruler").checked,
    stamp: stampIn.value, ink: radioVal(optEl, "ink")
  };
}
const filled = () => slots.filter((s) => s && s.card);
function layout(o) {
  const both = slots[0] && slots[0].card && slots[1] && slots[1].card;
  return layoutCards({ copies: o.copies, arrange: o.arrange, pos: o.pos, sides: both ? 2 : 1 });
}
// ảnh thẻ cho ô thứ side (0/1) của bố cục: khi chỉ có một mặt thì luôn là mặt đó
const cardFor = (side) => { const f = filled(); return f.length === 2 ? slots[side] : f[0]; };

/* ---------- xem trước trang A4 ---------- */
let fontReady = null;
async function drawPage(cv, pxPerMm, o) {
  if (splitStamp(o.stamp).length) { fontReady = fontReady || loadFont(STAMP_FONT); await fontReady; }
  cv.width = Math.round(210 * pxPerMm); cv.height = Math.round(297 * pxPerMm);
  const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
  const L = layout(o);
  if (!L || !filled().length) return;
  const cache = {};
  for (const it of L) {
    const s = cardFor(it.side);
    cache[it.side] = cache[it.side] || finalCard(s, o, Math.min(1, (CARD.w * pxPerMm) / OW));
    g.drawImage(cache[it.side], it.x * pxPerMm, it.y * pxPerMm, it.w * pxPerMm, it.h * pxPerMm);
  }
  if (o.ruler) drawRulerCanvas(g, pxPerMm);
}
function drawRulerCanvas(g, k) {
  const x0 = 20 * k, y = 287 * k;
  g.strokeStyle = "#333"; g.lineWidth = Math.max(1, 0.25 * k);
  g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 50 * k, y);
  for (let i = 0; i <= 5; i++) { g.moveTo(x0 + i * 10 * k, y); g.lineTo(x0 + i * 10 * k, y - (i % 5 ? 1.5 : 3) * k); }
  g.stroke();
  g.fillStyle = "#333"; g.font = `${2.6 * k}px 'Be Vietnam Pro', sans-serif`; g.textBaseline = "alphabetic";
  g.fillText(RULER_TEXT, x0 + 53 * k, y);
}
const RULER_TEXT = "Thước kiểm tra: in đúng tỉ lệ 100% thì đoạn này dài đúng 5 cm.";
let pv = 0;
async function refresh() {
  if (!pageCv) return;
  const n = ++pv, o = opt();
  optEl.querySelector("#cc-pos").hidden = o.copies !== 1;
  optEl.querySelector("#cc-ink").hidden = !splitStamp(o.stamp).length;
  const tmp = document.createElement("canvas");
  await drawPage(tmp, 2.4, o);
  if (n !== pv) return;
  pageCv.width = tmp.width; pageCv.height = tmp.height; pageCv.getContext("2d").drawImage(tmp, 0, 0);
  const f = filled().length;
  colsEl.querySelector("#cc-go").disabled = !f;
  colsEl.querySelector("#cc-status").textContent = !f ? "Chọn ảnh mặt trước và mặt sau để xem trước." : f === 1 ? "Mới có một mặt: trang sẽ chỉ in mặt này." : "";
  outEl.hidden = true;
}

/* ---------- ô mặt trước / mặt sau ---------- */
function renderSlot(i) {
  const s = slots[i], body = slotsEl.children[i].querySelector(".cc-body");
  body.textContent = "";
  if (!s || s.loading) {
    if (s && s.loading) { body.innerHTML = '<span class="spinner"></span>'; return; }
    body.append(h("button", { class: "cc-empty", type: "button", onclick: () => inputs[i].click(), "aria-label": "Chọn ảnh " + SIDES[i].toLowerCase() },
      h("span", { html: icon(i ? "rotate-ccw-square" : "id-card") }), h("b", { text: "Chọn ảnh " + SIDES[i].toLowerCase() }),
      h("small", { text: IS_TOUCH ? "Chụp bằng camera hoặc chọn ảnh có sẵn" : "hoặc kéo thả, dán ảnh vào trang" })));
    return;
  }
  const prev = finalCard(s, { stamp: "" }, 0.4);
  prev.className = "cc-card"; prev.setAttribute("role", "img"); prev.setAttribute("aria-label", SIDES[i] + " sau khi cắt và nắn thẳng");
  body.append(prev,
    s.found ? h("p", { class: "cc-ok", text: "Đã tự cắt theo mép thẻ. Nếu lệch, bấm “Chỉnh góc”." }) : h("p", { class: "cc-warn", text: "Chưa tìm rõ mép thẻ: bấm “Chỉnh góc” để kéo 4 góc tới 4 góc thẻ." }),
    h("div", { class: "row" },
      btn("crop", "Chỉnh góc", () => openEditor(i)),
      btn("rotate-cw", "Xoay", () => { s.quad = turnQuad(s.quad, 1); renderCard(i); renderSlot(i); refresh(); }),
      btn("refresh-cw", "Đổi ảnh", () => inputs[i].click()),
      btn("trash-2", "Bỏ", () => { slots[i] = null; renderSlot(i); refresh(); })));
}
const btn = (ico, label, onclick) => h("button", { class: "btn ghost sm", type: "button", onclick }, h("span", { html: icon(ico), style: { display: "contents" } }), label);

/* ---------- chỉnh góc ---------- */
let stage, ecv, svg;
function openEditor(i) {
  editing = i;
  const s = slots[i];
  editQuad = s.quad.map((p) => p.slice());
  show("edit");
  editEl.textContent = "";
  ecv = h("canvas", { "aria-hidden": "true" });
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  stage = h("div", { class: "cc-stage" }, ecv, svg);
  editEl.append(
    h("h2", { style: { margin: 0, fontSize: "19px" }, text: "Chỉnh góc " + SIDES[i].toLowerCase() }),
    h("p", { class: "hint", role: "status", style: { textAlign: "center", margin: 0 }, text: "Kéo 4 chấm tới đúng 4 góc thẻ. Chấm tô đặc là góc trên trái của thẻ (bấm “Xoay” nếu thẻ bị ngược)." }),
    stage,
    h("div", { class: "row", style: { justifyContent: "center" } },
      btn("wand-sparkles", "Tự tìm mép thẻ", () => { const q = detectCard(s.src); if (q) { editQuad = q; drawEditor(); } else toast("Chưa tìm thấy thẻ, hãy kéo các góc bằng tay."); }),
      btn("rotate-cw", "Xoay", () => { editQuad = turnQuad(editQuad, 1); drawEditor(); })),
    h("div", { class: "row", style: { justifyContent: "center" } },
      h("button", { class: "btn ghost", type: "button", text: "Huỷ", onclick: closeEditor }),
      h("button", { class: "btn big", type: "button", onclick: () => { s.quad = editQuad; s.found = true; renderCard(i); closeEditor(); } }, h("span", { html: icon("check"), style: { display: "contents" } }), "Xong")));
  drawEditor();
  svg.querySelector(".cc-h").focus({ preventScroll: true });
}
function closeEditor() { const i = editing; editing = -1; show("main"); if (i >= 0) { renderSlot(i); refresh(); slotsEl.children[i].scrollIntoView({ block: "nearest" }); } }
function drawEditor() {
  const { src } = slots[editing];
  const s = Math.min(1, 1400 / Math.max(src.width, src.height));
  ecv.width = Math.round(src.width * s); ecv.height = Math.round(src.height * s);
  ecv.getContext("2d").drawImage(src, 0, 0, ecv.width, ecv.height);
  svg.setAttribute("viewBox", `0 0 ${src.width} ${src.height}`);
  const r = Math.max(src.width, src.height) / (IS_TOUCH ? 30 : 50);
  svg.innerHTML = `<polygon class="cc-poly" points="${editQuad.map((p) => p.join(",")).join(" ")}" style="stroke-width:${r / 5}"/>` +
    editQuad.map((p, i) => `<circle class="cc-h${i ? "" : " first"}" tabindex="0" role="slider" aria-label="Góc ${CORNERS[i]} của thẻ – dùng phím mũi tên để dịch, Shift để dịch nhanh" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="${r}" style="stroke-width:${r / 4}"/>`).join("");
  const clamp = (x, y) => [Math.max(0, Math.min(src.width, x)), Math.max(0, Math.min(src.height, y))];
  svg.querySelectorAll(".cc-h").forEach((c) => {
    const i = +c.dataset.i;
    c.addEventListener("pointerdown", (e) => {
      e.preventDefault(); c.setPointerCapture(e.pointerId); c.focus();
      const move = (ev) => { const b = svg.getBoundingClientRect(); editQuad[i] = clamp(((ev.clientX - b.left) / b.width) * src.width, ((ev.clientY - b.top) / b.height) * src.height); refreshPoly(); };
      c.addEventListener("pointermove", move);
      c.addEventListener("pointerup", () => c.removeEventListener("pointermove", move), { once: true });
    });
    c.addEventListener("keydown", (e) => {
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!k) return;
      e.preventDefault();
      const st = (e.shiftKey ? 0.03 : 0.004) * Math.max(src.width, src.height);
      editQuad[i] = clamp(editQuad[i][0] + k[0] * st, editQuad[i][1] + k[1] * st);
      refreshPoly();
    });
  });
}
function refreshPoly() {
  svg.querySelector(".cc-poly").setAttribute("points", editQuad.map((p) => p.join(",")).join(" "));
  svg.querySelectorAll(".cc-h").forEach((c, i) => { c.setAttribute("cx", editQuad[i][0]); c.setAttribute("cy", editQuad[i][1]); });
}
function show(step) {
  editEl.hidden = step !== "edit";
  slotsEl.parentElement.querySelectorAll(":scope > :not(.cc-edit)").forEach((e) => { e.hidden = step === "edit"; });
}

/* ---------- xuất PDF, ảnh ---------- */
async function makePdf() {
  const o = opt(), L = layout(o);
  if (!L || !filled().length) return;
  const go = colsEl.querySelector("#cc-go"), st = colsEl.querySelector("#cc-status");
  go.disabled = true; st.textContent = "Đang tạo PDF…";
  await nextFrame();
  try {
    if (splitStamp(o.stamp).length) { fontReady = fontReady || loadFont(STAMP_FONT); await fontReady; }
    const P = await lib("pdflib");
    const doc = await P.PDFDocument.create();
    // không ghi thông tin cá nhân vào thuộc tính file
    doc.setTitle("Bản in căn cước 2 mặt"); doc.setCreator("BbeTools – In CCCD 2 mặt"); doc.setProducer("BbeTools");
    const page = doc.addPage([210 * MM, 297 * MM]);
    const imgs = {};
    for (const it of L) {
      if (!imgs[it.side]) {
        const c = finalCard(cardFor(it.side), o);
        const bytes = new Uint8Array(await (await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9))).arrayBuffer());
        imgs[it.side] = await doc.embedJpg(bytes);
      }
      page.drawImage(imgs[it.side], { x: it.x * MM, y: (297 - it.y - it.h) * MM, width: it.w * MM, height: it.h * MM });
    }
    if (o.ruler) {
      const font = await embedVnFont(doc);
      const k = MM, x0 = 20 * k, y = 10 * k, ink = P.rgb(0.2, 0.2, 0.2), th = 0.25 * k;
      page.drawLine({ start: { x: x0, y }, end: { x: x0 + 50 * k, y }, thickness: th, color: ink });
      for (let i = 0; i <= 5; i++) page.drawLine({ start: { x: x0 + i * 10 * k, y }, end: { x: x0 + i * 10 * k, y: y + (i % 5 ? 1.5 : 3) * k }, thickness: th, color: ink });
      page.drawText(RULER_TEXT, { x: x0 + 53 * k, y, size: 7.4, font, color: ink });
    }
    const blob = new Blob([await doc.save()], { type: "application/pdf" });
    showResult(blob, o);
    save(blob, "cccd-2-mat.pdf");
    st.textContent = "";
  } catch (e) { console.error(e); st.textContent = e.userMsg || "Không tạo được PDF: " + e.message; }
  go.disabled = false;
}
function showResult(blob, o) {
  outEl.textContent = "";
  const url = URL.createObjectURL(blob);
  outEl.append(
    h("p", { class: "summary", style: { margin: 0 }, text: `Đã tạo cccd-2-mat.pdf · trang A4 · ${fmtSize(blob.size)}` }),
    h("p", { class: "cc-print", html: "<b>Khi in:</b> chọn khổ A4, tỉ lệ <b>100%</b> (hoặc “Kích thước thật”, “Actual size”), <b>không</b> chọn “Vừa trang” (Fit to page) để thẻ in ra đúng 85,6 × 54 mm." + (o.ruler ? " Đo thước ở chân trang để kiểm tra." : "") }),
    h("div", { class: "row" },
      h("button", { class: "btn big", type: "button", onclick: () => save(blob, "cccd-2-mat.pdf") }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải PDF"),
      h("a", { class: "btn ghost", href: url, target: "_blank", rel: "noopener" }, h("span", { html: icon("printer"), style: { display: "contents" } }), "Mở để in"),
      h("button", { class: "btn ghost", type: "button", onclick: saveJpg }, h("span", { html: icon("image"), style: { display: "contents" } }), "Tải ảnh JPG")));
  outEl.hidden = false;
  outEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
// cả trang A4 thành ảnh 200 dpi (gửi qua Zalo, email); in ảnh thì khó giữ đúng kích thước thật hơn PDF
async function saveJpg() {
  const c = document.createElement("canvas");
  await drawPage(c, 200 / 25.4, opt());
  c.toBlob((b) => save(b, "cccd-2-mat.jpg"), "image/jpeg", 0.9);
}

/* ---------- dựng giao diện ---------- */
interactiveTool({
  mount(el, ctx) {
    C = ctx;
    const acc = acceptAttr(["image", "heic"]);
    for (let i = 0; i < 2; i++) {
      const inp = h("input", { type: "file", accept: acc, hidden: true });
      inp.addEventListener("change", () => { const f = inp.files[0]; inp.value = ""; if (f) setSlot(i, f); });
      inputs.push(inp); el.append(inp);
    }
    intake({ accept: ["image", "heic"], multiple: true, onFiles: addFiles, enabled: () => editing < 0, label: "Thả ảnh mặt trước, mặt sau vào đây" });
    slotsEl = h("div", { class: "cc-slots" }, SIDES.map((t) => h("section", { class: "cc-slot", "aria-label": t }, h("h3", { text: t }), h("div", { class: "cc-body" }))));
    editEl = h("section", { class: "cc-edit", hidden: true, "aria-label": "Chỉnh góc thẻ" });
    pageCv = h("canvas", { role: "img", "aria-label": "Xem trước trang A4" });
    outEl = h("div", { class: "cc-out", hidden: true, "aria-live": "polite" });
    stampIn = h("input", { class: "input", id: "cc-stamp", type: "text", maxlength: 90, value: ctx.store.get("stamp", ""), placeholder: "VD: Bản sao dùng để làm hồ sơ vay vốn", autocomplete: "off" });
    const sv = (k, d) => ctx.store.get(k, d);
    optEl = h("aside", { class: "opt-group" },
      seg("filter", [["color", "Màu"], ["gray", "Xám"], ["none", "Ảnh gốc"]], sv("filter", "color"), "Màu ảnh"),
      seg("arrange", [["stack", "Trên – dưới"], ["side", "Cạnh nhau"]], sv("arrange", "stack"), "Cách xếp 2 mặt"),
      seg("copies", [["1", "1 bộ"], ["2", "2 bộ"], ["4", "4 bộ"]], sv("copies", "1"), "Số bộ trên trang"),
      h("div", { id: "cc-pos" }, seg("pos", [["center", "Giữa trang"], ["top", "Phía trên"]], sv("pos", "center"), "Vị trí")),
      h("label", { class: "field" }, h("span", { text: "Chữ chéo trên ảnh (không bắt buộc)" }), stampIn,
        h("small", { text: "Ghi mục đích bản sao để người khác không dùng vào việc khác. Chữ được in thẳng vào ảnh." })),
      h("div", { id: "cc-ink" }, seg("ink", [["gray", "Xám"], ["red", "Đỏ"], ["blue", "Xanh"]], sv("ink", "gray"), "Màu chữ")),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "cc-border", checked: sv("border", true) }), h("span", null, "Viền mỏng quanh thẻ", h("small", { text: "Dễ cắt rời khi cần." }))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "cc-ruler", checked: sv("ruler", false) }), h("span", null, "Thước kiểm tra 5 cm ở chân trang", h("small", { text: "Đo để chắc máy in giữ đúng kích thước thật." }))));
    const remember = () => { const o = opt(); for (const k of ["filter", "arrange", "pos", "ink", "border", "ruler", "stamp"]) ctx.store.set(k, o[k]); ctx.store.set("copies", String(o.copies)); };
    let lastFilter = opt().filter;
    optEl.addEventListener("change", () => {
      remember();
      const f = opt().filter;
      if (f !== lastFilter) { lastFilter = f; slots.forEach((s, i) => { if (s && s.card) { renderCard(i); renderSlot(i); } }); }
      refresh();
    });
    let t = 0;
    stampIn.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { remember(); refresh(); }, 250); });
    colsEl = h("div", { class: "cc-cols" },
      h("div", { class: "cc-page" }, pageCv, h("p", { class: "hint", style: { margin: 0 }, text: "Xem trước trang A4. Thẻ được đặt đúng 85,6 × 54 mm." })),
      h("div", { style: { display: "grid", gap: "14px" } }, optEl,
        h("p", { class: "status", id: "cc-status", role: "status" }),
        h("button", { class: "btn big block", id: "cc-go", type: "button", disabled: true, onclick: makePdf }, h("span", { html: icon("file-down"), style: { display: "contents" } }), "Tạo PDF A4"),
        outEl));
    el.append(h("div", { class: "cc" },
      h("p", { class: "cc-note" }, h("span", { html: icon("shield-check"), style: { display: "contents" } }),
        h("span", { text: "Ảnh căn cước chỉ được xử lý ngay trên máy của bạn: không tải lên mạng, không lưu lại sau khi đóng trang." })),
      slotsEl,
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "btn ghost", type: "button", onclick: async () => { slots[0] = slots[1] = null; await addFiles(await sampleFiles("cccd-mat-truoc.jpg", "cccd-mat-sau.jpg")); } },
          h("span", { html: icon("sparkles"), style: { display: "contents" } }), "Thử với ảnh mẫu"),
        IS_TOUCH ? null : h("span", { class: "hint", html: `Có thể kéo thả cả 2 ảnh cùng lúc hoặc dán bằng <kbd>${MOD}</kbd> + <kbd>V</kbd>.` })),
      editEl, colsEl));
    renderSlot(0); renderSlot(1);
    refresh();
    takeHandoff().then((fs) => { if (fs.length) addFiles(fs); });
  }
});
