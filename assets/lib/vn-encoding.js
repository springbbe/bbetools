/* Chuyển mã tiếng Việt (hàm thuần): Unicode dựng sẵn ↔ Unicode tổ hợp ↔ TCVN3 (ABC, font .VnTime) ↔ VNI (VNI-Times),
   và sửa chữ UTF-8 bị đọc nhầm thành Windows-1252 ("Viá»‡t Nam" → "Việt Nam").
   Văn bản TCVN3/VNI dán ra ngoài font gốc hiện thành ký tự Latin-1 (vd. "ViÖt Nam", "Vieät Nam"): các bảng dưới
   ghi đúng các ký tự đó. */

// 67 chữ thường có dấu, cùng thứ tự với hai bảng mã bên dưới
const UNI = "àảãáạăằẳẵắặâầẩẫấậđèẻẽéẹêềểễếệìỉĩíịòỏõóọôồổỗốộơờởỡớợùủũúụưừửữứựỳỷỹýỵ";

// TCVN3: mỗi chữ một byte
const TCVN3 = "µ¶·¸¹¨»¼½¾Æ©ÇÈÉÊË®ÌÎÏÐÑªÒÓÔÕÖ×ØÜÝÞßáâãä«åæçèé¬êëìíîïñòóô\u00adõö÷øùúûüýþ";
// chữ hoa riêng của TCVN3 (chữ hoa có thanh dùng chung mã chữ thường, hiện thành hoa nhờ font .VnTimeH)
const TCVN3_UP = { "Ă": "¡", "Â": "¢", "Đ": "§", "Ê": "£", "Ô": "¤", "Ơ": "¥", "Ư": "¦" };

// VNI: chữ gốc + một ký tự dấu (riêng vài chữ một ký tự)
const VNI_LOWER = [
  "aø", "aû", "aõ", "aù", "aï", "aê", "aè", "aú", "aü", "aé", "aë", "aâ", "aà", "aå", "aã", "aá", "aä", "ñ",
  "eø", "eû", "eõ", "eù", "eï", "eâ", "eà", "eå", "eã", "eá", "eä", "ì", "æ", "ó", "í", "ò",
  "oø", "oû", "oõ", "où", "oï", "oâ", "oà", "oå", "oã", "oá", "oä", "ô", "ôø", "ôû", "ôõ", "ôù", "ôï",
  "uø", "uû", "uõ", "uù", "uï", "ö", "öø", "öû", "öõ", "öù", "öï", "yø", "yû", "yõ", "yù", "î"
];
const VNI_UPPER = VNI_LOWER.map((s) => s.toUpperCase());

const toUpper = (c) => c.toLocaleUpperCase("vi");
const UNI_ALL = [...UNI, ...[...UNI].map(toUpper)];

function buildMaps() {
  const enc = { tcvn3: new Map(), vni: new Map() };
  const dec = { tcvn3: new Map(), vni: new Map() };
  [...UNI].forEach((u, i) => {
    const t = TCVN3[i];
    enc.tcvn3.set(u, t); enc.tcvn3.set(toUpper(u), t);
    dec.tcvn3.set(t, u);
    enc.vni.set(u, VNI_LOWER[i]); enc.vni.set(toUpper(u), VNI_UPPER[i]);
    dec.vni.set(VNI_LOWER[i], u); dec.vni.set(VNI_UPPER[i], toUpper(u));
  });
  for (const [u, t] of Object.entries(TCVN3_UP)) { enc.tcvn3.set(u, t); dec.tcvn3.set(t, u); }
  return { enc, dec };
}
const { enc: ENC, dec: DEC } = buildMaps();

/* ---------- UTF-8 bị đọc thành Windows-1252 ---------- */
const CP1252 = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ";
function cp1252Bytes(s) {
  const out = [];
  for (const c of s) {
    const code = c.codePointAt(0);
    if (code <= 0xff) out.push(code); // gồm cả U+0080–U+009F (khi bị đọc thành Latin-1)
    else {
      const k = CP1252.indexOf(c);
      if (k < 0) return null;
      out.push(0x80 + k);
    }
  }
  return new Uint8Array(out);
}
/** "Viá»‡t Nam" → "Việt Nam" (null nếu không phải lỗi kiểu này) */
export function fixMojibake(s) {
  const bytes = cp1252Bytes(s);
  if (!bytes) return null;
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (_) { return null; }
}

