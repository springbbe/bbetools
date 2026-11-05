/* Tự sinh bởi scripts/build.js từ assets/lib/gfonts.js và i18n/en/js/ — đừng sửa tay. */
/* Tải font Google Fonts (hàm thuần): lọc danh sách font của Fontsource, dựng đường dẫn file WOFF2/WOFF/TTF theo bộ ký tự
   trên jsDelivr, sinh đoạn CSS @font-face (có unicode-range như Google Fonts), đọc METADATA.pb của kho google/fonts
   để lấy file TTF gốc (cài vào máy). Có test ở tests/tai-ve.test.js */

import { fold } from "./search.js";

export const API = "https://api.fontsource.org/v1/fonts";
export const CDN = "https://cdn.jsdelivr.net/fontsource/fonts/";
export const GH_RAW = "https://raw.githubusercontent.com/google/fonts/main/";

// font hay dùng (có tiếng Việt) xếp lên đầu khi chưa tìm
export const POPULAR = ["be-vietnam-pro", "roboto", "inter", "montserrat", "open-sans", "noto-sans", "noto-serif", "nunito", "quicksand", "lora",
  "playfair-display", "merriweather", "source-sans-3", "mulish", "roboto-slab", "dancing-script", "lexend", "manrope", "jetbrains-mono", "pacifico"];

// thứ tự @font-face như Google Fonts: bộ phụ trước, latin sau cùng
const SUBSET_ORDER = ["vietnamese", "latin-ext", "latin"];
export function sortSubsets(list) {
  const rank = (s) => { const i = SUBSET_ORDER.indexOf(s); return i < 0 ? -1 : i; };
  return list.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// unicode-range của hai bộ hay dùng (giống nhau ở mọi font Google), để xem trước khi chưa có thông tin chi tiết của font
export const RANGES = {
  latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  vietnamese: "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB"
};

export const WEIGHT_NAMES = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);

/** Lọc danh sách font: chỉ font của Google; q (không dấu, không phân biệt hoa thường), vn (có bộ tiếng Việt), category */
export function filterFonts(list, { q = "", vn = true, category = "all" } = {}) {
  const k = fold(q).replace(/ /g, "");
  const out = list.filter((f) => f.type === "google" && (!vn || f.subsets.includes("vietnamese")) && (category === "all" || f.category === category) &&
    (!k || fold(f.family).replace(/ /g, "").includes(k) || f.id.replace(/-/g, "").includes(k)));
  const pop = (f) => { const i = POPULAR.indexOf(f.id); return i < 0 ? 1e3 : i; };
  // khớp đầu tên lên trước, rồi font phổ biến, rồi theo tên
  const starts = (f) => (k && fold(f.family).replace(/ /g, "").startsWith(k) ? 0 : 1);
  return out.sort((a, b) => starts(a) - starts(b) || pop(a) - pop(b) || a.family.localeCompare(b.family));
}

/** Kiểu, độ đậm mặc định để xem trước: 400 thường nếu có */
export function previewVariant(f) {
  const weight = f.weights.includes(400) ? 400 : f.weights.reduce((a, b) => (Math.abs(b - 400) < Math.abs(a - 400) ? b : a), f.weights[0]);
  return { weight, style: f.styles.includes("normal") ? "normal" : f.styles[0] };
}
/** Bộ ký tự mặc định: tiếng Việt + latin nếu có, không thì bộ mặc định của font */
export const defaultSubsets = (f) => {
  const s = ["vietnamese", "latin"].filter((x) => f.subsets.includes(x));
  return s.length ? s : [f.defSubset || f.subsets[0]];
};

export const fileUrl = (id, ver, subset, weight, style, ext) => `${CDN}${id}@${ver || "latest"}/${subset}-${weight}-${style}.${ext}`;
export const fileName = (id, subset, weight, style, ext) => `${id}-${subset}-${weight}-${style}.${ext}`;

const FORMAT = { woff2: "woff2", woff: "woff", ttf: "truetype" };
/**
 * Đoạn CSS @font-face. o: { family, id, variants: [{ weight, style }], subsets, unicodeRange: { subset: "U+…" },
 * formats: ["woff2", "woff"], dir: "fonts/", display: "swap" }
 */
