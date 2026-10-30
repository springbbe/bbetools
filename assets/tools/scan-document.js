/* Scan tài liệu bằng camera: chụp (hoặc chọn ảnh có sẵn), tự tìm 4 góc tờ giấy, kéo chỉnh góc, nắn thẳng,
   làm trắng nền / xám / đen trắng, sắp xếp nhiều trang rồi xuất PDF. Mọi xử lý ảnh chạy trên máy. */
import { h, icon, lib, toast, save, fmtSize, sampleFiles, intake, toolsForFiles, sendTo, registry, ROOT, nextFrame, IS_TOUCH, toolHref } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { seg, radioVal } from "../frames/file.js";
import { decodeImage } from "../image.js";
import { MM, PAPER, fitBox } from "../lib/pdf-geom.js";
import { toGray, detectCorners, quadSize, warp, enhance, rotate90 } from "../lib/scan.js";

const MAX_SRC = 3000, MAX_OUT = 2200, DETECT = 360;
const FILTERS = [["color", "Màu"], ["gray", "Xám"], ["bw", "Đen trắng"], ["none", "Gốc"]];

const css = document.createElement("style");
css.textContent = `
.sc{display:flex;flex-direction:column;gap:16px}
.sc-start{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:30px 12px}
.sc-start .row{justify-content:center}
.sc-cam{position:relative;background:#000;border-radius:14px;overflow:hidden;max-height:72vh;display:grid;place-items:center}
.sc-cam video{width:100%;max-height:72vh;object-fit:contain;display:block}
.sc-cam svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sc-cam .bar{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;align-items:center;gap:22px;padding:14px;background:linear-gradient(transparent,rgba(0,0,0,.6))}
.sc-shot{width:68px;height:68px;border-radius:50%;border:4px solid #fff;background:rgba(255,255,255,.25)}
.sc-shot:active{background:#fff}
.sc-cam .bar .btn{background:rgba(0,0,0,.55);color:#fff;border-color:rgba(255,255,255,.5)}
.sc-edit{display:grid;gap:12px;justify-items:center}
.sc-stage{position:relative;touch-action:none;user-select:none;max-width:100%}
.sc-stage canvas{display:block;max-width:100%;max-height:62vh;border-radius:6px}
.sc-stage svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.sc-h{fill:#fff;stroke:#12A594;stroke-width:3;cursor:grab;outline:none}
.sc-h:focus-visible{stroke:#3E5BF2;stroke-width:5}
.sc-poly{fill:rgba(18,165,148,.14);stroke:#12A594;stroke-width:2.5}
.sc-pages{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.sc-pg{display:flex;flex-direction:column;gap:4px;align-items:center}
.sc-pg img{width:100%;aspect-ratio:1/1.35;object-fit:contain;background:var(--surface-2);border-radius:8px;border:1px solid var(--line)}
.sc-pg .row{gap:0;justify-content:center}
.sc-out{display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
@media (min-width:900px){.sc-cols{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}}
`;
document.head.append(css);

let C = null, root, startEl, camEl, editEl, listEl, sideEl, outEl, video, overlay, stream = null, liveTimer = 0;
let pages = [], editing = null, queue = []; // editing: { src (ImageBitmap/canvas), quad (px nguồn), rot, filter, index (sửa trang cũ) }
const uid = (() => { let n = 0; return () => ++n; })();

