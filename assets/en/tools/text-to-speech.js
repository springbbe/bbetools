/* Tự sinh bởi scripts/build.js từ assets/tools/text-to-speech.js và i18n/en/js/ — đừng sửa tay. */
/* Đọc văn bản thành giọng nói bằng giọng có sẵn của hệ điều hành/trình duyệt (speechSynthesis).
   Văn bản được chia thành từng câu ngắn (Chrome tự dừng khi một lần đọc quá dài) và câu đang đọc được tô sáng.
   Giọng có sẵn trên máy được ưu tiên; giọng "trực tuyến" được ghi rõ vì văn bản sẽ do máy chủ của nhà cung cấp xử lý. */
import { h, icon, fmtNum, LANG } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { alertEl } from "../media.js";
import { splitSpeech, rankVoices, isLang, speakSeconds } from "../lib/tts.js";
import { fmtDuration } from "../lib/media.js";

/** Ngôn ngữ ưu tiên của giọng đọc: theo ngôn ngữ trang */
const VLANG = LANG;
const SAMPLE = "Hello! This is the BbeTools text reader. You can paste an article, a document or a message into this box, choose a voice and a speed, then click Read. The sentence being read is highlighted so it's easy to follow.\n\nTip: choose a voice installed on your device so the text isn't sent anywhere.";

