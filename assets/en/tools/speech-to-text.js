/* Tự sinh bởi scripts/build.js từ assets/tools/speech-to-text.js và i18n/en/js/ — đừng sửa tay. */
/* Giọng nói thành văn bản, tạo phụ đề: mô hình Whisper (OpenAI, MIT) bản ONNX chạy trong Web Worker bằng transformers.js.
   Âm thanh giải mã trên máy về 16 kHz đơn kênh, chia thành các cửa sổ ≤ 28 giây ở chỗ lặng (bỏ đoạn im lặng),
   mô hình nghe từng cửa sổ → đoạn có mốc thời gian → văn bản .txt, phụ đề .srt, .vtt.
   Ba mức: base, small (WebAssembly, chạy mọi trình duyệt) và large-v3-turbo (cần WebGPU có shader-f16).
   Mô hình tải từ Hugging Face (ghim theo mã commit) một lần, lưu trong Cache Storage; âm thanh không rời khỏi máy. */
import { h, icon, libUrl, baseName, sampleFiles, copyText, confirmDialog, fmtNum, toast, LANG, IS_TOUCH } from "../core.js";
import { fileTool, seg, radioVal, Cancelled } from "../frames/file.js";
import { probe, audioInfo, videoInfo, videoThumb, decodeMono, webCodecsMissing, alertEl } from "../media.js";
import { planWindows, joinWindow, toCues, toSrt, toVtt, toText, clock } from "../lib/stt.js";
import { fmtDuration } from "../lib/media.js";

const SR = 16000;
const CACHE = "transformers-cache"; // tên Cache Storage mặc định của transformers.js
/* Dung lượng tải (MB) = encoder + decoder + tokenizer, đo trên Hugging Face ngày 15/11/2026 */
const MODELS = {
  base: { id: "onnx-community/whisper-base", rev: "1846881b6b3a3024392c1eea3ad983695bc23925", device: "wasm", dtype: { encoder_model: "q8", decoder_model_merged: "q8" }, mb: 80, label: "Fast", hint: "Whisper base, ≈ 80 MB: fast and light, fine for English; makes many mistakes in Vietnamese, best for a quick look at the content." },
  small: { id: "onnx-community/whisper-small", rev: "36050c46d777d46dc4b5f43f6d90574fc38f8732", device: "wasm", dtype: { encoder_model: "q8", decoder_model_merged: "q8" }, mb: 250, label: "Accurate", hint: "Whisper small, ≈ 250 MB: good accuracy; a computer takes about 1 minute per minute of audio." },
  turbo: { id: "onnx-community/whisper-large-v3-turbo", rev: "360ebcde2559d60bb474678be3c1de9ef347d01a", device: "webgpu", dtype: { encoder_model: "q4f16", decoder_model_merged: "q4f16" }, mb: 570, label: "Best", hint: "Whisper large-v3-turbo, ≈ 570 MB: the most accurate, even with accents and old recordings; runs on the graphics card (WebGPU), so it's fast." }
};
const SUFFIX = { q8: "_quantized", q4f16: "_q4f16", fp16: "_fp16", q4: "_q4", fp32: "" };
const LANGS = [["vi", "Vietnamese"], ["en", "English"], ["auto", "Detect"]];
const WHISPER_LANG = { vi: "vietnamese", en: "english", auto: null };

/* ---------- WebGPU: large-v3-turbo cần card đồ hoạ hỗ trợ số thực 16 bit ---------- */
let gpu = null; // null = chưa biết, true/false
const gpuReady = (async () => {
  try {
    const a = navigator.gpu && (await navigator.gpu.requestAdapter());
    gpu = !!(a && a.features.has("shader-f16"));
  } catch (_) { gpu = false; }
  return gpu;
})();

