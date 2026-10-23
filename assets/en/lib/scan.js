/* Tự sinh bởi scripts/build.js từ assets/lib/scan.js và i18n/en/js/ — đừng sửa tay. */
/* Xử lý ảnh cho Scan tài liệu: tìm 4 góc tờ giấy, nắn thẳng phối cảnh (homography), làm trắng nền, thang xám, đen trắng.
   Ảnh là { data: Uint8ClampedArray RGBA, width, height }. Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/scan.test.js */

/** Ảnh xám (Uint8Array) từ RGBA */
export function toGray(img) {
  const { data, width: w, height: h } = img, g = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
  return g;
}

/** Ngưỡng Otsu của ảnh xám */
export function otsu(g) {
  const hist = new Array(256).fill(0);
  for (const v of g) hist[v]++;
  const total = g.length;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, th = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; th = t; }
  }
  return th;
}

/** Làm mờ hộp bán kính r (ảnh xám) */
export function boxBlur(g, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0, n = 0;
    for (let x = -r; x < w; x++) {
      if (x + r < w) { acc += g[y * w + x + r]; n++; }
      if (x - r - 1 >= 0) { acc -= g[y * w + x - r - 1]; n--; }
      if (x >= 0) tmp[y * w + x] = acc / n;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0, n = 0;
    for (let y = -r; y < h; y++) {
      if (y + r < h) { acc += tmp[(y + r) * w + x]; n++; }
      if (y - r - 1 >= 0) { acc -= tmp[(y - r - 1) * w + x]; n--; }
      if (y >= 0) out[y * w + x] = Math.round(acc / n);
    }
  }
  return out;
}

/** Sắp 4 điểm theo thứ tự: trên trái, trên phải, dưới phải, dưới trái */
export function orderCorners(pts) {
  const s = pts.map((p) => p[0] + p[1]), d = pts.map((p) => p[0] - p[1]);
  const at = (arr, f) => pts[arr.indexOf(f(...arr))];
  return [at(s, Math.min), at(d, Math.max), at(s, Math.max), at(d, Math.min)];
}

/**
 * Tìm 4 góc tờ giấy (sáng hơn nền) trong ảnh xám nhỏ w×h → [[x,y]×4] theo thứ tự TL, TR, BR, BL, hoặc null nếu không thấy.
 * Cách làm: làm mờ, ngưỡng Otsu, lấy vùng sáng liền mạch lớn nhất, góc = điểm cực trị của x+y và x−y.
 */
export function detectCorners(g, w, h) {
  const b = boxBlur(g, w, h, 2), th = otsu(b);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = b[i] > th ? 1 : 0;
  const label = new Int32Array(w * h), stack = new Int32Array(w * h);
  let best = 0, bestId = 0, id = 0;
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i]) continue;
    id++; let sp = 0, size = 0; stack[sp++] = i; label[i] = id;
    while (sp) {
      const k = stack[--sp]; size++;
      const x = k % w, y = (k - x) / w;
      if (x > 0 && mask[k - 1] && !label[k - 1]) { label[k - 1] = id; stack[sp++] = k - 1; }
      if (x < w - 1 && mask[k + 1] && !label[k + 1]) { label[k + 1] = id; stack[sp++] = k + 1; }
      if (y > 0 && mask[k - w] && !label[k - w]) { label[k - w] = id; stack[sp++] = k - w; }
      if (y < h - 1 && mask[k + w] && !label[k + w]) { label[k + w] = id; stack[sp++] = k + w; }
    }
    if (size > best) { best = size; bestId = id; }
  }
  const area = best / (w * h);
  if (area < 0.12 || area > 0.985) return null; // không rõ tờ giấy (quá nhỏ, hoặc chiếm hết ảnh)
  let tl = [0, 0], tr = [0, 0], br = [0, 0], bl = [0, 0], mins = Infinity, maxs = -Infinity, mind = Infinity, maxd = -Infinity;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (label[y * w + x] !== bestId) continue;
    const s = x + y, d = x - y;
    if (s < mins) { mins = s; tl = [x, y]; }
    if (s > maxs) { maxs = s; br = [x, y]; }
    if (d > maxd) { maxd = d; tr = [x, y]; }
    if (d < mind) { mind = d; bl = [x, y]; }
  }
  return [tl, tr, br, bl];
}

