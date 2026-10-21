/* Chia tiền nhóm: mỗi khoản chi do một người trả, chia đều cho những người tham gia (hoặc theo phần).
   Kết quả: số dư từng người và danh sách chuyển khoản ít nhất để hoà. */

/** people: ["An", "Bình", …]; expenses: [{ payer: index, amount, among: [index…] (rỗng = cả nhóm), weights?: { index: số phần } }]
    → { paid, share, balance (dương = được nhận lại), total, transfers: [{ from, to, amount }] } */
export function settle(people, expenses, o = {}) {
  const n = people.length;
  const paid = Array(n).fill(0), share = Array(n).fill(0);
  let total = 0;
  for (const e of expenses) {
    const amt = Math.round(+e.amount || 0);
    if (!(amt > 0) || !(e.payer >= 0 && e.payer < n)) continue;
    const among = (e.among && e.among.length ? e.among : people.map((_, i) => i)).filter((i) => i >= 0 && i < n);
    if (!among.length) continue;
    const w = among.map((i) => Math.max(0, +(e.weights && e.weights[i]) || 1));
    const W = w.reduce((a, b) => a + b, 0);
    // chia nguyên đồng, phần dư dồn cho người đầu danh sách để tổng khớp tuyệt đối
    const parts = w.map((x) => Math.floor((amt * x) / W));
    let rest = amt - parts.reduce((a, b) => a + b, 0);
    for (let k = 0; rest > 0; k = (k + 1) % parts.length, rest--) parts[k]++;
    among.forEach((i, k) => { share[i] += parts[k]; });
    paid[e.payer] += amt;
    total += amt;
  }
  const balance = paid.map((p, i) => p - share[i]);
  return { paid, share, balance, total, transfers: minTransfers(balance, o.round || 1) };
}

/** Ghép người nợ nhiều nhất với người được nhận nhiều nhất cho tới khi hết (tối đa n − 1 lần chuyển).
    round: làm tròn số tiền mỗi lần chuyển (vd 1000 đ); phần lệch do làm tròn không quá round/2 mỗi lần. */
export function minTransfers(balance, round = 1) {
  const cred = [], debt = [];
  balance.forEach((b, i) => { if (b > 0) cred.push({ i, v: b }); else if (b < 0) debt.push({ i, v: -b }); });
  const out = [];
  const byV = (a, b) => b.v - a.v || a.i - b.i;
  while (cred.length && debt.length) {
    cred.sort(byV); debt.sort(byV);
    const c = cred[0], d = debt[0];
    const x = Math.min(c.v, d.v);
    const amt = round > 1 ? Math.round(x / round) * round : x;
    if (amt > 0) out.push({ from: d.i, to: c.i, amount: amt });
    c.v -= x; d.v -= x;
    if (c.v <= 0) cred.shift();
    if (d.v <= 0) debt.shift();
  }
  return out;
}
