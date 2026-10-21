/* BbeTools – lõi dùng chung cho mọi trang:
   tiện ích DOM, tải thư viện theo nhu cầu, thông báo, hộp thoại, lưu trữ, nhận file (chọn / kéo thả / dán),
   chuyển file giữa các công cụ, header (mega-menu / ngăn kéo), bảng lệnh tìm nhanh (/ hoặc Ctrl/⌘+K),
   yêu thích ★ và "dùng gần đây". Khung trang của từng kiểu công cụ nằm ở assets/frames/. */
import { prepare, search } from "./lib/search.js";
import { kindsOf, accepts, acceptAttr, KIND_LABEL } from "./lib/filetype.js";

export const ROOT = document.documentElement.dataset.root ?? "./";
export const IS_TOUCH = matchMedia("(hover: none)").matches;
export const MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
export const TOOL_ID = document.body.dataset.tool || null;

/* ---------- DOM ---------- */
export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in props || {}) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k === "style" && typeof v === "object") { for (const [sk, sv] of Object.entries(v)) if (sk.startsWith("--")) e.style.setProperty(sk, sv); else e.style[sk] = sv; }
    else if (k === "dataset") Object.assign(e.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (k === "value" && "value" in e) e.value = v;
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c);
  return e;
}
/** Chuỗi SVG của một icon trong sprite */
export const icon = (name, cls) => `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="${ROOT}assets/icons.svg#${name}"></use></svg>`;
/** Phần tử <span> chứa icon (để chèn bằng h()) */
export const ico = (name, cls) => h("span", { class: "ico", style: { display: "contents" }, html: icon(name, cls) });
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// không dùng requestAnimationFrame: tab chạy nền sẽ bị dừng
export const nextFrame = () => new Promise((r) => setTimeout(r, 16));
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---------- Định dạng ---------- */
const nf = new Intl.NumberFormat("vi-VN");
export const fmtNum = (n, d) => (d != null ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: d }).format(n) : nf.format(n));
export function fmtSize(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return fmtNum(b / 1024, b < 10240 ? 1 : 0) + " KB";
  if (b < 1073741824) return fmtNum(b / 1048576, 1) + " MB";
  return fmtNum(b / 1073741824, 2) + " GB";
}
export const baseName = (n) => (n || "").replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "tep";
export const extOf = (n) => ((/\.([a-z0-9]+)$/i.exec(n || "") || [])[1] || "").toLowerCase();

/* ---------- Lưu trữ (localStorage, có thể bị chặn) ---------- */
export const store = {
  get(k, def) { try { const v = localStorage.getItem("bt:" + k); return v == null ? def : JSON.parse(v); } catch (_) { return def; } },
  set(k, v) { try { localStorage.setItem("bt:" + k, JSON.stringify(v)); return true; } catch (_) { return false; } },
  del(k) { try { localStorage.removeItem("bt:" + k); } catch (_) {} }
};

/* ---------- Registry (tải khi cần) ---------- */
let regPromise = null;
export function registry() {
  if (!regPromise) regPromise = import("./registry.js").then((m) => ({
    ...m,
    index: prepare(m.tools, m.groups),
    byId: Object.fromEntries(m.tools.map((t) => [t.id, t])),
    groupOf: Object.fromEntries(m.groups.map((g) => [g.id, g]))
  }));
  return regPromise;
}
export const toolHref = (t) => ROOT + t.slug + "/";

