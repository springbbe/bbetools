/* Giọng nói thành văn bản: các hàm thuần quanh mô hình Whisper (chạy được cả trong Node để test).
   - planWindows: tìm các đoạn có tiếng (năng lượng theo khung 20 ms), gom thành cửa sổ ≤ 28 giây cắt ở chỗ lặng nhất
     → mô hình chỉ nghe chỗ có tiếng (đỡ "bịa chữ" ở đoạn im lặng) và mỗi cửa sổ là một bước tiến trình.
   - joinWindow: mốc thời gian Whisper trả về (tính từ đầu cửa sổ) → thời gian tuyệt đối, bỏ câu bịa quen thuộc, câu lặp.
   - toCues: chia đoạn dài thành phụ đề ≤ 2 dòng × 42 ký tự, ≤ 7 giây (thời gian chia theo số ký tự).
   - toSrt, toVtt, toText. */

const FRAME = 0.02; // giây mỗi khung đo năng lượng

/** Năng lượng (dB) theo từng khung 20 ms của tín hiệu đơn kênh */
export function energyDb(samples, sr) {
  const n = Math.max(1, Math.round(sr * FRAME)), m = Math.ceil(samples.length / n), out = new Float32Array(m);
  for (let f = 0; f < m; f++) {
    let s = 0;
    const a = f * n, b = Math.min(samples.length, a + n);
    for (let i = a; i < b; i++) s += samples[i] * samples[i];
    out[f] = 10 * Math.log10(s / Math.max(1, b - a) + 1e-12);
  }
  return out;
}

function percentile(arr, p) {
  const s = Float32Array.from(arr).sort();
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : -120;
}

/** Ngưỡng có tiếng: trên nền ồn 10 dB, không quá 35 dB dưới mức to, không thấp hơn -60 dB (im lặng hẳn thì không có tiếng) */
export function speechThreshold(db) {
  const floor = percentile(db, 0.1), loud = percentile(db, 0.95);
  return Math.max(-60, Math.min(loud - 6, Math.max(floor + 10, loud - 35)));
}

/**
 * Các đoạn có tiếng [{ start, end }] (giây). Lấp khoảng lặng ngắn hơn gap, bỏ tiếng ngắn hơn minLen, nới mỗi bên pad.
 */
export function speechRegions(db, { gap = 0.5, minLen = 0.12, pad = 0.25, duration } = {}) {
  const thr = speechThreshold(db), total = duration ?? db.length * FRAME;
  const runs = [];
  let s = -1;
  for (let f = 0; f <= db.length; f++) {
    const on = f < db.length && db[f] > thr;
    if (on && s < 0) s = f;
    if (!on && s >= 0) { runs.push([s * FRAME, f * FRAME]); s = -1; }
  }
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] < gap) last[1] = r[1];
    else merged.push(r.slice());
  }
  return merged.filter((r) => r[1] - r[0] >= minLen)
    .map(([a, b]) => ({ start: Math.max(0, a - pad), end: Math.min(total, b + pad) }))
    .reduce((acc, r) => { const l = acc[acc.length - 1]; if (l && r.start <= l.end) l.end = r.end; else acc.push(r); return acc; }, []);
}

/** Khung lặng nhất (năng lượng trung bình 0,3 giây quanh khung) trong khoảng [a, b] giây */
function quietest(db, a, b) {
  const fa = Math.max(0, Math.floor(a / FRAME)), fb = Math.min(db.length - 1, Math.ceil(b / FRAME)), w = 7;
  let best = fb, bestV = Infinity;
  for (let f = fa; f <= fb; f++) {
    let s = 0, c = 0;
    for (let k = Math.max(0, f - w); k <= Math.min(db.length - 1, f + w); k++) { s += db[k]; c++; }
    const v = s / c;
    if (v < bestV) { bestV = v; best = f; }
  }
  return best * FRAME;
}

/**
 * Chia file thành các cửa sổ cho mô hình: [{ start, end }] (giây), mỗi cửa sổ ≤ maxLen, chỉ gồm chỗ có tiếng.
 * Đoạn có tiếng dài hơn maxLen được cắt ở chỗ lặng nhất trong nửa sau cửa sổ.
 */
export function planWindows(samples, sr, { maxLen = 28 } = {}) {
  const duration = samples.length / sr;
  const db = energyDb(samples, sr);
  const regions = speechRegions(db, { duration });
  const out = [];
  let cur = null;
  const push = (w) => { if (w && w.end - w.start > 0.05) out.push({ start: round2(w.start), end: round2(w.end) }); };
  for (const r of regions) {
    if (cur && r.end - cur.start <= maxLen) { cur.end = r.end; continue; }
    push(cur);
    cur = { start: r.start, end: r.end };
    while (cur.end - cur.start > maxLen) {
      const cut = quietest(db, cur.start + maxLen * 0.5, cur.start + maxLen);
      push({ start: cur.start, end: cut });
      cur.start = cut;
    }
  }
  push(cur);
  return out;
}
const round2 = (x) => Math.round(x * 100) / 100;

