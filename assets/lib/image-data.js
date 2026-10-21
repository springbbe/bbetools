/* Hàm thuần cho công cụ ảnh: ghi file .ico, đọc kích thước SVG, đổi hệ màu, trích bảng màu chủ đạo,
   tách nét mực (chữ ký, con dấu) khỏi nền giấy. Dữ liệu ảnh dạng { data: RGBA, width, height } như ImageData. */

/* ---------------- ICO ---------------- */

/** Ghép nhiều ảnh PNG thành file .ico. images: [{ size, png: Uint8Array }] (size ≤ 256) */
export function buildIco(images) {
  const n = images.length, head = 6 + 16 * n;
  const total = head + images.reduce((s, i) => s + i.png.length, 0);
  const b = new Uint8Array(total), v = new DataView(b.buffer);
  v.setUint16(2, 1, true); v.setUint16(4, n, true);
  let off = head;
  images.forEach((img, i) => {
    const e = 6 + 16 * i;
    b[e] = img.size >= 256 ? 0 : img.size; b[e + 1] = img.size >= 256 ? 0 : img.size;
    v.setUint16(e + 4, 1, true); v.setUint16(e + 6, 32, true);
    v.setUint32(e + 8, img.png.length, true); v.setUint32(e + 12, off, true);
    b.set(img.png, off); off += img.png.length;
  });
  return b;
}

/* ---------------- SVG ---------------- */

const UNIT = { px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, em: 16, ex: 8, rem: 16 };
const len = (s) => { const m = /^\s*([\d.]+(?:e[+-]?\d+)?)\s*(px|pt|pc|mm|cm|in|em|ex|rem)?\s*$/i.exec(s || ""); return m ? +m[1] * UNIT[(m[2] || "px").toLowerCase()] : 0; };

