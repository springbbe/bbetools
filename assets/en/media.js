/* Tự sinh bởi scripts/build.js từ assets/media.js và i18n/en/js/ — đừng sửa tay. */
/* Dùng chung cho nhóm Âm thanh & video.
   - Mediabunny (WebCodecs): đọc thông tin, chuyển đổi/cắt/nén theo luồng, lấy khung hình. File không rời khỏi máy.
   - Giải mã âm thanh thành AudioBuffer (Web Audio) và mã hoá AudioBuffer ra MP3/M4A/WAV/OGG.
   - rangeEditor(): thanh chọn đoạn (kéo hai tay nắm, kéo cả đoạn, bàn phím, ô nhập thời gian), nền là dạng sóng hoặc dải ảnh. */
import { h, icon, lib, nextFrame } from "./core.js";
import { Cancelled } from "./frames/file.js";
import { fmtTime, parseTime, clampRange, applyFade, peaks as peaksOf } from "./lib/media.js";

export const mb = () => lib("mediabunny");
const userErr = (msg) => Object.assign(new Error(msg), { userMsg: msg });

export const CODEC_NAME = {
  avc: "H.264", hevc: "H.265 (HEVC)", vp8: "VP8", vp9: "VP9", av1: "AV1", prores: "ProRes",
  aac: "AAC", opus: "Opus", mp3: "MP3", vorbis: "Vorbis", flac: "FLAC", ac3: "AC-3 (Dolby)", eac3: "E-AC-3 (Dolby)", dts: "DTS", ulaw: "G.711", alaw: "G.711"
};
export const codecName = (c) => (c ? CODEC_NAME[c] || (/^pcm/.test(c) ? "PCM (uncompressed)" : c.toUpperCase()) : "unknown");

