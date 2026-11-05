/* Che thông tin trong PDF: kéo khung lên trang, hoặc tìm theo chữ / dãy số / email để thêm khung tự động.
   Khi xuất, trang có vùng che được vẽ lại thành ảnh (pdf.js) rồi tô kín vùng che, nên chữ, ảnh, nét vẽ bên dưới bị xoá thật;
   trang khác chép nguyên sang file mới. Sau đó dọn mọi đối tượng không còn dùng (vd. trang cũ bị kéo theo qua liên kết)
   và tự mở lại file kết quả để kiểm tra trang bị che không còn chữ. */
import { h, icon, lib, toast, baseName, sampleFiles, IS_TOUCH, nextFrame, fmtNum } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { openPdf, renderPage, libDoc, pdfBlob, Locked } from "../pdf.js";
import { findAll, findPattern } from "../lib/pdf-text.js";
import { PATTERNS, textRect, mergeLine, toShare, sameBox } from "../lib/pdf-redact.js";

const css = document.createElement("style");
css.textContent = `
.rd-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;position:sticky;top:calc(var(--top-h) + 6px);z-index:4;padding:8px;margin:0 0 12px;border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}
@media (max-width:560px){.rd-bar{padding:6px;gap:6px}.rd-tip{display:none}}
.rd-bar .btn[aria-pressed=true]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.rd-pages{display:flex;flex-direction:column;align-items:center;gap:18px}
.rd-page{position:relative;width:100%;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.12);border-radius:2px;touch-action:pan-y;user-select:none;-webkit-user-select:none;cursor:crosshair}
.rd-pages.touch .rd-page{cursor:default}
.rd-pages.drawing .rd-page{touch-action:none;cursor:crosshair}
.rd-page>img{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.rd-head{position:absolute;left:8px;top:8px;z-index:3;display:flex;gap:6px;align-items:center}
.rd-head .pno{background:rgba(15,18,28,.72);color:#fff;font-size:12px;font-weight:700;border-radius:99px;padding:2px 9px}
.rd-head .btn{min-height:28px;padding:2px 10px;font-size:12.5px;background:rgba(255,255,255,.92);color:#222;border-color:rgba(0,0,0,.2)}
.rd-box{position:absolute;z-index:2;background:rgba(0,0,0,.78);outline:2px solid #E5484D;outline-offset:0;cursor:move;touch-action:none}
.rd-box.white{background:rgba(255,255,255,.85);outline-color:#E5484D}
.rd-box:focus-visible,.rd-box.on{outline:3px solid #3E5BF2}
.rd-box .x{position:absolute;right:-11px;top:-11px;width:24px;height:24px;border-radius:50%;border:2px solid #fff;background:#E5484D;color:#fff;display:none;place-items:center;padding:0;cursor:pointer}
.rd-box .x .i{width:14px;height:14px}
.rd-box .rs{position:absolute;right:-7px;bottom:-7px;width:14px;height:14px;border-radius:50%;background:#3E5BF2;border:2px solid #fff;display:none;cursor:nwse-resize}
.rd-box:hover .x,.rd-box:focus-within .x,.rd-box.on .x{display:grid}
.rd-box:hover .rs,.rd-box.on .rs{display:block}
.rd-temp{position:absolute;z-index:2;border:2px dashed #E5484D;background:rgba(0,0,0,.35);pointer-events:none}
.rd-list{list-style:none;margin:0;padding:0;display:grid;gap:4px;max-height:260px;overflow:auto}
.rd-list li{display:flex;align-items:center;gap:6px;padding:4px 4px 4px 10px;border:1px solid var(--line);border-radius:10px;font-size:13.5px}
.rd-list li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rd-quick{display:flex;flex-wrap:wrap;gap:6px}
`;
document.head.append(css);

// trạng thái (khai báo trước fileTool vì mount/options dùng ngay)
let F = null, item = null, pages = [], boxes = [], uid = 0, undoStack = [], drawMode = !IS_TOUCH;
let wrap, countEl, banner, listEl, sumEl, drawBtn, undoBtn, clearBtn, findIn, io;
const texts = new Map(); // số trang → { items, vt, VW, VH }

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
  item = it; pages = list; boxes = []; undoStack = []; texts.clear();
  buildPages();
}

