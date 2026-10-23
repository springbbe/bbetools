/* Tự sinh bởi scripts/build.js từ assets/tools/view-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Xem PDF: đọc PDF ngay trên trình duyệt, cuộn liên tục, phóng to / thu nhỏ, nhảy trang, tìm chữ (không cần gõ dấu),
   chọn và sao chép chữ, mục lục, xem toàn màn hình. Trang chỉ được vẽ khi cuộn tới. */
import { h, icon, lib, debounce, esc, fmtSize, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openPdf, Locked } from "../pdf.js";
import { findAll } from "../lib/pdf-text.js";

const css = document.createElement("style");
css.textContent = `
.vw-bar{position:sticky;top:var(--top-h);z-index:6;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px;margin:-6px -6px 12px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);border-radius:12px 12px 0 0}
.vw-grp{display:flex;align-items:center;gap:2px}
.vw-bar .input{min-height:36px;padding:4px 8px;font-size:15px}
.vw-pg{width:3.4em;text-align:center}
.vw-q{width:min(220px,46vw)}
.vw-cnt{font-size:13px;color:var(--muted);min-width:4.5em;font-variant-numeric:tabular-nums}
.vw-zoom{min-width:3.6em;text-align:center;font-weight:600;font-size:14px;font-variant-numeric:tabular-nums}
.vw-pages{display:flex;flex-direction:column;align-items:flex-start;gap:22px;overflow-x:auto;padding-bottom:8px}
.vw-page{position:relative;flex:0 0 auto;margin-inline:auto;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.12)}
.vw-page canvas{position:absolute;inset:0;width:100%;height:100%}
.vw-page .pno{position:absolute;left:6px;bottom:-22px;font-size:12px;color:var(--muted)}
.work-main:fullscreen{overflow:auto;background:var(--bg);padding:12px}
.vw-out{list-style:none;margin:0;padding:0;font-size:14.5px;max-height:50vh;overflow:auto}
.vw-out ul{list-style:none;padding-left:14px;margin:0}
.vw-out button{display:block;width:100%;text-align:left;background:none;border:0;padding:5px 6px;border-radius:8px;color:var(--ink)}
.vw-out button:hover{background:var(--surface-2)}
.textLayer{position:absolute;text-align:initial;inset:0;overflow:clip;opacity:1;line-height:1;text-size-adjust:none;-webkit-text-size-adjust:none;forced-color-adjust:none;transform-origin:0 0;caret-color:CanvasText;z-index:0}
.textLayer :is(span,br){color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%}
.textLayer>:not(.markedContent),.textLayer .markedContent span:not(.markedContent){z-index:1}
.textLayer span.markedContent{top:0;height:0}
.textLayer .highlight{margin:-1px;padding:1px;background-color:rgb(255 197 61 / .55);border-radius:3px}
.textLayer .highlight.selected{background-color:rgb(255 120 0 / .65)}
.textLayer ::selection{background:rgb(62 91 242 / .3)}
.textLayer br::selection{background:transparent}
.textLayer .endOfContent{display:block;position:absolute;inset:100% 0 0;z-index:0;cursor:default;user-select:none}
`;
document.head.append(css);

let F = null, item = null, pdfjs = null, pages = [], scale = 1, fit = true, io = null, cur = 1;
let wrap, bar, pgIn, totalEl, zoomEl, qIn, cntEl, countEl, banner, outBox, infoBox;
let matches = [], mi = -1, texts = [];

/* ---------- mở file ---------- */
async function load(it) {
  let r;
  try { r = await openPdf(it.file, { prompt: true }); }
  catch (e) {
    if (!(e instanceof Locked)) throw e;
    const err = new Error("locked"); err.userMsg = `Couldn't open ${it.name} yet: the file is password-protected, enter the correct password.`; throw err;
  }
  pdfjs = await lib("pdfjs");
  Object.assign(it, { doc: r.doc, pages: r.pages, password: r.password });
  it.info = r.pages + " pages";
  const list = [];
  for (let n = 1; n <= r.pages; n++) { const v = (await r.doc.getPage(n)).getViewport({ scale: 1 }); list.push({ n, w: v.width, h: v.height }); }
  item = it; pages = list; texts = []; matches = []; mi = -1; cur = 1; fit = true;
  qIn.value = ""; cntEl.textContent = "";
  build();
  info(it, r.doc);
}

function fitScale() {
  const avail = Math.max(200, wrap.clientWidth - 4), maxW = Math.max(...pages.map((p) => p.w));
  return Math.max(0.25, Math.min(3, avail / maxW));
}
function build() {
  if (fit) scale = fitScale();
  wrap.textContent = "";
  if (io) io.disconnect();
  io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) draw(en.target._p); }), { root: null, rootMargin: "800px 0px" });
  pages.forEach((p) => {
    p.el = h("div", { class: "vw-page", style: { width: Math.round(p.w * scale) + "px", height: Math.round(p.h * scale) + "px", "--scale-factor": scale }, "aria-label": "Page " + p.n, role: "region" },
      h("span", { class: "pno", text: p.n + " / " + pages.length }));
    p.el._p = p; p.drawn = 0;
    wrap.append(p.el);
    io.observe(p.el);
  });
  totalEl.textContent = "/ " + pages.length;
  zoomEl.textContent = Math.round(scale * 100) + "%";
  countEl.textContent = item ? item.name : "";
  banner.hidden = !(item && item.sample);
  bar.hidden = !pages.length;
  pgIn.max = pages.length; pgIn.value = cur;
}

