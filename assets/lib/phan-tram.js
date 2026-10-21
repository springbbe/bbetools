/* Phần trăm, giảm giá, VAT. */

export const percentOf = (p, x) => (p / 100) * x;                         // p% của x
export const whatPercent = (a, b) => (b === 0 ? NaN : (a / b) * 100);     // a là bao nhiêu % của b
export const change = (from, to) => (from === 0 ? NaN : ((to - from) / Math.abs(from)) * 100); // tăng/giảm bao nhiêu %
export const applyChange = (x, p) => x * (1 + p / 100);                   // x tăng p% (p âm = giảm)
export const baseFromPart = (part, p) => (p === 0 ? NaN : part / (p / 100)); // part là p% của số nào

/** Chuỗi giảm giá "20+10" hoặc "20; 12,5" → [20, 10] / [20, 12.5] (dấu phẩy là phần thập phân) */
export function parseChain(s) {
  return String(s || "").replace(/%/g, "").split(/[+;]|\s+/).map((x) => x.trim().replace(",", ".")).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
}
/** Giảm nhiều lần liên tiếp → { price, steps: [{ pct, before, off, after }], totalPct } */
export function discountChain(price, pcts) {
  let p = price;
  const steps = pcts.map((pct) => { const before = p, off = (before * pct) / 100; p = before - off; return { pct, before, off, after: p }; });
  return { price: p, steps, saved: price - p, totalPct: price ? ((price - p) / price) * 100 : 0 };
}

/** VAT: dir = "add" (giá chưa thuế → có thuế) | "remove" (giá đã gồm thuế → tách thuế); rate dạng % */
export function vat(amount, rate, dir = "add") {
  const r = rate / 100;
  if (dir === "remove") { const net = Math.round(amount / (1 + r)); return { net, tax: amount - net, gross: amount }; }
  const tax = Math.round(amount * r);
  return { net: amount, tax, gross: amount + tax };
}
