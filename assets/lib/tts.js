/* Chia văn bản thành các đoạn ngắn để đọc bằng speechSynthesis (Chrome tự dừng khi một câu đọc quá ~15 giây,
   và chia nhỏ giúp tô sáng câu đang đọc). Mỗi đoạn giữ vị trí trong văn bản gốc. Test: tests/tts.test.js */

const SENT_END = /[.!?…;:。！？]+["'”’)\]]*(?=\s|$)|\n+/g;

/** text → [{ text, start, end }]; mỗi đoạn không dài quá max ký tự (cắt ở dấu phẩy, rồi ở khoảng trắng) */
export function splitSpeech(text, max = 200) {
  const out = [];
  const src = String(text ?? "");
  let from = 0;
  const push = (s, e) => {
    // bỏ khoảng trắng hai đầu nhưng giữ đúng vị trí
    while (s < e && /\s/.test(src[s])) s++;
    while (e > s && /\s/.test(src[e - 1])) e--;
    if (e > s && /[\p{L}\p{N}]/u.test(src.slice(s, e))) out.push({ text: src.slice(s, e), start: s, end: e });
  };
  const emit = (s, e) => {
    while (e - s > max) {
      const seg = src.slice(s, s + max);
      let cut = Math.max(seg.lastIndexOf(", "), seg.lastIndexOf("; "), seg.lastIndexOf(" – "), seg.lastIndexOf(" - "));
      if (cut < max * 0.4) cut = seg.lastIndexOf(" ");
      if (cut <= 0) cut = max - 1;
      push(s, s + cut + 1);
      s += cut + 1;
    }
    push(s, e);
  };
  SENT_END.lastIndex = 0;
  let m;
  while ((m = SENT_END.exec(src))) {
    const end = m.index + m[0].length;
    emit(from, end);
    from = end;
  }
  emit(from, src.length);
  return out;
}

/** Xếp giọng: tiếng Việt (vi-VN) trước; trong cùng ngôn ngữ, giọng có sẵn trên máy (localService) trước giọng trực tuyến
   (giọng trực tuyến gửi văn bản tới máy chủ của nhà cung cấp); rồi tới giọng tự nhiên ("Natural", "Enhanced"…) */
export function rankVoices(voices, lang = "vi") {
  const score = (v) => {
    const l = String(v.lang || "").toLowerCase().replace("_", "-");
    let s = 0;
    if (l === lang || l.startsWith(lang + "-")) s += 100;
    if (v.localService) s += 20;
    if (/natural|neural|premium|enhanced/i.test(v.name)) s += 5;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a) || String(a.name).localeCompare(String(b.name)));
}
/** Giọng tiếng Việt? */
export const isLang = (v, lang = "vi") => { const l = String(v.lang || "").toLowerCase().replace("_", "-"); return l === lang || l.startsWith(lang + "-"); };

/** Ước tính thời gian đọc (giây) với tốc độ khoảng 150 từ/phút ở rate = 1 */
export function speakSeconds(text, rate = 1) {
  const words = (String(text).match(/[\p{L}\p{N}]+/gu) || []).length;
  return words / (2.5 * (rate || 1));
}
