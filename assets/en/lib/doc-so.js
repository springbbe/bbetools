/* Tự sinh bởi scripts/build.js từ assets/lib/doc-so.js và i18n/en/js/ — đừng sửa tay. */
/* Đọc số thành chữ tiếng Việt (số tiền bằng chữ). Hàm thuần, không phụ thuộc trình duyệt.
   Làm việc trên chuỗi chữ số nên đọc được số lớn tuỳ ý, không sai số làm tròn. */

const DIGIT = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

export const DEFAULTS = {
  thousand: "nghìn",   // hoặc "ngàn"
  odd: "linh",         // hoặc "lẻ"  (105 = một trăm linh năm)
  four: "tư",          // "tư" hoặc "bốn" cho hàng đơn vị sau "mươi" (24 = hai mươi tư)
  billion: "tỷ",       // hoặc "tỉ"
  unit: "",            // ví dụ "đồng"
  even: false,         // thêm "chẵn" khi là số nguyên có đơn vị
  capitalize: true
};

/** Đọc một nhóm 3 chữ số. full = nhóm này không đứng đầu (phải đọc cả "không trăm", "linh") */
function readTriple(n, full, o) {
  const h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, u = n % 10;
  const out = [];
  if (h > 0 || full) out.push(DIGIT[h], "trăm");
  if (t === 0) {
    if (u > 0) { if (h > 0 || full) out.push(o.odd); out.push(DIGIT[u]); }
  } else if (t === 1) {
    out.push("mười");
    if (u === 5) out.push("lăm");
    else if (u > 0) out.push(DIGIT[u]);
  } else {
    out.push(DIGIT[t], "mươi");
    if (u === 1) out.push("mốt");
    else if (u === 4) out.push(o.four);
    else if (u === 5) out.push("lăm");
    else if (u > 0) out.push(DIGIT[u]);
  }
  return out;
}

/** Đọc tối đa 9 chữ số (hàng triệu trở xuống). full = có phần lớn hơn đứng trước. */
function readBelowBillion(digits, full, o) {
  const groups = [];
  for (let end = digits.length; end > 0; end -= 3) groups.unshift(+digits.slice(Math.max(0, end - 3), end));
  const scale = ["", o.thousand, "triệu"];
  const words = [];
  groups.forEach((g, k) => {
    if (g === 0) return;
    const i = groups.length - 1 - k;
    words.push(...readTriple(g, full || words.length > 0, o));
    if (scale[i]) words.push(scale[i]);
  });
  return words;
}

/** Đọc phần nguyên (chuỗi chữ số, không dấu). Trên 9 chữ số: đọc số tỷ như một số rồi thêm "tỷ" (10^18 = một tỷ tỷ). */
export function readIntegerDigits(digits, opts) {
  const o = Object.assign({}, DEFAULTS, opts);
  digits = String(digits).replace(/^0+(?=\d)/, "");
  if (!/^\d+$/.test(digits)) throw new Error("Không phải số nguyên");
  if (/^0+$/.test(digits)) return DIGIT[0];
  const rec = (d, full) => {
    if (d.length <= 9) return readBelowBillion(d, full, o);
    const high = d.slice(0, -9).replace(/^0+(?=\d)/, ""), low = d.slice(-9);
    const words = /^0+$/.test(high) ? [] : [...rec(high, full), o.billion];
    if (!/^0+$/.test(low)) words.push(...readBelowBillion(low, full || words.length > 0, o));
    return words;
  };
  return rec(digits, false).join(" ");
}

/** Đọc phần thập phân kiểu Việt Nam: các số 0 đứng đầu đọc "không", phần còn lại đọc như một số (3,14 → ba phẩy mười bốn) */
export function readFractionDigits(frac, opts) {
  const m = /^(0*)(\d*)$/.exec(frac);
  if (!m) throw new Error("Phần thập phân không hợp lệ");
  const out = [];
  for (let i = 0; i < m[1].length; i++) out.push(DIGIT[0]);
  if (m[2]) out.push(readIntegerDigits(m[2], opts));
  return out.join(" ");
}

