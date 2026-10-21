/* Hình học cho công cụ ảnh: tính kích thước khi đổi cỡ, khung cắt (theo tỉ lệ, kéo góc/cạnh), xoay/lật. Hàm thuần, có test. */

const round = (x) => Math.max(1, Math.round(x));

/**
 * Kích thước mới khi đổi cỡ ảnh w×h.
 * o.mode: "px" { width, height, keep (giữ tỉ lệ, mặc định true) } – nhập một cạnh thì cạnh kia tự tính; nhập cả hai thì ảnh vừa khít trong khung
 *         "pct" { pct }  ·  "long" { long } (cạnh dài nhất)  ·  "short" { short } (cạnh ngắn nhất)
 * o.noUpscale: không phóng to quá cỡ gốc.
 */
export function fitSize(w, h, o) {
  let W = w, H = h;
  if (o.mode === "pct") { const k = (+o.pct || 100) / 100; W = w * k; H = h * k; }
  else if (o.mode === "long" || o.mode === "short") {
    const target = +(o.mode === "long" ? o.long : o.short);
    if (target > 0) { const k = target / (o.mode === "long" ? Math.max(w, h) : Math.min(w, h)); W = w * k; H = h * k; }
  } else {
    const tw = +o.width || 0, th = +o.height || 0, keep = o.keep !== false;
    if (!keep) { W = tw || w; H = th || h; }
    else if (tw && th) { const k = Math.min(tw / w, th / h); W = w * k; H = h * k; }
    else if (tw) { W = tw; H = (h * tw) / w; }
    else if (th) { H = th; W = (w * th) / h; }
  }
  if (o.noUpscale && (W > w || H > h)) {
    const k = Math.min(w / W, h / H);
    W *= k; H *= k;
  }
  return [round(W), round(H)];
}

/** Kích thước sau khi xoay rot độ (bội của 90) */
export const rotatedSize = (w, h, rot) => (((rot % 180) + 180) % 180 === 90 ? [h, w] : [w, h]);

/** Chuẩn hoá góc về 0, 90, 180, 270 */
export const normRot = (r) => ((Math.round(r / 90) * 90) % 360 + 360) % 360;

/**
 * Ma trận vẽ ảnh w×h sau khi xoay rot (0/90/180/270, chiều kim đồng hồ) rồi lật (flipH, flipV, theo chiều nhìn thấy).
 * Trả về { width, height, m: [a, b, c, d, e, f] } để dùng với ctx.setTransform(...m); ctx.drawImage(img, 0, 0).
 */
export function orientMatrix(w, h, rot, flipH, flipV) {
  rot = normRot(rot);
  const [W, H] = rotatedSize(w, h, rot);
  // xoay quanh gốc rồi tịnh tiến về góc trên trái
  const R = { 0: [1, 0, 0, 1, 0, 0], 90: [0, 1, -1, 0, h, 0], 180: [-1, 0, 0, -1, w, h], 270: [0, -1, 1, 0, 0, w] }[rot];
  const F = [flipH ? -1 : 1, 0, 0, flipV ? -1 : 1, flipH ? W : 0, flipV ? H : 0];
  // M = F · R
  const m = [F[0] * R[0] + F[2] * R[1], F[1] * R[0] + F[3] * R[1], F[0] * R[2] + F[2] * R[3], F[1] * R[2] + F[3] * R[3], F[0] * R[4] + F[2] * R[5] + F[4], F[1] * R[4] + F[3] * R[5] + F[5]];
  return { width: W, height: H, m: m.map((x) => (Object.is(x, -0) ? 0 : x)) };
}

/** Áp ma trận [a,b,c,d,e,f] cho điểm (x, y) */
export const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/* ---------------- khung cắt ---------------- */

