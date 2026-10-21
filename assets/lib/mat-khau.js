/* Mật khẩu (hàm thuần): sinh mật khẩu ngẫu nhiên / cụm từ dễ nhớ, tính độ bất định (entropy), đổi số lần đoán ra thời gian bẻ khoá bằng tiếng Việt. */
import { randInt, shuffle, cryptoU32 } from "./ngau-nhien.js";
import { TU } from "./tu-mat-khau.js";
import { removeAccents } from "./van-ban.js";

export const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/~"
};
export const AMBIGUOUS = "Il1|O0o`'\"";

/** Các bộ ký tự được dùng (đã bỏ ký tự dễ nhầm / ký tự loại trừ) */
export function charsets(o = {}) {
  const ban = new Set([...(o.noAmbiguous ? AMBIGUOUS : ""), ...(o.exclude || "")]);
  const out = [];
  for (const k of ["lower", "upper", "digits", "symbols"]) {
    if (!o[k]) continue;
    const s = [...(k === "symbols" && o.symbolSet ? o.symbolSet : SETS[k])].filter((c) => !ban.has(c));
    if (s.length) out.push([...new Set(s)].join(""));
  }
  return out;
}

/** Sinh mật khẩu: length ký tự, mỗi bộ được chọn có ít nhất một ký tự (khi length đủ) */
export function generatePassword(o = {}, u32 = cryptoU32) {
  const len = Math.max(1, Math.min(1024, Math.floor(o.length) || 16));
  const sets = charsets(o);
  if (!sets.length) throw Object.assign(new Error("Chọn ít nhất một loại ký tự."), { userMsg: "Chọn ít nhất một loại ký tự." });
  const all = sets.join("");
  const need = len >= sets.length;
  // lấy mẫu loại bỏ (rejection): sinh lại tới khi có đủ mỗi loại → phân bố đều trên tập mật khẩu hợp lệ
  for (;;) {
    let s = "";
    for (let i = 0; i < len; i++) s += all[randInt(all.length, u32)];
    if (!need || sets.every((set) => [...s].some((c) => set.includes(c)))) return s;
  }
}

/** Entropy (bit) của mật khẩu ngẫu nhiên: length × log2(số ký tự) */
export function passwordBits(o = {}) {
  const n = charsets(o).join("").length;
  return n ? (Math.max(1, Math.floor(o.length) || 16)) * Math.log2(n) : 0;
}

let WORDS = null;
/** Danh sách từ (không dấu, viết liền) và bản có dấu để gợi nhớ, đã lọc trùng */
export function wordList() {
  if (!WORDS) {
    const seen = new Map();
    for (const w of TU) { const k = removeAccents(w).toLowerCase().replace(/[^a-z]/g, ""); if (k && !seen.has(k)) seen.set(k, w); }
    WORDS = [...seen].map(([plain, vi]) => ({ plain, vi }));
  }
  return WORDS;
}

/** Cụm từ dễ nhớ: words từ, nối bằng sep; cap: viết hoa chữ đầu mỗi từ; digit: thêm một chữ số vào vị trí ngẫu nhiên */
export function generatePassphrase(o = {}, u32 = cryptoU32) {
  const list = wordList();
  const n = Math.max(2, Math.min(20, Math.floor(o.words) || 5));
  const picks = Array.from({ length: n }, () => list[randInt(list.length, u32)]);
  const parts = picks.map((w) => (o.cap ? w.plain[0].toUpperCase() + w.plain.slice(1) : w.plain));
  if (o.digit) { const i = randInt(n, u32); parts[i] += String(randInt(10, u32)); }
  return { text: parts.join(o.sep ?? "-"), hint: picks.map((w) => w.vi) };
}
export function passphraseBits(o = {}) {
  const n = Math.max(2, Math.min(20, Math.floor(o.words) || 5));
  return n * Math.log2(wordList().length) + (o.digit ? Math.log2(10 * n) : 0);
}

/** Mã PIN chỉ gồm chữ số */
export const generatePin = (len, u32 = cryptoU32) => Array.from({ length: Math.max(1, Math.min(64, len | 0)) }, () => randInt(10, u32)).join("");

/** Xếp hạng theo entropy (bit) */
export function bitsLevel(bits) {
  if (bits < 28) return { level: 0, label: "Rất yếu" };
  if (bits < 40) return { level: 1, label: "Yếu" };
  if (bits < 60) return { level: 2, label: "Trung bình" };
  if (bits < 80) return { level: 3, label: "Mạnh" };
  return { level: 4, label: "Rất mạnh" };
}

const UNITS = [[31536000 * 100, "thế kỷ"], [31536000, "năm"], [2592000, "tháng"], [86400, "ngày"], [3600, "giờ"], [60, "phút"], [1, "giây"]];
/** Đổi số giây ra chữ tiếng Việt: "dưới 1 giây", "khoảng 3 giờ", "hơn 1 triệu thế kỷ" */
export function durationVi(sec) {
  if (!Number.isFinite(sec) || sec > 31536000 * 100 * 1e6) return "hơn 1 triệu thế kỷ";
  if (sec < 1) return "dưới 1 giây";
  for (const [s, name] of UNITS) {
    if (sec >= s) {
      const v = sec / s;
      if (name === "thế kỷ" && v >= 1000) return "khoảng " + bigVi(v) + " thế kỷ";
      return "khoảng " + Math.round(v) + " " + name;
    }
  }
  return "dưới 1 giây";
}
function bigVi(v) {
  if (v >= 1e6) return "hơn 1 triệu";
  return Math.round(v / 1000) + " nghìn";
}

/** Số lần đoán cần (trung bình) cho entropy bits → thời gian ở các kịch bản tấn công (lần đoán / giây) */
export const ATTACKS = [
  { id: "online", rate: 100 / 3600, label: "Đoán qua mạng, có giới hạn số lần thử", note: "100 lần/giờ — như đăng nhập web có khoá tạm" },
  { id: "online-fast", rate: 10, label: "Đoán qua mạng, không giới hạn", note: "10 lần/giây" },
  { id: "offline-slow", rate: 1e4, label: "Lộ cơ sở dữ liệu, mật khẩu băm chậm", note: "10 nghìn lần/giây — bcrypt, Argon2" },
  { id: "offline-fast", rate: 1e10, label: "Lộ cơ sở dữ liệu, mật khẩu băm nhanh", note: "10 tỷ lần/giây — MD5, SHA-1 trên card đồ hoạ" }
];
export const crackSeconds = (guesses, rate) => guesses / rate;
export const bitsToGuesses = (bits) => 2 ** bits / 2;
