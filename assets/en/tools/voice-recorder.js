/* Tự sinh bởi scripts/build.js từ assets/tools/voice-recorder.js và i18n/en/js/ — đừng sửa tay. */
/* Ghi âm: ghi bằng micro (MediaRecorder), tạm dừng/tiếp tục, xem mức âm và dạng sóng khi ghi, nghe lại,
   đặt tên, tải về M4A/MP3/WAV (chuyển bằng Mediabunny) hoặc gửi sang Cắt âm thanh. Bản ghi chỉ nằm trong trang này. */
import { h, icon, save, toast, registry, sendTo, fmtSize, confirmDialog } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { mb, convert, ensureAudioEncoder, AUDIO_OUT, alertEl } from "../media.js";
import { fmtTime, pickMime, extForMime, stampName } from "../lib/media.js";

const MIC_ERR = {
  NotAllowedError: "You haven't allowed microphone access. Click the lock icon next to the address bar to allow it, then try again.",
  NotFoundError: "No microphone found. Plug in a microphone or a headset with a mic.",
  NotReadableError: "The microphone is being used by another app (Zoom, Teams…). Close that app and try again.",
  SecurityError: "The browser is blocking the microphone on this page."
};
const MIMES = ["audio/webm;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
const SAVE_FMT = [["m4a", "M4A"], ["mp3", "MP3"], ["wav", "WAV"]];

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let stream = null, rec = null, ac = null, an = null, timer = null, chunks = [], t0 = 0, acc = 0, hist = [], mime = "";
    const recs = [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      el.append(alertEl("err", "This browser doesn't support audio recording. Use a recent Chrome, Edge, Firefox or Safari."));
      return;
    }
    const big = h("button", { class: "vr-big", type: "button", "aria-label": "Start recording", onclick: () => (rec ? stop() : start()) }, h("span", { class: "vr-dot" }));
    const clock = h("div", { class: "vr-clock", role: "timer", "aria-live": "off", text: "0:00" });
    const stateEl = h("p", { class: "vr-state", "aria-live": "polite", text: "Press the red button to start recording" });
    const pauseBtn = h("button", { class: "btn ghost", type: "button", hidden: true, onclick: togglePause });
    const wave = h("canvas", { class: "vr-wave", height: 90, "aria-hidden": "true" });
    const msg = h("div");
    const micSel = h("select", { class: "select", id: "vr-mic", "aria-label": "Choose microphone" }, h("option", { value: "", text: "Default microphone" }));
    const clean = h("input", { type: "checkbox", id: "vr-clean", checked: S.get("clean", true) });
    const fmtSel = h("select", { class: "select", id: "vr-fmt", "aria-label": "Download format" }, SAVE_FMT.map(([v, l]) => h("option", { value: v, text: l, selected: v === S.get("fmt", "m4a") })));
    const list = h("div", { class: "vr-list" });
    el.append(h("div", { class: "vr" },
      h("div", { class: "vr-panel" }, big, clock, stateEl, wave, h("div", { class: "row vr-ctl" }, pauseBtn)),
      msg,
      h("details", { class: "vr-opts" }, h("summary", { text: "Microphone and format options" }),
        h("div", { class: "vr-opts-in" },
          h("label", { class: "field" }, h("span", { text: "Micro" }), micSel),
          h("label", { class: "switch" }, clean, h("span", null, "Noise suppression, echo cancellation", h("small", { text: "Turn on for voice; turn off for music and instruments to keep the natural sound." }))),
          h("label", { class: "field" }, h("span", { text: "Download format" }), fmtSel),
          h("p", { class: "hint", text: "M4A is small and plays well on iPhone and Android; MP3 opens everywhere; WAV is uncompressed (large files)." }))),
      list,
      h("p", { class: "hint", text: "Recordings stay only on this page and are never sent anywhere. Download them before closing or reloading the page." })));
    clean.addEventListener("change", () => S.set("clean", clean.checked));
    fmtSel.addEventListener("change", () => { S.set("fmt", fmtSel.value); drawList(); });
    // giữ lại danh sách micro (có tên sau khi đã cho phép)
    async function fillMics() {
      try {
        const ds = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.deviceId);
        const cur = micSel.value;
        micSel.textContent = "";
        micSel.append(h("option", { value: "", text: "Default microphone" }), ...ds.filter((d) => d.deviceId !== "default").map((d, i) => h("option", { value: d.deviceId, text: d.label || "Micro " + (i + 1) })));
        micSel.value = cur;
      } catch (_) {}
    }
    fillMics();

    function draw() {
      const recording = rec && rec.state === "recording", paused = rec && rec.state === "paused";
      big.classList.toggle("on", !!rec);
      big.setAttribute("aria-label", rec ? "Stop and save the recording" : "Start recording");
      big.title = rec ? "Stop and save" : "Start recording";
      pauseBtn.hidden = !rec;
      pauseBtn.innerHTML = icon(paused ? "play" : "pause") + (paused ? "Resume" : "Pause");
      stateEl.textContent = recording ? "Recording… press the square button to stop and save" : paused ? "Paused" : recs.length ? "Press the red button to record a new one" : "Press the red button to start recording";
      el.querySelector(".vr-panel").classList.toggle("rec", !!recording);
    }
    const elapsed = () => acc + (rec && rec.state === "recording" ? performance.now() - t0 : 0);
    async function start() {
      msg.textContent = "";
      try {
        const c = clean.checked;
        stream = await navigator.mediaDevices.getUserMedia({ audio: { ...(micSel.value ? { deviceId: { exact: micSel.value } } : {}), echoCancellation: c, noiseSuppression: c, autoGainControl: c }, video: false });
      } catch (e) { msg.append(alertEl("err", MIC_ERR[e && e.name] || "Couldn't start the microphone: " + ((e && e.message) || e))); return; }
      fillMics();
      mime = pickMime((m) => MediaRecorder.isTypeSupported(m), MIMES);
      try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 128000 } : {}); }
      catch (_) { rec = new MediaRecorder(stream); }
      mime = rec.mimeType || mime || "audio/webm";
      chunks = []; acc = 0; hist = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = finish;
      rec.start(1000);
      t0 = performance.now();
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === "suspended") ac.resume().catch(() => {}); // không chờ: thiếu thao tác người dùng thì promise này treo
        an = ac.createAnalyser(); an.fftSize = 1024;
        ac.createMediaStreamSource(stream).connect(an);
      } catch (_) { an = null; }
      timer = setInterval(tick, 50);
      ctx.wakeLock(true);
      draw();
    }
    function togglePause() {
      if (!rec) return;
      if (rec.state === "recording") { rec.pause(); acc += performance.now() - t0; }
      else if (rec.state === "paused") { rec.resume(); t0 = performance.now(); }
      draw();
    }
    function stop() { if (rec && rec.state !== "inactive") { if (rec.state === "recording") acc += performance.now() - t0; rec.stop(); } }
    function tick() {
      clock.textContent = fmtTime(elapsed() / 1000, 0);
      if (!an) return;
      const buf = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(buf);
      let s = 0; for (const v of buf) s += v * v;
      const rms = Math.sqrt(s / buf.length), lvl = Math.max(0, Math.min(1, (20 * Math.log10(rms || 1e-8) + 60) / 60));
      if (!rec || rec.state === "recording") hist.push(lvl);
      const w = Math.round(wave.clientWidth * (window.devicePixelRatio || 1)); if (wave.width !== w && w) wave.width = w;
      const g = wave.getContext("2d"), H = wave.height, bw = 6, n = Math.floor(wave.width / bw);
      g.clearRect(0, 0, wave.width, H);
      g.fillStyle = getComputedStyle(wave).color;
      const tail = hist.slice(-n);
      tail.forEach((v, i) => { const hh = Math.max(2, v * H * 0.95); g.fillRect(wave.width - (tail.length - i) * bw, (H - hh) / 2, bw - 2, hh); });
    }
    async function finish() {
      clearInterval(timer); timer = null;
      const dur = elapsed() / 1000;
      if (stream) ctx.stopStream(stream);
      stream = null;
      if (ac) { ac.close().catch(() => {}); ac = null; an = null; }
      ctx.wakeLock(false);
      const raw = new Blob(chunks, { type: mime });
      rec = null; draw();
      if (!raw.size) { msg.append(alertEl("warn", "No audio was recorded. Check the microphone and try again.")); return; }
      const now = new Date();
      const r = { id: Date.now(), name: "Recording " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), date: now, dur, raw, blob: raw, ext: extForMime(mime), saved: false };
      r.url = URL.createObjectURL(raw);
      recs.unshift(r);
      drawList();
      // bản ghi WebM của MediaRecorder thiếu thời lượng nên không tua được: chép lại sang vỏ file chuẩn (không mã hoá lại)
      try {
        const M = await mb();
        const webm = /webm/.test(mime);
        const res = await convert({ file: new File([raw], "recording." + r.ext, { type: mime }), format: webm ? new M.WebMOutputFormat() : new M.Mp4OutputFormat({ fastStart: "in-memory" }), mime: webm ? "audio/webm" : "audio/mp4", need: ["audio"] });
        URL.revokeObjectURL(r.url);
        r.blob = res.blob; r.url = URL.createObjectURL(res.blob);
        drawList();
      } catch (e) { console.warn("remux", e); }
      clock.textContent = "0:00";
    }
    async function download(r, b) {
      const key = fmtSel.value, F = AUDIO_OUT[key];
      const base = r.name.trim() ? r.name.trim().replace(/[\\/:*?"<>|]+/g, "-") : stampName("recordings", r.date, F.ext).replace(/\.[^.]+$/, "");
      b.disabled = true; const old = b.innerHTML; b.innerHTML = "<span class=\"spinner sm\"></span> Preparing…";
      try {
        let out;
        if (key === "m4a" && /mp4/.test(mime)) out = r.blob;
        else {
          const M = await mb();
          await ensureAudioEncoder(F.codec);
          out = (await convert({ file: new File([r.blob], "recording." + r.ext, { type: r.blob.type }), format: F.fmt(M), mime: F.mime, need: ["audio"], tags: key === "wav" ? {} : { title: r.name },
            audio: { codec: F.codec, forceTranscode: true, ...(F.lossless ? {} : { quality: new M.Quality({ bitrate: (key === "mp3" ? 160 : 128) * 1000 }) }) } })).blob;
        }
        save(out, base + "." + F.ext);
        r.saved = true;
      } catch (e) { console.error(e); toast(e.userMsg || "Couldn't create the file: " + e.message, { type: "err" }); }
      b.disabled = false; b.innerHTML = old;
    }
    async function toTrim(r) {
      const reg = await registry(), t = reg.tools.find((x) => x.id === "trim-audio");
      r.saved = true;
      sendTo(t, [new File([r.blob], (r.name.trim() || "recordings") + "." + r.ext, { type: r.blob.type })]);
    }
    function drawList() {
      list.textContent = "";
      if (!recs.length) return;
      const F = AUDIO_OUT[fmtSel.value];
      list.append(h("h2", { class: "vr-h", text: `Recording (${recs.length})` }), ...recs.map((r) => {
        const name = h("input", { class: "input vr-name", value: r.name, "aria-label": "Recording name", oninput: (e) => { r.name = e.target.value; } });
        const dl = h("button", { class: "btn sm", type: "button", onclick: (e) => download(r, e.currentTarget) }, h("span", { html: icon("download"), style: { display: "contents" } }), "Download " + F.label.replace(/ \(.*\)/, ""));
        return h("div", { class: "vr-item" },
          h("div", { class: "vr-head" }, name, h("span", { class: "hint", text: `${fmtTime(r.dur, 0)} · ${fmtSize(r.blob.size)}` })),
          h("audio", { src: r.url, controls: true, preload: "metadata" }),
          h("div", { class: "row" }, dl,
            h("button", { class: "btn ghost sm", type: "button", onclick: () => toTrim(r) }, h("span", { html: icon("scissors"), style: { display: "contents" } }), "Trim"),
            h("button", { class: "btn ghost sm", type: "button", onclick: async () => { if (!r.saved && !(await confirmDialog("Delete recording?", "This recording hasn't been downloaded; once deleted it can't be recovered.", "Delete"))) return; URL.revokeObjectURL(r.url); recs.splice(recs.indexOf(r), 1); drawList(); draw(); } }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Delete")));
      }));
    }
    window.addEventListener("beforeunload", (e) => { if (rec || recs.some((r) => !r.saved)) { e.preventDefault(); e.returnValue = ""; } });
    window.addEventListener("pagehide", () => { if (stream) ctx.stopStream(stream); });
    draw();
  }
});

const css = document.createElement("style");
css.textContent = `.vr{display:grid;gap:16px}
.vr-panel{display:grid;justify-items:center;gap:8px;padding:22px 16px;border:1px solid var(--line);border-radius:18px;background:var(--surface-2)}
.vr-big{width:88px;height:88px;border-radius:50%;border:4px solid var(--line-2);background:var(--surface);display:grid;place-items:center;cursor:pointer;transition:transform .1s}
.vr-big:hover{transform:scale(1.04)}.vr-big:focus-visible{outline:3px solid var(--brand);outline-offset:3px}
.vr-dot{width:44px;height:44px;border-radius:50%;background:#e5484d;transition:all .15s}
.vr-big.on .vr-dot{width:32px;height:32px;border-radius:7px}
.vr-panel.rec .vr-big{border-color:#e5484d;animation:vr-pulse 1.6s infinite}
@keyframes vr-pulse{0%{box-shadow:0 0 0 0 rgba(229,72,77,.45)}70%{box-shadow:0 0 0 16px rgba(229,72,77,0)}100%{box-shadow:0 0 0 0 rgba(229,72,77,0)}}
@media (prefers-reduced-motion:reduce){.vr-panel.rec .vr-big{animation:none}}
.vr-clock{font:700 34px var(--mono);font-variant-numeric:tabular-nums}
.vr-state{margin:0;color:var(--muted);text-align:center}
.vr-wave{width:100%;max-width:560px;height:90px;color:var(--brand)}
.vr-panel.rec .vr-wave{color:#e5484d}
.vr-opts{border:1px solid var(--line);border-radius:12px;padding:10px 14px}.vr-opts summary{cursor:pointer;font-weight:600}
.vr-opts-in{display:grid;gap:12px;margin-top:12px}
.vr-list{display:grid;gap:12px}.vr-h{font-size:18px;margin:4px 0 0}
.vr-item{display:grid;gap:10px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
.vr-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.vr-name{flex:1;min-width:160px}
.vr-item audio{width:100%}`;
document.head.append(css);