/* ---------- nhận ảnh ---------- */
// nhiều ảnh: mở lần lượt từng ảnh, ảnh sau mở khi đã lưu hoặc bỏ ảnh trước
async function addImages(files) {
  queue.push(...files);
  if (!editing) await nextImage();
}
async function nextImage() {
  while (queue.length) {
    const f = queue.shift();
    try { await openEditor(await decodeImage(f)); return true; }
    catch (e) { toast(e.userMsg || "Không đọc được ảnh " + f.name, { type: "err" }); }
  }
  return false;
}
async function afterEdit() { editing = null; if (!(await nextImage())) { renderList(); show(pages.length ? "list" : "start"); } }
function capped(src) {
  const s = Math.min(1, MAX_SRC / Math.max(src.width, src.height));
  const c = document.createElement("canvas"); c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  if (src.close) src.close();
  return c;
}
function detect(src) {
  const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height; // <video> dùng videoWidth/videoHeight
  if (!sw || !sh) return null;
  const k = DETECT / Math.max(sw, sh), w = Math.round(sw * k), hh = Math.round(sh * k);
  const c = document.createElement("canvas"); c.width = w; c.height = hh;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(src, 0, 0, w, hh);
  const q = detectCorners(toGray({ data: g.getImageData(0, 0, w, hh).data, width: w, height: hh }), w, hh);
  return q ? q.map(([x, y]) => [x / k, y / k]) : null;
}
const fullQuad = (src) => { const m = Math.round(Math.min(src.width, src.height) * 0.03); return [[m, m], [src.width - m, m], [src.width - m, src.height - m], [m, src.height - m]]; };

/* ---------- camera ---------- */
async function openCamera() {
  show("cam");
  try { stream = await C.camera(video, { facing: "environment", width: 3840, height: 2160 }); }
  catch (e) { toast(e.userMsg || e.message, { type: "err" }); show(pages.length ? "list" : "start"); return; }
  C.wakeLock(true);
  clearInterval(liveTimer);
  // khung xanh theo tờ giấy trong lúc ngắm
  liveTimer = setInterval(() => {
    if (!video.videoWidth) return;
    const q = detect(video);
    overlay.setAttribute("viewBox", `0 0 ${video.videoWidth} ${video.videoHeight}`);
    overlay.innerHTML = q ? `<polygon points="${q.map((p) => p.join(",")).join(" ")}" fill="rgba(18,165,148,.18)" stroke="#12A594" stroke-width="${video.videoWidth / 180}"/>` : "";
  }, 450);
}
function closeCamera() { clearInterval(liveTimer); C.stopStream(stream); stream = null; C.wakeLock(false); }
async function shoot() {
  if (!video.videoWidth) return;
  const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0);
  closeCamera();
  await openEditor(c);
}

