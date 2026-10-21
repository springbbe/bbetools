import { test } from "node:test";
import assert from "node:assert/strict";
import { solarToLunar, lunarToSolar, leapMonthOf, canChiYear, canChiDay, jdFromDate, dayInfo, lunarMonthLength } from "../assets/lib/am-lich.js";

test("Tết Nguyên Đán các năm", () => {
  const tet = { 2020: [25, 1], 2023: [22, 1], 2024: [10, 2], 2025: [29, 1], 2026: [17, 2], 2027: [6, 2] };
  for (const [y, [d, m]] of Object.entries(tet)) {
    assert.deepEqual(solarToLunar(d, m, +y), { day: 1, month: 1, year: +y, leap: false }, "Tết " + y);
    assert.deepEqual(lunarToSolar(1, 1, +y), { day: d, month: m, year: +y });
  }
});

test("Tết 1985 và 2007: lịch Việt Nam khác lịch Trung Quốc", () => {
  assert.deepEqual(lunarToSolar(1, 1, 1985), { day: 21, month: 1, year: 1985 });
  assert.deepEqual(lunarToSolar(1, 1, 2007), { day: 17, month: 2, year: 2007 });
});

test("tháng nhuận", () => {
  assert.equal(leapMonthOf(2020), 4);
  assert.equal(leapMonthOf(2023), 2);
  assert.equal(leapMonthOf(2025), 6);
  assert.equal(leapMonthOf(2024), 0);
  assert.deepEqual(solarToLunar(22, 3, 2023), { day: 1, month: 2, year: 2023, leap: true });
  assert.deepEqual(lunarToSolar(1, 6, 2025, true), { day: 25, month: 7, year: 2025 });
  assert.equal(lunarToSolar(1, 5, 2025, true), null, "2025 không nhuận tháng 5");
});

test("đổi qua lại khớp nhau trong nhiều năm", () => {
  for (let jd = jdFromDate(1, 1, 1900); jd < jdFromDate(1, 1, 2100); jd += 7) {
    const d = new Date(Date.UTC(1900, 0, 1) + (jd - jdFromDate(1, 1, 1900)) * 864e5);
    const [dd, mm, yy] = [d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear()];
    const l = solarToLunar(dd, mm, yy);
    assert.deepEqual(lunarToSolar(l.day, l.month, l.year, l.leap), { day: dd, month: mm, year: yy });
  }
});

test("can chi", () => {
  assert.equal(canChiYear(2024), "Giáp Thìn");
  assert.equal(canChiYear(2025), "Ất Tỵ");
  assert.equal(canChiYear(2026), "Bính Ngọ");
  assert.equal(canChiYear(1990), "Canh Ngọ");
  // 1/1/2000 là ngày Mậu Ngọ
  assert.equal(canChiDay(jdFromDate(1, 1, 2000)), "Mậu Ngọ");
});

test("thông tin ngày", () => {
  const i = dayInfo(2, 9, 2025);
  assert.equal(i.weekday, "Thứ ba");
  assert.equal(i.lunar.month, 7);
  assert.equal(i.lunar.day, 11);
  assert.equal(i.gioHoangDao.length, 6);
  assert.ok([29, 30].includes(lunarMonthLength(17, 2, 2026)));
  assert.equal(lunarToSolar(30, 1, 2026) === null || lunarMonthLength(17, 2, 2026) === 30, true);
});
