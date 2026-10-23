/* Sticker Telegram (hàm thuần): đọc tên bộ sticker từ link, kiểm tra dạng token bot, loại file của sticker,
   tên file tải về và lịch khung hình khi đổi sticker động sang GIF. */

/** "https://t.me/addstickers/Ten_Bo", "t.me/addemoji/X", "tg://addstickers?set=X", "@X" hoặc "X" → "X" (null nếu không hợp lệ) */
export function packName(input) {
  let s = String(input == null ? "" : input).trim();
  if (!s) return null;
  const m = /(?:^|\/\/|\.)t(?:elegram)?\.me\/(?:addstickers|addemoji)\/([^/?#\s]+)/i.exec(s) || /^tg:\/\/(?:addstickers|addemoji)\?set=([^&#\s]+)/i.exec(s);
  if (m) s = m[1];
  else if (/^https?:\/\//i.test(s) || /\//.test(s)) return null;
  s = decodeURIComponent(s).replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,64}$/.test(s) ? s : null;
}

/** Token bot do @BotFather cấp: "123456789:AA…" (số id, dấu hai chấm, chuỗi bí mật) */
export const isToken = (s) => /^\d{5,15}:[A-Za-z0-9_-]{30,50}$/.test(String(s || "").trim());

/** Loại file gốc của một sticker trong Bot API: "tgs" (Lottie động), "webm" (video), "webp" (ảnh tĩnh) */
export const stickerKind = (st) => (st && st.is_animated ? "tgs" : st && st.is_video ? "webm" : "webp");
/** Loại file theo tên (dùng khi người dùng tự chọn file); "" nếu không phải sticker */
export function kindOfName(name) {
  const m = /\.(tgs|webm|webp|json|png|gif)$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "";
}

/** Tên file trong bộ: "007.webp" (đánh số theo thứ tự trong bộ, đủ chữ số để sắp xếp đúng) */
export function itemName(index, total, ext) {
  const w = Math.max(2, String(total).length);
  return String(index + 1).padStart(w, "0") + "." + ext;
}

/**
 * Lịch khung hình cho GIF: lấy mẫu đoạn dài durationSec ở fps khung/giây.
 * GIF ghi thời gian mỗi khung theo 1/100 giây nên thời gian được làm tròn tích luỹ: tổng vẫn đúng độ dài gốc.
 * → [{ t: giây tính từ đầu, delay: mili giây (bội số của 10) }]
 */
export function frameSchedule(durationSec, fps, maxFrames = 300) {
  const d = Math.max(0, +durationSec || 0), f = Math.max(1, +fps || 1);
  let n = Math.max(1, Math.round(d * f));
  if (n > maxFrames) n = maxFrames;
  const step = d / n, out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.round(i * step * 100), b = Math.round((i + 1) * step * 100);
    out.push({ t: i * step, delay: Math.max(2, b - a) * 10 });
  }
  return out;
}
