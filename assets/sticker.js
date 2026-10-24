/* Dùng chung cho các công cụ tải sticker, emoji (Telegram, LINE, Signal, emoji động):
   - đổi định dạng: Lottie (.tgs/.json) → GIF, APNG/WEBP động → GIF, ảnh tĩnh → PNG (mã hoá GIF bằng gifenc)
   - tải file từ nguồn có CORS, chạy nhiều luồng
   - packView(): khung hiển thị một bộ sticker (tiêu đề, chọn dạng file, lưới sticker, tải từng cái hoặc cả bộ .zip) */
import { h, icon, lib, toast, save, zip, fmtSize, nextFrame } from "./core.js";
import { sniffImage, gifDelays, fitSize, isAnimatedKind } from "./lib/anim.js";
import { frameSchedule, itemName } from "./lib/telegram.js";

const GIF_FPS = 30, MAX_FRAMES = 300;

export const userErr = (msg) => { const e = new Error(msg); e.userMsg = msg; return e; };
export function canvasOf(w, hh) { const c = document.createElement("canvas"); c.width = w; c.height = hh; return c; }
export const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(userErr("Trình duyệt không xuất được ảnh."))), type, q));

/** Vẽ src lên dst (co giãn vừa khung, nền tuỳ chọn) → dữ liệu RGBA của dst */
export function paint(dst, src, bg) {
  const x = dst.getContext("2d", { willReadFrequently: true });
  x.clearRect(0, 0, dst.width, dst.height);
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, dst.width, dst.height); }
  x.drawImage(src, 0, 0, dst.width, dst.height);
  return x.getImageData(0, 0, dst.width, dst.height).data;
}