function help() {
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return "Android: Settings → System → Languages & input → Text-to-speech output → choose Google's engine and download the voice data you need, then reload the page.";
  if (/iPhone|iPad/.test(ua)) return "iPhone/iPad: Settings → Accessibility → Spoken Content → Voices → choose a language → download a voice, then reload the page.";
  if (/Mac/.test(ua)) return "macOS: System Settings → Accessibility → Spoken Content → System voice → Manage Voices → pick a voice to download, then restart the browser.";
  if (/Windows/.test(ua)) return "Windows: Settings → Time & language → Speech → Add voices → choose a language, then restart the browser. Edge also has natural (online) voices built in.";
  return "Install a voice for this language in your operating system's speech settings, then reload the page.";
}

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { el.append(alertEl("err", "This browser has no text-to-speech. Use a recent Chrome, Edge, Safari or Firefox.")); return; }
    let voices = [], chunks = [], idx = 0, token = 0, state = "idle"; // idle | speaking | paused
    const ta = h("textarea", { class: "textarea tts-text", id: "tts-text", rows: 10, placeholder: "Type or paste the text to read…", "aria-label": "Text to read", spellcheck: false });
    ta.value = S.get("text", "");
    const view = h("div", { class: "tts-view", hidden: true, "aria-hidden": "true" });
    const stats = h("span", { class: "hint", "aria-live": "polite" });
    const voiceSel = h("select", { class: "select", id: "tts-voice", "aria-label": "Voice" });
    const voiceNote = h("div");
    const slider = (id, label, min, max, step, def, fmt) => {
      const inp = h("input", { type: "range", id, min, max, step, value: S.get(id, def), "aria-label": label });
      const out = h("output", { text: fmt(+inp.value) });
      inp.addEventListener("input", () => { out.textContent = fmt(+inp.value); S.set(id, +inp.value); updStats(); });
      return [h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: label }), h("div", { class: "range-row" }, inp, out)), inp];
    };
    const pct = (v) => fmtNum(v, 2).replace(/^1$/, "1") + "×";
    const [rateBox, rate] = slider("rate", "Speed", 0.5, 2, 0.1, 1, pct);
    const [pitchBox, pitch] = slider("pitch", "Pitch", 0.5, 1.5, 0.1, 1, (v) => (v === 1 ? "normal" : v < 1 ? "lower" : "higher"));
    const [volBox, vol] = slider("vol", "Volume", 0.1, 1, 0.1, 1, (v) => Math.round(v * 100) + "%");
    const playBtn = h("button", { class: "btn big", type: "button", onclick: () => (state === "speaking" ? pause() : state === "paused" ? speakFrom(idx) : speakFrom(startIndex())) });
    const stopBtn = h("button", { class: "btn ghost", type: "button", onclick: stop }, h("span", { html: icon("square"), style: { display: "contents" } }), "Stop");
    el.append(h("div", { class: "tts" },
      h("div", { class: "tts-main" },
        h("div", { class: "tts-box" }, ta, view),
        h("div", { class: "row", style: { justifyContent: "space-between" } }, stats,
          h("div", { class: "row" },
            h("button", { class: "btn ghost sm", type: "button", onclick: () => { stop(); ta.value = SAMPLE; save(); } }, h("span", { html: icon("sparkles"), style: { display: "contents" } }), "Sample text"),
            h("button", { class: "btn ghost sm", type: "button", onclick: () => { stop(); ta.value = ""; save(); ta.focus(); } }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Clear"))),
        h("div", { class: "row tts-ctl" }, playBtn, stopBtn),
        h("p", { class: "hint", text: "Place the cursor in the middle of the text and click Read to start from that sentence. Shortcut: Ctrl/⌘ + Enter to read or pause." })),
      h("aside", { class: "tts-side" },
        h("label", { class: "field" }, h("span", { text: "Voice" }), voiceSel), voiceNote, rateBox, pitchBox, volBox)));

    function save() { S.set("text", ta.value); updStats(); draw(); }
    function updStats() {
      const words = (ta.value.match(/[\p{L}\p{N}]+/gu) || []).length;
      stats.textContent = words ? `${fmtNum(words)} words · about ${fmtDuration(Math.max(1, speakSeconds(ta.value, +rate.value)))} to read` : "";
    }
    ta.addEventListener("input", save);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); playBtn.click(); } });
    el.addEventListener("keydown", (e) => { if (e.target !== ta && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); playBtn.click(); } });

    function loadVoices() {
      voices = rankVoices(synth.getVoices(), VLANG);
      // chỉ giữ giọng người dùng đã tự chọn; giọng tự chọn sẵn thì chọn lại mỗi lần danh sách đổi
      // (Chrome nạp danh sách làm nhiều đợt, đợt đầu có thể chỉ có giọng trực tuyến)
      const cur = S.get("voice", "");
      voiceSel.textContent = "";
      const vi = voices.filter((v) => isLang(v, VLANG)), other = voices.filter((v) => !isLang(v, VLANG));
      const opt = (v) => h("option", { value: v.voiceURI, text: `${v.name}${v.localService ? "" : " · online"}` });
      if (vi.length) voiceSel.append(h("optgroup", { label: "English" }, vi.map(opt)));
      if (other.length) voiceSel.append(h("optgroup", { label: "Other languages" }, other.map(opt)));
      if (!voices.length) voiceSel.append(h("option", { value: "", text: "Device default voice" }));
      if (cur && voices.some((v) => v.voiceURI === cur)) voiceSel.value = cur;
      else if (voices.length) voiceSel.value = voices[0].voiceURI;
      noteVoice();
    }
    function voice() { return voices.find((v) => v.voiceURI === voiceSel.value) || null; }
    function noteVoice() {
      voiceNote.textContent = "";
      const v = voice();
      if (!voices.some((x) => isLang(x, VLANG))) voiceNote.append(alertEl("warn", "This device has no English voice, so English text may be read incorrectly. " + help()));
      else if (v && !v.localService) voiceNote.append(alertEl("info", "Online voice: the text is sent to the voice provider's server (Google, Microsoft…) to be read. For privacy, choose a voice not marked “online”."));
    }
    voiceSel.addEventListener("change", () => { S.set("voice", voiceSel.value); noteVoice(); if (state === "speaking") speakFrom(idx); });
    loadVoices();
    if ("onvoiceschanged" in synth) synth.addEventListener("voiceschanged", loadVoices);
    setTimeout(loadVoices, 600);

    // đọc từ câu chứa con trỏ (nếu con trỏ không ở đầu)
    function startIndex() {
      chunks = splitSpeech(ta.value);
      const pos = ta.selectionStart || 0;
      if (!pos || pos >= ta.value.length) return 0;
      const i = chunks.findIndex((c) => c.end > pos);
      return Math.max(0, i);
    }
    function mark(i) {
      view.textContent = "";
      const t = ta.value;
      let last = 0;
      chunks.forEach((c, k) => {
        if (k !== i) return;
        view.append(t.slice(last, c.start), h("mark", { text: t.slice(c.start, c.end) }));
        last = c.end;
      });
      view.append(t.slice(last));
      const m = view.querySelector("mark");
      if (m) m.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function speakFrom(i) {
      if (!chunks.length || state === "idle") chunks = splitSpeech(ta.value);
      if (!chunks.length) { ta.focus(); return; }
      const my = ++token;
      synth.cancel();
      idx = Math.min(i, chunks.length - 1);
      state = "speaking"; draw();
      const v = voice();
      const next = () => {
        if (my !== token) return;
        if (idx >= chunks.length) { stop(); return; }
        const u = new SpeechSynthesisUtterance(chunks[idx].text);
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
        u.rate = +rate.value; u.pitch = +pitch.value; u.volume = +vol.value;
        u.onend = () => { if (my !== token) return; idx++; next(); };
        u.onerror = (e) => { if (my !== token || e.error === "interrupted" || e.error === "canceled") return; console.warn("tts", e.error); idx++; next(); };
        mark(idx);
        synth.speak(u);
      };
      // Chrome cần một nhịp sau cancel() mới nhận câu mới
      setTimeout(next, 60);
    }
    // tạm dừng = dừng ở câu hiện tại rồi đọc lại câu đó khi tiếp tục (pause() của trình duyệt không chạy ổn trên Android)
    function pause() { token++; synth.cancel(); state = "paused"; draw(); }
    function stop() { token++; synth.cancel(); state = "idle"; idx = 0; draw(); }
    function draw() {
      const busy = state !== "idle";
      ta.hidden = busy; view.hidden = !busy;
      if (!busy) view.textContent = "";
      playBtn.innerHTML = icon(state === "speaking" ? "pause" : "play") + (state === "speaking" ? "Pause" : state === "paused" ? "Resume" : "Read");
      playBtn.disabled = !ta.value.trim();
      stopBtn.hidden = !busy;
    }
    window.addEventListener("pagehide", () => synth.cancel());
    updStats(); draw();
  }
});

const css = document.createElement("style");
css.textContent = `.tts{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:start}
@media (max-width:820px){.tts{grid-template-columns:1fr}}
.tts-main,.tts-side{display:grid;gap:12px}.tts-box{position:relative}
.tts-text{min-height:260px;font-size:17px;line-height:1.65;width:100%}
.tts-view{min-height:260px;max-height:60vh;overflow:auto;padding:12px 14px;border:1px solid var(--brand);border-radius:12px;background:var(--surface);font-size:17px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.tts-view mark{background:color-mix(in srgb,var(--brand) 22%,transparent);color:inherit;border-radius:4px;padding:1px 0}
.tts-ctl{gap:10px}`;
document.head.append(css);
