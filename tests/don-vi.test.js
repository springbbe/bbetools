import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, fmtUnit, parseNum } from "../assets/lib/don-vi.js";

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)), `${a} ≈ ${b}`);

test("đổi đơn vị", () => {
  near(convert("length", 1, "in", "cm"), 2.54);
  near(convert("length", 1, "mi", "km"), 1.609344);
  near(convert("mass", 1, "lb", "g"), 453.59237);
  near(convert("mass", 1, "luong", "chi"), 10);
  near(convert("temp", 100, "C", "F"), 212);
  near(convert("temp", 0, "K", "C"), -273.15);
  near(convert("temp", -40, "F", "C"), -40);
  near(convert("data", 1, "GiB", "B"), 1073741824);
  near(convert("speed", 36, "kmh", "ms"), 10);
  near(convert("energy", 1, "kWh", "kcal"), 860.4206500956);
  assert.ok(Number.isNaN(convert("length", "abc", "m", "km")));
});

test("đọc và hiển thị số", () => {
  assert.equal(parseNum("1.234,5"), 1234.5);
  assert.equal(parseNum("12,5"), 12.5);
  assert.equal(parseNum("1.500"), 1500);
  assert.equal(parseNum("0.254"), 0.254);
  assert.equal(parseNum("1,234.5"), 1234.5);
  assert.equal(parseNum("1.5"), 1.5);
  assert.equal(parseNum("-3"), -3);
  assert.ok(Number.isNaN(parseNum("1,2,a")));
  assert.equal(fmtUnit(1234.5), "1.234,5");
  assert.equal(fmtUnit(0.1 + 0.2), "0,3");
  assert.equal(fmtUnit(-0.000123), "-0,000123");
  assert.equal(fmtUnit(1e20), "1e+20");
});
