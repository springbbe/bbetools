/* Ký PDF: tạo chữ ký (vẽ, gõ tên, ảnh chụp), đặt chữ ký / chữ / ngày / dấu tích / ảnh con dấu lên trang,
   kéo để di chuyển, kéo góc để đổi cỡ, rồi đóng vào file. Chữ ký đã tạo lưu trong trình duyệt của máy này để dùng lại. */
import { h, icon, lib, toast, dialog, store, baseName, sampleFiles, debounce, IS_TOUCH, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openPdf, libDoc, renderPage, pdfBlob, Locked } from "../pdf.js";
import { decodeImage } from "../image.js";
import { geom, place } from "../lib/pdf-geom.js";

const JSD = "https://cdn.jsdelivr.net/npm/";
const SIG_FONTS = [
  { family: "Dancing Script", weight: 700, files: ["@fontsource/dancing-script@5.3.0/files/dancing-script-vietnamese-700-normal.woff2", "@fontsource/dancing-script@5.3.0/files/dancing-script-latin-700-normal.woff2"] },
  { family: "Great Vibes", weight: 400, files: ["@fontsource/great-vibes@5.3.0/files/great-vibes-vietnamese-400-normal.woff2", "@fontsource/great-vibes@5.3.0/files/great-vibes-latin-400-normal.woff2"] },
  { family: "Pacifico", weight: 400, files: ["@fontsource/pacifico@5.3.0/files/pacifico-vietnamese-400-normal.woff2", "@fontsource/pacifico@5.3.0/files/pacifico-latin-400-normal.woff2"] }
];
const INK = [["#111111", "Đen"], ["#1A3D9C", "Xanh"], ["#C62828", "Đỏ"]];
const TEXT_FONT = "500 {px}px 'Be Vietnam Pro', sans-serif";
const MAX_SIGS = 6;

const css = document.createElement("style");
css.textContent = `
.sg-pages{display:flex;flex-direction:column;align-items:center;gap:18px}
.sg-page{position:relative;width:100%;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.12);border-radius:2px;container-type:inline-size;touch-action:pan-y;user-select:none}
.sg-page>img{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sg-page .pno{position:absolute;left:8px;top:8px;z-index:1;background:rgba(15,18,28,.72);color:#fff;font-size:12px;font-weight:700;border-radius:99px;padding:2px 9px}
.sg-obj{position:absolute;z-index:2;cursor:move;touch-action:none;outline:none;border:1.5px dashed transparent;border-radius:3px}
.sg-obj:hover{border-color:color-mix(in srgb,var(--brand) 55%,transparent)}
.sg-obj.on{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 6%,transparent)}
.sg-obj:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.sg-obj img{display:block;width:100%;height:100%;pointer-events:none}
.sg-text{font-family:'Be Vietnam Pro',sans-serif;font-weight:500;line-height:1.2;white-space:pre;padding:0 1px;min-width:1ch;outline:none}
.sg-text[contenteditable=true]{cursor:text;background:#fff;box-shadow:0 0 0 2px var(--brand)}
.sg-res{position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;border-radius:50%;background:var(--brand);border:2px solid #fff;cursor:nwse-resize;display:none;touch-action:none}
.sg-obj.on .sg-res{display:block}
.sg-bar{position:absolute;left:0;top:calc(100% + 8px);display:none;gap:4px;background:var(--surface);border-radius:10px;box-shadow:var(--shadow-lg);padding:4px;z-index:3;white-space:nowrap}
.sg-obj.on .sg-bar{display:flex}
.sg-bar .btn{min-height:34px;padding:4px 10px;font-size:13.5px}
.sg-sigs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sg-sig{position:relative;height:64px;border:1px solid var(--line-2);border-radius:10px;background:#fff;display:grid;place-items:center;padding:6px;cursor:pointer}
.sg-sig:hover{border-color:var(--brand)}
.sg-sig img{max-width:100%;max-height:100%}
.sg-sig .ib{position:absolute;top:2px;right:2px;width:26px;height:26px;color:#333;background:rgba(255,255,255,.85)}
.sg-adds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sg-pad{width:100%;height:200px;border:2px dashed var(--line-2);border-radius:12px;background:#fff;touch-action:none;cursor:crosshair}
.sg-styles{display:grid;gap:8px}
.sg-styles label{display:block}
.sg-styles input{position:absolute;opacity:0}
.sg-styles span{display:block;padding:8px 14px;border:2px solid var(--line);border-radius:12px;background:#fff;font-size:34px;line-height:1.3;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sg-styles input:checked+span{border-color:var(--brand)}
.sg-styles input:focus-visible+span{outline:3px solid var(--brand);outline-offset:2px}
.sg-drop{min-height:140px;border:2px dashed var(--line-2);border-radius:12px;background:#fff;color:#555;display:grid;place-items:center;text-align:center;padding:12px}
.sg-drop img{max-width:100%;max-height:180px}
.sg-tabs{display:flex;gap:4px;padding:4px;background:var(--surface-2);border-radius:12px}
.sg-tabs button{flex:1;min-height:38px;border:0;border-radius:9px;background:transparent;font-weight:600;color:var(--muted)}
.sg-tabs button[aria-selected=true]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
`;
document.head.append(css);

