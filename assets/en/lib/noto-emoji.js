/* Tự sinh bởi scripts/build.js từ assets/lib/noto-emoji.js và i18n/en/js/ — đừng sửa tay. */
/* Emoji động Noto (hàm thuần): đổi mã ↔ ký tự emoji, dựng đường dẫn file trên fonts.gstatic.com
   (cho trang web tải thẳng), đọc danh sách trong data/noto-emoji.json và tìm kiếm. */
import { fold } from "./search.js";

const CDN = "https://fonts.gstatic.com/s/e/notoemoji/latest/";
export const FILES = {
  gif: { file: "512.gif", ext: "gif", label: "Animated GIF 512 px" },
  webp: { file: "512.webp", ext: "webp", label: "Animated WEBP 512 px" },
  png: { file: "512.png", ext: "png", label: "Still PNG 512 px" },
  svg: { file: "emoji.svg", ext: "svg", label: "SVG (vector)" },
  lottie: { file: "lottie.json", ext: "json", label: "Lottie (JSON)" }
};
export const fileUrl = (cp, kind) => CDN + cp + "/" + FILES[kind].file;

/** "1f44b_1f3fb" → "👋🏻" */
export const cpToChar = (cp) => String.fromCodePoint(...String(cp).split(/[_\s-]+/).filter(Boolean).map((x) => parseInt(x, 16)));
/** "👋🏻" → "1f44b_1f3fb" */
export const charToCp = (ch) => [...String(ch)].map((c) => c.codePointAt(0).toString(16)).join("_");
/** So khớp không tính U+FE0F (dấu chọn kiểu emoji) */
const bare = (cp) => String(cp).toLowerCase().split("_").filter((x) => x !== "fe0f").join("_");

/** data/noto-emoji.json → [{ cp, ch, group, en, vi, kw, key }] (key: chuỗi đã bỏ dấu để tìm) */
export function readList(data) {
  return data.items.map(([cp, g, en, vi, kw]) => {
    const ch = cpToChar(cp);
    return { cp, ch, group: g, en, vi, kw, key: fold([vi, kw, en, cp].join(" ")), bare: bare(cp) };
  });
}

/** Một emoji cụ thể trong câu tìm (dán thẳng emoji) → mã đã bỏ FE0F, hoặc null */
function emojiQuery(q) {
  if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(q)) return null;
  return bare(charToCp(q.replace(/\s+/g, "")));
}

/** Lọc theo câu tìm (bỏ dấu, mọi từ đều phải có) và nhóm (-1 = tất cả) */
export function filterList(list, q, group = -1) {
  const inGroup = (e) => group < 0 || e.group === group;
  const s = String(q || "").trim();
  if (!s) return list.filter(inGroup);
  const em = emojiQuery(s);
  if (em) {
    const exact = list.filter((e) => e.bare === em);
    return exact.length ? exact : list.filter((e) => e.bare.startsWith(em.split("_")[0]));
  }
  const words = fold(s).split(/\s+/).filter(Boolean);
  return list.filter((e) => inGroup(e) && words.every((w) => e.key.includes(w)));
}

/** Tên file tải về: "1f600-mat-cuoi-toe-toet.gif" */
export function fileName(e, kind, name) {
  const slug = fold(name || e.en || "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return (slug ? e.cp + "-" + slug : e.cp) + "." + FILES[kind].ext;
}