/** Trình duyệt có WebCodecs không (Chrome/Edge 94+, Safari 16.4+/26 với âm thanh, Firefox 130+) */
export function webCodecsMissing(needVideo) {
  if (typeof AudioEncoder === "undefined" || typeof AudioDecoder === "undefined") return "This browser doesn't support audio/video processing (WebCodecs) yet. Use a recent Chrome, Edge, Firefox or Safari.";
  if (needVideo && (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined")) return "This browser doesn't support video processing (WebCodecs) yet. Use a recent Chrome, Edge, Firefox or Safari.";
  return "";
}

/** Đăng ký bộ mã hoá MP3/AAC viết bằng WebAssembly khi trình duyệt không tự mã hoá được (MP3: mọi trình duyệt; AAC: Firefox, Linux) */
export async function ensureAudioEncoder(codec) {
  const M = await mb();
  if (codec !== "mp3" && codec !== "aac") return;
  if (await M.canEncodeAudio(codec)) return;
  if (codec === "mp3") (await lib("mp3enc")).registerMp3Encoder();
  else (await lib("aacenc")).registerAacEncoder();
}

/** Định dạng âm thanh xuất ra */
export const AUDIO_OUT = {
  mp3: { label: "MP3", ext: "mp3", mime: "audio/mpeg", codec: "mp3", note: "most common, plays everywhere", fmt: (M) => new M.Mp3OutputFormat() },
  m4a: { label: "M4A (AAC)", ext: "m4a", mime: "audio/mp4", codec: "aac", note: "small, great on iPhone and Mac", fmt: (M) => new M.Mp4OutputFormat({ fastStart: "in-memory" }) },
  m4r: { label: "M4R (iPhone ringtone)", ext: "m4r", mime: "audio/mp4", codec: "aac", note: "iPhone ringtone, up to 40 seconds", fmt: (M) => new M.Mp4OutputFormat({ fastStart: "in-memory" }) },
  wav: { label: "WAV", ext: "wav", mime: "audio/wav", codec: "pcm-s16", lossless: true, note: "uncompressed, original quality, large file", fmt: (M) => new M.WavOutputFormat() },
  ogg: { label: "OGG (Opus)", ext: "ogg", mime: "audio/ogg", codec: "opus", note: "very small at good quality", fmt: (M) => new M.OggOutputFormat() }
};
/** Vỏ file video ra giữ giống file gốc khi có thể: MOV → MOV, WebM → WebM, MKV → MKV, còn lại → MP4 */
export function videoOut(p, M) {
  const f = String(p.format || "").toLowerCase();
  if (/webm/.test(f)) return { fmt: new M.WebMOutputFormat(), ext: "webm", mime: "video/webm" };
  if (/matroska|mkv/.test(f)) return { fmt: new M.MkvOutputFormat(), ext: "mkv", mime: "video/x-matroska" };
  if (/quicktime|qtff|mov/.test(f)) return { fmt: new M.MovOutputFormat({ fastStart: "in-memory" }), ext: "mov", mime: "video/quicktime" };
  return { fmt: new M.Mp4OutputFormat({ fastStart: "in-memory" }), ext: "mp4", mime: "video/mp4" };
}
/** Định dạng gốc của file âm thanh (theo codec + vỏ file) → khoá trong AUDIO_OUT, hoặc "" */
export function audioKeyOf(p) {
  const c = p.audio && p.audio.codec, f = String(p.format || "").toLowerCase();
  if (c === "mp3") return "mp3";
  if (c === "aac" && /mp4|quicktime|mov/.test(f)) return "m4a";
  if (c === "opus" && /ogg/.test(f)) return "ogg";
  if (/^pcm/.test(c || "") && /wav/.test(f)) return "wav";
  return "";
}
/** Chọn bitrate (kbps) cho định dạng nén mất dữ liệu */
export function bitrateSelect(id, value = 192, choices = [[64, "64 kbps (voice)"], [96, "96 kbps"], [128, "128 kbps"], [192, "192 kbps (recommended)"], [256, "256 kbps"], [320, "320 kbps (highest)"]]) {
  return h("label", { class: "field" }, h("span", { text: "Quality (bitrate)" }),
    h("select", { id }, choices.map(([v, l]) => h("option", { value: v, text: l, selected: v === value }))));
}

/* ---------- đọc thông tin file ---------- */
export async function openInput(file) {
  const M = await mb();
  return new M.Input({ source: new M.BlobSource(file), formats: M.ALL_FORMATS });
}
const UNSUPPORTED_EXT = { avi: "AVI", wmv: "WMV", wma: "WMA", amr: "AMR", flv: "FLV", mpg: "MPEG", mpeg: "MPEG", rm: "RealMedia", rmvb: "RMVB", vob: "VOB" };
/** Thông tin file: { input, format, duration, tags, video?: {track, codec, width, height, rotation, fps, bitrate, canDecode}, audio?: {...} } */
export async function probe(file) {
  const input = await openInput(file);
  let format;
  try { format = await input.getFormat(); }
  catch (_) {
    const ext = (/\.([a-z0-9]+)$/i.exec(file.name || "") || [])[1];
    const name = ext && UNSUPPORTED_EXT[ext.toLowerCase()];
    throw userErr(name ? `The browser can't read ${name} yet. Use an MP4, MOV, WebM, MKV or MP3, M4A, WAV, OGG, FLAC file.` : `Couldn't read ${file.name}: the file is corrupted or isn't audio/video.`);
  }
  const [v, a] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]);
  const p = { input, format: format.name, duration: 0, tags: {} };
  try { p.duration = await input.computeDuration(); } catch (_) {}
  try { p.tags = await input.getMetadataTags(); } catch (_) {}
  if (v) {
    const [codec, width, height, rotation, canDecode] = await Promise.all([v.getCodec(), v.getDisplayWidth(), v.getDisplayHeight(), v.getRotation(), v.canDecode()]);
    p.video = { track: v, codec, width, height, rotation, canDecode, fps: 0, bitrate: 0 };
    try { const st = await v.computePacketStats(120); p.video.fps = st.averagePacketRate; p.video.bitrate = st.averageBitrate; } catch (_) {}
  }
  if (a) {
    const [codec, sampleRate, channels, canDecode] = await Promise.all([a.getCodec(), a.getSampleRate(), a.getNumberOfChannels(), a.canDecode()]);
    p.audio = { track: a, codec, sampleRate, channels, canDecode, bitrate: 0 };
    try { p.audio.bitrate = (await a.computePacketStats(200)).averageBitrate; } catch (_) {}
  }
  return p;
}
const khz = (sr) => (sr / 1000).toLocaleString("en-US") + " kHz";
const chName = (n) => (n === 1 ? "mono" : n === 2 ? "stereo" : n + " channels");
export const audioInfo = (p) => [fmtTime(p.duration, 0), p.audio ? codecName(p.audio.codec) : "", p.audio ? khz(p.audio.sampleRate) : "", p.audio ? chName(p.audio.channels) : ""].filter(Boolean).join(" · ");
export const videoInfo = (p) => [fmtTime(p.duration, 0), p.video ? `${p.video.width}×${p.video.height}` : "", p.video ? codecName(p.video.codec) : "", p.video && p.video.fps ? Math.round(p.video.fps) + " fps" : "", p.audio ? "" : "no audio"].filter(Boolean).join(" · ");

