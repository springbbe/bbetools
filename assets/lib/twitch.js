/* Emote Twitch của 7TV, FrankerFaceZ (hàm thuần): đọc tên kênh / link, dựng đường dẫn API, chuyển phản hồi của
   7tv.io và api.frankerfacez.com thành một danh sách emote chung, chọn file theo cỡ và định dạng.
   Cả hai API và máy chủ ảnh (cdn.7tv.app, cdn.frankerfacez.com) đều cho trang web tải thẳng.
   BetterTTV không làm được: API cho gọi nhưng máy chủ ảnh cdn.betterttv.net không cho trang web tải file. */

export const API = {
  ffzRoom: (login) => `https://api.frankerfacez.com/v1/room/${encodeURIComponent(login)}`,
  ffzRoomId: (id) => `https://api.frankerfacez.com/v1/room/id/${id}`,
  ivrUser: (login) => `https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(login)}`,
  stvTwitch: (id) => `https://7tv.io/v3/users/twitch/${id}`,
  stvUser: (id) => `https://7tv.io/v3/users/${id}`,
  stvSet: (id) => `https://7tv.io/v3/emote-sets/${id}`
};

const LOGIN = /^[A-Za-z0-9_]{3,25}$/;
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const ULID_IN = "([0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26})";

/**
 * Tên kênh, link → { kind: "login", login } | { kind: "id", id } (mã số Twitch) | { kind: "7tv-user", id } | { kind: "7tv-set", id }
 * Nhận: "xqc", "@xqc", twitch.tv/xqc, m.twitch.tv/xqc/videos, 7tv.app/users/<id>, 7tv.app/emote-sets/<id>, mã số kênh.
 */
export function parseChannel(input) {
  let s = String(input == null ? "" : input).trim();
  if (!s) return null;
  let m;
  if ((m = new RegExp(`7tv\\.app/(users|emote-sets)/${ULID_IN}`, "i").exec(s))) return { kind: m[1] === "users" ? "7tv-user" : "7tv-set", id: m[2].toUpperCase() };
  if ((m = /(?:^|\/\/|\.)twitch\.tv\/(?:popout\/)?([A-Za-z0-9_]{3,25})(?:[/?#]|$)/i.exec(s))) {
    const login = m[1].toLowerCase();
    return ["directory", "videos", "settings", "search", "downloads", "p", "jobs", "turbo"].includes(login) ? null : { kind: "login", login };
  }
  s = s.replace(/^@/, "");
  if (/^\d{1,12}$/.test(s)) return { kind: "id", id: s };
  if (ULID.test(s)) return { kind: "7tv-set", id: s.toUpperCase() };
  if (LOGIN.test(s)) return { kind: "login", login: s.toLowerCase() };
  return null;
}

/* Một emote: { source: "7tv" | "ffz", id, name, animated, w, h (cỡ 1x), files: { [scale]: { webp, gif, png } } } */

/** Emote set của 7TV (phản hồi /emote-sets/<id> hoặc trường emote_set của /users/twitch/<id>) → emote */
export function from7tv(set) {
  const list = (set && set.emotes) || [];
  return list.map((e) => {
    const d = e.data || e, host = d.host || {};
    const base = "https:" + String(host.url || `//cdn.7tv.app/emote/${d.id || e.id}`).replace(/^https?:/, "");
    const files = {};
    let w = 0, hh = 0;
    for (const f of host.files || []) {
      const mm = /^(\d)x\.(webp|gif|png)$/i.exec(f.name || "");
      if (!mm) continue;
      const sc = +mm[1];
      (files[sc] = files[sc] || {})[mm[2].toLowerCase()] = `${base}/${f.name}`;
      if (sc === 1) { w = f.width; hh = f.height; }
    }
    if (!Object.keys(files).length) for (const sc of [1, 2, 3, 4]) files[sc] = d.animated ? { webp: `${base}/${sc}x.webp`, gif: `${base}/${sc}x.gif` } : { webp: `${base}/${sc}x.webp`, png: `${base}/${sc}x.png` };
    return { source: "7tv", id: String(e.id || d.id), name: e.name || d.name || "", animated: !!d.animated, w, h: hh, files };
  });
}

/** Phản hồi /v1/room/… của FrankerFaceZ → emote (ảnh tĩnh PNG; ảnh động có WEBP, thêm đuôi .gif để lấy GIF) */
export function fromFfz(json) {
  const out = [];
  for (const set of Object.values((json && json.sets) || {})) {
    for (const e of set.emoticons || []) {
      const files = {};
      for (const [sc, url] of Object.entries(e.urls || {})) files[+sc] = { png: fixUrl(url) };
      for (const [sc, url] of Object.entries(e.animated || {})) {
        const u = fixUrl(url).replace(/\.(webp|gif)$/i, "");
        files[+sc] = Object.assign(files[+sc] || {}, { webp: u + ".webp", gif: u + ".gif" });
      }
      out.push({ source: "ffz", id: String(e.id), name: e.name || "", animated: !!(e.animated && Object.keys(e.animated).length), w: e.width || 0, h: e.height || 0, files });
    }
  }
  return out;
}
const fixUrl = (u) => (String(u).startsWith("//") ? "https:" + u : String(u));

/** Cỡ lớn nhất có sẵn không vượt quá max (1–4) */
export function pickScale(em, max = 4) {
  const have = Object.keys(em.files).map(Number).sort((a, b) => b - a);
  return have.find((s) => s <= max) || have[have.length - 1] || 1;
}
/**
 * File cần tải. format: "orig" (7TV: WEBP; FFZ: PNG tĩnh hoặc WEBP động) | "conv" (PNG cho ảnh tĩnh, GIF cho ảnh động)
 * → { url, ext } (null nếu không có)
 */
export function emoteFile(em, format, max = 4) {
  const f = em.files[pickScale(em, max)] || {};
  if (format === "conv") {
    if (em.animated) return f.gif ? { url: f.gif, ext: "gif" } : f.webp ? { url: f.webp, ext: "webp" } : null;
    return f.png ? { url: f.png, ext: "png" } : f.webp ? { url: f.webp, ext: "webp" } : null;
  }
  if (f.webp) return { url: f.webp, ext: "webp" };
  return f.png ? { url: f.png, ext: "png" } : f.gif ? { url: f.gif, ext: "gif" } : null;
}
/** Ảnh xem trước nhẹ (cỡ 2x, ảnh động vẫn chạy) */
export function previewUrl(em) {
  const f = em.files[2] || em.files[pickScale(em, 2)] || {};
  return f.webp || f.png || f.gif || "";
}

/** Gộp nhiều nguồn, bỏ emote trùng (cùng nguồn và mã) */
export function mergeEmotes(...lists) {
  const seen = new Set(), out = [];
  for (const l of lists) for (const e of l || []) { const k = e.source + ":" + e.id; if (!seen.has(k)) { seen.add(k); out.push(e); } }
  return out;
}

/** Tên emote → tên file an toàn (":)" thành "_)"), không rỗng */
export function emoteFileName(name, ext, fallback = "emote") {
  const n = String(name || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/^[\s.]+|[\s.]+$/g, "").slice(0, 60) || fallback;
  return n + "." + ext;
}
