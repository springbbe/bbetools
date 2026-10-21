/* Giải mã dữ liệu ảnh thô trong PDF (sau khi đã giải nén Flate) thành điểm ảnh RGBA:
   bỏ bộ lọc PNG (Predictor ≥ 10), độ sâu 1/2/4/8/16 bit, hệ màu Gray / RGB / CMYK / Indexed, mảng Decode, ImageMask.
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/pdf-image.test.js */

/** Bỏ bộ lọc PNG theo hàng: data có 1 byte loại lọc đầu mỗi hàng; bpp = số byte mỗi điểm (tối thiểu 1), rowBytes = byte mỗi hàng */
export function unPredict(data, rowBytes, rows, bpp) {
  const out = new Uint8Array(rowBytes * rows);
  let ip = 0;
  for (let y = 0; y < rows; y++) {
    const ft = data[ip++], row = y * rowBytes, prev = row - rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const raw = data[ip++] || 0;
      const a = x >= bpp ? out[row + x - bpp] : 0, b = y ? out[prev + x] : 0, c = x >= bpp && y ? out[prev + x - bpp] : 0;
      let v;
      switch (ft) {
        case 1: v = raw + a; break;
        case 2: v = raw + b; break;
        case 3: v = raw + ((a + b) >> 1); break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: v = raw;
      }
      out[row + x] = v & 255;
    }
  }
  return out;
}

/** Đọc mẫu thứ i (0..) có độ sâu bpc bit trong hàng bắt đầu tại byte rowStart → số nguyên 0..2^bpc-1 */
function sample(data, rowStart, i, bpc) {
  if (bpc === 8) return data[rowStart + i];
  if (bpc === 16) return data[rowStart + i * 2]; // lấy byte cao
  const bit = i * bpc, byte = data[rowStart + (bit >> 3)], shift = 8 - bpc - (bit & 7);
  return (byte >> shift) & ((1 << bpc) - 1);
}

export const cmykToRgb = (c, m, y, k) => [255 * (1 - Math.min(1, c + k)), 255 * (1 - Math.min(1, m + k)), 255 * (1 - Math.min(1, y + k))];

/**
 * img: { data (đã giải nén), width, height, bpc, cs: "gray"|"rgb"|"cmyk"|"indexed", palette (Uint8Array, cho indexed), base ("gray"|"rgb"|"cmyk", cho indexed),
 *        decode: [min,max,…] tuỳ chọn, mask: true (ImageMask), predictor, columns }
 * → Uint8ClampedArray RGBA hoặc null nếu dữ liệu thiếu
 */
export function toRGBA(img) {
  const { width: w, height: h } = img;
  const bpc = img.mask ? 1 : img.bpc || 8;
  const nc = img.mask || img.cs === "gray" || img.cs === "indexed" ? 1 : img.cs === "cmyk" ? 4 : 3;
  const rowBytes = Math.ceil((w * nc * bpc) / 8);
  let data = img.data;
  if (img.predictor >= 10) data = unPredict(data, rowBytes, h, Math.max(1, Math.ceil((nc * bpc) / 8)));
  if (data.length < rowBytes * h) return null;
  const out = new Uint8ClampedArray(w * h * 4);
  const max = (1 << Math.min(bpc, 8)) - 1;
  const dec = img.decode;
  const val = (s, c) => { // giá trị 0..1 của thành phần c
    const v = s / max;
    return dec ? dec[c * 2] + v * (dec[c * 2 + 1] - dec[c * 2]) : v;
  };
  const pal = img.palette, base = img.base || "rgb", pn = base === "gray" ? 1 : base === "cmyk" ? 4 : 3;
  for (let y = 0; y < h; y++) {
    const rs = y * rowBytes;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (img.mask) { // stencil: mẫu 0 = tô (đen), 1 = trong suốt (đảo nếu Decode [1 0])
        const s = sample(data, rs, x, 1), paint = dec && dec[0] === 1 ? s === 1 : s === 0;
        out[o] = out[o + 1] = out[o + 2] = 0; out[o + 3] = paint ? 255 : 0;
        continue;
      }
      if (img.cs === "indexed") {
        const idx = sample(data, rs, x, bpc) * pn;
        if (pn === 1) out[o] = out[o + 1] = out[o + 2] = pal[idx];
        else if (pn === 3) { out[o] = pal[idx]; out[o + 1] = pal[idx + 1]; out[o + 2] = pal[idx + 2]; }
        else { const [r, g, b] = cmykToRgb(pal[idx] / 255, pal[idx + 1] / 255, pal[idx + 2] / 255, pal[idx + 3] / 255); out[o] = r; out[o + 1] = g; out[o + 2] = b; }
      } else if (nc === 1) out[o] = out[o + 1] = out[o + 2] = 255 * val(sample(data, rs, x, bpc), 0);
      else if (nc === 3) { for (let c = 0; c < 3; c++) out[o + c] = 255 * val(sample(data, rs, x * 3 + c, bpc), c); }
      else { const [r, g, b] = cmykToRgb(val(sample(data, rs, x * 4, bpc), 0), val(sample(data, rs, x * 4 + 1, bpc), 1), val(sample(data, rs, x * 4 + 2, bpc), 2), val(sample(data, rs, x * 4 + 3, bpc), 3)); out[o] = r; out[o + 1] = g; out[o + 2] = b; }
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Đặt kênh trong suốt từ ảnh SMask (thang xám RGBA cùng hoặc khác cỡ) vào ảnh RGBA */
export function applyAlpha(rgba, w, h, mask, mw, mh) {
  for (let y = 0; y < h; y++) {
    const my = Math.min(mh - 1, Math.floor((y * mh) / h));
    for (let x = 0; x < w; x++) {
      const mx = Math.min(mw - 1, Math.floor((x * mw) / w));
      rgba[(y * w + x) * 4 + 3] = mask[(my * mw + mx) * 4];
    }
  }
  return rgba;
}

/** Độ sáng (0..255) của một điểm RGB */
export const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
