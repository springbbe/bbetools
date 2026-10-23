/* Tải sticker Telegram: lấy cả bộ sticker qua Bot API ngay từ trình duyệt (token bot của chính người dùng, gửi thẳng tới
   api.telegram.org — Telegram cho phép gọi từ trang web, BbeTools không có máy chủ trung gian), xem trước, tải nguyên bản
   (WEBP, TGS, WEBM) hoặc đổi sang PNG (ảnh tĩnh) và GIF (sticker động). Cũng đổi được file .tgs/.webm/.webp có sẵn.
   .tgs là Lottie JSON nén gzip: vẽ bằng lottie-web (canvas) theo từng khung rồi mã hoá GIF bằng gifenc. */
import { h, icon, lib, toast, save, zip, intake, passwordField, sampleFiles, baseName, fmtSize, nextFrame } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { packName, isToken, stickerKind, kindOfName, itemName, frameSchedule } from "../lib/telegram.js";

const API = "https://api.telegram.org/";
const GIF_FPS = 30;
const css = document.createElement("style");
css.textContent = `
.tg-pane{display:flex;flex-direction:column;gap:14px;margin-top:16px}
.tg-pane .btn{white-space:normal;text-align:center}
.tg-help{border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:var(--surface)}
.tg-help summary{cursor:pointer;font-weight:600}
.tg-help ol{margin:8px 0 2px;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.tg-res{margin-top:20px;display:flex;flex-direction:column;gap:14px}
.tg-head{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.tg-head h2{margin:0;font-size:19px}
.tg-opts{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));align-items:end}
.tg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}
.tg-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}
.tg-card:hover,.tg-card:focus-visible{border-color:var(--brand)}
.tg-card .pv{width:100%;aspect-ratio:1;display:grid;place-items:center;border-radius:10px;background:repeating-conic-gradient(var(--surface-2) 0 25%,transparent 0 50%) 0 0/16px 16px}
.tg-card .pv>*{max-width:100%;max-height:100%;object-fit:contain}
.tg-card .pv canvas{width:100%;height:100%}
.tg-card small{color:var(--muted);font-size:12px;line-height:1.2;display:flex;gap:4px;align-items:center}
.tg-card .tag{font-weight:700;font-size:10.5px;letter-spacing:.03em;padding:1px 5px;border-radius:6px;background:var(--surface-2)}
.tg-card.busy{opacity:.55;pointer-events:none}
.tg-card .spinner{position:absolute;top:8px;right:8px}
`;
document.head.append(css);

/* ---------- Telegram Bot API (gọi thẳng từ trình duyệt) ---------- */
const userErr = (msg) => { const e = new Error(msg); e.userMsg = msg; return e; };
async function call(token, method, params, signal) {
  for (let attempt = 0; ; attempt++) {
    let r;
    try { r = await fetch(API + "bot" + token + "/" + method + "?" + new URLSearchParams(params || {}), { credentials: "omit", signal }); }
    catch (e) {
      if (e.name === "AbortError") throw e;
      throw userErr("Không kết nối được tới Telegram (api.telegram.org). Mạng của bạn có thể đang chặn Telegram; hãy thử mạng khác.");
    }
    const j = await r.json().catch(() => null);
    if (j && j.ok) return j.result;
    if (r.status === 429 && attempt < 3) { await new Promise((res) => setTimeout(res, 1000 * ((j && j.parameters && j.parameters.retry_after) || 2))); continue; }
    if (r.status === 401 || (r.status === 404 && method === "getMe")) throw userErr("Telegram không nhận token này (sai hoặc đã bị thu hồi). Hãy kiểm tra lại với @BotFather.");
    if (j && /STICKERSET_INVALID|STICKERSET_NOT_FOUND/i.test(j.description || "")) throw userErr("Không tìm thấy bộ sticker này. Hãy kiểm tra lại link (dạng t.me/addstickers/…) hoặc tên bộ.");
    throw userErr("Telegram báo lỗi: " + ((j && j.description) || "HTTP " + r.status));
  }
}
async function download(token, fileId, signal) {
  const f = await call(token, "getFile", { file_id: fileId }, signal);
  let r;
  try { r = await fetch(API + "file/bot" + token + "/" + f.file_path, { credentials: "omit", signal }); }
  catch (e) { if (e.name === "AbortError") throw e; throw userErr("Không tải được file từ Telegram."); }
  if (!r.ok) throw userErr("Không tải được file từ Telegram (HTTP " + r.status + ").");
  return r.blob();
}