/** Khung lớn nhất có tỉ lệ ratio (rộng/cao) nằm giữa ảnh W×H. ratio 0 = cả ảnh */
export function centeredRect(W, H, ratio, scale = 1) {
  let w = W, h = H;
  if (ratio > 0) { if (W / H > ratio) { h = H; w = H * ratio; } else { w = W; h = W / ratio; } }
  w *= scale; h *= scale;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

/** Giữ khung trong ảnh, không nhỏ hơn min, làm tròn pixel */
export function clampRect(r, W, H, min = 1) {
  let w = Math.min(W, Math.max(min, r.w)), h = Math.min(H, Math.max(min, r.h));
  const x = Math.min(W - w, Math.max(0, r.x)), y = Math.min(H - h, Math.max(0, r.y));
  return { x, y, w, h };
}
export const roundRect = (r) => { const x = Math.round(r.x), y = Math.round(r.y); return { x, y, w: Math.round(r.x + r.w) - x, h: Math.round(r.y + r.h) - y }; };

/** Di chuyển khung (dx, dy), không ra khỏi ảnh */
export function moveRect(r, dx, dy, W, H) {
  return { ...r, x: Math.min(W - r.w, Math.max(0, r.x + dx)), y: Math.min(H - r.h, Math.max(0, r.y + dy)) };
}

/**
 * Kéo tay nắm handle ("n","s","e","w","ne","nw","se","sw") của khung r0 thêm (dx, dy).
 * ratio > 0: giữ tỉ lệ. Khung không vượt ảnh W×H và không nhỏ hơn min.
 */
export function resizeRect(r0, handle, dx, dy, W, H, ratio = 0, min = 8) {
  const L = handle.includes("w"), R = handle.includes("e"), T = handle.includes("n"), B = handle.includes("s");
  // cạnh cố định (đối diện tay nắm)
  let x1 = r0.x, y1 = r0.y, x2 = r0.x + r0.w, y2 = r0.y + r0.h;
  if (L) x1 = Math.min(x2 - min, Math.max(0, x1 + dx));
  if (R) x2 = Math.max(x1 + min, Math.min(W, x2 + dx));
  if (T) y1 = Math.min(y2 - min, Math.max(0, y1 + dy));
  if (B) y2 = Math.max(y1 + min, Math.min(H, y2 + dy));
  if (!(ratio > 0)) return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };

  const horiz = L || R, vert = T || B;
  let w = x2 - x1, h = y2 - y1;
  if (horiz && vert) { if (w / h > ratio) w = h * ratio; else h = w / ratio; }
  else if (horiz) h = w / ratio;
  else w = h * ratio;
  // điểm neo: góc/cạnh đối diện; với tay nắm giữa cạnh thì neo giữa cạnh kia
  const ax = L ? r0.x + r0.w : R ? r0.x : r0.x + r0.w / 2;
  const ay = T ? r0.y + r0.h : B ? r0.y : r0.y + r0.h / 2;
  // giới hạn trong ảnh theo không gian còn lại quanh điểm neo
  const maxW = L ? ax : R ? W - ax : 2 * Math.min(ax, W - ax);
  const maxH = T ? ay : B ? H - ay : 2 * Math.min(ay, H - ay);
  const k = Math.min(1, maxW / w, maxH / h);
  w *= k; h *= k;
  if (w < min) { w = min; h = min / ratio; }
  if (h < min) { h = min; w = min * ratio; }
  const x = L ? ax - w : R ? ax : ax - w / 2;
  const y = T ? ay - h : B ? ay : ay - h / 2;
  return clampRect({ x, y, w, h }, W, H, 1);
}

/** Đặt lại tỉ lệ cho khung đang có: giữ tâm, giữ diện tích gần nhất có thể, nằm trong ảnh */
export function applyRatio(r, ratio, W, H) {
  if (!(ratio > 0)) return r;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const area = r.w * r.h;
  let w = Math.sqrt(area * ratio), h = w / ratio;
  const k = Math.min(1, W / w, H / h);
  w *= k; h *= k;
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h }, W, H);
}

