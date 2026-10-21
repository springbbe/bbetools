/* Mã hoá/giải mã (hàm thuần): Base64 (UTF-8, URL-safe), percent-encoding URL, HTML entity, JWT. */

/* ---------- Base64 ---------- */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes, { urlSafe = false, wrap = 0 } = {}) {
  let out = "";
  const n = bytes.length;
  for (let i = 0; i < n; i += 3) {
    const a = bytes[i], b = i + 1 < n ? bytes[i + 1] : 0, c = i + 2 < n ? bytes[i + 2] : 0;
    const t = (a << 16) | (b << 8) | c;
    out += B64[(t >> 18) & 63] + B64[(t >> 12) & 63] + (i + 1 < n ? B64[(t >> 6) & 63] : "=") + (i + 2 < n ? B64[t & 63] : "=");
  }
  if (urlSafe) out = out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (wrap > 0) out = out.replace(new RegExp(`(.{${wrap}})(?=.)`, "g"), "$1\n");
  return out;
}

/** Nhận cả Base64 thường, URL-safe, có/không "=", có xuống dòng, có tiền tố data:…;base64, */
export function base64ToBytes(s) {
  s = String(s ?? "").trim().replace(/^data:[^,]*;base64,/i, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (/[^A-Za-z0-9+/=]/.test(s)) {
    const bad = s.match(/[^A-Za-z0-9+/=]/)[0];
    throw new Error(`Ký tự “${bad}” không thuộc bảng Base64.`);
  }
  s = s.replace(/=+$/, "");
  if (s.length % 4 === 1) throw new Error("Chuỗi Base64 bị thiếu hoặc thừa ký tự (độ dài không hợp lệ).");
  const out = new Uint8Array(Math.floor((s.length * 3) / 4));
  let o = 0, buf = 0, bits = 0;
  for (const ch of s) {
    buf = (buf << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 255; }
  }
  return out.subarray(0, o);
}

export const encodeBase64 = (text, o) => bytesToBase64(new TextEncoder().encode(String(text ?? "")), o);
/** Giải mã ra văn bản UTF-8; báo lỗi nếu không phải văn bản (dữ liệu nhị phân) */
export function decodeBase64(s) {
  const bytes = base64ToBytes(s);
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), bytes, binary: false }; }
  catch (_) { return { text: new TextDecoder("utf-8").decode(bytes), bytes, binary: true }; }
}