function buildPages() {
  wrap.textContent = "";
  io.disconnect();
  pages.forEach((p, i) => {
    const layer = h("div", { class: "rd-layer" });
    const el = h("div", { class: "rd-page", "data-i": i, style: { aspectRatio: p.w + " / " + p.h, maxWidth: Math.round(860 * Math.min(1, (p.w / p.h) * 1.414)) + "px" } },
      h("div", { class: "rd-head" }, h("span", { class: "pno", text: "Trang " + (i + 1) + "/" + pages.length }),
        h("button", { class: "btn ghost sm", type: "button", text: "Che cả trang", onclick: () => addBoxes([{ page: i, x: 0, y: 0, w: 1, h: 1, label: "Cả trang" }]) })),
      layer);
    el._load = async () => {
      try {
        const c = await renderPage(item.doc, p.n, { width: Math.min(1700, el.clientWidth * Math.min(2, devicePixelRatio || 1)) });
        const b = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.88));
        c.width = c.height = 0;
        el.prepend(h("img", { src: URL.createObjectURL(b), alt: "" }));
      } catch (_) { /* tài liệu đã đóng */ }
    };
    drawOn(el, i);
    p.el = el; p.layer = layer;
    wrap.append(el);
    io.observe(el);
  });
  countEl.textContent = item ? pages.length + " trang · " + item.name : "";
  banner.hidden = !(item && item.sample);
  update();
}