/* Câu Whisper hay "bịa" ở chỗ nhạc nền, im lặng (học từ phụ đề video trên mạng), có khi lẫn ngay trước câu thật.
   ANYWHERE: cụm đặc trưng, cắt ở bất cứ đâu; WHOLE: câu bình thường (có thể là lời thật), chỉ bỏ khi đứng một mình. */
const SEP = "[\\s,.!?…]";
const phrase = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, SEP + "+");
const ANYWHERE = ["hãy subscribe cho kênh ghiền mì gõ để không bỏ lỡ những video hấp dẫn", "hãy subscribe cho kênh ghiền mì gõ", "ghiền mì gõ", "la la school", "subtitles by the amara.org community"]
  .map((p) => new RegExp(SEP + "*" + phrase(p) + SEP + "*", "giu"));
const WHOLE = new RegExp("^" + SEP + "*(" + ["hãy đăng ký kênh để ủng hộ kênh của mình nhé", "đăng ký kênh để không bỏ lỡ những video hấp dẫn", "cảm ơn các bạn đã theo dõi( và hẹn gặp lại)?",
  "hẹn gặp lại các bạn trong những video tiếp theo", "(nhớ )?like và subscribe", "thanks for watching", "thank you( so much)? for watching", "please subscribe",
  "nhạc", "tiếng nhạc", "âm nhạc", "music", "vỗ tay", "applause", "[♪*()\\[\\]-]*"].map((p) => p.includes("(") || p.includes("[") ? p.replace(/ /g, SEP + "+") : phrase(p)).join("|") + ")" + SEP + "*$", "iu");
