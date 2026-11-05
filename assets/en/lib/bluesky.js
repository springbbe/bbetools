/* Tự sinh bởi scripts/build.js từ assets/lib/bluesky.js và i18n/en/js/ — đừng sửa tay. */
/* Tải ảnh, video Bluesky (hàm thuần): đọc link bài đăng, dựng URL API công khai, tìm máy chủ dữ liệu (PDS) của người
   đăng từ tài liệu DID, liệt kê ảnh/video đính kèm trong bản ghi bài đăng (cả bài trích dẫn có kèm media), đặt tên file.
   File gốc (ảnh đúng định dạng người đăng tải lên, video MP4) lấy bằng com.atproto.sync.getBlob trên PDS.
   Có test ở tests/tai-ve.test.js */

export const APPVIEW = "https://public.api.bsky.app/xrpc/";
const RKEY = /^[A-Za-z0-9._~:-]{1,512}$/;

/** Link bài đăng → { actor (handle hoặc did), rkey }, null nếu không nhận ra.
 *  Nhận: bsky.app/profile/<handle|did>/post/<rkey> (cả các app khác cùng dạng link), at://<did>/app.bsky.feed.post/<rkey> */
export function parsePostLink(input) {
  const s = String(input == null ? "" : input).trim();
  let m = /^at:\/\/([^/\s]+)\/app\.bsky\.feed\.post\/([^/?#\s]+)/i.exec(s);
  if (!m) m = /(?:^|\/\/|\s)(?:[\w.-]+\/)?profile\/([^/\s]+)\/post\/([^/?#\s]+)/i.exec(s);
  if (!m) return null;
  let actor;
  try { actor = decodeURIComponent(m[1]).replace(/^@/, ""); } catch (_) { return null; }
  if (!RKEY.test(m[2])) return null;
  if (!/^did:(plc|web):[\w.:%-]+$/i.test(actor) && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(actor)) return null;
  return { actor: actor.startsWith("did:") ? actor : actor.toLowerCase(), rkey: m[2] };
}

export const resolveHandleUrl = (handle) => `${APPVIEW}com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
export const postUri = (did, rkey) => `at://${did}/app.bsky.feed.post/${rkey}`;
export const getPostsUrl = (uri) => `${APPVIEW}app.bsky.feed.getPosts?uris=${encodeURIComponent(uri)}`;

/** Địa chỉ tài liệu DID: did:plc → plc.directory, did:web → https://<tên miền>/.well-known/did.json */
export function didDocUrl(did) {
  if (/^did:plc:/i.test(did)) return "https://plc.directory/" + did;
  const m = /^did:web:([^:]+)$/i.exec(did);
  return m ? `https://${decodeURIComponent(m[1])}/.well-known/did.json` : null;
}
/** Máy chủ dữ liệu (PDS) trong tài liệu DID */
export function pdsFromDoc(doc) {
  const s = ((doc && doc.service) || []).find((x) => x.id === "#atproto_pds" || x.id === doc.id + "#atproto_pds" || x.type === "AtprotoPersonalDataServer");
  const u = s && typeof s.serviceEndpoint === "string" ? s.serviceEndpoint.replace(/\/+$/, "") : null;
  return u && /^https:\/\//.test(u) ? u : null;
}
export const blobUrl = (pds, did, cid) => `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
export const cdnImage = (did, cid) => `https://cdn.bsky.app/img/feed_fullsize/plain/${did}/${cid}@jpeg`;
export const cdnThumb = (did, cid) => `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg`;
export const videoThumb = (did, cid) => `https://video.bsky.app/watch/${encodeURIComponent(did)}/${cid}/thumbnail.jpg`;

// blob mới: { ref: { $link }, mimeType, size }; blob cũ: { cid, mimeType }
const blobCid = (b) => (b && ((b.ref && (b.ref.$link || (typeof b.ref === "string" ? b.ref : null))) || b.cid)) || null;

/** Ảnh, video trong embed của bản ghi bài đăng → [{ kind, cid, mime, size, alt, w, h, quoted }] */
export function mediaFromRecord(record, quoted = false) {
  const out = [], e = record && record.embed;
  const add = (m) => {
    if (!m) return;
    const t = m.$type || "";
    if (t.startsWith("app.bsky.embed.images")) for (const im of m.images || []) {
      const cid = blobCid(im.image);
      if (cid) out.push({ kind: "image", cid, mime: (im.image && im.image.mimeType) || "image/jpeg", size: (im.image && im.image.size) || 0, alt: im.alt || "", w: im.aspectRatio && im.aspectRatio.width, h: im.aspectRatio && im.aspectRatio.height, quoted });
    }
    if (t.startsWith("app.bsky.embed.video")) {
      const cid = blobCid(m.video);
      if (cid) out.push({ kind: "video", cid, mime: (m.video && m.video.mimeType) || "video/mp4", size: (m.video && m.video.size) || 0, alt: m.alt || "", w: m.aspectRatio && m.aspectRatio.width, h: m.aspectRatio && m.aspectRatio.height, gif: m.presentation === "gif", quoted });
    }
  };
  if (!e) return out;
  if ((e.$type || "").startsWith("app.bsky.embed.recordWithMedia")) add(e.media);
  else add(e);
  return out;
}

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "image/avif": "avif", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/mpeg": "mpeg" };
export const extOfMime = (mime) => EXT[String(mime).toLowerCase()] || (String(mime).split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";

/** Tên file: bsky-<handle>-<rkey>[-số thứ tự].<đuôi> */
export function mediaName(handle, rkey, i, total, mime) {
  const who = String(handle || "bsky").replace(/\.bsky\.social$/i, "").replace(/[^a-z0-9.-]+/gi, "-").slice(0, 40);
  return `bsky-${who}-${rkey}${total > 1 ? "-" + (i + 1) : ""}.${extOfMime(mime)}`;
}
