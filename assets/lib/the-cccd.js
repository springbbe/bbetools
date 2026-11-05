/* In CCCD 2 mặt: hình học thẻ ID-1 (85,6 × 54 mm, ISO/IEC 7810), bù góc bo tròn khi tự tìm mép thẻ,
   xếp thẻ lên trang A4 đúng kích thước thật, cân sáng ảnh thẻ.
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/the-cccd.test.js */
import { homography, project } from "./scan.js";

/** Thẻ ID-1 (mm): rộng, cao, bán kính góc */
export const CARD = { w: 85.6, h: 54, r: 3.18 };

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Xoay thứ tự 4 góc (TL, TR, BR, BL) n lần: mỗi lần là ảnh kết quả xoay 90° theo chiều kim đồng hồ */
export function turnQuad(q, n) {
  n = ((n % 4) + 4) % 4;
  return q.map((_, i) => q[(i - n + 4) % 4]);
}

/** Số lần xoay để cạnh trên là cạnh dài (thẻ nằm ngang): 0 hoặc 1 */
export function landscapeTurns(q) {
  const top = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2, side = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  return side > top * 1.05 ? 1 : 0;
}

/**
 * Bù góc bo tròn: dò mép thẻ bằng điểm xa nhất theo đường chéo (x+y, x−y) cho điểm nằm trên cung tròn của góc,
 * lùi vào trong r(1 − 1/√2) mỗi chiều so với góc thật. Từ 4 điểm đó suy ra 4 góc thật của thẻ (có tính phối cảnh).
 * q: 4 góc đã xếp theo hướng thẻ (TL, TR, BR, BL), thẻ nằm ngang.
 */
export function cornerFix(q, card = CARD) {
  const d = card.r * (1 - Math.SQRT1_2);
  const inner = [[d, d], [card.w - d, d], [card.w - d, card.h - d], [d, card.h - d]];
  const H = homography(inner, q);
  if (!H) return q;
  return [[0, 0], [card.w, 0], [card.w, card.h], [0, card.h]].map(([x, y]) => project(H, x, y));
}

/**
 * Xếp các bộ thẻ (mỗi bộ: mặt trước + mặt sau) lên trang.
 * o: { copies: số bộ, arrange: "stack" (trên – dưới) | "side" (cạnh nhau), sides: 1 | 2, pos: "center" | "top",
 *      page: [rộng, cao] mm, gap: khoảng cách giữa 2 mặt, unitGap: khoảng cách giữa các bộ, margin }
 * → [{ x, y, w, h, side: 0 (trước) | 1 (sau) }] theo mm, gốc ở góc trên trái trang; null nếu không vừa trang.
 */
export function layoutCards(o) {
  const [pw, ph] = o.page || [210, 297];
  const copies = Math.max(1, o.copies || 1), sides = o.sides === 1 ? 1 : 2, side = o.arrange === "side" && sides === 2;
  const gap = o.gap ?? 12, ug = o.unitGap ?? 16, m = o.margin ?? 10;
  const uw = side ? CARD.w * 2 + gap : CARD.w, uh = side || sides === 1 ? CARD.h : CARD.h * 2 + gap;
  let cols = Math.max(1, Math.floor((pw - 2 * m + ug) / (uw + ug)));
  cols = Math.min(cols, copies);
  const rows = Math.ceil(copies / cols);
  const gw = cols * uw + (cols - 1) * ug, gh = rows * uh + (rows - 1) * ug;
  if (gw > pw - 2 * m + 1e-6 || gh > ph - 2 * m + 1e-6) return null;
  const x0 = (pw - gw) / 2, y0 = o.pos === "top" && rows === 1 ? Math.min(25, (ph - gh) / 2) : (ph - gh) / 2;
  const out = [];
  for (let k = 0; k < copies; k++) {
    const c = k % cols, r = Math.floor(k / cols), ux = x0 + c * (uw + ug), uy = y0 + r * (uh + ug);
    out.push({ x: ux, y: uy, w: CARD.w, h: CARD.h, side: 0 });
    if (sides === 2) out.push(side ? { x: ux + CARD.w + gap, y: uy, w: CARD.w, h: CARD.h, side: 1 } : { x: ux, y: uy + CARD.h + gap, w: CARD.w, h: CARD.h, side: 1 });
  }
  return out;
}

/**
 * Cân sáng ảnh thẻ chụp bằng điện thoại (sửa trực tiếp img { data RGBA, width, height }).
 * Không dùng bộ "làm trắng nền" của giấy tờ (lib/scan.js): ô lưới nhỏ nằm gọn trong ảnh chân dung sẽ bị làm bạc màu.
 * Ở đây: bù ánh sáng không đều bằng lưới thô 4×3 (mỗi ô lớn hơn ảnh chân dung), rồi kéo điểm trắng / đen theo từng kênh.
 * mode: "color" | "gray" | "none"
 */
