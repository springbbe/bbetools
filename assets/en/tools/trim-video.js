/* Tự sinh bởi scripts/build.js từ assets/tools/trim-video.js và i18n/en/js/ — đừng sửa tay. */
/* Cắt video: chọn đoạn trên dải ảnh thu nhỏ (kéo tay nắm, phím mũi tên, nhập thời gian), xem thử, cắt.
   - Nhanh: chép nguyên dữ liệu (không mã hoá lại, không giảm chất lượng, xong trong vài giây). Video chỉ có thể bắt đầu
     giải mã từ khung hình khoá, nên phần trước điểm cắt tới khung khoá gần nhất vẫn nằm trong file nhưng được đánh dấu
     ẩn (edit list): trình phát hiện đúng từ điểm đã chọn.
   - Chính xác: mã hoá lại đoạn đã chọn (chậm hơn, chất lượng gần như gốc). */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { mb, probeFor, videoInfo, videoOut, player, rangeEditor, thumbStrip, convert, ensureAudioEncoder, progressReporter, resultPreview, fileHeader, areaError, loadingEl, durationOf } from "../media.js";
import { fmtTime, fmtDuration, suggestBitrate } from "../lib/media.js";

let S = null, area = null;
const tname = (t) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, "0")}s`;

fileTool({
  accept: ["video"], multiple: false, noun: "video",
  action: "Trim video",
  sample: () => sampleFiles("video-mau.mp4"),
  warm: () => mb(),
  custom: { mount(ctx) { area = h("div", { class: "md-work" }); ctx.workMain.append(area); } },
  options(el) {
    const note = h("p", { class: "hint", "aria-live": "polite" });
    el.append(seg("mode", [["fast", "Fast, keeps quality"], ["exact", "Frame-accurate"]], "fast", "Trim method"), note,
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "mute" }), h("span", null, "Remove audio", h("small", { text: "The output video has no sound." }))));
    const get = () => ({ mode: radioVal(el, "mode"), mute: el.querySelector("#mute").checked });
    const upd = () => {
      note.textContent = get().mode === "fast"
        ? "Copies video and audio as is, with no quality loss, done in seconds. Fits most needs."
        : "Re-encodes the selection so it starts exactly at the chosen frame in every player. Slower, near-original quality.";
    };
    el.addEventListener("change", upd); upd();
    return get;
  },
  async onAdd(items, ctx) {
    if (S) { S.pl.destroy(); S.rg.destroy(); S = null; }
    area.textContent = ""; area.append(loadingEl("Reading video…"));
    const it = items[0];
    try {
      const p = await probeFor(it.file, "video");
      const pl = player(it.file, true);
      const D = p.duration;
      const rg = rangeEditor({ duration: D, media: pl.el, start: 0, end: D, aspect: p.video.width / p.video.height, onChange: () => ctx.refresh() });
      area.textContent = "";
      area.append(fileHeader(it.name, videoInfo(p), ctx), pl.el, rg.el,
        h("p", { class: "hint", html: "Drag the two handles or enter times (min:sec, e.g. <b>1:05.5</b>). Click the filmstrip to seek there; use the pin buttons to set the start/end at the current position." }));
      rg.setThumbs(thumbStrip(p));
      S = { it, p, pl, rg };
      ctx.refresh();
    } catch (e) { areaError(area, e); S = null; ctx.refresh(); }
  },
  ready() {
    if (!S) return "Reading video…";
    const { start, end } = S.rg.get();
    if (end - start < 0.1) return "The selection is too short.";
    if (start < 0.01 && end > S.p.duration - 0.01) return "Drag the handles or enter times to choose the part to keep.";
    return true;
  },
  async run(items, o, ctx) {
    const M = await mb(), p = S.p;
    const { start, end } = S.rg.get();
    const out = videoOut(p, M);
    ctx.status("Preparing…"); ctx.progress(-1);
    let res;
    if (o.mode === "fast") {
      res = await convert({ input: p.input, format: out.fmt, mime: out.mime, trim: { start, end }, need: ["video"], signal: ctx.signal, onProgress: progressReporter(ctx, "Trimming…"), audio: o.mute ? { discard: true } : {} });
    } else {
      await ensureAudioEncoder("aac");
      const br = Math.max(p.video.bitrate * 1.15 || 0, suggestBitrate(p.video.width, p.video.height, p.video.fps || 30, "high"));
      res = await convert({
        input: p.input, format: out.fmt, mime: out.mime, trim: { start, end }, copy: false, need: ["video"], signal: ctx.signal, onProgress: progressReporter(ctx, "Trimming and re-encoding…"),
        video: { quality: new M.Quality({ bitrate: Math.round(br) }), hardwareAcceleration: "prefer-hardware" },
        audio: o.mute ? { discard: true } : { quality: new M.Quality({ bitrate: 160000 }) }
      });
    }
    const real = await durationOf(res.blob);
    const note = [`Segment ${fmtTime(start)} → ${fmtTime(end)} (${fmtDuration(real || end - start)})`, o.mode === "fast" ? "original quality kept" : "frame-accurate re-encode", o.mute ? "no audio" : "", ...res.warnings].filter(Boolean).join(" · ");
    return [{ blob: res.blob, name: `${baseName(S.it.name)}-${tname(start)}-${tname(end)}.${out.ext}`, note, extra: resultPreview(res.blob, true) }];
  },
  doneTitle: () => "Video trimmed!"
});