/* ---------- chỉnh góc ---------- */
let stage, cv, svg;
async function openEditor(src, index = -1, prev) {
  src = prev ? src : capped(src);
  const quad = prev ? prev.quad : detect(src);
  editing = { src, quad: quad || fullQuad(src), found: !!quad, rot: prev ? prev.rot : 0, filter: prev ? prev.filter : C.store.get("filter", "color"), index };
  show("edit");
  editEl.textContent = "";
  cv = h("canvas", { "aria-hidden": "true" });
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  stage = h("div", { class: "sc-stage" }, cv, svg);
  const fsel = seg("filter", FILTERS, editing.filter, "Bộ lọc");
  fsel.addEventListener("change", () => { editing.filter = radioVal(fsel, "filter"); C.store.set("filter", editing.filter); });
  editEl.append(
    h("p", { class: "hint", role: "status", text: (queue.length ? `Còn ${queue.length} ảnh chờ. ` : "") + (editing.found ? "Đã tự tìm 4 góc tờ giấy. Kéo các chấm tròn nếu cần chỉnh." : "Chưa tìm rõ tờ giấy: hãy kéo 4 chấm tròn tới 4 góc tờ giấy.") }),
    stage,
    h("div", { class: "row", style: { justifyContent: "center" } },
      btn("wand-sparkles", "Tự tìm góc", () => { const q = detect(src); if (q) { editing.quad = q; drawEditor(); } else toast("Chưa tìm thấy tờ giấy, hãy kéo các góc bằng tay."); }),
      btn("maximize", "Lấy cả ảnh", () => { editing.quad = fullQuad(src); drawEditor(); }),
      btn("rotate-cw", "Xoay", () => { editing.rot = (editing.rot + 1) % 4; toast(`Trang sẽ xoay ${editing.rot * 90}°`); })),
    h("div", { style: { width: "min(100%, 520px)" } }, fsel),
    h("div", { class: "row", style: { justifyContent: "center" } },
      h("button", { class: "btn ghost", type: "button", text: "Bỏ ảnh này", onclick: afterEdit }),
      h("button", { class: "btn big", type: "button", onclick: savePage }, h("span", { html: icon("check"), style: { display: "contents" } }), index >= 0 ? "Lưu thay đổi" : "Thêm trang")));
  drawEditor();
}
function drawEditor() {
  const { src, quad } = editing;
  const s = Math.min(1, 1400 / Math.max(src.width, src.height));
  cv.width = Math.round(src.width * s); cv.height = Math.round(src.height * s);
  cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
  svg.setAttribute("viewBox", `0 0 ${src.width} ${src.height}`);
  const r = Math.max(src.width, src.height) / (IS_TOUCH ? 26 : 45); // chấm kéo to hơn cho ngón tay
  svg.innerHTML = `<polygon class="sc-poly" points="${quad.map((p) => p.join(",")).join(" ")}" style="stroke-width:${r / 5}"/>` +
    quad.map((p, i) => `<circle class="sc-h" tabindex="0" role="slider" aria-label="Góc ${["trên trái", "trên phải", "dưới phải", "dưới trái"][i]} – dùng phím mũi tên để dịch" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="${r}" style="stroke-width:${r / 4}"/>`).join("");
  svg.querySelectorAll(".sc-h").forEach((c) => {
    const i = +c.dataset.i;
    c.addEventListener("pointerdown", (e) => {
      e.preventDefault(); c.setPointerCapture(e.pointerId); c.focus();
      const move = (ev) => {
        const b = svg.getBoundingClientRect();
        editing.quad[i] = [Math.max(0, Math.min(src.width, ((ev.clientX - b.left) / b.width) * src.width)), Math.max(0, Math.min(src.height, ((ev.clientY - b.top) / b.height) * src.height))];
        refreshPoly();
      };
      c.addEventListener("pointermove", move);
      c.addEventListener("pointerup", () => c.removeEventListener("pointermove", move), { once: true });
    });
    c.addEventListener("keydown", (e) => {
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!k) return;
      e.preventDefault();
      const st = (e.shiftKey ? 0.04 : 0.008) * Math.max(src.width, src.height);
      editing.quad[i] = [Math.max(0, Math.min(src.width, editing.quad[i][0] + k[0] * st)), Math.max(0, Math.min(src.height, editing.quad[i][1] + k[1] * st))];
      refreshPoly();
    });
  });
}
function refreshPoly() {
  svg.querySelector(".sc-poly").setAttribute("points", editing.quad.map((p) => p.join(",")).join(" "));
  svg.querySelectorAll(".sc-h").forEach((c, i) => { c.setAttribute("cx", editing.quad[i][0]); c.setAttribute("cy", editing.quad[i][1]); });
}

// nắn thẳng + lọc → JPEG
async function savePage() {
  const e = editing;
  const st = editorStatus("Đang nắn thẳng và làm rõ…");
  await nextFrame();
  try {
    const [qw, qh] = quadSize(e.quad), k = Math.min(1, MAX_OUT / Math.max(qw, qh));
    const g = e.src.getContext("2d", { willReadFrequently: true });
    let img = warp({ data: g.getImageData(0, 0, e.src.width, e.src.height).data, width: e.src.width, height: e.src.height }, e.quad, Math.max(8, Math.round(qw * k)), Math.max(8, Math.round(qh * k)));
    enhance(img, e.filter);
    img = rotate90(img, e.rot);
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    c.getContext("2d").putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", e.filter === "bw" ? 0.8 : 0.85));
    const page = { id: uid(), blob, w: img.width, h: img.height, thumb: URL.createObjectURL(blob), src: e.src, quad: e.quad.map((p) => p.slice()), rot: e.rot, filter: e.filter };
    if (e.index >= 0) { URL.revokeObjectURL(pages[e.index].thumb); pages[e.index] = page; } else pages.push(page);
    toast(`Đã có ${pages.length} trang` + (queue.length ? ` · còn ${queue.length} ảnh` : ""));
    await afterEdit();
  } catch (err) { console.error(err); st.textContent = "Không xử lý được ảnh này: " + err.message; }
}
function editorStatus(t) { const p = editEl.querySelector("[role=status]"); p.textContent = t; return p; }

