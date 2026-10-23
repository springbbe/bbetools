/* Tự sinh bởi scripts/build.js từ assets/pdf-pages.js và i18n/en/js/ — đừng sửa tay. */
/* Bảng trang PDF: khung chung cho các công cụ làm việc với từng trang (tách, xoá, sắp xếp, xoay, PDF sang ảnh…).
   Dựng trên khung file (frames/file.js, chế độ custom): mở PDF (hỏi mật khẩu khi cần), hiện mỗi trang một thẻ có ảnh
   thu nhỏ (vẽ dần khi cuộn tới), bấm chọn (giữ Shift để chọn cả dãy), xoay, xoá, kéo thả / nút ← → đổi thứ tự.

   pageTool({
     noun, action, sample, multiple,            // như fileTool; multiple: true = ghép trang của nhiều file (Sắp xếp trang)
     tick: "sel" | "off" | () => "sel" | null,  // dấu trên thẻ: ✓ chọn hoặc ✕ xoá
     rangeProp: "sel" | "off",                  // thuộc tính đổi khi Shift + bấm chọn cả dãy
     reorder, rotate, remove,                   // nút trên thẻ: ← →, ↺ ↻, 🗑
     clickLabel: "Bấm để chọn",                 // mô tả hành động khi bấm thẻ (cho trình đọc màn hình)
     initPage(p), click(p, idx, e, B),
     group(p, idx) → { color, label } | null,   // vạch màu dưới thẻ (vd. thuộc file kết quả số mấy)
     tools(B) → [Node],                         // nút thêm trên thanh công cụ của bảng
     options(el, ctx, B) → getter, onChange(B, ctx), summary(B, opts) → html, ready(B, opts) → true | "lý do",
     decorate(sheet, p, idx, B),                // vẽ xem trước lên trang (số trang, watermark…); sheet có container-type nên dùng được đơn vị cqw
     onPages(B, item), run(B, opts, ctx) → outs, doneTitle, zipName
   })
   Mỗi trang p: { key, it (file nguồn), n (số trang gốc), rot (xoay thêm), w, h (kích thước gốc, pt), sel, off, blank } */
import { h, icon, lib, IS_TOUCH } from "./core.js";
import { fileTool } from "./frames/file.js";
import { openPdf, libDoc, renderPage, Locked } from "./pdf.js";
import { parseRanges, toRanges } from "./lib/page-ranges.js";

const btn = (ico, label, onclick, title) => h("button", { class: "btn ghost sm", type: "button", title: title || null, onclick }, h("span", { html: icon(ico), style: { display: "contents" } }), label);
const ib = (ico, label, act, onclick, extra) => h("button", Object.assign({ class: "ib sm", type: "button", "aria-label": label, title: label, html: icon(ico), "data-act": act, onclick: (e) => { e.stopPropagation(); onclick(e); } }, extra));
export const visDims = (p) => (p.rot % 180 ? [p.h, p.w] : [p.w, p.h]);

// vẽ ảnh thu nhỏ lần lượt từng trang để không làm đơ trang
let queue = Promise.resolve();
function thumbOf(p) {
  if (!p.thumbP) p.thumbP = queue = queue.then(async () => {
    const c = await renderPage(p.it.doc, p.n, { width: 170 * Math.min(2, devicePixelRatio || 1) });
    p.thumb = c.toDataURL("image/jpeg", 0.75);
    c.width = c.height = 0;
    return p.thumb;
  }).catch(() => { p.thumbP = null; return null; });
  return p.thumbP;
}