// vẽ một trang (ảnh + lớp chữ) ở tỉ lệ hiện tại
async function draw(p) {
  if (p.drawn === scale || p.busy) return;
  p.busy = true;
  const s = scale;
  try {
    const page = await item.doc.getPage(p.n);
    const dpr = Math.min(2, devicePixelRatio || 1), vp = page.getViewport({ scale: s }), rvp = page.getViewport({ scale: Math.min(s * dpr, 4096 / Math.max(p.w, p.h)) });
    const c = document.createElement("canvas"); c.width = Math.round(rvp.width); c.height = Math.round(rvp.height);
    await page.render({ canvasContext: c.getContext("2d"), viewport: rvp }).promise;
    if (s !== scale) return;
    const tl = h("div", { class: "textLayer" });
    if (!texts[p.n]) texts[p.n] = await page.getTextContent();
    const layer = new pdfjs.TextLayer({ textContentSource: texts[p.n], container: tl, viewport: vp });
    await layer.render();
    p.layer = layer;
    p.el.querySelectorAll("canvas,.textLayer").forEach((x) => x.remove());
    p.el.prepend(c, tl);
    p.drawn = s;
    paintMatches(p);
  } catch (_) { /* file đã đóng */ }
  finally { p.busy = false; }
}

function zoomTo(s, keepFit) {
  const anchor = cur;
  fit = !!keepFit;
  scale = Math.max(0.25, Math.min(4, s));
  build();
  goTo(anchor, true);
}
function goTo(n, instant) {
  n = Math.max(1, Math.min(pages.length, n | 0));
  const p = pages[n - 1];
  if (!p) return;
  cur = n; pgIn.value = n;
  p.el.scrollIntoView({ block: "start", behavior: instant ? "auto" : "smooth" });
}
// trang đang xem = trang chiếm giữa màn hình
const track = debounce(() => {
  const mid = innerHeight / 2;
  for (const p of pages) { const r = p.el.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid - 14) { cur = p.n; if (document.activeElement !== pgIn) pgIn.value = cur; break; } }
}, 80);
addEventListener("scroll", track, { passive: true });

/* ---------- tìm chữ ---------- */
async function search() {
  const q = qIn.value;
  matches = []; mi = -1;
  if (q.trim().length) {
    cntEl.textContent = "Searching…";
    for (const p of pages) {
      if (!texts[p.n]) texts[p.n] = await (await item.doc.getPage(p.n)).getTextContent();
      const items = texts[p.n].items;
      for (const parts of findAll(items.map((x) => x.str || ""), q, items.map((x) => !!x.hasEOL))) matches.push({ page: p.n, parts });
      if (q !== qIn.value) return; // người dùng đã gõ tiếp
    }
  }
  pages.forEach(paintMatches);
  if (matches.length) step(0, true);
  cntEl.textContent = !q.trim() ? "" : matches.length ? `${mi + 1}/${matches.length}` : "Not found";
}
function step(d, first) {
  if (!matches.length) return;
  mi = first ? matches.findIndex((m) => m.page >= cur) : (mi + d + matches.length) % matches.length;
  if (mi < 0) mi = 0;
  cntEl.textContent = `${mi + 1}/${matches.length}`;
  pages.forEach(paintMatches);
  const m = matches[mi], p = pages[m.page - 1];
  const show = () => { const el = p.el.querySelector(".highlight.selected"); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); else p.el.scrollIntoView({ block: "start" }); };
  if (p.drawn === scale) show(); else { p.el.scrollIntoView({ block: "start" }); draw(p).then(show); }
}
// tô sáng các chỗ khớp trên lớp chữ của trang p
function paintMatches(p) {
  if (!p.layer) return;
  const divs = p.layer.textDivs, strs = p.layer.textContentItemsStr;
  const byItem = {};
  matches.forEach((m, i) => { if (m.page === p.n) for (const part of m.parts) (byItem[part.item] = byItem[part.item] || []).push({ ...part, i }); });
  divs.forEach((div, k) => {
    const list = byItem[k], s = strs[k] || "";
    if (!list) { if (div._hl) { div.textContent = s; div._hl = false; } return; }
    let html = "", at = 0;
    for (const m of list) { html += esc(s.slice(at, m.start)) + `<span class="highlight${m.i === mi ? " selected" : ""}">${esc(s.slice(m.start, m.end))}</span>`; at = m.end; }
    div.innerHTML = html + esc(s.slice(at));
    div._hl = true;
  });
}