/* ---------- đọc, vẽ, đổi định dạng ---------- */
async function gunzip(blob) {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (head[0] !== 0x1f || head[1] !== 0x8b) return blob.text(); // .json Lottie chưa nén
  if (typeof DecompressionStream !== "undefined") return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
  const pako = await lib("pako");
  return pako.ungzip(new Uint8Array(await blob.arrayBuffer()), { to: "string" });
}
async function lottieData(blob) {
  try { const d = JSON.parse(await gunzip(blob)); if (d && d.layers && d.fr) return d; } catch (_) {}
  throw userErr("File .tgs không hợp lệ.");
}
/** Một hoạt ảnh Lottie vẽ lên canvas cho sẵn (không cần phần tử chứa) */
async function lottieOn(canvas, data, loop) {
  const L = await lib("lottie");
  const anim = L.loadAnimation({ renderer: "canvas", loop, autoplay: false, animationData: JSON.parse(JSON.stringify(data)),
    rendererSettings: { context: canvas.getContext("2d"), clearCanvas: true, preserveAspectRatio: "xMidYMid meet" } });
  if (!anim.isLoaded) await new Promise((res) => { anim.addEventListener("DOMLoaded", res); setTimeout(res, 3000); });
  return anim;
}
const durOf = (d) => Math.max(1, (d.op || 0) - (d.ip || 0)) / (d.fr || 60);

function canvasOf(w, hh) { const c = document.createElement("canvas"); c.width = w; c.height = hh; return c; }
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(userErr("Trình duyệt không xuất được ảnh."))), type, q));

/** Mã hoá dãy khung RGBA thành GIF; trong suốt 1 bit (GIF không có trong suốt mờ dần) hoặc nền màu */
async function gifFrom(w, hh, frames, transparent) {
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
function paint(dst, src, bg) {
  const x = dst.getContext("2d", { willReadFrequently: true });
  x.clearRect(0, 0, dst.width, dst.height);
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, dst.width, dst.height); }
  x.drawImage(src, 0, 0, dst.width, dst.height);
  return x.getImageData(0, 0, dst.width, dst.height).data;
}

async function tgsToGif(it, o) {
  const data = it.data || (it.data = await lottieData(it.blob));
  const ratio = (data.w || 512) / (data.h || 512);
  const w = ratio >= 1 ? o.size : Math.round(o.size * ratio), hh = ratio >= 1 ? Math.round(o.size / ratio) : o.size;
  const src = canvasOf(w, hh), dst = canvasOf(w, hh);
  const anim = await lottieOn(src, data, false);
  const fr = data.fr || 60, plan = frameSchedule(durOf(data), Math.min(GIF_FPS, fr));
  try {
    return await gifFrom(w, hh, (async function* () {
      for (const f of plan) {
        anim.goToAndStop(Math.min(f.t * fr, anim.totalFrames - 1), true);
        yield { rgba: paint(dst, src, o.bg), delay: f.delay };
        await nextFrame();
      }
    })(), !o.bg);
  } finally { anim.destroy(); }
}