/* ---------- mô hình đã tải (Cache Storage) ---------- */
const cached = {}; // tên mức → true/false
function modelFiles(m) {
  const base = `https://huggingface.co/${m.id}/resolve/${m.rev}/onnx/`;
  return [base + "encoder_model" + SUFFIX[m.dtype.encoder_model] + ".onnx", base + "decoder_model_merged" + SUFFIX[m.dtype.decoder_model_merged] + ".onnx"];
}
async function checkCached() {
  try {
    if (!("caches" in self)) return;
    const c = await caches.open(CACHE);
    for (const [k, m] of Object.entries(MODELS)) cached[k] = (await Promise.all(modelFiles(m).map((u) => c.match(u)))).every(Boolean);
  } catch (_) {}
}
async function removeModel(k) {
  const m = MODELS[k];
  const c = await caches.open(CACHE);
  for (const req of await c.keys()) if (req.url.includes(`/${m.id}/resolve/`)) await c.delete(req);
  cached[k] = false;
}

/* ---------- Web Worker ---------- */
let worker = null, loadedKey = "", seq = 0;
const pending = new Map();
let onDownload = null;
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("../ai/whisper-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "progress") { if (onDownload) onDownload(m); return; }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.type === "error") p.rej(Object.assign(new Error(m.message), { worker: true }));
    else p.res(m);
  };
  worker.onerror = (e) => { console.error(e); for (const p of pending.values()) p.rej(new Error("worker")); pending.clear(); killWorker(); };
  return worker;
}
function killWorker() {
  if (worker) worker.terminate();
  worker = null; loadedKey = "";
  for (const p of pending.values()) p.rej(new Cancelled());
  pending.clear();
}
function call(msg, transfer) {
  const w = getWorker();
  return new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); w.postMessage({ ...msg, id }, transfer || []); });
}

/* ---------- giao diện ---------- */
const css = document.createElement("style");
css.textContent = `.stt-live{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);max-height:40vh;overflow:auto;white-space:pre-wrap;font-size:15px;line-height:1.6}
.stt-live:empty{display:none}.stt-live .t{color:var(--muted);font:600 12.5px var(--mono);margin-right:6px}
.stt-model{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:8px}
.stt-out{display:grid;gap:12px;margin-top:14px}.stt-out video,.stt-out audio{width:100%;max-width:720px;border-radius:12px}.stt-out video{background:#000;max-height:56vh}
.stt-text{min-height:12em;font-size:15px;line-height:1.6}
.stt-cues{list-style:none;margin:0;padding:0;max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:12px}
.stt-cues li{display:flex;gap:10px;padding:0;border-top:1px solid var(--line)}.stt-cues li:first-child{border-top:0}
.stt-cues button{all:unset;box-sizing:border-box;display:flex;gap:10px;width:100%;padding:8px 12px;cursor:pointer;min-height:44px;align-items:baseline}
.stt-cues button:hover{background:var(--surface-2)}.stt-cues button:focus-visible{outline:3px solid color-mix(in srgb,var(--brand) 45%,transparent);outline-offset:-3px}
.stt-cues .t{flex:none;color:var(--muted);font:600 13px var(--mono);min-width:4.2em}.stt-cues .x{white-space:pre-line}
.stt-cues li.on button{background:color-mix(in srgb,var(--brand) 14%,transparent)}`;
document.head.append(css);

const live = h("div", { class: "stt-live", "aria-live": "off", "aria-label": "Text being recognized" });

