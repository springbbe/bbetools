/* Tự sinh bởi scripts/build.js từ assets/qr.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo mã QR (qrcode-generator, MIT) và vẽ ra canvas / SVG. Dùng chung cho Tạo mã QR, VietQR… */
import { lib } from "./core.js";

/** Ma trận QR: { size, dark(r, c) } */
export async function qrMatrix(text, ecc = "M") {
  const qrcode = await lib("qrcode");
  qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s)); // UTF-8 cho tiếng Việt
  const qr = qrcode(0, ecc);
  qr.addData(text, "Byte");
  try { qr.make(); } catch (e) { const err = new Error("The content is too long for a QR code. Please shorten it."); err.userMsg = err.message; throw err; }
  const n = qr.getModuleCount();
  return { size: n, dark: (r, c) => qr.isDark(r, c) };
}

/** Vẽ QR lên canvas. o: { px (cạnh, px), margin (ô), fg, bg, logo (ImageBitmap|HTMLImageElement), logoScale, style: "square"|"dots" } */
export function drawQR(canvas, m, o = {}) {
  const margin = o.margin ?? 4, total = m.size + margin * 2;
  const px = o.px || 512;
  const cell = px / total;
  canvas.width = canvas.height = Math.round(px);
  const g = canvas.getContext("2d");
  g.fillStyle = o.bg || "#ffffff";
  if (o.bg === "transparent") g.clearRect(0, 0, px, px); else g.fillRect(0, 0, px, px);
  g.fillStyle = o.fg || "#000000";
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= m.size - 7) || (r >= m.size - 7 && c < 7);
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.dark(r, c)) continue;
      const x = (c + margin) * cell, y = (r + margin) * cell;
      if (o.style === "dots" && !finder(r, c)) { g.beginPath(); g.arc(x + cell / 2, y + cell / 2, cell * 0.43, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(cell + (x % 1)), Math.ceil(cell + (y % 1)));
    }
  }
  if (o.logo) {
    const s = px * (o.logoScale || 0.22);
    const x = (px - s) / 2, y = (px - s) / 2, pad = s * 0.08;
    g.fillStyle = o.bg && o.bg !== "transparent" ? o.bg : "#ffffff";
    roundRect(g, x - pad, y - pad, s + pad * 2, s + pad * 2, s * 0.14); g.fill();
    const iw = o.logo.width || o.logo.naturalWidth, ih = o.logo.height || o.logo.naturalHeight;
    const k = Math.min(s / iw, s / ih);
    g.drawImage(o.logo, x + (s - iw * k) / 2, y + (s - ih * k) / 2, iw * k, ih * k);
  }
  return canvas;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/** Chuỗi SVG của QR (gộp các ô liền nhau trên một hàng để file nhỏ) */
export function qrSvg(m, o = {}) {
  const margin = o.margin ?? 4, total = m.size + margin * 2;
  let d = "";
  for (let r = 0; r < m.size; r++) {
    let c = 0;
    while (c < m.size) {
      if (!m.dark(r, c)) { c++; continue; }
      let e = c; while (e < m.size && m.dark(r, e)) e++;
      d += `M${c + margin} ${r + margin}h${e - c}v1h${c - e}z`;
      c = e;
    }
  }
  const bg = o.bg && o.bg !== "transparent" ? `<rect width="${total}" height="${total}" fill="${o.bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">${bg}<path fill="${o.fg || "#000"}" d="${d}"/></svg>`;
}

export const canvasBlob = (c, type = "image/png", q) => new Promise((res) => c.toBlob(res, type, q));
