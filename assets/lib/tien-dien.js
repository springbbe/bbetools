/* Tiền điện sinh hoạt theo biểu giá bậc thang (data/gia-dien.json). */

/** kwh: số điện; tiers: [{ upTo, price }]; o: { households (số hộ dùng chung công tơ), vat, days, monthDays }
    Theo EVN: nhiều hộ chung công tơ → định mức mỗi bậc × số hộ; kỳ ghi chỉ số không tròn tháng → định mức × số ngày / số ngày của tháng.
    → { rows: [{ tier, from, to, kwh, price, amount }], subtotal, vat, total } */
export function electricityBill(kwh, tiers, o = {}) {
  const k = Math.max(0, +kwh || 0);
  const scale = Math.max(1, +o.households || 1) * (o.days && o.monthDays ? o.days / o.monthDays : 1);
  const rows = [];
  let from = 0, left = k;
  tiers.forEach((t, i) => {
    if (left <= 0) return;
    const cap = t.upTo == null ? Infinity : Math.round(t.upTo * scale) - from;
    const use = Math.min(left, cap);
    if (use > 0) rows.push({ tier: i + 1, from: from + 1, to: t.upTo == null ? null : from + cap, kwh: use, price: t.price, amount: Math.round(use * t.price) });
    left -= use;
    if (t.upTo != null) from += cap;
  });
  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const vat = Math.round(subtotal * (o.vat || 0));
  return { rows, subtotal, vat, total: subtotal + vat };
}

/** Số kWh lớn nhất có tổng tiền (gồm VAT) không vượt quá số tiền cho trước */
export function kwhForAmount(amount, tiers, o = {}) {
  let lo = 0, hi = 1;
  while (electricityBill(hi, tiers, o).total <= amount && hi < 1e9) hi *= 2;
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (electricityBill(mid, tiers, o).total <= amount) lo = mid; else hi = mid; }
  return lo;
}