/** Mã hoá dãy khung { rgba, delay } thành GIF; trong suốt 1 bit (GIF không có trong suốt mờ dần) hoặc nền màu */
export async function gifFrom(w, hh, frames, transparent) {
  const { GIFEncoder, quantize, applyPalette } = await lib("gifenc");
  const gif = GIFEncoder();
  for await (const { rgba, delay } of frames) {
    if (transparent) {
      const palette = quantize(rgba, 256, { format: "rgba4444", oneBitAlpha: true });
      const index = applyPalette(rgba, palette, "rgba4444");
      const ti = palette.findIndex((c) => c[3] === 0);
      gif.writeFrame(index, w, hh, { palette, delay, repeat: 0, transparent: ti >= 0, transparentIndex: Math.max(0, ti), dispose: 2 });
    } else {
      const palette = quantize(rgba, 256);
      gif.writeFrame(applyPalette(rgba, palette), w, hh, { palette, delay, repeat: 0 });
    }
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

/* ---------- Lottie (.tgs của Telegram, lottie.json của emoji Noto) ---------- */
async function gunzip(blob) {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (head[0] !== 0x1f || head[1] !== 0x8b) return blob.text(); // .json Lottie chưa nén
  if (typeof DecompressionStream !== "undefined") return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
  const pako = await lib("pako");
  return pako.ungzip(new Uint8Array(await blob.arrayBuffer()), { to: "string" });
}
export async function lottieData(blob) {
  try { const d = JSON.parse(await gunzip(blob)); if (d && d.layers && d.fr) return d; } catch (_) {}
  throw userErr("File Lottie (.tgs, .json) không hợp lệ.");
}
/** Một hoạt ảnh Lottie vẽ lên canvas cho sẵn (không cần phần tử chứa) */
export async function lottieOn(canvas, data, loop) {
  const L = await lib("lottie");
  const anim = L.loadAnimation({ renderer: "canvas", loop, autoplay: false, animationData: JSON.parse(JSON.stringify(data)),
    rendererSettings: { context: canvas.getContext("2d"), clearCanvas: true, preserveAspectRatio: "xMidYMid meet" } });
  if (!anim.isLoaded) await new Promise((res) => { anim.addEventListener("DOMLoaded", res); setTimeout(res, 3000); });
  return anim;
}
const durOf = (d) => Math.max(1, (d.op || 0) - (d.ip || 0)) / (d.fr || 60);
/** Lottie → GIF, cạnh dài o.size px, nền o.bg ("" = trong suốt) */
export async function lottieToGif(data, o) {
  const ratio = (data.w || 512) / (data.h || 512);
  const W = ratio >= 1 ? o.size : Math.max(1, Math.round(o.size * ratio)), H = ratio >= 1 ? Math.max(1, Math.round(o.size / ratio)) : o.size;
  const src = canvasOf(W, H), dst = canvasOf(W, H);
  const anim = await lottieOn(src, data, false);
  const fr = data.fr || 60, plan = frameSchedule(durOf(data), Math.min(GIF_FPS, fr));
  try {
    return await gifFrom(W, H, (async function* () {
      for (const f of plan) {
        anim.goToAndStop(Math.min(f.t * fr, anim.totalFrames - 1), true);
        yield { rgba: paint(dst, src, o.bg), delay: f.delay };
        await nextFrame();
      }
    })(), !o.bg);
  } finally { anim.destroy(); }
}

/* ---------- ảnh tĩnh, ảnh động (PNG, APNG, WEBP, GIF) ---------- */
/** Loại ảnh theo nội dung: "apng" | "png" | "webp-anim" | "webp" | "gif" | "jpg" | "" */
export async function imageKind(blob) { return sniffImage(new Uint8Array(await blob.slice(0, 65536).arrayBuffer())); }

/** Ảnh tĩnh (hoặc khung đầu của ảnh động) → PNG, giữ cỡ gốc */
export async function stillToPng(blob, bg) {
  let bmp;
  try { bmp = await createImageBitmap(blob); } catch (_) { throw userErr("Không đọc được ảnh."); }
  const c = canvasOf(bmp.width, bmp.height);
  paint(c, bmp, bg);
  bmp.close && bmp.close();
  return toBlob(c, "image/png");
}

/** APNG → các khung RGBA đầy đủ (UPNG đã ghép khung theo dispose/blend) */
async function* apngFrames(blob, o) {
  const UPNG = await lib("upng");
  const img = UPNG.decode(await blob.arrayBuffer());
  const raw = UPNG.toRGBA8(img).slice(0, MAX_FRAMES);
  const delays = gifDelays(img.frames.length ? img.frames.slice(0, raw.length).map((f) => f.delay) : [1000]);
  const { w, h: hh } = fitSize(img.width, img.height, o.size);
  const src = canvasOf(img.width, img.height), dst = canvasOf(w, hh);
  yield { w, h: hh };
  for (let i = 0; i < raw.length; i++) {
    src.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(raw[i]), img.width, img.height), 0, 0);
    yield { rgba: paint(dst, src, o.bg), delay: delays[i] };
    if (i % 4 === 3) await nextFrame();
  }
}
/** WEBP động, GIF → khung (cần ImageDecoder của WebCodecs: Chrome, Edge, Firefox 133+) */
async function* decoderFrames(blob, type, o) {
  if (typeof ImageDecoder === "undefined") throw userErr("Trình duyệt này chưa đổi được ảnh WEBP động sang GIF. Hãy dùng Chrome, Edge, Firefox, hoặc tải định dạng gốc.");
  const dec = new ImageDecoder({ data: await blob.arrayBuffer(), type });
  try {
    await dec.tracks.ready;
    const n = Math.min(MAX_FRAMES, dec.tracks.selectedTrack.frameCount || 1);
    let first = null, dst = null;
    const ms = [];
    for (let i = 0; i < n; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      if (!first) { first = fitSize(image.displayWidth, image.displayHeight, o.size); dst = canvasOf(first.w, first.h); yield first; }
      ms.push((image.duration || 100000) / 1000);
      const rgba = paint(dst, image, o.bg);
      image.close();
      yield { rgba, delayMs: ms[i] };
      if (i % 4 === 3) await nextFrame();
    }
  } finally { dec.close(); }
}
/** Ảnh động (APNG, WEBP động, GIF) → GIF; cạnh dài tối đa o.size (0 = cỡ gốc), nền o.bg */
export async function animToGif(blob, o, kind) {
  kind = kind || await imageKind(blob);
  const it = kind === "apng" ? apngFrames(blob, o) : decoderFrames(blob, kind === "gif" ? "image/gif" : "image/webp", o);
  const size = (await it.next()).value;
  return gifFrom(size.w, size.h, (async function* () {
    // ImageDecoder cho thời gian từng khung: làm tròn tích luỹ như APNG
    let t = 0, prev = 0;
    for await (const f of it) {
      if (f.delay != null) { yield f; continue; }
      t += f.delayMs;
      const cs = Math.round(t / 10), d = Math.max(2, cs - prev) * 10;
      prev = Math.max(cs, prev + 2);
      yield { rgba: f.rgba, delay: d };
    }
  })(), !o.bg);
}

