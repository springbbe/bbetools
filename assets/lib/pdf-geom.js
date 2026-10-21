/* Hình học trang PDF cho các công cụ vẽ thêm lên trang (đánh số, watermark, ký) và tạo trang (ảnh sang PDF).
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/pdf-geom.test.js
   Quy ước "toạ độ nhìn thấy" (visual): gốc ở góc trên trái của trang như người xem thấy (đã tính /Rotate), đơn vị pt. */

export const MM = 72 / 25.4;
export const PAPER = { a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4], legal: [215.9, 355.6] };

/** Hình học của một trang: box = CropBox { x, y, width, height }, rotation = /Rotate (độ) */
export function geom(box, rotation = 0) {
  const r = (((rotation || 0) % 360) + 360) % 360;
  return { x0: box.x, y0: box.y, W: box.width, H: box.height, r, VW: r % 180 ? box.height : box.width, VH: r % 180 ? box.width : box.height };
}

/** Điểm nhìn thấy (vx tính từ trái, vy tính từ DƯỚI lên) → toạ độ người dùng của PDF */
export function toUser(g, vx, vy) {
  switch (g.r) {
    case 90: return [g.x0 + g.W - vy, g.y0 + vx];
    case 180: return [g.x0 + g.W - vx, g.y0 + g.H - vy];
    case 270: return [g.x0 + vy, g.y0 + g.H - vx];
    default: return [g.x0 + vx, g.y0 + vy];
  }
}

/** Hộp { x, y (từ TRÊN xuống), w, h, angle } theo toạ độ nhìn thấy, xoay angle độ ngược chiều kim đồng hồ quanh tâm
    → tham số cho page.drawImage / drawText của pdf-lib: { x, y, width, height, rotate (độ) } */
export function place(g, box) {
  const angle = box.angle || 0, a = (angle * Math.PI) / 180;
  const cx = box.x + box.w / 2, cy = g.VH - (box.y + box.h / 2);
  const ax = cx - ((box.w / 2) * Math.cos(a) - (box.h / 2) * Math.sin(a));
  const ay = cy - ((box.w / 2) * Math.sin(a) + (box.h / 2) * Math.cos(a));
  const [x, y] = toUser(g, ax, ay);
  return { x, y, width: box.w, height: box.h, rotate: (angle + g.r) % 360 };
}

/* ---------- Ảnh sang PDF ---------- */

/** Khổ trang (mm) cho một ảnh iw×ih (px, đã xoay). o: { size: "a4"|"a5"|"letter"|"fit", orient: "p"|"l"|"auto", margin (mm) } */
export function imagePageSize(iw, ih, o) {
  if (o.size === "fit") {
    const s = 297 / Math.max(iw, ih); // cạnh dài = 297 mm (như A4)
    return [iw * s + 2 * o.margin, ih * s + 2 * o.margin];
  }
  const [pw, ph] = PAPER[o.size] || PAPER.a4;
  const land = o.orient === "l" || (o.orient === "auto" && iw > ih);
  return land ? [ph, pw] : [pw, ph];
}

/** Đặt ảnh iw×ih vừa trong trang pw×ph có lề m (cùng đơn vị), căn giữa, không phóng to quá kích thước khung → { x, y (từ dưới), w, h } */
export function fitBox(pw, ph, m, iw, ih) {
  const s = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih);
  const w = iw * s, h = ih * s;
  return { x: (pw - w) / 2, y: (ph - h) / 2, w, h };
}

/* ---------- Đánh số trang ---------- */

/** Nhãn số trang của trang idx (0-based) trong total trang. o: { fmt: "Trang {n} / {N}", start, skip } → chuỗi hoặc null (không đánh) */
export function pageLabel(o, idx, total) {
  const skip = o.skip || 0, start = o.start == null ? 1 : o.start;
  if (idx < skip) return null;
  const n = start + idx - skip, N = start + total - 1 - skip;
  return o.fmt.replace(/\{n\}/g, n).replace(/\{N\}/g, N);
}

/** Vị trí chữ (toạ độ nhìn thấy, vy từ DƯỚI) cho vị trí pos ("tl","tc","tr","bl","bc","br"), chữ rộng tw, cỡ size, cách mép margin */
export function labelPos(VW, VH, pos, tw, size, margin) {
  const vx = pos[1] === "l" ? margin : pos[1] === "r" ? VW - margin - tw : (VW - tw) / 2;
  const vy = pos[0] === "b" ? margin : VH - margin - size * 0.72;
  return [vx, vy];
}

/* ---------- Watermark ---------- */

/** Các vị trí (tâm, toạ độ nhìn thấy từ trên trái) của dấu w×h trên trang VW×VH.
    o: { angle (độ), pos: "tl".."br" (3×3, "mc" = chính giữa), tile: lặp kín trang, margin } → [{ cx, cy }] */
export function markLayout(VW, VH, w, h, o) {
  const a = ((o.angle || 0) * Math.PI) / 180;
  const bw = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
  const bh = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  const out = [];
  if (o.tile) {
    const sx = bw + Math.max(40, w * 0.35), sy = bh + Math.max(40, h * 1.5);
    for (let row = 0, cy = sy / 2 - 10; cy < VH + bh / 2; cy += sy, row++)
      for (let cx = (row % 2 ? sx / 2 : 0) + bw / 2 - 20; cx < VW + bw / 2; cx += sx) out.push({ cx, cy });
    return out;
  }
  const m = o.margin == null ? 28 : o.margin, pos = o.pos || "mc";
  const cx = pos[1] === "l" ? m + bw / 2 : pos[1] === "r" ? VW - m - bw / 2 : VW / 2;
  const cy = pos[0] === "t" ? m + bh / 2 : pos[0] === "b" ? VH - m - bh / 2 : VH / 2;
  out.push({ cx, cy });
  return out;
}

/** "#1A4FA0" → [r, g, b] trong khoảng 0..1 */
export function hexRgb(hex) {
  const s = String(hex || "#000").replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
}