/* ---------- kéo để vẽ khung ---------- */
function drawOn(el, i) {
  el.addEventListener("pointerdown", (e) => {
    if (e.button || e.target.closest(".rd-box,.rd-head")) return;
    if (!drawMode) return; // điện thoại: mặc định cuộn trang, bật "Vẽ khung" mới vẽ
    e.preventDefault();
    const r = el.getBoundingClientRect(), x0 = (e.clientX - r.left) / r.width, y0 = (e.clientY - r.top) / r.height;
    const temp = h("div", { class: "rd-temp" });
    el.append(temp);
    let box = null;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    const move = (ev) => {
      const x1 = clamp((ev.clientX - r.left) / r.width), y1 = clamp((ev.clientY - r.top) / r.height);
      box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      Object.assign(temp.style, pct(box));
    };
    const up = () => {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      temp.remove();
      if (box && box.w * r.width > 4 && box.h * r.height > 4) addBoxes([{ page: i, ...box, label: "Vùng tự vẽ" }]);
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
}
const clamp = (v) => Math.max(0, Math.min(1, v));
const pct = (b) => ({ left: b.x * 100 + "%", top: b.y * 100 + "%", width: b.w * 100 + "%", height: b.h * 100 + "%" });

/* ---------- các vùng che ---------- */
// b: { page, x, y, w, h (phần của trang 0..1), label }
function addBoxes(list, quiet) {
  const added = [];
  for (const b of list) {
    if (boxes.some((o) => o.page === b.page && sameBox(o, b))) continue;
    const o = { id: ++uid, ...b };
    boxes.push(o); mountBox(o); added.push(o.id);
  }
  if (added.length) undoStack.push(added);
  if (!quiet && list.length === 1 && added.length) setTimeout(() => { const el = boxEl(added[0]); if (el && !IS_TOUCH) el.focus({ preventScroll: true }); }, 0);
  update();
  return added.length;
}
const boxEl = (id) => wrap.querySelector(`.rd-box[data-id="${id}"]`);
function removeBox(id) {
  const o = boxes.find((b) => b.id === id);
  if (!o) return;
  boxes = boxes.filter((b) => b !== o);
  const el = boxEl(id); if (el) el.remove();
  update();
}
function mountBox(o) {
  const p = pages[o.page];
  if (!p || !p.layer) return;
  const el = h("div", { class: "rd-box" + (color() === "white" ? " white" : ""), tabindex: "0", role: "group", "data-id": o.id,
    "aria-label": `${o.label}, trang ${o.page + 1}. Phím mũi tên để dịch, Shift + mũi tên để đổi cỡ, Delete để xoá` },
    h("button", { class: "x", type: "button", tabindex: "-1", "aria-label": "Xoá vùng che", html: icon("x"), onclick: (e) => { e.stopPropagation(); removeBox(o.id); } }),
    h("span", { class: "rs", "aria-hidden": "true" }));
  Object.assign(el.style, pct(o));
  // kéo để di chuyển, kéo chấm góc để đổi cỡ
  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".x")) return;
    e.preventDefault(); e.stopPropagation(); el.focus({ preventScroll: true });
    const r = p.el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, start = { ...o }, resize = !!e.target.closest(".rs");
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    const move = (ev) => {
      const dx = (ev.clientX - sx) / r.width, dy = (ev.clientY - sy) / r.height;
      if (resize) { o.w = Math.max(0.005, Math.min(1 - o.x, start.w + dx)); o.h = Math.max(0.004, Math.min(1 - o.y, start.h + dy)); }
      else { o.x = Math.max(0, Math.min(1 - o.w, start.x + dx)); o.y = Math.max(0, Math.min(1 - o.h, start.y + dy)); }
      Object.assign(el.style, pct(o));
    };
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); const next = el.nextElementSibling || el.previousElementSibling; removeBox(o.id); if (next && next.classList.contains("rd-box")) next.focus(); return; }
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k) return;
    e.preventDefault();
    const st = 0.004;
    if (e.shiftKey) { o.w = Math.max(0.005, Math.min(1 - o.x, o.w + k[0] * st)); o.h = Math.max(0.004, Math.min(1 - o.y, o.h + k[1] * st)); }
    else { o.x = Math.max(0, Math.min(1 - o.w, o.x + k[0] * st)); o.y = Math.max(0, Math.min(1 - o.h, o.y + k[1] * st)); }
    Object.assign(el.style, pct(o));
  });
  p.layer.append(el);
}
function undo() {
  let ids;
  do ids = undoStack.pop(); while (ids && !ids.some((id) => boxes.some((b) => b.id === id)));
  if (!ids) return;
  ids.forEach((id) => { boxes = boxes.filter((b) => b.id !== id); const el = boxEl(id); if (el) el.remove(); });
  update();
}
function clearAll() {
  boxes = []; undoStack = [];
  wrap.querySelectorAll(".rd-box").forEach((e) => e.remove());
  update();
}
function update() {
  if (!listEl || !undoBtn) return;
  const n = boxes.length, np = new Set(boxes.map((b) => b.page)).size;
  undoBtn.disabled = !undoStack.some((g) => g.some((id) => boxes.some((b) => b.id === id)));
  clearBtn.disabled = !n;
  listEl.textContent = "";
  [...boxes].sort((a, b) => a.page - b.page || a.y - b.y).forEach((b) => listEl.append(h("li", null,
    h("span", { title: b.label, text: `Tr. ${b.page + 1} · ${b.label}` }),
    h("button", { class: "ib sm", type: "button", title: "Xem", "aria-label": `Xem vùng che ${b.label} ở trang ${b.page + 1}`, html: icon("eye"), onclick: () => { const el = boxEl(b.id); if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); } } }),
    h("button", { class: "ib sm", type: "button", title: "Xoá", "aria-label": `Xoá vùng che ${b.label} ở trang ${b.page + 1}`, html: icon("x"), onclick: () => removeBox(b.id) }))));
  sumEl.textContent = n ? `${n} vùng che trên ${np} trang. Các trang này sẽ được chuyển thành ảnh; ${pages.length - np} trang còn lại giữ nguyên.` : "Chưa có vùng che nào.";
  if (F) F.refresh();
}
const color = () => (F && F.optsEl && radioVal(F.optsEl, "color")) || "black";

