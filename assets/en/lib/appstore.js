/* Tự sinh bởi scripts/build.js từ assets/lib/appstore.js và i18n/en/js/ — đừng sửa tay. */
/* Tải icon, ảnh chụp app App Store (hàm thuần): đọc link App Store hoặc mã app, dựng URL iTunes Lookup/Search API,
   đổi URL ảnh mzstatic.com sang cỡ lớn nhất, đặt tên file. Có test ở tests/tai-ve.test.js */

import { stripAccents } from "./search.js";

const COUNTRY = /^[a-z]{2}$/;

/**
 * Link App Store / mã app / tên app → { id, country } (country có thể null) hoặc { term } để tìm theo tên.
 * Link: apps.apple.com/vn/app/zalo/id579523206, itunes.apple.com/us/app/id579523206?mt=8, apps.apple.com/app/id579523206
 */
export function parseAppStore(input) {
  const s = String(input == null ? "" : input).trim();
  if (!s) return null;
  if (/^(id)?\d{6,12}$/i.test(s)) return { id: s.replace(/^id/i, ""), country: null };
  const m = /(?:apps|itunes)\.apple\.com\/(?:([a-z]{2})\/)?(?:[^?#]*?\/)?id(\d{6,12})/i.exec(s);
  if (m) return { id: m[2], country: m[1] ? m[1].toLowerCase() : null };
  if (/^https?:\/\//i.test(s) || /\.(com|vn|net)\//i.test(s)) return null; // link khác, không phải App Store
  return { term: s.slice(0, 100) };
}

export const lookupUrl = (id, country) => `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&country=${COUNTRY.test(country) ? country : "us"}&entity=software`;
export const searchUrl = (term, country, limit = 12) => `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&country=${COUNTRY.test(country) ? country : "us"}&limit=${limit}`;

/** Đổi đuôi cỡ ảnh mzstatic ("…/392x696bb.jpg") thành cỡ khác; "max" = ảnh gốc lớn nhất */
export function sizedUrl(url, size, ext = "png") {
  const s = size === "max" ? "9999x9999" : `${size}x${size}`;
  return /\/\d+x\d+[a-z]*\.(jpe?g|png|webp)$/i.test(url) ? url.replace(/\/\d+x\d+[a-z]*\.(jpe?g|png|webp)$/i, `/${s}bb.${ext}`) : url;
}

/** Thông tin cần dùng từ một kết quả của iTunes API */
export function appInfo(r) {
  return {
    id: String(r.trackId), name: r.trackName || "", dev: r.artistName || r.sellerName || "", url: r.trackViewUrl || "",
    genre: r.primaryGenreName || "", icon: r.artworkUrl512 || r.artworkUrl100 || r.artworkUrl60 || "",
    iphone: r.screenshotUrls || [], ipad: r.ipadScreenshotUrls || [], tv: r.appletvScreenshotUrls || [],
    mac: r.kind === "mac-software"
  };
}

/** "Zalo – Nhắn gửi yêu thương" → "zalo-nhan-gui-yeu-thuong" (tối đa 40 ký tự) */
export function appSlug(name) {
  const s = stripAccents(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  return s || "app";
}
export const iconName = (name, size, ext) => `${appSlug(name)}-icon-${size}.${ext}`;
export const shotName = (name, kind, i, ext) => `${appSlug(name)}-${kind}-${String(i + 1).padStart(2, "0")}.${ext}`;

/** Bo góc kiểu icon iOS: bán kính ≈ 22,37% cạnh */
export const iosRadius = (size) => Math.round(size * 0.2237);