let F = null, item = null, pages = [], objs = [], uid = 0, selected = null, wrap, countEl, banner, sigBox, sumEl, io;

/* ---------- font chữ ký (tải khi mở hộp tạo chữ ký) ---------- */
let fontsP = null;
function loadSigFonts() {
  if (!fontsP) fontsP = Promise.all(SIG_FONTS.map((f) => Promise.all(f.files.map(async (u, i) => {
    const ff = new FontFace(f.family, `url(${JSD + u}) format("woff2")`, { weight: String(f.weight), unicodeRange: i === 0
      ? "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB"
      : "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212" });
    document.fonts.add(await ff.load());
  })))).catch((e) => { fontsP = null; console.warn(e); });
  return fontsP;
}

/* ---------- mở file, vẽ trang ---------- */
async function load(it) {
  let r;
  try { r = await openPdf(it.file, { prompt: true }); }
  catch (e) {
    if (!(e instanceof Locked)) throw e;
    const err = new Error("locked"); err.userMsg = `Chưa mở được ${it.name}: file có mật khẩu, cần nhập đúng mật khẩu.`; throw err;
  }
  Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages });
  it.info = r.pages + " trang";
  const list = [];
  for (let n = 1; n <= r.pages; n++) { const v = (await r.doc.getPage(n)).getViewport({ scale: 1 }); list.push({ n, w: v.width, h: v.height }); }
  if (item && item !== it) objs = [];
  item = it; pages = list; selected = null; lastPage = 0;
  buildPages();
}

function buildPages() {
  wrap.textContent = "";
  io.disconnect();
  pages.forEach((p, i) => {
    const el = h("div", { class: "sg-page", "data-i": i, style: { aspectRatio: p.w + " / " + p.h, maxWidth: Math.round(820 * Math.min(1, (p.w / p.h) * 1.414)) + "px" } },
      h("span", { class: "pno", text: "Trang " + (i + 1) + "/" + pages.length }));
    el._load = async () => {
      try {
        const c = await renderPage(item.doc, p.n, { width: Math.min(1700, el.clientWidth * Math.min(2, devicePixelRatio || 1)) });
        const b = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.88));
        c.width = c.height = 0;
        el.prepend(h("img", { src: URL.createObjectURL(b), alt: "" }));
      } catch (_) { /* tài liệu đã đóng */ }
    };
    el.addEventListener("pointerdown", (e) => { lastPage = i; if (!e.target.closest(".sg-obj")) select(null); });
    p.el = el;
    wrap.append(el);
    io.observe(el);
  });
  objs.forEach(mountObj);
  countEl.textContent = item ? pages.length + " trang · " + item.name : "";
  banner.hidden = !(item && item.sample);
  update();
}

// trang đang xem; khi không trang nào trên màn hình (vd. điện thoại đã cuộn xuống phần tuỳ chọn) thì lấy trang xem gần nhất
let lastPage = 0;
function curPage() {
  const mid = innerHeight / 2;
  let best = -1, bd = Infinity;
  pages.forEach((p, i) => {
    const r = p.el.getBoundingClientRect();
    if (r.bottom < 40 || r.top > innerHeight - 40) return;
    const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    if (d < bd) { bd = d; best = i; }
  });
  if (best >= 0) lastPage = best;
  return Math.min(lastPage, pages.length - 1);
}
addEventListener("scroll", debounce(() => { if (pages.length) curPage(); }, 120), { passive: true });