/* ---------- Thư viện ngoài: ghim phiên bản, chỉ tải khi công cụ cần ---------- */
const JSD = "https://cdn.jsdelivr.net/npm/";
export const CDN = {
  pdfjs: JSD + "pdfjs-dist@4.10.38/legacy/build/",
  zxing: JSD + "zxing-wasm@3.1.5/dist/",
  ort: JSD + "onnxruntime-web@1.30.0/dist/",
  jsquash: JSD + "@jsquash/"
};
const LIBS = {
  pdflib: { script: JSD + "@cantoo/pdf-lib@2.11.1/dist/pdf-lib.min.js", global: "PDFLib" },
  fontkit: { script: JSD + "@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js", global: "fontkit" },
  jszip: { script: JSD + "jszip@3.10.1/dist/jszip.min.js", global: "JSZip" },
  pdfjs: { esm: CDN.pdfjs + "pdf.min.mjs", init: (m) => { m.GlobalWorkerOptions.workerSrc = CDN.pdfjs + "pdf.worker.min.mjs"; return m; } },
  heic: { esm: JSD + "heic-to@1.6.5/dist/csp/heic-to.js" },
  qrcode: { esm: JSD + "qrcode-generator@2.0.4/dist/qrcode.mjs", init: (m) => m.default || m.qrcode || m },
  zxing: {
    esm: CDN.zxing + "es/reader/index.js",
    init: (m) => { m.prepareZXingModule({ overrides: { locateFile: (path, prefix) => (path.endsWith(".wasm") ? CDN.zxing + "reader/" + path : prefix + path) } }); return m; }
  },
  ort: { esm: CDN.ort + "ort.wasm.min.mjs", init: (m) => { m.env.wasm.wasmPaths = CDN.ort; m.env.wasm.numThreads = 1; m.env.logLevel = "error"; return m; } },
  mozjpeg: { esm: JSD + "@jsquash/jpeg@1.6.0/encode.js", init: (m) => m.default },
  avif: { esm: JSD + "@jsquash/avif@2.1.1/codec/enc/avif_enc.js", init: (m) => m.default }, // bản đơn luồng (không cần COOP/COEP)
  pako: { script: JSD + "pako@2.1.0/dist/pako.min.js", global: "pako" },
  upng: { script: JSD + "upng-js@2.1.0/UPNG.js", global: "UPNG", deps: ["pako"] }
};
const libCache = {};
export function lib(name) {
  if (!libCache[name]) {
    const L = LIBS[name];
    if (!L) throw new Error("Không có thư viện " + name);
    libCache[name] = (L.esm
      ? import(/* @vite-ignore */ L.esm).then((m) => (L.init ? L.init(m) : m))
      : Promise.all((L.deps || []).map(lib)).then(() => new Promise((res, rej) => {
        if (window[L.global]) return res(window[L.global]);
        const s = h("script", { src: L.script, crossorigin: "anonymous" });
        s.onload = () => (window[L.global] ? res(window[L.global]) : rej(new Error("lib " + name)));
        s.onerror = rej;
        document.head.append(s);
      }))
    ).catch((e) => {
      delete libCache[name];
      console.error(e);
      const err = new Error("Không tải được thư viện cần thiết. Hãy kiểm tra kết nối mạng rồi thử lại.");
      err.userMsg = err.message;
      throw err;
    });
  }
  return libCache[name];
}

/* ---------- Thông báo ---------- */
let toastBox;
export function toast(msg, opts = {}) {
  if (!toastBox) { toastBox = h("div", { class: "toasts", role: "status", "aria-live": "polite" }); document.body.append(toastBox); }
  const t = h("div", { class: "toast" + (opts.type === "err" ? " err" : "") }, h("span", { text: msg }));
  if (opts.action) t.append(h("button", { type: "button", text: opts.action.label, onclick: () => { t.remove(); opts.action.run(); } }));
  toastBox.append(t);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  setTimeout(() => t.remove(), opts.ms || (opts.action ? 7000 : 3200));
}

/* ---------- Hộp thoại ---------- */
export function dialog(build, opts = {}) {
  return new Promise((resolve) => {
    const d = h("dialog", { class: "dlg" + (opts.wide ? " wide" : ""), "aria-label": opts.label || null });
    const close = (v) => { if (d.open) d.close(); d.remove(); resolve(v); };
    d.append(build(close));
    d.addEventListener("cancel", (e) => { e.preventDefault(); close(null); });
    d.addEventListener("click", (e) => { if (e.target === d) close(null); });
    document.body.append(d);
    d.showModal();
  });
}
export function confirmDialog(title, text, okLabel = "Đồng ý") {
  return dialog((close) => h("div", { class: "dlg-body" }, h("h2", { text: title }), text ? h("p", { text }) : null,
    h("div", { class: "dlg-acts" }, h("button", { class: "btn ghost", type: "button", text: "Huỷ", onclick: () => close(false) }), h("button", { class: "btn", type: "button", text: okLabel, onclick: () => close(true) }))));
}
export function passwordField(attrs) {
  const input = h("input", Object.assign({ class: "input", type: "password", autocomplete: "off", spellcheck: "false" }, attrs));
  const eye = h("button", { class: "ib", type: "button", "aria-label": "Hiện mật khẩu", html: icon("eye") });
  eye.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    eye.innerHTML = icon(show ? "eye-off" : "eye");
    eye.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
  });
  return { el: h("div", { class: "row", style: { flexWrap: "nowrap", gap: "4px" } }, input, eye), input };
}