/* ---------- danh sách trang + xuất PDF ---------- */
function renderList() {
  listEl.textContent = "";
  pages.forEach((p, i) => listEl.append(h("li", { class: "sc-pg" },
    h("img", { src: p.thumb, alt: `Trang ${i + 1}` }),
    h("span", { class: "hint", text: `Trang ${i + 1}` }),
    h("div", { class: "row" },
      ib("arrow-left", `Đưa trang ${i + 1} lên trước`, () => move(i, i - 1), i === 0),
      ib("pen-line", `Chỉnh lại trang ${i + 1}`, () => openEditor(p.src, i, p)),
      ib("trash-2", `Xoá trang ${i + 1}`, () => { URL.revokeObjectURL(p.thumb); pages.splice(i, 1); renderList(); if (!pages.length) show("start"); }),
      ib("arrow-right", `Đưa trang ${i + 1} ra sau`, () => move(i, i + 1), i === pages.length - 1)))));
  sideEl.querySelector("#sc-count").textContent = pages.length ? `${pages.length} trang` : "";
  outEl.hidden = true;
}
function move(a, b) { if (b < 0 || b >= pages.length) return; const [x] = pages.splice(a, 1); pages.splice(b, 0, x); renderList(); }

async function makePdf() {
  if (!pages.length) return;
  const L = await lib("pdflib");
  const doc = await L.PDFDocument.create();
  doc.setTitle("Tài liệu scan"); doc.setCreator("BbeTools – Scan tài liệu bằng camera");
  const size = radioVal(sideEl, "size");
  for (const p of pages) {
    const img = await doc.embedJpg(new Uint8Array(await p.blob.arrayBuffer()));
    let pw, ph;
    if (size === "fit") { pw = 210 * MM; ph = (pw * p.h) / p.w; }
    else { [pw, ph] = PAPER[size].map((v) => v * MM); if (p.w > p.h) [pw, ph] = [ph, pw]; }
    const page = doc.addPage([pw, ph]), b = fitBox(pw, ph, size === "fit" ? 0 : 6 * MM, p.w, p.h);
    page.drawImage(img, { x: b.x, y: b.y, width: b.w, height: b.h });
  }
  const blob = new Blob([await doc.save()], { type: "application/pdf" });
  const name = "tai-lieu-scan-" + new Date().toISOString().slice(0, 10) + ".pdf";
  outEl.textContent = "";
  const file = new File([blob], name, { type: "application/pdf" });
  outEl.append(h("p", { class: "summary", text: `Đã tạo ${name}: ${pages.length} trang · ${fmtSize(blob.size)}` }),
    h("div", { class: "row" },
      h("button", { class: "btn big", type: "button", onclick: () => save(blob, name) }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải PDF về máy"),
      h("a", { class: "btn ghost", href: URL.createObjectURL(blob), target: "_blank", rel: "noopener" }, h("span", { html: icon("eye"), style: { display: "contents" } }), "Xem")));
  outEl.hidden = false;
  save(blob, name);
  const tools = await toolsForFiles([file], C.toolId).catch(() => []);
  if (tools.length) {
    const reg = await registry();
    outEl.append(h("p", { class: "opt-title", text: "Tiếp tục với file này" }), h("ul", { class: "chip-list" }, tools.slice(0, 8).map((t) => h("li", null,
      h("a", { class: "chip", href: toolHref(t), onclick: (ev) => { ev.preventDefault(); sendTo(t, [file]); } }, h("span", { class: "tile xs", style: { "--c": reg.groupOf[t.group].color }, html: icon(t.icon) }), t.name)))));
  }
  outEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* ---------- dựng giao diện ---------- */
const btn = (ico, label, onclick) => h("button", { class: "btn ghost sm", type: "button", onclick }, h("span", { html: icon(ico), style: { display: "contents" } }), label);
const ib = (ico, label, onclick, disabled) => h("button", { class: "ib sm", type: "button", title: label, "aria-label": label, html: icon(ico), onclick, disabled });
function show(step) {
  startEl.hidden = step !== "start"; camEl.hidden = step !== "cam"; editEl.hidden = step !== "edit";
  root.querySelector(".sc-cols").hidden = step !== "list";
  if (step !== "cam" && stream) closeCamera();
  root.scrollIntoView({ block: "nearest" });
}

interactiveTool({
  mount(el, ctx) {
    C = ctx; C.toolId = "scan-document";
    const inp = intake({ accept: ["image", "heic"], multiple: true, onFiles: (fs) => addImages(fs), label: "Thả ảnh giấy tờ vào đây" });
    video = h("video", { playsinline: true, muted: true, "aria-label": "Khung ngắm camera" });
    overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    overlay.setAttribute("preserveAspectRatio", "xMidYMid meet");
    startEl = h("section", { class: "sc-start", "aria-label": "Bắt đầu scan" },
      h("span", { class: "dz-ico", html: icon("scan") }),
      h("h2", { style: { margin: 0, fontSize: "20px" }, text: "Scan giấy tờ thành PDF" }),
      h("p", { class: "muted", style: { margin: 0 }, text: "Đặt tờ giấy trên nền tối hơn (bàn gỗ, sàn), đủ sáng, chụp thẳng từ trên xuống." }),
      h("div", { class: "row" },
        h("button", { class: "btn big", type: "button", onclick: openCamera }, h("span", { html: icon("camera"), style: { display: "contents" } }), "Mở camera"),
        h("button", { class: "btn ghost big", type: "button", onclick: () => inp.pick() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Chọn ảnh có sẵn")),
      h("button", { class: "btn ghost", type: "button", onclick: async () => addImages(await sampleFiles("giay-to-chup.jpg")) }, h("span", { html: icon("sparkles"), style: { display: "contents" } }), "Thử với ảnh mẫu"),
      h("p", { class: "fmt", html: IS_TOUCH ? "Ảnh chụp không rời khỏi máy của bạn." : "hoặc kéo thả, dán (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>V</kbd>) ảnh vào đây. Ảnh không rời khỏi máy của bạn." }));
    camEl = h("section", { class: "sc-cam", hidden: true, "aria-label": "Camera" }, video, overlay,
      h("div", { class: "bar" },
        h("button", { class: "btn ghost sm", type: "button", text: "Đóng", onclick: () => { closeCamera(); show(pages.length ? "list" : "start"); } }),
        h("button", { class: "sc-shot", type: "button", "aria-label": "Chụp", title: "Chụp", onclick: shoot }),
        h("span", { style: { color: "#fff", minWidth: "60px" }, text: "" })));
    editEl = h("section", { class: "sc-edit", hidden: true, "aria-label": "Chỉnh góc tờ giấy" });
    listEl = h("ul", { class: "sc-pages", "aria-label": "Các trang đã scan" });
    outEl = h("div", { class: "sc-out", hidden: true, "aria-live": "polite" });
    sideEl = h("aside", { class: "opt-group" },
      h("p", { class: "opt-title", id: "sc-count" }),
      h("div", { class: "row" }, btn("camera", "Chụp thêm", openCamera), btn("image", "Thêm ảnh", () => inp.pick())),
      seg("size", [["a4", "A4"], ["letter", "Letter"], ["fit", "Vừa ảnh"]], "a4", "Khổ trang PDF"),
      h("button", { class: "btn big block", type: "button", onclick: makePdf }, h("span", { html: icon("file-down"), style: { display: "contents" } }), "Tạo PDF"),
      outEl);
    root = h("div", { class: "sc" }, startEl, camEl, editEl, h("div", { class: "sc-cols", hidden: true }, listEl, sideEl));
    el.append(root);
    addEventListener("pagehide", closeCamera);
    show("start");
  }
});
