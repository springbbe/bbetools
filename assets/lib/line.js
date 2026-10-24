/* Sticker, emoji LINE (hàm thuần): đọc link cửa hàng LINE, dựng đường dẫn file trên stickershop.line-scdn.net
   (máy chủ này cho trang web tải thẳng), chọn tên bộ theo ngôn ngữ, mô tả loại bộ. */

import { stripAccents } from "./search.js";

const CDN = "https://stickershop.line-scdn.net/";

/**
 * Link hoặc mã → { type: "sticker" | "emoji", id } (null nếu không nhận ra).
 * Nhận: store.line.me/stickershop/product/13321/vi, line.me/S/sticker/13321, line.me/R/shop/detail/13321,
 * line://shop/detail/13321, store.line.me/emojishop/product/<24 ký tự hex>, line.me/S/emoji/?id=<hex>, hoặc chỉ mã số / mã hex.
 */
export function parseLineLink(input) {
  const s = String(input == null ? "" : input).trim();
  if (!s) return null;
  let m;
  if ((m = /^\d{1,12}$/.exec(s))) return { type: "sticker", id: s };
  if ((m = /^[0-9a-f]{24}$/i.exec(s))) return { type: "emoji", id: s.toLowerCase() };
  if (!/line\.me|line:\/\//i.test(s)) return null;
  if ((m = /(?:stickershop\/product|\/S\/sticker|shop\/(?:sticker\/)?detail|sticker\/detail)\/(\d{1,12})(?:[/?#]|$)/i.exec(s))) return { type: "sticker", id: m[1] };
  if ((m = /(?:emojishop\/product\/|\/S\/emoji\/?\?id=|emoji\/product\/|[?&]id=)([0-9a-f]{24})(?:[/?#&]|$)/i.exec(s))) return { type: "emoji", id: m[1].toLowerCase() };
  return null;
}

export const storeUrl = (p) => p.type === "emoji" ? `https://store.line.me/emojishop/product/${p.id}` : `https://store.line.me/stickershop/product/${p.id}`;
export const stickerMetaUrl = (id) => `${CDN}stickershop/v1/product/${id}/iphone/productInfo.meta`;
export const emojiMetaUrl = (id) => `${CDN}sticonshop/v1/product/${id}/iphone/meta.json`;

const ANIM = ["ANIMATION", "ANIMATION_SOUND"], POPUP = ["POPUP", "POPUP_SOUND"], SOUND = ["SOUND", "ANIMATION_SOUND", "POPUP_SOUND"];

/** Loại bộ sticker từ productInfo.meta → { anim: "" | "animation" | "popup", sound, text } */
export function packKind(meta) {
  const t = String((meta && meta.stickerResourceType) || "STATIC").toUpperCase();
  return {
    anim: POPUP.includes(t) ? "popup" : ANIM.includes(t) || (meta && meta.hasAnimation) ? "animation" : "",
    sound: SOUND.includes(t) || !!(meta && meta.hasSound),
    text: ["NAME_TEXT", "PER_STICKER_TEXT", "CUSTOM", "MESSAGE"].includes(t)
  };
}

/** Đường dẫn các file của một sticker → { still, anim?, sound? } */
export function stickerFiles(stickerId, kind) {
  const b = `${CDN}stickershop/v1/sticker/${stickerId}/iPhone/`;
  const out = { still: b + "sticker@2x.png" };
  if (kind.anim === "animation") out.anim = b + "sticker_animation@2x.png";
  if (kind.anim === "popup") out.anim = b + "sticker_popup.png";
  if (kind.sound) out.sound = b + "sticker_sound.m4a";
  return out;
}

/** Đường dẫn một emoji trong bộ ("001") → { still, anim? } */
export function emojiFiles(productId, order, animated) {
  const b = `${CDN}sticonshop/v1/sticon/${productId}/iPhone/${order}`;
  return animated ? { still: b + ".png", anim: b + "_animation.png" } : { still: b + ".png" };
}

/** Tên bộ theo ngôn ngữ: ưu tiên ngôn ngữ trang, rồi tiếng Anh, tiếng Nhật, rồi bất kỳ */
export function pickTitle(obj, lang = "vi") {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || obj.ja || Object.values(obj)[0] || "";
}

/** Tên file an toàn cho bộ: "LINE-13321-Brown-Cony" */
export function packFileName(prefix, id, title) {
  const t = stripAccents(title || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return [prefix, id, t].filter(Boolean).join("-");
}
