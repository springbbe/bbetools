/* Tự sinh bởi scripts/build.js từ assets/lib/css-gen.js và i18n/en/js/ — đừng sửa tay. */
/* Sinh mã CSS (hàm thuần): gradient, box-shadow, border-radius từ các thông số chỉnh trực quan. */

const hexToRgb = (hex) => { const h = hex.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
/** "#3e63dd", 0.5 → "rgb(62 99 221 / 50%)"; độ mờ 1 giữ dạng HEX */
export function withAlpha(hex, a = 1) {
  if (a >= 1) return hex.toLowerCase();
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${Math.round(a * 100)}%)`;
}

/** stops: [{ color, pos }] (pos 0–100). type: linear | radial | conic. angle: độ. shape: circle | ellipse. repeat */
export function gradient({ type = "linear", angle = 90, shape = "circle", at = "center", stops = [], repeat = false }) {
  const list = [...stops].sort((a, b) => a.pos - b.pos).map((s, i, arr) => {
    const def = arr.length > 1 ? Math.round((i / (arr.length - 1)) * 100) : 0;
    return s.pos === def && !repeat ? s.color : `${s.color} ${s.pos}%`;
  }).join(", ");
  const pre = repeat ? "repeating-" : "";
  if (type === "radial") return `${pre}radial-gradient(${shape}${at !== "center" ? " at " + at : ""}, ${list})`;
  if (type === "conic") return `${pre}conic-gradient(from ${angle}deg${at !== "center" ? " at " + at : ""}, ${list})`;
  return `${pre}linear-gradient(${angle}deg, ${list})`;
}

/** layers: [{ x, y, blur, spread, color, alpha, inset }] */
export function boxShadow(layers) {
  return layers.map((l) => [l.inset ? "inset" : "", `${l.x}px`, `${l.y}px`, `${l.blur}px`, l.spread ? `${l.spread}px` : "", withAlpha(l.color, l.alpha)].filter(Boolean).join(" ")).join(", ");
}

/** r: [trên-trái, trên-phải, dưới-phải, dưới-trái], unit "px" | "%" → viết gọn nhất */
export function borderRadius(r, unit = "px") {
  const v = r.map((x) => (+x ? x + unit : "0"));
  if (v.every((x) => x === v[0])) return v[0];
  if (v[0] === v[2] && v[1] === v[3]) return `${v[0]} ${v[1]}`;
  if (v[1] === v[3]) return `${v[0]} ${v[1]} ${v[2]}`;
  return v.join(" ");
}
