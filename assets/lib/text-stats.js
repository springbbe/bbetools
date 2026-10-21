/* Thống kê văn bản (hàm thuần): từ, ký tự, câu, đoạn, thời gian đọc, từ lặp nhiều. */

const WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’_-]*/gu;
// từ phổ biến không đáng kể khi xem "từ dùng nhiều nhất"
const STOP = new Set("và là của có cho các những được trong với không một này đã để người khi thì đến cũng như từ ra vào lại nên còn mà hay rất làm theo bị sẽ đang nhưng tôi bạn chúng họ anh chị em ở trên dưới về tại sau trước vì nếu do sự việc thể nhiều the a an of to and in is it for on that this with as are be".split(" "));

export function stats(text) {
  text = String(text || "");
  const words = text.match(WORD) || [];
  const chars = [...text].length;
  const noSpace = [...text.replace(/\s/g, "")].length;
  const sentences = (text.match(/[^.!?…\n]*[\p{L}\p{N}][^.!?…\n]*([.!?…]+|$)/gmu) || []).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text ? text.split("\n").length : 0;
  const freq = new Map();
  for (const w of words) {
    const k = w.toLocaleLowerCase("vi");
    if (k.length < 2 || STOP.has(k) || /^\d+$/.test(k)) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  const top = [...freq].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi")).slice(0, 10);
  return {
    words: words.length, chars, noSpace, sentences, paragraphs, lines,
    readMin: words.length / 230,   // tốc độ đọc trung bình (tiếng/phút)
    speakMin: words.length / 140,  // tốc độ nói
    top
  };
}

export function fmtDuration(min) {
  if (min <= 0) return "0 giây";
  const s = Math.round(min * 60);
  if (s < 60) return s + " giây";
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return m + " phút" + (r ? " " + r + " giây" : "");
  return Math.floor(m / 60) + " giờ " + (m % 60) + " phút";
}