export function buildCss(o) {
  const dir = o.dir == null ? "fonts/" : o.dir && !o.dir.endsWith("/") ? o.dir + "/" : o.dir;
  const fam = o.family.replace(/["\\]/g, "");
  const out = [`/* ${o.family} – Google Fonts, downloaded with BbeTools. License: ${o.license || "xem fonts.google.com"} */`];
  const variants = o.variants.slice().sort((a, b) => (a.style === b.style ? a.weight - b.weight : a.style === "normal" ? -1 : 1));
  for (const v of variants) for (const s of sortSubsets(o.subsets)) {
    const src = o.formats.map((ext) => `url("${dir}${fileName(o.id, s, v.weight, v.style, ext)}") format("${FORMAT[ext]}")`).join(",\n       ");
    out.push(`/* ${s} */\n@font-face {\n  font-family: "${fam}";\n  font-style: ${v.style};\n  font-weight: ${v.weight};\n  font-display: ${o.display || "swap"};\n  src: ${src};` +
      (o.unicodeRange && o.unicodeRange[s] ? `\n  unicode-range: ${o.unicodeRange[s]};` : "") + "\n}");
  }
  out.push(`/* Usage: body { font-family: "${fam}", ${GENERIC[o.category] || "sans-serif"}; } */`);
  return out.join("\n") + "\n";
}
const GENERIC = { "sans-serif": "sans-serif", serif: "serif", monospace: "monospace", handwriting: "cursive", display: "sans-serif" };

/* ---------- TTF gốc từ kho google/fonts ---------- */
/** Tên thư mục trong kho: "Be Vietnam Pro" → "bevietnampro" */
export const fontDir = (family) => family.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Thư mục giấy phép nên thử, theo thứ tự (Roboto ghi Apache nhưng nằm ở ofl/) */
export function licenseDirs(license) {
  const l = String(license || "").toLowerCase();
  const first = l.includes("apache") ? "apache" : l.includes("ufl") || l.includes("ubuntu") ? "ufl" : "ofl";
  return [first, ...["ofl", "apache", "ufl"].filter((d) => d !== first)];
}
export const metadataUrl = (dir, family) => `${GH_RAW}${dir}/${fontDir(family)}/METADATA.pb`;
export const ghFileUrl = (dir, family, file) => `${GH_RAW}${dir}/${fontDir(family)}/${file.split("/").map(encodeURIComponent).join("/")}`;
export const LICENSE_FILE = { ofl: "OFL.txt", apache: "LICENSE.txt", ufl: "UFL.txt" };

/** Đọc METADATA.pb (protobuf dạng chữ) → { name, license, fonts: [{ style, weight, filename }], variable } */
export function parseMetadata(text) {
  const str = (src, key) => { const m = new RegExp(`^\\s*${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m").exec(src); return m ? m[1] : ""; };
  const top = String(text).split(/\n\w+\s*\{/)[0]; // phần đầu file, trước các khối fonts { … }
  const fonts = [];
  for (const m of String(text).matchAll(/(^|\n)fonts\s*\{([\s\S]*?)\n\}/g)) {
    const b = m[2], w = /^\s*weight:\s*(\d+)/m.exec(b);
    const f = { style: str(b, "style") || "normal", weight: w ? +w[1] : 400, filename: str(b, "filename") };
    if (f.filename) fonts.push(f);
  }
  return { name: str(top, "name"), license: str(top, "license"), fonts, variable: fonts.some((f) => f.filename.includes("[")) };
}

/** File TTF cần tải theo độ đậm, kiểu đã chọn; file biến thiên (tên có "[") chứa mọi độ đậm nên lấy theo kiểu */
export function pickTtf(meta, weights, styles) {
  const seen = new Set();
  return meta.fonts.filter((f) => {
    if (!styles.includes(f.style)) return false;
    if (!f.filename.includes("[") && !weights.includes(f.weight)) return false;
    if (seen.has(f.filename)) return false;
    seen.add(f.filename);
    return true;
  }).map((f) => f.filename);
}