const SUFFIX = [
  [/^(k|nghìn|ngàn|ngan|nghin)$/, 3],
  [/^(tr|triệu|trieu|m)$/, 6],
  [/^(tỷ|tỉ|ty|ti|b)$/, 9]
];

/**
 * Hiểu chuỗi số người dùng gõ: "1.250.000", "1,250,000", "1 250 000 đ", "12,5", "3.14", "1,5tr", "500k", "-2 tỷ".
 * Trả về { negative, int, frac } (chuỗi chữ số) hoặc null nếu không phải số.
 * Quy ước: có cả "." và "," thì dấu đứng sau cùng là dấu thập phân; chỉ có một loại dấu
 * thì nếu xuất hiện nhiều lần hoặc theo sau đúng 3 chữ số → phân cách hàng nghìn, ngược lại → thập phân.
 */
export function parseNumber(input) {
  let s = String(input == null ? "" : input).trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/(vnđ|vnd|đồng|dong|đ)\.?$/u, "").trim();
  let negative = false;
  if (/^[-−–]/.test(s)) { negative = true; s = s.slice(1).trim(); }
  else if (s[0] === "+") s = s.slice(1).trim();
  let mult = 0;
  const sm = /^([\d.,\s]+?)\s*(\p{L}+)$/u.exec(s);
  if (sm) {
    const hit = SUFFIX.find(([re]) => re.test(sm[2]));
    if (!hit) return null;
    mult = hit[1]; s = sm[1];
  }
  s = s.replace(/[\s _']/g, "");
  if (!/^\d[\d.,]*$/.test(s) && !/^[.,]\d+$/.test(s)) return null;
  if (/[.,]$/.test(s)) s = s.slice(0, -1);
  let intPart = s, frac = "";
  const hasDot = s.includes("."), hasComma = s.includes(",");
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const thou = dec === "." ? "," : ".";
    const i = s.lastIndexOf(dec);
    intPart = s.slice(0, i).split(thou).join("");
    frac = s.slice(i + 1);
    if (intPart.includes(dec) || frac.includes(thou)) return null;
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const parts = s.split(sep);
    const groupsOk = parts.slice(1).every((p) => p.length === 3) && /^[1-9]\d{0,2}$/.test(parts[0]);
    if (parts.length > 2 || (groupsOk && !mult)) {
      if (!groupsOk) return null;
      intPart = parts.join("");
    } else {
      intPart = parts[0] || "0"; frac = parts[1];
    }
  }
  if (!/^\d+$/.test(intPart) || (frac && !/^\d+$/.test(frac))) return null;
  if (mult) {
    // nhân với 10^mult bằng cách dời dấu phẩy
    const f = (frac + "0".repeat(mult)).slice(0, mult);
    intPart = intPart + f;
    frac = frac.slice(mult);
  }
  intPart = intPart.replace(/^0+(?=\d)/, "");
  frac = frac.replace(/0+$/, "");
  if (/^0*$/.test(intPart) && !frac) negative = false;
  return { negative, int: intPart, frac };
}

/** Định dạng lại số đã hiểu theo kiểu Việt Nam: 1.250.000,5 */
export function formatVN(p) {
  if (!p) return "";
  const int = p.int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (p.negative ? "-" : "") + int + (p.frac ? "," + p.frac : "");
}

/** Đọc một số (chuỗi hoặc number) thành chữ. Trả về chuỗi, hoặc ném lỗi nếu không hiểu được. */
export function readNumber(input, opts) {
  const o = Object.assign({}, DEFAULTS, opts);
  const p = typeof input === "object" && input && "int" in input ? input : parseNumber(typeof input === "number" ? String(input).replace(".", ",") : input);
  if (!p) throw new Error("Không hiểu được số này");
  let text = readIntegerDigits(p.int, o);
  if (p.frac) text += " phẩy " + readFractionDigits(p.frac, o);
  if (p.negative) text = "âm " + text;
  if (o.unit) {
    text += " " + o.unit;
    if (o.even && !p.frac) text += " chẵn";
  }
  if (o.capitalize) text = text.charAt(0).toUpperCase() + text.slice(1);
  return text;
}