/* ---------- các mục đặt trên trang ---------- */
// o: { kind: "img"|"text", page, x, y, w, h (phần của trang), url, ratio, text, fs (cỡ chữ / bề rộng trang), color }
function addObj(o, widthShare) {
  if (!pages.length) { toast("Hãy mở file PDF trước."); return null; }
  const i = curPage(), p = pages[i], pr = p.el.getBoundingClientRect();
  const visTop = Math.max(0, -pr.top), visBot = Math.min(pr.height, innerHeight - pr.top);
  const cy = (visTop + visBot) / 2 / pr.height;
  const obj = Object.assign({ id: ++uid, page: i }, o);
  if (o.kind === "img") {
    obj.w = widthShare; obj.h = (widthShare * o.ratio * p.w) / p.h;
    obj.x = 0.5 - obj.w / 2; obj.y = Math.min(0.97 - obj.h, Math.max(0.02, cy - obj.h / 2));
  } else { obj.x = 0.38; obj.y = Math.max(0.02, Math.min(0.95, cy - 0.02)); }
  // tránh đặt chồng khít lên mục vừa thêm
  while (objs.some((x) => x.page === i && Math.abs(x.y - obj.y) < 0.03 && Math.abs(x.x - obj.x) < 0.1) && obj.y < 0.9) obj.y += 0.05;
  objs.push(obj);
  mountObj(obj);
  select(obj);
  obj.el.focus({ preventScroll: true });
  const r = obj.el.getBoundingClientRect();
  if (r.top < 60 || r.bottom > innerHeight) obj.el.scrollIntoView({ block: "center", behavior: "smooth" });
  update();
  return obj;
}

