import { test } from "node:test";
import assert from "node:assert/strict";
import { settle, minTransfers } from "../assets/lib/chia-tien.js";

test("chia đều và chia cho một số người", () => {
  const r = settle(["An", "Bình", "Chi"], [{ payer: 0, amount: 300000 }, { payer: 1, amount: 60000, among: [1, 2] }]);
  assert.deepEqual(r.share, [100000, 130000, 130000]);
  assert.deepEqual(r.balance, [200000, -70000, -130000]);
  assert.equal(r.total, 360000);
  assert.deepEqual(r.transfers, [{ from: 2, to: 0, amount: 130000 }, { from: 1, to: 0, amount: 70000 }]);
});

test("chia lẻ không mất đồng nào", () => {
  const r = settle(["A", "B", "C"], [{ payer: 0, amount: 100 }]);
  assert.deepEqual(r.share, [34, 33, 33]);
  assert.equal(r.balance.reduce((a, b) => a + b, 0), 0);
});

test("chia theo phần", () => {
  const r = settle(["A", "B"], [{ payer: 0, amount: 300, weights: { 0: 1, 1: 2 } }]);
  assert.deepEqual(r.share, [100, 200]);
});

test("số lần chuyển không quá n − 1", () => {
  const t = minTransfers([50, 30, -20, -20, -40]);
  assert.ok(t.length <= 4);
  const net = [0, 0, 0, 0, 0];
  for (const x of t) { net[x.from] += x.amount; net[x.to] -= x.amount; }
  assert.deepEqual(net, [-50, -30, 20, 20, 40]);
  assert.deepEqual(minTransfers([1500, -1500], 1000), [{ from: 1, to: 0, amount: 2000 }]);
});
