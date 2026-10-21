/* Mã hoá bằng mật khẩu (hàm thuần, Web Crypto — chạy cả trình duyệt lẫn Node): AES-GCM 256, khoá dẫn xuất bằng PBKDF2-SHA256.
   Dùng chung cho "Mã hoá/giải mã file" và "Mã hoá văn bản".

   Định dạng BbeTools v1 (số nguyên big-endian):
     0  "BBENC" (5 byte) + phiên bản 0x01
     6  thuật toán dẫn xuất khoá: 0x01 = PBKDF2-HMAC-SHA256
     7  số vòng lặp (u32)
     11 salt (16 byte)
     27 tiền tố nonce (7 byte)
     34 cỡ khối bản rõ (u32)
     38 các khối mã: mỗi khối = AES-GCM(khối bản rõ) + thẻ xác thực 16 byte.
   Nonce khối i = tiền tố (7) ‖ i (u32) ‖ 0x01 nếu là khối cuối, ngược lại 0x00 (kiểu STREAM: không cắt bớt, đảo thứ tự khối được).
   Toàn bộ 38 byte đầu là dữ liệu xác thực bổ sung (AAD) của mọi khối.
   Bản rõ = độ dài meta (u32) ‖ meta JSON UTF-8 ({ name, type } của file gốc) ‖ nội dung. Văn bản dùng meta rỗng, cả gói viết bằng Base64. */

export const MAGIC = [0x42, 0x42, 0x45, 0x4e, 0x43]; // "BBENC"
export const VERSION = 1;
export const HEADER_LEN = 38;
export const ITERATIONS = 600000; // khuyến nghị của OWASP (2023) cho PBKDF2-HMAC-SHA256
export const CHUNK = 1 << 20; // 1 MiB
const TAG = 16;
const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();

export class CryptoError extends Error { constructor(msg) { super(msg); this.userMsg = msg; } }
const WRONG = "Sai mật khẩu, hoặc dữ liệu đã bị sửa / hỏng.";

const keyCache = new Map();
/** Khoá AES-GCM từ mật khẩu (có bộ nhớ đệm vài khoá gần nhất để khỏi tính lại khi gõ) */
export function deriveKey(password, salt, iterations = ITERATIONS) {
  const id = iterations + ":" + Array.from(salt).join(",") + ":" + password;
  if (keyCache.has(id)) return keyCache.get(id);
  const p = subtle().importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"])
    .then((base) => subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]));
  keyCache.set(id, p);
  if (keyCache.size > 6) keyCache.delete(keyCache.keys().next().value);
  return p;
}

export function makeHeader({ iterations = ITERATIONS, salt, prefix, chunkSize = CHUNK }) {
  const b = new Uint8Array(HEADER_LEN), v = new DataView(b.buffer);
  b.set(MAGIC); b[5] = VERSION; b[6] = 1;
  v.setUint32(7, iterations); b.set(salt, 11); b.set(prefix, 27); v.setUint32(34, chunkSize);
  return b;
}
/** Đọc phần đầu; trả null nếu không phải định dạng BbeTools */
export function parseHeader(b) {
  if (!b || b.length < HEADER_LEN || !MAGIC.every((x, i) => b[i] === x)) return null;
  const v = new DataView(b.buffer, b.byteOffset, HEADER_LEN);
  if (b[5] !== VERSION) throw new CryptoError("File được mã hoá bằng phiên bản BbeTools mới hơn, hãy tải lại trang.");
  if (b[6] !== 1) throw new CryptoError("Không hỗ trợ kiểu dẫn xuất khoá này.");
  const iterations = v.getUint32(7), chunkSize = v.getUint32(34);
  if (iterations < 1000 || iterations > 10000000 || chunkSize < 1024 || chunkSize > 64 << 20) throw new CryptoError("Phần đầu file mã hoá không hợp lệ.");
  return { iterations, salt: b.slice(11, 27), prefix: b.slice(27, 34), chunkSize, header: b.slice(0, HEADER_LEN) };
}
export const isEncrypted = (head) => !!head && head.length >= 6 && MAGIC.every((x, i) => head[i] === x);

function nonce(prefix, i, last) {
  const n = new Uint8Array(12);
  n.set(prefix); new DataView(n.buffer).setUint32(7, i); n[11] = last ? 1 : 0;
  return n;
}
const rand = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const abort = (signal) => { if (signal && signal.aborted) throw Object.assign(new Error("Đã huỷ"), { cancelled: true }); };

