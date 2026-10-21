import { test } from "node:test";
import assert from "node:assert/strict";
import { toRoman, fromRoman, convertRoman } from "../assets/lib/so-la-ma.js";

test("số → La Mã", () => {
  assert.equal(toRoman(1994), "MCMXCIV");
  assert.equal(toRoman(3999), "MMMCMXCIX");
  assert.equal(toRoman(4), "IV");
  assert.equal(toRoman(0), null);
  assert.equal(toRoman(5000), "V̅");
  assert.equal(toRoman(4001), "I̅V̅I");
});

test("La Mã → số, chỉ nhận cách viết chuẩn", () => {
  assert.equal(fromRoman("xiv"), 14);
  assert.equal(fromRoman("MMXXVI"), 2026);
  assert.equal(fromRoman("IIII"), null);
  assert.equal(fromRoman("IC"), null);
  assert.equal(fromRoman("VX"), null);
  assert.equal(fromRoman("V̅"), 5000);
  assert.equal(fromRoman("I̅"), null);
});

test("tự nhận chiều đổi", () => {
  assert.deepEqual(convertRoman("2026").roman, "MMXXVI");
  assert.equal(convertRoman("XXI").n, 21);
  assert.equal(convertRoman("hello").kind, "error");
  assert.equal(convertRoman("4.000").roman, "I̅V̅");
});
