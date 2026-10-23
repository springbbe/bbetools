/* Tự sinh bởi scripts/build.js từ assets/tools/compress-video.js và i18n/en/js/ — đừng sửa tay. */
/* Nén video: mã hoá lại thành MP4 (H.264, hoặc H.265 nếu máy hỗ trợ) bằng bộ mã hoá phần cứng của máy qua WebCodecs.
   Hai cách: theo mức chất lượng, hoặc theo dung lượng mong muốn (tính bitrate từ thời lượng). Có thể giảm độ phân giải,
   số khung hình/giây, giảm hoặc bỏ tiếng. Ước tính dung lượng trước khi nén. */
import { h, fmtSize, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal, deltaText } from "../frames/file.js";
import { mb, probe, videoInfo, videoThumb, convert, ensureAudioEncoder, progressReporter, resultPreview, webCodecsMissing, codecName, alertEl } from "../media.js";
import { suggestBitrate, videoBitrateForSize, fitShortSide, estimateBytes, fmtDuration } from "../lib/media.js";

const RES = [[0, "Keep as is"], [1080, "1080p (Full HD)"], [720, "720p (HD)"], [480, "480p"], [360, "360p (very light)"]];
const AUDIO = { keep: 128000, low: 64000, off: 0 };
let hevcOk = false;

// Kế hoạch nén từ thông tin video và tuỳ chọn → { w, h, fps, vbps, abps, bytes, low }
function plan(p, o) {
  const v = p.video, D = p.duration || 1;
  const fps = o.fps && v.fps > o.fps + 1 ? o.fps : v.fps || 30;
  const abps = p.audio ? AUDIO[o.audio] : 0;
  let short = o.res, vbps;
  const k = o.codec === "hevc" ? 0.7 : 1; // H.265 cần ít bit hơn khoảng 30% cho cùng chất lượng
  if (o.target === "size") {
    vbps = videoBitrateForSize(o.mb * 1e6, D, abps);
    if (!short) {
      // tự chọn độ phân giải lớn nhất mà bitrate vẫn đủ cho hình không bị vỡ
      const cands = [Math.min(v.width, v.height), 1080, 720, 480, 360].filter((s, i, a) => s <= a[0] && a.indexOf(s) === i);
      short = cands.find((s) => { const [w, hh] = fitShortSide(v.width, v.height, s); return suggestBitrate(w, hh, fps, "low") * k <= vbps; }) || 360;
    }
  } else if (!short) short = Math.min(Math.min(v.width, v.height), o.level === "low" ? 720 : 1080);
  const [w, hh] = fitShortSide(v.width, v.height, short);
  if (o.target !== "size") vbps = Math.round(suggestBitrate(w, hh, fps, o.level) * k);
  // không vượt bitrate gốc (nén mà to hơn thì vô nghĩa)
  if (v.bitrate) vbps = Math.min(vbps, Math.round(v.bitrate * (w * hh) / (v.width * v.height) * 0.9));
  const low = vbps < suggestBitrate(w, hh, fps, "low") * k * 0.5;
  return { w, h: hh, fps, vbps: Math.max(vbps, 50000), abps, bytes: estimateBytes(Math.max(vbps, 50000) + abps, D), low };
}