export function pageTool(cfg) {
  const B = { pages: [], cfg, ctx: null, visDims };
  let key = 0, lastIdx = -1, dragFrom = -1, sig = "", grid, countEl, toolsEl, banner, sumEl, spin, io;
  const tickMode = () => (typeof cfg.tick === "function" ? cfg.tick() : cfg.tick || null);

  async function load(it) {
    let r;
    try { r = await openPdf(it.file, { prompt: true }); }
    catch (e) {
      if (!(e instanceof Locked)) throw e;
      const err = new Error("locked"); err.userMsg = `Couldn't open ${it.name} yet: the file is password-protected, enter the correct password.`; throw err;
    }
    Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages });
    it.info = `${r.pages} ${(r.pages) == 1 ? "page" : "pages"}`;
    const list = [];
    for (let n = 1; n <= r.pages; n++) {
      const vp = (await r.doc.getPage(n)).getViewport({ scale: 1 });
      list.push({ key: ++key, it, n, rot: 0, w: vp.width, h: vp.height, sel: false, off: false });
      if (n % 100 === 0) await new Promise((res) => setTimeout(res, 0));
    }
    if (cfg.initPage) list.forEach(cfg.initPage);
    B.pages.push(...list);
    if (cfg.onPages) cfg.onPages(B, it);
  }

  /* ---- vẽ bảng ---- */
  function mount(ctx) {
    B.ctx = ctx;
    countEl = h("span", { class: "count", "aria-live": "polite" });
    toolsEl = h("div", { class: "row pg-tools" });
    banner = h("p", { class: "alert info", hidden: true, text: "This is a sample file. Choose, drag and drop or paste your own file and it will replace the sample." });
    grid = h("ol", { class: "pg-grid" + (cfg.rotate || cfg.remove || cfg.reorder ? " roomy" : ""), "aria-label": "PDF pages" });
    spin = h("p", { class: "status", hidden: true }, h("span", { class: "spinner sm" }), " Reading file…");
    ctx.workMain.append(h("div", { class: "work-head" }, countEl, toolsEl), banner, spin, grid);
    io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      if (en.target._load) en.target._load();
    }), { rootMargin: "300px" });
    // dòng tóm tắt dưới phần tuỳ chọn
    sumEl = h("p", { class: "alert info pg-sum", "aria-live": "polite" });
    ctx.optsEl.append(sumEl);
  }

  function toolbar() {
    toolsEl.textContent = "";
    const extra = cfg.tools ? cfg.tools(B) : [];
    toolsEl.append(...extra,
      cfg.multiple ? btn("plus", "Add PDF", () => B.ctx.pick(), "Add pages from another PDF file") : btn("refresh-cw", "Other file", () => B.ctx.pick(), "Choose another PDF file"),
      btn("trash-2", "Remove all", () => B.ctx.clear(), "Remove the file and start over"));
  }

  const nameOf = (p) => p.blank ? "Blank page" : (B.ctx.items.length > 1 ? String.fromCharCode(65 + Math.max(0, Math.min(25, B.ctx.items.indexOf(p.it)))) + " · " : "") + "Page " + p.n;
  const labelOf = (p, idx, sel, off) => `${idx + 1}. ${nameOf(p)}${p.rot ? ", rotated " + p.rot + "°" : ""}${sel ? ", selected" : ""}${off ? ", will be deleted" : ""}` + (cfg.click && cfg.clickLabel ? ". " + cfg.clickLabel : "");

  function card(p, idx, tk) {
    const [vw, vh] = visDims(p);
    const sel = tk === "sel" && !!p.sel, off = tk === "off" && !!p.off;
    const im = p.blank ? null : h("img", { alt: "", src: p.thumb || null, style: {
      width: (p.rot % 180 ? (vh / vw) * 100 : 100) + "%", height: (p.rot % 180 ? (vw / vh) * 100 : 100) + "%",
      transform: `translate(-50%, -50%) rotate(${p.rot}deg)`, visibility: p.thumb ? null : "hidden" } });
    const sheet = h("div", { class: "pg-sheet" + (p.blank ? " blank" : ""), style: { aspectRatio: vw + " / " + vh, [vw / vh > 0.78 ? "width" : "height"]: "100%" } }, im || h("span", { text: "Blank page" }));
    if (cfg.decorate) cfg.decorate(sheet, p, idx, B);
    const name = nameOf(p), clickable = !!cfg.click, label = labelOf(p, idx, sel, off);
    const li = h("li", { class: "pgc" + (sel ? " sel" : "") + (off ? " off" : "") + (clickable ? " clickable" : ""), dataset: { key: p.key } });
    const face = h("div", clickable
      ? { class: "pg-face", role: "button", tabindex: "0", "aria-pressed": tk ? String(sel || off) : null, "aria-label": label }
      : { class: "pg-face", role: "img", "aria-label": label },
    h("div", { class: "pg-slot" }, sheet),
    h("span", { class: "pg-num", text: idx + 1 }),
    tk ? h("span", { class: "pg-tick", html: icon(tk === "off" ? "x" : "check") }) : null);
    li.append(face);
    // nút trên thẻ
    const acts = [];
    if (cfg.rotate) acts.push(ib("rotate-ccw", "Rotate left page " + (idx + 1), "rl", () => turn(p, -90)), ib("rotate-cw", "Rotate right page " + (idx + 1), "rr", () => turn(p, 90)));
    if (cfg.remove) acts.push(ib("trash-2", "Delete page " + (idx + 1), "del", () => { B.pages.splice(idx, 1); changed(true); focusCard(Math.min(idx, B.pages.length - 1)); }));
    if (acts.length) li.append(h("div", { class: "pg-acts" + (IS_TOUCH ? " show" : "") }, acts));
    const g = cfg.group ? cfg.group(p, idx) : null;
    li.append(h("div", { class: "pg-cap" },
      cfg.reorder ? ib("arrow-left", "Move page " + (idx + 1) + " up", "prev", () => move(idx, idx - 1), { disabled: idx === 0 }) : null,
      h("span", { class: "pg-name", title: name, text: name + (p.rot ? " · ↻" + p.rot + "°" : "") }),
      cfg.reorder ? ib("arrow-right", "Move page " + (idx + 1) + " ra sau", "next", () => move(idx, idx + 1), { disabled: idx === B.pages.length - 1 }) : null));
    if (g) li.append(h("span", { class: "pg-group", style: { "--g": g.color }, title: g.label, text: g.label }));
    if (clickable) {
      const act = (e) => {
        if (cfg.rangeProp && e.shiftKey && lastIdx >= 0 && lastIdx < B.pages.length && lastIdx !== idx) {
          const v = !p[cfg.rangeProp];
          for (let i = Math.min(lastIdx, idx); i <= Math.max(lastIdx, idx); i++) B.pages[i][cfg.rangeProp] = v;
        } else cfg.click(p, idx, e, B);
        lastIdx = idx;
        changed(cfg.click.structural);
      };
      face.addEventListener("click", act);
      face.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(e); } });
    }
    if (cfg.reorder && !IS_TOUCH && B.pages.length > 1) {
      li.draggable = true;
      li.addEventListener("dragstart", (e) => { dragFrom = idx; li.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(idx)); } catch (_) {} });
      li.addEventListener("dragend", () => { dragFrom = -1; li.classList.remove("dragging"); grid.querySelectorAll(".drop-before,.drop-after").forEach((x) => x.classList.remove("drop-before", "drop-after")); });
      li.addEventListener("dragover", (e) => {
        if (dragFrom < 0) return;
        e.preventDefault();
        const after = dragFrom < idx;
        li.classList.toggle("drop-after", after); li.classList.toggle("drop-before", !after);
      });
      li.addEventListener("dragleave", () => li.classList.remove("drop-before", "drop-after"));
      li.addEventListener("drop", (e) => { if (dragFrom < 0) return; e.preventDefault(); const f = dragFrom; dragFrom = -1; move(f, idx); });
    }
    if (im && !p.thumb) {
      li._load = async () => { const u = await thumbOf(p); if (u) { im.src = u; im.style.visibility = ""; } };
      io.observe(li);
    }
    return li;
  }

  function render() {
    if (!grid) return;
    // giữ tiêu điểm bàn phím trên đúng thẻ / đúng nút sau khi dựng lại
    const ae = document.activeElement, cur = ae && ae.closest && ae.closest(".pgc");
    const fKey = cur && cur.dataset.key, fSel = cur && (ae.dataset.act ? `[data-act="${ae.dataset.act}"]` : ".pg-face");
    io.disconnect();
    grid.textContent = "";
    const items = B.ctx.items, tk = tickMode();
    B.pages.forEach((p, idx) => grid.append(card(p, idx, tk)));
    const loading = items.some((i) => i.loading);
    spin.hidden = !loading;
    const n = B.pages.length;
    countEl.textContent = n ? `${n} ${(n) == 1 ? "page" : "pages"}` + (items.length === 1 ? " · " + items[0].name : items.length > 1 ? " · " + items.length + " file" : "") : "";
    banner.hidden = !items.some((i) => i.sample);
    toolbar();
    if (fKey) {
      const li = grid.querySelector(`[data-key="${fKey}"]`);
      const want = li && li.querySelector(fSel);
      const t = want && !want.disabled ? want : li && (li.querySelector(".pg-face[tabindex]") || li.querySelector("button:not([disabled])"));
      if (t) t.focus({ preventScroll: true });
    }
  }
  function focusCard(i) {
    const li = grid.children[i];
    const t = li && (li.querySelector(".pg-face[tabindex]") || li.querySelector("button:not([disabled])"));
    if (t) t.focus({ preventScroll: true });
  }
  function move(from, to) {
    if (to < 0 || to >= B.pages.length || from === to) return;
    const [x] = B.pages.splice(from, 1);
    B.pages.splice(to, 0, x);
    changed(true);
  }
  function turn(p, d) { p.rot = (p.rot + d + 360) % 360; changed(true); }

  /** Gọi sau khi đổi trạng thái trang. structural = vẽ lại cả bảng (đổi thứ tự, xoay, xoá); không thì chỉ cập nhật dấu chọn */
  function changed(structural) {
    if (structural) render(); else repaint();
    B.ctx.refresh();
  }
  // cập nhật dấu chọn/xoá mà không dựng lại thẻ (giữ nguyên tiêu điểm bàn phím)
  function repaint() {
    const tk = tickMode();
    [...grid.children].forEach((li, idx) => {
      const p = B.pages[idx];
      if (!p) return;
      const sel = tk === "sel" && !!p.sel, off = tk === "off" && !!p.off;
      li.classList.toggle("sel", sel); li.classList.toggle("off", off);
      const face = li.querySelector(".pg-face");
      if (face.hasAttribute("aria-pressed") !== !!tk) { render(); return; }
      if (tk) face.setAttribute("aria-pressed", String(sel || off));
      face.setAttribute("aria-label", labelOf(p, idx, sel, off));
      const g = cfg.group ? cfg.group(p, idx) : null, old = li.querySelector(".pg-group");
      if (old) old.remove();
      if (g) li.append(h("span", { class: "pg-group", style: { "--g": g.color }, title: g.label, text: g.label }));
    });
  }
  B.render = render;
  B.repaint = () => { if (grid) repaint(); };
  /** Vẽ lại phần xem trước (.deco) trên mọi thẻ mà không dựng lại bảng */
  B.redecorate = () => {
    if (!grid || !cfg.decorate) return;
    [...grid.querySelectorAll(".pg-sheet")].forEach((sh, idx) => {
      sh.querySelectorAll(".deco").forEach((d) => d.remove());
      if (B.pages[idx]) cfg.decorate(sh, B.pages[idx], idx, B);
    });
  };
  B.changed = changed;
  B.move = move;

  // đồng bộ danh sách trang với danh sách file của khung (file bị bỏ, file mẫu bị thay)
  function sync(ctx) {
    if (!grid) return;
    const items = ctx.items;
    B.pages = B.pages.filter((p) => (p.blank ? items.length > 0 : items.includes(p.it)));
    const s = items.map((i) => i.id + (i.loading ? "…" : "")).join(",");
    if (s !== sig) { sig = s; lastIdx = -1; render(); }
    const sum = B.pages.length && cfg.summary ? cfg.summary(B, ctx.opts) : "";
    sumEl.innerHTML = sum ? "<span>" + sum + "</span>" : ""; // .alert là flex: bọc lại để chữ không vỡ cột
    sumEl.hidden = !sumEl.innerHTML;
  }

  /** Chép các trang (theo đúng thứ tự, kèm góc xoay) sang một PDF mới của pdf-lib */
  B.build = async function (list) {
    const L = await lib("pdflib");
    const out = await L.PDFDocument.create();
    const need = new Map();
    for (const p of list) if (!p.blank) { if (!need.has(p.it)) need.set(p.it, new Set()); need.get(p.it).add(p.n - 1); }
    const copied = new Map();
    for (const [it, set] of need) {
      if (!it.lib) it.lib = libDoc(it.bytes, it.password);
      const src = await it.lib;
      const idxs = [...set].sort((a, b) => a - b);
      const cps = await out.copyPages(src, idxs);
      idxs.forEach((n, k) => copied.set(it.id + ":" + n, cps[k]));
    }
    const used = new Set();
    for (const p of list) {
      if (p.blank) { const bp = out.addPage([p.w, p.h]); if (p.rot) bp.setRotation(L.degrees(p.rot)); continue; }
      const k = p.it.id + ":" + (p.n - 1);
      let pg = copied.get(k);
      if (used.has(k)) [pg] = await out.copyPages(await p.it.lib, [p.n - 1]); // cùng một trang đặt hai lần
      used.add(k);
      if (p.rot) pg.setRotation(L.degrees(((pg.getRotation().angle || 0) + p.rot) % 360));
      out.addPage(pg);
    }
    return out;
  };
  /** Ô nhập khoảng trang đồng bộ hai chiều với thuộc tính prop ("sel"/"off") của các trang */
  B.rangeField = function (prop, label, placeholder, hint) {
    const input = h("input", { class: "input", inputmode: "numeric", autocomplete: "off", spellcheck: "false", placeholder });
    const err = h("p", { class: "field-err", hidden: true });
    input.addEventListener("input", () => {
      const r = parseRanges(input.value, B.pages.length);
      err.hidden = !r.bad;
      err.textContent = r.bad ? `Something isn't right (the file has ${B.pages.length} pages). Example: 1-3, 5, 8-` : "";
      const set = new Set(r.pages);
      B.pages.forEach((p, i) => { p[prop] = set.has(i + 1); });
      repaint();
    });
    const el = h("label", { class: "field" }, h("span", { text: label }), input, err, hint ? h("small", { text: hint }) : null);
    el.addEventListener("click", (e) => e.stopPropagation());
    return { el, input, sync() { if (document.activeElement !== input) { input.value = toRanges(B.pages.flatMap((p, i) => (p[prop] ? [i + 1] : []))); err.hidden = true; } } };
  };

  fileTool({
    accept: ["pdf"], multiple: !!cfg.multiple, noun: cfg.noun || "file PDF",
    action: cfg.action, sample: cfg.sample, pickLabel: cfg.pickLabel,
    warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
    custom: { mount },
    load,
    dispose: (it) => { if (it.doc) it.doc.destroy(); },
    options: (el, c) => (cfg.options ? cfg.options(el, c, B) : null),
    onChange: (c) => { if (cfg.onChange) cfg.onChange(B, c); sync(c); },
    ready: (items, opts) => {
      if (items.some((i) => i.loading)) return "Reading file…";
      if (!B.pages.length) return "No pages yet.";
      return cfg.ready ? cfg.ready(B, opts) : true;
    },
    run: (items, opts, c) => cfg.run(B, opts, c),
    doneTitle: cfg.doneTitle, summary: cfg.resultSummary, zipName: cfg.zipName
  });
  return B;
}