/* ---------- tìm theo chữ ---------- */
async function pageText(p) {
  if (!texts.has(p.n)) {
    const page = await item.doc.getPage(p.n), vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    texts.set(p.n, { items: tc.items.filter((x) => typeof x.str === "string"), styles: tc.styles || {}, vt: vp.transform, VW: vp.width, VH: vp.height });
  }
  return texts.get(p.n);
}
async function findAndCover(kind, query) {
  if (!item) return;
  const re = kind && PATTERNS[kind].re;
  let found = 0, chars = 0;
  const add = [];
  for (let i = 0; i < pages.length; i++) {
    const t = await pageText(pages[i]);
    const strs = t.items.map((x) => x.str), eol = t.items.map((x) => !!x.hasEOL);
    chars += strs.join("").replace(/\s/g, "").length;
    const hits = re ? findPattern(strs, re, eol) : findAll(strs, query, eol).map((parts) => ({ text: parts.map((pt) => strs[pt.item].slice(pt.start, pt.end)).join(""), parts }));
    for (const m of hits) {
      found++;
      const rects = mergeLine(m.parts.map((pt) => { const it = t.items[pt.item]; return textRect(it, pt.start, pt.end, t.vt, measurer(t.styles[it.fontName])); }));
      for (const r of rects) { const s = toShare(r, t.VW, t.VH); if (s) add.push({ page: i, ...s, label: m.text.trim() }); }
    }
  }
  if (!chars) { toast("File này không có lớp chữ (bản scan, ảnh chụp): hãy kéo khung lên chỗ cần che.", { type: "err", ms: 6000 }); return; }
  if (!found) { toast(re ? `Không tìm thấy ${PATTERNS[kind].label.toLowerCase()} nào.` : `Không tìm thấy “${query}”.`); return; }
  const n = addBoxes(add, true);
  toast(n ? `Đã che ${found} chỗ tìm thấy. Kiểm tra lại từng vùng trước khi xuất.` : "Các chỗ tìm thấy đã được che rồi.");
  const first = boxes[boxes.length - 1];
  if (n && first) { const el = boxEl(first.id); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }
}

// đo độ rộng chữ bằng font cùng họ (serif / sans-serif / monospace) mà pdf.js nhận ra, để biết vị trí từng ký tự trong mảnh chữ
let mctx = null;
function measurer(style) {
  const fam = (style && style.fontFamily) || "sans-serif";
  const generic = /mono/i.test(fam) ? "monospace" : /serif/i.test(fam) && !/sans/i.test(fam) ? "serif" : "sans-serif";
  mctx = mctx || document.createElement("canvas").getContext("2d");
  return (s) => { mctx.font = "100px " + generic; return mctx.measureText(s).width; };
}

/* ---------- xuất file ---------- */
// dọn đối tượng thừa: trang cũ bị pdf-lib chép kéo theo (qua liên kết, ô form trỏ tới trang bị che) và mọi thứ không còn ai dùng.
// Mọi trang đã được gắn nhãn /BbeIdx <số thứ tự> trước khi chép: tham chiếu tới bản chép thừa được chuyển sang trang tương ứng
// của file mới (liên kết vẫn dẫn đúng trang, kể cả trang đã thành ảnh), không xác định được thì bỏ hẳn khoá/giá trị đó.
function scrub(L, doc, newRefs) {
  const ctx = doc.context, N = (x) => L.PDFName.of(x), live = new Set(doc.getPages().map((p) => p.ref.toString()));
  const orphan = new Map();
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof L.PDFDict) || obj.get(N("Type")) !== N("Page") || live.has(ref.toString())) continue;
    const tag = obj.get(N("BbeIdx"));
    orphan.set(ref.toString(), tag instanceof L.PDFNumber ? newRefs[tag.asNumber()] || null : null);
  }
  const bad = (v) => v instanceof L.PDFRef && orphan.has(v.toString());
  const swap = (v) => orphan.get(v.toString());
  const fix = (o) => {
    const d = o instanceof L.PDFDict ? o : o && o.dict instanceof L.PDFDict ? o.dict : null;
    if (d) for (const [k, v] of d.entries()) {
      if (bad(v)) { if (swap(v)) d.set(k, swap(v)); else d.delete(k); }
      else if (v instanceof L.PDFArray && v.asArray().some((x) => bad(x) && !swap(x))) d.delete(k);
      else if (v instanceof L.PDFDict || v instanceof L.PDFArray) fix(v);
    }
    if (o instanceof L.PDFArray) o.asArray().forEach((v, i) => { if (bad(v)) o.set(i, swap(v) || L.PDFNull); else if (v instanceof L.PDFDict || v instanceof L.PDFArray) fix(v); });
  };
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) if (!orphan.has(ref.toString())) fix(obj);
  doc.getPages().forEach((p) => p.node.delete(N("BbeIdx")));
  // giữ lại những gì đi tới được từ gốc tài liệu
  const seen = new Set(), stack = [ctx.trailerInfo.Root, ctx.trailerInfo.Info].filter(Boolean);
  while (stack.length) {
    const v = stack.pop();
    if (v instanceof L.PDFRef) { const k = v.toString(); if (seen.has(k) || orphan.has(k)) continue; seen.add(k); stack.push(ctx.lookup(v)); }
    else if (v instanceof L.PDFDict) for (const [, x] of v.entries()) stack.push(x);
    else if (v instanceof L.PDFArray) stack.push(...v.asArray());
    else if (v && v.dict instanceof L.PDFDict) stack.push(v.dict);
  }
  let removed = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) if (!seen.has(ref.toString())) { ctx.delete(ref); removed++; }
  return removed;
}

