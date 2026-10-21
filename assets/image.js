/* Tiện ích ảnh dùng chung: giải mã (kể cả HEIC, xoay theo EXIF), thu nhỏ chất lượng cao, mã hoá JPG (MozJPEG) / WebP / PNG. */
import { lib, fileKinds } from "./core.js";

const JSD = "https://cdn.jsdelivr.net/npm/";

/** Giải mã file ảnh → ImageBitmap (đã xoay đúng chiều theo EXIF). HEIC: dùng giải mã có sẵn (Safari) hoặc libheif. */
export async function decodeImage(file) {
  const kinds = await fileKinds(file);
  if (kinds.includes("heic")) {
    try { return await createImageBitmap(file); } catch (_) {}
    const { heicTo } = await lib("heic");
    return heicTo({ blob: file, type: "bitmap" });
  }
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch (_) {
    // dự phòng: <img> (một số định dạng như SVG, ICO)
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.decoding = "async"; img.src = url;
      await img.decode();
      return await createImageBitmap(img);
    } catch (e) { const err = new Error("Không đọc được ảnh " + file.name + ". Định dạng chưa được trình duyệt hỗ trợ hoặc file bị hỏng."); err.userMsg = err.message; throw err; }
    finally { URL.revokeObjectURL(url); }
  }
}

export function canvas(w, hgt) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hgt)); return c; }

/** Vẽ ảnh vào canvas kích thước w×h, thu nhỏ từng nửa để mịn (tránh răng cưa). bg: màu nền (cho JPG) */
export function drawScaled(src, w, hgt, bg) {
  w = Math.max(1, Math.round(w)); hgt = Math.max(1, Math.round(hgt));
  let cur = src, cw = src.width, ch = src.height;
  while (cw / 2 >= w * 1.0001 && ch / 2 >= hgt) {
    const t = canvas(cw / 2, ch / 2);
    const g = t.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(cur, 0, 0, t.width, t.height);
    cur = t; cw = t.width; ch = t.height;
  }
  const out = canvas(w, hgt);
  const g = out.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, hgt); }
  g.imageSmoothingQuality = "high";
  g.drawImage(cur, 0, 0, w, hgt);
  return out;
}

/** Ảnh có điểm ảnh trong suốt không (lấy mẫu) */
export function hasAlpha(c) {
  const g = c.getContext("2d", { willReadFrequently: true });
  const step = Math.max(1, Math.floor(Math.sqrt((c.width * c.height) / 40000)));
  const d = g.getImageData(0, 0, c.width, c.height).data;
  for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) if (d[(y * c.width + x) * 4 + 3] < 250) return true;
  return false;
}

const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
const imgData = (c) => c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);

let webpEnc = null;
async function webpEncoder() {
  if (!webpEnc) webpEnc = (async () => {
    const [{ default: factory }, meta] = await Promise.all([import(JSD + "@jsquash/webp@1.5.0/codec/enc/webp_enc.js"), import(JSD + "@jsquash/webp@1.5.0/meta.js")]);
    const mod = await factory({ noInitialRun: true });
    return (d, q) => mod.encode(d.data, d.width, d.height, { ...meta.defaultOptions, quality: q });
  })();
  return webpEnc;
}

/**
 * Mã hoá canvas.
 * type: "image/jpeg" | "image/webp" | "image/png"; quality 0..1; colors (PNG giảm màu: 0 = không giảm)
 */
export async function encode(c, type, quality = 0.8, opts = {}) {
  if (type === "image/jpeg") {
    if (opts.fast !== true) {
      try {
        const enc = await lib("mozjpeg");
        const buf = await enc(imgData(c), { quality: Math.round(quality * 100), progressive: true, optimize_coding: true });
        return new Blob([buf], { type });
      } catch (e) { console.warn("MozJPEG lỗi, dùng bộ mã hoá của trình duyệt", e); }
    }
    return toBlob(c, type, quality);
  }
  if (type === "image/webp") {
    const b = await toBlob(c, type, quality);
    if (b && b.type === "image/webp") return b;
    const enc = await webpEncoder(); // Safari: canvas không xuất được WebP
    return new Blob([await enc(imgData(c), Math.round(quality * 100))], { type });
  }
  if (type === "image/png" && opts.colors) {
    const UPNG = await lib("upng");
    const d = imgData(c);
    return new Blob([UPNG.encode([d.data.buffer], c.width, c.height, opts.colors)], { type });
  }
  return toBlob(c, "image/png");
}

export const EXT = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png", "image/avif": "avif" };
export function typeOfFile(f) {
  const t = (f.type || "").toLowerCase();
  if (/jpe?g/.test(t) || /\.jpe?g$|\.jfif$/i.test(f.name)) return "image/jpeg";
  if (/png/.test(t) || /\.png$/i.test(f.name)) return "image/png";
  if (/webp/.test(t) || /\.webp$/i.test(f.name)) return "image/webp";
  return "";
}

/** Ảnh thu nhỏ cho danh sách file */
export async function thumbUrl(bitmapOrFile, size = 112) {
  const bmp = bitmapOrFile instanceof Blob ? await createImageBitmap(bitmapOrFile) : bitmapOrFile;
  const k = Math.min(1, size / Math.max(bmp.width, bmp.height));
  const c = drawScaled(bmp, bmp.width * k, bmp.height * k, "#fff");
  return c.toDataURL("image/jpeg", 0.82);
}

/** Ghi độ phân giải (DPI) vào header JFIF của JPEG để máy in / tiệm ảnh in đúng kích thước */
export async function setJpegDpi(blob, dpi = 300) {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (b[0] !== 0xff || b[1] !== 0xd8) return blob;
  if (b[2] === 0xff && b[3] === 0xe0 && String.fromCharCode(b[6], b[7], b[8], b[9]) === "JFIF") {
    b[13] = 1; b[14] = dpi >> 8; b[15] = dpi & 255; b[16] = dpi >> 8; b[17] = dpi & 255;
    return new Blob([b], { type: "image/jpeg" });
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0]);
  return new Blob([b.subarray(0, 2), app0, b.subarray(2)], { type: "image/jpeg" });
}
