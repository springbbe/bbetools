/* Tự sinh bởi scripts/build.js từ assets/lib/ocr-text.js và i18n/en/js/ — đừng sửa tay. */
/* Hậu xử lý chữ nhận dạng (OCR): nối các dòng bị ngắt giữa đoạn, dọn khoảng trắng. Hàm thuần, có test. */

/** Dọn khoảng trắng thừa, giữ đoạn (dòng trống) */
export function tidy(text) {
  return String(text || "").replace(/\r/g, "").replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Nối các dòng trong cùng một đoạn thành một dòng (đoạn ngăn bằng dòng trống).
 * Giữ xuống dòng khi dòng sau bắt đầu bằng gạch đầu dòng / số thứ tự, khi dòng trước kết thúc bằng dấu ":",
 * hoặc khi dòng trước ngắn hẳn so với dòng dài nhất (tiêu đề, dòng cuối đoạn): dưới 60%, hay dưới 85% mà kết thúc câu.
 */
export function joinLines(text) {
  return tidy(text).split(/\n\n/).map((para) => {
    const lines = para.split("\n"), longest = Math.max(...lines.map((l) => l.length));
    let out = lines[0] || "";
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i], prev = lines[i - 1], k = prev.length / longest;
      const ends = longest >= 30 && (k < 0.6 || (k < 0.85 && /[.!?…:]$/.test(prev)));
      if (/^([-–•*+]|\d+[.)]|[a-zđ][.)])\s/i.test(l) || /:$/.test(out) || ends) out += "\n" + l;
      else out += " " + l;
    }
    return out;
  }).join("\n\n");
}
