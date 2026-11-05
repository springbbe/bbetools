/* Tự sinh bởi scripts/build.js từ assets/lib/mastodon.js và i18n/en/js/ — đừng sửa tay. */
/* Tải ảnh, video Mastodon (hàm thuần): đọc link bài đăng (Mastodon và máy chủ cùng API như Pleroma, Akkoma, GoToSocial),
   dựng URL API /api/v1/statuses/<id>, liệt kê file đính kèm, đặt tên file. Có test ở tests/tai-ve.test.js */

const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const ID = /^[A-Za-z0-9]{1,40}$/;

/**
 * Link bài đăng → { host, id }, null nếu không nhận ra. Nhận:
 * https://máy-chủ/@tên/<id>, …/@tên@máy-chủ-khác/<id>, …/@tên/<id>/embed, …/users/<tên>/statuses/<id>,
 * …/notice/<id> (Pleroma, Akkoma), …/web/statuses/<id>, …/web/@tên/<id>
 */
export function parseStatusLink(input) {
  let s = String(input == null ? "" : input).trim();
  if (!s) return null;
  if (!/^[a-z]+:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch (_) { return null; }
  if (u.protocol !== "https:" || !HOST.test(u.hostname)) return null;
  const p = u.pathname.split("/").filter(Boolean);
  let id = null;
  if (p[0] === "web") p.shift();
  if (p[0] && p[0].startsWith("@") && p[1]) id = p[1];
  else if (p[0] === "users" && p[2] === "statuses") id = p[3];
  else if ((p[0] === "notice" || p[0] === "statuses" || p[0] === "objects") && p[1]) id = p[1];
  if (!id || !ID.test(id)) return null;
  return { host: u.hostname.toLowerCase(), id };
}

export const statusUrl = (host, id) => `https://${host}/api/v1/statuses/${encodeURIComponent(id)}`;

/** File đính kèm của bài đăng (bài được đăng lại thì lấy bài gốc) → [{ type, url, remote, preview, alt, w, h, duration }] */
export function mediaOf(status) {
  const st = (status && status.reblog) || status || {};
  return (st.media_attachments || []).map((m) => {
    const o = (m.meta && m.meta.original) || {};
    // "unknown": máy chủ chưa lưu bản sao file của máy chủ khác, chỉ còn link gốc
    const url = m.type === "unknown" ? m.remote_url || m.url : m.url || m.remote_url;
    return { type: m.type, url, remote: m.remote_url || null, preview: m.preview_url || null, alt: m.description || "", w: o.width || null, h: o.height || null, duration: o.duration || null };
  }).filter((m) => m.url && /^https:\/\//.test(m.url));
}

/** Đuôi file từ URL ("…/original/abc.mp4?x" → "mp4") */
export function extOfUrl(url, type) {
  const m = /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(String(url).split("/").pop() || "");
  if (m) return m[1].toLowerCase();
  return type === "image" ? "jpg" : type === "audio" ? "mp3" : "mp4";
}

/** Tên file: mastodon-<tên>-<id>[-số thứ tự].<đuôi> */
export function mediaFile(acct, id, i, total, m) {
  const who = String(acct || "mastodon").split("@")[0].replace(/[^a-z0-9_-]+/gi, "-").slice(0, 30) || "mastodon";
  return `mastodon-${who}-${id}${total > 1 ? "-" + (i + 1) : ""}.${extOfUrl(m.url, m.type)}`;
}

/** Bỏ thẻ HTML khỏi nội dung bài đăng (để xem trước dạng chữ) */
export function plainText(html) {
  return String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p>/gi, "\n\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
}
