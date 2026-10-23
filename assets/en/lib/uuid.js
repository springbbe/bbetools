/* Tự sinh bởi scripts/build.js từ assets/lib/uuid.js và i18n/en/js/ — đừng sửa tay. */
/* UUID (hàm thuần): tạo v4 (ngẫu nhiên), v7 (theo thời gian, sắp xếp được), đọc thông tin một UUID. */

const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function formatUuid(bytes, { upper = false, hyphens = true, braces = false } = {}) {
  const h = hex(bytes);
  let s = hyphens ? `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` : h;
  if (upper) s = s.toUpperCase();
  return braces ? "{" + s + "}" : s;
}

/** random16: Uint8Array(16) ngẫu nhiên (crypto.getRandomValues) */
export function uuidV4(random16) {
  const b = Uint8Array.from(random16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return b;
}

/** UUID v7 (RFC 9562): 48 bit mili giây Unix + ngẫu nhiên. seq: số tăng dần trong cùng mili giây để giữ thứ tự */
export function uuidV7(ms, random16, seq = 0) {
  const b = Uint8Array.from(random16);
  let t = BigInt(ms);
  for (let i = 5; i >= 0; i--) { b[i] = Number(t & 0xffn); t >>= 8n; }
  // 12 bit rand_a dùng làm bộ đếm khi tạo nhiều UUID cùng mili giây
  const ra = seq & 0xfff;
  b[6] = 0x70 | (ra >> 8);
  b[7] = ra & 0xff;
  b[8] = (b[8] & 0x3f) | 0x80;
  return b;
}

/** Tạo n UUID. getRandom(n) → Uint8Array; now() → ms */
export function generate(n, version, getRandom, now = Date.now) {
  const out = [];
  let lastMs = -1, seq = 0;
  for (let i = 0; i < n; i++) {
    const r = getRandom(16);
    if (version === "v7") {
      let ms = now();
      if (ms <= lastMs) { ms = lastMs; seq++; if (seq > 0xfff) { ms = ++lastMs; seq = 0; } } else seq = (r[6] & 0x03) << 8 | r[7] >> 1;
      lastMs = ms;
      out.push(uuidV7(ms, r, seq));
    } else out.push(uuidV4(r));
  }
  return out;
}

const NIL = "00000000-0000-0000-0000-000000000000";
/** Đọc một UUID: { ok, canonical, version, variant, time (Date, với v1/v6/v7) } */
export function inspectUuid(s) {
  const clean = String(s ?? "").trim().replace(/^urn:uuid:/i, "").replace(/^\{|\}$/g, "").toLowerCase();
  const h = clean.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(h) || (clean.includes("-") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(clean))) return { ok: false };
  const canonical = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  if (canonical === NIL) return { ok: true, canonical, version: 0, variant: "nil" };
  if (/^f+$/.test(h)) return { ok: true, canonical, version: 15, variant: "max" };
  const version = parseInt(h[12], 16);
  const v = parseInt(h[16], 16);
  const variant = v < 8 ? "NCS" : v < 12 ? "RFC 9562" : v < 14 ? "Microsoft" : "fallback";
  let time = null;
  if (version === 7) time = new Date(parseInt(h.slice(0, 12), 16));
  if (version === 1 || version === 6) {
    const ts = version === 1 ? BigInt("0x" + h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8)) : BigInt("0x" + h.slice(0, 12) + h.slice(13, 16));
    time = new Date(Number((ts - 122192928000000000n) / 10000n)); // mốc 15/10/1582, đơn vị 100 ns
  }
  return { ok: true, canonical, version, variant, time };
}
