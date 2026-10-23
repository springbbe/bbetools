/* Tự sinh bởi scripts/build.js từ assets/tools/screen-recorder.js và i18n/en/js/ — đừng sửa tay. */
/* Quay màn hình: getDisplayMedia (cả màn hình, một cửa sổ hoặc một tab) + MediaRecorder, kèm âm thanh của máy/tab
   và/hoặc micro (trộn bằng Web Audio), đếm ngược, tạm dừng, xem lại; sửa thời lượng file (chép lại vỏ file bằng
   Mediabunny, không mã hoá lại) rồi tải về hoặc gửi sang Cắt video, Nén video, Video sang GIF. Chỉ chạy trên máy tính. */
import { h, icon, save, toast, registry, sendTo, fmtSize, sleep, IS_TOUCH } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { mb, convert, alertEl } from "../media.js";
import { fmtTime, pickMime, extForMime, stampName } from "../lib/media.js";

const MIMES = {
  mp4: ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4"],
  webm: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
};
const QUALITY = { high: 8e6, medium: 4e6, low: 2e6 };

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    const canRecord = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && typeof MediaRecorder !== "undefined";
    if (!canRecord) {
      el.append(alertEl("info", IS_TOUCH || /Android|iPhone|iPad/.test(navigator.userAgent)
        ? "Phone and tablet browsers don't let websites record the screen. Use the built-in feature: on iPhone/iPad open Control Center → Screen Recording; on Android pull down the notification shade → Screen record."
        : "This browser doesn't support screen recording. Use a recent Chrome, Edge, Firefox or Safari on a computer."));
      return;
    }
    const mp4ok = !!pickMime((m) => MediaRecorder.isTypeSupported(m), MIMES.mp4);
    let disp = null, mic = null, mixed = null, ac = null, rec = null, chunks = [], t0 = 0, acc = 0, timer = null, mime = "", result = null;
    const sel = (id, label, choices, val) => h("label", { class: "field" }, h("span", { text: label }), h("select", { id, class: "select" }, choices.map(([v, l]) => h("option", { value: v, text: l, selected: v === val }))));
    const sw = (id, label, small, on) => h("label", { class: "switch" }, h("input", { type: "checkbox", id, checked: S.get(id, on) }), h("span", null, label, small ? h("small", { text: small }) : null));
    const setup = h("div", { class: "sr-setup" },
      h("div", { class: "sr-grid" },
        h("div", { class: "sr-col" },
          sw("sys", "Record system or tab audio", "When the browser asks, turn on “Share audio”. Chrome/Edge capture tab audio; on Windows they can capture the whole screen's audio too.", true),
          sw("mic", "Record microphone", "For narrating while recording.", false),
          sw("count", "3-second countdown before recording", "", true)),
        h("div", { class: "sr-col" },
          sel("q", "Quality", [["high", "High (8 Mbps, sharp text)"], ["medium", "Medium (4 Mbps)"], ["low", "Light (2 Mbps)"]], S.get("q", "medium")),
          sel("fps", "Frame rate", [["30", "30 (recommended)"], ["60", "60 (smooth, larger file)"], ["15", "15 (slideshows, light)"]], S.get("fps", "30")),
          sel("fmt", "Format", [...(mp4ok ? [["mp4", "MP4 (plays everywhere)"]] : []), ["webm", "WebM"]], mp4ok ? S.get("fmt", "mp4") : "webm"))),
      h("button", { class: "btn big", type: "button", id: "sr-start", onclick: start }, h("span", { html: icon("screen-share"), style: { display: "contents" } }), "Choose a screen and start recording"),
      h("p", { class: "hint", text: "You'll choose to record the entire screen, a window or a tab. The video stays on your device and is never uploaded." }));
    for (const id of ["sys", "mic", "count", "q", "fps", "fmt"]) setup.querySelector("#" + id).addEventListener("change", (e) => S.set(id, e.target.type === "checkbox" ? e.target.checked : e.target.value));
    const msg = h("div");
    const live = h("video", { class: "sr-live", muted: true, playsinline: true, autoplay: true, "aria-label": "Preview of the screen being recorded" });
    const clock = h("span", { class: "sr-clock", role: "timer", text: "0:00" });
    const pauseBtn = h("button", { class: "btn ghost", type: "button", onclick: togglePause });
    const stopBtn = h("button", { class: "btn", type: "button", onclick: stop }, h("span", { html: icon("square"), style: { display: "contents" } }), "Stop recording");
    const count = h("div", { class: "sr-count", hidden: true, "aria-live": "assertive" });
    const running = h("div", { class: "sr-run", hidden: true },
      h("div", { class: "sr-bar" }, h("span", { class: "sr-dot", "aria-hidden": "true" }), clock, h("span", { class: "spacer" }), pauseBtn, stopBtn),
      h("div", { class: "sr-stage" }, live, count),
      h("p", { class: "hint", text: "You can switch to another window to work; click the browser's “Stop sharing” or come back here and click Stop recording." }));
    const done = h("div", { class: "sr-done", hidden: true });
    el.append(h("div", { class: "sr" }, msg, setup, running, done));

    const opt = () => ({ sys: setup.querySelector("#sys").checked, mic: setup.querySelector("#mic").checked, count: setup.querySelector("#count").checked, q: setup.querySelector("#q").value, fps: +setup.querySelector("#fps").value, fmt: setup.querySelector("#fmt").value });
    const elapsed = () => acc + (rec && rec.state === "recording" ? performance.now() - t0 : 0);
    function drawRun() {
      const paused = rec && rec.state === "paused";
      pauseBtn.innerHTML = icon(paused ? "play" : "pause") + (paused ? "Resume" : "Pause");
      running.classList.toggle("paused", !!paused);
    }
    async function start() {
      msg.textContent = "";
      const o = opt();
      try {
        disp = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: o.fps, max: o.fps } }, audio: o.sys ? { suppressLocalAudioPlayback: false } : false,
          selfBrowserSurface: "exclude", systemAudio: o.sys ? "include" : "exclude", surfaceSwitching: "include"
        });
      } catch (e) {
        if (e && e.name === "NotAllowedError") msg.append(alertEl("info", "Not recording: you cancelled the screen selection (or the browser isn't allowed to record the screen). On macOS, go to System Settings → Privacy & Security → Screen Recording to allow the browser."));
        else msg.append(alertEl("err", "Couldn't record the screen: " + ((e && e.message) || e)));
        return;
      }
      if (o.mic) {
        try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
        catch (_) { msg.append(alertEl("warn", "Couldn't start the microphone, so the video won't have narration.")); }
      }
      const tracks = [...disp.getVideoTracks()];
      const auds = [disp, mic].filter((s) => s && s.getAudioTracks().length);
      if (auds.length === 1) tracks.push(auds[0].getAudioTracks()[0]);
      else if (auds.length > 1) {
        // trộn tiếng máy và micro thành một rãnh
        ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === "suspended") ac.resume().catch(() => {});
        const dest = ac.createMediaStreamDestination();
        auds.forEach((s) => ac.createMediaStreamSource(s).connect(dest));
        mixed = dest.stream; tracks.push(mixed.getAudioTracks()[0]);
      }
      if (o.sys && !disp.getAudioTracks().length) msg.append(alertEl("info", "No system/tab audio (“Share audio” wasn't turned on or the OS doesn't allow capturing it). The video is still recorded."));
      const stream = new MediaStream(tracks);
      mime = pickMime((m) => MediaRecorder.isTypeSupported(m), MIMES[o.fmt]) || pickMime((m) => MediaRecorder.isTypeSupported(m), [...MIMES.webm, ...MIMES.mp4]);
      try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: QUALITY[o.q], audioBitsPerSecond: 128000 }); }
      catch (_) { rec = new MediaRecorder(stream); }
      mime = rec.mimeType || mime;
      chunks = []; acc = 0;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = finish;
      disp.getVideoTracks()[0].addEventListener("ended", stop);
      live.srcObject = disp;
      setup.hidden = true; done.hidden = true; running.hidden = false;
      if (o.count) {
        count.hidden = false;
        for (const n of [3, 2, 1]) { count.textContent = n; await sleep(1000); if (!disp) return; }
        count.hidden = true;
      }
      rec.start(1000); t0 = performance.now();
      timer = setInterval(() => { clock.textContent = fmtTime(elapsed() / 1000, 0); }, 250);
      ctx.wakeLock(true);
      drawRun();
    }
    function togglePause() {
      if (!rec) return;
      if (rec.state === "recording") { rec.pause(); acc += performance.now() - t0; }
      else if (rec.state === "paused") { rec.resume(); t0 = performance.now(); }
      drawRun();
    }
    function release() {
      for (const s of [disp, mic, mixed]) if (s) ctx.stopStream(s);
      disp = mic = mixed = null;
      if (ac) { ac.close().catch(() => {}); ac = null; }
      live.srcObject = null;
      clearInterval(timer); timer = null;
      ctx.wakeLock(false);
    }
    function stop() {
      if (rec && rec.state !== "inactive") { if (rec.state === "recording") acc += performance.now() - t0; rec.stop(); }
      else { release(); rec = null; running.hidden = true; setup.hidden = false; count.hidden = true; }
    }
    async function finish() {
      const dur = elapsed() / 1000;
      release();
      rec = null;
      running.hidden = true;
      const raw = new Blob(chunks, { type: mime });
      if (!raw.size) { setup.hidden = false; msg.append(alertEl("warn", "Nothing was recorded. Please try again.")); return; }
      done.hidden = false; done.textContent = "";
      done.append(h("p", { class: "md-loading", html: "<span class=\"spinner sm\"></span> Finishing the video…" }));
      const ext = extForMime(mime, true);
      let blob = raw;
      // MediaRecorder ghi WebM không có thời lượng (không tua được) và MP4 dạng phân mảnh: chép lại sang vỏ file chuẩn
      try {
        const M = await mb();
        const res = await convert({ file: new File([raw], "screen-recording." + ext, { type: mime }), format: ext === "mp4" ? new M.Mp4OutputFormat({ fastStart: "in-memory" }) : new M.WebMOutputFormat(), mime: ext === "mp4" ? "video/mp4" : "video/webm", need: ["video"] });
        blob = res.blob;
      } catch (e) { console.warn("remux", e); }
      if (result) URL.revokeObjectURL(result.url);
      result = { blob, url: URL.createObjectURL(blob), name: stampName("screen-recording", new Date(), ext), saved: false, dur };
      showDone();
    }
    async function showDone() {
      const r = result;
      const reg = await registry();
      const go = (id) => { const t = reg.tools.find((x) => x.id === id); r.saved = true; sendTo(t, [new File([r.blob], r.name, { type: r.blob.type })]); };
      done.textContent = "";
      done.append(h("h2", { text: "Recording finished!" }),
        h("video", { class: "md-video", src: r.url, controls: true, playsinline: true }),
        h("p", { class: "md-meta" }, h("b", { text: r.name }), h("span", { text: `${fmtTime(r.dur, 0)} · ${fmtSize(r.blob.size)}` })),
        h("div", { class: "row" },
          h("button", { class: "btn big", type: "button", onclick: () => { save(r.blob, r.name); r.saved = true; } }, h("span", { html: icon("download"), style: { display: "contents" } }), "Download the video"),
          h("button", { class: "btn ghost", type: "button", onclick: () => go("trim-video") }, h("span", { html: icon("scissors"), style: { display: "contents" } }), "Trim video"),
          h("button", { class: "btn ghost", type: "button", onclick: () => go("compress-video") }, h("span", { html: icon("video"), style: { display: "contents" } }), "Compress video"),
          h("button", { class: "btn ghost", type: "button", onclick: () => go("video-to-gif") }, h("span", { html: icon("clapperboard"), style: { display: "contents" } }), "Make a GIF")),
        h("div", { class: "row", style: { marginTop: "6px" } },
          h("button", { class: "btn ghost", type: "button", onclick: () => { done.hidden = true; setup.hidden = false; } }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Record a new video")));
      if (!r.saved) toast("Remember to download the video before closing the page.");
    }
    window.addEventListener("beforeunload", (e) => { if (rec || (result && !result.saved)) { e.preventDefault(); e.returnValue = ""; } });
    window.addEventListener("pagehide", release);
    drawRun();
  }
});