export function toneCard(img, mode) {
  if (mode === "none") return img;
  const { data, width: w, height: h } = img, n = w * h;
  const lum = (i) => (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  // 1. độ sáng nền từng ô (bách phân vị 90), nội suy song tuyến → hệ số bù
  const GX = 4, GY = 3, grid = new Float32Array(GX * GY);
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    const hist = new Uint32Array(256);
    let cnt = 0;
    for (let y = Math.floor((gy * h) / GY); y < Math.floor(((gy + 1) * h) / GY); y += 2)
      for (let x = Math.floor((gx * w) / GX); x < Math.floor(((gx + 1) * w) / GX); x += 2) { hist[lum((y * w + x) * 4)]++; cnt++; }
    grid[gy * GX + gx] = Math.max(60, pct(hist, cnt, 0.9));
  }
  const top = Math.max(...grid);
  const gain = (x, y) => {
    const fx = Math.min(GX - 1, Math.max(0, (x / w) * GX - 0.5)), fy = Math.min(GY - 1, Math.max(0, (y / h) * GY - 0.5));
    const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(GX - 1, x0 + 1), y1 = Math.min(GY - 1, y0 + 1), ax = fx - x0, ay = fy - y0;
    const v = (grid[y0 * GX + x0] * (1 - ax) + grid[y0 * GX + x1] * ax) * (1 - ay) + (grid[y1 * GX + x0] * (1 - ax) + grid[y1 * GX + x1] * ax) * ay;
    return Math.min(1.6, top / v);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, k = gain(x, y);
    data[i] = Math.min(255, data[i] * k); data[i + 1] = Math.min(255, data[i + 1] * k); data[i + 2] = Math.min(255, data[i + 2] * k);
  }
  // 2. điểm trắng theo từng kênh (cân màu: nền ám vàng/xanh thành trung tính), điểm đen theo độ sáng
  const hs = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)], hl = new Uint32Array(256);
  let cnt = 0;
  for (let i = 0; i < n * 4; i += 12) { hs[0][data[i]]++; hs[1][data[i + 1]]++; hs[2][data[i + 2]]++; hl[lum(i)]++; cnt++; }
  const white = hs.map((hh) => Math.max(80, pct(hh, cnt, 0.97))), black = Math.min(90, pct(hl, cnt, 0.01));
  for (let i = 0; i < n * 4; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = ((data[i + c] - black * 0.7) / (white[c] - black * 0.7)) * 250;
      data[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    if (mode === "gray") { const v = lum(i); data[i] = data[i + 1] = data[i + 2] = v; }
  }
  return img;
}
function pct(hist, total, p) {
  const want = total * p;
  let acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= want) return v; }
  return 255;
}

/** Góc nghiêng (độ, âm = đi lên từ trái sang phải) và cỡ chữ (px) cho dòng chữ chéo trên ảnh thẻ w×h, chữ rộng tw ở cỡ 100 px */
export function stampFit(w, h, tw, lines = 1) {
  const angle = -Math.atan2(h, w) * (180 / Math.PI) * 0.75;
  const a = (Math.abs(angle) * Math.PI) / 180;
  // vừa trong thẻ: bề ngang chiếu lên hai trục không vượt quá 86% cạnh thẻ
  const size = Math.min((0.86 * w) / ((tw / 100) * Math.cos(a) + 1.25 * lines * Math.sin(a)), (0.86 * h) / ((tw / 100) * Math.sin(a) + 1.25 * lines * Math.cos(a)), h / 7);
  return { angle, size };
}

/** Chia dòng chữ dài (trên ~28 ký tự) thành 2 dòng ở khoảng trắng gần giữa nhất */
export function splitStamp(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= 28) return t ? [t] : [];
  let best = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (best < 0 || Math.abs(i - t.length / 2) < Math.abs(best - t.length / 2))) best = i;
  return best < 0 ? [t] : [t.slice(0, best), t.slice(best + 1)];
}

/**
 * Tinh chỉnh 4 góc thẻ: dò lại từng cạnh trên ảnh xám g (w×h, độ phân giải cao hơn ảnh dùng để tìm sơ bộ).
 * Với mỗi cạnh, lấy ~40 điểm ở đoạn giữa (bỏ phần góc bo tròn), tìm chỗ đổi từ tối (nền) sang sáng (thẻ) mạnh nhất
 * dọc pháp tuyến, khớp đường thẳng (bỏ điểm lạc), rồi lấy giao điểm của các cạnh kề nhau làm góc thật.
 * q: 4 góc sơ bộ theo chiều kim đồng hồ trên ảnh (thứ tự nào cũng được, miễn đi vòng). Trả về 4 góc mới hoặc null nếu không chắc.
 */
