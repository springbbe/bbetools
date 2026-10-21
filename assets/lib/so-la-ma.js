/* Số La Mã ↔ số thường (1–3.999 dạng chuẩn; đến 3.999.999 dùng gạch ngang trên = × 1000). */

const MAP = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
const VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
const BAR = "\u0305"; // dấu gạch ngang trên kết hợp

function basic(n) {
  let s = "";
  for (const [v, r] of MAP) while (n >= v) { s += r; n -= v; }
  return s;
}

/** Số → La Mã. Trên 3.999: phần nghìn viết có gạch trên (vd 5.000 = V̅). */
export function toRoman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999999) return null;
  if (n < 4000) return basic(n);
  const th = Math.floor(n / 1000), rest = n % 1000;
  return [...basic(th)].map((c) => c + BAR).join("") + basic(rest);
}

/** La Mã → số; chỉ nhận cách viết chuẩn (IV chứ không IIII, không VX…). Trả về null nếu không hợp lệ. */
export function fromRoman(s) {
  const t = String(s || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return null;
  // phần có gạch trên (× 1000)
  const m = /^((?:[IVXLCDM]\u0305)*)([IVXLCDM]*)$/u.exec(t.normalize("NFD"));
  if (!m) return null;
  const hi = m[1].replace(/\u0305/g, ""), lo = m[2];
  const parse = (x) => {
    if (!x) return 0;
    let v = 0;
    for (let i = 0; i < x.length; i++) { const a = VAL[x[i]], b = VAL[x[i + 1]] || 0; v += a < b ? -a : a; }
    return basic(v) === x ? v : null;   // so với cách viết chuẩn để loại "IIII", "VX", "IC"…
  };
  const a = parse(hi), b = parse(lo);
  if (a == null || b == null) return null;
  if (hi && a < 4) return null;          // 1.000–3.999 viết bằng M, không dùng I̅
  return a * 1000 + b || null;
}

/** Tự nhận chiều đổi: số → La Mã, La Mã → số */
export function convertRoman(input) {
  const t = String(input || "").trim();
  if (!t) return { kind: "empty" };
  const digits = t.replace(/[.\s]/g, "");
  if (/^\d+$/.test(digits)) {
    const n = +digits, r = toRoman(n);
    return r ? { kind: "toRoman", n, roman: r } : { kind: "error", msg: n === 0 ? "Số La Mã không có số 0" : "Chỉ đổi được từ 1 đến 3.999.999" };
  }
  const n = fromRoman(t);
  return n != null ? { kind: "fromRoman", n, roman: toRoman(n) } : { kind: "error", msg: "Không phải số La Mã viết đúng chuẩn" };
}