/* ---------- Tải xuống, sao chép, zip ---------- */
export function save(blob, name) {
  const a = h("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
export async function copyText(text, msg = "Đã sao chép") {
  try { await navigator.clipboard.writeText(text); toast(msg); return true; }
  catch (_) {
    const ta = h("textarea", { style: { position: "fixed", opacity: "0" } }); ta.value = text;
    document.body.append(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove();
    toast(ok ? msg : "Không sao chép được, hãy chọn và sao chép thủ công.", ok ? {} : { type: "err" });
    return ok;
  }
}
export async function copyImage(blob) {
  try {
    if (blob.type !== "image/png") blob = await toPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast("Đã sao chép ảnh");
  } catch (_) { toast("Trình duyệt này chưa cho sao chép ảnh, hãy tải về.", { type: "err" }); }
}
async function toPng(blob) {
  const bmp = await createImageBitmap(blob);
  const c = h("canvas", { width: bmp.width, height: bmp.height });
  c.getContext("2d").drawImage(bmp, 0, 0);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
export async function zip(entries) {
  const JSZip = await lib("jszip");
  const z = new JSZip(), used = {};
  for (const e of entries) {
    let n = e.name;
    const m = /^(.*?)(\.[^.]+)?$/.exec(n);
    used[n] = (used[n] || 0) + 1;
    if (used[n] > 1) n = m[1] + "-" + used[n] + (m[2] || "");
    z.file(n, e.blob || e.data);
  }
  return z.generateAsync({ type: "blob", compression: "STORE" });
}

/* ---------- Loại file ---------- */
export async function headOf(file, n = 64) {
  try { return new Uint8Array(await file.slice(0, n).arrayBuffer()); } catch (_) { return new Uint8Array(); }
}
export async function fileKinds(file) { return kindsOf(file, await headOf(file)); }
export { accepts, acceptAttr, KIND_LABEL };

/** Các công cụ dùng được cho tất cả file đã cho (theo registry.accept) */
export async function toolsForFiles(files, exceptId) {
  const reg = await registry();
  const kinds = await Promise.all(files.map(fileKinds));
  return reg.tools.filter((t) => t.id !== exceptId && t.accept && t.accept.length && kinds.every((k) => accepts(t.accept, k)) && (files.length === 1 || t.multiple || t.accept.includes("any")))
    .sort((a, b) => (a.accept.includes("any") - b.accept.includes("any")) || ((b.popular ? 1 : 0) - (a.popular ? 1 : 0)));
}

/* ---------- Chuyển file sang công cụ khác (IndexedDB, không rời máy) ---------- */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("bbetools", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("handoff");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export const handoff = {
  async put(files) {
    const db = await idb();
    const recs = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, data: await f.arrayBuffer() })));
    await new Promise((res, rej) => { const tx = db.transaction("handoff", "readwrite"); tx.objectStore("handoff").put({ t: Date.now(), files: recs }, "x"); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
  async take() {
    const db = await idb();
    const rec = await new Promise((res, rej) => {
      const tx = db.transaction("handoff", "readwrite"), st = tx.objectStore("handoff");
      const g = st.get("x"); g.onsuccess = () => { st.delete("x"); res(g.result); }; g.onerror = () => rej(g.error);
    });
    if (!rec || Date.now() - rec.t > 30 * 60 * 1000) return [];
    return rec.files.map((r) => new File([r.data], r.name, { type: r.type }));
  }
};
export async function sendTo(tool, files) {
  try { await handoff.put(files); location.href = toolHref(tool) + "#tiep-tuc"; }
  catch (_) { toast("Không chuyển được file. Hãy tải về rồi mở công cụ " + tool.name + ".", { type: "err" }); }
}
/** Đổi URL tại chỗ mà không để Google Analytics ghi thành lượt xem mới (URL có thể chứa dữ liệu người dùng nhập) */
export const replaceUrl = (url) => (window.btReplaceState || history.replaceState.bind(history))(null, "", url);
export function takeHandoff() {
  if (location.hash !== "#tiep-tuc") return Promise.resolve([]);
  replaceUrl(location.pathname + location.search);
  return handoff.take().catch(() => []);
}

/** Hộp thoại chọn công cụ cho các file (trang chủ, "Tiếp tục với file này") */
export async function chooseToolFor(files, opts = {}) {
  const list = await toolsForFiles(files, opts.exceptId);
  const reg = await registry();
  if (!list.length) { toast("Chưa có công cụ nào dùng được cho loại file này."); return; }
  dialog((close) => h("div", { class: "dlg-body" },
    h("h2", { text: opts.title || (files.length > 1 ? `Làm gì với ${files.length} file này?` : "Làm gì với file này?") }),
    h("p", { text: files.map((f) => f.name).join(", ") }),
    h("ul", { class: "chip-list" }, list.map((t) => h("li", null, h("a", {
      class: "chip", href: toolHref(t),
      onclick: (e) => { e.preventDefault(); close(t); sendTo(t, files); }
    }, h("span", { class: "tile xs", style: { "--c": reg.groupOf[t.group].color }, html: icon(t.icon) }), t.name)))),
    h("div", { class: "dlg-acts" }, h("button", { class: "btn ghost", type: "button", text: "Đóng", onclick: () => close(null) }))
  ), { wide: true });
}

/* ---------- Nhận file: nút chọn, kéo thả vào bất cứ đâu, dán Ctrl/⌘+V ---------- */
let pasteN = 0;
function renamePasted(f) {
  // ảnh chụp màn hình dán vào thường tên "image.png" → đặt tên riêng cho từng lần dán
  if (!f.name || /^image\.\w+$/i.test(f.name) || f.name === "blob") {
    const ext = (f.type.split("/")[1] || "bin").replace("jpeg", "jpg").replace("svg+xml", "svg");
    return new File([f], "dan-" + new Date().toISOString().slice(11, 19).replace(/:/g, "") + "-" + (++pasteN) + "." + ext, { type: f.type });
  }
  return f;
}
async function fetchUrl(url) {
  const r = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!r.ok) throw new Error("http " + r.status);
  const b = await r.blob();
  let name = decodeURIComponent((new URL(url).pathname.split("/").pop() || "").trim()) || "file-tu-link";
  if (!/\.\w{2,5}$/.test(name) && b.type) name += "." + (b.type.split("/")[1] || "bin").replace("jpeg", "jpg");
  return new File([b], name, { type: b.type });
}
const typingTarget = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

/**
 * Gắn bộ nhận file cho cả trang.
 * opts: { accept:[kinds], multiple, onFiles(files, how), enabled(), label }
 * Trả về { pick(), input }
 */
export function intake(opts) {
  const input = h("input", { type: "file", hidden: true, accept: acceptAttr(opts.accept) || null, multiple: opts.multiple ? true : null });
  document.body.append(input);
  const deliver = (files, how) => {
    files = [...files].filter((f) => f && f.size !== undefined);
    if (!files.length || (opts.enabled && !opts.enabled())) return;
    opts.onFiles(files, how);
  };
  input.addEventListener("change", () => { deliver(input.files, "pick"); input.value = ""; });

  const overlay = h("div", { class: "drop-overlay", hidden: true }, h("div", null, opts.label || "Thả file vào đây", h("small", { text: "Thả ở bất cứ đâu trên trang" })));
  document.body.append(overlay);
  let depth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  document.addEventListener("dragenter", (e) => { if (!hasFiles(e) || (opts.enabled && !opts.enabled())) return; depth++; overlay.hidden = false; });
  document.addEventListener("dragleave", (e) => { if (hasFiles(e) && --depth <= 0) { depth = 0; overlay.hidden = true; } });
  document.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
  document.addEventListener("drop", (e) => {
    depth = 0; overlay.hidden = true;
    if (!hasFiles(e)) return;
    e.preventDefault();
    deliver(e.dataTransfer.files, "drop");
  });
  document.addEventListener("paste", async (e) => {
    const cd = e.clipboardData;
    let files = cd ? [...(cd.items || [])].filter((x) => x.kind === "file").map((x) => x.getAsFile()).filter(Boolean) : [];
    if (!files.length && cd) files = [...(cd.files || [])];
    if (typingTarget(e.target) && !files.length) return; // dán chữ bình thường vào ô nhập
    if (opts.enabled && !opts.enabled()) return;
    const txt = (cd && cd.getData("text/plain") || "").trim();
    if (files.length) { e.preventDefault(); deliver(files.map(renamePasted), "paste"); return; }
    if (/^https?:\/\/\S+$/i.test(txt)) {
      e.preventDefault();
      toast("Đang tải file từ đường link…");
      try { deliver([await fetchUrl(txt)], "paste"); }
      catch (_) { toast("Trang gốc không cho tải trực tiếp. Hãy tải file về máy rồi kéo vào đây.", { type: "err" }); }
    }
  });
  return { input, pick() { input.click(); } };
}

/* ---------- Header: mega-menu (máy tính) / ngăn kéo (điện thoại) ---------- */
function initMenu() {
  const btn = $(".nav-toggle"), mega = $("#mega");
  if (!btn || !mega) return;
  const mobile = () => matchMedia("(max-width: 719px)").matches;
  const set = (open) => {
    mega.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("drawer-open", open && mobile());
    if (open) { const a = mega.querySelector("a"); if (a && !IS_TOUCH) a.focus({ preventScroll: true }); }
  };
  btn.addEventListener("click", (e) => { e.stopPropagation(); set(mega.hidden); });
  mega.addEventListener("click", (e) => { if (e.target.closest("[data-close-mega]")) set(false); });
  document.addEventListener("click", (e) => { if (!mega.hidden && !mega.contains(e.target) && e.target !== btn) set(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !mega.hidden) { set(false); btn.focus(); } });
  if (TOOL_ID) $$("a", mega).forEach((a) => { if (new URL(a.href).pathname === location.pathname) a.setAttribute("aria-current", "page"); });
}

/* ---------- Giao diện sáng / tối ---------- */
const THEMES = [[null, "tự động", "monitor"], ["light", "sáng", "sun"], ["dark", "tối", "moon"]];
function initTheme() {
  const btn = $("[data-theme-toggle]");
  if (!btn) return;
  const cur = () => document.documentElement.dataset.theme || null;
  const label = () => { const t = THEMES.find((x) => x[0] === cur()) || THEMES[0]; btn.title = "Giao diện: " + t[1]; btn.setAttribute("aria-label", "Giao diện đang là " + t[1] + ". Bấm để đổi"); };
  label();
  btn.addEventListener("click", () => {
    const i = THEMES.findIndex((x) => x[0] === cur());
    const next = THEMES[(i + 1) % THEMES.length];
    if (next[0]) { document.documentElement.dataset.theme = next[0]; try { localStorage.setItem("bt:theme", next[0]); } catch (_) {} }
    else { delete document.documentElement.dataset.theme; try { localStorage.removeItem("bt:theme"); } catch (_) {} }
    label();
    toast("Giao diện: " + next[1]);
  });
}

/* ---------- Yêu thích & gần đây ---------- */
export const favs = {
  list: () => store.get("favs", []),
  has: (id) => favs.list().includes(id),
  toggle(id) {
    const l = favs.list(), i = l.indexOf(id);
    if (i >= 0) l.splice(i, 1); else l.unshift(id);
    store.set("favs", l);
    syncFavButtons();
    document.dispatchEvent(new CustomEvent("bt:favs"));
    return i < 0;
  }
};
export const recent = {
  list: () => store.get("recent", []),
  add(id) { const l = recent.list().filter((x) => x !== id); l.unshift(id); store.set("recent", l.slice(0, 8)); }
};
export function syncFavButtons(root = document) {
  const l = favs.list();
  $$("[data-fav]", root).forEach((b) => {
    const on = l.includes(b.dataset.fav);
    b.setAttribute("aria-pressed", String(on));
    b.hidden = false;
    const name = b.closest(".card") ? b.closest(".card").querySelector(".card-name").textContent : "";
    if (b.classList.contains("star")) b.setAttribute("aria-label", (on ? "Bỏ ghim " : "Ghim ") + name + (on ? " khỏi Yêu thích" : " vào Yêu thích"));
    else { b.title = on ? "Bỏ ghim khỏi Yêu thích" : "Ghim vào Yêu thích"; const s = b.querySelector("span"); if (s) s.textContent = on ? "Đã ghim" : "Ghim"; }
  });
}
function initFavs() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fav]");
    if (!b) return;
    e.preventDefault();
    const on = favs.toggle(b.dataset.fav);
    toast(on ? "Đã ghim vào Yêu thích ★" : "Đã bỏ ghim");
  });
  syncFavButtons();
  if (TOOL_ID) recent.add(TOOL_ID);
}

