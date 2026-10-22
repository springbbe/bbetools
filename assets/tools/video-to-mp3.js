/* Video sang MP3: tách tiếng của video thành MP3 (chọn bitrate), M4A (chép nguyên tiếng AAC gốc khi có thể, rất nhanh)
   hoặc WAV; tuỳ chọn chỉ lấy một đoạn. Đọc video theo luồng nên file lớn vẫn được. */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { mb, probe, videoInfo, videoThumb, AUDIO_OUT, bitrateSelect, convert, ensureAudioEncoder, progressReporter, resultPreview, webCodecsMissing, codecName } from "../media.js";
import { parseTime, fmtTime, fmtDuration, clampRange } from "../lib/media.js";

fileTool({
  accept: ["video"], multiple: false, noun: "video",
  action: "Tách lấy âm thanh",
  sample: () => sampleFiles("video-mau.mp4"),
  warm: () => mb(),
  async load(it) {
    const miss = webCodecsMissing(false);
    if (miss) throw Object.assign(new Error(miss), { userMsg: miss });
    const p = await probe(it.file);
    it.info = videoInfo(p) + (p.audio ? ` · tiếng ${codecName(p.audio.codec)}` : "");
    try { const c = await videoThumb(p, 112); if (c) it.thumb = c; } catch (_) {}
    if (!p.audio) throw Object.assign(new Error("Video này không có tiếng."), { keep: true });
    it.p = p;
  },
  options(el) {
    const part = h("div", { class: "md-2col", hidden: true },
      h("label", { class: "field" }, h("span", { text: "Từ (phút:giây)" }), h("input", { id: "from", inputmode: "decimal", placeholder: "0:00", autocomplete: "off" })),
      h("label", { class: "field" }, h("span", { text: "Đến" }), h("input", { id: "to", inputmode: "decimal", placeholder: "hết video", autocomplete: "off" })));
    const note = h("p", { class: "hint", "aria-live": "polite" });
    el.append(seg("fmt", [["mp3", "MP3"], ["m4a", "M4A"], ["wav", "WAV"]], "mp3", "Định dạng"), note, bitrateSelect("br", 192),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "part" }), h("span", null, "Chỉ lấy một đoạn", h("small", { text: "Bỏ trống ô “Đến” để lấy tới hết video." }))), part);
    const get = () => ({ fmt: radioVal(el, "fmt"), br: +el.querySelector("#br").value, part: el.querySelector("#part").checked, from: el.querySelector("#from").value, to: el.querySelector("#to").value });
    const upd = () => {
      const o = get();
      part.hidden = !o.part;
      el.querySelector("#br").closest(".field").hidden = o.fmt !== "mp3";
      note.textContent = o.fmt === "m4a" ? "Nếu tiếng trong video là AAC (đa số video MP4, iPhone, Android), tiếng được chép nguyên: rất nhanh và không giảm chất lượng." : o.fmt === "wav" ? "WAV không nén: chất lượng gốc nhưng file lớn (khoảng 10 MB mỗi phút)." : "MP3 mở được trên mọi máy, mọi ứng dụng nghe nhạc.";
    };
    el.addEventListener("change", upd); el.addEventListener("input", upd); upd();
    return get;
  },
  ready(items, o) {
    const it = items.find((i) => i.p);
    if (!it) return items.some((i) => i.error) ? "Video này không có tiếng để tách." : "Đang đọc video…";
    if (o.part) {
      const a = o.from.trim() ? parseTime(o.from) : 0, b = o.to.trim() ? parseTime(o.to) : it.p.duration;
      if (Number.isNaN(a) || Number.isNaN(b)) return "Thời gian chưa đúng, ví dụ 1:05 hoặc 65.";
      if (b - a < 0.2) return "Đoạn cần lấy quá ngắn.";
    }
    return true;
  },
  async run(items, o, ctx) {
    const M = await mb(), it = items.find((i) => i.p), p = it.p;
    const F = AUDIO_OUT[o.fmt];
    ctx.status("Đang chuẩn bị…"); ctx.progress(-1);
    await ensureAudioEncoder(F.codec);
    let trim, range = null;
    if (o.part) { range = clampRange(o.from.trim() ? parseTime(o.from) : 0, o.to.trim() ? parseTime(o.to) : p.duration, p.duration, 0.2); trim = range; }
    const copyAac = o.fmt === "m4a" && p.audio.codec === "aac";
    const res = await convert({
      input: p.input, format: F.fmt(M), mime: F.mime, need: ["audio"], trim, signal: ctx.signal, onProgress: progressReporter(ctx, "Đang tách âm thanh…"),
      video: { discard: true }, tags: o.fmt === "wav" ? {} : (t) => ({ ...t, title: t.title || baseName(it.name) }),
      audio: copyAac ? {} : { codec: F.codec, forceTranscode: true, ...(o.fmt === "mp3" ? { quality: new M.Quality({ bitrate: o.br * 1000 }) } : {}), ...(o.fmt === "m4a" ? { quality: new M.Quality({ bitrate: 192000 }) } : {}) }
    });
    const note = [o.fmt === "mp3" ? `MP3 ${o.br} kbps` : copyAac ? "M4A, giữ nguyên tiếng gốc" : F.label, range ? `đoạn ${fmtTime(range.start)} → ${fmtTime(range.end)} (${fmtDuration(range.end - range.start)})` : fmtDuration(p.duration), ...res.warnings].join(" · ");
    return [{ blob: res.blob, name: baseName(it.name) + "." + F.ext, note, extra: resultPreview(res.blob) }];
  },
  doneTitle: (outs) => `Đã tách xong ${outs[0].name.split(".").pop().toUpperCase()}!`
});