export function refineQuad(g, w, h, q) {
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return -1;
    const x0 = x | 0, y0 = y | 0, ax = x - x0, ay = y - y0, i = y0 * w + x0;
    return (g[i] * (1 - ax) + g[i + 1] * ax) * (1 - ay) + (g[i + w] * (1 - ax) + g[i + w + 1] * ax) * ay;
  };
  const lines = [];
  for (let e = 0; e < 4; e++) {
    const P = q[e], Q = q[(e + 1) % 4], len = dist(P, Q);
    if (len < 20) return null;
    const dx = (Q[0] - P[0]) / len, dy = (Q[1] - P[1]) / len, nx = -dy, ny = dx; // pháp tuyến hướng vào trong (đi vòng thuận chiều kim đồng hồ, trục y hướng xuống)
    const S = Math.max(6, Math.round(len * 0.04)), pts = [];
    for (let k = 0; k <= 40; k++) {
      const t = 0.12 + (0.76 * k) / 40, bx = P[0] + (Q[0] - P[0]) * t, by = P[1] + (Q[1] - P[1]) * t;
      let best = 0, bs = 0;
      const v = [];
      for (let s = -S - 1; s <= S + 1; s++) v.push(at(bx + nx * s, by + ny * s));
      if (v.includes(-1)) continue;
      // mép thẻ là chỗ đổi tối → sáng NGOÀI CÙNG đủ mạnh (≥ 60% chỗ mạnh nhất); chữ in sát mép thẻ (dòng mã máy đọc)
      // còn tương phản mạnh hơn mép thẻ nên không lấy chỗ mạnh nhất
      const grad = [];
      for (let s = -S; s <= S; s++) grad.push(v[s + S + 2] - v[s + S]);
      const top = Math.max(...grad);
      if (top < 12) continue; // không có mép rõ
      for (let j = 0; j < grad.length; j++) if (grad[j] >= 0.6 * top && (j === grad.length - 1 || grad[j] >= grad[j + 1])) { best = grad[j]; bs = j - S; break; }
      // nội suy parabol quanh đỉnh để lấy vị trí dưới 1 điểm ảnh
      const gm = v[bs + S + 1] - v[bs + S - 1], gp = v[bs + S + 3] - v[bs + S + 1], den = gm - 2 * best + gp;
      const sub = bs + (den < 0 && Math.abs(bs) < S ? (0.5 * (gm - gp)) / den : 0);
      pts.push([bx + nx * sub, by + ny * sub]);
    }
    const L = fitLine(pts);
    if (!L) return null;
    lines.push(L);
  }
  const out = [];
  for (let i = 0; i < 4; i++) {
    const p = intersect(lines[(i + 3) % 4], lines[i]);
    if (!p || dist(p, q[i]) > 0.08 * dist(q[0], q[2])) return null;
    out.push(p);
  }
  return out;
}
// đường thẳng qua tập điểm (bình phương nhỏ nhất theo khoảng cách vuông góc), bỏ điểm lạc rồi khớp lại → { cx, cy, dx, dy }
function fitLine(pts) {
  for (let round = 0; round < 3; round++) {
    if (pts.length < 8) return null;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x; cy += y; }
    cx /= pts.length; cy /= pts.length;
    let sxx = 0, sxy = 0, syy = 0;
    for (const [x, y] of pts) { sxx += (x - cx) ** 2; sxy += (x - cx) * (y - cy); syy += (y - cy) ** 2; }
    const a = 0.5 * Math.atan2(2 * sxy, sxx - syy), L = { cx, cy, dx: Math.cos(a), dy: Math.sin(a) };
    const d = pts.map(([x, y]) => Math.abs((x - cx) * L.dy - (y - cy) * L.dx));
    const lim = Math.max(1.5, 2.5 * [...d].sort((p, r) => p - r)[Math.floor(d.length / 2)]);
    const keep = pts.filter((_, i) => d[i] <= lim);
    if (keep.length === pts.length || round === 2) return keep.length >= 8 ? L : null;
    pts = keep;
  }
  return null;
}
function intersect(A, B) {
  const den = A.dx * B.dy - A.dy * B.dx;
  if (Math.abs(den) < 0.2) return null; // hai cạnh gần song song
  const t = ((B.cx - A.cx) * B.dy - (B.cy - A.cy) * B.dx) / den;
  return [A.cx + A.dx * t, A.cy + A.dy * t];
}
