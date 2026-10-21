/* Ngẫu nhiên (hàm thuần): số nguyên đều tuyệt đối (không lệch modulo), xáo trộn, chọn không trùng, chia đội, chọn theo trọng số.
   Mọi hàm nhận u32: () => số nguyên 32 bit không dấu. Trên trình duyệt dùng cryptoU32 (crypto.getRandomValues). */

let pool = new Uint32Array(0), pos = 0;
/** Số 32 bit từ bộ sinh số an toàn của trình duyệt/Node (lấy theo lô cho nhanh) */
export function cryptoU32() {
  if (pos >= pool.length) { pool = globalThis.crypto.getRandomValues(new Uint32Array(256)); pos = 0; }
  return pool[pos++];
}

/** Bộ sinh có hạt giống (mulberry32) — chỉ dùng cho test */
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; };
}

const TWO32 = 4294967296;
/** Số nguyên đều trong [0, n), n tối đa 2^53 */
export function randInt(n, u32 = cryptoU32) {
  if (!(n >= 1) || !Number.isFinite(n)) throw new RangeError("n phải ≥ 1");
  n = Math.floor(n);
  if (n === 1) return 0;
  if (n <= TWO32) {
    const lim = TWO32 - (TWO32 % n); // bỏ phần dư để không lệch
    let x; do x = u32(); while (x >= lim);
    return x % n;
  }
  if (n > 2 ** 53) throw new RangeError("Khoảng quá lớn");
  const M = 2 ** 53, lim = M - (M % n);
  let x; do x = (u32() & 0x1fffff) * TWO32 + u32(); while (x >= lim);
  return x % n;
}
/** Số nguyên đều trong [min, max] */
export const randBetween = (min, max, u32 = cryptoU32) => min + randInt(max - min + 1, u32);

/** Xáo trộn Fisher–Yates (trả mảng mới) */
export function shuffle(arr, u32 = cryptoU32) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1, u32); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const pick = (arr, u32 = cryptoU32) => arr[randInt(arr.length, u32)];

/** Chọn count số không trùng trong [min, max], bỏ các số trong exclude (Set). Khoảng lớn dùng thuật toán Floyd, không cần mảng cả khoảng. */
export function uniqueInts(min, max, count, { exclude = new Set(), u32 = cryptoU32 } = {}) {
  const span = max - min + 1;
  let ex = 0;
  for (const e of exclude) if (e >= min && e <= max) ex++;
  if (count > span - ex) throw new RangeError(`Chỉ có ${span - ex} số khả dụng trong khoảng, không đủ ${count} số không trùng.`);
  if (span <= 200000) {
    const all = [];
    for (let v = min; v <= max; v++) if (!exclude.has(v)) all.push(v);
    // xáo một phần (partial Fisher–Yates)
    for (let i = 0; i < count; i++) { const j = i + randInt(all.length - i, u32); [all[i], all[j]] = [all[j], all[i]]; }
    return all.slice(0, count);
  }
  const chosen = new Set(), out = [];
  while (out.length < count) {
    const v = min + randInt(span, u32);
    if (!chosen.has(v) && !exclude.has(v)) { chosen.add(v); out.push(v); }
  }
  return out;
}

/** Chọn chỉ số theo trọng số (mảng số ≥ 0). Trọng số được nhân lên số nguyên 1/1000 cho chính xác. */
export function weightedIndex(weights, u32 = cryptoU32) {
  const w = weights.map((x) => Math.max(0, Math.round((+x || 0) * 1000)));
  const total = w.reduce((s, x) => s + x, 0);
  if (!total) throw new RangeError("Tổng trọng số bằng 0");
  let r = randInt(total, u32);
  for (let i = 0; i < w.length; i++) { if (r < w[i]) return i; r -= w[i]; }
  return w.length - 1;
}

/** Tách danh sách từ văn bản: mỗi dòng một mục (hoặc ngăn bởi dấu phẩy/chấm phẩy khi chỉ có một dòng), bỏ dòng trống.
    "Tên * 3" hoặc "Tên x3" = trọng số 3 (dùng cho vòng quay). */
export function parseList(text, { weights = false } = {}) {
  let lines = String(text || "").split(/\r?\n/);
  if (lines.filter((l) => l.trim()).length === 1 && /[,;]/.test(lines.find((l) => l.trim()))) lines = lines.join("").split(/[,;]/);
  const out = [];
  for (let l of lines) {
    l = l.trim();
    if (!l) continue;
    let w = 1;
    if (weights) {
      const m = /^(.*?)\s*[*×x]\s*(\d+(?:[.,]\d+)?)$/i.exec(l);
      if (m && m[1].trim()) { l = m[1].trim(); w = parseFloat(m[2].replace(",", ".")); }
    }
    out.push(weights ? { label: l, weight: w } : l);
  }
  return out;
}

/** Chia danh sách thành đội ngẫu nhiên. by: "teams" (n = số đội) | "size" (n = số người mỗi đội).
    Các đội chênh nhau tối đa 1 người. fixed: mảng "trưởng nhóm" được rải đều mỗi đội một người trước. */
export function splitTeams(list, n, by = "teams", { u32 = cryptoU32, leaders = [] } = {}) {
  const total = list.length + leaders.length;
  n = Math.max(1, Math.floor(n) || 1);
  let k = by === "size" ? Math.max(1, Math.ceil(total / n)) : Math.min(n, Math.max(1, total));
  if (leaders.length > k) k = leaders.length;
  const teams = Array.from({ length: k }, () => []);
  shuffle(leaders, u32).forEach((x, i) => teams[i].push(x));
  // thêm vào đội đang ít người nhất; đội bằng nhau thì chọn ngẫu nhiên thứ tự
  const order = shuffle(teams.map((_, i) => i), u32);
  for (const x of shuffle(list, u32)) {
    let best = order[0];
    for (const i of order) if (teams[i].length < teams[best].length) best = i;
    teams[best].push(x);
  }
  return teams;
}

/** Tung n xúc xắc s mặt → mảng kết quả 1..s */
export const rollDice = (n, sides = 6, u32 = cryptoU32) => Array.from({ length: n }, () => 1 + randInt(sides, u32));
