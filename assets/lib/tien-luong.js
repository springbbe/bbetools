/* Lương gross ↔ net, bảo hiểm bắt buộc và thuế TNCN từ tiền lương (cá nhân cư trú).
   Số liệu (mức đóng, trần, giảm trừ, biểu thuế) truyền vào từ data/bhxh.json, data/thue-tncn.json, data/luong-toi-thieu-vung.json. */

/** Thuế luỹ tiến từng phần. brackets: [[cận trên | null, thuế suất]] theo tháng → { tax, parts: [{ from, to, rate, amount, tax }] } */
export function progressiveTax(income, brackets) {
  const parts = [];
  let tax = 0, from = 0;
  for (const [to, rate] of brackets) {
    if (income <= from) break;
    const amount = Math.min(income, to == null ? Infinity : to) - from;
    const t = amount * rate;
    parts.push({ from, to, rate, amount, tax: t });
    tax += t;
    if (to == null) break;
    from = to;
  }
  return { tax: Math.round(tax), parts };
}

/** Biểu thuế tháng → năm (nhân cận trên với 12) */
export const yearlyBrackets = (brackets) => brackets.map(([to, r]) => [to == null ? null : to * 12, r]);

/** Bảo hiểm bắt buộc theo mức lương đóng. o: { baseSalary, capMultiple, minWage, rates: { bhxh, bhyt, bhtn } }
    BHXH, BHYT: trần 20 lần lương cơ sở (mức tham chiếu); BHTN: trần 20 lần lương tối thiểu vùng. */
export function insurance(insBase, o) {
  const capB = o.baseSalary * o.capMultiple, capT = o.minWage * o.capMultiple;
  const bBase = Math.min(insBase, capB), tBase = Math.min(insBase, capT);
  const r = o.rates;
  const bhxh = Math.round(bBase * r.bhxh), bhyt = Math.round(bBase * r.bhyt), bhtn = Math.round(tBase * r.bhtn);
  return { bhxh, bhyt, bhtn, total: bhxh + bhyt + bhtn, capped: insBase > capB || insBase > capT };
}

/** Thuế TNCN tháng. o: { personal, dependent, brackets, dependents, insurance (đã trừ), exempt (khoản không chịu thuế: ăn trưa, phụ cấp…) } */
export function pitMonthly(income, o) {
  const assessable = Math.max(0, income - (o.exempt || 0));                    // thu nhập chịu thuế
  const deduction = o.personal + o.dependent * (o.dependents || 0) + (o.insurance || 0);
  const taxable = Math.max(0, assessable - deduction);                          // thu nhập tính thuế
  const { tax, parts } = progressiveTax(taxable, o.brackets);
  return { assessable, deduction, taxable, tax, parts };
}

/** Gross → net. o: {
     ins: { baseSalary, capMultiple, minWage, rates, employerRates }, insBase (mặc định = gross; 0 = không đóng),
     tax: { personal, dependent, brackets }, dependents, exempt } */
export function grossToNet(gross, o) {
  const base = o.insBase == null ? gross : o.insBase;
  const none = { bhxh: 0, bhyt: 0, bhtn: 0, total: 0 };
  const emp = base > 0 ? insurance(base, o.ins) : none;
  const er = base > 0 && o.ins.employerRates ? insurance(base, { ...o.ins, rates: o.ins.employerRates }) : none;
  const exempt = Math.min(o.exempt || 0, gross);
  const pit = pitMonthly(gross, Object.assign({}, o.tax, { dependents: o.dependents, insurance: emp.total, exempt }));
  return { gross, ins: emp, employer: er, cost: gross + er.total, ...pit, net: gross - emp.total - pit.tax };
}

/** Net → gross: tìm gross nhỏ nhất cho net ≥ mong muốn (net tăng dần theo gross nên tìm nhị phân). */
export function netToGross(net, o) {
  if (net <= 0) return grossToNet(0, o);
  let lo = Math.floor(net), hi = Math.ceil(net * 2) + 1e7;
  while (grossToNet(hi, o).net < net) hi *= 2;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (grossToNet(mid, o).net >= net) hi = mid; else lo = mid;
  }
  return grossToNet(grossToNet(lo, o).net >= net ? lo : hi, o);
}
