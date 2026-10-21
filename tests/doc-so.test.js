import { test } from "node:test";
import assert from "node:assert/strict";
import { readNumber, parseNumber, readIntegerDigits, formatVN } from "../assets/lib/doc-so.js";

const r = (n, o) => readNumber(n, Object.assign({ capitalize: false }, o));

test("số cơ bản", () => {
  assert.equal(r("0"), "không");
  assert.equal(r("5"), "năm");
  assert.equal(r("10"), "mười");
  assert.equal(r("11"), "mười một");
  assert.equal(r("15"), "mười lăm");
  assert.equal(r("21"), "hai mươi mốt");
  assert.equal(r("24"), "hai mươi tư");
  assert.equal(r("24", { four: "bốn" }), "hai mươi bốn");
  assert.equal(r("25"), "hai mươi lăm");
  assert.equal(r("100"), "một trăm");
  assert.equal(r("105"), "một trăm linh năm");
  assert.equal(r("105", { odd: "lẻ" }), "một trăm lẻ năm");
  assert.equal(r("110"), "một trăm mười");
  assert.equal(r("115"), "một trăm mười lăm");
  assert.equal(r("999"), "chín trăm chín mươi chín");
});

test("hàng nghìn, triệu, tỷ", () => {
  assert.equal(r("1000"), "một nghìn");
  assert.equal(r("1000", { thousand: "ngàn" }), "một ngàn");
  assert.equal(r("1005"), "một nghìn không trăm linh năm");
  assert.equal(r("1250000"), "một triệu hai trăm năm mươi nghìn");
  assert.equal(r("1000500"), "một triệu năm trăm");
  assert.equal(r("1000005"), "một triệu không trăm linh năm");
  assert.equal(r("2000000000"), "hai tỷ");
  assert.equal(r("1000000000000"), "một nghìn tỷ");
  assert.equal(r("5000000000001"), "năm nghìn tỷ không trăm linh một");
  assert.equal(r("1000001000000000"), "một triệu không trăm linh một tỷ");
  assert.equal(r("1000000000000000000"), "một tỷ tỷ");
  assert.equal(r("123456789"), "một trăm hai mươi ba triệu bốn trăm năm mươi sáu nghìn bảy trăm tám mươi chín");
});

test("đơn vị tiền và viết hoa", () => {
  assert.equal(readNumber("1.250.000", { unit: "đồng" }), "Một triệu hai trăm năm mươi nghìn đồng");
  assert.equal(readNumber("500000", { unit: "đồng", even: true }), "Năm trăm nghìn đồng chẵn");
  assert.equal(readNumber("-15", {}), "Âm mười lăm");
});

test("thập phân", () => {
  assert.equal(r("12,5"), "mười hai phẩy năm");
  assert.equal(r("3,14"), "ba phẩy mười bốn");
  assert.equal(r("12,05"), "mười hai phẩy không năm");
  assert.equal(r("0,125"), "không phẩy một trăm hai mươi lăm");
});

test("hiểu nhiều kiểu gõ số", () => {
  const p = (s) => formatVN(parseNumber(s));
  assert.equal(p("1.250.000"), "1.250.000");
  assert.equal(p("1,250,000"), "1.250.000");
  assert.equal(p("1 250 000 đ"), "1.250.000");
  assert.equal(p("1.500"), "1.500");
  assert.equal(p("1,500"), "1.500");
  assert.equal(p("1.234,56"), "1.234,56");
  assert.equal(p("1,234.56"), "1.234,56");
  assert.equal(p("12,5"), "12,5");
  assert.equal(p("3.14"), "3,14");
  assert.equal(p("500k"), "500.000");
  assert.equal(p("1,5tr"), "1.500.000");
  assert.equal(p("2 tỷ"), "2.000.000.000");
  assert.equal(p("1.2 triệu"), "1.200.000");
  assert.equal(p("100 VNĐ"), "100");
  assert.equal(parseNumber("abc"), null);
  assert.equal(parseNumber("1.2.3"), null);
  assert.equal(parseNumber(""), null);
});

test("số rất dài không sai số", () => {
  assert.equal(readIntegerDigits("000123"), "một trăm hai mươi ba");
  assert.ok(readIntegerDigits("9".repeat(40)).startsWith("chín"));
});
