/* Tự sinh bởi scripts/build.js từ assets/frames/file.js và i18n/en/js/ — đừng sửa tay. */
/* Khung 1: file vào → file ra.
   Lõi lo: nhận file (nút chọn, kéo thả vào bất cứ đâu, dán Ctrl/⌘+V, link trực tiếp, file chuyển từ công cụ khác),
   danh sách file có xem trước và sắp xếp, nút chạy + tiến trình + huỷ, màn kết quả (tải từng file / .zip),
   và "Tiếp tục với file này". Công cụ chỉ khai báo phần riêng:

   fileTool({
     accept: ["pdf"], multiple: true, noun: "file PDF",
     sample: async () => [File],                 // file mẫu (tuỳ chọn)
     reorder: true,                               // cho kéo thả / nút ↑↓ đổi thứ tự
     load: async (item) => {},                    // đọc file: đặt item.thumb (URL/canvas), item.info (chuỗi), ném lỗi nếu hỏng
     itemActions: (item, ctx) => [Node],          // nút riêng cho từng file (xoay, nhập mật khẩu…)
     options: (el, ctx) => getter,                // vẽ phần tuỳ chọn, trả về hàm lấy giá trị
     action: "Ghép PDF",
     ready: (items, opts) => true | "lý do",
     run: async (items, opts, ctx) => [{ blob, name, note, before, actions: [{ icon, label, run(out) }] }],
     doneTitle: (outs, items) => "Xong!",
     onChange: (ctx) => {},                      // gọi mỗi khi danh sách/tuỳ chọn đổi
     custom: { mount(ctx) }                       // tự vẽ vùng làm việc (vd. Làm ảnh thẻ)
   }) */
import { $, h, icon, toast, intake, save, zip, fmtSize, baseName, fileKinds, accepts, KIND_LABEL, takeHandoff, toolsForFiles, sendTo, registry, nextFrame, IS_TOUCH, MOD, ROOT, TOOL_ID, toolHref } from "../core.js";
import { describeAccept } from "../lib/filetype.js";

export class Cancelled extends Error { constructor() { super("Cancelled"); this.cancelled = true; } }