/** Ảnh thu nhỏ một khung hình (canvas) */
export async function videoThumb(p, size = 112, at) {
  const M = await mb();
  if (!p.video || !p.video.canDecode) return null;
  const k = size / Math.max(p.video.width, p.video.height);
  const sink = new M.CanvasSink(p.video.track, { width: Math.max(2, Math.round(p.video.width * k)), height: Math.max(2, Math.round(p.video.height * k)), fit: "fill", poolSize: 0 });
  const t = at ?? Math.min(1, (p.duration || 0) * 0.1);
  const r = (await sink.getCanvas(t)) || (await sink.getCanvas(0));
  return r ? r.canvas : null;
}

/* ---------- chuyển đổi ---------- */
const WHY = {
  undecodable_source_codec: (k, c) => `this browser can't decode ${k === "video" ? "video" : "audio"} in ${codecName(c)} format`,
  unknown_source_codec: (k) => `${k === "video" ? "video" : "audio"} uses an unusual codec`,
  no_encodable_target_codec: (k) => `this browser can't encode ${k === "video" ? "video" : "audio"} in the chosen format`,
  cannot_copy: (k) => `couldn't copy ${k === "video" ? "video" : "audio"} as is`
};
/**
 * Chuyển đổi một file. o: { file | input, format (OutputFormat), mime, video, audio, trim, copy, tags, need: ["video"|"audio"],
 *   onProgress(f, t), signal } → { blob, warnings: [chuỗi], conv }
 */
export async function convert(o) {
  const M = await mb();
  const input = o.input || (await openInput(o.file));
  const target = new M.BufferTarget();
  const output = new M.Output({ format: o.format, target });
  const conv = await M.Conversion.init({ input, output, video: o.video, audio: o.audio, trim: o.trim, copy: o.copy, tags: o.tags, showWarnings: false });
  const problems = [];
  for (const d of conv.discardedTracks) {
    if (d.reason === "discarded_by_user" || d.reason === "max_track_count_reached" || d.reason === "max_track_count_of_type_reached") continue;
    let c = null; try { c = await d.track.getCodec(); } catch (_) {}
    problems.push({ kind: d.track.type, text: (WHY[d.reason] || (() => d.reason))(d.track.type, c) });
  }
  const used = conv.utilizedTracks.map((t) => t.type);
  const missing = (o.need || []).filter((k) => !used.includes(k));
  if (!conv.isValid || missing.length) {
    const p = problems.find((x) => missing.includes(x.kind)) || problems[0];
    if (missing.includes("audio") && !problems.some((x) => x.kind === "audio")) throw userErr("This file has no audio.");
    throw userErr((p ? p.text[0].toUpperCase() + p.text.slice(1) + "." : "Couldn't convert this file.") + " Try a recent Chrome or Edge on a computer.");
  }
  if (o.onProgress) conv.onProgress = o.onProgress;
  const stop = () => { conv.cancel().catch(() => {}); };
  if (o.signal) { if (o.signal.aborted) throw new Cancelled(); o.signal.addEventListener("abort", stop); }
  try { await conv.execute(); }
  catch (e) { if (o.signal && o.signal.aborted) throw new Cancelled(); throw e; }
  finally { if (o.signal) o.signal.removeEventListener("abort", stop); }
  const warnings = problems.map((x) => (x.kind === "audio" ? "The result has no audio because " : "The result has no video because ") + x.text + ".");
  return { blob: new Blob([target.buffer], { type: o.mime || output.format.mimeType }), warnings, conv };
}

/** Thời lượng thật của file kết quả (để báo lại cho người dùng) */
export async function durationOf(blob) {
  try { const M = await mb(); const inp = new M.Input({ source: new M.BlobSource(blob), formats: M.ALL_FORMATS }); return await inp.computeDuration(); }
  catch (_) { return 0; }
}

/** Hàm process cho Conversion: nhân hệ số tăng/giảm dần (thời gian tính từ đầu đoạn) */
export async function fadeProcess(len, fadeIn, fadeOut) {
  const M = await mb();
  return (s) => {
    const n = s.numberOfFrames, ch = s.numberOfChannels, data = new Float32Array(n * ch), planes = [];
    for (let c = 0; c < ch; c++) { const pl = data.subarray(c * n, (c + 1) * n); s.copyTo(pl, { planeIndex: c, format: "f32-planar" }); planes.push(pl); }
    applyFade(planes, s.sampleRate, s.timestamp, len, fadeIn, fadeOut);
    const out = new M.AudioSample({ data, format: "f32-planar", numberOfChannels: ch, sampleRate: s.sampleRate, timestamp: s.timestamp });
    s.close();
    return out;
  };
}