async function run(items, o, ctx) {
  const L = await lib("pdflib");
  const src = await libDoc(item.bytes, item.password);
  const out = await L.PDFDocument.create();
  out.setProducer("BbeTools"); out.setCreator("BbeTools – Che thông tin trong PDF");
  const covered = new Set(boxes.map((b) => b.page));
  const keepIdx = pages.map((_, i) => i).filter((i) => !covered.has(i));
  src.getPages().forEach((pg, i) => pg.node.set(L.PDFName.of("BbeIdx"), L.PDFNumber.of(i)));
  const newRefs = {};
  ctx.status("Đang chép các trang không cần che…");
  const copied = keepIdx.length ? await out.copyPages(src, keepIdx) : [];
  let k = 0, done = 0;
  for (let i = 0; i < pages.length; i++) {
    ctx.check();
    if (!covered.has(i)) { newRefs[i] = out.addPage(copied[k++]).ref; continue; }
    ctx.status(`Đang che trang ${i + 1} (${++done}/${covered.size})…`);
    const p = pages[i];
    const c = await renderPage(item.doc, p.n, { scale: o.dpi / 72, maxPixels: 40e6 });
    const g = c.getContext("2d");
    g.fillStyle = o.color === "white" ? "#fff" : "#000";
    for (const b of boxes.filter((x) => x.page === i)) {
      const x0 = Math.floor(b.x * c.width), y0 = Math.floor(b.y * c.height);
      g.fillRect(x0, y0, Math.ceil((b.x + b.w) * c.width) - x0, Math.ceil((b.y + b.h) * c.height) - y0);
    }
    const jpg = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
    c.width = c.height = 0;
    const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
    const page = out.addPage([p.w, p.h]);
    newRefs[i] = page.ref;
    page.drawImage(img, { x: 0, y: 0, width: p.w, height: p.h });
    ctx.progress(done / covered.size);
    await nextFrame();
  }
  ctx.status("Đang dọn dữ liệu thừa…");
  scrub(L, out, newRefs);
  const bytes = await out.save({ useObjectStreams: true });
  // tự kiểm tra: mở lại file kết quả, trang bị che phải không còn chữ nào
  ctx.status("Đang kiểm tra lại file kết quả…");
  const pdfjs = await lib("pdfjs");
  const chk = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  let left = 0;
  for (const i of covered) left += (await (await chk.getPage(i + 1)).getTextContent()).items.reduce((s, x) => s + (x.str || "").trim().length, 0);
  await chk.destroy();
  if (left) throw Object.assign(new Error("verify"), { userMsg: "Kiểm tra lại thấy trang bị che vẫn còn chữ, nên chưa xuất file. Hãy báo lỗi kèm file mẫu (không chứa thông tin thật)." });
  return [{ blob: pdfBlob(bytes), name: baseName(item.name) + "-da-che.pdf", note: `${boxes.length} vùng che · ${covered.size}/${pages.length} trang chuyển thành ảnh` }];
}

