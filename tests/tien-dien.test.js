import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { electricityBill, kwhForAmount } from "../assets/lib/tien-dien.js";

const D = JSON.parse(readFileSync(new URL("../data/gia-dien.json", import.meta.url)));

test("tiền điện bậc thang", () => {
  const b = electricityBill(150, D.tiers, { vat: 0.08 });
  assert.equal(b.subtotal, 304550);
  assert.equal(b.vat, 24364);
  assert.equal(b.total, 328914);
  assert.equal(electricityBill(750, D.tiers).subtotal, 190100 + 228900 + 578800 + 1036800 + 192200);
  assert.equal(electricityBill(0, D.tiers).total, 0);
});

test("nhiều hộ chung công tơ và kỳ không tròn tháng", () => {
  assert.equal(electricityBill(150, D.tiers, { households: 2 }).subtotal, 150 * 1901);
  const r = electricityBill(120, D.tiers, { days: 15, monthDays: 30 });
  assert.equal(r.rows[0].kwh, 50);
  assert.equal(r.rows[1].kwh, 50);
  assert.equal(r.rows[2].kwh, 20);
});

test("từ số tiền ra số kWh", () => {
  assert.equal(kwhForAmount(328914, D.tiers, { vat: 0.08 }), 150);
  assert.equal(kwhForAmount(328913, D.tiers, { vat: 0.08 }), 149);
});