const css = document.createElement("style");
css.textContent = `.sr{display:grid;gap:16px}.sr-setup{display:grid;gap:16px}.sr-setup>.btn{justify-self:start;max-width:100%;white-space:normal}
.sr-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.sr-col{display:grid;gap:14px;align-content:start;min-width:0}.sr-col select{width:100%}
@media (max-width:640px){.sr-grid{grid-template-columns:minmax(0,1fr)}}
.sr-run{display:grid;gap:12px}.sr-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
.sr-dot{width:14px;height:14px;border-radius:50%;background:#e5484d;animation:sr-blink 1.2s infinite}
.sr-run.paused .sr-dot{animation:none;background:var(--muted)}
@keyframes sr-blink{50%{opacity:.25}}@media (prefers-reduced-motion:reduce){.sr-dot{animation:none}}
.sr-clock{font:700 22px var(--mono);font-variant-numeric:tabular-nums}
.sr-stage{position:relative}.sr-live{width:100%;max-height:50vh;background:#000;border-radius:14px;display:block}
.sr-count{position:absolute;inset:0;display:grid;place-items:center;font:800 120px var(--font);color:#fff;background:rgba(0,0,0,.45);border-radius:14px}
.sr-done{display:grid;gap:12px}.sr-done h2{margin:0}`;
document.head.append(css);