/* ---------- tải từ nguồn ---------- */
/** fetch có thông báo lỗi tiếng Việt; notFound: câu báo khi 404 (mặc định là lỗi chung) */
export async function fetchBlob(url, signal, { host = "máy chủ", notFound } = {}) {
  let r;
  try { r = await fetch(url, { credentials: "omit", signal }); }
  catch (e) { if (e.name === "AbortError") throw e; throw userErr(`Không kết nối được tới ${host}. Hãy kiểm tra mạng rồi thử lại.`); }
  if (r.status === 404 && notFound) throw userErr(notFound);
  if (!r.ok) { const e = userErr(`${host} báo lỗi HTTP ${r.status}.`); e.status = r.status; throw e; }
  return r.blob();
}
/** Chạy fn cho từng phần tử, tối đa n việc cùng lúc */
export async function pool(list, n, fn, signal) {
  const q = list.slice();
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => {
    for (let x; (x = q.shift());) { if (signal && signal.aborted) return; await fn(x); }
  }));
}

/* ---------- khung hiển thị một bộ sticker ---------- */
const css = document.createElement("style");
css.textContent = `
.stk-form{display:flex;flex-direction:column;gap:14px}
.stk-form .btn{white-space:normal;text-align:center}
.stk-res{margin-top:20px;display:flex;flex-direction:column;gap:14px}
.stk-head{display:flex;gap:4px 12px;align-items:baseline;flex-wrap:wrap}
.stk-head h2{margin:0;font-size:19px;overflow-wrap:anywhere}
.stk-opts{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));align-items:end}
.stk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px}
.stk-card{position:relative}
.stk-dl{width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}
.stk-dl:hover,.stk-dl:focus-visible{border-color:var(--brand)}
.stk-dl:disabled{cursor:default;opacity:.6}
.stk-dl .pv{width:100%;aspect-ratio:1;display:grid;place-items:center;border-radius:10px;background:repeating-conic-gradient(var(--surface-2) 0 25%,transparent 0 50%) 0 0/16px 16px;overflow:hidden}
.stk-dl .pv>*{max-width:100%;max-height:100%;object-fit:contain}
.stk-dl .pv canvas{width:100%;height:100%}
.stk-dl small{color:var(--muted);font-size:12px;line-height:1.2;display:flex;gap:4px;align-items:center;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.stk-dl small span:not(.tag){min-width:0;overflow:hidden;text-overflow:ellipsis}
.stk-dl .tag{font-weight:700;font-size:10.5px;letter-spacing:.03em;padding:1px 5px;border-radius:6px;background:var(--surface-2);flex:none}
.stk-card.busy .stk-dl{opacity:.55;pointer-events:none}
.stk-card .spinner{position:absolute;top:10px;left:10px}
.stk-play{position:absolute;top:6px;right:6px;width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:grid;place-items:center;cursor:pointer;padding:0}
.stk-play:hover,.stk-play:focus-visible{border-color:var(--brand);color:var(--brand)}
.stk-play .i{width:15px;height:15px}
`;
document.head.append(css);

export function say(box, kind, text) {
  box.textContent = "";
  if (!text) return;
  const p = h("p", { class: "alert " + kind, html: icon(kind === "err" ? "triangle-alert" : kind === "ok" ? "circle-check" : "info") + "<span></span>" });
  p.querySelector("span").textContent = text;
  box.append(p);
}
export const btnIcon = (name) => h("span", { html: icon(name), style: { display: "contents" } });