/* ---------- Unicode → mã cũ ---------- */
export function fromUnicode(text, to) {
  const s = String(text ?? "").normalize("NFC");
  if (to === "unicode") return s;
  if (to === "nfd") return s.normalize("NFD");
  const map = ENC[to];
  let out = "";
  for (const c of s) out += map.get(c) ?? c;
  return out;
}

/* ---------- mã cũ → Unicode ---------- */
/** upper: "auto" (đoán theo chữ xung quanh, cho font .VnTimeH), "lower", "upper" (font chữ hoa: in hoa hết) */
function decodeTcvn3(s, upper = "auto") {
  if (upper === "upper") return toUpper(decodeTcvn3(s, "lower"));
  const inWord = (c) => DEC.tcvn3.has(c) || /[\p{L}\p{M}\p{N}]/u.test(c);
  return s.split("\n").map((line) => {
    // dòng chủ yếu viết hoa? (không tính chữ cái đầu từ)
    const caps = (line.match(/\B[A-Z]/g) || []).length, lows = (line.match(/[a-z]/g) || []).length;
    const lineUpper = caps > lows;
    let out = "", word = [];
    const flush = () => {
      if (!word.length) return;
      let up = false;
      if (upper === "auto") {
        let U = 0, L = 0;
        for (const c of word) {
          const d = DEC.tcvn3.get(c);
          if (d != null) { if (/\p{Lu}/u.test(d)) U++; }
          else if (/\p{Lu}/u.test(c)) U++;
          else if (/\p{Ll}/u.test(c)) L++;
        }
        // từ toàn chữ hoa → chữ có dấu cũng hoa; chỉ một chữ hoa (vd. "Tù", "VÒ") thì theo cả dòng
        up = L === 0 && (U >= 2 || (U === 1 && lineUpper));
      }
      for (const c of word) { const d = DEC.tcvn3.get(c); out += d == null ? c : up ? toUpper(d) : d; }
      word = [];
    };
    for (const c of line) { if (inWord(c)) word.push(c); else { flush(); out += c; } }
    flush();
    return out;
  }).join("\n");
}
function decodeVni(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const two = DEC.vni.get(s.substr(i, 2));
    if (two != null && s[i + 1] !== undefined && s.substr(i, 2).length === 2) { out += two; i++; continue; }
    out += DEC.vni.get(s[i]) ?? s[i];
  }
  return out;
}
export function toUnicode(text, from, o = {}) {
  const s = String(text ?? "");
  if (from === "tcvn3") return decodeTcvn3(s, o.upper);
  if (from === "vni") return decodeVni(s);
  if (from === "mojibake") return fixMojibake(s) ?? s;
  return s.normalize("NFC");
}

/** Đoán bảng mã của văn bản: "unicode" | "nfd" | "tcvn3" | "vni" | "mojibake" */
export function detect(text) {
  const s = String(text ?? "");
  if (/[ÃÄÆá][\u0080-¿‘-›€ŒœŠšŸŽžˆ˜™]/.test(s) && fixMojibake(s) != null) return "mojibake";
  if (/[\u0300-\u0309\u0323]/.test(s) && s.normalize("NFC") !== s) return "nfd";
  if (/[ĂăĐđĨĩŨũƠơƯưẠ-ỹ]/.test(s)) return "unicode";
  const vni = (s.match(/[aeouyAEOUYôöÔÖ][øûõùïâàåãáäêèúüéë]|[ñÑ]|[a-zA-Z][ôö][a-zA-Z]|[a-z][óòæî]|[A-Z][ÓÒÆÎ]/g) || []).length;
  const tcvn = (s.match(/[µ¶·¸¹¨»¼½¾Æ©ÇÈÉÊË®ÌÎÏÐÑªÒÓÔÕÖ×ØÜÝÞß«¬\u00ad¡¢§£¤¥¦þ]/g) || []).length;
  if (!vni && !tcvn) return "unicode";
  return tcvn >= vni ? "tcvn3" : "vni";
}

export const ENCODINGS = { unicode: "Unicode", nfd: "Unicode tổ hợp", tcvn3: "TCVN3 (ABC)", vni: "VNI", mojibake: "UTF-8 bị lỗi" };
export const UNI_CHARS = UNI_ALL;
