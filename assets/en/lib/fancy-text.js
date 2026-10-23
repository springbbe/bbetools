/* Tự sinh bởi scripts/build.js từ assets/lib/fancy-text.js và i18n/en/js/ — đừng sửa tay. */
/* Chữ kiểu nghệ thuật (hàm thuần): đổi chữ Latin sang các bộ ký tự Unicode "Mathematical Alphanumeric Symbols"
   và một số kiểu khác. Chữ có dấu tiếng Việt: tách dấu (NFD), đổi chữ gốc, giữ dấu kết hợp phía sau. */

const A = 65, a = 97, Z0 = 48;
// [điểm mã chữ hoa A, chữ thường a, số 0 (hoặc null)], ngoại lệ là các ký tự có sẵn từ trước trong Unicode
const MATH = {
  bold: [0x1d400, 0x1d41a, 0x1d7ce],
  italic: [0x1d434, 0x1d44e, null, { h: "ℎ" }],
  boldItalic: [0x1d468, 0x1d482, null],
  script: [0x1d49c, 0x1d4b6, null, { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ", e: "ℯ", g: "ℊ", o: "ℴ" }],
  boldScript: [0x1d4d0, 0x1d4ea, null],
  fraktur: [0x1d504, 0x1d51e, null, { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" }],
  boldFraktur: [0x1d56c, 0x1d586, null],
  double: [0x1d538, 0x1d552, 0x1d7d8, { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" }],
  sans: [0x1d5a0, 0x1d5ba, 0x1d7e2],
  sansBold: [0x1d5d4, 0x1d5ee, 0x1d7ec],
  sansItalic: [0x1d608, 0x1d622, null],
  sansBoldItalic: [0x1d63c, 0x1d656, null],
  mono: [0x1d670, 0x1d68a, 0x1d7f6]
};
const SMALL_CAPS = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ";
const UPSIDE = { a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  A: "∀", B: "ꓭ", C: "Ɔ", D: "ꓷ", E: "Ǝ", F: "Ⅎ", G: "⅁", H: "H", I: "I", J: "ſ", K: "ꓘ", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ", Q: "Ό", R: "ꓤ", S: "S", T: "ꓕ", U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z",
  1: "Ɩ", 2: "ᄅ", 3: "Ɛ", 4: "ㄣ", 5: "ϛ", 6: "9", 7: "ㄥ", 8: "8", 9: "6", 0: "0", ".": "˙", ",": "'", "'": ",", '"': "„", "?": "¿", "!": "¡", "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "&": "⅋", _: "‾" };

function mapChar(c, style) {
  const code = c.codePointAt(0);
  if (MATH[style]) {
    const [up, low, dig, exc] = MATH[style];
    if (exc && exc[c]) return exc[c];
    if (code >= A && code <= 90) return String.fromCodePoint(up + code - A);
    if (code >= a && code <= 122) return String.fromCodePoint(low + code - a);
    if (dig && code >= Z0 && code <= 57) return String.fromCodePoint(dig + code - Z0);
    return c;
  }
  switch (style) {
    case "circled":
      if (code >= A && code <= 90) return String.fromCodePoint(0x24b6 + code - A);
      if (code >= a && code <= 122) return String.fromCodePoint(0x24d0 + code - a);
      if (code === Z0) return "⓪";
      if (code > Z0 && code <= 57) return String.fromCodePoint(0x2460 + code - 49);
      return c;
    case "circledDark":
      if (code >= A && code <= 90) return String.fromCodePoint(0x1f150 + code - A);
      if (code >= a && code <= 122) return String.fromCodePoint(0x1f150 + code - a);
      return c;
    case "squared":
      if (code >= A && code <= 90) return String.fromCodePoint(0x1f130 + code - A);
      if (code >= a && code <= 122) return String.fromCodePoint(0x1f130 + code - a);
      return c;
    case "squaredDark":
      if (code >= A && code <= 90) return String.fromCodePoint(0x1f170 + code - A);
      if (code >= a && code <= 122) return String.fromCodePoint(0x1f170 + code - a);
      return c;
    case "fullwidth":
      if (code >= 0x21 && code <= 0x7e) return String.fromCodePoint(0xff01 + code - 0x21);
      if (c === " ") return "　";
      return c;
    case "smallCaps":
      if (code >= a && code <= 122) return SMALL_CAPS[code - a];
      return c;
    default: return c;
  }
}

export const STYLES = [
  ["bold", "Bold"], ["italic", "Italic"], ["boldItalic", "Bold italic"], ["script", "Script"], ["boldScript", "Bold script"],
  ["fraktur", "Gothic"], ["boldFraktur", "Bold Fraktur"], ["double", "Double-struck"], ["sans", "Sans-serif"], ["sansBold", "Sans-serif bold"],
  ["sansItalic", "Sans-serif italic"], ["sansBoldItalic", "Sans-serif bold italic"], ["mono", "Monospace"], ["circled", "Circled"],
  ["circledDark", "Negative circled"], ["squared", "Squared"], ["squaredDark", "Negative squared"], ["fullwidth", "Fullwidth"], ["smallCaps", "Small caps"],
  ["strike", "Strikethrough"], ["underline", "Underline"], ["upsideDown", "Upside down"], ["spaced", "Spaced"]
];

/** Đổi văn bản sang kiểu style */
export function fancy(text, style) {
  const s = String(text ?? "");
  if (style === "upsideDown") return [...s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")].reverse().map((c) => UPSIDE[c] ?? c).join("");
  if (style === "strike") return [...s.normalize("NFC")].map((c) => (/\s/.test(c) ? c : c + "\u0336")).join("");
  if (style === "underline") return [...s.normalize("NFC")].map((c) => (c === "\n" ? c : c + "\u0332")).join("");
  if (style === "spaced") return [...s.normalize("NFC")].join(" ");
  // tách dấu để đổi chữ gốc; "đ" không có bản kiểu nên giữ nguyên
  const mapped = [...s.normalize("NFD")].map((c) => mapChar(c, style)).join("");
  return style === "smallCaps" ? mapped : mapped.normalize("NFC");
}
