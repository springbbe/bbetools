/* Tự sinh bởi scripts/build.js từ assets/lib/hash.js và i18n/en/js/ — đừng sửa tay. */
/* Băm (hàm thuần): MD5 và HMAC-MD5 viết tay (Web Crypto không có MD5), tiện ích đổi byte ↔ hex.
   SHA-1/SHA-2 dùng crypto.subtle (có cả trong trình duyệt lẫn Node). */

export const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export const utf8 = (s) => new TextEncoder().encode(String(s ?? ""));

const K = new Uint32Array(64).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

/** MD5 của Uint8Array → Uint8Array(16) */
export function md5(bytes) {
  const n = bytes.length;
  const total = ((n + 8) >> 6) + 1 << 6;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[n] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 8, (n * 8) >>> 0, true);
  dv.setUint32(total - 4, Math.floor(n / 0x20000000), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
      else { F = C ^ (B | ~D); g = (7 * i) & 15; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16), odv = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((w, i) => odv.setUint32(i * 4, w, true));
  return out;
}

export function hmacMd5(key, msg) {
  if (key.length > 64) key = md5(key);
  const k = new Uint8Array(64); k.set(key);
  const ipad = k.map((b) => b ^ 0x36), opad = k.map((b) => b ^ 0x5c);
  const inner = new Uint8Array(64 + msg.length); inner.set(ipad); inner.set(msg, 64);
  const ih = md5(inner);
  const outer = new Uint8Array(80); outer.set(opad); outer.set(ih, 64);
  return md5(outer);
}

export const ALGOS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];

/** Băm bằng thuật toán tên algo; key (Uint8Array) có thì tính HMAC. Trả về Promise<Uint8Array> */
export async function digest(algo, bytes, key) {
  if (algo === "MD5") return key && key.length ? hmacMd5(key, bytes) : md5(bytes);
  const subtle = globalThis.crypto.subtle;
  if (!key || !key.length) return new Uint8Array(await subtle.digest(algo, bytes));
  const k = await subtle.importKey("raw", key, { name: "HMAC", hash: algo }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", k, bytes));
}
