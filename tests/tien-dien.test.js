import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { electricityBill, kwhForAmount } from "../assets/lib/tien-dien.js";

const D = JSON.parse(readFileSync(new URL("../data/gia-dien.json", import.meta.url)));

test("tiền điện bậc thang", () => {
  const b = electricityBill(150, D.tiers, { vat: 0.08 });
  assert.equal(b.subtotal, 320700);
  assert.equal(b.vat, 25656);
  assert.equal(b.total, 346356);
  assert.equal(electricityBill(450, D.tiers).subtotal, 99200 + 102500 + 238000 + 299800 + 335000 + 173000);
  assert.equal(electricityBill(0, D.tiers).total, 0);
});

test("nhiều hộ chung công tơ và kỳ không tròn tháng", () => {
  assert.equal(electricityBill(150, D.tiers, { households: 2 }).subtotal, 100 * 1984 + 50 * 2050);
  const r = electricityBill(60, D.tiers, { days: 15, monthDays: 30 });
  assert.equal(r.rows[0].kwh, 25);
  assert.equal(r.rows[1].kwh, 25);
});

test("từ số tiền ra số kWh", () => {
  assert.equal(kwhForAmount(346356, D.tiers, { vat: 0.08 }), 150);
  assert.equal(kwhForAmount(346355, D.tiers, { vat: 0.08 }), 149);
});
