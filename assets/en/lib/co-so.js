/* Tự sinh bởi scripts/build.js từ assets/lib/co-so.js và i18n/en/js/ — đừng sửa tay. */
/* Đổi cơ số (hàm thuần, dùng BigInt nên không giới hạn độ lớn) và tính quyền chmod. */

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
const PREFIX = { "0b": 2, "0o": 8, "0x": 16 };

/** Đọc số nguyên ở cơ số base (2–36). Bỏ qua dấu cách, "_", tiền tố 0b/0o/0x. → BigInt, ném lỗi tiếng Việt nếu sai */
export function parseInBase(input, base) {
  let s = String(input ?? "").trim().toLowerCase().replace(/[\s_']/g, "");
  if (!s) throw new Error("No number entered.");
  let neg = false;
  if (s[0] === "-" || s[0] === "+") { neg = s[0] === "-"; s = s.slice(1); }
  const p = s.slice(0, 2);
  if (PREFIX[p] && (PREFIX[p] === base || base === 0)) { base = PREFIX[p]; s = s.slice(2); }
  if (base === 0) base = 10;
  if (!s) throw new Error("No number entered.");
  const B = BigInt(base);
  let v = 0n;
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) throw new Error(`The digit “${ch}” doesn't exist in base ${base}${base <= 10 ? ` (only 0–${base - 1} allowed)` : ` (0–9, a–${DIGITS[base - 1]})`}.`);
    v = v * B + BigInt(d);
  }
  return neg ? -v : v;
}

export function toBase(v, base, upper = false) {
  if (v === 0n) return "0";
  const neg = v < 0n;
  if (neg) v = -v;
  const B = BigInt(base);
  let s = "";
  while (v > 0n) { s = DIGITS[Number(v % B)] + s; v /= B; }
  if (upper) s = s.toUpperCase();
  return (neg ? "-" : "") + s;
}

/** Nhóm chữ số từ phải sang: group("11010110", 4) → "1101 0110" */
export function group(s, n, sep = " ") {
  const neg = s[0] === "-";
  if (neg) s = s.slice(1);
  const out = [];
  for (let i = s.length; i > 0; i -= n) out.unshift(s.slice(Math.max(0, i - n), i));
  return (neg ? "-" : "") + out.join(sep);
}

/** Biểu diễn bù 2 với số bit cho trước; null nếu không vừa */
export function twosComplement(v, bits) {
  const max = 1n << BigInt(bits);
  if (v < -(max >> 1n) || v >= max) return null;
  const u = v < 0n ? max + v : v;
  return toBase(u, 2).padStart(bits, "0");
}

/** Số bit tối thiểu để chứa (không dấu) */
export const bitLength = (v) => (v < 0n ? -v : v).toString(2).length;

/* ---------- chmod ---------- */
const WHO = ["u", "g", "o"];
/** 0o755 → { owner: {r,w,x}, group, other, setuid, setgid, sticky } */
export function modeToBits(mode) {
  const b = (n) => ({ r: !!(n & 4), w: !!(n & 2), x: !!(n & 1) });
  return { owner: b((mode >> 6) & 7), group: b((mode >> 3) & 7), other: b(mode & 7), setuid: !!(mode & 0o4000), setgid: !!(mode & 0o2000), sticky: !!(mode & 0o1000) };
}
export function bitsToMode(p) {
  const n = (x) => (x.r ? 4 : 0) + (x.w ? 2 : 0) + (x.x ? 1 : 0);
  return (p.setuid ? 0o4000 : 0) | (p.setgid ? 0o2000 : 0) | (p.sticky ? 0o1000 : 0) | (n(p.owner) << 6) | (n(p.group) << 3) | n(p.other);
}
/** 0o4755 → "rwsr-xr-x" */
export function modeToSymbolic(mode) {
  const p = modeToBits(mode);
  const t = (x, special, ch) => (x.r ? "r" : "-") + (x.w ? "w" : "-") + (special ? (x.x ? ch : ch.toUpperCase()) : x.x ? "x" : "-");
  return t(p.owner, p.setuid, "s") + t(p.group, p.setgid, "s") + t(p.other, p.sticky, "t");
}
export const modeToOctal = (mode) => (mode > 0o777 ? mode.toString(8).padStart(4, "0") : mode.toString(8).padStart(3, "0"));

/** Đọc quyền: "755", "0644", "4755", "rwxr-xr-x", "-rw-r--r--", "u=rwx,g=rx,o=r", "a+x" (áp lên base). → số hoặc ném lỗi */
export function parseMode(input, base = 0) {
  const s = String(input ?? "").trim();
  if (/^[0-7]{1,4}$/.test(s)) return parseInt(s, 8);
  const sym = s.replace(/^[-dlcbps]?(?=[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$)/, "");
  if (/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(sym)) {
    const g = (i) => ({ r: sym[i] === "r", w: sym[i + 1] === "w", x: /[xst]/.test(sym[i + 2]) });
    return bitsToMode({ owner: g(0), group: g(3), other: g(6), setuid: /[sS]/.test(sym[2]), setgid: /[sS]/.test(sym[5]), sticky: /[tT]/.test(sym[8]) });
  }
  let mode = base;
  const clauses = s.split(",").map((c) => c.trim()).filter(Boolean);
  if (!clauses.length) throw new Error("No permissions entered.");
  for (const c of clauses) {
    const m = /^([ugoa]*)([+=-])([rwxXst]*)$/.exec(c);
    if (!m) throw new Error(`Don't understand “${c}”. Valid examples: 755, rwxr-xr-x, u=rwx,g=rx,o=r, a+x.`);
    const who = m[1] && !m[1].includes("a") ? [...new Set(m[1])] : WHO;
    let mask = 0;
    for (const w of who) {
      const sh = w === "u" ? 6 : w === "g" ? 3 : 0;
      for (const p of m[3]) {
        if (p === "r") mask |= 4 << sh;
        if (p === "w") mask |= 2 << sh;
        if (p === "x" || p === "X") mask |= 1 << sh;
        if (p === "s" && w === "u") mask |= 0o4000;
        if (p === "s" && w === "g") mask |= 0o2000;
        if (p === "t") mask |= 0o1000;
      }
    }
    if (m[2] === "+") mode |= mask;
    else if (m[2] === "-") mode &= ~mask;
    else {
      let clear = 0;
      for (const w of who) clear |= 7 << (w === "u" ? 6 : w === "g" ? 3 : 0) | (w === "u" ? 0o4000 : w === "g" ? 0o2000 : 0o1000);
      mode = (mode & ~clear) | mask;
    }
  }
  return mode & 0o7777;
}
