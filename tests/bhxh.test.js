import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lumpSum, parseMonth } from "../assets/lib/bhxh.js";

const D = JSON.parse(readFileSync(new URL("../data/bhxh.json", import.meta.url)));

test("đọc tháng", () => {
  assert.deepEqual(parseMonth("06/2015"), { y: 2015, m: 6 });
  assert.deepEqual(parseMonth("2015-06"), { y: 2015, m: 6 });
  assert.equal(parseMonth("13/2015"), null);
});

test("BHXH một lần: 10 năm, có giai đoạn trước 2014", () => {
  const r = lumpSum([{ from: "01/2010", to: "12/2019", salary: 10e6 }], D);
  assert.equal(r.months, 120);
  assert.equal(r.yearsBefore, 4);
  assert.equal(r.yearsAfter, 6);
  assert.equal(r.average, 14290000);
  assert.equal(r.amount, 257220000);
});

test("tháng lẻ trước 2014 chuyển sang sau 2014, làm tròn nửa năm/một năm", () => {
  const r = lumpSum([{ from: "07/2013", to: "02/2015", salary: 8e6 }], D);
  assert.equal(r.yearsBefore, 0);
  assert.equal(r.yearsAfter, 2);   // 20 tháng = 1 năm 8 tháng → 2 năm
  const r2 = lumpSum([{ from: "01/2020", to: "03/2021", salary: 8e6 }], D);
  assert.equal(r2.yearsAfter, 1.5); // 15 tháng = 1 năm 3 tháng → 1,5 năm
});

test("chưa đủ 1 năm: bằng số đã đóng (22%), tối đa 2 tháng", () => {
  const r = lumpSum([{ from: "01/2025", to: "06/2025", salary: 10e6 }], D);
  assert.ok(r.under1);
  assert.equal(r.amount, 13.2e6);
});

test("báo lỗi dòng nhập sai", () => {
  assert.equal(lumpSum([{ from: "05/2020", to: "01/2020", salary: 1 }], D).errors.length, 1);
});