/* ---------- mục lục, thông tin ---------- */
async function info(it, doc) {
  outBox.textContent = ""; infoBox.textContent = "";
  try {
    const outline = await doc.getOutline();
    if (outline && outline.length) {
      const tree = (list) => h("ul", { class: "vw-out" }, list.map((o) => h("li", null,
        h("button", { type: "button", text: o.title, onclick: async () => {
          try {
            const dest = typeof o.dest === "string" ? await doc.getDestination(o.dest) : o.dest;
            if (dest) goTo((await doc.getPageIndex(dest[0])) + 1);
            else if (o.url) window.open(o.url, "_blank", "noopener");
          } catch (_) { /* đích lạ */ }
        } }),
        o.items && o.items.length ? tree(o.items) : null)));
      outBox.append(h("p", { class: "opt-title", text: "Contents" }), tree(outline));
    }
  } catch (_) { /* không có mục lục */ }
  try {
    const m = await doc.getMetadata(), inf = m.info || {};
    const rows = [["Title", inf.Title], ["Author", inf.Author], ["Pages", doc.numPages], ["Size", fmtSize(it.size)], ["PDF version", inf.PDFFormatVersion]].filter((x) => x[1]);
    infoBox.append(h("p", { class: "opt-title", text: "Info" }), h("dl", { class: "kv" }, rows.map(([k, v]) => [h("dt", { text: k }), h("dd", { text: String(v) })])));
  } catch (_) { /* bỏ qua */ }
}

/* ---------- khung ---------- */
const ib = (ico, label, onclick) => h("button", { class: "ib sm", type: "button", title: label, "aria-label": label, html: icon(ico), onclick });
fileTool({
  accept: ["pdf"], multiple: false, noun: "file PDF",
  action: "View",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  warm: () => lib("pdfjs"),
  custom: {
    mount(ctx) {
      F = ctx;
      ctx.goBtn.closest(".act").hidden = true; // chỉ xem, không có bước xử lý
      countEl = h("span", { class: "count", "aria-live": "polite" });
      banner = h("p", { class: "alert info", hidden: true, text: "This is a sample file. Choose, drag and drop or paste your PDF file to view it." });
      pgIn = h("input", { class: "input vw-pg", type: "number", min: 1, value: 1, inputmode: "numeric", "aria-label": "Pages", onchange: () => goTo(+pgIn.value) });
      totalEl = h("span", { class: "vw-cnt" });
      zoomEl = h("span", { class: "vw-zoom", "aria-live": "polite" });
      qIn = h("input", { class: "input vw-q", type: "search", placeholder: "Search text (accents optional)", "aria-label": "Search text in the PDF", autocomplete: "off",
        oninput: debounce(search, 250), onkeydown: (e) => { if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); } } });
      cntEl = h("span", { class: "vw-cnt", "aria-live": "polite" });
      bar = h("div", { class: "vw-bar", hidden: true },
        h("div", { class: "vw-grp" }, ib("chevron-left", "Previous page", () => goTo(cur - 1)), pgIn, totalEl, ib("chevron-right", "Next page", () => goTo(cur + 1))),
        h("div", { class: "vw-grp" }, ib("zoom-out", "Zoom out", () => zoomTo(scale / 1.2)), zoomEl, ib("zoom-in", "Zoom in", () => zoomTo(scale * 1.2)), ib("maximize", "Fit width", () => zoomTo(fitScale(), true))),
        h("div", { class: "vw-grp" }, qIn, ib("arrow-up", "Previous match", () => step(-1)), ib("arrow-down", "Next match", () => step(1)), cntEl),
        h("div", { class: "vw-grp" }, ib("monitor", "Full screen", () => { const m = ctx.workMain; if (document.fullscreenElement) document.exitFullscreen(); else if (m.requestFullscreen) m.requestFullscreen().then(() => zoomTo(fitScale(), true)).catch(() => {}); }),
          h("a", { class: "ib sm", title: "Open in the browser's viewer (for printing)", "aria-label": "Open in the browser's viewer to print", html: icon("printer"), href: "#", target: "_blank", rel: "noopener",
            onclick: (e) => { if (!item) return; e.currentTarget.href = URL.createObjectURL(new Blob([item.file], { type: "application/pdf" })); } })));
      wrap = h("div", { class: "vw-pages" });
      ctx.workMain.append(h("div", { class: "work-head" }, countEl, h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Other file"))),
      banner, bar, wrap);
      addEventListener("resize", debounce(() => { if (fit && pages.length) zoomTo(fitScale(), true); }, 200));
      document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && pages.length) zoomTo(fitScale(), true); });
      document.addEventListener("keydown", (e) => {
        if (!pages.length || F.state.step !== "work") return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); qIn.focus(); qIn.select(); }
      });
    }
  },
  load,
  dispose: (it) => { if (it.doc) it.doc.destroy(); if (it === item) { item = null; pages = []; if (wrap) wrap.textContent = ""; if (bar) bar.hidden = true; } },
  options(el) {
    outBox = h("div", { class: "opt-group" }); infoBox = h("div", { class: "opt-group" });
    el.append(outBox, infoBox, h("p", { class: "hint", html: `Tip: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>F</kbd> to search, <kbd>Enter</kbd> for the next match. Select text to copy it.` }));
  },
  ready: () => "Viewing",
  run: async () => null
});
