import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { progressiveTax, grossToNet, netToGross, insurance, yearlyBrackets } from "../assets/lib/tien-luong.js";

const TAX = JSON.parse(readFileSync(new URL("../data/thue-tncn.json", import.meta.url)));
const BH = JSON.parse(readFileSync(new URL("../data/bhxh.json", import.meta.url)));
const VUNG = JSON.parse(readFileSync(new URL("../data/luong-toi-thieu-vung.json", import.meta.url)));
const opts = (o = {}) => ({
  ins: { baseSalary: BH.baseSalary, capMultiple: BH.capMultiple, minWage: VUNG.regions["1"], rates: BH.employee, employerRates: BH.employer },
  tax: { personal: TAX.personal, dependent: TAX.dependent, brackets: TAX.brackets }, dependents: 0, ...o
});

test("biểu thuế 5 bậc 2026", () => {
  assert.equal(progressiveTax(0, TAX.brackets).tax, 0);
  assert.equal(progressiveTax(10e6, TAX.brackets).tax, 500000);
  assert.equal(progressiveTax(11.5e6, TAX.brackets).tax, 650000); // ví dụ: lương 30 tr, BH 3 tr, không người phụ thuộc
  assert.equal(progressiveTax(100e6, TAX.brackets).tax, 500000 + 2e6 + 6e6 + 12e6);
  assert.equal(progressiveTax(120e6, TAX.brackets).tax, 20.5e6 + 7e6);
  assert.equal(progressiveTax(120e6 * 12, yearlyBrackets(TAX.brackets)).tax, 27.5e6 * 12);
});

test("bảo hiểm có trần 20 lần lương cơ sở và lương tối thiểu vùng", () => {
  const i = insurance(30e6, opts().ins);
  assert.deepEqual([i.bhxh, i.bhyt, i.bhtn, i.total], [2400000, 450000, 300000, 3150000]);
  const big = insurance(200e6, opts().ins);
  assert.equal(big.bhxh, Math.round(BH.baseSalary * 20 * 0.08));
  assert.equal(big.bhtn, Math.round(VUNG.regions["1"] * 20 * 0.01));
  assert.ok(big.capped);
});

test("gross → net", () => {
  const r = grossToNet(30e6, opts());
  assert.equal(r.ins.total, 3150000);
  assert.equal(r.taxable, 11350000);
  assert.equal(r.tax, 635000);
  assert.equal(r.net, 26215000);
  const r2 = grossToNet(30e6, opts({ dependents: 2 }));
  assert.equal(r2.tax, 0);
  assert.equal(r2.net, 30e6 - 3150000);
  const r3 = grossToNet(100e6, opts());
  assert.equal(r3.ins.total, 4048000 + 759000 + 1000000);
  assert.equal(r3.tax, 14107900);
  assert.equal(r3.net, 100e6 - 5807000 - 14107900);
  assert.equal(grossToNet(20e6, opts({ insBase: 0 })).ins.total, 0);
  assert.equal(grossToNet(20e6, opts({ insBase: 5e6 })).ins.total, 525000);
});

test("net → gross là phép ngược", () => {
  assert.equal(netToGross(26215000, opts()).gross, 30e6);
  for (const g of [8e6, 17345678, 45e6, 123456789]) {
    const n = grossToNet(g, opts({ dependents: 1 })).net;
    const back = netToGross(n, opts({ dependents: 1 }));
    assert.ok(back.net >= n && back.gross <= g, `${g}`);
  }
});