/* ---------- âm thanh dạng AudioBuffer ---------- */
const OAC = () => window.OfflineAudioContext || window.webkitOfflineAudioContext;
/** Giải mã cả file âm thanh (hoặc tiếng của video) thành AudioBuffer ở tần số sampleRate (tự đổi tần số) */
export async function decodeAudio(file, sampleRate = 44100) {
  const AC = OAC();
  try {
    const buf = await file.arrayBuffer();
    return await new AC(1, 1, sampleRate).decodeAudioData(buf);
  } catch (_) {
    // dự phòng: giải mã bằng WebCodecs qua Mediabunny rồi đổi tần số
    const M = await mb();
    const input = await openInput(file);
    const a = await input.getPrimaryAudioTrack();
    if (!a || !(await a.canDecode())) throw userErr(`This browser can't read the audio in ${file.name}.`);
    const parts = [];
    let total = 0, ch = 1, sr = 44100;
    for await (const w of new M.AudioBufferSink(a).buffers()) { parts.push(w.buffer); total += w.buffer.length; ch = Math.max(ch, w.buffer.numberOfChannels); sr = w.buffer.sampleRate; }
    const all = new AudioBuffer({ length: Math.max(1, total), numberOfChannels: ch, sampleRate: sr });
    let off = 0;
    for (const b of parts) { for (let c = 0; c < ch; c++) all.copyToChannel(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), c, off); off += b.length; }
    return sr === sampleRate ? all : resample(all, sampleRate, ch);
  }
}
/** Đổi tần số lấy mẫu / số kênh của AudioBuffer */
export async function resample(buffer, sampleRate, channels = buffer.numberOfChannels) {
  if (buffer.sampleRate === sampleRate && buffer.numberOfChannels === channels) return buffer;
  const ctx = new (OAC())(channels, Math.max(1, Math.ceil((buffer.duration) * sampleRate)), sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buffer; src.connect(ctx.destination); src.start();
  return ctx.startRendering();
}
/** Dạng sóng của file âm thanh: Float32Array(2n) [min, max…] (giải mã ở 8 kHz cho nhẹ) */
export async function waveform(file, n = 1600) {
  const b = await decodeAudio(file, 8000);
  const chs = []; for (let c = 0; c < b.numberOfChannels; c++) chs.push(b.getChannelData(c));
  return peaksOf(chs, n);
}

/** Mã hoá dần các AudioBuffer vào một file. Trả về { add(buffer), finish() → Blob } */
export async function audioWriter(key, { bitrate = 192, sampleRate = 44100, channels = 2, tags } = {}) {
  const M = await mb(), F = AUDIO_OUT[key];
  await ensureAudioEncoder(F.codec);
  if (!(await M.canEncodeAudio(F.codec, { sampleRate: F.codec === "opus" ? 48000 : sampleRate, numberOfChannels: channels }))) throw userErr(`This browser can't create ${F.label} files. Please choose another format.`);
  const target = new M.BufferTarget();
  const output = new M.Output({ format: F.fmt(M), target });
  const src = new M.AudioBufferSource({ codec: F.codec, ...(F.lossless ? {} : { quality: new M.Quality({ bitrate: bitrate * 1000 }) }) });
  output.addAudioTrack(src);
  if (tags && !F.lossless) output.setMetadataTags(tags);
  await output.start();
  return {
    // chia nhỏ để có tiến trình và không giữ khung hình quá lâu
    async add(buf, onPart) {
      const step = buf.sampleRate * 4;
      for (let i = 0; i < buf.length; i += step) {
        const n = Math.min(step, buf.length - i);
        const part = new AudioBuffer({ length: n, numberOfChannels: buf.numberOfChannels, sampleRate: buf.sampleRate });
        for (let c = 0; c < buf.numberOfChannels; c++) part.copyToChannel(buf.getChannelData(c).subarray(i, i + n), c);
        await src.add(part);
        if (onPart) await onPart((i + n) / buf.length);
      }
    },
    async finish() { await output.finalize(); return new Blob([target.buffer], { type: F.mime }); },
    cancel() { output.cancel().catch(() => {}); }
  };
}

/* ---------- trình phát + thanh chọn đoạn ---------- */
/** <audio>/<video> phát file gốc trên máy (URL blob:). Trả về { el, destroy } */
export function player(file, video) {
  const url = URL.createObjectURL(file);
  const el = h(video ? "video" : "audio", { class: video ? "md-video" : "md-audio", src: url, controls: true, preload: "metadata", playsinline: true });
  if (video) el.setAttribute("playsinline", "");
  return { el, url, destroy() { el.pause(); el.removeAttribute("src"); el.load(); URL.revokeObjectURL(url); } };
}

/**
 * Thanh chọn đoạn. opts: { duration, media (HTMLMediaElement), start, end, minLen, onChange({start,end}) }
 * Trả về { el, get(), set(s, e), setPeaks(Float32Array), setThumbs(async (w, h, times) => canvases), destroy() }
 */
export function rangeEditor(opts) {
  const D = opts.duration || 0, media = opts.media, minLen = opts.minLen ?? 0.1;
  let r = clampRange(opts.start ?? 0, opts.end ?? D, D, minLen), peaks = null, thumbFn = null, playing = false, stopAt = null, timer = null;
  const bg = h("canvas", { class: "rg-bg", "aria-hidden": "true" });
  const shL = h("div", { class: "rg-shade" }), shR = h("div", { class: "rg-shade" });
  const sel = h("div", { class: "rg-sel", "aria-hidden": "true" });
  const head = h("div", { class: "rg-head", "aria-hidden": "true" });
  const mkHandle = (k, label) => h("div", { class: "rg-h rg-" + k, role: "slider", tabindex: "0", "aria-label": label, "aria-valuemin": "0", "aria-valuemax": String(Math.round(D * 10) / 10) }, h("span"));
  const hs = mkHandle("s", "Start point"), he = mkHandle("e", "End point");
  const track = h("div", { class: "rg-track", title: "Click to seek there; drag the two handles to select a range" }, bg, shL, shR, sel, hs, he, head);
  const fStart = h("input", { class: "input rg-in", inputmode: "decimal", "aria-label": "Start time (min:sec)", autocomplete: "off" });
  const fEnd = h("input", { class: "input rg-in", inputmode: "decimal", "aria-label": "End time (min:sec)", autocomplete: "off" });
  const lenOut = h("output", { class: "rg-len", "aria-live": "polite" });
  const btn = (ic, label, onclick, cls = "ib sm") => h("button", { class: cls, type: "button", title: label, "aria-label": label, html: icon(ic), onclick });
  const playBtn = h("button", { class: "btn sm", type: "button", onclick: () => (playing ? stopPlay() : playSel(r.start)) });
  const field = (label, inp, setNow) => h("div", { class: "rg-field" }, h("span", { class: "rg-lbl", text: label }), h("div", { class: "rg-inrow" }, inp, media ? btn("map-pin", label + " = current playback position", setNow) : null));
  const el = h("div", { class: "rg" }, track,
    h("div", { class: "rg-bar" },
      field("Start", fStart, () => set(media.currentTime, r.end, "s")),
      field("End", fEnd, () => set(r.start, media.currentTime, "e")),
      h("div", { class: "rg-field" }, h("span", { class: "rg-lbl", text: "Length" }), lenOut)),
    media ? h("div", { class: "row rg-acts" }, playBtn,
      h("button", { class: "btn ghost sm", type: "button", onclick: () => playSel(Math.max(r.start, r.end - 3)) }, h("span", { html: icon("skip-forward"), style: { display: "contents" } }), "Play the last 3 seconds")) : null);

  function emit() { if (opts.onChange) opts.onChange({ ...r }); }
  function set(s, e, which) {
    const nr = clampRange(s, e, D, minLen);
    // giữ nguyên đầu kia khi kéo một đầu chạm giới hạn
    if (which === "s" && nr.end !== e) { nr.end = e; nr.start = Math.min(nr.start, e - minLen); }
    if (which === "e" && nr.start !== s) { nr.start = s; nr.end = Math.max(nr.end, s + minLen); }
    r = clampRange(nr.start, nr.end, D, minLen);
    paint(); emit();
  }
  const pct = (t) => (D ? (t / D) * 100 : 0) + "%";
  function paint() {
    shL.style.left = "0"; shL.style.width = pct(r.start);
    shR.style.left = pct(r.end); shR.style.right = "0";
    sel.style.left = pct(r.start); sel.style.width = pct(r.end - r.start);
    hs.style.left = pct(r.start); he.style.left = pct(r.end);
    for (const [hd, t] of [[hs, r.start], [he, r.end]]) { hd.setAttribute("aria-valuenow", String(Math.round(t * 10) / 10)); hd.setAttribute("aria-valuetext", fmtTime(t)); }
    if (document.activeElement !== fStart) fStart.value = fmtTime(r.start);
    if (document.activeElement !== fEnd) fEnd.value = fmtTime(r.end);
    lenOut.textContent = fmtTime(r.end - r.start);
    playBtn.innerHTML = icon(playing ? "pause" : "play") + (playing ? "Stop" : "Play selection");
  }
  function paintHead() { if (media) head.style.left = pct(media.currentTime || 0); }
  // ô nhập
  for (const [inp, k] of [[fStart, "s"], [fEnd, "e"]]) {
    inp.addEventListener("change", () => {
      const v = parseTime(inp.value);
      inp.classList.toggle("bad", Number.isNaN(v));
      if (!Number.isNaN(v)) { k === "s" ? set(v, r.end, "s") : set(r.start, v, "e"); inp.value = fmtTime(k === "s" ? r.start : r.end); }
    });
    inp.addEventListener("blur", () => { if (!inp.classList.contains("bad")) inp.value = fmtTime(k === "s" ? r.start : r.end); });
  }
  // bàn phím trên tay nắm: ← → 0,1 giây; Shift: 1 giây; PageUp/PageDown 5 giây; Home/End
  for (const [hd, k] of [[hs, "s"], [he, "e"]]) {
    hd.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 1 : 0.1;
      const cur = k === "s" ? r.start : r.end;
      const map = { ArrowLeft: cur - step, ArrowDown: cur - step, ArrowRight: cur + step, ArrowUp: cur + step, PageDown: cur - 5, PageUp: cur + 5, Home: 0, End: D };
      if (!(e.key in map)) return;
      e.preventDefault();
      k === "s" ? set(map[e.key], r.end, "s") : set(r.start, map[e.key], "e");
      if (media) seek(k === "s" ? r.start : Math.max(r.start, r.end - 0.05));
    });
  }
  // kéo bằng chuột / ngón tay
  const timeAt = (x) => { const b = track.getBoundingClientRect(); return Math.max(0, Math.min(D, ((x - b.left) / b.width) * D)); };
  let drag = null;
  track.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const t = timeAt(e.clientX);
    const tgt = e.target.closest(".rg-h");
    const b = track.getBoundingClientRect(), px = (s) => b.left + (s / D) * b.width;
    let kind = tgt === hs ? "s" : tgt === he ? "e" : null;
    // gần tay nắm (12 px) thì coi như bấm tay nắm: dễ bấm trên điện thoại
    if (!kind && Math.abs(e.clientX - px(r.start)) < 12) kind = "s";
    if (!kind && Math.abs(e.clientX - px(r.end)) < 12) kind = "e";
    if (!kind && t > r.start && t < r.end && e.target === sel) kind = "m";
    if (!kind) kind = "seek";
    drag = { kind, t0: t, s0: r.start, e0: r.end, moved: false };
    track.setPointerCapture(e.pointerId);
    (kind === "s" ? hs : kind === "e" ? he : track).focus({ preventScroll: true });
    e.preventDefault();
  });
  track.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const t = timeAt(e.clientX), dt = t - drag.t0;
    if (Math.abs(dt) * (track.clientWidth / (D || 1)) > 2) drag.moved = true;
    if (drag.kind === "s") set(t, r.end, "s");
    else if (drag.kind === "e") set(r.start, t, "e");
    else if (drag.kind === "m" && drag.moved) { const len = drag.e0 - drag.s0, s = Math.max(0, Math.min(D - len, drag.s0 + dt)); set(s, s + len); }
    if (media && drag.kind !== "m" && drag.kind !== "seek") seek(drag.kind === "s" ? r.start : Math.max(r.start, r.end - 0.05));
  });
  const end = (e) => {
    if (!drag) return;
    if (media && (drag.kind === "seek" || (drag.kind === "m" && !drag.moved))) { stopPlay(); seek(timeAt(e.clientX)); }
    drag = null;
  };
  track.addEventListener("pointerup", end);
  track.addEventListener("pointercancel", () => { drag = null; });
  // phát đoạn đã chọn
  function seek(t) { if (!media) return; try { media.currentTime = t; } catch (_) {} paintHead(); }
  function playSel(from) {
    if (!media) return;
    seek(from); stopAt = r.end; playing = true;
    media.play().catch(() => { playing = false; paint(); });
    paint();
  }
  function stopPlay() { if (!media) return; media.pause(); playing = false; stopAt = null; paint(); }
  if (media) {
    timer = setInterval(() => {
      paintHead();
      if (stopAt != null && media.currentTime >= stopAt) { media.pause(); seek(r.start); stopAt = null; playing = false; paint(); }
    }, 40);
    media.addEventListener("pause", () => { if (playing) { playing = false; stopAt = null; paint(); } });
    media.addEventListener("seeked", paintHead);
  }
  // nền: dạng sóng hoặc dải ảnh thu nhỏ
  let thumbJob = 0;
  async function drawBg() {
    const w = Math.max(1, Math.round(track.clientWidth * (window.devicePixelRatio || 1))), hh = Math.max(1, Math.round(track.clientHeight * (window.devicePixelRatio || 1)));
    if (!track.clientWidth) return;
    if (bg.width !== w || bg.height !== hh) { bg.width = w; bg.height = hh; }
    const g = bg.getContext("2d");
    if (peaks) {
      g.clearRect(0, 0, w, hh);
      g.fillStyle = getComputedStyle(track).getPropertyValue("--wave").trim() || "#3e63dd";
      const n = peaks.length / 2, mid = hh / 2;
      for (let x = 0; x < w; x++) {
        const a = Math.floor((x / w) * n), b = Math.max(a + 1, Math.floor(((x + 1) / w) * n));
        let lo = 0, hi = 0;
        for (let i = a; i < b; i++) { if (peaks[2 * i] < lo) lo = peaks[2 * i]; if (peaks[2 * i + 1] > hi) hi = peaks[2 * i + 1]; }
        const y1 = mid - Math.max(hi, 0.01) * mid * 0.95, y2 = mid - Math.min(lo, -0.01) * mid * 0.95;
        g.fillRect(x, y1, 1, y2 - y1);
      }
    } else if (thumbFn) {
      const job = ++thumbJob;
      const tw = Math.max(1, Math.round(hh * (opts.aspect || 16 / 9))), n = Math.max(1, Math.ceil(w / tw));
      const times = Array.from({ length: n }, (_, i) => Math.min(D - 0.001, ((i + 0.5) / n) * D));
      let i = 0;
      try {
        for await (const c of thumbFn(tw, hh, times)) {
          if (job !== thumbJob) return;
          if (c) g.drawImage(c, i * tw, 0, tw, hh);
          i++;
        }
      } catch (e) { console.warn(e); }
    }
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => drawBg()) : null;
  if (ro) ro.observe(track);
  paint(); paintHead();
  return {
    el, get: () => ({ ...r }), set: (s, e) => set(s, e),
    setPeaks(p) { peaks = p; track.classList.add("wave"); drawBg(); },
    setThumbs(fn) { thumbFn = fn; track.classList.add("thumbs"); drawBg(); },
    destroy() { clearInterval(timer); if (ro) ro.disconnect(); thumbJob++; }
  };
}