/** Ma trận homography 3×3 (mảng 9 số, h33 = 1) biến 4 điểm src thành 4 điểm dst */
export function homography(src, dst) {
  const A = [], bv = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); bv.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); bv.push(v);
  }
  // khử Gauss có chọn trụ
  const n = 8, M = A.map((r, i) => [...r, bv[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return [...M.map((r, i) => r[n] / r[i]), 1];
}
export const project = (H, x, y) => { const d = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / d, (H[3] * x + H[4] * y + H[5]) / d]; };

/** Kích thước ảnh sau khi nắn (px) từ 4 góc: cạnh trung bình */
export function quadSize(q) {
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  return [Math.round((dist(q[0], q[1]) + dist(q[3], q[2])) / 2), Math.round((dist(q[0], q[3]) + dist(q[1], q[2])) / 2)];
}

/** Nắn ảnh: vùng tứ giác quad (TL, TR, BR, BL) trong img → ảnh chữ nhật dw×dh (nội suy song tuyến) */
export function warp(img, quad, dw, dh) {
  const H = homography([[0, 0], [dw - 1, 0], [dw - 1, dh - 1], [0, dh - 1]], quad);
  const { data: s, width: sw, height: sh } = img, out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const d = H[6] * x + H[7] * y + 1;
      let fx = (H[0] * x + H[1] * y + H[2]) / d, fy = (H[3] * x + H[4] * y + H[5]) / d;
      fx = Math.max(0, Math.min(sw - 1.001, fx)); fy = Math.max(0, Math.min(sh - 1.001, fy));
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, i = (y0 * sw + x0) * 4, o = (y * dw + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = s[i + c] * (1 - ax) + s[i + 4 + c] * ax, bot = s[i + sw * 4 + c] * (1 - ax) + s[i + sw * 4 + 4 + c] * ax;
        out[o + c] = top * (1 - ay) + bot * ay;
      }
      out[o + 3] = 255;
    }
  }
  return { data: out, width: dw, height: dh };
}

/** Ước lượng màu nền giấy (ảnh xám nhỏ đã làm mờ, lấy gần giá trị sáng nhất quanh mỗi điểm) → hàm bg(x, y) */
function paperLevel(img, cell) {
  const { data, width: w, height: h } = img;
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell), grid = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    // giá trị sáng thứ 90% trong ô (bỏ qua mực)
    const vals = [];
    for (let y = gy * cell; y < Math.min(h, (gy + 1) * cell); y += 2) for (let x = gx * cell; x < Math.min(w, (gx + 1) * cell); x += 2) {
      const i = (y * w + x) * 4; vals.push((data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8);
    }
    vals.sort((a, b) => a - b);
    grid[gy * gw + gx] = Math.max(40, vals[Math.floor(vals.length * 0.9)] || 255);
  }
  return (x, y) => {
    const fx = Math.min(gw - 1, Math.max(0, x / cell - 0.5)), fy = Math.min(gh - 1, Math.max(0, y / cell - 0.5));
    const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1), ax = fx - x0, ay = fy - y0;
    return (grid[y0 * gw + x0] * (1 - ax) + grid[y0 * gw + x1] * ax) * (1 - ay) + (grid[y1 * gw + x0] * (1 - ax) + grid[y1 * gw + x1] * ax) * ay;
  };
}

/** Bộ lọc: "color" (giữ màu, làm trắng nền), "gray" (xám, làm trắng nền), "bw" (đen trắng), "none" (giữ nguyên). Sửa trực tiếp img */
export function enhance(img, mode) {
  if (mode === "none") return img;
  const { data, width: w, height: h } = img, bg = paperLevel(img, Math.max(16, Math.round(Math.max(w, h) / 24)));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, k = 255 / bg(x, y);
    if (mode === "color") {
      // chia cho màu nền rồi kéo giãn tương phản nhẹ: giấy thành trắng, mực đậm hơn
      for (let c = 0; c < 3; c++) { const v = Math.min(255, data[i + c] * k); data[i + c] = v > 235 ? 255 : v * 1.06 - 12; }
    } else {
      const v = Math.min(255, ((data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8) * k);
      const out = mode === "bw" ? (v > 168 ? 255 : 0) : v > 232 ? 255 : Math.max(0, v * 1.12 - 28);
      data[i] = data[i + 1] = data[i + 2] = out;
    }
  }
  return img;
}

/** Xoay ảnh 90° × n theo chiều kim đồng hồ */
export function rotate90(img, n) {
  n = ((n % 4) + 4) % 4;
  if (!n) return img;
  const { data, width: w, height: h } = img, sw = n % 2 ? h : w, sh = n % 2 ? w : h, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [nx, ny] = n === 1 ? [h - 1 - y, x] : n === 2 ? [w - 1 - x, h - 1 - y] : [y, w - 1 - x];
    const i = (y * w + x) * 4, o = (ny * sw + nx) * 4;
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = data[i + 3];
  }
  return { data: out, width: sw, height: sh };
}