function mountObj(o) {
  const p = pages[o.page];
  if (!p || !p.el) return;
  if (o.el) o.el.remove();
  const label = o.kind === "img" ? "Chữ ký / ảnh" : "Chữ: " + o.text;
  const el = h("div", { class: "sg-obj", tabindex: "0", role: "group", "aria-label": label + ". Kéo hoặc dùng phím mũi tên để di chuyển, + − để đổi cỡ, Delete để xoá" + (o.kind === "text" ? ", Enter để sửa chữ" : "") });
  const content = o.kind === "img" ? h("img", { src: o.url, alt: "" }) : h("div", { class: "sg-text", text: o.text, spellcheck: "false", style: { color: o.color } });
  const bar = h("div", { class: "sg-bar" },
    o.kind === "text" ? h("button", { class: "btn ghost", type: "button", text: "Sửa", onclick: (e) => { e.stopPropagation(); editText(o); } }) : null,
    pages.length > 1 ? h("button", { class: "btn ghost", type: "button", text: "Chép ra mọi trang", onclick: (e) => { e.stopPropagation(); copyToAll(o); } }) : null,
    h("button", { class: "btn danger", type: "button", text: "Xoá", onclick: (e) => { e.stopPropagation(); removeObj(o); } }));
  const res = h("span", { class: "sg-res", title: "Kéo để đổi cỡ", "aria-hidden": "true" });
  el.append(content, res, bar);
  o.el = el; o.content = content;
  placeObj(o);
  p.el.append(el);
  interact(o, el, res);
  if (o.kind === "text") {
    content.addEventListener("blur", () => {
      if (content.contentEditable !== "true") return;
      content.contentEditable = "false";
      o.text = content.innerText.replace(/\n+$/, "");
      if (!o.text.trim()) removeObj(o);
      else el.setAttribute("aria-label", "Chữ: " + o.text);
    });
    content.addEventListener("dblclick", () => editText(o));
  }
}
function placeObj(o) {
  const s = o.el.style;
  s.left = o.x * 100 + "%"; s.top = o.y * 100 + "%";
  if (o.kind === "img") { s.width = o.w * 100 + "%"; s.height = o.h * 100 + "%"; }
  else o.content.style.fontSize = o.fs * 100 + "cqw";
}
function editText(o) {
  select(o);
  o.content.contentEditable = "true";
  o.content.focus();
  const r = document.createRange(); r.selectNodeContents(o.content);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
}
function select(o) {
  if (selected && selected !== o && selected.el) selected.el.classList.remove("on");
  selected = o;
  if (o && o.el) o.el.classList.add("on");
}
function removeObj(o) {
  const hadFocus = o.el && o.el.contains(document.activeElement);
  objs = objs.filter((x) => x !== o);
  if (o.el) o.el.remove();
  if (selected === o) selected = null;
  update();
  if (hadFocus) sumEl.focus({ preventScroll: true }); // tiêu điểm bàn phím không bị mất khi xoá
}
function copyToAll(o) {
  let n = 0;
  pages.forEach((p, i) => {
    if (i === o.page) return;
    const c = Object.assign({}, o, { id: ++uid, page: i, el: null, content: null });
    if (c.kind === "img") c.h = (c.w * c.ratio * p.w) / p.h;
    objs.push(c); mountObj(c); n++;
  });
  update();
  toast(`Đã chép ra ${n} trang khác`);
}
function clampObj(o) {
  const pw = o.el.parentElement.clientWidth, ph = o.el.parentElement.clientHeight;
  const bw = o.el.offsetWidth / pw, bh = o.el.offsetHeight / ph;
  o.x = Math.min(Math.max(0, 1 - bw), Math.max(0, o.x));
  o.y = Math.min(Math.max(0, 1 - bh), Math.max(0, o.y));
}
function resizeBy(o, k) {
  if (o.kind === "img") {
    const p = pages[o.page];
    o.w = Math.max(0.03, Math.min(1 - o.x, o.w * k)); o.h = (o.w * o.ratio * p.w) / p.h;
  } else o.fs = Math.max(0.008, Math.min(0.2, o.fs * k));
  placeObj(o);
}
function interact(o, el, res) {
  let mode = null, sx, sy, start, pw, ph, moved = false;
  el.addEventListener("pointerdown", (e) => {
    if (o.kind === "text" && o.content.isContentEditable) return;
    if (e.target.closest(".sg-bar")) return;
    e.preventDefault(); e.stopPropagation();
    const wasOn = selected === o;
    select(o);
    el.focus({ preventScroll: true });
    mode = e.target === res ? "size" : "move";
    sx = e.clientX; sy = e.clientY; moved = false; o._wasOn = wasOn;
    start = { x: o.x, y: o.y, w: o.w, fs: o.fs, bw: el.offsetWidth };
    const r = pages[o.page].el.getBoundingClientRect(); pw = r.width; ph = r.height;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  });
  el.addEventListener("pointermove", (e) => {
    if (!mode) return;
    const dx = (e.clientX - sx) / pw, dy = (e.clientY - sy) / ph;
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) moved = true;
    if (mode === "move") { o.x = start.x + dx; o.y = start.y + dy; placeObj(o); clampObj(o); }
    else if (o.kind === "img") { const p = pages[o.page]; o.w = Math.max(0.03, Math.min(1 - o.x, start.w + dx)); o.h = (o.w * o.ratio * p.w) / p.h; }
    else o.fs = Math.max(0.008, Math.min(0.2, start.fs * (1 + (e.clientX - sx) / Math.max(20, start.bw))));
    placeObj(o);
  });
  const end = () => {
    if (mode === "move" && !moved && o.kind === "text" && o._wasOn) editText(o);
    mode = null;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", () => { mode = null; });
  el.addEventListener("focus", () => select(o));
  el.addEventListener("keydown", (e) => {
    if (o.kind === "text" && o.content.isContentEditable) { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); o.content.blur(); el.focus(); } return; }
    if (e.target !== el) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeObj(o); return; }
    if (e.key === "Enter" && o.kind === "text") { e.preventDefault(); editText(o); return; }
    if (e.key === "+" || e.key === "=") { e.preventDefault(); resizeBy(o, 1.1); return; }
    if (e.key === "-" || e.key === "_") { e.preventDefault(); resizeBy(o, 1 / 1.1); return; }
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (k) { e.preventDefault(); const st = e.shiftKey ? 0.03 : 0.005; o.x += k[0] * st; o.y += k[1] * st; placeObj(o); clampObj(o); placeObj(o); }
  });
}
document.addEventListener("pointerdown", (e) => { if (selected && !e.target.closest(".sg-obj") && !e.target.closest(".work-side")) select(null); });

