/* Tự sinh bởi scripts/build.js từ assets/tools/video-to-mp3.js và i18n/en/js/ — đừng sửa tay. */
/* Video sang MP3: tách tiếng của video thành MP3 (chọn bitrate), M4A (chép nguyên tiếng AAC gốc khi có thể, rất nhanh)
   hoặc WAV; tuỳ chọn chỉ lấy một đoạn. Đọc video theo luồng nên file lớn vẫn được. */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { mb, probe, videoInfo, videoThumb, AUDIO_OUT, bitrateSelect, convert, ensureAudioEncoder, progressReporter, resultPreview, webCodecsMissing, codecName } from "../media.js";
import { parseTime, fmtTime, fmtDuration, clampRange } from "../lib/media.js";

fileTool({
  accept: ["video"], multiple: false, noun: "video",
  action: "Extract audio",
  sample: () => sampleFiles("video-mau.mp4"),
  warm: () => mb(),
  async load(it) {
    const miss = webCodecsMissing(false);
    if (miss) throw Object.assign(new Error(miss), { userMsg: miss });
    const p = await probe(it.file);
    it.info = videoInfo(p) + (p.audio ? ` · audio ${codecName(p.audio.codec)}` : "");
    try { const c = await videoThumb(p, 112); if (c) it.thumb = c; } catch (_) {}
    if (!p.audio) throw Object.assign(new Error("This video has no audio."), { keep: true });
    it.p = p;
  },
  options(el) {
    const part = h("div", { class: "md-2col", hidden: true },
      h("label", { class: "field" }, h("span", { text: "From (min:sec)" }), h("input", { id: "from", inputmode: "decimal", placeholder: "0:00", autocomplete: "off" })),
      h("label", { class: "field" }, h("span", { text: "To" }), h("input", { id: "to", inputmode: "decimal", placeholder: "end of video", autocomplete: "off" })));
    const note = h("p", { class: "hint", "aria-live": "polite" });
    el.append(seg("fmt", [["mp3", "MP3"], ["m4a", "M4A"], ["wav", "WAV"]], "mp3", "Format"), note, bitrateSelect("br", 192),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "part" }), h("span", null, "Only extract a segment", h("small", { text: "Leave “To” empty to go to the end of the video." }))), part);
    const get = () => ({ fmt: radioVal(el, "fmt"), br: +el.querySelector("#br").value, part: el.querySelector("#part").checked, from: el.querySelector("#from").value, to: el.querySelector("#to").value });
    const upd = () => {
      const o = get();
      part.hidden = !o.part;
      el.querySelector("#br").closest(".field").hidden = o.fmt !== "mp3";
      note.textContent = o.fmt === "m4a" ? "If the video's audio is AAC (most MP4, iPhone and Android videos), it's copied as is: very fast with no quality loss." : o.fmt === "wav" ? "WAV is uncompressed: original quality but large files (about 10 MB per minute)." : "MP3 plays on every device and music app.";
    };
    el.addEventListener("change", upd); el.addEventListener("input", upd); upd();
    return get;
  },
  ready(items, o) {
    const it = items.find((i) => i.p);
    if (!it) return items.some((i) => i.error) ? "This video has no audio to extract." : "Reading video…";
    if (o.part) {
      const a = o.from.trim() ? parseTime(o.from) : 0, b = o.to.trim() ? parseTime(o.to) : it.p.duration;
      if (Number.isNaN(a) || Number.isNaN(b)) return "Invalid time, e.g. 1:05 or 65.";
      if (b - a < 0.2) return "The segment is too short.";
    }
    return true;
  },
  async run(items, o, ctx) {
    const M = await mb(), it = items.find((i) => i.p), p = it.p;
    const F = AUDIO_OUT[o.fmt];
    ctx.status("Preparing…"); ctx.progress(-1);
    await ensureAudioEncoder(F.codec);
    let trim, range = null;
    if (o.part) { range = clampRange(o.from.trim() ? parseTime(o.from) : 0, o.to.trim() ? parseTime(o.to) : p.duration, p.duration, 0.2); trim = range; }
    const copyAac = o.fmt === "m4a" && p.audio.codec === "aac";
    const res = await convert({
      input: p.input, format: F.fmt(M), mime: F.mime, need: ["audio"], trim, signal: ctx.signal, onProgress: progressReporter(ctx, "Extracting audio…"),
      video: { discard: true }, tags: o.fmt === "wav" ? {} : (t) => ({ ...t, title: t.title || baseName(it.name) }),
      audio: copyAac ? {} : { codec: F.codec, forceTranscode: true, ...(o.fmt === "mp3" ? { quality: new M.Quality({ bitrate: o.br * 1000 }) } : {}), ...(o.fmt === "m4a" ? { quality: new M.Quality({ bitrate: 192000 }) } : {}) }
    });
    const note = [o.fmt === "mp3" ? `MP3 ${o.br} kbps` : copyAac ? "M4A, original audio kept" : F.label, range ? `segment ${fmtTime(range.start)} → ${fmtTime(range.end)} (${fmtDuration(range.end - range.start)})` : fmtDuration(p.duration), ...res.warnings].join(" · ");
    return [{ blob: res.blob, name: baseName(it.name) + "." + F.ext, note, extra: resultPreview(res.blob) }];
  },
  doneTitle: (outs) => `Extracted ${outs[0].name.split(".").pop().toUpperCase()}!`
});
