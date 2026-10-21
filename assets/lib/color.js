/* Màu (hàm thuần): đọc mọi cách viết màu CSS thông dụng, đổi qua HEX/RGB/HSL/HWB/OKLCH/OKLab/CMYK,
   độ tương phản WCAG 2.x. Màu nội bộ: { r, g, b (0–255, số thực), a (0–1) } trong không gian sRGB. */

const NAMED = {
  aliceblue: "f0f8ff", antiquewhite: "faebd7", aqua: "00ffff", aquamarine: "7fffd4", azure: "f0ffff", beige: "f5f5dc", bisque: "ffe4c4", black: "000000",
  blanchedalmond: "ffebcd", blue: "0000ff", blueviolet: "8a2be2", brown: "a52a2a", burlywood: "deb887", cadetblue: "5f9ea0", chartreuse: "7fff00",
  chocolate: "d2691e", coral: "ff7f50", cornflowerblue: "6495ed", cornsilk: "fff8dc", crimson: "dc143c", cyan: "00ffff", darkblue: "00008b",
  darkcyan: "008b8b", darkgoldenrod: "b8860b", darkgray: "a9a9a9", darkgreen: "006400", darkgrey: "a9a9a9", darkkhaki: "bdb76b", darkmagenta: "8b008b",
  darkolivegreen: "556b2f", darkorange: "ff8c00", darkorchid: "9932cc", darkred: "8b0000", darksalmon: "e9967a", darkseagreen: "8fbc8f",
  darkslateblue: "483d8b", darkslategray: "2f4f4f", darkslategrey: "2f4f4f", darkturquoise: "00ced1", darkviolet: "9400d3", deeppink: "ff1493",
  deepskyblue: "00bfff", dimgray: "696969", dimgrey: "696969", dodgerblue: "1e90ff", firebrick: "b22222", floralwhite: "fffaf0", forestgreen: "228b22",
  fuchsia: "ff00ff", gainsboro: "dcdcdc", ghostwhite: "f8f8ff", gold: "ffd700", goldenrod: "daa520", gray: "808080", green: "008000",
  greenyellow: "adff2f", grey: "808080", honeydew: "f0fff0", hotpink: "ff69b4", indianred: "cd5c5c", indigo: "4b0082", ivory: "fffff0", khaki: "f0e68c",
  lavender: "e6e6fa", lavenderblush: "fff0f5", lawngreen: "7cfc00", lemonchiffon: "fffacd", lightblue: "add8e6", lightcoral: "f08080", lightcyan: "e0ffff",
  lightgoldenrodyellow: "fafad2", lightgray: "d3d3d3", lightgreen: "90ee90", lightgrey: "d3d3d3", lightpink: "ffb6c1", lightsalmon: "ffa07a",
  lightseagreen: "20b2aa", lightskyblue: "87cefa", lightslategray: "778899", lightslategrey: "778899", lightsteelblue: "b0c4de", lightyellow: "ffffe0",
  lime: "00ff00", limegreen: "32cd32", linen: "faf0e6", magenta: "ff00ff", maroon: "800000", mediumaquamarine: "66cdaa", mediumblue: "0000cd",
  mediumorchid: "ba55d3", mediumpurple: "9370db", mediumseagreen: "3cb371", mediumslateblue: "7b68ee", mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc", mediumvioletred: "c71585", midnightblue: "191970", mintcream: "f5fffa", mistyrose: "ffe4e1", moccasin: "ffe4b5",
  navajowhite: "ffdead", navy: "000080", oldlace: "fdf5e6", olive: "808000", olivedrab: "6b8e23", orange: "ffa500", orangered: "ff4500", orchid: "da70d6",
  palegoldenrod: "eee8aa", palegreen: "98fb98", paleturquoise: "afeeee", palevioletred: "db7093", papayawhip: "ffefd5", peachpuff: "ffdab9", peru: "cd853f",
  pink: "ffc0cb", plum: "dda0dd", powderblue: "b0e0e6", purple: "800080", rebeccapurple: "663399", red: "ff0000", rosybrown: "bc8f8f", royalblue: "4169e1",
  saddlebrown: "8b4513", salmon: "fa8072", sandybrown: "f4a460", seagreen: "2e8b57", seashell: "fff5ee", sienna: "a0522d", silver: "c0c0c0",
  skyblue: "87ceeb", slateblue: "6a5acd", slategray: "708090", slategrey: "708090", snow: "fffafa", springgreen: "00ff7f", steelblue: "4682b4", tan: "d2b48c",
  teal: "008080", thistle: "d8bfd8", tomato: "ff6347", turquoise: "40e0d0", violet: "ee82ee", wheat: "f5deb3", white: "ffffff", whitesmoke: "f5f5f5",
  yellow: "ffff00", yellowgreen: "9acd32"
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const round = (x, d = 0) => { const p = 10 ** d; const r = Math.round(x * p) / p; return Object.is(r, -0) ? 0 : r; };

/* ---------- chuyển đổi ---------- */
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s / 100); l = clamp(l / 100);
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}
export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
export function hwbToRgb(h, w, bl) {
  w /= 100; bl /= 100;
  if (w + bl >= 1) { const g = (w / (w + bl)) * 255; return { r: g, g, b: g }; }
  const c = hslToRgb(h, 100, 50);
  const f = (x) => (x / 255) * (1 - w - bl) * 255 + w * 255;
  return { r: f(c.r), g: f(c.g), b: f(c.b) };
}
export function rgbToHwb(c) {
  const { h } = rgbToHsl(c);
  const w = Math.min(c.r, c.g, c.b) / 255, bl = 1 - Math.max(c.r, c.g, c.b) / 255;
  return { h, w: w * 100, b: bl * 100 };
}
const lin = (u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
const gam = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055);
export function rgbToOklab({ r, g, b }) {
  const R = lin(r / 255), G = lin(g / 255), B = lin(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return { L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s };
}
export function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return { r: gam(R) * 255, g: gam(G) * 255, b: gam(B) * 255, inGamut: [R, G, B].every((x) => x >= -0.0001 && x <= 1.0001) };
}
export function rgbToOklch(c) {
  const { L, a, b } = rgbToOklab(c);
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h: C < 0.0002 ? 0 : h };
}
export const oklchToRgb = (L, C, h) => oklabToRgb(L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180));
export function rgbToCmyk({ r, g, b }) {
  const R = r / 255, G = g / 255, B = b / 255, k = 1 - Math.max(R, G, B);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return { c: ((1 - R - k) / (1 - k)) * 100, m: ((1 - G - k) / (1 - k)) * 100, y: ((1 - B - k) / (1 - k)) * 100, k: k * 100 };
}