/** Hàm tạo dải ảnh thu nhỏ cho rangeEditor từ thông tin probe() */
export function thumbStrip(p) {
  return async function* (w, hh, times) {
    const M = await mb();
    const sink = new M.CanvasSink(p.video.track, { width: w, height: hh, fit: "cover", poolSize: 0 });
    for await (const wc of sink.canvasesAtTimestamps(times)) { yield wc ? wc.canvas : null; await nextFrame(); }
  };
}

/** Khung tiến trình kèm thời gian còn lại: trả về hàm onProgress cho convert() */
export function progressReporter(ctx, label, duration) {
  const t0 = performance.now();
  return (f) => {
    ctx.progress(f);
    const el = (performance.now() - t0) / 1000;
    let tail = "";
    if (f > 0.05 && el > 2) { const left = (el / f) * (1 - f); tail = left > 90 ? ` · about ${Math.round(left / 60)} min left` : left > 3 ? ` · about ${Math.round(left)} sec left` : ""; }
    ctx.status(`${label} ${Math.round(f * 100)}%${tail}`);
  };
}

/* ---------- giao diện chung ---------- */
const css = document.createElement("style");
css.textContent = `.md-work{display:grid;gap:14px}
.md-2col{display:grid;grid-template-columns:1fr 1fr;gap:10px}.md-2col[hidden]{display:none}
.md-audio{width:100%}.md-video{width:100%;max-height:56vh;background:#000;border-radius:14px;display:block}
.md-meta{display:flex;flex-wrap:wrap;gap:6px 14px;color:var(--muted);font-size:14px;margin:0}.md-meta b{color:var(--ink)}
.rg{display:grid;gap:12px}
.rg-track{--wave:var(--brand);position:relative;height:84px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);touch-action:none;cursor:pointer;user-select:none;overflow:visible}
.rg-track.thumbs{height:64px;background:#111}
.rg-bg{position:absolute;inset:0;width:100%;height:100%;border-radius:11px}
.rg-shade{position:absolute;top:0;bottom:0;background:color-mix(in srgb,var(--bg) 62%,transparent);pointer-events:none}
.rg-track.thumbs .rg-shade{background:rgba(0,0,0,.6)}
.rg-sel{position:absolute;top:-2px;bottom:-2px;border:3px solid var(--brand);border-radius:8px;cursor:grab;box-sizing:border-box}
.rg-h{position:absolute;top:-8px;bottom:-8px;width:22px;margin-left:-11px;display:grid;place-items:center;cursor:ew-resize;z-index:2;outline:none}
.rg-h span{width:12px;height:100%;border-radius:6px;background:var(--brand);box-shadow:0 1px 4px rgba(0,0,0,.35)}
.rg-h span::after{content:"";display:block;width:2px;height:22px;margin:calc(50% + 0px) auto 0;transform:translateY(-50%);background:#fff;border-radius:2px}
.rg-h:focus-visible span{outline:3px solid color-mix(in srgb,var(--brand) 45%,transparent);outline-offset:2px}
.rg-head{position:absolute;top:-4px;bottom:-4px;width:2px;margin-left:-1px;background:var(--err);pointer-events:none;z-index:1}
.rg-bar{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end}
.rg-field{display:grid;gap:4px;min-width:0}.rg-lbl{font-weight:600;font-size:14px}
.rg-inrow{display:flex;gap:4px;align-items:center}.rg-in{min-width:0;width:100%;font-variant-numeric:tabular-nums;font-family:var(--mono)}
.rg-in.bad{border-color:var(--err)}
.rg-len{font:600 16px var(--mono);padding:9px 2px;white-space:nowrap}
.rg-acts{gap:8px}
@media (max-width:520px){.rg-bar{grid-template-columns:1fr 1fr}.rg-bar>.rg-field:last-child{grid-column:1/-1;grid-template-columns:auto 1fr;align-items:center;gap:8px}.rg-len{padding:0}}
.md-loading{display:flex;align-items:center;gap:10px;color:var(--muted)}
.md-out audio,.md-out video{width:100%;max-width:640px;margin-top:10px;border-radius:12px}
.md-out video{background:#000;max-height:50vh}`;
document.head.append(css);

