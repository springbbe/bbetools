/* Tự sinh bởi scripts/build.js từ assets/lib/youtube.js và i18n/en/js/ — đừng sửa tay. */
/* Thumbnail YouTube (hàm thuần): đọc link video (watch, youtu.be, Shorts, embed, live…), dựng đường dẫn ảnh trên
   i.ytimg.com (máy chủ này cho trang web tải thẳng), tìm viền đen của ảnh 4:3, đặt tên file. */

import { stripAccents } from "./search.js";

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

/** Link hoặc mã video (11 ký tự) → mã video, null nếu không nhận ra */
export function parseYouTube(input) {
  let s = String(input == null ? "" : input).trim();
  if (!s) return null;
  if (ID.test(s)) return s;
  if (!/^[a-z]+:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch (_) { return null; }
  if (!HOSTS.test(u.hostname)) return null;
  const ok = (x) => (x && ID.test(x) ? x : null);
  if (/youtu\.be$/i.test(u.hostname)) return ok(u.pathname.split("/")[1]);
  const v = u.searchParams.get("v") || u.searchParams.get("vi");
  if (v) return ok(v);
  const m = /^\/(?:shorts|embed|live|v|e|vi)\/([^/?#]+)/i.exec(u.pathname);
  if (m) return ok(m[1]);
  // youtube.com/attribution_link?u=/watch%3Fv%3D…
  const inner = u.searchParams.get("u");
  if (inner) return parseYouTube("https://www.youtube.com" + (inner.startsWith("/") ? "" : "/") + inner);
  return null;
}

/** Nhiều link (mỗi dòng, hoặc cách nhau bằng dấu cách, dấu phẩy) → danh sách mã không trùng */
export function parseMany(text, max = 50) {
  const out = [];
  for (const part of String(text || "").split(/[\s,;]+/)) {
    const id = parseYouTube(part);
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Các cỡ ảnh, từ lớn tới nhỏ. try: tên file thử lần lượt (file đầu tiên có thật được dùng).
 * Ảnh SD (640×480) và HQ (480×360) là 4:3: video 16:9 có viền đen trên dưới.
 */
export const SIZES = [
  { key: "hd", label: "HD", w: 1280, h: 720, try: ["maxresdefault", "hq720"] },
  { key: "sd", label: "SD", w: 640, h: 480, try: ["sddefault"] },
  { key: "hq", label: "HQ", w: 480, h: 360, try: ["hqdefault"] },
  { key: "mq", label: "MQ", w: 320, h: 180, try: ["mqdefault"] },
  { key: "default", label: "Small", w: 120, h: 90, try: ["default"] }
];
/** Ba khung hình YouTube tự chụp từ video (khoảng 1/4, 1/2, 3/4 thời lượng), mỗi khung thử cỡ lớn trước */
export const FRAMES = [1, 2, 3].map((n) => ({ key: "frame" + n, n, try: [["maxres" + n, 1280, 720], ["sd" + n, 640, 480], ["hq" + n, 480, 360]] }));

export const thumbUrl = (id, file) => `https://i.ytimg.com/vi/${id}/${file}.jpg`;
export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;
export const oembedUrl = (id) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`;

/**
 * Viền đen (letterbox/pillarbox) của ảnh: rgba (Uint8ClampedArray w*h*4) → { x, y, w, h } phần có nội dung,
 * null nếu không có viền đáng kể. Một hàng/cột là viền khi gần như mọi điểm đều tối (JPG có nhiễu nên cho phép sai lệch).
 */
export function letterbox(rgba, w, h, { dark = 28, ratio = 0.97, min = 0.04 } = {}) {
  if (!rgba || w < 8 || h < 8) return null;
  const isDark = (i) => rgba[i] <= dark && rgba[i + 1] <= dark && rgba[i + 2] <= dark;
  const rowDark = (y) => { let n = 0; for (let x = 0; x < w; x++) if (isDark((y * w + x) * 4)) n++; return n >= w * ratio; };
  const colDark = (x, y0, y1) => { let n = 0; for (let y = y0; y < y1; y++) if (isDark((y * w + x) * 4)) n++; return n >= (y1 - y0) * ratio; };
  let top = 0, bottom = h;
  while (top < h / 2 && rowDark(top)) top++;
  while (bottom > top + h / 4 && rowDark(bottom - 1)) bottom--;
  let left = 0, right = w;
  while (left < w / 2 && colDark(left, top, bottom)) left++;
  while (right > left + w / 4 && colDark(right - 1, top, bottom)) right--;
  // bỏ qua viền quá mỏng (vài hàng tối do nội dung) và ảnh tối hoàn toàn
  if (top < h * min) top = 0;
  if (h - bottom < h * min) bottom = h;
  if (left < w * min) left = 0;
  if (w - right < w * min) right = w;
  if (top === 0 && bottom === h && left === 0 && right === w) return null;
  if (bottom - top < h * 0.3 || right - left < w * 0.3) return null;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Tên file: "Ten-video-HD.jpg" (bỏ dấu, chỉ chữ, số, gạch nối); không có tiêu đề thì dùng mã video */
export function thumbName(title, id, label, ext) {
  const t = stripAccents(title || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${t || "youtube-" + id}-${label}.${ext}`;
}