fileTool({
  accept: ["audio", "video"], multiple: false, noun: "audio or video file",
  action: "Convert to text",
  sample: () => sampleFiles("giong-noi-mau.m4a"),
  warm: () => checkCached(),
  async load(it) {
    const miss = webCodecsMissing(false);
    let p = null;
    if (!miss) {
      try { p = await probe(it.file); } catch (e) { if (e.userMsg) throw e; }
    }
    if (p) {
      if (!p.audio) throw Object.assign(new Error("This file has no audio."), { keep: true });
      it.p = p;
      it.video = !!p.video;
      it.info = (p.video ? videoInfo(p) : audioInfo(p));
      if (p.video) { try { const c = await videoThumb(p, 112); if (c) it.thumb = c; } catch (_) {} }
    } else it.info = "";
  },
  options(el, ctx) {
    const modelHint = h("p", { class: "hint", "aria-live": "polite" });
    const cacheRow = h("div", { class: "stt-model" });
    const gpuNote = h("div");
    el.append(
      seg("model", Object.entries(MODELS).map(([k, m]) => [k, m.label]), "small", "Model"),
      modelHint, cacheRow, gpuNote,
      seg("lang", LANGS, LANG === "vi" ? "vi" : "en", "Spoken language"),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "stamps" }), h("span", null, "Add timestamps to the text", h("small", { text: "Adds [min:sec] at the start of each paragraph in the .txt file." }))),
      h("p", { class: "hint", text: "The model downloads once and is stored in your browser. Audio is recognized right on this device and never sent anywhere." }));
    const turboBtn = () => el.querySelector('input[name="model"][value="turbo"]');
    const get = () => ({ model: radioVal(el, "model"), lang: radioVal(el, "lang"), stamps: el.querySelector("#stamps").checked });
    const upd = () => {
      const o = get(), m = MODELS[o.model];
      modelHint.textContent = m.hint;
      cacheRow.textContent = "";
      if (cached[o.model]) {
        cacheRow.append(h("span", { class: "hint", html: icon("circle-check") + " Already downloaded on this device" }),
          h("button", { class: "btn ghost sm", type: "button", onclick: async () => {
            if (!(await confirmDialog("Delete the downloaded model?", `Frees about ${m.mb} MB in your browser. Using “${m.label}” next time will download it again.`, "Delete"))) return;
            try { if (loadedKey.startsWith(m.id)) killWorker(); await removeModel(o.model); toast("Model deleted."); } catch (e) { console.error(e); toast("Couldn't delete the model.", { type: "err" }); }
            upd(); ctx.refresh();
          } }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Delete model"));
      } else cacheRow.append(h("span", { class: "hint", text: `The first run downloads about ${m.mb} MB.` }));
      const tb = turboBtn();
      if (tb) tb.disabled = gpu === false;
      gpuNote.textContent = "";
      if (gpu === false) gpuNote.append(h("p", { class: "hint", text: "“Best” needs a browser with WebGPU (recent Chrome or Edge on a computer with a graphics card); it isn't available on this device." }));
    };
    el.addEventListener("change", upd);
    upd();
    checkCached().then(upd);
    gpuReady.then((ok) => {
      // máy tính có WebGPU: mặc định mức tốt nhất (điện thoại giữ “Chính xác” cho đỡ tốn dung lượng tải)
      if (ok && !IS_TOUCH && !ctx.state.busy) { const tb = turboBtn(); if (tb && !el.dataset.touched) tb.checked = true; }
      upd(); ctx.refresh();
    });
    el.addEventListener("change", () => { el.dataset.touched = "1"; }, { once: true });
    return get;
  },
  onChange(ctx) {
    const o = ctx.opts;
    if (!ctx.state.busy && o.model) ctx.goBtn.textContent = cached[o.model] ? "Convert to text" : `Download model (${MODELS[o.model].mb} MB) and convert`;
    if (!live.isConnected) ctx.workMain.append(live);
  },
  ready(items, o) {
    const it = items[0];
    if (!it || it.error) return "This file has no audio to recognize.";
    if (o.model === "turbo" && gpu === false) return "“Best” isn't available on this device. Please choose another model.";
    return true;
  },
  async run(items, o, ctx) {
    const it = items[0], m = MODELS[o.model];
    if (!cached[o.model]) {
      const ok = await confirmDialog(`Download the “${m.label}” model (about ${m.mb} MB)?`,
        "It downloads only once, then stays in your browser for reuse, even offline. If you're on mobile data, consider switching to Wi-Fi.", "Download model");
      if (!ok) throw new Cancelled();
    }
    live.textContent = "";
    const abort = () => killWorker();
    ctx.signal.addEventListener("abort", abort, { once: true });
    const t0 = performance.now();
    try {
      // 1. giải mã âm thanh
      ctx.status("Reading audio…"); ctx.progress(-1);
      let audio;
      try { audio = await decodeMono(it.file, it.p, SR, { signal: ctx.signal, onProgress: (f) => { ctx.progress(f); ctx.status(`Reading audio… ${Math.round(f * 100)}%`); } }); }
      catch (e) { if (e.cancelled || ctx.signal.aborted) throw new Cancelled(); console.error(e); throw Object.assign(new Error("decode"), { userMsg: e.userMsg || `This browser can't read the audio in ${it.name}. Try a recent Chrome or Edge, or convert the file to MP3/M4A first.` }); }
      ctx.check();
      const duration = audio.length / SR;
      const wins = planWindows(audio, SR);
      if (!wins.length) throw Object.assign(new Error("silent"), { userMsg: "No speech was heard in the file (it's silent or too quiet)." });
      const speech = wins.reduce((s, w) => s + w.end - w.start, 0);

      // 2. tải mô hình (lần đầu) và khởi động
      const key = [m.id, m.rev, m.device].join("|");
      if (loadedKey !== key) {
        const files = {};
        const had = cached[o.model]; // đã có trong Cache Storage: chỉ đọc lại từ máy (vẫn báo tiến trình theo byte)
        ctx.status(had ? "Starting the model…" : "Downloading the model…"); ctx.progress(-1);
        onDownload = (p) => {
          files[p.file] = p;
          const all = Object.values(files), loaded = all.reduce((s, x) => s + x.loaded, 0), total = all.reduce((s, x) => s + x.total, 0);
          if (total < 5e6) return;
          const f = loaded / Math.max(total, m.mb * 1e6 * 0.9);
          ctx.progress(f);
          ctx.status(had ? `Starting the model… ${Math.round(f * 100)}%` : `Downloading the model… ${fmtNum(loaded / 1e6, 0)}/${fmtNum(Math.max(total, loaded) / 1e6, 0)} MB`);
        };
        try { await call({ type: "load", lib: libUrl("transformers"), model: m.id, revision: m.rev, device: m.device, dtype: m.dtype }); }
        catch (e) {
          if (e.cancelled || ctx.signal.aborted) throw new Cancelled();
          console.error(e);
          killWorker();
          const net = /fetch|network|Failed to|load/i.test(e.message);
          throw Object.assign(new Error("model"), { userMsg: net && !/webgpu|gpu|adapter/i.test(e.message) ? "Couldn't download the model. Check your connection and try again." : m.device === "webgpu" ? "This device's graphics card can't run “Best”. Please choose “Accurate”." : "Couldn't start the recognition model. Reload the page and try again." });
        } finally { onDownload = null; }
        loadedKey = key;
        cached[o.model] = true;
      }
      ctx.check();

      // 3. nghe từng cửa sổ
      const segs = [];
      let done = 0;
      const t1 = performance.now();
      ctx.progress(0);
      for (let i = 0; i < wins.length; i++) {
        const w = wins[i];
        const left = done > 5 ? (((performance.now() - t1) / 1000) / done) * (speech - done) : 0;
        ctx.status(`Listening ${clock(w.start)} / ${clock(duration)}` + (left > 90 ? ` · about ${Math.round(left / 60)} min left` : left > 5 ? ` · about ${Math.round(left)} s left` : "") + "…");
        const slice = audio.slice(Math.round(w.start * SR), Math.round(w.end * SR));
        let r;
        try { r = await call({ type: "run", audio: slice, language: WHISPER_LANG[o.lang] }, [slice.buffer]); }
        catch (e) { if (e.cancelled || ctx.signal.aborted) throw new Cancelled(); console.error(e); killWorker(); throw Object.assign(new Error("run"), { userMsg: "The model failed while recognizing (the device may be low on memory). Choose “Fast” or close some tabs and try again." }); }
        const add = joinWindow(w, r, segs);
        segs.push(...add);
        for (const s of add) live.append(h("span", { class: "t", text: clock(s.start) }), s.text + "\n");
        live.scrollTop = live.scrollHeight;
        done += w.end - w.start;
        ctx.progress(done / speech);
      }
      if (!segs.length) throw Object.assign(new Error("empty"), { userMsg: "The model didn't recognize any speech. Try picking the right language or the “Best”/“Accurate” model." });

      // 4. kết quả
      const cues = toCues(segs);
      const text = toText(segs, { stamps: o.stamps });
      const name = baseName(it.name);
      const T = (s, type) => new Blob([s], { type });
      const outs = [
        { blob: T(text + "\n", "text/plain;charset=utf-8"), name: name + ".txt", note: "text" },
        { blob: T(toSrt(cues), "application/x-subrip;charset=utf-8"), name: name + ".srt", note: `subtitles, ${cues.length} lines` },
        { blob: T(toVtt(cues), "text/vtt;charset=utf-8"), name: name + ".vtt", note: "subtitles for web pages, YouTube" }
      ];
      outs[0].extra = resultView(it, text, cues, outs[2].blob, o.lang);
      const words = text.split(/\s+/).filter(Boolean).length;
      outs.summaryText = `${fmtNum(words)} words, ${cues.length} subtitle lines from ${fmtDuration(duration)} of audio · “${m.label}” model · ${fmtDuration((performance.now() - t0) / 1000)}. Proofread names and technical terms.`;
      return outs;
    } finally {
      ctx.signal.removeEventListener("abort", abort);
    }
  },
  summary: (outs) => outs.summaryText || null,
  zipName: "speech-to-text",
  doneTitle: () => "Done!"
});

