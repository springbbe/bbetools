/* Tự sinh bởi scripts/build.js từ assets/lib/signal.js và i18n/en/js/ — đừng sửa tay. */
/* Sticker Signal (hàm thuần): đọc link signal.art/addstickers, đọc manifest (protobuf), dẫn xuất khoá
   và giải mã file của bộ sticker bằng Web Crypto (chạy được cả trong trình duyệt lẫn Node để test).

   Định dạng của Signal: từ pack_key (32 byte) dùng HKDF-SHA256 (salt 32 byte 0, info "Sticker Pack") ra 64 byte:
   32 byte đầu là khoá AES-256-CBC, 32 byte sau là khoá HMAC-SHA256. Mỗi file = IV 16 byte ‖ bản mã ‖ MAC 32 byte,
   MAC tính trên IV ‖ bản mã. */

export const CDN = "https://cdn-ca.signal.org/stickers/";
export const manifestUrl = (id) => `${CDN}${id}/manifest.proto`;
export const stickerUrl = (id, n) => `${CDN}${id}/full/${n}`;

/** "https://signal.art/addstickers/#pack_id=…&pack_key=…" (hoặc sgnl://addstickers/?…) → { id, key } (null nếu sai) */
export function parseSignalLink(input) {
  const s = String(input == null ? "" : input).trim();
  const id = /pack_id=([0-9a-f]{32})(?![0-9a-f])/i.exec(s), key = /pack_key=([0-9a-f]{64})(?![0-9a-f])/i.exec(s);
  return id && key ? { id: id[1].toLowerCase(), key: key[1].toLowerCase() } : null;
}
export const addLink = (p) => `https://signal.art/addstickers/#pack_id=${p.id}&pack_key=${p.key}`;

export function hexBytes(hex) {
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/* ---------- protobuf tối giản (đủ cho manifest) ---------- */
function* fields(b) {
  let i = 0;
  const varint = () => {
    let x = 0, mul = 1, c;
    do { if (i >= b.length) throw new Error("truncated protobuf"); c = b[i++]; x += (c & 0x7f) * mul; mul *= 128; } while (c & 0x80);
    return x;
  };
  while (i < b.length) {
    const tag = varint(), no = Math.floor(tag / 8), wt = tag & 7;
    if (wt === 0) yield { no, wt, value: varint() };
    else if (wt === 2) { const n = varint(); if (i + n > b.length) throw new Error("truncated protobuf"); yield { no, wt, bytes: b.subarray(i, i + n) }; i += n; }
    else if (wt === 1) i += 8;
    else if (wt === 5) i += 4;
    else throw new Error("invalid protobuf");
  }
}
const utf8 = (b) => new TextDecoder().decode(b);
function readSticker(b) {
  const st = { id: 0, emoji: "", contentType: "" };
  for (const f of fields(b)) {
    if (f.no === 1 && f.wt === 0) st.id = f.value;
    else if (f.no === 2 && f.wt === 2) st.emoji = utf8(f.bytes);
    else if (f.no === 3 && f.wt === 2) st.contentType = utf8(f.bytes);
  }
  return st;
}
/** manifest đã giải mã → { title, author, cover, stickers: [{ id, emoji, contentType }] } */
export function readManifest(bytes) {
  const out = { title: "", author: "", cover: null, stickers: [] };
  for (const f of fields(bytes)) {
    if (f.wt !== 2) continue;
    if (f.no === 1) out.title = utf8(f.bytes);
    else if (f.no === 2) out.author = utf8(f.bytes);
    else if (f.no === 3) out.cover = readSticker(f.bytes);
    else if (f.no === 4) out.stickers.push(readSticker(f.bytes));
  }
  return out;
}

/* ---------- giải mã ---------- */
const subtle = () => globalThis.crypto.subtle;
/** pack_key (hex) → { aes, mac } là CryptoKey */
export async function packKeys(keyHex) {
  const ikm = await subtle().importKey("raw", hexBytes(keyHex), "HKDF", false, ["deriveBits"]);
  const bits = new Uint8Array(await subtle().deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode("Sticker Pack") }, ikm, 512));
  return {
    aes: await subtle().importKey("raw", bits.slice(0, 32), "AES-CBC", false, ["encrypt", "decrypt"]),
    mac: await subtle().importKey("raw", bits.slice(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
  };
}
/** Giải mã một file của bộ; báo lỗi nếu MAC sai (sai khoá hoặc file hỏng) */
export async function decrypt(data, keys) {
  const b = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (b.length < 16 + 16 + 32) throw new Error("File too short");
  const body = b.subarray(0, b.length - 32), mac = b.subarray(b.length - 32);
  if (!(await subtle().verify("HMAC", keys.mac, mac, body))) throw new Error("MAC mismatch");
  return new Uint8Array(await subtle().decrypt({ name: "AES-CBC", iv: b.subarray(0, 16) }, keys.aes, b.subarray(16, b.length - 32)));
}
/** Mã hoá theo đúng định dạng của Signal (dùng cho test) */
export async function encrypt(plain, keys, iv = globalThis.crypto.getRandomValues(new Uint8Array(16))) {
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-CBC", iv }, keys.aes, plain));
  const body = new Uint8Array(16 + ct.length); body.set(iv); body.set(ct, 16);
  const mac = new Uint8Array(await subtle().sign("HMAC", keys.mac, body));
  const out = new Uint8Array(body.length + 32); out.set(body); out.set(mac, body.length);
  return out;
}
