import { test } from "node:test";
import assert from "node:assert/strict";
import { loanSchedule, savings, compound } from "../assets/lib/tai-chinh.js";

test("vay dư nợ giảm dần (gốc đều)", () => {
  const r = loanSchedule({ principal: 120e6, months: 12, rate: 12, method: "reducing" });
  assert.equal(r.rows.length, 12);
  assert.equal(r.rows[0].principal, 10e6);
  assert.equal(r.rows[0].interest, 1.2e6);
  assert.equal(r.totalInterest, 7.8e6);
  assert.equal(r.rows[11].closing, 0);
});

test("vay trả đều hằng tháng (annuity)", () => {
  const r = loanSchedule({ principal: 120e6, months: 12, rate: 12, method: "annuity" });
  assert.equal(r.rows[0].payment, 10661855);
  assert.ok(Math.abs(r.totalInterest - 7942256) < 30, String(r.totalInterest));
  assert.equal(r.rows[11].closing, 0);
});

test("vay có lãi suất ưu đãi rồi thả nổi", () => {
  const r = loanSchedule({ principal: 100e6, months: 24, rate: 12, promoMonths: 6, promoRate: 6, method: "annuity" });
  assert.equal(r.rows[0].interest, 500000);
  assert.equal(r.rows[6].rate, 12);
  assert.ok(r.rows[6].payment > r.rows[5].payment);
  assert.equal(r.rows[23].closing, 0);
});

test("tiết kiệm", () => {
  assert.equal(savings({ amount: 100e6, rate: 6, months: 12, payout: "end" }).interest, 6e6);
  const m = savings({ amount: 100e6, rate: 6, months: 12, payout: "monthly" });
  assert.equal(m.rows.length, 12);
  assert.equal(m.interest, 6e6);
  assert.equal(savings({ amount: 100e6, rate: 6, months: 12, payout: "rollover", cycles: 2 }).interest, 12.36e6);
  const d = savings({ amount: 100e6, rate: 5, months: 1, payout: "end", basis: "day", start: new Date(2026, 0, 1) });
  assert.equal(d.rows[0].days, 31);
  assert.equal(d.interest, Math.round((100e6 * 0.05 * 31) / 365));
});

test("lãi kép", () => {
  assert.equal(compound({ initial: 100e6, rate: 12, years: 1, freq: 1 }).value, 112e6);
  assert.equal(compound({ initial: 100e6, rate: 12, years: 1, freq: 12 }).value, 112682503);
  const c = compound({ initial: 0, monthly: 1e6, rate: 0, years: 2 });
  assert.equal(c.value, 24e6);
  assert.equal(c.rows.length, 3);
});
