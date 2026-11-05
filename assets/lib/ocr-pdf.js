/* PDF scan thành PDF tìm kiếm được: đổi kết quả nhận dạng của Tesseract (toạ độ điểm ảnh trên ảnh trang đã vẽ)
   thành vị trí đặt chữ ẩn trên trang PDF (toạ độ người dùng, đã tính /Rotate và CropBox).
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/ocr-pdf.test.js */
import { toUser } from "./pdf-geom.js";

/**
 * lines: [{ baseline: { x0, y0, x1, y1 }, bbox, rowAttributes: { rowHeight }, words: [{ text, bbox: { x0, y0, x1, y1 } }] }]
 *        (data.blocks[].paragraphs[].lines[] của tesseract.js), ảnh rộng iw × cao ih px, là trang nhìn thấy VW × VH pt.
 * g: geom(cropBox, rotation) của lib/pdf-geom.js.
 * → [{ text, x, y (điểm đầu đường chân chữ, toạ độ PDF), size (pt), angle (độ, ngược chiều kim đồng hồ), width (pt) }]
 */
export function placeWords(lines, iw, ih, g) {
  const sx = g.VW / iw, sy = g.VH / ih, out = [];
  for (const L of lines || []) {
    const b = L.baseline || { x0: L.bbox.x0, y0: L.bbox.y1, x1: L.bbox.x1, y1: L.bbox.y1 };
    const dx = (b.x1 - b.x0) * sx, dy = (b.y1 - b.y0) * sy;
    const tilt = dx > 0 ? -Math.atan2(dy, dx) : 0; // ảnh: trục y hướng xuống
    const rh = (L.rowAttributes && L.rowAttributes.rowHeight) || (L.bbox.y1 - L.bbox.y0) * 0.85;
    const size = Math.max(1, rh * sy);
    for (const w of L.words || []) {
      const text = String(w.text || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      // điểm trên đường chân chữ ngay dưới mép trái của từ
      const f = b.x1 > b.x0 ? (w.bbox.x0 - b.x0) / (b.x1 - b.x0) : 0;
      const by = b.y0 + (b.y1 - b.y0) * f;
      const [x, y] = toUser(g, w.bbox.x0 * sx, g.VH - by * sy);
      const width = Math.max(0.5, ((w.bbox.x1 - w.bbox.x0) * sx) / Math.cos(tilt));
      out.push({ text, x, y, size, angle: (((tilt * 180) / Math.PI + g.r) % 360 + 360) % 360, width });
    }
  }
  return out;
}

/** Tỉ lệ nén ngang (toán tử Tz, %) để chữ rộng natural (pt, ở cỡ đã chọn) phủ đúng bề ngang width của từ trên ảnh */
export const squeeze = (width, natural) => (natural > 0 ? Math.max(5, Math.min(1000, (100 * width) / natural)) : 100);

/** Các dòng của kết quả Tesseract (data.blocks) */
export const linesOf = (data) => (data && data.blocks ? data.blocks.flatMap((b) => (b.paragraphs || []).flatMap((p) => p.lines || [])) : []);
