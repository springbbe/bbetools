/* Tự sinh bởi scripts/build.js từ assets/tools/telegram-stickers.js và i18n/en/js/ — đừng sửa tay. */
/* Tải sticker Telegram: lấy cả bộ sticker qua Bot API ngay từ trình duyệt (token bot của chính người dùng, gửi thẳng tới
   api.telegram.org — Telegram cho phép gọi từ trang web, BbeTools không có máy chủ trung gian), xem trước, tải nguyên bản
   (WEBP, TGS, WEBM) hoặc đổi sang PNG (ảnh tĩnh) và GIF (sticker động). Cũng đổi được file .tgs/.webm/.webp có sẵn.
   .tgs là Lottie JSON nén gzip: vẽ bằng lottie-web (canvas) theo từng khung rồi mã hoá GIF bằng gifenc. */
import { h, icon, toast, save, zip, intake, passwordField, sampleFiles, baseName, fmtSize, nextFrame } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { packName, isToken, stickerKind, kindOfName, itemName, frameSchedule } from "../lib/telegram.js";
import { userErr, canvasOf, paint, gifFrom, lottieData, lottieOn, lottieToGif, stillToPng } from "../sticker.js";

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
async function call(token, method, params, signal) {
  for (let attempt = 0; ; attempt++) {
    let r;
    try { r = await fetch(API + "bot" + token + "/" + method + "?" + new URLSearchParams(params || {}), { credentials: "omit", signal }); }
    catch (e) {
      if (e.name === "AbortError") throw e;
      throw userErr("Couldn't connect to Telegram (api.telegram.org). Your network may be blocking Telegram; try another network.");
    }
    const j = await r.json().catch(() => null);
    if (j && j.ok) return j.result;
    if (r.status === 429 && attempt < 3) { await new Promise((res) => setTimeout(res, 1000 * ((j && j.parameters && j.parameters.retry_after) || 2))); continue; }
    if (r.status === 401 || (r.status === 404 && method === "getMe")) throw userErr("Telegram rejected this token (wrong or revoked). Check it with @BotFather.");
    if (j && /STICKERSET_INVALID|STICKERSET_NOT_FOUND/i.test(j.description || "")) throw userErr("Sticker set not found. Check the link (t.me/addstickers/…) or the set name.");
    throw userErr("Telegram error: " + ((j && j.description) || "HTTP " + r.status));
  }
}
async function download(token, fileId, signal) {
  const f = await call(token, "getFile", { file_id: fileId }, signal);
  let r;
  try { r = await fetch(API + "file/bot" + token + "/" + f.file_path, { credentials: "omit", signal }); }
  catch (e) { if (e.name === "AbortError") throw e; throw userErr("Couldn't download the file from Telegram."); }
  if (!r.ok) throw userErr("Couldn't download the file from Telegram (HTTP " + r.status + ").");
  return r.blob();
}

/* ---------- đổi định dạng (hàm chung ở assets/sticker.js) ---------- */
async function tgsToGif(it, o) {
  const data = it.data || (it.data = await lottieData(it.blob));
  return lottieToGif(data, o);
}