/** Dòng tên file + thông tin + nút "Chọn file khác" cho vùng làm việc tự vẽ */
export function fileHeader(name, info, ctx, label = "Choose another file") {
  return h("div", { class: "row", style: { justifyContent: "space-between" } },
    h("p", { class: "md-meta" }, h("b", { text: name }), h("span", { text: info })),
    h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), label));
}
/** Hộp thông báo có icon. kind: "err" | "warn" | "ok" | "info" */
export function alertEl(kind, text) {
  const p = h("p", { class: "alert " + kind, html: icon(kind === "ok" ? "circle-check" : kind === "info" ? "info" : "triangle-alert") + "<span></span>" });
  p.lastChild.textContent = text;
  return p;
}
/** Báo lỗi trong vùng làm việc tự vẽ */
export function areaError(area, e) {
  console.error(e);
  area.textContent = "";
  area.append(alertEl("err", (e && e.userMsg) || "Couldn't read this file."));
}
export const loadingEl = (text = "Reading file…") => h("p", { class: "md-loading", html: '<span class="spinner sm"></span> ' + text });
/** Đọc file cho công cụ có vùng làm việc tự vẽ; báo lỗi rõ ràng nếu thiếu WebCodecs, thiếu hình/tiếng, không giải mã được */
export async function probeFor(file, need) {
  const miss = webCodecsMissing(need === "video");
  if (miss) throw userErr(miss);
  const p = await probe(file);
  if (need === "video") {
    if (!p.video) throw userErr("This file has no video. Please choose a video file.");
    if (!p.video.canDecode) throw userErr(`This browser can't decode ${codecName(p.video.codec)} video. Try a recent Chrome or Edge on a computer.`);
  }
  if (need === "audio") {
    if (!p.audio) throw userErr("This file has no audio.");
    if (!p.audio.canDecode) throw userErr(`This browser can't read ${codecName(p.audio.codec)} audio. Try a recent Chrome or Edge.`);
  }
  return p;
}

/** Phần xem trước kết quả (đặt vào o.extra của khung file) */
export function resultPreview(blob, video) {
  const url = URL.createObjectURL(blob);
  return h("div", { class: "md-out" }, h(video ? "video" : "audio", { src: url, controls: true, preload: "metadata", playsinline: true }));
}
