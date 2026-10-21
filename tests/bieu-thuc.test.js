import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, formatResult, CalcError } from "../assets/lib/bieu-thuc.js";

const E = (s, o) => evaluate(s, o);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} ≈ ${b}`);

test("phép tính cơ bản và thứ tự ưu tiên", () => {
  assert.equal(E("1+2*3"), 7);
  assert.equal(E("2^3^2"), 512);
  assert.equal(E("-2^2"), -4);
  assert.equal(E("(1+2)(3+4)"), 21);
  assert.equal(E("12÷4×3"), 9);
  assert.equal(E("2,5*2"), 5);
  assert.equal(E("2e3"), 2000);
  assert.equal(E("(1+2"), 3);
});

test("hàm, hằng số, nhân ngầm", () => {
  near(E("2π"), 2 * Math.PI);
  assert.equal(E("sin30", { deg: true }), 0.5);
  assert.equal(E("2sin30", { deg: true }), 1);
  near(E("sin(pi/2)"), 1);
  assert.equal(E("cos90", { deg: true }), 0);
  assert.equal(E("√16"), 4);
  assert.equal(E("log100"), 2);
  assert.equal(E("lne"), 1);
  assert.equal(E("5!"), 120);
  assert.equal(E("Ans*2", { ans: 5 }), 10);
  near(E("asin(1)", { deg: true }), 90);
});

test("phần trăm như máy tính bỏ túi", () => {
  assert.equal(E("200+10%"), 220);
  assert.equal(E("200-10%"), 180);
  assert.equal(E("50%*200"), 100);
  assert.equal(E("20%"), 0.2);
});

test("báo lỗi", () => {
  assert.throws(() => E("1/0"), CalcError);
  assert.throws(() => E("2+"), CalcError);
  assert.throws(() => E("1)"), CalcError);
  assert.throws(() => E("abc"), CalcError);
  assert.throws(() => E("√-4"), CalcError);
  assert.throws(() => E("tan90", { deg: true }), CalcError);
});

test("hiển thị kết quả", () => {
  assert.equal(formatResult(E("0,1+0,2")), "0,3");
  assert.equal(formatResult(1 / 3), "0,333333333333");
  assert.equal(formatResult(2 ** 60), "1,15292150461e18");
  assert.equal(formatResult(-0.5, "."), "-0.5");
});