/* ---------- URL ---------- */
/** mode: "component" (encodeURIComponent), "uri" (giữ :/?#&=…), "form" (dấu cách thành +) */
export function urlEncode(s, mode = "component") {
  s = String(s ?? "");
  if (mode === "uri") return encodeURI(s);
  const r = encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  return mode === "form" ? r.replace(/%20/g, "+") : r;
}
export function urlDecode(s, { plus = true } = {}) {
  s = String(s ?? "");
  if (plus) s = s.replace(/\+/g, " ");
  // giải từng chuỗi %XX liền nhau để một chỗ lỗi không làm hỏng cả văn bản
  return s.replace(/(?:%[0-9a-fA-F]{2})+/g, (m) => { try { return decodeURIComponent(m); } catch (_) { return m; } });
}
/** Tách URL thành các phần và danh sách tham số (đã giải mã) */
export function parseUrl(s) {
  s = String(s ?? "").trim();
  if (!s) return null;
  let u;
  try { u = new URL(s); } catch (_) {
    if (/^[^\s:/?#]+\.[^\s/?#]+/.test(s)) { try { u = new URL("https://" + s); } catch (_) { return null; } } else return null;
  }
  const params = [];
  for (const [k, v] of u.searchParams) params.push([k, v]);
  return { protocol: u.protocol, username: u.username, host: u.hostname, port: u.port, path: decodeURIComponentSafe(u.pathname), query: u.search, hash: decodeURIComponentSafe(u.hash), origin: u.origin, params };
}
const decodeURIComponentSafe = (s) => { try { return decodeURIComponent(s); } catch (_) { return s; } };

/* ---------- HTML entity ---------- */
const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", copy: "©", reg: "®", trade: "™", hellip: "…", mdash: "—", ndash: "–",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", bull: "•", middot: "·", deg: "°", plusmn: "±", times: "×", divide: "÷",
  euro: "€", pound: "£", yen: "¥", cent: "¢", sect: "§", para: "¶", frac12: "½", frac14: "¼", frac34: "¾", sup2: "²", sup3: "³", micro: "µ",
  larr: "←", rarr: "→", uarr: "↑", darr: "↓", harr: "↔", hearts: "♥", check: "✓", infin: "∞", ne: "≠", le: "≤", ge: "≥", asymp: "≈",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", egrave: "è", eacute: "é", ecirc: "ê", igrave: "ì", iacute: "í", ograve: "ò", oacute: "ó",
  ocirc: "ô", otilde: "õ", ugrave: "ù", uacute: "ú", yacute: "ý", Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Egrave: "È", Eacute: "É",
  Ecirc: "Ê", Igrave: "Ì", Iacute: "Í", Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ugrave: "Ù", Uacute: "Ú", Yacute: "Ý",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ccedil: "ç", Ccedil: "Ç", ntilde: "ñ", Ntilde: "Ñ"
};
const BY_CHAR = Object.fromEntries(Object.entries(NAMED).filter(([k]) => k !== "apos").map(([k, v]) => [v, k]));

/** mode: "basic" (& < > " '), "nonascii" (thêm mọi ký tự ngoài ASCII), "all" (mọi ký tự không phải chữ/số ASCII)
    style: "named" (ưu tiên &tên;), "dec" (&#233;), "hex" (&#xE9;) */
export function encodeEntities(s, { mode = "basic", style = "named" } = {}) {
  const one = (c) => {
    const cp = c.codePointAt(0);
    if (style === "named" && BY_CHAR[c]) return "&" + BY_CHAR[c] + ";";
    if (style === "named" && c === "'") return "&#39;";
    return style === "hex" ? "&#x" + cp.toString(16).toUpperCase() + ";" : "&#" + cp + ";";
  };
  const re = mode === "all" ? /[^A-Za-z0-9\s]/gu : mode === "nonascii" ? /[&<>"']|[^\x00-\x7f]/gu : /[&<>"']/g;
  return String(s ?? "").replace(re, one);
}
/** Giải mã &tên; &#123; &#x1F600;. fallback(name) dùng cho tên không có trong bảng (trình duyệt tự giải) */
export function decodeEntities(s, fallback) {
  return String(s ?? "").replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    if (NAMED[e] != null && m.endsWith(";")) return NAMED[e];
    const f = fallback && m.endsWith(";") ? fallback(m) : null;
    return f != null ? f : m;
  });
}

/* ---------- JWT ---------- */
const b64urlJson = (part, what) => {
  let txt;
  try { txt = new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(part)); } catch (_) { throw new Error(`Phần ${what} không phải Base64URL hợp lệ.`); }
  try { return JSON.parse(txt); } catch (_) { throw new Error(`Phần ${what} không phải JSON.`); }
};
/** Tách JWT → { header, payload, signature (Uint8Array), signingInput } */
export function decodeJwt(token) {
  token = String(token ?? "").trim().replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length === 5) throw new Error("Đây là JWE (JWT mã hoá, 5 phần): nội dung đã được mã hoá, cần khoá bí mật mới đọc được.");
  if (parts.length !== 3) throw new Error(`JWT phải có 3 phần ngăn bởi dấu chấm (đang có ${parts.length}).`);
  const header = b64urlJson(parts[0], "header");
  const payload = b64urlJson(parts[1], "payload");
  let signature;
  try { signature = base64ToBytes(parts[2]); } catch (_) { throw new Error("Phần chữ ký không phải Base64URL hợp lệ."); }
  return { header, payload, signature, signingInput: parts[0] + "." + parts[1], parts };
}
/** Trạng thái thời hạn: { exp, iat, nbf (Date|null), expired, notYet } tại thời điểm now (ms) */
export function jwtTimes(payload, now = Date.now()) {
  const d = (v) => (typeof v === "number" && Number.isFinite(v) ? new Date(v * 1000) : null);
  const exp = d(payload.exp), iat = d(payload.iat), nbf = d(payload.nbf);
  return { exp, iat, nbf, expired: !!exp && exp.getTime() <= now, notYet: !!nbf && nbf.getTime() > now };
}

