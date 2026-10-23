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
const SAMPLE = "Xin chào! Đây là công cụ đọc văn bản của BbeTools. Bạn có thể dán bài báo, tài liệu hay tin nhắn vào ô này, chọn giọng đọc và tốc độ, rồi bấm Đọc. Câu đang đọc sẽ được tô sáng để bạn dễ theo dõi.\n\nMẹo nhỏ: chọn giọng tiếng Việt có sẵn trên máy để văn bản không phải gửi đi đâu cả.";

function help() {
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return "Android: Cài đặt → Hệ thống → Ngôn ngữ và phương thức nhập → Chuyển văn bản thành lời nói → chọn công cụ của Google và tải dữ liệu giọng Tiếng Việt, rồi tải lại trang.";
  if (/iPhone|iPad/.test(ua)) return "iPhone/iPad: Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Việt → tải giọng Linh, rồi tải lại trang.";
  if (/Mac/.test(ua)) return "macOS: Cài đặt hệ thống → Trợ năng → Nội dung được đọc → Giọng hệ thống → Quản lý giọng nói → chọn Tiếng Việt (Linh) để tải, rồi khởi động lại trình duyệt.";
  if (/Windows/.test(ua)) return "Windows: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng nói → Tiếng Việt, rồi khởi động lại trình duyệt. Trình duyệt Edge có sẵn giọng tiếng Việt tự nhiên (trực tuyến).";
  return "Hãy cài giọng đọc tiếng Việt trong phần cài đặt giọng nói của hệ điều hành, rồi tải lại trang.";
}

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { el.append(alertEl("err", "Trình duyệt này không có chức năng đọc văn bản. Hãy dùng Chrome, Edge, Safari hoặc Firefox bản mới.")); return; }
    let voices = [], chunks = [], idx = 0, token = 0, state = "idle"; // idle | speaking | paused
    const ta = h("textarea", { class: "textarea tts-text", id: "tts-text", rows: 10, placeholder: "Gõ hoặc dán văn bản cần đọc…", "aria-label": "Văn bản cần đọc", spellcheck: false });
    ta.value = S.get("text", "");
    const view = h("div", { class: "tts-view", hidden: true, "aria-hidden": "true" });
    const stats = h("span", { class: "hint", "aria-live": "polite" });
    const voiceSel = h("select", { class: "select", id: "tts-voice", "aria-label": "Giọng đọc" });
    const voiceNote = h("div");
    const slider = (id, label, min, max, step, def, fmt) => {
      const inp = h("input", { type: "range", id, min, max, step, value: S.get(id, def), "aria-label": label });
      const out = h("output", { text: fmt(+inp.value) });
      inp.addEventListener("input", () => { out.textContent = fmt(+inp.value); S.set(id, +inp.value); updStats(); });
      return [h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: label }), h("div", { class: "range-row" }, inp, out)), inp];
    };
    const pct = (v) => fmtNum(v, 2).replace(/^1$/, "1") + "×";
    const [rateBox, rate] = slider("rate", "Tốc độ", 0.5, 2, 0.1, 1, pct);
    const [pitchBox, pitch] = slider("pitch", "Cao độ", 0.5, 1.5, 0.1, 1, (v) => (v === 1 ? "bình thường" : v < 1 ? "trầm hơn" : "cao hơn"));
    const [volBox, vol] = slider("vol", "Âm lượng", 0.1, 1, 0.1, 1, (v) => Math.round(v * 100) + "%");
    const playBtn = h("button", { class: "btn big", type: "button", onclick: () => (state === "speaking" ? pause() : state === "paused" ? speakFrom(idx) : speakFrom(startIndex())) });
    const stopBtn = h("button", { class: "btn ghost", type: "button", onclick: stop }, h("span", { html: icon("square"), style: { display: "contents" } }), "Dừng");
    el.append(h("div", { class: "tts" },
      h("div", { class: "tts-main" },
        h("div", { class: "tts-box" }, ta, view),
        h("div", { class: "row", style: { justifyContent: "space-between" } }, stats,
          h("div", { class: "row" },
            h("button", { class: "btn ghost sm", type: "button", onclick: () => { stop(); ta.value = SAMPLE; save(); } }, h("span", { html: icon("sparkles"), style: { display: "contents" } }), "Văn bản mẫu"),
            h("button", { class: "btn ghost sm", type: "button", onclick: () => { stop(); ta.value = ""; save(); ta.focus(); } }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Xoá"))),
        h("div", { class: "row tts-ctl" }, playBtn, stopBtn),
        h("p", { class: "hint", text: "Đặt con trỏ vào giữa văn bản rồi bấm Đọc để đọc từ câu đó. Phím tắt: Ctrl/⌘ + Enter để đọc hoặc tạm dừng." })),
      h("aside", { class: "tts-side" },
        h("label", { class: "field" }, h("span", { text: "Giọng đọc" }), voiceSel), voiceNote, rateBox, pitchBox, volBox)));

    function save() { S.set("text", ta.value); updStats(); draw(); }
    function updStats() {
      const words = (ta.value.match(/[\p{L}\p{N}]+/gu) || []).length;
      stats.textContent = words ? `${fmtNum(words)} từ · đọc khoảng ${fmtDuration(Math.max(1, speakSeconds(ta.value, +rate.value)))}` : "";
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
      const opt = (v) => h("option", { value: v.voiceURI, text: `${v.name}${v.localService ? "" : " · trực tuyến"}` });
      if (vi.length) voiceSel.append(h("optgroup", { label: "Tiếng Việt" }, vi.map(opt)));
      if (other.length) voiceSel.append(h("optgroup", { label: "Ngôn ngữ khác" }, other.map(opt)));
      if (!voices.length) voiceSel.append(h("option", { value: "", text: "Giọng mặc định của máy" }));
      if (cur && voices.some((v) => v.voiceURI === cur)) voiceSel.value = cur;
      else if (voices.length) voiceSel.value = voices[0].voiceURI;
      noteVoice();
    }
    function voice() { return voices.find((v) => v.voiceURI === voiceSel.value) || null; }
    function noteVoice() {
      voiceNote.textContent = "";
      const v = voice();
      if (!voices.some((x) => isLang(x, VLANG))) voiceNote.append(alertEl("warn", "Máy này chưa có giọng đọc tiếng Việt nên văn bản tiếng Việt sẽ bị đọc sai. " + help()));
      else if (v && !v.localService) voiceNote.append(alertEl("info", "Giọng trực tuyến: văn bản được gửi tới máy chủ của nhà cung cấp giọng (Google, Microsoft…) để đọc. Muốn giữ kín, hãy chọn giọng không ghi “trực tuyến”."));
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
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "vi-VN";
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
      playBtn.innerHTML = icon(state === "speaking" ? "pause" : "play") + (state === "speaking" ? "Tạm dừng" : state === "paused" ? "Đọc tiếp" : "Đọc");
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
