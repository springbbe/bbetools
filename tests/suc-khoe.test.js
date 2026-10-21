import { test } from "node:test";
import assert from "node:assert/strict";
import { bmi, bmiClass, healthyRange, bmr, tdee, dueFromLmp, gestation, BMI_WHO } from "../assets/lib/suc-khoe.js";

test("BMI theo chuẩn châu Á", () => {
  const v = bmi(70, 170);
  assert.equal(v.toFixed(2), "24.22");
  assert.equal(bmiClass(v).label, "Thừa cân");
  assert.equal(bmiClass(v, BMI_WHO).label, "Bình thường");
  assert.equal(bmiClass(18.4).label, "Thiếu cân");
  assert.equal(bmiClass(22.9).label, "Bình thường");
  const r = healthyRange(170);
  assert.equal(r.min.toFixed(1), "53.5");
  assert.equal(r.max.toFixed(1), "66.5");
});

test("BMR, TDEE", () => {
  assert.equal(bmr("m", 70, 170, 30), 1617.5);
  assert.equal(bmr("f", 55, 160, 25), 1264);
  const t = tdee("m", 70, 170, 30, 1.55);
  assert.equal(Math.round(t.tdee), 2507);
  assert.equal(Math.round(t.goals.find((g) => g[0] === -0.5)[1]), 1957);
});

test("ngày dự sinh và tuổi thai", () => {
  const lmp = 20454; // số ngày bất kỳ
  assert.equal(dueFromLmp(lmp), lmp + 280);
  assert.equal(dueFromLmp(lmp, 32), lmp + 284);
  const g = gestation(lmp + 280, lmp + 100);
  assert.deepEqual([g.weeks, g.days, g.trimester], [14, 2, 2]);
});