function update() {
  if (!sumEl) return;
  const n = objs.length, pg = new Set(objs.map((o) => o.page)).size;
  sumEl.innerHTML = n ? `<span>Đã đặt <b>${n}</b> mục trên <b>${pg}</b> trang.</span>` : "<span>Chưa đặt chữ ký hay nội dung nào. Cuộn tới trang cần ký rồi bấm chữ ký hoặc một mục ở trên.</span>";
  if (F) F.refresh();
}

/* ---------- chữ ký đã lưu ---------- */
let sigs = store.get("chu-ky", []);
function renderSigs() {
  sigBox.textContent = "";
  sigs.forEach((s, i) => sigBox.append(h("div", { class: "sg-sig", role: "button", tabindex: "0", title: "Đặt chữ ký này vào trang đang xem", "aria-label": `Đặt chữ ký ${i + 1} vào trang`,
    onclick: () => addObj({ kind: "img", url: s.url, ratio: s.ratio }, 0.26),
    onkeydown: (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); addObj({ kind: "img", url: s.url, ratio: s.ratio }, 0.26); } } },
    h("img", { src: s.url, alt: "" }),
    h("button", { class: "ib", type: "button", title: "Xoá chữ ký đã lưu", "aria-label": `Xoá chữ ký đã lưu ${i + 1}`, html: icon("x"),
      onclick: (e) => { e.stopPropagation(); sigs.splice(i, 1); store.set("chu-ky", sigs); renderSigs(); } }))));
}
function saveSig(res) {
  sigs = [res].concat(sigs.filter((s) => s.url !== res.url)).slice(0, MAX_SIGS);
  if (!store.set("chu-ky", sigs)) { sigs = sigs.slice(0, 2); store.set("chu-ky", sigs); }
  renderSigs();
}

/* ---------- tạo chữ ký ---------- */
// cắt sát nét mực (bỏ phần trong suốt xung quanh)
function trim(c) {
  const g = c.getContext("2d", { willReadFrequently: true }), w = c.width, hh = c.height, d = g.getImageData(0, 0, w, hh).data;
  let x0 = w, y0 = hh, x1 = -1, y1 = -1;
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const pad = 6, o = document.createElement("canvas");
  o.width = x1 - x0 + 1 + pad * 2; o.height = y1 - y0 + 1 + pad * 2;
  o.getContext("2d").drawImage(c, x0 - pad, y0 - pad, o.width, o.height, 0, 0, o.width, o.height);
  return { url: o.toDataURL("image/png"), ratio: o.height / o.width };
}
// ảnh chụp chữ ký / con dấu: thu nhỏ, tuỳ chọn biến nền giấy trắng thành trong suốt
async function readImage(file, knockout) {
  const bmp = await decodeImage(file);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height);
  if (knockout) {
    const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (l > 205) d[i + 3] = 0; else if (l > 160) d[i + 3] = Math.round((d[i + 3] * (205 - l)) / 45);
    }
    g.putImageData(id, 0, 0);
    return trim(c) || { url: c.toDataURL("image/png"), ratio: c.height / c.width };
  }
  return { url: c.toDataURL("image/png"), ratio: c.height / c.width };
}

