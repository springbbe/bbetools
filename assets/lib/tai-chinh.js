/* Vay trả góp, gửi tiết kiệm, lãi kép. Lãi suất nhập theo %/năm, tiền tính bằng đồng (làm tròn từng kỳ). */

const round = Math.round;

/** Lịch trả nợ.
    o: { principal, months, rate (%/năm), method: "reducing" (gốc đều, lãi theo dư nợ giảm dần) | "annuity" (trả đều mỗi tháng),
         promoMonths, promoRate (%/năm trong những tháng đầu) }
    → { rows: [{ n, opening, principal, interest, payment, closing, rate }], totalInterest, totalPayment, firstPayment, maxPayment } */
export function loanSchedule(o) {
  const P = Math.max(0, +o.principal || 0), N = Math.max(0, Math.round(+o.months || 0));
  const rows = [];
  if (!P || !N) return { rows, totalInterest: 0, totalPayment: 0, firstPayment: 0, maxPayment: 0 };
  const promoN = Math.min(N, Math.max(0, Math.round(+o.promoMonths || 0)));
  const rateAt = (n) => (n <= promoN ? +o.promoRate || 0 : +o.rate || 0);
  const gocDeu = P / N;
  let bal = P, pay = 0, payRate = null;
  for (let n = 1; n <= N; n++) {
    const yr = rateAt(n), r = yr / 100 / 12;
    const interest = round(bal * r);
    let principal;
    if (o.method === "annuity") {
      if (payRate !== yr) { // lãi suất đổi → tính lại khoản trả đều cho số tháng còn lại
        const left = N - n + 1;
        pay = r ? (bal * r) / (1 - Math.pow(1 + r, -left)) : bal / left;
        payRate = yr;
      }
      principal = n === N ? bal : round(pay) - interest;
    } else {
      principal = n === N ? bal : round(gocDeu);
    }
    principal = Math.min(principal, bal);
    rows.push({ n, opening: bal, principal, interest, payment: principal + interest, closing: bal - principal, rate: yr });
    bal -= principal;
  }
  const totalInterest = rows.reduce((s, x) => s + x.interest, 0);
  return { rows, totalInterest, totalPayment: P + totalInterest, firstPayment: rows[0].payment, maxPayment: Math.max(...rows.map((x) => x.payment)) };
}

/** Gửi tiết kiệm có kỳ hạn.
    o: { amount, rate (%/năm), months (kỳ hạn), payout: "end" (lĩnh lãi cuối kỳ) | "monthly" (lĩnh lãi hằng tháng) | "rollover" (tái tục gốc + lãi),
         cycles (số kỳ khi tái tục), basis: "month" (lãi = gốc × lãi suất × tháng/12) | "day" (theo số ngày thực tế/365), start (Date, khi basis = day) }
    → { interest, total, rows: [{ n, from, to, days, principal, interest, balance }] } */
export function savings(o) {
  const A = Math.max(0, +o.amount || 0), r = (+o.rate || 0) / 100, M = Math.max(1, Math.round(+o.months || 1));
  const byDay = o.basis === "day";
  let start = o.start ? new Date(o.start) : new Date();
  start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const addM = (d, m) => { const x = new Date(d.getFullYear(), d.getMonth() + m, 1); x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x; };
  const days = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
  const period = (p, from, months) => {
    const to = addM(from, months);
    const d = days(from, to);
    return { to, days: d, interest: round(byDay ? (p * r * d) / 365 : (p * r * months) / 12) };
  };
  const rows = [];
  if (o.payout === "monthly") {
    let from = start;
    for (let n = 1; n <= M; n++) { const x = period(A, from, 1); rows.push({ n, from, to: x.to, days: x.days, principal: A, interest: x.interest, balance: A }); from = x.to; }
  } else {
    const C = o.payout === "rollover" ? Math.max(1, Math.round(+o.cycles || 1)) : 1;
    let p = A, from = start;
    for (let n = 1; n <= C; n++) { const x = period(p, from, M); rows.push({ n, from, to: x.to, days: x.days, principal: p, interest: x.interest, balance: p + x.interest }); p += x.interest; from = x.to; }
  }
  const interest = rows.reduce((s, x) => s + x.interest, 0);
  return { interest, total: A + interest, rows };
}

/** Lãi kép có góp thêm định kỳ mỗi tháng.
    o: { initial, monthly, rate (%/năm), years, freq (số lần nhập lãi mỗi năm: 1, 4, 12, 365), atStart (góp đầu tháng) }
    → { rows: [{ year, contributed, value, interest }], value, contributed, interest } */
export function compound(o) {
  const years = Math.max(0, Math.min(100, Math.round(+o.years || 0)));
  const r = (+o.rate || 0) / 100, f = +o.freq || 12;
  const mr = Math.pow(1 + r / f, f / 12) - 1; // lãi suất tương đương mỗi tháng
  let value = +o.initial || 0, contributed = value;
  const add = +o.monthly || 0;
  const rows = [{ year: 0, contributed, value, interest: 0 }];
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      if (o.atStart) { value += add; contributed += add; }
      value *= 1 + mr;
      if (!o.atStart) { value += add; contributed += add; }
    }
    rows.push({ year: y, contributed, value, interest: value - contributed });
  }
  const last = rows[rows.length - 1];
  return { rows, value: round(last.value), contributed: round(last.contributed), interest: round(last.value - last.contributed) };
}