fileTool({
  accept: ["video"], multiple: false, noun: "video",
  action: "Compress video",
  sample: () => sampleFiles("video-mau.mp4"),
  warm: async () => { const M = await mb(); hevcOk = await M.canEncodeVideo("hevc", { width: 1280, height: 720 }).catch(() => false); const r = document.getElementById("codec-row"); if (r) r.hidden = !hevcOk; },
  async load(it) {
    const miss = webCodecsMissing(true);
    if (miss) throw Object.assign(new Error(miss), { userMsg: miss });
    const p = await probe(it.file);
    if (!p.video) throw Object.assign(new Error("x"), { userMsg: `${it.name} has no video.` });
    if (!p.video.canDecode) throw Object.assign(new Error("x"), { userMsg: `This browser can't decode ${codecName(p.video.codec)} video. Try a recent Chrome or Edge on a computer.` });
    it.p = p;
    it.info = videoInfo(p) + (p.video.bitrate ? ` · ${(p.video.bitrate / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })} Mbps` : "");
    try { const c = await videoThumb(p, 112); if (c) it.thumb = c; } catch (_) {}
  },
  options(el) {
    const mbIn = h("input", { type: "number", id: "mb", min: 1, step: 1, value: 25, inputmode: "numeric", class: "input" });
    const sizeBox = h("div", { class: "opt-group", hidden: true },
      h("label", { class: "field" }, h("span", { text: "Target size (MB)" }), mbIn),
      h("div", { class: "chips" }, [[25, "25 MB · Gmail attachment"], [50, "50 MB"], [100, "100 MB"]].map(([v, l]) => h("button", { class: "chip", type: "button", text: l, onclick: () => { mbIn.value = v; mbIn.dispatchEvent(new Event("input", { bubbles: true })); } }))));
    const levelBox = seg("level", [["high", "High"], ["medium", "Balanced"], ["low", "Smallest"]], "medium", "Quality");
    const sel = (id, label, choices, val) => h("label", { class: "field" }, h("span", { text: label }), h("select", { id }, choices.map(([v, l]) => h("option", { value: v, text: l, selected: v === val }))));
    const codecRow = h("div", { id: "codec-row", hidden: !hevcOk }, seg("codec", [["avc", "H.264 (plays everywhere)"], ["hevc", "H.265 (smaller)"]], "avc", "Codec"));
    el.append(seg("target", [["quality", "By quality"], ["size", "By size"]], "quality", "Compress by"), levelBox, sizeBox,
      sel("res", "Resolution", [[0, "Automatic (recommended)"], ...RES.slice(1)], 0),
      sel("fps", "Frame rate", [[0, "Keep as is"], [30, "30 (smooth, common)"], [24, "24 (lighter)"]], 0),
      sel("audio", "Audio", [["keep", "Keep (AAC 128 kbps)"], ["low", "Reduce (AAC 64 kbps)"], ["off", "Remove audio"]], "keep"),
      codecRow, h("div", { id: "est", class: "note", "aria-live": "polite" }));
    const get = () => ({ target: radioVal(el, "target"), level: radioVal(el, "level"), mb: Math.max(1, +mbIn.value || 1), res: +el.querySelector("#res").value, fps: +el.querySelector("#fps").value, audio: el.querySelector("#audio").value, codec: hevcOk ? radioVal(el, "codec") : "avc" });
    const upd = () => { const o = get(); levelBox.hidden = o.target !== "quality"; sizeBox.hidden = o.target !== "size"; };
    el.addEventListener("input", upd); el.addEventListener("change", upd); upd();
    return get;
  },
  onChange(ctx) {
    const est = document.getElementById("est"), it = ctx.items.find((i) => i.p);
    if (!est) return;
    if (!it) { est.textContent = ""; return; }
    const o = ctx.opts, pl = plan(it.p, o);
    est.textContent = "";
    est.append(h("b", { text: `Estimated about ${fmtSize(pl.bytes)}` }), ` (original ${fmtSize(it.size)}) · ${pl.w}×${pl.h} · ${Math.round(pl.fps)} fps · ${(pl.vbps / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })} Mbps`);
    if (pl.bytes >= it.size * 0.95) est.append(h("br"), h("span", { class: "bad", text: "The original video is already fairly light; choose a lower resolution or “Smallest” to make it smaller." }));
    else if (pl.low) est.append(h("br"), h("span", { class: "bad", text: "This size is very low for the video's length: the picture will be blurry and blocky. Choose a larger size." }));
  },
  ready(items, o) {
    if (!items.some((i) => i.p)) return items.some((i) => i.loading) ? "Reading video…" : "No readable video yet.";
    if (o.target === "size" && !(o.mb > 0)) return "Enter the target size.";
    return true;
  },
  async run(items, o, ctx) {
    const M = await mb(), it = items.find((i) => i.p), p = it.p, pl = plan(p, o);
    ctx.status("Preparing…"); ctx.progress(-1);
    if (pl.abps) await ensureAudioEncoder("aac");
    const go = (hw) => convert({
      input: p.input, format: new M.Mp4OutputFormat({ fastStart: "in-memory" }), mime: "video/mp4", need: ["video"], signal: ctx.signal,
      onProgress: progressReporter(ctx, "Compressing…"),
      video: { codec: o.codec, width: pl.w, height: pl.h, fit: "fill", ...(pl.fps < (p.video.fps || 30) - 1 ? { frameRate: pl.fps } : {}), quality: new M.Quality({ bitrate: pl.vbps }), hardwareAcceleration: hw, forceTranscode: true },
      audio: pl.abps ? { codec: "aac", quality: new M.Quality({ bitrate: pl.abps }), forceTranscode: true, ...(o.audio === "low" ? { numberOfChannels: 1 } : {}) } : { discard: true }
    });
    let res;
    try { res = await go("prefer-hardware"); }
    catch (e) { if (e && (e.cancelled || e.userMsg)) throw e; console.warn("hardware encode failed, retry", e); res = await go("no-preference"); }
    const bigger = res.blob.size >= it.size;
    const note = [deltaText(it.size, res.blob.size), `${pl.w}×${pl.h}`, o.codec === "hevc" ? "H.265" : "H.264", fmtDuration(p.duration), pl.abps ? "" : "no audio", ...res.warnings].filter(Boolean).join(" · ");
    return [{ blob: res.blob, name: `${baseName(it.name)}-compressed.mp4`, note, extra: h("div", null, bigger ? alertEl("warn", "The new file isn't smaller than the original: the original video is already well compressed. Try a lower resolution or “Smallest”.") : null, resultPreview(res.blob, true)) }];
  },
  doneTitle: (outs, items) => (outs[0].blob.size < items[0].size ? "Video compressed!" : "Compressed (but not smaller)")
});