/** Kích thước tự nhiên (px) của SVG: theo width/height, thiếu thì theo viewBox, cuối cùng 300×150 như trình duyệt */
export function svgSize(text) {
  const tag = (/<svg\b[^>]*>/i.exec(text || "") || [""])[0];
  const attr = (k) => { const m = new RegExp(`\\s${k}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag); return m ? m[1] : null; };
  const vb = (attr("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  const hasVb = vb.length === 4 && vb[2] > 0 && vb[3] > 0;
  let w = len(attr("width")), h = len(attr("height"));
  if (!w && !h) { if (hasVb) { w = vb[2]; h = vb[3]; } else { w = 300; h = 150; } }
  else if (!w) w = hasVb ? (h * vb[2]) / vb[3] : 300;
  else if (!h) h = hasVb ? (w * vb[3]) / vb[2] : 150;
  return { width: w, height: h, viewBox: hasVb ? vb : null };
}

/** Đặt width/height (px) cho thẻ <svg> gốc để trình duyệt vẽ đúng cỡ; thêm viewBox nếu thiếu */
export function svgWithSize(text, w, h) {
  const s = svgSize(text);
  return text.replace(/<svg\b[^>]*>/i, (tag) => {
    let t = tag.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, "");
    if (!s.viewBox) t = t.replace(/<svg\b/i, `<svg viewBox="0 0 ${s.width} ${s.height}"`);
    if (!/\sxmlns\s*=/.test(t)) t = t.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    return t.replace(/<svg\b/i, `<svg width="${w}" height="${h}"`);
  });
}

/* ---------------- màu ---------------- */

export const hex = ([r, g, b]) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
/** Độ sáng cảm nhận 0..1 (để chọn chữ đen/trắng trên ô màu) */
export const luma = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

/**
 * Bảng màu chủ đạo bằng median cut. img: { data, width, height }; k: số màu.
 * Bỏ điểm gần trong suốt. Trả về [{ rgb: [r,g,b], share: 0..1 }] sắp theo tỉ lệ giảm dần.
 */
export function palette(img, k = 6) {
  const { data, width, height } = img;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 60000)));
  const px = [];
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4;
    if (data[i + 3] >= 128) px.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (!px.length) return [];
  let boxes = [px];
  const range = (b) => { let r = [0, 0, 0]; for (let c = 0; c < 3; c++) { let lo = 255, hi = 0; for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; } r[c] = hi - lo; } return r; };
  while (boxes.length < k) {
    // tách hộp có (số điểm × độ trải màu) lớn nhất theo kênh trải rộng nhất
    let best = -1, bi = -1, bc = 0;
    boxes.forEach((b, i) => { if (b.length < 2) return; const r = range(b), c = r.indexOf(Math.max(...r)), score = r[c] * Math.sqrt(b.length); if (score > best) { best = score; bi = i; bc = c; } });
    if (bi < 0 || best <= 0) break;
    const b = boxes[bi].sort((p, q) => p[bc] - q[bc]);
    // tách ở trung vị nhưng không chia đôi một giá trị: các điểm cùng mức kênh luôn ở cùng một phía
    let mid = b.length >> 1;
    const v = b[mid][bc];
    let lo = mid; while (lo > 0 && b[lo - 1][bc] === v) lo--;
    let hi = mid; while (hi < b.length && b[hi][bc] === v) hi++;
    mid = lo > 0 && (mid - lo <= hi - mid || hi >= b.length) ? lo : hi;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const out = boxes.map((b) => { const s = [0, 0, 0]; for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return { rgb: s.map((v) => Math.round(v / b.length)), share: b.length / px.length }; });
  // gộp các màu gần như trùng
  const merged = [];
  for (const c of out.sort((a, b) => b.share - a.share)) {
    const m = merged.find((x) => Math.hypot(x.rgb[0] - c.rgb[0], x.rgb[1] - c.rgb[1], x.rgb[2] - c.rgb[2]) < 18);
    if (m) m.share += c.share; else merged.push({ ...c });
  }
  return merged.sort((a, b) => b.share - a.share);
}

/* ---------------- tách nét mực ---------------- */

/**
 * Ước lượng độ sáng nền giấy tại mỗi điểm (để chịu được bóng đổ, ánh sáng không đều):
 * chia lưới ô ~cell px, lấy phân vị 90% độ sáng mỗi ô, nội suy song tuyến. Trả về Float32Array độ sáng 0..255.
 */
export function paperLevel(img, cell = 32) {
  const { data, width: W, height: H } = img;
  const gx = Math.max(1, Math.ceil(W / cell)), gy = Math.max(1, Math.ceil(H / cell));
  const grid = new Float32Array(gx * gy);
  const hist = new Uint32Array(256);
  for (let cy = 0; cy < gy; cy++) for (let cx = 0; cx < gx; cx++) {
    hist.fill(0);
    let n = 0;
    for (let y = cy * cell; y < Math.min(H, (cy + 1) * cell); y++) for (let x = cx * cell; x < Math.min(W, (cx + 1) * cell); x++) {
      const i = (y * W + x) * 4; hist[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++; n++;
    }
    let acc = 0, v = 255;
    for (let t = 0; t < 256; t++) { acc += hist[t]; if (acc >= n * 0.9) { v = t; break; } }
    grid[cy * gx + cx] = v;
  }
  // làm mượt lưới (giảm ảnh hưởng ô toàn mực)
  const sm = new Float32Array(grid.length);
  for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) {
    let mx = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < gy && xx >= 0 && xx < gx) mx = Math.max(mx, grid[yy * gx + xx]); }
    sm[y * gx + x] = Math.max(grid[y * gx + x], mx * 0.92);
  }
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const fy = Math.min(gy - 1, Math.max(0, (y + 0.5) / cell - 0.5)), y0 = Math.floor(fy), y1 = Math.min(gy - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(gx - 1, Math.max(0, (x + 0.5) / cell - 0.5)), x0 = Math.floor(fx), x1 = Math.min(gx - 1, x0 + 1), tx = fx - x0;
      const a = sm[y0 * gx + x0] * (1 - tx) + sm[y0 * gx + x1] * tx, b = sm[y1 * gx + x0] * (1 - tx) + sm[y1 * gx + x1] * tx;
      out[y * W + x] = Math.max(1, a * (1 - ty) + b * ty);
    }
  }
  return out;
}

/**
 * Tách nét mực thành ảnh nền trong suốt.
 * o.level: Float32Array từ paperLevel (tính sẵn để chỉnh nhanh); o.sens 0..1 (độ nhạy: cao = lấy cả nét mờ);
 * o.color: null (giữ màu mực gốc) hoặc [r,g,b]; o.only: "blue" (mực xanh – chữ ký) | "red" (mực đỏ – con dấu) | "dark" (mực đen, chữ in) | null (mọi nét).
 * Trả về { data: Uint8ClampedArray RGBA, box: {x,y,w,h} | null }.
 */
export function extractInk(img, o = {}) {
  const { data, width: W, height: H } = img;
  const level = o.level || paperLevel(img);
  const sens = o.sens == null ? 0.5 : o.sens;
  const t0 = 0.32 - sens * 0.26, t1 = t0 + 0.18;                 // ngưỡng độ tối tương đối so với nền
  const out = new Uint8ClampedArray(W * H * 4);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    const L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const d = (level[p] - L) / level[p];
    let a = d <= t0 ? 0 : d >= t1 ? 1 : (d - t0) / (t1 - t0);
    a = a * a * (3 - 2 * a);
    if (a < 0.04) continue;
    if (o.only && inkKind(data[i], data[i + 1], data[i + 2], level[p]) !== o.only) continue;
    if (o.color) { out[i] = o.color[0]; out[i + 1] = o.color[1]; out[i + 2] = o.color[2]; }
    else {
      // bỏ ám màu giấy, đậm thêm một chút để nét rõ
      const k = 255 / level[p];
      for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, data[i + c] * k * 0.85);
    }
    out[i + 3] = Math.round(a * 255);
    if (a > 0.5) { const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { data: out, box: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}

/** Loại mực của một điểm (đã bỏ ám màu giấy): "red" | "blue" | "dark" */
export function inkKind(r, g, b, paper = 255) {
  const k = 255 / paper, R = Math.min(255, r * k), G = Math.min(255, g * k), B = Math.min(255, b * k);
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
  if (mx - mn < 40 || (mx - mn) / (mx || 1) < 0.28) return "dark";
  const [h] = rgbToHsl([R, G, B]);
  if (h < 30 || h >= 300) return "red";
  if (h >= 170 && h < 280) return "blue";
  return "dark";
}