/** Một PDF gốc (để đặt tên file kết quả) */
export const firstItem = (B) => B.ctx.items.find((i) => i.doc) || B.ctx.items[0];

/** Lưới chọn vị trí trên trang. positions: [["tl", "Trên trái"], …] theo thứ tự 3 cột */
export function posGrid(name, positions, value, label) {
  const out = h("output", { class: "hint", text: (positions.find((x) => x[0] === value) || [])[1] || "" });
  const grid = h("div", { class: "posgrid", role: "radiogroup", "aria-label": label },
    positions.map(([v, l]) => h("label", { title: l }, h("input", { type: "radio", name, value: v, "aria-label": l, checked: v === value }), h("span"))));
  grid.addEventListener("change", (e) => { const x = positions.find((p) => p[0] === e.target.value); if (x) out.textContent = x[1]; });
  return h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: label }), h("div", { class: "pos-row" }, grid, out));
}

/** Hàng chấm màu để chọn. colors: [["#000000", "Đen"], …] */
export const colorPick = (name, colors, value, label) => h("div", { class: "opt-group" }, h("p", { class: "opt-title", id: "lbl-" + name, text: label }),
  h("div", { class: "colors", role: "radiogroup", "aria-labelledby": "lbl-" + name },
    colors.map(([c, l]) => h("label", { title: l }, h("input", { type: "radio", name, value: c, "aria-label": l, checked: c === value }), h("span", { class: "dot", style: { background: c } })))));