/* ---------- khung trang ---------- */
fileTool({
  accept: ["pdf"], multiple: false, noun: "file PDF",
  action: "Che và tải về",
  sample: () => sampleFiles("giay-uy-quyen-mau.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  custom: {
    mount(ctx) {
      F = ctx;
      countEl = h("span", { class: "count", "aria-live": "polite" });
      banner = h("p", { class: "alert info", hidden: true, text: "Đây là file mẫu (thông tin giả). Chọn, kéo thả hoặc dán file PDF của bạn để che thật." });
      wrap = h("div", { class: "rd-pages" + (IS_TOUCH ? " touch" : "") + (drawMode ? " drawing" : "") });
      io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); en.target._load(); } }), { rootMargin: "600px" });
      drawBtn = h("button", { class: "btn ghost sm", type: "button", "aria-pressed": String(drawMode), onclick: () => {
        drawMode = !drawMode; drawBtn.setAttribute("aria-pressed", String(drawMode)); wrap.classList.toggle("drawing", drawMode);
        if (drawMode && IS_TOUCH) toast("Kéo ngón tay trên trang để vẽ khung che. Tắt “Vẽ khung” để cuộn trang.");
      } }, h("span", { html: icon("square"), style: { display: "contents" } }), "Vẽ khung");
      undoBtn = h("button", { class: "btn ghost sm", type: "button", disabled: true, onclick: undo }, h("span", { html: icon("rotate-ccw"), style: { display: "contents" } }), "Hoàn tác");
      clearBtn = h("button", { class: "btn ghost sm", type: "button", disabled: true, title: "Bỏ mọi vùng che", onclick: clearAll }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Bỏ hết");
      ctx.workMain.append(h("div", { class: "work-head" }, countEl, h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "File khác"))),
      banner,
      h("div", { class: "rd-bar" }, drawBtn, undoBtn, clearBtn,
        h("span", { class: "hint rd-tip", text: IS_TOUCH ? "Bật “Vẽ khung” rồi kéo trên trang." : "Kéo chuột trên trang để vẽ khung che." })),
      wrap);
    }
  },
  load,
  dispose: (it) => { if (it.doc) it.doc.destroy(); if (it === item) { item = null; pages = []; boxes = []; undoStack = []; texts.clear(); if (wrap) wrap.textContent = ""; update(); } },
  options(el) {
    findIn = h("input", { class: "input", type: "search", placeholder: "VD: Nguyễn Văn Mẫu", autocomplete: "off", "aria-label": "Chữ cần che" });
    const go = () => { const q = findIn.value.trim(); if (q) findAndCover(null, q); else findIn.focus(); };
    findIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    listEl = h("ul", { class: "rd-list", "aria-label": "Các vùng che" });
    sumEl = h("p", { class: "hint", "aria-live": "polite" });
    el.append(
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Tìm rồi che" }),
        h("div", { class: "row", style: { flexWrap: "nowrap" } }, findIn, h("button", { class: "btn", type: "button", text: "Che", onclick: go })),
        h("p", { class: "hint", text: "Không phân biệt hoa thường, có dấu hay không. Che tự động mọi chỗ khớp:" }),
        h("div", { class: "rd-quick" }, Object.entries(PATTERNS).map(([k, p]) => h("button", { class: "btn ghost sm", type: "button", title: p.hint || null, onclick: () => findAndCover(k) },
          h("span", { html: icon("search"), style: { display: "contents" } }), p.label))),
        h("p", { class: "hint", text: "Dãy 9–12 chữ số: số CCCD, CMND, số điện thoại, số tài khoản. Nên xem lại vì có thể che nhầm số tiền lớn." })),
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Vùng che" }), sumEl, listEl),
      seg("color", [["black", "Đen"], ["white", "Trắng"]], "black", "Màu ô che"),
      seg("dpi", [["150", "Vừa"], ["200", "Nét"], ["300", "Rất nét"]], "200", "Độ nét trang bị che"),
      h("p", { class: "hint", text: "Trang có vùng che được chuyển thành ảnh để xoá hẳn chữ bên dưới (không bôi đen rồi sao chép ra được). Mục lục, ô form điền được và thông tin tác giả của file gốc không được giữ lại." }));
    el.addEventListener("change", (e) => { if (e.target.name === "color") wrap.querySelectorAll(".rd-box").forEach((b) => b.classList.toggle("white", color() === "white")); });
    update();
    return () => ({ color: radioVal(el, "color"), dpi: +radioVal(el, "dpi") });
  },
  ready: (items) => (items.some((i) => i.loading) ? "Đang đọc file…" : boxes.length ? true : "Kéo khung lên chỗ cần che, hoặc tìm theo chữ ở bên cạnh."),
  run,
  summary: (outs) => `Đã kiểm tra lại: các trang bị che không còn chữ nào trong file (${fmtNum(outs[0].blob.size / 1024, 0)} KB).`,
  doneTitle: () => "Đã che thông tin!"
});