/* ---------- đọc ---------- */
const num = (s, scale = 1, pctOf = 100) => {
  s = String(s).trim();
  if (s === "none") return 0;
  if (s.endsWith("%")) return (parseFloat(s) / 100) * pctOf;
  const v = parseFloat(s) * scale;
  return Number.isFinite(v) ? v : NaN;
};
const hue = (s) => {
  const v = parseFloat(s);
  if (/turn$/.test(s)) return v * 360;
  if (/rad$/.test(s)) return (v * 180) / Math.PI;
  if (/grad$/.test(s)) return v * 0.9;
  return v;
};

/** Đọc màu → { r, g, b, a } hoặc null */
export function parseColor(input) {
  let s = String(input ?? "").trim().toLowerCase().replace(/;$/, "");
  if (!s) return null;
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (NAMED[s]) s = "#" + NAMED[s];
  let m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? round(parseInt(h.slice(6, 8), 16) / 255, 3) : 1 };
  }
  m = /^(rgba?|hsla?|hwb|oklch|oklab)\(\s*([^)]*)\)$/.exec(s);
  if (!m) {
    // "255, 0, 0" hoặc "255 0 0" → RGB
    const parts = s.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 3 && parts.length <= 4 && parts.every((p) => /^-?[\d.]+%?$/.test(p))) return parseColor(`rgb(${parts.join(" ")})`);
    return null;
  }
  const fn = m[1];
  const parts = m[2].replace(/\s*\/\s*/, " / ").split(/[\s,]+/).filter((p) => p && p !== "/");
  if (parts.length < 3) return null;
  const alpha = parts[3] != null ? clamp(num(parts[3], 1, 1)) : 1;
  let c;
  if (fn.startsWith("rgb")) c = { r: num(parts[0], 1, 255), g: num(parts[1], 1, 255), b: num(parts[2], 1, 255) };
  else if (fn.startsWith("hsl")) c = hslToRgb(hue(parts[0]), num(parts[1]), num(parts[2]));
  else if (fn === "hwb") c = hwbToRgb(hue(parts[0]), num(parts[1]), num(parts[2]));
  else if (fn === "oklch") c = oklchToRgb(num(parts[0], 1, 1), num(parts[1], 1, 0.4), hue(parts[2]));
  else c = oklabToRgb(num(parts[0], 1, 1), num(parts[1], 1, 0.4), num(parts[2], 1, 0.4));
  if (![c.r, c.g, c.b, alpha].every(Number.isFinite)) return null;
  return { r: clamp(c.r, 0, 255), g: clamp(c.g, 0, 255), b: clamp(c.b, 0, 255), a: round(alpha, 3), outOfGamut: c.inGamut === false };
}