/** Màn kết quả: trình phát (video có phụ đề), văn bản sao chép được, danh sách phụ đề bấm để nghe lại */
function resultView(it, text, cues, vtt, lang) {
  const url = URL.createObjectURL(it.file);
  const media = h(it.video ? "video" : "audio", { src: url, controls: true, preload: "metadata", playsinline: true });
  if (it.video) media.append(h("track", { kind: "subtitles", src: URL.createObjectURL(vtt), srclang: lang === "auto" ? (LANG === "vi" ? "vi" : "en") : lang, label: "Subtitles", default: true }));
  const ta = h("textarea", { class: "textarea stt-text", rows: 10, "aria-label": "Recognized text", spellcheck: "false" });
  ta.value = text;
  const items = cues.map((c) => h("li", null, h("button", { type: "button", "aria-label": `Play from ${clock(c.start)}: ${c.text.replace(/\n/g, " ")}`, onclick: () => { media.currentTime = c.start; media.play().catch(() => {}); } },
    h("span", { class: "t", text: clock(c.start) }), h("span", { class: "x", text: c.text }))));
  const list = h("ul", { class: "stt-cues", "aria-label": "Timed subtitles" }, items);
  let on = -1;
  media.addEventListener("timeupdate", () => {
    const t = media.currentTime;
    let k = -1;
    for (let i = 0; i < cues.length && cues[i].start <= t; i++) if (t < cues[i].end) k = i;
    if (k === on) return;
    if (on >= 0) items[on].classList.remove("on");
    on = k;
    if (k >= 0) { items[k].classList.add("on"); const li = items[k], box = list; if (li.offsetTop < box.scrollTop || li.offsetTop > box.scrollTop + box.clientHeight - li.offsetHeight) box.scrollTop = li.offsetTop - box.clientHeight / 3; }
  });
  return h("div", { class: "stt-out" },
    media,
    h("div", { class: "row", style: { justifyContent: "space-between" } }, h("h3", { text: "Text", style: { margin: 0 } }),
      h("button", { class: "btn sm", type: "button", onclick: () => copyText(ta.value) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy")),
    ta,
    h("h3", { text: "Subtitles (click to replay that part)", style: { margin: "4px 0 0" } }),
    list,
    alertEl("info", "Edits in the text box are only for copying; the downloaded .srt and .vtt keep the original result. To edit subtitles, open the .srt in a subtitle editor or text editor."));
}
