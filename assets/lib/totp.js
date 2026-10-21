/* Mã xác thực một lần (hàm thuần): Base32 (RFC 4648), HOTP (RFC 4226), TOTP (RFC 6238), đọc/tạo URI otpauth:// như Google Authenticator.
   HMAC tính bằng Web Crypto (crypto.subtle) nên các hàm sinh mã là async. */

const A32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Base32 → byte. Bỏ khoảng trắng, dấu gạch, dấu = ; không phân biệt hoa thường. Trả null nếu có ký tự lạ. */
export function base32Decode(s) {
  const t = String(s || "").toUpperCase().replace(/[\s=-]/g, "");
  if (!t || /[^A-Z2-7]/.test(t)) return null;
  const out = [];
  let bits = 0, val = 0;
  for (const c of t) { val = (val << 5) | A32.indexOf(c); bits += 5; if (bits >= 8) { bits -= 8; out.push((val >> bits) & 255); } }
  return new Uint8Array(out);
}
export function base32Encode(bytes, pad = false) {
  let s = "", bits = 0, val = 0;
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { bits -= 5; s += A32[(val >> bits) & 31]; } }
  if (bits) s += A32[(val << (5 - bits)) & 31];
  if (pad) while (s.length % 8) s += "=";
  return s;
}
/** Nhóm 4 ký tự cho dễ đọc: "JBSW Y3DP EHPK 3PXP" */
export const groupSecret = (s) => s.replace(/(.{4})(?=.)/g, "$1 ");

const HASH = { SHA1: "SHA-1", SHA256: "SHA-256", SHA512: "SHA-512" };

/** HOTP: secret (byte), counter (số), digits 6–10, algo SHA1|SHA256|SHA512 → chuỗi số */
export async function hotp(secret, counter, { digits = 6, algo = "SHA1" } = {}) {
  const msg = new Uint8Array(8), v = new DataView(msg.buffer);
  v.setUint32(0, Math.floor(counter / 4294967296)); v.setUint32(4, counter >>> 0);
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey("raw", secret.length ? secret : new Uint8Array(1), { name: "HMAC", hash: HASH[algo] || "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await subtle.sign("HMAC", key, msg));
  const off = mac[mac.length - 1] & 15;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** Bộ đếm TOTP tại thời điểm ms (mặc định bây giờ) */
export const totpCounter = (ms, period = 30) => Math.floor(ms / 1000 / period);
/** Số giây còn lại của mã hiện tại */
export const totpRemaining = (ms, period = 30) => period - ((ms / 1000) % period);
export const totp = (secret, ms, o = {}) => hotp(secret, totpCounter(ms, o.period || 30), o);

/** Đọc URI otpauth://totp/Nhãn?secret=…&issuer=…&digits=6&period=30&algorithm=SHA1 */
export function parseOtpauth(uri) {
  let u;
  try { u = new URL(String(uri).trim()); } catch (_) { return null; }
  if (u.protocol !== "otpauth:") return null;
  const type = (u.host || u.pathname.replace(/^\/\//, "").split("/")[0]).toLowerCase();
  const p = u.searchParams;
  let label = decodeURIComponent(u.pathname.replace(/^\/+/, "").replace(/^(totp|hotp)\//i, ""));
  let issuer = p.get("issuer") || "", account = label;
  if (label.includes(":")) { const [a, ...b] = label.split(":"); if (!issuer) issuer = a.trim(); account = b.join(":").trim(); }
  const algo = (p.get("algorithm") || "SHA1").toUpperCase().replace("-", "");
  return {
    type: type === "hotp" ? "hotp" : "totp",
    secret: (p.get("secret") || "").replace(/\s+/g, "").toUpperCase(),
    issuer, account,
    digits: Math.min(10, Math.max(6, parseInt(p.get("digits"), 10) || 6)),
    period: Math.max(1, parseInt(p.get("period"), 10) || 30),
    algo: HASH[algo] ? algo : "SHA1",
    counter: parseInt(p.get("counter"), 10) || 0
  };
}
/** Tạo URI otpauth:// để làm mã QR */
export function buildOtpauth({ secret, issuer = "", account = "", digits = 6, period = 30, algo = "SHA1" }) {
  const label = encodeURIComponent(issuer ? issuer + ":" + account : account || "BbeTools").replace(/%3A/g, ":");
  const p = new URLSearchParams({ secret });
  if (issuer) p.set("issuer", issuer);
  if (algo !== "SHA1") p.set("algorithm", algo);
  if (+digits !== 6) p.set("digits", String(digits));
  if (+period !== 30) p.set("period", String(period));
  return `otpauth://totp/${label}?${p.toString()}`;
}