/* ---------- Bảng lệnh tìm nhanh ---------- */
let pal = null;
async function buildPalette() {
  const reg = await registry();
  const input = h("input", { type: "search", placeholder: "Tìm công cụ…", autocomplete: "off", spellcheck: "false", role: "combobox", "aria-expanded": "true", "aria-controls": "pal-list", "aria-autocomplete": "list", "aria-label": "Tìm công cụ", enterkeyhint: "go" });
  const list = h("ul", { class: "pal-list", id: "pal-list", role: "listbox", "aria-label": "Kết quả" });
  const d = h("dialog", { class: "palette", "aria-label": "Tìm công cụ" },
    h("div", { class: "pal-head" }, h("span", { html: icon("search"), style: { display: "contents" } }), input, h("button", { class: "ib sm", type: "button", "aria-label": "Đóng", html: icon("x"), onclick: () => d.close() })),
    list,
    h("div", { class: "pal-foot", html: "<span><kbd>↑</kbd> <kbd>↓</kbd> chọn</span><span><kbd>Enter</kbd> mở</span><span><kbd>Esc</kbd> đóng</span><span><kbd>" + MOD + "</kbd> <kbd>K</kbd> hoặc <kbd>/</kbd> để mở từ mọi trang</span>" }));
  document.body.append(d);
  let items = [], sel = 0;
  const go = (t) => { if (t) location.href = toolHref(t); };
  const render = () => {
    const q = input.value.trim();
    list.textContent = "";
    items = [];
    const section = (title, tools) => {
      tools = tools.filter(Boolean);
      if (!tools.length) return;
      if (title) list.append(h("li", { class: "pal-sec", role: "presentation", text: title }));
      tools.forEach((t) => {
        const idx = items.length;
        items.push(t);
        list.append(h("li", { class: "pal-item", role: "option", id: "pal-o" + idx, "aria-selected": "false", onclick: () => go(t), onmousemove: () => select(idx) },
          h("span", { class: "tile sm", style: { "--c": reg.groupOf[t.group].color }, html: icon(t.icon) }),
          h("span", { class: "t" }, h("b", { text: t.name }), h("small", { text: reg.groupOf[t.group].name + " · " + t.desc })),
          h("span", { class: "enter", html: icon("corner-down-left") })));
      });
    };
    if (q) section(null, search(reg.index, q, 30));
    else {
      section("Dùng gần đây", recent.list().slice(0, 5).map((id) => reg.byId[id]));
      section("Yêu thích", favs.list().slice(0, 8).map((id) => reg.byId[id]));
      section("Phổ biến", reg.tools.filter((t) => t.popular && !recent.list().slice(0, 5).includes(t.id)).slice(0, 8));
    }
    if (!items.length) list.append(h("li", { class: "pal-empty", role: "presentation", text: q ? "Không có công cụ khớp “" + q + "”." : "Gõ để tìm công cụ." }));
    select(0);
  };
  const select = (i) => {
    if (!items.length) { input.removeAttribute("aria-activedescendant"); return; }
    sel = (i + items.length) % items.length;
    $$(".pal-item", list).forEach((li, k) => li.setAttribute("aria-selected", String(k === sel)));
    const cur = $("#pal-o" + sel, list);
    input.setAttribute("aria-activedescendant", "pal-o" + sel);
    if (cur) cur.scrollIntoView({ block: "nearest" });
  };
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); select(sel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); select(sel - 1); }
    else if (e.key === "Enter") { e.preventDefault(); go(items[sel]); }
  });
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  pal = { d, input, render };
  return pal;
}
export async function openPalette(q = "") {
  const p = pal || (await buildPalette());
  p.input.value = q;
  p.render();
  if (!p.d.open) p.d.showModal();
  p.input.focus();
}
function initPalette() {
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-palette]"); if (t) { e.preventDefault(); openPalette(); } });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); openPalette(); return; }
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !typingTarget(e.target) && !document.querySelector("dialog[open]")) {
      const home = $("#q");
      e.preventDefault();
      if (home) home.focus(); else openPalette();
    }
  });
}

/* ---------- Khởi động ---------- */
initMenu();
initTheme();
initFavs();
initPalette();

/** Tải file mẫu trong thư mục samples/ thành File */
export async function sampleFiles(...names) {
  return Promise.all(names.map(async (n) => {
    const r = await fetch(ROOT + "samples/" + n);
    if (!r.ok) throw new Error("Không tìm thấy file mẫu " + n);
    const b = await r.blob();
    return new File([b], n, { type: b.type });
  }));
}