function videoOf(blob) {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.onerror = () => rej(userErr("This browser can't read video stickers (WEBM). Try Chrome, Edge or Firefox."));
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
const webpToPng = (it, o) => stillToPng(it.blob, o.bg);
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
    const tabs = h("div", { class: "seg full", role: "radiogroup", "aria-label": "Sticker source" },
      [["tg", "From Telegram"], ["file", "From existing files"]].map(([v, l]) => h("label", null,
        h("input", { type: "radio", name: "tg-src", value: v, checked: v === "tg", onchange: () => { paneTg.hidden = v !== "tg"; paneFile.hidden = v !== "file"; } }), h("span", { text: l }))));

    const packIn = h("input", { id: "tg-pack", class: "input", type: "text", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://t.me/addstickers/…", value: S.get("pack", "") });
    const tok = passwordField({ id: "tg-token", placeholder: "123456789:AA…", value: S.get("token", "") });
    const remember = h("input", { type: "checkbox", checked: !!S.get("token", "") });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchSet() }, h("span", { html: icon("download"), style: { display: "contents" } }), "Get sticker set");
    const paneTg = h("div", { class: "tg-pane" },
      h("div", { class: "field" }, h("label", { for: "tg-pack", text: "Sticker set link or name" }), packIn,
        h("small", { text: "In Telegram: open the sticker set → ⋮ → Copy link. Animated emoji sets (t.me/addemoji/…) work too." })),
      h("div", { class: "field" }, h("label", { for: "tg-token", text: "Your Telegram bot token" }), tok.el,
        h("small", { text: "Only sent to api.telegram.org from your browser; BbeTools has no server and never receives the token. It's never put in the link." })),
      h("label", { class: "switch" }, remember, h("span", null, "Remember the token on this device", h("small", { text: "Saved in the browser (localStorage). Turn off on shared computers." }))),
      h("details", { class: "tg-help" }, h("summary", { text: "How to get a bot token (free, about 1 minute)" }),
        h("ol", null,
          h("li", { html: "Open Telegram, find <b>@BotFather</b> (with the blue check mark) and tap Start." }),
          h("li", { html: "Send <code>/newbot</code>, pick any name, then a username ending in <code>bot</code>." }),
          h("li", { text: "BotFather replies with a token like 123456789:AAH…: copy it and paste it into the box above." }),
          h("li", { html: "The token is the key to control the bot, don't share it. To cancel it, send <code>/revoke</code> to BotFather." })),
        h("p", { class: "hint", text: "Telegram's Bot API needs a token to download sticker files, so there's no way to fetch a sticker set from the browser without a token or a middleman server." })),
      h("div", { class: "row" }, getBtn));

    const fileIn = h("input", { type: "file", hidden: true, multiple: true, accept: ".tgs,.webm,.webp,.json,application/json,image/webp,video/webm" });
    const paneFile = h("div", { class: "tg-pane", hidden: true },
      h("p", { class: "hint", text: "Convert sticker files saved from Telegram (Telegram Desktop: right-click a sticker → Save) or elsewhere: .tgs and .webm to GIF, .webp to PNG." }),
      h("div", { class: "row" },
        h("button", { class: "btn big", type: "button", onclick: () => fileIn.click() }, h("span", { html: icon("file"), style: { display: "contents" } }), "Choose .tgs, .webm, .webp files"),
        h("button", { class: "btn ghost", type: "button", onclick: () => sampleFiles("sticker-mau.tgs", "sticker-mau.webp").then((f) => addFiles(f)).catch((e) => toast(e.message, { type: "err" })) }, "Try a sample file")),
      h("p", { class: "hint", text: "Or drag and drop or paste files onto the page. Files never leave your device." }), fileIn);
    fileIn.addEventListener("change", () => { addFiles([...fileIn.files]); fileIn.value = ""; });
    intake({ accept: ["any"], multiple: true, label: "Drop sticker files here", onFiles: (f) => { tabs.querySelector('input[value="file"]').click(); addFiles(f); } });

    /* --- kết quả --- */
    const status = h("div", { "aria-live": "polite" });
    const fmtSeg = h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": "tg-fmt-l" }, [["conv", "PNG + GIF"], ["orig", "Original format"]].map(([v, l]) =>
      h("label", null, h("input", { type: "radio", name: "tg-fmt", value: v, checked: v === S.get("format", "conv"), onchange: () => { S.set("format", v); sync(); } }), h("span", { text: l }))));
    const sizeSel = h("select", { id: "tg-size" }, [[512, "512 px (original)"], [320, "320 px"], [240, "240 px (light)"], [160, "160 px (very light)"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === +S.get("size", 320) })));
    sizeSel.addEventListener("change", () => S.set("size", +sizeSel.value));
    const bgSel = h("select", { id: "tg-bg" }, [["", "Transparent"], ["#ffffff", "White"], ["#000000", "Black"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === S.get("bg", "") })));
    bgSel.addEventListener("change", () => S.set("bg", bgSel.value));
    const fmtHint = h("p", { class: "hint" });
    const zipBtn = h("button", { class: "btn", type: "button", onclick: () => saveAll() }, h("span", { html: icon("file-archive"), style: { display: "contents" } }), h("span", { text: "Download all (.zip)" }));
    const prog = h("div", { class: "progress", hidden: true }, h("div"));
    const grid = h("div", { class: "tg-grid" });
    const headTitle = h("h2"), headInfo = h("span", { class: "hint" });
    const res = h("section", { class: "tg-res", hidden: true, "aria-label": "Sticker set" },
      h("div", { class: "tg-head" }, headTitle, headInfo),
      h("div", { class: "tg-opts" },
        h("div", { class: "field" }, h("span", { id: "tg-fmt-l", text: "Download as" }), fmtSeg),
        h("div", { class: "field gif-only" }, h("label", { for: "tg-size", text: "GIF size (long side)" }), sizeSel),
        h("div", { class: "field gif-only" }, h("label", { for: "tg-bg", text: "Background" }), bgSel)),
      fmtHint,
      h("div", { class: "row" }, zipBtn), prog,
      h("p", { class: "hint", text: "Click a sticker to download just that one." }),
      grid);
    el.append(tabs, paneTg, paneFile, status, res);

    const opts = () => ({ format: fmtSeg.querySelector("input:checked").value, size: +sizeSel.value, bg: bgSel.value });
    function sync() {
      const o = opts();
      res.querySelectorAll(".gif-only").forEach((x) => { x.hidden = o.format === "orig"; });
      fmtHint.textContent = o.format === "orig"
        ? "WEBP opens everywhere; TGS (Lottie) and WEBM are kept as is for reuse in Telegram or animation software."
        : "Still images become PNG; animated stickers (TGS, WEBM) become GIF. GIF transparency is all-or-nothing, so edges may look a bit jagged: choose a White background if you'll put it on a light background.";
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
      const b = h("button", { class: "tg-card", type: "button", title: "Download this sticker", "aria-label": `Download sticker ${idx + 1}${it.emoji ? " " + it.emoji : ""}`, onclick: () => saveOne(it, idx, b) },
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
      headInfo.textContent = [`${items.length} ${(items.length) == 1 ? "sticker" : "stickers"}`, n("webp") && `${n("webp")} still`, n("tgs") && `${n("tgs")} animated (TGS)`, n("webm") && `${n("webm")} video (WEBM)`].filter(Boolean).join(" · ");
      res.hidden = !items.length;
    }

    /* --- lấy bộ sticker từ Telegram --- */
    async function fetchSet() {
      const name = packName(packIn.value), token = tok.input.value.trim();
      if (!name) { say("err", "Enter the sticker set link (like https://t.me/addstickers/Set_Name) or the set name."); packIn.focus(); return; }
      if (!token) { say("err", "Enter your Telegram bot token (see how to get one below)."); tok.input.focus(); return; }
      if (!isToken(token)) { say("err", "The token format isn't right: an id number, a colon, then a string of characters, e.g. 123456789:AAH…"); tok.input.focus(); return; }
      S.set("pack", name);
      S.set("token", remember.checked ? token : "");
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say("info", "Getting the sticker set info…");
      try {
        const set = await call(token, "getStickerSet", { name }, ac.signal);
        title = set.title || set.name; setName = set.name;
        items = set.stickers.map((st) => ({ id: st.file_id, kind: stickerKind(st), emoji: st.emoji || "", w: st.width, h: st.height, blob: null }));
        render();
        let done = 0, failed = 0;
        const total = items.length, queue = items.slice();
        say("info", `Downloading ${done}/${total} stickers…`);
        await Promise.all(Array.from({ length: 4 }, async () => {
          for (let it; (it = queue.shift());) {
            if (ac.signal.aborted) return;
            try { it.blob = await download(token, it.id, ac.signal); preview(it); }
            catch (e) { if (e.name === "AbortError") return; failed++; it.pv.textContent = "✕"; it.card.disabled = true; }
            done++;
            if (abort === ac) say("info", `Downloading ${done}/${total} stickers…`);
          }
        }));
        if (ac.signal.aborted) return;
        items = items.filter((x) => x.blob);
        say(failed ? "err" : "ok", failed ? `Downloaded ${items.length}/${total} stickers; ${failed} couldn't be downloaded.` : `Downloaded all ${total} stickers. Choose the file type, then click “Download all”.`);
        if (failed) render();
      } catch (e) {
        if (e.name !== "AbortError") { say("err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }

    /* --- file có sẵn --- */
    async function addFiles(files) {
      const ok = files.filter((f) => ["tgs", "webm", "webp", "json"].includes(kindOfName(f.name)) || f.type === "image/webp" || f.type === "video/webm");
      if (ok.length < files.length) toast(`Skipped ${files.length - ok.length} ${(files.length - ok.length) == 1 ? "file that isn't a sticker" : "files that aren't stickers"} (.tgs, .webm, .webp).`);
      if (!ok.length) return;
      if (abort) { abort.abort(); abort = null; getBtn.disabled = false; }
      const kindOf = (f) => { const k = kindOfName(f.name); return k === "json" ? "tgs" : k || (f.type === "video/webm" ? "webm" : "webp"); };
      if (setName) { items = []; setName = ""; }
      items = items.concat(ok.map((f) => ({ name: f.name, fromFile: true, kind: kindOf(f), blob: f, emoji: "" })));
      title = "Your files";
      render();
      say("ok", `${items.length} ${(items.length) == 1 ? "file" : "files"} · ${fmtSize(items.reduce((a, x) => a + x.blob.size, 0))}. Click a sticker to download it, or download all.`);
    }

    /* --- tải về --- */
    async function saveOne(it, idx, btn) {
      if (!it.blob) return;
      btn.classList.add("busy"); btn.append(h("span", { class: "spinner sm" }));
      try { const r = await exportOne(it, idx, items.length, opts()); save(r.blob, r.name); }
      catch (e) { toast(e.userMsg || "Couldn't convert this sticker.", { type: "err" }); console.error(e); }
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
          if (o.format !== "orig") say("info", `Converting ${i + 1}/${list.length}…`);
          try { out.push(await exportOne(list[i], items.indexOf(list[i]), items.length, o)); }
          catch (e) { failed++; console.error(e); }
          await nextFrame();
        }
        bar.style.width = "100%";
        if (!out.length) { say("err", "No stickers could be converted."); return; }
        const z = await zip(out);
        save(z, (setName || "sticker") + (o.format === "orig" ? "" : "-png-gif") + ".zip");
        say(failed ? "err" : "ok", (failed ? `${failed} ${(failed) == 1 ? "sticker" : "stickers"} couldn't be converted. ` : "") + `Created a .zip with ${out.length} stickers (${fmtSize(z.size)}).`);
      } finally { zipBtn.disabled = false; setTimeout(() => { prog.hidden = true; bar.style.width = "0"; }, 600); }
    }
  }
});