export function fileTool(cfg) {
  const app = $("#app");
  app.textContent = "";
  const noun = cfg.noun || "file";
  const state = { step: "pick", items: [], busy: false, outs: [], uid: 0, abort: null };

  /* ---- màn chọn file ---- */
  const dz = h("section", { class: "dz", "aria-label": "Choose " + noun },
    h("span", { class: "dz-ico", html: icon("upload") }),
    h("h2", { text: cfg.multiple ? `Choose ${noun} (one or more)` : `Choose ${noun}` }),
    h("div", { class: "row" },
      h("button", { class: "btn big", type: "button", onclick: () => pick() }, h("span", { html: icon("file"), style: { display: "contents" } }), cfg.pickLabel || "Choose " + noun),
      cfg.sample ? h("button", { class: "btn ghost", type: "button", onclick: trySample }, h("span", { html: icon("sparkles"), style: { display: "contents" } }), "Try a sample file") : null),
    h("p", { html: IS_TOUCH ? "or paste a copied file: tap and hold → Paste" : `or drag and drop anywhere, or paste with <kbd>${MOD}</kbd> + <kbd>V</kbd> (screenshots, files, links)` }),
    h("p", { class: "fmt", text: describeAccept(cfg.accept) }));

  /* ---- màn làm việc ---- */
  const list = h("ul", { class: "flist", "aria-label": "File list" });
  const countEl = h("span", { class: "count", "aria-live": "polite" });
  const headBtns = h("div", { class: "row" });
  const side = h("aside", { class: "work-side" });
  const optsEl = h("div", { class: "opts" });
  const statusEl = h("p", { class: "status", role: "status" });
  const prog = h("div", { class: "progress", hidden: true }, h("div"));
  const goBtn = h("button", { class: "btn big block", type: "button", onclick: () => run() }, cfg.action || "Process");
  const cancelBtn = h("button", { class: "btn ghost block", type: "button", hidden: true, text: "Cancel", onclick: () => state.abort && state.abort.abort() });
  const act = h("div", { class: "act sticky" }, statusEl, prog, goBtn, cancelBtn);
  side.append(optsEl, act);
  const addRow = h("div", { class: "add-more" },
    cfg.multiple ? h("button", { class: "btn ghost sm", type: "button", onclick: () => pick() }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Add files") : h("button", { class: "btn ghost sm", type: "button", onclick: () => pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Choose other files"),
    h("button", { class: "btn ghost sm", type: "button", onclick: clear }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Remove all"));
  const mainCol = h("div", { class: "work-main" }, h("div", { class: "work-head" }, countEl, headBtns), list, addRow);
  const work = h("section", { class: "work", hidden: true }, mainCol, side);

  /* ---- màn kết quả ---- */
  const done = h("section", { class: "pad", hidden: true, "aria-live": "polite" });
  app.append(dz, work, done);

  const ctx = {
    app, state, cfg,
    get items() { return state.items; },
    get opts() { return getOpts ? getOpts() : {}; },
    status, progress, refresh, render, finish, show,
    addFiles: (fs) => addFiles(fs, "api"),
    pick, clear,
    check: () => { if (state.abort && state.abort.signal.aborted) throw new Cancelled(); },
    workMain: mainCol, side, optsEl, goBtn
  };

  let getOpts = null;
  if (cfg.options) getOpts = cfg.options(optsEl, ctx) || null;
  optsEl.addEventListener("input", () => refresh());
  optsEl.addEventListener("change", () => refresh());
  if (cfg.custom) { mainCol.textContent = ""; cfg.custom.mount(ctx); }

  const inp = intake({ accept: cfg.accept, multiple: cfg.multiple, onFiles: addFiles, enabled: () => !state.busy, label: "Drop " + noun + " here" });
  function pick() { inp.pick(); }

  function show(step) {
    state.step = step;
    dz.hidden = step !== "pick"; work.hidden = step !== "work"; done.hidden = step !== "done";
    if (step !== "pick") app.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function status(msg, kind) { statusEl.textContent = msg || ""; statusEl.className = "status" + (kind ? " " + kind : ""); }
  function progress(f) {
    if (f == null) { prog.hidden = true; prog.classList.remove("indet"); return; }
    prog.hidden = false;
    if (f < 0) { prog.classList.add("indet"); return; }
    prog.classList.remove("indet");
    prog.firstElementChild.style.width = Math.round(Math.min(1, f) * 100) + "%";
  }

  async function addFiles(files, how) {
    const ok = [], bad = [];
    for (const f of files) (accepts(cfg.accept, await fileKinds(f)) ? ok : bad).push(f);
    if (bad.length) {
      const others = await toolsForFiles(bad).catch(() => []);
      toast(`Skipped ${bad.length} ${(bad.length) == 1 ? "file that isn't" : "files that aren't"} ${noun}.`, others.length ? { action: { label: "Suitable tools", run: () => import("../core.js").then((c) => c.chooseToolFor(bad)) } } : {});
    }
    if (!ok.length) return;
    // file mẫu bị thay khi người dùng đưa file thật vào
    if (how !== "sample" && state.items.some((i) => i.sample)) state.items = state.items.filter((i) => !i.sample);
    let fresh = ok.map((f) => ({ id: ++state.uid, file: f, name: f.name, size: f.size, sample: how === "sample", loading: !!cfg.load, rot: 0 }));
    if (!cfg.multiple) { state.items.forEach(dispose); state.items = []; fresh = fresh.slice(0, 1); }
    state.items.push(...fresh);
    show("work");
    render();
    if (cfg.onAdd) cfg.onAdd(fresh, ctx);
    if (cfg.load) {
      for (const it of fresh) {
        try { await cfg.load(it, ctx); }
        catch (e) {
          console.error(e);
          if (e && e.keep) it.error = e.message;
          else { toast((e && e.userMsg) || `Couldn't read ${it.name}. The file may be corrupted.`, { type: "err" }); state.items = state.items.filter((x) => x !== it); }
        }
        it.loading = false;
        render();
      }
      if (!state.items.length) show("pick");
    }
  }
  function dispose(it) { if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl); if (cfg.dispose) cfg.dispose(it); }
  function clear() { state.items.forEach(dispose); state.items = []; render(); show("pick"); status(""); }
  async function trySample(e) {
    const b = e.currentTarget; b.disabled = true;
    try { await addFiles(await cfg.sample(), "sample"); }
    catch (err) { console.error(err); toast("Couldn't load the sample file: " + err.message, { type: "err" }); }
    b.disabled = false;
  }

  const move = (from, to) => {
    if (to < 0 || to >= state.items.length || from === to) return;
    const [x] = state.items.splice(from, 1); state.items.splice(to, 0, x); render();
    const btn = list.children[to] && list.children[to].querySelector(from > to ? "[data-up]" : "[data-down]");
    if (btn && !btn.disabled) btn.focus();
  };
  let dragFrom = -1;

  function render() {
    if (cfg.custom) { refresh(); return; }
    list.textContent = "";
    const n = state.items.length;
    state.items.forEach((it, idx) => {
      const thumb = h("span", { class: "thumb" });
      if (it.thumb) {
        if (typeof it.thumb === "string") thumb.append(h("img", { src: it.thumb, alt: "", style: it.rot ? { transform: `rotate(${it.rot}deg)` } : null }));
        else thumb.append(it.thumb);
      } else if (it.loading) thumb.innerHTML = '<span class="spinner sm"></span>';
      else thumb.innerHTML = icon(it.locked ? "lock" : "file");
      const sub = it.loading ? "Reading…" : it.error ? it.error : [fmtSize(it.size), it.info].filter(Boolean).join(" · ");
      const li = h("li", { class: "fitem", "aria-label": `${idx + 1}. ${it.name}` },
        cfg.reorder && n > 1 && !IS_TOUCH ? h("span", { class: "grip", html: icon("grip-vertical"), "aria-hidden": "true" }) : null,
        cfg.reorder ? h("span", { class: "num", text: idx + 1 }) : null,
        thumb,
        h("span", { class: "fmeta" }, h("span", { class: "fname", title: it.name, text: it.name }), h("span", { class: "fsub" + (it.error ? " bad" : ""), text: sub })),
        h("span", { class: "facts" },
          cfg.itemActions ? cfg.itemActions(it, ctx) : null,
          cfg.reorder && n > 1 ? [
            h("button", { class: "ib sm", type: "button", "data-up": "", disabled: idx === 0, "aria-label": "Move " + it.name + " up", title: "Move up", html: icon("arrow-up"), onclick: () => move(idx, idx - 1) }),
            h("button", { class: "ib sm", type: "button", "data-down": "", disabled: idx === n - 1, "aria-label": "Move " + it.name + " down", title: "Move down", html: icon("arrow-down"), onclick: () => move(idx, idx + 1) })] : null,
          h("button", { class: "ib sm", type: "button", "aria-label": "Remove " + it.name, title: "Remove this file", html: icon("x"), onclick: () => { dispose(it); state.items.splice(idx, 1); if (!state.items.length) show("pick"); render(); } })));
      if (cfg.reorder && n > 1) {
        li.draggable = true;
        li.addEventListener("dragstart", (e) => { dragFrom = idx; li.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(idx)); } catch (_) {} });
        li.addEventListener("dragend", () => { dragFrom = -1; li.classList.remove("dragging"); $$drop().forEach((x) => x.classList.remove("drop-target")); });
        li.addEventListener("dragover", (e) => { if (dragFrom < 0) return; e.preventDefault(); e.stopPropagation(); li.classList.add("drop-target"); });
        li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
        li.addEventListener("drop", (e) => { if (dragFrom < 0) return; e.preventDefault(); e.stopPropagation(); const f = dragFrom; dragFrom = -1; move(f, idx); });
      }
      list.append(li);
    });
    countEl.textContent = n + " file" + (cfg.reorder && n > 1 ? (IS_TOUCH ? " · use ↑↓ to reorder" : " · drag and drop or use ↑↓ to reorder") : "");
    refresh();
  }
  const $$drop = () => [...list.querySelectorAll(".drop-target")];

  function refresh() {
    if (cfg.onChange) cfg.onChange(ctx);
    if (state.busy) return;
    const loading = state.items.some((i) => i.loading);
    let r = state.items.length ? true : "No files yet.";
    if (r === true && loading) r = "Reading file…";
    if (r === true && cfg.ready) r = cfg.ready(state.items, getOpts ? getOpts() : {}, ctx);
    goBtn.disabled = r !== true;
    // chỉ xoá dòng trạng thái nếu đó là lý do "chưa sẵn sàng" do chính hàm này đặt
    if (r !== true && !loading) { status(typeof r === "string" ? r : ""); state.reason = statusEl.textContent; }
    else if (r === true && state.reason && statusEl.textContent === state.reason) { status(""); state.reason = ""; }
  }

  async function run() {
    if (state.busy) return;
    state.busy = true; goBtn.hidden = true; cancelBtn.hidden = false;
    state.abort = new AbortController();
    ctx.signal = state.abort.signal;
    status("Processing…"); progress(0);
    await nextFrame();
    try {
      const outs = await cfg.run(state.items, getOpts ? getOpts() : {}, ctx);
      if (outs && outs.length) finish(outs);
    } catch (e) {
      if (e && e.cancelled || (state.abort && state.abort.signal.aborted)) status("Cancelled.");
      else { console.error(e); status((e && e.userMsg) || "Something went wrong: " + ((e && e.message) || e), "err"); }
    } finally {
      state.busy = false; goBtn.hidden = false; cancelBtn.hidden = true; progress(null);
      if (state.step === "work") refresh();
    }
  }

  async function finish(outs, opts = {}) {
    state.outs = outs;
    done.textContent = "";
    const total = outs.reduce((s, o) => s + o.blob.size, 0);
    const title = opts.title || (cfg.doneTitle ? cfg.doneTitle(outs, state.items) : "Done!");
    const head = h("div", { class: "results-head" }, h("h2", { text: title }));
    if (outs.length > 1) head.append(h("button", { class: "btn", type: "button", onclick: async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { save(await zip(outs), (cfg.zipName || baseName(outs[0].name) + "-and-" + (outs.length - 1) + "-file") + ".zip"); }
      catch (err) { toast(err.userMsg || "Couldn't create the .zip file", { type: "err" }); }
      b.disabled = false;
    } }, h("span", { html: icon("file-archive"), style: { display: "contents" } }), `Download all (.zip, ${fmtSize(total)})`));
    done.append(head);
    const summary = opts.summary || (cfg.summary ? cfg.summary(outs, state.items) : null);
    if (summary) done.append(h("p", { class: "summary", text: summary }));
    const ul = h("ul", { class: "flist", style: { marginTop: "12px" } });
    outs.forEach((o) => {
      const url = URL.createObjectURL(o.blob);
      o.url = url;
      const isImg = /^image\//.test(o.blob.type);
      const note = o.note || (o.before ? deltaText(o.before, o.blob.size) : "");
      ul.append(h("li", { class: "fitem" },
        h("span", { class: "thumb" }, isImg ? h("img", { src: url, alt: "", loading: "lazy" }) : h("span", { html: icon(o.blob.type === "application/pdf" ? "file-text" : "file"), style: { display: "contents" } })),
        h("span", { class: "fmeta" }, h("span", { class: "fname", title: o.name, text: o.name }), h("span", { class: "fsub", html: fmtSize(o.blob.size) + (note ? " · " + note : "") })),
        h("span", { class: "facts" },
          (o.actions || []).map((a) => h("button", { class: "ib sm", type: "button", "aria-label": a.label + " " + o.name, title: a.label, html: icon(a.icon), onclick: () => a.run(o) })),
          /^(image\/|application\/pdf|text\/)/.test(o.blob.type) ? h("a", { class: "ib sm", href: url, target: "_blank", rel: "noopener", "aria-label": "View " + o.name, title: "View in a new tab", html: icon("eye") }) : null,
          outs.length > 1 ? h("button", { class: "ib sm", type: "button", "aria-label": "Download " + o.name, title: "Download", html: icon("download"), onclick: () => save(o.blob, o.name) }) : null)));
    });
    done.append(ul);
    if (opts.extra || o0(outs).extra) done.append(opts.extra || outs[0].extra);
    if (outs.length === 1) done.append(h("div", { class: "row", style: { marginTop: "14px" } }, h("button", { class: "btn big", type: "button", onclick: () => save(outs[0].blob, outs[0].name) }, h("span", { html: icon("download"), style: { display: "contents" } }), "Download " + outs[0].name.split(".").pop().toUpperCase() + " to your device")));
    // Tiếp tục với file này
    const files = outs.map((o) => new File([o.blob], o.name, { type: o.blob.type }));
    const cont = h("div", { class: "continue", hidden: true });
    done.append(cont);
    toolsForFiles(files, TOOL_ID).then(async (tools) => {
      if (!tools.length) return;
      const reg = await registry();
      cont.append(h("h3", { text: outs.length > 1 ? "Continue with these files" : "Continue with this file" }),
        h("ul", { class: "chip-list" }, tools.slice(0, 10).map((t) => h("li", null, h("a", { class: "chip", href: toolHref(t), onclick: (e) => { e.preventDefault(); sendTo(t, files); } },
          h("span", { class: "tile xs", style: { "--c": reg.groupOf[t.group].color }, html: icon(t.icon) }), t.name)))));
      cont.hidden = false;
    }).catch(() => {});
    done.append(h("div", { class: "row", style: { marginTop: "18px" } },
      h("button", { class: "btn ghost", type: "button", onclick: () => show("work") }, h("span", { html: icon("arrow-left"), style: { display: "contents" } }), "Adjust"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { clear(); } }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Use another file")));
    show("done");
    status("");
    const first = done.querySelector("h2"); if (first) { first.tabIndex = -1; first.focus({ preventScroll: true }); }
  }
  const o0 = (a) => a[0] || {};

  // file chuyển từ công cụ khác hoặc từ trang chủ
  takeHandoff().then((fs) => { if (fs.length) addFiles(fs, "handoff"); });
  if (cfg.warm) setTimeout(() => cfg.warm().catch(() => {}), 600);
  show("pick");
  return ctx;
}

export function deltaText(before, after) {
  const pct = Math.round((1 - after / before) * 100);
  if (pct > 0) return `<span class="good">−${pct}%</span> (from ${fmtSize(before)})`;
  if (pct < 0) return `<span class="bad">+${-pct}%</span> (from ${fmtSize(before)})`;
  return "unchanged";
}

/** Nhóm tuỳ chọn dạng nút chọn (segmented). choices: [[value, label]] */
export function seg(name, choices, value, label) {
  return h("div", { class: "opt-group" }, label ? h("p", { class: "opt-title", id: "lbl-" + name, text: label }) : null,
    h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": label ? "lbl-" + name : null }, choices.map(([v, l]) => h("label", null, h("input", { type: "radio", name, value: v, checked: String(v) === String(value) }), h("span", { text: l })))));
}
export const radioVal = (root, name) => { const r = root.querySelector(`input[name="${name}"]:checked`); return r ? r.value : null; };