/** Thuật toán JWT → tham số Web Crypto */
const JWA = {
  HS256: { name: "HMAC", hash: "SHA-256" }, HS384: { name: "HMAC", hash: "SHA-384" }, HS512: { name: "HMAC", hash: "SHA-512" },
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, RS384: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" }, RS512: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
  PS256: { name: "RSA-PSS", hash: "SHA-256", saltLength: 32 }, PS384: { name: "RSA-PSS", hash: "SHA-384", saltLength: 48 }, PS512: { name: "RSA-PSS", hash: "SHA-512", saltLength: 64 },
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" }, ES384: { name: "ECDSA", namedCurve: "P-384", hash: "SHA-384" }, ES512: { name: "ECDSA", namedCurve: "P-521", hash: "SHA-512" },
  EdDSA: { name: "Ed25519" }, Ed25519: { name: "Ed25519" }
};
export const JWT_ALGS = Object.keys(JWA);

/** Kiểm tra chữ ký JWT. key: chuỗi bí mật (HS*) hoặc khoá công khai PEM/JWK (RS*, PS*, ES*, EdDSA).
    o.base64Secret: bí mật HS* ở dạng Base64. → Promise<boolean>, ném lỗi tiếng Việt nếu khoá sai định dạng */
export async function verifyJwt(jwt, key, o = {}) {
  const alg = jwt.header.alg;
  if (alg === "none") throw new Error("JWT dùng alg “none” (không có chữ ký): không thể tin cậy.");
  const p = JWA[alg];
  if (!p) throw new Error(`Chưa hỗ trợ thuật toán ${alg}.`);
  const subtle = globalThis.crypto.subtle;
  const data = new TextEncoder().encode(jwt.signingInput);
  let k;
  if (p.name === "HMAC") {
    const raw = o.base64Secret ? base64ToBytes(key) : new TextEncoder().encode(key);
    if (!raw.length) throw new Error("Nhập khoá bí mật để kiểm tra chữ ký.");
    k = await subtle.importKey("raw", raw, { name: "HMAC", hash: p.hash }, false, ["verify"]);
  } else {
    const s = String(key ?? "").trim();
    const imp = p.name === "ECDSA" ? { name: "ECDSA", namedCurve: p.namedCurve } : p.name === "Ed25519" ? { name: "Ed25519" } : { name: p.name, hash: p.hash };
    try {
      if (s.startsWith("{")) {
        const jwk = JSON.parse(s);
        delete jwk.d; delete jwk.p; delete jwk.q; delete jwk.dp; delete jwk.dq; delete jwk.qi; // chỉ dùng phần công khai
        k = await subtle.importKey("jwk", jwk, imp, false, ["verify"]);
      } else {
        if (/PRIVATE KEY/.test(s)) throw new Error("Đây là khoá bí mật (PRIVATE KEY). Chỉ cần dán khoá công khai (PUBLIC KEY), đừng dán khoá bí mật vào bất kỳ trang nào.");
        if (/CERTIFICATE/.test(s)) throw new Error("Đây là chứng chỉ X.509. Hãy dán khoá công khai dạng “-----BEGIN PUBLIC KEY-----”.");
        const der = base64ToBytes(s.replace(/-----(BEGIN|END) [A-Z ]+-----/g, ""));
        if (!der.length) throw new Error("Dán khoá công khai (PEM hoặc JWK) để kiểm tra chữ ký.");
        k = await subtle.importKey("spki", der, imp, false, ["verify"]);
      }
    } catch (e) {
      if (/khoá|chứng chỉ|Dán/.test(e.message)) throw e;
      throw new Error("Khoá công khai không đúng định dạng hoặc không khớp thuật toán " + alg + ".");
    }
  }
  const algo = p.name === "ECDSA" ? { name: "ECDSA", hash: p.hash } : p.name === "RSA-PSS" ? { name: "RSA-PSS", saltLength: p.saltLength } : { name: p.name };
  return subtle.verify(algo, k, jwt.signature, data);
}
