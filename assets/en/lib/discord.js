/* Tự sinh bởi scripts/build.js từ assets/lib/discord.js và i18n/en/js/ — đừng sửa tay. */
/* Emoji, sticker Discord (hàm thuần): đọc link/mã emoji, sticker trong đoạn văn bản dán vào, dựng đường dẫn file
   trên cdn.discordapp.com, media.discordapp.net (hai máy chủ này cho trang web tải thẳng), đọc danh sách bộ sticker
   chính thức (discord.com/api/v10/sticker-packs, không cần đăng nhập), đặt tên file an toàn. */

const SNOW = "(\\d{17,20})";
export const PACKS_URL = "https://discord.com/api/v10/sticker-packs";
/** Loại file sticker theo format_type của Discord */
export const STICKER_FORMAT = { 1: "png", 2: "apng", 3: "lottie", 4: "gif" };

/**
 * Văn bản dán vào → danh sách { type: "emoji" | "sticker" | "any", id, name, animated } không trùng.
 * Nhận: <:ten:id>, <a:ten:id> (gõ \:ten: trong Discord để thấy), link cdn.discordapp.com/emojis/<id>.gif?…&name=…,
 * link media.discordapp.net/stickers/<id>.png, hoặc chỉ mã số ("any": thử emoji trước, rồi sticker).
 */
export function parseDiscord(text, max = 300) {
  const s = String(text == null ? "" : text);
  const found = [];
  const add = (it) => {
    const old = found.find((x) => x.id === it.id);
    if (old) { if (old.type === "any") Object.assign(old, it); else { if (!old.name && it.name) old.name = it.name; old.animated = old.animated || it.animated; } return; }
    if (found.length < max) found.push(it);
  };
  const re = new RegExp([
    `<(a?):([A-Za-z0-9_~]{1,32}):${SNOW}>`,                                                        // 1-3: <a:ten:id>
    `(?:cdn\\.discordapp\\.com|media\\.discordapp\\.net)/emojis/${SNOW}(\\.[a-z]+)?([^\\s<>"']*)`,  // 4-6: link emoji
    `(?:cdn\\.discordapp\\.com|media\\.discordapp\\.net)/stickers/${SNOW}(\\.[a-z]+)?`,               // 7-8: link sticker
    `(?:^|[^\\d/.:=])${SNOW}(?![\\d.])`                                                           // 9: chỉ mã số
  ].join("|"), "gi");
  for (let m; (m = re.exec(s));) {
    if (m[3]) add({ type: "emoji", id: m[3], name: m[2], animated: m[1] === "a" });
    else if (m[4]) {
      const q = new URLSearchParams((m[6] || "").replace(/^[^?]*\?/, ""));
      add({ type: "emoji", id: m[4], name: safeName(q.get("name") || ""), animated: /gif/i.test(m[5] || "") || q.get("animated") === "true" });
    } else if (m[7]) add({ type: "sticker", id: m[7], name: "", animated: false, ext: (m[8] || "").slice(1).toLowerCase() });
    else if (m[9]) add({ type: "any", id: m[9], name: "", animated: false });
  }
  return found;
}

/** Đường dẫn emoji. ext: "webp" | "png" | "gif"; size: cỡ cạnh dài (Discord không phóng to quá cỡ gốc: 4096 = cỡ gốc) */
export function emojiUrl(id, ext, size = 4096, animated = false) {
  const q = new URLSearchParams({ size: String(size) });
  if (ext === "webp") { q.set("quality", "lossless"); if (animated) q.set("animated", "true"); }
  return `https://cdn.discordapp.com/emojis/${id}.${ext}?${q}`;
}
/** Đường dẫn file sticker theo loại: PNG, APNG (.png), GIF ở media.discordapp.net; Lottie (.json) ở cdn.discordapp.com */
export function stickerUrl(id, kind) {
  if (kind === "lottie") return `https://cdn.discordapp.com/stickers/${id}.json`;
  return `https://media.discordapp.net/stickers/${id}.${kind === "gif" ? "gif" : "png"}`;
}
/** Thứ tự thử khi chưa biết loại sticker (chỉ có mã): PNG/APNG, Lottie, GIF; ext trong link đặt lên đầu */
export function stickerGuesses(ext) {
  const all = ["png", "lottie", "gif"];
  const first = ext === "json" ? "lottie" : ext === "gif" ? "gif" : "png";
  return [first, ...all.filter((x) => x !== first)];
}

/** Phản hồi của /sticker-packs → [{ id, name, desc, cover, banner (link ảnh bìa), stickers: [{ id, name, kind }] }] */
export function readPacks(json) {
  const list = (json && (json.sticker_packs || json)) || [];
  if (!Array.isArray(list)) return [];
  return list.map((p) => ({
    id: String(p.id), name: p.name || "", desc: p.description || "",
    cover: String(p.cover_sticker_id || (p.stickers && p.stickers[0] && p.stickers[0].id) || ""),
    banner: p.banner_asset_id ? `https://cdn.discordapp.com/app-assets/710982414301790216/store/${p.banner_asset_id}.png?size=512` : "",
    stickers: (p.stickers || []).map((st) => ({ id: String(st.id), name: st.name || "", kind: STICKER_FORMAT[st.format_type] || "png" }))
  })).filter((p) => p.stickers.length);
}

/** Tên dùng được làm tên file (bỏ ký tự cấm trên Windows, macOS) */
export function safeName(s) {
  return String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/^[\s.]+|[\s.]+$/g, "").slice(0, 60);
}
