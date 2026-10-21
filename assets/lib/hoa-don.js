/* Hoá đơn, báo giá (hàm thuần): đọc số kiểu Việt Nam, tính thành tiền, chiết khấu, thuế GTGT, tổng cộng (làm tròn đến đồng). */

/** "1.500.000" → 1500000; "2,5" → 2.5; "1500000.5" → 1500000.5; "" → 0. Không hiểu → NaN */
export function parseVN(s) {
  if (typeof s === "number") return s;
  let t = String(s ?? "").replace(/[\s\u00a0đ₫]/gi, "");
  if (!t) return 0;
  const neg = /^-/.test(t);
  t = t.replace(/^[-+]/, "");
  if (t.includes(",")) {
    // dấu phẩy là phần thập phân, dấu chấm phân cách hàng nghìn
    if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return NaN;
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  else if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  const n = Number(t);
  return neg ? -n : n;
}

const round = (n) => Math.round(n + Number.EPSILON * Math.sign(n));

/**
 * items: [{ qty, price }] (số hoặc chuỗi); o: { discount: số, discountType: "pct" | "amount", vat: % (null = không tính), shipping }
 * → { lines: [thành tiền], subtotal, discount, taxable, vat, shipping, total }
 */
export function totals(items, o = {}) {
  const lines = items.map((it) => {
    const q = parseVN(it.qty), p = parseVN(it.price);
    return Number.isFinite(q) && Number.isFinite(p) ? round(q * p) : 0;
  });
  const subtotal = lines.reduce((a, b) => a + b, 0);
  const d = parseVN(o.discount);
  let discount = !Number.isFinite(d) || d <= 0 ? 0 : o.discountType === "pct" ? round((subtotal * Math.min(d, 100)) / 100) : round(Math.min(d, subtotal));
  const taxable = subtotal - discount;
  const rate = o.vat == null || o.vat === "" ? null : parseVN(o.vat);
  const vat = rate == null || !Number.isFinite(rate) ? 0 : round((taxable * rate) / 100);
  const sh = parseVN(o.shipping);
  const shipping = Number.isFinite(sh) && sh > 0 ? round(sh) : 0;
  return { lines, subtotal, discount, taxable, vat, rate: rate == null || !Number.isFinite(rate) ? null : rate, shipping, total: taxable + vat + shipping };
}

/** Số chứng từ kế tiếp: "BG-2026-009" → "BG-2026-010", "HD99" → "HD100" */
export function nextNumber(s) {
  const m = /^(.*?)(\d+)(\D*)$/.exec(String(s ?? ""));
  if (!m) return s ? s + "-2" : "001";
  const n = String(+m[2] + 1).padStart(m[2].length, "0");
  return m[1] + n + m[3];
}