/* ---------- viết ---------- */
const hx = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
export function formats(c) {
  const a = c.a ?? 1, A = a < 1 ? ` / ${round(a * 100)}%` : "";
  const R = Math.round(c.r), G = Math.round(c.g), B = Math.round(c.b);
  const hsl = rgbToHsl(c), hwb = rgbToHwb(c), lch = rgbToOklch(c), lab = rgbToOklab(c), cmyk = rgbToCmyk(c);
  return {
    hex: "#" + hx(c.r) + hx(c.g) + hx(c.b) + (a < 1 ? hx(a * 255) : ""),
    rgb: a < 1 ? `rgb(${R} ${G} ${B}${A})` : `rgb(${R}, ${G}, ${B})`,
    hsl: a < 1 ? `hsl(${round(hsl.h)} ${round(hsl.s)}% ${round(hsl.l)}%${A})` : `hsl(${round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%)`,
    hwb: `hwb(${round(hwb.h)} ${round(hwb.w)}% ${round(hwb.b)}%${A})`,
    oklch: `oklch(${round(lch.L * 100, 1)}% ${round(lch.C, 3)} ${round(lch.h, 1)}${A})`,
    oklab: `oklab(${round(lab.L * 100, 1)}% ${round(lab.a, 3)} ${round(lab.b, 3)}${A})`,
    cmyk: `cmyk(${round(cmyk.c)}%, ${round(cmyk.m)}%, ${round(cmyk.y)}%, ${round(cmyk.k)}%)`,
    name: Object.keys(NAMED).find((k) => NAMED[k] === hx(c.r) + hx(c.g) + hx(c.b)) || null
  };
}

/* ---------- tương phản ---------- */
export function luminance({ r, g, b }) {
  return 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
}
/** Trộn màu có độ trong suốt lên nền */
export const over = (fg, bg) => { const a = fg.a ?? 1; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; };
export function contrast(fg, bg) {
  const f = over(fg, bg);
  const L1 = luminance(f), L2 = luminance(bg);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
/** Chữ đen hay trắng dễ đọc hơn trên nền này */
export const bestText = (bg) => (contrast({ r: 0, g: 0, b: 0 }, bg) >= contrast({ r: 255, g: 255, b: 255 }, bg) ? "#000000" : "#ffffff");

/** Dải sáng–tối cùng sắc độ (theo OKLCH) */
export function shades(c, steps = [0.97, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]) {
  const { C, h } = rgbToOklch(c);
  return steps.map((L) => {
    let cc = C, rgb;
    for (let i = 0; i < 30; i++) { rgb = oklchToRgb(L, cc, h); if (rgb.inGamut) break; cc *= 0.9; }
    return { r: clamp(rgb.r, 0, 255), g: clamp(rgb.g, 0, 255), b: clamp(rgb.b, 0, 255), a: 1, L };
  });
}