/** Mã hoá Blob/File → Blob định dạng BbeTools. meta: { name, type } lưu kèm (đã mã hoá) để giải mã trả lại đúng tên. */
export async function encryptBlob(blob, password, meta = {}, o = {}) {
  if (!password) throw new CryptoError("Cần mật khẩu.");
  const chunkSize = o.chunkSize || CHUNK, iterations = o.iterations || ITERATIONS;
  const salt = o.salt || rand(16), prefix = o.prefix || rand(7);
  const header = makeHeader({ iterations, salt, prefix, chunkSize });
  const key = await deriveKey(password, salt, iterations);
  const m = enc.encode(JSON.stringify(meta || {}));
  const lenB = new Uint8Array(4); new DataView(lenB.buffer).setUint32(0, m.length);
  const plain = new Blob([lenB, m, blob]);
  const n = Math.max(1, Math.ceil(plain.size / chunkSize));
  const parts = [header];
  for (let i = 0; i < n; i++) {
    abort(o.signal);
    const pt = new Uint8Array(await plain.slice(i * chunkSize, (i + 1) * chunkSize).arrayBuffer());
    parts.push(new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: nonce(prefix, i, i === n - 1), additionalData: header }, key, pt)));
    if (o.onProgress) o.onProgress((i + 1) / n);
  }
  return new Blob(parts, { type: "application/octet-stream" });
}

/** Giải mã Blob định dạng BbeTools → { blob, meta } */
export async function decryptBlob(blob, password, o = {}) {
  const h = parseHeader(new Uint8Array(await blob.slice(0, HEADER_LEN).arrayBuffer()));
  if (!h) throw new CryptoError("Đây không phải file do BbeTools mã hoá.");
  const key = await deriveKey(password, h.salt, h.iterations);
  const body = blob.size - HEADER_LEN, cs = h.chunkSize + TAG;
  const n = Math.ceil(body / cs);
  if (n < 1 || body - (n - 1) * cs <= TAG) throw new CryptoError("File mã hoá bị thiếu dữ liệu (tải chưa hết?).");
  const parts = [];
  for (let i = 0; i < n; i++) {
    abort(o.signal);
    const ct = new Uint8Array(await blob.slice(HEADER_LEN + i * cs, HEADER_LEN + (i + 1) * cs).arrayBuffer());
    let pt;
    try { pt = await subtle().decrypt({ name: "AES-GCM", iv: nonce(h.prefix, i, i === n - 1), additionalData: h.header }, key, ct); }
    catch (_) { throw new CryptoError(i === 0 ? WRONG : "File mã hoá bị hỏng hoặc bị cắt ở khoảng " + Math.round((i / n) * 100) + "%."); }
    parts.push(new Uint8Array(pt));
    if (o.onProgress) o.onProgress((i + 1) / n);
  }
  const first = parts[0];
  if (first.length < 4) throw new CryptoError(WRONG);
  const ml = new DataView(first.buffer, first.byteOffset, 4).getUint32(0);
  if (4 + ml > first.length) throw new CryptoError("Thông tin file bên trong không hợp lệ.");
  let meta = {};
  try { meta = JSON.parse(dec.decode(first.subarray(4, 4 + ml)) || "{}"); } catch (_) {}
  parts[0] = first.subarray(4 + ml);
  return { blob: new Blob(parts, { type: meta.type || "application/octet-stream" }), meta };
}

/* ---- văn bản ---- */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function toB64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    s += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)] + (b == null ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]) + (c == null ? "=" : B64[c & 63]);
  }
  return s;
}
export function fromB64(s) {
  s = String(s).replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  if (/[^A-Za-z0-9+/]/.test(s) || s.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let bits = 0, val = 0, j = 0;
  for (const ch of s) { val = (val << 6) | B64.indexOf(ch); bits += 6; if (bits >= 8) { bits -= 8; out[j++] = (val >> bits) & 255; } }
  return out;
}
/** Chuỗi có phải bản mã văn bản của BbeTools không */
export function looksEncrypted(s) {
  const t = String(s || "").trim();
  if (t.length < 80) return false;
  const b = fromB64(t.slice(0, 12));
  return !!b && isEncrypted(b);
}
/** Mã hoá văn bản → chuỗi Base64. o.salt cố định trong một phiên để khỏi dẫn xuất khoá lại mỗi lần gõ (nonce vẫn mới mỗi lần). */
export async function encryptText(text, password, o = {}) {
  const blob = await encryptBlob(new Blob([enc.encode(text)]), password, {}, o);
  return toB64(new Uint8Array(await blob.arrayBuffer()));
}
export async function decryptText(s, password) {
  const b = fromB64(s);
  if (!b || !isEncrypted(b)) throw new CryptoError("Không phải bản mã của BbeTools (cần chuỗi Base64 bắt đầu bằng “QkJFTkMB”).");
  const { blob } = await decryptBlob(new Blob([b]), password);
  return dec.decode(await blob.arrayBuffer());
}
