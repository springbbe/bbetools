import { test } from "node:test";
import assert from "node:assert/strict";
import { percentOf, whatPercent, change, applyChange, baseFromPart, parseChain, discountChain, vat } from "../assets/lib/phan-tram.js";

test("phần trăm", () => {
  assert.equal(percentOf(15, 200), 30);
  assert.equal(whatPercent(30, 200), 15);
  assert.equal(change(80, 100), 25);
  assert.equal(change(100, 80), -20);
  assert.equal(applyChange(200, -10), 180);
  assert.equal(baseFromPart(30, 15), 200);
  assert.ok(Number.isNaN(whatPercent(1, 0)));
});

test("giảm giá nhiều lần", () => {
  assert.deepEqual(parseChain("20+10"), [20, 10]);
  assert.deepEqual(parseChain("50% + 12,5%"), [50, 12.5]);
  const r = discountChain(100, [20, 10]);
  assert.equal(r.price, 72);
  assert.equal(r.totalPct.toFixed(6), "28.000000");
});

test("VAT xuôi và ngược", () => {
  assert.deepEqual(vat(1e6, 8), { net: 1e6, tax: 80000, gross: 1080000 });
  assert.deepEqual(vat(1080000, 8, "remove"), { net: 1e6, tax: 80000, gross: 1080000 });
  assert.deepEqual(vat(1100000, 10, "remove"), { net: 1e6, tax: 100000, gross: 1100000 });
});
