/* Tự sinh bởi scripts/build.js từ assets/lib/media.js và i18n/en/js/ — đừng sửa tay. */
/* Hàm thuần cho nhóm Âm thanh & video: thời gian, đoạn cắt, tăng/giảm dần, bitrate, kích thước, dạng sóng.
   Chạy được cả trong Node (test: tests/media.test.js). */

/** "1:05.3", "65", "65,5", "1:02:03" → số giây; không hợp lệ → NaN */
export function parseTime(s) {
  s = String(s ?? "").trim().replace(",", ".");
  if (!s) return NaN;
  const parts = s.split(":");
  if (parts.length > 3) return NaN;
  let t = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim(), last = i === parts.length - 1;
    if (!(last ? /^(\d+(\.\d*)?|\.\d+)$/ : /^\d+$/).test(p)) return NaN;
    const v = parseFloat(p);
    if (i > 0 && v >= 60) return NaN; // phút, giây phải < 60 khi có đơn vị lớn hơn
    t = t * 60 + v;
  }
  return t;
}

/** giây → "m:ss.d" hoặc "h:mm:ss.d"; digits: số chữ số thập phân (0–3) */
export function fmtTime(sec, digits = 1) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const f = 10 ** digits;
  let r = Math.round(sec * f);
  const frac = r % f;
  r = (r - frac) / f;
  const s = r % 60, m = Math.floor(r / 60) % 60, hh = Math.floor(r / 3600);
  const ss = String(s).padStart(2, "0") + (digits ? "," + String(frac).padStart(digits, "0") : "");
  return hh ? `${hh}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** giây → "1 giờ 2 phút", "3 phút 25 giây", "12,5 giây" */
export function fmtDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "–";
  if (sec < 60) return (Math.round(sec * 10) / 10).toLocaleString("en-US") + " sec";
  const t = Math.round(sec), hh = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
  if (hh) return `${hh} h` + (m ? ` ${m} min` : "");
  return `${m} min` + (s ? ` ${s} sec` : "");
}

/** Giữ đoạn [start, end] nằm trong [0, duration] và dài ít nhất minLen giây */
export function clampRange(start, end, duration, minLen = 0.1) {
  const d = Math.max(0, duration || 0), ml = Math.min(minLen, d);
  let s = Number.isFinite(start) ? Math.max(0, Math.min(start, d)) : 0;
  let e = Number.isFinite(end) ? Math.max(0, Math.min(end, d)) : d;
  if (e < s) [s, e] = [e, s];
  if (e - s < ml) { e = Math.min(d, s + ml); s = Math.max(0, e - ml); }
  return { start: s, end: e };
}

/** Hệ số âm lượng tại vị trí t (giây, tính từ đầu đoạn dài len) với tăng dần fadeIn và giảm dần fadeOut (đường cong chữ S) */
export function fadeGain(t, len, fadeIn = 0, fadeOut = 0) {
  let g = 1;
  if (fadeIn > 0 && t < fadeIn) g = Math.min(g, Math.max(0, t) / fadeIn);
  if (fadeOut > 0 && t > len - fadeOut) g = Math.min(g, Math.max(0, len - t) / fadeOut);
  g = Math.max(0, Math.min(1, g));
  return g === 1 ? 1 : (1 - Math.cos(Math.PI * g)) / 2;
}

/** Nhân hệ số tăng/giảm dần vào các kênh (Float32Array, sửa tại chỗ). offset: vị trí (giây) của mẫu đầu tiên trong đoạn */
export function applyFade(channels, sampleRate, offset, len, fadeIn, fadeOut) {
  if (!(fadeIn > 0 || fadeOut > 0)) return channels;
  const n = channels[0] ? channels[0].length : 0;
  for (let i = 0; i < n; i++) {
    const t = offset + i / sampleRate;
    if ((fadeIn > 0 && t < fadeIn) || (fadeOut > 0 && t > len - fadeOut)) {
      const g = fadeGain(t, len, fadeIn, fadeOut);
      for (const c of channels) c[i] *= g;
    }
  }
  return channels;
}

/** Bitrate video (bit/giây) để file dài durationSec giây nặng khoảng targetBytes (trừ âm thanh và ~3% phần vỏ file) */
export function videoBitrateForSize(targetBytes, durationSec, audioBps = 128000) {
  if (!(targetBytes > 0) || !(durationSec > 0)) return 0;
  return Math.max(0, Math.floor((targetBytes * 8 * 0.97) / durationSec - audioBps));
}

/** Bitrate video gợi ý theo số điểm ảnh/giây (H.264). level: "high" | "medium" | "low" */
export function suggestBitrate(w, h, fps = 30, level = "medium") {
  const bpp = { high: 0.1, medium: 0.065, low: 0.04 }[level] || 0.065;
  const f = Math.min(Math.max(fps || 30, 15), 60);
  return Math.round((w * h * f * bpp) / 10000) * 10000;
}

/** Thu nhỏ để cạnh ngắn không quá short (giữ tỉ lệ, số chẵn cho bộ mã hoá). Không phóng to. */
export function fitShortSide(w, h, short) {
  const even = (x) => Math.max(2, Math.round(x / 2) * 2);
  if (!short || Math.min(w, h) <= short) return [even(w), even(h)];
  const k = short / Math.min(w, h);
  return [even(w * k), even(h * k)];
}

/** Ước tính dung lượng (byte) từ tổng bitrate và thời lượng */
export const estimateBytes = (bps, durationSec) => Math.round((bps * durationSec) / 8 * 1.02);

/** Các mốc thời gian lấy khung hình cho GIF: từ start tới trước end, fps khung/giây, tối đa max khung */
export function frameTimes(start, end, fps, max = 600) {
  const out = [], step = 1 / fps;
  for (let i = 0; out.length < max; i++) {
    const t = start + i * step;
    if (t >= end - 1e-6) break;
    out.push(Math.round(t * 1e6) / 1e6);
  }
  return out;
}

/** Cỡ ảnh GIF theo bề rộng mong muốn (không phóng to) */
export function scaleToWidth(w, h, width) {
  if (!width || w <= width) return [Math.round(w), Math.round(h)];
  return [Math.round(width), Math.max(1, Math.round((h * width) / w))];
}

/** Đỉnh dạng sóng: n cột, mỗi cột [min, max] (gộp mọi kênh) → Float32Array(2n) */
export function peaks(channels, n) {
  const out = new Float32Array(2 * n);
  const len = channels[0] ? channels[0].length : 0;
  if (!len || !n) return out;
  for (let b = 0; b < n; b++) {
    const from = Math.floor((b * len) / n), to = Math.max(from + 1, Math.floor(((b + 1) * len) / n));
    let lo = 0, hi = 0;
    for (const c of channels) for (let i = from; i < to && i < len; i++) { const v = c[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    out[2 * b] = lo; out[2 * b + 1] = hi;
  }
  return out;
}

/** Mức RMS và đỉnh của các kênh */
export function levels(channels) {
  let sum = 0, peak = 0, n = 0;
  for (const c of channels) for (let i = 0; i < c.length; i++) { const v = c[i]; sum += v * v; const a = v < 0 ? -v : v; if (a > peak) peak = a; n++; }
  return { rms: n ? Math.sqrt(sum / n) : 0, peak };
}

/** Hệ số khuếch đại để mức RMS đạt targetDb (dBFS) mà đỉnh không vượt maxPeak (tránh rè) */
export function normalizeGain({ rms, peak }, targetDb = -18, maxPeak = 0.97) {
  if (!(rms > 0) || !(peak > 0)) return 1;
  return Math.min(10 ** (targetDb / 20) / rms, maxPeak / peak);
}

/** Vị trí bắt đầu (giây) của từng đoạn khi nối liền, cách nhau gap giây */
export function concatOffsets(durations, gap = 0) {
  const out = [];
  let t = 0;
  durations.forEach((d, i) => { out.push(t); t += d + (i < durations.length - 1 ? gap : 0); });
  return { offsets: out, total: t };
}

/** Kiểu MIME đầu tiên mà MediaRecorder hỗ trợ (isSupported = MediaRecorder.isTypeSupported) */
export function pickMime(isSupported, list) {
  for (const m of list) { try { if (isSupported(m)) return m; } catch (_) {} }
  return "";
}
/** Đuôi file theo kiểu MIME của MediaRecorder */
export function extForMime(mime, video) {
  const m = String(mime).toLowerCase();
  if (m.includes("mp4")) return video ? "mp4" : "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg")) return "mp3";
  return video ? "webm" : "webm";
}

/** Tên file theo thời điểm: "ghi-am-2026-10-22-14h05.m4a" */
export function stampName(prefix, date, ext) {
  const p = (n) => String(n).padStart(2, "0");
  return `${prefix}-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}h${p(date.getMinutes())}${p(date.getSeconds())}.${ext}`;
}