function makeSignature() {
  const fontsReady = loadSigFonts();
  return dialog((close) => {
    let tab = "draw", ink = INK[0][0], strokes = 0, imgFile = null, imgSig = null;
    const tabs = h("div", { class: "sg-tabs", role: "tablist", "aria-label": "Cách tạo chữ ký" });
    const panes = {};
    const setTab = (t) => {
      tab = t;
      [...tabs.children].forEach((b) => { const on = b.dataset.t === t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
      Object.keys(panes).forEach((k) => { panes[k].hidden = k !== t; });
      err.hidden = true;
      if (t === "draw") sizePad();
      if (t === "type") setTimeout(() => nameIn.focus(), 30);
    };
    [["draw", "Vẽ"], ["type", "Gõ tên"], ["image", "Ảnh chữ ký"]].forEach(([t, l]) => tabs.append(h("button", { type: "button", role: "tab", "data-t": t, "aria-controls": "sg-p-" + t, text: l, onclick: () => setTab(t) })));
    tabs.addEventListener("keydown", (e) => {
      const ks = ["draw", "type", "image"], i = ks.indexOf(tab);
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); setTab(ks[(i + d + 3) % 3]); tabs.querySelector(`[data-t="${tab}"]`).focus(); }
    });

    // vẽ
    const pad = h("canvas", { class: "sg-pad", "aria-label": "Khung vẽ chữ ký" });
    const pg = pad.getContext("2d", { willReadFrequently: true });
    const dpr = () => devicePixelRatio || 1;
    function sizePad() {
      const r = pad.getBoundingClientRect();
      if (!r.width) return;
      if (pad.width !== Math.round(r.width * dpr())) { pad.width = Math.round(r.width * dpr()); pad.height = Math.round(r.height * dpr()); strokes = 0; }
    }
    let last = null, lastMid = null;
    const pt = (e) => { const r = pad.getBoundingClientRect(); return { x: ((e.clientX - r.left) * pad.width) / r.width, y: ((e.clientY - r.top) * pad.height) / r.height }; };
    pad.addEventListener("pointerdown", (e) => {
      sizePad(); try { pad.setPointerCapture(e.pointerId); } catch (_) {}
      last = lastMid = pt(e); strokes++;
      pg.fillStyle = ink; pg.beginPath(); pg.arc(last.x, last.y, 1.3 * dpr(), 0, Math.PI * 2); pg.fill();
    });
    pad.addEventListener("pointermove", (e) => {
      if (!last) return;
      const p = pt(e), mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
      pg.strokeStyle = ink; pg.lineWidth = 2.6 * dpr(); pg.lineCap = "round"; pg.lineJoin = "round";
      pg.beginPath(); pg.moveTo(lastMid.x, lastMid.y); pg.quadraticCurveTo(last.x, last.y, mid.x, mid.y); pg.stroke();
      last = p; lastMid = mid;
    });
    const up = () => { last = null; };
    pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
    panes.draw = h("div", { class: "opt-group", id: "sg-p-draw", role: "tabpanel" }, pad,
      h("div", { class: "row", style: { justifyContent: "space-between" } },
        h("span", { class: "hint", text: IS_TOUCH ? "Ký bằng ngón tay vào khung trên." : "Giữ chuột và ký vào khung trên." }),
        h("button", { class: "linkish", type: "button", text: "Vẽ lại", onclick: () => { pg.clearRect(0, 0, pad.width, pad.height); strokes = 0; } })));

    // gõ tên
    const nameIn = h("input", { class: "input", placeholder: "Họ và tên của bạn", value: store.get("ten-ky", ""), autocomplete: "name", "aria-label": "Họ và tên" });
    const styles = h("div", { class: "sg-styles", role: "radiogroup", "aria-label": "Kiểu chữ ký" },
      SIG_FONTS.map((f, i) => h("label", null, h("input", { type: "radio", name: "sfont", value: i, checked: i === 0, "aria-label": "Kiểu " + (i + 1) }),
        h("span", { style: { fontFamily: `'${f.family}', cursive`, fontWeight: f.weight } }))));
    const redrawTyped = () => { const v = nameIn.value || "Chữ ký của bạn"; styles.querySelectorAll("span").forEach((s) => { s.textContent = v; s.style.color = ink; }); };
    nameIn.addEventListener("input", redrawTyped);
    redrawTyped();
    panes.type = h("div", { class: "opt-group", id: "sg-p-type", role: "tabpanel", hidden: true }, nameIn, styles);

    // ảnh chữ ký
    const drop = h("div", { class: "sg-drop", text: "Chụp chữ ký hoặc con dấu trên giấy trắng, rồi chọn ảnh ở đây." });
    const knock = h("input", { type: "checkbox", checked: true });
    const fileIn = h("input", { type: "file", accept: "image/*", hidden: true, onchange: () => { if (fileIn.files[0]) { imgFile = fileIn.files[0]; showImg(); } fileIn.value = ""; } });
    const showImg = async () => {
      if (!imgFile) return;
      try { imgSig = await readImage(imgFile, knock.checked); drop.textContent = ""; drop.append(h("img", { src: imgSig.url, alt: "Ảnh chữ ký" })); }
      catch (e) { toast(e.userMsg || "Không đọc được ảnh này.", { type: "err" }); }
    };
    knock.addEventListener("change", showImg);
    panes.image = h("div", { class: "opt-group", id: "sg-p-image", role: "tabpanel", hidden: true }, drop, fileIn,
      h("div", { class: "row", style: { justifyContent: "space-between" } },
        h("label", { class: "switch" }, knock, h("span", { text: "Xoá nền giấy trắng" })),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => fileIn.click() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Chọn ảnh…")));

    const inkPick = h("div", { class: "colors", role: "radiogroup", "aria-label": "Màu mực" },
      INK.map(([c, n], i) => h("label", { title: n }, h("input", { type: "radio", name: "ink", value: c, "aria-label": n, checked: i === 0, onchange: () => { ink = c; redrawTyped(); } }), h("span", { class: "dot", style: { background: c } }))));
    const err = h("p", { class: "field-err", hidden: true, role: "alert" });
    const fail = (m) => { err.hidden = false; err.textContent = m; };
    const done = async () => {
      let res = null;
      if (tab === "draw") {
        if (!strokes) return fail("Hãy ký vào khung trước đã.");
        res = trim(pad);
      } else if (tab === "type") {
        const v = nameIn.value.trim();
        if (!v) { nameIn.focus(); return fail("Hãy gõ tên của bạn."); }
        store.set("ten-ky", v);
        const f = SIG_FONTS[+styles.querySelector("input:checked").value];
        await fontsReady;
        try { await document.fonts.load(`${f.weight} 80px '${f.family}'`, v); } catch (_) {}
        const c = document.createElement("canvas"), g = c.getContext("2d"), font = `${f.weight} 120px '${f.family}', cursive`;
        g.font = font; c.width = Math.ceil(g.measureText(v).width) + 80; c.height = 230;
        g.font = font; g.fillStyle = ink; g.textBaseline = "middle"; g.fillText(v, 40, 115);
        res = trim(c);
      } else {
        if (!imgSig) return fail("Hãy chọn ảnh chữ ký.");
        res = imgSig;
      }
      if (res) close(res);
    };
    setTimeout(() => setTab("draw"), 30);
    return h("div", { class: "dlg-body" },
      h("h2", { text: "Tạo chữ ký" }), tabs, panes.draw, panes.type, panes.image,
      h("div", { class: "row", style: { alignItems: "center" } }, h("span", { class: "opt-title", text: "Màu mực" }), inkPick), err,
      h("p", { class: "hint", text: "Chữ ký được lưu trong trình duyệt của máy này để lần sau dùng lại, không gửi đi đâu." }),
      h("div", { class: "dlg-acts" },
        h("button", { class: "btn ghost", type: "button", text: "Huỷ", onclick: () => close(null) }),
        h("button", { class: "btn", type: "button", text: "Dùng chữ ký này", onclick: done })));
  }, { wide: true, label: "Tạo chữ ký" }).then((res) => {
    if (!res) return;
    saveSig(res);
    if (pages.length) addObj({ kind: "img", url: res.url, ratio: res.ratio }, 0.26);
  });
}

const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); };