/* ---------------- chia ảnh, ghép ảnh ---------------- */

/** Chia ảnh W×H thành rows × cols ô, biên làm tròn để các ô khít nhau (không hụt, không chồng pixel) */
export function gridTiles(W, H, rows, cols) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = Math.round((c * W) / cols), y = Math.round((r * H) / rows);
    out.push({ row: r, col: c, x, y, w: Math.round(((c + 1) * W) / cols) - x, h: Math.round(((r + 1) * H) / rows) - y });
  }
  return out;
}

/**
 * Bố cục ghép nhiều ảnh. sizes: [[w, h]]. o.dir: "h" (ngang) | "v" (dọc) | "grid" (lưới o.cols cột)
 * o.match (ngang/dọc): đưa mọi ảnh về cùng chiều cao (ngang) / chiều rộng (dọc) – lấy theo ảnh lớn nhất.
 * Lưới: mọi ô cùng cỡ o.cell × (o.cell / tỉ lệ ảnh đầu); o.fit: "cover" (cắt vừa ô) | "contain" (giữ trọn ảnh).
 * o.gap: khoảng cách (px), cũng là lề ngoài. o.max: giới hạn cạnh dài của ảnh ghép (thu nhỏ đều nếu vượt).
 * Trả về { W, H, cells: [{ x, y, w, h, sx, sy, sw, sh }] } (sx… là vùng lấy từ ảnh gốc).
 */
export function mergeLayout(sizes, o) {
  const gap = Math.max(0, o.gap || 0), n = sizes.length;
  let cells = [], W = 0, H = 0;
  const full = (w, h) => ({ sx: 0, sy: 0, sw: w, sh: h });
  if (o.dir === "grid") {
    const cols = Math.max(1, Math.min(n, o.cols || 2)), rows = Math.ceil(n / cols);
    const cw = o.cell || 800, ch = Math.round(cw * (sizes[0][1] / sizes[0][0]));
    sizes.forEach(([w, h], i) => {
      const cx = gap + (i % cols) * (cw + gap), cy = gap + Math.floor(i / cols) * (ch + gap);
      if (o.fit === "contain") {
        const k = Math.min(cw / w, ch / h), dw = w * k, dh = h * k;
        cells.push({ x: cx + (cw - dw) / 2, y: cy + (ch - dh) / 2, w: dw, h: dh, ...full(w, h) });
      } else {
        const k = Math.max(cw / w, ch / h), sw = cw / k, sh = ch / k;
        cells.push({ x: cx, y: cy, w: cw, h: ch, sx: (w - sw) / 2, sy: (h - sh) / 2, sw, sh });
      }
    });
    W = gap + cols * (cw + gap); H = gap + rows * (ch + gap);
  } else {
    const hor = o.dir !== "v";
    const T = Math.max(...sizes.map(([w, h]) => (hor ? h : w)));
    let pos = gap;
    sizes.forEach(([w, h]) => {
      const k = o.match === false ? 1 : T / (hor ? h : w), dw = w * k, dh = h * k;
      // không cùng cỡ: căn giữa theo chiều kia
      const off = gap + (T - (hor ? dh : dw)) / 2;
      cells.push(hor ? { x: pos, y: off, w: dw, h: dh, ...full(w, h) } : { x: off, y: pos, w: dw, h: dh, ...full(w, h) });
      pos += (hor ? dw : dh) + gap;
    });
    W = hor ? pos : T + 2 * gap; H = hor ? T + 2 * gap : pos;
  }
  if (o.max && Math.max(W, H) > o.max) {
    const k = o.max / Math.max(W, H);
    W *= k; H *= k;
    cells = cells.map((c) => ({ ...c, x: c.x * k, y: c.y * k, w: c.w * k, h: c.h * k }));
  }
  return { W: Math.round(W), H: Math.round(H), cells };
}