const norm = (s) => s.toLowerCase().replace(/[.,!?…:;"'“”()[\]–-]+/g, " ").replace(/\s+/g, " ").trim();
/** Bỏ câu bịa quen thuộc; trả về "" khi không còn chữ thật */
export function stripHallucinations(text) {
  let t = String(text || "");
  for (const re of ANYWHERE) t = t.replace(re, " ");
  t = t.replace(/\s+/g, " ").trim();
  return WHOLE.test(t) ? "" : t;
}
export const isHallucination = (text) => !stripHallucinations(text);

/** Bỏ lặp kiểu "cảm ơn cảm ơn cảm ơn…" khi mô hình kẹt: cụm 1–6 từ lặp liên tiếp quá 3 lần chỉ giữ 1 lần */
export function collapseRepeats(text) {
  const w = text.trim().split(/\s+/);
  for (let n = 1; n <= 6; n++) {
    for (let i = 0; i + n * 4 <= w.length; i++) {
      const key = w.slice(i, i + n).join(" ").toLowerCase();
      let k = i + n, reps = 1;
      while (k + n <= w.length && w.slice(k, k + n).join(" ").toLowerCase() === key) { k += n; reps++; }
      if (reps > 3) { w.splice(i + n, k - i - n); }
    }
  }
  return w.join(" ");
}

/**
 * Kết quả Whisper của một cửa sổ → đoạn có thời gian tuyệt đối [{ start, end, text }].
 * chunks: [{ timestamp: [a, b | null], text }] tính từ đầu cửa sổ; text: cả câu (khi mô hình không trả mốc thời gian).
 */
export function joinWindow(win, { chunks, text } = {}, prev = []) {
  const len = win.end - win.start;
  let list = (chunks && chunks.length ? chunks : [{ timestamp: [0, len], text: text || "" }])
    .map((c) => ({ a: c.timestamp ? c.timestamp[0] : null, b: c.timestamp ? c.timestamp[1] : null, text: collapseRepeats(stripHallucinations(c.text)) }));
  const out = [];
  list.forEach((c, i) => {
    const a = Math.min(len, Math.max(0, c.a ?? (out.length ? out[out.length - 1].end - win.start : 0)));
    const nextA = list[i + 1] && list[i + 1].a != null ? list[i + 1].a : len;
    let b = c.b ?? nextA;
    b = Math.min(len, Math.max(a + 0.2, b));
    if (!c.text) return;
    const last = out[out.length - 1] || prev[prev.length - 1];
    if (last && norm(last.text) === norm(c.text) && win.start + a - last.end < 1) return; // lặp nguyên câu ngay sau nhau
    out.push({ start: round3(win.start + a), end: round3(Math.min(win.end, win.start + b)), text: c.text });
  });
  return out;
}
const round3 = (x) => Math.round(x * 1000) / 1000;

/** Ngắt chữ thành các dòng ≤ width ký tự (không cắt giữa từ) */
export function wrapLines(text, width = 42) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + " " + w).length > width) { lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* Chỗ ngắt phụ đề: ưu tiên sau dấu câu, rồi trước liên từ (không tách "dễ | dàng", "trải | nghiệm"), gần điểm chia đều */
const CONJ = /^(và|nhưng|hoặc|hay|để|khi|nếu|thì|mà|vì|nên|rằng|còn|song|tuy|dù|bởi|and|but|or|so|because|when|if|that|which|while)$/i;
function splitText(text, parts, maxLen = Infinity) {
  const words = text.split(/\s+/).filter(Boolean);
  if (parts <= 1 || words.length < 2) return [text.trim()];
  const total = text.length, out = [];
  let i = 0, start = 0;
  for (let p = 1; p < parts && i < words.length; p++) {
    const target = (total * p) / parts;
    let pos = 0, best = -1, bestScore = Infinity;
    for (let k = 0; k < words.length - 1; k++) {
      pos += words[k].length + 1;
      if (k < i) { start = pos; continue; }
      if (pos - start > maxLen + 1) break;
      const bonus = /[.!?…]$/.test(words[k]) ? 30 : /[,;:]$/.test(words[k]) ? 18 : CONJ.test(words[k + 1]) ? 10 : 0;
      const score = Math.abs(pos - target) - bonus;
      if (score < bestScore) { bestScore = score; best = k; }
    }
    if (best < i) break;
    out.push(words.slice(i, best + 1).join(" "));
    i = best + 1;
  }
  if (i < words.length) out.push(words.slice(i).join(" "));
  return out.filter(Boolean);
}

/**
 * Đoạn → phụ đề [{ start, end, text }] (text đã ngắt dòng bằng \n): mỗi phụ đề ≤ lines × width ký tự và ≤ maxDur giây,
 * thời gian chia theo số ký tự; tối thiểu minDur giây khi còn chỗ trước phụ đề sau.
 */
export function toCues(segs, { width = 42, lines = 2, maxDur = 7, minDur = 1 } = {}) {
  const cues = [];
  for (const s of segs) {
    const dur = Math.max(0.2, s.end - s.start);
    const n = Math.max(Math.ceil(s.text.length / (width * lines * 0.92)), Math.ceil(dur / maxDur), 1);
    let parts = splitText(s.text, n, width * lines);
    // phần nào vẫn quá 2 dòng thì chia tiếp
    for (let k = 0; k < 3 && parts.some((p) => wrapLines(p, width).length > lines); k++)
      parts = parts.flatMap((p) => (wrapLines(p, width).length > lines ? splitText(p, Math.ceil(wrapLines(p, width).length / lines), width * lines) : [p]));
    const chars = parts.reduce((a, p) => a + p.length, 0) || 1;
    let t = s.start;
    parts.forEach((p, i) => {
      const end = i === parts.length - 1 ? s.end : t + (dur * p.length) / chars;
      cues.push({ start: round3(t), end: round3(end), text: wrapLines(p, width).join("\n") });
      t = end;
    });
  }
  cues.sort((a, b) => a.start - b.start);
  for (let i = 0; i < cues.length; i++) {
    const next = cues[i + 1];
    if (cues[i].end - cues[i].start < minDur) cues[i].end = round3(Math.min(cues[i].start + minDur, next ? next.start : Infinity));
    if (next && cues[i].end > next.start) cues[i].end = next.start;
  }
  return cues;
}

/** 3725.5 → "01:02:05,500" (SRT) hoặc "01:02:05.500" (VTT) */
export function stamp(t, sep = ",") {
  const ms = Math.max(0, Math.round(t * 1000));
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
}

export const toSrt = (cues) => cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join("\n");
export const toVtt = (cues) => "WEBVTT\n\n" + cues.map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text.replace(/-->/g, "→")}\n`).join("\n");

/** Văn bản liền mạch: nối các đoạn, xuống dòng mới khi lặng từ gap giây trở lên; stamps: thêm [mm:ss] đầu mỗi đoạn */
export function toText(segs, { gap = 2, stamps = false } = {}) {
  const paras = [];
  let cur = null;
  for (const s of segs) {
    if (!cur || s.start - cur.end >= gap) { cur = { start: s.start, end: s.end, parts: [] }; paras.push(cur); }
    cur.parts.push(s.text); cur.end = s.end;
  }
  return paras.map((p) => (stamps ? `[${clock(p.start)}] ` : "") + p.parts.join(" ").replace(/\s+([,.!?…])/g, "$1")).join("\n\n");
}
/** 65 → "1:05", 3725 → "1:02:05" */
export function clock(t) {
  t = Math.max(0, Math.floor(t));
  const hh = Math.floor(t / 3600), mm = Math.floor(t / 60) % 60, ss = t % 60;
  return (hh ? hh + ":" + String(mm).padStart(2, "0") : mm) + ":" + String(ss).padStart(2, "0");
}
