import { test } from "node:test";
import assert from "node:assert/strict";
import { yearInfo, lunarYearOf, tuoiMu, sameChiYears } from "../assets/lib/con-giap.js";

test("can chi và nạp âm", () => {
  const a = yearInfo(1984);
  assert.equal(a.canChi, "Giáp Tý");
  assert.equal(a.conGiap, "Chuột");
  assert.equal(a.napAm, "Hải Trung Kim");
  assert.equal(a.hanh, "Kim");
  assert.deepEqual(a.tamHop, ["Thân", "Thìn"]);
  assert.deepEqual(a.tuXung, ["Ngọ", "Mão", "Dậu"]);
  assert.equal(yearInfo(2000).napAm, "Bạch Lạp Kim");
  assert.equal(yearInfo(1990).napAm, "Lộ Bàng Thổ");
  assert.equal(yearInfo(2026).canChi, "Bính Ngọ");
  assert.equal(yearInfo(2026).napAm, "Thiên Hà Thủy");
  assert.equal(yearInfo(1983).napAm, "Đại Hải Thủy");
  assert.equal(yearInfo(1984).sinhRa, "Thủy");
  assert.equal(yearInfo(1984).biKhac, "Hỏa");
});

test("sinh trước Tết thuộc năm âm trước", () => {
  assert.equal(lunarYearOf(20, 1, 1990), 1989);
  assert.equal(lunarYearOf(1, 2, 1990), 1990);
  assert.equal(tuoiMu(1990, 2026), 37);
  assert.deepEqual(sameChiYears(0, 1980, 2010), [1984, 1996, 2008]);
});
