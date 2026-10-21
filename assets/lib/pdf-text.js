/* Ghép chữ của một trang PDF từ các mảnh (text items) mà pdf.js trả về, và nối dòng bị ngắt giữa câu.
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/pdf-text.test.js */

/** items: [{ str, transform: [a,b,c,d,x,y], width, height, hasEOL }] (từ page.getTextContent()) → chuỗi */
export function itemsToText(items) {
  let out = "", lastY = null, lastEnd = null;
  for (const it of items) {
    if (!it || typeof it.str !== "string") continue;
    const x = it.transform[4], y = it.transform[5], hgt = it.height || 10;
    if (lastY !== null && Math.abs(y - lastY) > Math.max(2, hgt * 0.6) && !out.endsWith("\n")) out += "\n";
    else if (lastEnd !== null && x - lastEnd > hgt * 0.25 && !/\s$/.test(out) && it.str && !/^\s/.test(it.str)) out += " ";
    out += it.str;
    if (it.hasEOL && !out.endsWith("\n")) out += "\n";
    if (it.str || it.hasEOL) { lastY = y; lastEnd = x + (it.width || 0); }
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Nối các dòng bị ngắt giữa câu (dòng sau bắt đầu bằng chữ thường, số hoặc ngoặc) — hợp khi dán vào Word, Zalo */
export const joinLines = (t) => t.replace(/([^\n.!?:;])\n(?=[\p{Ll}0-9(“"])/gu, "$1 ");

/** Đếm ký tự không phải khoảng trắng (để nhận ra PDF scan, gần như không có chữ) */
export const charCount = (t) => t.replace(/\s/g, "").length;
