/* Ước tính BHXH một lần (BHXH bắt buộc) theo Luật BHXH 2024 và hệ số điều chỉnh tiền lương hằng năm (data/bhxh.json).
   Mức hưởng = bình quân tiền lương tháng đã điều chỉnh × (1,5 tháng cho mỗi năm đóng trước 2014 + 2 tháng cho mỗi năm từ 2014).
   Tháng lẻ của giai đoạn trước 2014 được chuyển sang giai đoạn từ 2014; giai đoạn sau: lẻ 1–6 tháng tính nửa năm, 7–11 tháng tính một năm.
   Đóng chưa đủ 1 năm: hưởng bằng số tiền đã đóng (22% tiền lương), tối đa 2 tháng bình quân. */

/** "2015-06" | "06/2015" → { y, m } */
export function parseMonth(s) {
  const t = String(s || "").trim();
  let m = /^(\d{4})-(\d{1,2})$/.exec(t);
  if (m) return valid(+m[1], +m[2]);
  m = /^(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(t);
  if (m) return valid(+m[2], +m[1]);
  return null;
}
const valid = (y, m) => (m >= 1 && m <= 12 && y >= 1960 && y <= 2100 ? { y, m } : null);
const idx = (p) => p.y * 12 + p.m - 1;

/** periods: [{ from, to, salary }] (from/to dạng "YYYY-MM", tính cả hai đầu)
    data: { adjust: { "1994": 5.81, … }, lumpSum: { monthsBefore2014, monthsFrom2014, under1YearRate, under1YearMaxMonths } } */
export function lumpSum(periods, data) {
  const months = new Map(); // tháng → tiền lương (trùng tháng: lấy dòng sau)
  const errors = [];
  periods.forEach((p, i) => {
    const a = parseMonth(p.from), b = parseMonth(p.to), s = +p.salary;
    if (!a || !b) { errors.push(`Dòng ${i + 1}: tháng bắt đầu/kết thúc chưa đúng (dạng MM/YYYY).`); return; }
    if (idx(b) < idx(a)) { errors.push(`Dòng ${i + 1}: tháng kết thúc trước tháng bắt đầu.`); return; }
    if (!(s > 0)) { errors.push(`Dòng ${i + 1}: chưa nhập mức lương đóng.`); return; }
    for (let k = idx(a); k <= idx(b); k++) months.set(k, s);
  });
  const years = Object.keys(data.adjust).map(Number);
  const minY = Math.min(...years), maxY = Math.max(...years);
  const coef = (y) => data.adjust[String(Math.max(minY, Math.min(maxY, y)))];
  const byYear = new Map();
  let sum = 0, raw = 0, before = 0, after = 0;
  for (const [k, s] of months) {
    const y = Math.floor(k / 12), c = coef(y), adj = s * c;
    sum += adj; raw += s;
    if (y < 2014) before++; else after++;
    const r = byYear.get(y) || { year: y, months: 0, salary: 0, coef: c, adjusted: 0 };
    r.months++; r.salary += s; r.adjusted += adj;
    byYear.set(y, r);
  }
  const total = before + after;
  const avg = total ? sum / total : 0;
  const L = data.lumpSum;
  let yBefore = 0, yAfter = 0, amount = 0, under1 = false;
  if (total && total < 12) {
    under1 = true;
    amount = Math.min(raw * L.under1YearRate, avg * L.under1YearMaxMonths);
  } else if (total) {
    const odd = before % 12;
    yBefore = (before - odd) / 12;
    const a = after + odd, rest = a % 12;
    yAfter = Math.floor(a / 12) + (rest === 0 ? 0 : rest <= 6 ? 0.5 : 1);
    amount = avg * (yBefore * L.monthsBefore2014 + yAfter * L.monthsFrom2014);
  }
  return {
    errors, months: total, monthsBefore: before, monthsAfter: after, yearsBefore: yBefore, yearsAfter: yAfter, under1,
    average: Math.round(avg), amount: Math.round(amount),
    multiplier: yBefore * L.monthsBefore2014 + yAfter * L.monthsFrom2014,
    years: [...byYear.values()].sort((a, b) => a.year - b.year)
  };
}