/* ---------- đóng vào file ---------- */
function textPng(o, pageW) {
  const K = 4, px = o.fs * pageW * K, font = TEXT_FONT.replace("{px}", px);
  const lines = o.text.split("\n");
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = font;
  const w = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width), 1));
  const lh = px * 1.2;
  c.width = w + 2 * K; c.height = Math.ceil(lh * lines.length);
  g.font = font; g.fillStyle = o.color || "#111"; g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, K, lh * i + lh / 2));
  return { url: c.toDataURL("image/png"), w: c.width / K, h: c.height / K };
}

/* ---------- khung trang ---------- */
fileTool({
  accept: ["pdf"], multiple: false, noun: "file PDF",
  action: "Ký và tải về",
  sample: () => sampleFiles("bao-cao-quy-1.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  custom: {
    mount(ctx) {
      F = ctx;
      countEl = h("span", { class: "count", "aria-live": "polite" });
      banner = h("p", { class: "alert info", hidden: true, text: "Đây là file mẫu. Chọn, kéo thả hoặc dán file PDF của bạn để ký thật." });
      wrap = h("div", { class: "sg-pages" });
      io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); en.target._load(); } }), { rootMargin: "600px" });
      ctx.workMain.append(h("div", { class: "work-head" }, countEl, h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "File khác"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.clear() }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Bỏ hết"))),
      banner, wrap);
    }
  },
  load,
  dispose: (it) => { if (it.doc) it.doc.destroy(); if (it === item) { item = null; pages = []; objs = []; if (wrap) wrap.textContent = ""; } },
  options(el) {
    sigBox = h("div", { class: "sg-sigs" });
    const imgIn = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async () => {
      const f = imgIn.files[0]; imgIn.value = "";
      if (!f) return;
      try { const r = await readImage(f, false); addObj({ kind: "img", url: r.url, ratio: r.ratio }, 0.3); }
      catch (e) { toast(e.userMsg || "Không đọc được ảnh này.", { type: "err" }); }
    } });
    const add = (ico, label, run) => h("button", { class: "btn ghost sm", type: "button", onclick: run }, h("span", { html: icon(ico), style: { display: "contents" } }), label);
    sumEl = h("p", { class: "alert info", "aria-live": "polite", tabindex: "-1" });
    el.append(
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Chữ ký của bạn" }), sigBox,
        h("button", { class: "btn soft", type: "button", onclick: makeSignature }, h("span", { html: icon("signature"), style: { display: "contents" } }), "Tạo chữ ký mới")),
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Thêm vào trang đang xem" }),
        h("div", { class: "sg-adds" },
          add("type", "Chữ", () => { const o = addObj({ kind: "text", text: "Nhập nội dung", fs: 0.022, color: "#111111" }); if (o) setTimeout(() => editText(o), 30); }),
          add("calendar", "Ngày hôm nay", () => addObj({ kind: "text", text: today(), fs: 0.022, color: "#111111" })),
          add("check", "Dấu tích", () => addObj({ kind: "text", text: "✓", fs: 0.04, color: "#111111" })),
          add("stamp", "Ảnh con dấu", () => imgIn.click())), imgIn),
      h("p", { class: "hint", html: `Kéo để di chuyển, kéo chấm tròn ở góc để đổi cỡ, bấm đúp vào chữ để sửa. Bàn phím: phím mũi tên để di chuyển, <kbd>+</kbd> <kbd>−</kbd> đổi cỡ, <kbd>Delete</kbd> để xoá.` }),
      sumEl);
    renderSigs();
    update();
  },
  ready: (items) => (items.some((i) => i.loading) ? "Đang đọc file…" : objs.length ? true : "Hãy đặt ít nhất một chữ ký hoặc nội dung lên trang."),
  async run(items, o, ctx) {
    const L = await lib("pdflib");
    ctx.status("Đang đóng chữ ký vào file…");
    try { await document.fonts.load(TEXT_FONT.replace("{px}", 20), "Đã ký 0123456789"); } catch (_) {}
    const out = await libDoc(item.bytes, item.password);
    const cache = new Map();
    const embed = async (url) => { if (!cache.has(url)) cache.set(url, await out.embedPng(await (await fetch(url)).arrayBuffer())); return cache.get(url); };
    const list = objs.filter((x) => x.kind === "img" || (x.text || "").trim());
    for (let i = 0; i < list.length; i++) {
      ctx.check();
      const x = list[i], page = out.getPage(pages[x.page].n - 1), g = geom(page.getCropBox(), page.getRotation().angle);
      let img, box;
      if (x.kind === "img") { img = await embed(x.url); box = { x: x.x * g.VW, y: x.y * g.VH, w: x.w * g.VW, h: x.h * g.VH }; }
      else { const t = textPng(x, g.VW); img = await embed(t.url); box = { x: x.x * g.VW, y: x.y * g.VH, w: t.w, h: t.h }; }
      const pl = place(g, box);
      page.drawImage(img, { x: pl.x, y: pl.y, width: pl.width, height: pl.height, rotate: L.degrees(pl.rotate) });
      ctx.progress((i + 1) / list.length);
      await nextFrame();
    }
    return [{ blob: pdfBlob(await out.save({ useObjectStreams: true })), name: baseName(item.name) + "-da-ky.pdf", note: pages.length + " trang" }];
  },
  doneTitle: () => "Đã ký PDF!"
});