function videoOf(blob) {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.onerror = () => rej(userErr("Trình duyệt này không đọc được sticker video (WEBM). Hãy thử Chrome, Edge hoặc Firefox."));
    v.onloadeddata = async () => {
      if (!Number.isFinite(v.duration)) { // WEBM thiếu thời lượng: tua tới cuối để trình duyệt tính
        await new Promise((r) => { v.ondurationchange = () => Number.isFinite(v.duration) && r(); v.currentTime = 1e6; setTimeout(r, 2000); });
      }
      res(v);
    };
    v.src = URL.createObjectURL(blob);
  });
}
const seek = (v, t) => new Promise((res) => { const done = () => { v.removeEventListener("seeked", done); res(); }; v.addEventListener("seeked", done); v.currentTime = t; setTimeout(done, 1500); });
async function webmToGif(it, o) {
  const v = await videoOf(it.blob);
  try {
    const vw = v.videoWidth || 512, vh = v.videoHeight || 512, k = o.size / Math.max(vw, vh);
    const w = Math.max(1, Math.round(vw * k)), hh = Math.max(1, Math.round(vh * k));
    const dst = canvasOf(w, hh), dur = Number.isFinite(v.duration) ? v.duration : 3;
    const plan = frameSchedule(dur, GIF_FPS);
    return await gifFrom(w, hh, (async function* () {
      for (const f of plan) { await seek(v, Math.min(f.t, Math.max(0, dur - 0.01))); yield { rgba: paint(dst, v, o.bg), delay: f.delay }; }
    })(), !o.bg);
  } finally { URL.revokeObjectURL(v.src); }
}
async function webpToPng(it, o) {
  let bmp;
  try { bmp = await createImageBitmap(it.blob); } catch (_) { throw userErr("Không đọc được ảnh " + it.name + "."); }
  const c = canvasOf(bmp.width, bmp.height);
  paint(c, bmp, o.bg);
  return toBlob(c, "image/png");
}
/** Một sticker theo định dạng đã chọn → { blob, name } */
async function exportOne(it, idx, total, o) {
  const base = it.fromFile ? baseName(it.name) : itemName(idx, total, "").slice(0, -1);
  if (o.format === "orig") return { blob: it.blob, name: it.fromFile ? it.name : base + "." + it.kind };
  if (it.kind === "tgs") return { blob: await tgsToGif(it, o), name: base + ".gif" };
  if (it.kind === "webm") return { blob: await webmToGif(it, o), name: base + ".gif" };
  return { blob: await webpToPng(it, o), name: base + ".png" };
}