/**
 * Khung một bộ sticker. cfg:
 *  id: tiền tố id phần tử; store: ctx.store; status: hộp thông báo (aria-live)
 *  sizes: [[giá trị, nhãn]] cỡ GIF (0 = gốc); size: mặc định
 *  hint(o): câu giải thích theo dạng file đang chọn; extra: phần tử tuỳ chọn thêm (đặt trong lưới tuỳ chọn)
 *  exportOne(it, idx, o) → [{ blob, name }] (một sticker có thể ra nhiều file, vd. kèm âm thanh)
 *  zipName(o) → tên file .zip
 * Phần tử của bộ: { blob, kind ("apng"|"png"|"webp"|…), label, tag, sound (Blob), failed }
 */
export function packView(cfg) {
  const S = cfg.store, id = cfg.id;
  let items = [];
  const fmtSeg = h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": id + "-fmt-l" }, [["conv", "PNG + GIF"], ["orig", "Định dạng gốc"]].map(([v, l]) =>
    h("label", null, h("input", { type: "radio", name: id + "-fmt", value: v, checked: v === S.get("format", "conv"), onchange: () => { S.set("format", v); sync(); } }), h("span", { text: l }))));
  const sizeSel = h("select", { id: id + "-size" }, cfg.sizes.map(([v, l]) => h("option", { value: v, text: l, selected: v === +S.get("size", cfg.size) })));
  sizeSel.addEventListener("change", () => S.set("size", +sizeSel.value));
  const bgSel = h("select", { id: id + "-bg" }, [["", "Trong suốt"], ["#ffffff", "Trắng"], ["#000000", "Đen"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === S.get("bg", "") })));
  bgSel.addEventListener("change", () => S.set("bg", bgSel.value));
  const fmtHint = h("p", { class: "hint" });
  const zipBtn = h("button", { class: "btn", type: "button", onclick: () => saveAll() }, btnIcon("file-archive"), h("span", { text: "Tải tất cả (.zip)" }));
  const prog = h("div", { class: "progress", hidden: true }, h("div"));
  const grid = h("div", { class: "stk-grid" });
  const headTitle = h("h2"), headInfo = h("span", { class: "hint" }), note = h("p", { class: "hint", hidden: true });
  const el = h("section", { class: "stk-res", hidden: true, "aria-label": "Bộ sticker" },
    h("div", { class: "stk-head" }, headTitle, headInfo), note,
    h("div", { class: "stk-opts" },
      h("div", { class: "field" }, h("span", { id: id + "-fmt-l", text: "Tải về dạng" }), fmtSeg),
      h("div", { class: "field gif-only" }, h("label", { for: id + "-size", text: "Cỡ GIF (cạnh dài)" }), sizeSel),
      h("div", { class: "field gif-only" }, h("label", { for: id + "-bg", text: "Nền" }), bgSel),
      cfg.extra || null),
    fmtHint,
    h("div", { class: "row" }, zipBtn), prog,
    h("p", { class: "hint", text: "Bấm vào một sticker để tải riêng sticker đó." }),
    grid);

  const opts = () => ({ format: fmtSeg.querySelector("input:checked").value, size: +sizeSel.value, bg: bgSel.value });
  function sync() {
    const o = opts();
    el.querySelectorAll(".gif-only").forEach((x) => { x.hidden = o.format === "orig"; });
    fmtHint.textContent = cfg.hint(o);
  }

  let audio = null;
  function card(it, idx) {
    const pv = h("span", { class: "pv" });
    const dl = h("button", { class: "stk-dl", type: "button", title: "Tải sticker này", "aria-label": `Tải sticker ${idx + 1}${it.label ? " " + it.label : ""}`, onclick: () => saveOne(it, idx) },
      pv, h("small", null, it.label ? h("span", { text: it.label }) : null, h("span", { class: "tag", text: it.tag || "", hidden: !it.tag })));
    const c = h("div", { class: "stk-card" }, dl);
    it.el = c; it.pv = pv; it.dl = dl; it.tagEl = dl.querySelector(".tag");
    if (it.blob) preview(it); else if (it.failed) fail(it); else pv.append(h("span", { class: "spinner sm" }));
    return c;
  }
  function preview(it) {
    it.pv.textContent = "";
    if (it.url) URL.revokeObjectURL(it.url);
    it.url = URL.createObjectURL(it.blob);
    it.pv.append(h("img", { src: it.url, alt: it.label || "", loading: "lazy" }));
    if (it.tag) { it.tagEl.textContent = it.tag; it.tagEl.hidden = false; }
    if (it.sound && !it.el.querySelector(".stk-play")) {
      it.el.append(h("button", { class: "stk-play", type: "button", title: "Nghe âm thanh", "aria-label": "Nghe âm thanh của sticker", html: icon("volume-2"), onclick: () => {
        if (audio) { audio.pause(); URL.revokeObjectURL(audio.src); }
        audio = new Audio(URL.createObjectURL(it.sound));
        audio.play().catch(() => toast("Trình duyệt không phát được âm thanh này.", { type: "err" }));
      } }));
    }
  }
  function fail(it) { it.pv.textContent = "✕"; it.dl.disabled = true; }

  async function saveOne(it, idx) {
    if (!it.blob) return;
    it.el.classList.add("busy"); it.el.append(h("span", { class: "spinner sm" }));
    try { for (const f of await cfg.exportOne(it, idx, opts())) save(f.blob, f.name); }
    catch (e) { toast(e.userMsg || "Không đổi được sticker này.", { type: "err" }); console.error(e); }
    finally { it.el.classList.remove("busy"); const sp = it.el.querySelector(":scope > .spinner"); if (sp) sp.remove(); }
  }
  async function saveAll() {
    const list = items.filter((x) => x.blob);
    if (!list.length) return;
    const o = opts();
    zipBtn.disabled = true; prog.hidden = false;
    const bar = prog.firstChild, out = [];
    let failed = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        bar.style.width = Math.round((i / list.length) * 100) + "%";
        if (o.format !== "orig") say(cfg.status, "info", `Đang đổi ${i + 1}/${list.length}…`);
        try { out.push(...await cfg.exportOne(list[i], items.indexOf(list[i]), o)); }
        catch (e) { failed++; console.error(e); }
        await nextFrame();
      }
      bar.style.width = "100%";
      if (!out.length) { say(cfg.status, "err", "Không đổi được sticker nào."); return; }
      const z = await zip(out);
      save(z, cfg.zipName(o) + ".zip");
      say(cfg.status, failed ? "err" : "ok", (failed ? `${failed} sticker không đổi được. ` : "") + `Đã tạo file .zip gồm ${out.length} file (${fmtSize(z.size)}).`);
    } finally { zipBtn.disabled = false; setTimeout(() => { prog.hidden = true; bar.style.width = "0"; }, 600); }
  }

  sync();
  return {
    el, opts, sync,
    /** Hiện bộ mới: tiêu đề, dòng thông tin, ghi chú (tuỳ chọn), danh sách phần tử */
    show(title, info, list, noteText) {
      for (const it of items) if (it.url) URL.revokeObjectURL(it.url);
      items = list;
      headTitle.textContent = title; headInfo.textContent = info;
      note.textContent = noteText || ""; note.hidden = !noteText;
      grid.textContent = "";
      items.forEach((it, i) => grid.append(card(it, i)));
      el.hidden = !items.length;
      sync();
    },
    /** Một phần tử đã tải xong (hoặc lỗi: it.failed = true) */
    update(it) { if (!it.pv) return; if (it.blob) preview(it); else if (it.failed) fail(it); },
    items: () => items,
    hide() { el.hidden = true; }
  };
}

/** Tên file trong bộ theo thứ tự: "07.gif" */
export const nameOf = (idx, total, ext) => itemName(idx, total, ext);
/** Một sticker ảnh (PNG/APNG/WEBP…) theo dạng đã chọn → { blob, ext } */
export async function convertImage(blob, kind, o) {
  if (o.format === "orig") return { blob, ext: kind === "apng" ? "png" : kind === "webp-anim" ? "webp" : kind || "png" };
  if (isAnimatedKind(kind)) return { blob: await animToGif(blob, o, kind), ext: "gif" };
  return { blob: kind === "png" && !o.bg ? blob : await stillToPng(blob, o.bg), ext: "png" };
}
