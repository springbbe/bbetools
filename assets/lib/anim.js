/* Ảnh động (hàm thuần): nhận dạng loại ảnh theo nội dung (PNG/APNG, WEBP tĩnh/động, GIF, JPG),
   đổi thời gian từng khung sang thời gian của GIF, tính cỡ khi thu nhỏ. */

/** bytes (Uint8Array, vài trăm byte đầu là đủ với WEBP; PNG cần tới trước chunk IDAT) → "apng" | "png" | "webp-anim" | "webp" | "gif" | "jpg" | "" */
export function sniffImage(b) {
  if (!b || b.length < 12) return "";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    // PNG: APNG có chunk acTL nằm trước IDAT đầu tiên
    for (let i = 8; i + 8 <= b.length;) {
      const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
      const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
      if (type === "acTL") return "apng";
      if (type === "IDAT" || type === "IEND") return "png";
      i += 12 + len;
    }
    return "png";
  }
  const s = (o, n) => String.fromCharCode(...b.subarray(o, o + n));
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") {
    // VP8X: bit 1 của byte cờ = có hoạt ảnh
    if (s(12, 4) === "VP8X" && b.length > 20 && b[20] & 0x02) return "webp-anim";
    return "webp";
  }
  if (s(0, 4) === "GIF8") return "gif";
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  return "";
}

/** Đuôi file theo loại ảnh (APNG vẫn là .png) */
export const extOfKind = (k) => ({ apng: "png", png: "png", "webp-anim": "webp", webp: "webp", gif: "gif", jpg: "jpg" })[k] || "bin";
export const isAnimatedKind = (k) => k === "apng" || k === "webp-anim" || k === "gif";

/**
 * Thời gian từng khung (mili giây) → thời gian của GIF (bội số của 10 ms, tối thiểu 20 ms vì trình duyệt
 * coi 0–10 ms là 100 ms). Làm tròn tích luỹ để tổng độ dài gần đúng bản gốc.
 */
export function gifDelays(ms) {
  const out = [];
  let t = 0, prev = 0;
  for (const d of ms) {
    t += Math.max(0, +d || 0);
    const cs = Math.round(t / 10);
    out.push(Math.max(2, cs - prev) * 10);
    prev = Math.max(cs, prev + 2);
  }
  return out;
}

/** Thu nhỏ cho cạnh dài không quá max (0 = giữ cỡ gốc); không phóng to */
export function fitSize(w, h, max) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (!max || Math.max(w, h) <= max) return { w, h };
  const k = max / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}