/* ---------- giao diện ---------- */
const KIND_TAG = { tgs: "TGS", webm: "WEBM", webp: "WEBP" };

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let items = [], title = "", setName = "", abort = null, previewQ = Promise.resolve();

    /* --- chọn nguồn --- */
    const tabs = h("div", { class: "seg full", role: "radiogroup", "aria-label": "Nguồn sticker" },
      [["tg", "Từ Telegram"], ["file", "Từ file có sẵn"]].map(([v, l]) => h("label", null,
        h("input", { type: "radio", name: "tg-src", value: v, checked: v === "tg", onchange: () => { paneTg.hidden = v !== "tg"; paneFile.hidden = v !== "file"; } }), h("span", { text: l }))));

    const packIn = h("input", { id: "tg-pack", class: "input", type: "text", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://t.me/addstickers/…", value: S.get("pack", "") });
    const tok = passwordField({ id: "tg-token", placeholder: "123456789:AA…", value: S.get("token", "") });
    const remember = h("input", { type: "checkbox", checked: !!S.get("token", "") });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchSet() }, h("span", { html: icon("download"), style: { display: "contents" } }), "Lấy bộ sticker");
    const paneTg = h("div", { class: "tg-pane" },
      h("div", { class: "field" }, h("label", { for: "tg-pack", text: "Link hoặc tên bộ sticker" }), packIn,
        h("small", { text: "Trong Telegram: mở bộ sticker → ⋮ → Sao chép link. Bộ emoji động (t.me/addemoji/…) cũng được." })),
      h("div", { class: "field" }, h("label", { for: "tg-token", text: "Token bot Telegram của bạn" }), tok.el,
        h("small", { text: "Chỉ gửi tới api.telegram.org từ trình duyệt của bạn; BbeTools không có máy chủ, không nhận token. Không đưa lên đường link." })),
      h("label", { class: "switch" }, remember, h("span", null, "Nhớ token trên máy này", h("small", { text: "Lưu trong trình duyệt (localStorage). Tắt trên máy dùng chung." }))),
      h("details", { class: "tg-help" }, h("summary", { text: "Cách lấy token bot (miễn phí, khoảng 1 phút)" }),
        h("ol", null,
          h("li", { html: "Mở Telegram, tìm <b>@BotFather</b> (có dấu tích xanh) và bấm Start." }),
          h("li", { html: "Gửi lệnh <code>/newbot</code>, đặt tên bất kỳ rồi đặt username kết thúc bằng <code>bot</code>." }),
          h("li", { text: "BotFather trả về token dạng 123456789:AAH…: sao chép và dán vào ô trên." }),
          h("li", { html: "Token là chìa khoá điều khiển bot, đừng chia sẻ. Muốn huỷ: gửi <code>/revoke</code> cho BotFather." })),
        h("p", { class: "hint", text: "Bot API của Telegram cần token để tải file sticker, nên không có cách nào lấy bộ sticker từ trình duyệt mà không cần token hoặc máy chủ trung gian." })),
      h("div", { class: "row" }, getBtn));

    const fileIn = h("input", { type: "file", hidden: true, multiple: true, accept: ".tgs,.webm,.webp,.json,application/json,image/webp,video/webm" });
    const paneFile = h("div", { class: "tg-pane", hidden: true },
      h("p", { class: "hint", text: "Đổi file sticker đã lưu từ Telegram (Telegram Desktop: chuột phải vào sticker → Lưu) hoặc từ nơi khác: .tgs, .webm sang GIF, .webp sang PNG." }),
      h("div", { class: "row" },
        h("button", { class: "btn big", type: "button", onclick: () => fileIn.click() }, h("span", { html: icon("file"), style: { display: "contents" } }), "Chọn file .tgs, .webm, .webp"),
        h("button", { class: "btn ghost", type: "button", onclick: () => sampleFiles("sticker-mau.tgs", "sticker-mau.webp").then((f) => addFiles(f)).catch((e) => toast(e.message, { type: "err" })) }, "Thử với file mẫu")),
      h("p", { class: "hint", text: "Hoặc kéo thả, dán file vào trang. File không rời khỏi máy của bạn." }), fileIn);
    fileIn.addEventListener("change", () => { addFiles([...fileIn.files]); fileIn.value = ""; });
    intake({ accept: ["any"], multiple: true, label: "Thả file sticker vào đây", onFiles: (f) => { tabs.querySelector('input[value="file"]').click(); addFiles(f); } });

    /* --- kết quả --- */
    const status = h("div", { "aria-live": "polite" });
    const fmtSeg = h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": "tg-fmt-l" }, [["conv", "PNG + GIF"], ["orig", "Định dạng gốc"]].map(([v, l]) =>
      h("label", null, h("input", { type: "radio", name: "tg-fmt", value: v, checked: v === S.get("format", "conv"), onchange: () => { S.set("format", v); sync(); } }), h("span", { text: l }))));
    const sizeSel = h("select", { id: "tg-size" }, [[512, "512 px (gốc)"], [320, "320 px"], [240, "240 px (nhẹ)"], [160, "160 px (rất nhẹ)"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === +S.get("size", 320) })));
    sizeSel.addEventListener("change", () => S.set("size", +sizeSel.value));
    const bgSel = h("select", { id: "tg-bg" }, [["", "Trong suốt"], ["#ffffff", "Trắng"], ["#000000", "Đen"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === S.get("bg", "") })));
    bgSel.addEventListener("change", () => S.set("bg", bgSel.value));
    const fmtHint = h("p", { class: "hint" });
    const zipBtn = h("button", { class: "btn", type: "button", onclick: () => saveAll() }, h("span", { html: icon("file-archive"), style: { display: "contents" } }), h("span", { text: "Tải tất cả (.zip)" }));
    const prog = h("div", { class: "progress", hidden: true }, h("div"));
    const grid = h("div", { class: "tg-grid" });
    const headTitle = h("h2"), headInfo = h("span", { class: "hint" });
    const res = h("section", { class: "tg-res", hidden: true, "aria-label": "Bộ sticker" },
      h("div", { class: "tg-head" }, headTitle, headInfo),
      h("div", { class: "tg-opts" },
        h("div", { class: "field" }, h("span", { id: "tg-fmt-l", text: "Tải về dạng" }), fmtSeg),
        h("div", { class: "field gif-only" }, h("label", { for: "tg-size", text: "Cỡ GIF (cạnh dài)" }), sizeSel),
        h("div", { class: "field gif-only" }, h("label", { for: "tg-bg", text: "Nền" }), bgSel)),
      fmtHint,
      h("div", { class: "row" }, zipBtn), prog,
      h("p", { class: "hint", text: "Bấm vào một sticker để tải riêng sticker đó." }),
      grid);
    el.append(tabs, paneTg, paneFile, status, res);

    const opts = () => ({ format: fmtSeg.querySelector("input:checked").value, size: +sizeSel.value, bg: bgSel.value });
    function sync() {
      const o = opts();
      res.querySelectorAll(".gif-only").forEach((x) => { x.hidden = o.format === "orig"; });
      fmtHint.textContent = o.format === "orig"
        ? "WEBP mở được ở mọi nơi; TGS (Lottie) và WEBM giữ nguyên để dùng lại trong Telegram hoặc phần mềm làm hoạt hình."
        : "Ảnh tĩnh thành PNG; sticker động (TGS, WEBM) thành GIF. GIF chỉ có trong suốt hoàn toàn hoặc không, nên viền có thể hơi răng cưa: chọn nền Trắng nếu dán lên nền sáng.";
    }
    sync();
    const say = (kind, text) => {
      status.textContent = "";
      if (!text) return;
      const p = h("p", { class: "alert " + kind, html: icon(kind === "err" ? "triangle-alert" : kind === "ok" ? "circle-check" : "info") + "<span></span>" });
      p.querySelector("span").textContent = text;
      status.append(p);
    };

    /* --- thẻ sticker --- */
    function card(it, idx) {
      const pv = h("span", { class: "pv" });
      const b = h("button", { class: "tg-card", type: "button", title: "Tải sticker này", "aria-label": `Tải sticker ${idx + 1}${it.emoji ? " " + it.emoji : ""}`, onclick: () => saveOne(it, idx, b) },
        pv, h("small", null, it.emoji ? h("span", { text: it.emoji }) : null, h("span", { class: "tag", text: KIND_TAG[it.kind] })));
      it.card = b; it.pv = pv;
      if (it.blob) preview(it);
      else pv.append(h("span", { class: "spinner sm" }));
      return b;
    }
    function preview(it) {
      const pv = it.pv;
      pv.textContent = "";
      if (it.kind === "webp" || it.kind === "png" || it.kind === "gif") { pv.append(h("img", { src: URL.createObjectURL(it.blob), alt: it.emoji || "", loading: "lazy" })); return; }
      if (it.kind === "webm") { const v = h("video", { src: URL.createObjectURL(it.blob), muted: true, loop: true, autoplay: true, playsinline: true, "aria-hidden": "true" }); v.muted = true; pv.append(v); return; }
      // TGS: vẽ một khung tĩnh, rê chuột / chạm để chạy
      const c = canvasOf(256, 256);
      pv.append(c);
      previewQ = previewQ.then(async () => {
        try {
          it.data = it.data || await lottieData(it.blob);
          const anim = it.anim = await lottieOn(c, it.data, true);
          anim.goToAndStop(Math.floor(anim.totalFrames / 2), true);
          const play = () => anim.play(), stop = () => anim.pause();
          it.card.addEventListener("pointerenter", play); it.card.addEventListener("pointerleave", stop);
          it.card.addEventListener("focus", play); it.card.addEventListener("blur", stop);
        } catch (_) { pv.textContent = "TGS"; }
      });
    }
    function render() {
      for (const it of items) if (it.anim) { it.anim.destroy(); it.anim = null; }
      grid.textContent = "";
      items.forEach((it, i) => grid.append(card(it, i)));
      const n = (k) => items.filter((x) => x.kind === k).length;
      headTitle.textContent = title;
      headInfo.textContent = [`${items.length} sticker`, n("webp") && `${n("webp")} ảnh tĩnh`, n("tgs") && `${n("tgs")} động (TGS)`, n("webm") && `${n("webm")} video (WEBM)`].filter(Boolean).join(" · ");
      res.hidden = !items.length;
    }

    /* --- lấy bộ sticker từ Telegram --- */
    async function fetchSet() {
      const name = packName(packIn.value), token = tok.input.value.trim();
      if (!name) { say("err", "Nhập link bộ sticker (dạng https://t.me/addstickers/Ten_Bo) hoặc tên bộ."); packIn.focus(); return; }
      if (!token) { say("err", "Nhập token bot Telegram của bạn (xem cách lấy ở dưới)."); tok.input.focus(); return; }
      if (!isToken(token)) { say("err", "Token chưa đúng dạng: số id, dấu hai chấm rồi chuỗi ký tự, ví dụ 123456789:AAH…"); tok.input.focus(); return; }
      S.set("pack", name);
      S.set("token", remember.checked ? token : "");
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say("info", "Đang lấy thông tin bộ sticker…");
      try {
        const set = await call(token, "getStickerSet", { name }, ac.signal);
        title = set.title || set.name; setName = set.name;
        items = set.stickers.map((st) => ({ id: st.file_id, kind: stickerKind(st), emoji: st.emoji || "", w: st.width, h: st.height, blob: null }));
        render();
        let done = 0, failed = 0;
        const total = items.length, queue = items.slice();
        say("info", `Đang tải ${done}/${total} sticker…`);
        await Promise.all(Array.from({ length: 4 }, async () => {
          for (let it; (it = queue.shift());) {
            if (ac.signal.aborted) return;
            try { it.blob = await download(token, it.id, ac.signal); preview(it); }
            catch (e) { if (e.name === "AbortError") return; failed++; it.pv.textContent = "✕"; it.card.disabled = true; }
            done++;
            if (abort === ac) say("info", `Đang tải ${done}/${total} sticker…`);
          }
        }));
        if (ac.signal.aborted) return;
        items = items.filter((x) => x.blob);
        say(failed ? "err" : "ok", failed ? `Đã tải ${items.length}/${total} sticker; ${failed} sticker không tải được.` : `Đã tải xong ${total} sticker. Chọn dạng file rồi bấm “Tải tất cả”.`);
        if (failed) render();
      } catch (e) {
        if (e.name !== "AbortError") { say("err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }

    /* --- file có sẵn --- */
    async function addFiles(files) {
      const ok = files.filter((f) => ["tgs", "webm", "webp", "json"].includes(kindOfName(f.name)) || f.type === "image/webp" || f.type === "video/webm");
      if (ok.length < files.length) toast(`Đã bỏ qua ${files.length - ok.length} file không phải sticker (.tgs, .webm, .webp).`);
      if (!ok.length) return;
      if (abort) { abort.abort(); abort = null; getBtn.disabled = false; }
      const kindOf = (f) => { const k = kindOfName(f.name); return k === "json" ? "tgs" : k || (f.type === "video/webm" ? "webm" : "webp"); };
      if (setName) { items = []; setName = ""; }
      items = items.concat(ok.map((f) => ({ name: f.name, fromFile: true, kind: kindOf(f), blob: f, emoji: "" })));
      title = "File của bạn";
      render();
      say("ok", `${items.length} file · ${fmtSize(items.reduce((a, x) => a + x.blob.size, 0))}. Bấm vào sticker để tải riêng, hoặc tải tất cả.`);
    }

    /* --- tải về --- */
    async function saveOne(it, idx, btn) {
      if (!it.blob) return;
      btn.classList.add("busy"); btn.append(h("span", { class: "spinner sm" }));
      try { const r = await exportOne(it, idx, items.length, opts()); save(r.blob, r.name); }
      catch (e) { toast(e.userMsg || "Không đổi được sticker này.", { type: "err" }); console.error(e); }
      finally { btn.classList.remove("busy"); const sp = btn.querySelector(".spinner"); if (sp) sp.remove(); }
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
          if (o.format !== "orig") say("info", `Đang đổi ${i + 1}/${list.length}…`);
          try { out.push(await exportOne(list[i], items.indexOf(list[i]), items.length, o)); }
          catch (e) { failed++; console.error(e); }
          await nextFrame();
        }
        bar.style.width = "100%";
        if (!out.length) { say("err", "Không đổi được sticker nào."); return; }
        const z = await zip(out);
        save(z, (setName || "sticker") + (o.format === "orig" ? "" : "-png-gif") + ".zip");
        say(failed ? "err" : "ok", (failed ? `${failed} sticker không đổi được. ` : "") + `Đã tạo file .zip gồm ${out.length} sticker (${fmtSize(z.size)}).`);
      } finally { zipBtn.disabled = false; setTimeout(() => { prog.hidden = true; bar.style.width = "0"; }, 600); }
    }
  }
});
