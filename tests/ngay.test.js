import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDate, diffYMD, addMonths, addDays, iso, holidaysOfYear, countWorkdays, addWorkdays, toDays, fromDays } from "../assets/lib/ngay.js";

const LE = JSON.parse(readFileSync(new URL("../data/ngay-le.json", import.meta.url)));
const P = parseDate;

test("đọc ngày", () => {
  assert.deepEqual(P("2024-02-29"), { y: 2024, m: 2, d: 29 });
  assert.equal(P("2023-02-29"), null);
  assert.equal(iso(fromDays(toDays(P("2026-10-21")))), "2026-10-21");
});

test("khoảng cách năm tháng ngày", () => {
  assert.deepEqual(diffYMD(P("1990-05-15"), P("2026-10-21")), { years: 36, months: 5, days: 6, sign: 1, totalMonths: 437 });
  const a = diffYMD(P("2000-01-31"), P("2000-03-01"));
  assert.deepEqual([a.months, a.days], [1, 1]);
  assert.equal(diffYMD(P("2026-10-21"), P("2026-10-01")).sign, -1);
  assert.deepEqual(addMonths(P("2024-01-31"), 1), { y: 2024, m: 2, d: 29 });
  assert.equal(iso(addDays(P("2026-12-31"), 1)), "2027-01-01");
});

test("ngày lễ năm 2026", () => {
  const h = holidaysOfYear(2026, LE);
  const has = (s) => h.has(toDays(P(s)));
  for (const d of ["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-20", "2026-04-26", "2026-04-30", "2026-05-01", "2026-09-01", "2026-09-02", "2026-11-24"]) assert.ok(has(d), d);
  assert.ok(!has("2026-02-21"));
  assert.ok(!holidaysOfYear(2025, LE).has(toDays(P("2025-11-24"))));
  const c = holidaysOfYear(2026, LE, { compensate: true, weekend: [0, 6] });
  assert.match(c.get(toDays(P("2026-04-27"))), /Nghỉ bù/); // Giỗ Tổ 26/4/2026 là Chủ nhật
});

test("đếm và cộng ngày làm việc", () => {
  const r = countWorkdays(P("2026-01-01"), P("2026-01-31"), { holidays: LE });
  assert.deepEqual([r.work, r.weekend, r.holiday], [21, 9, 1]);
  assert.equal(countWorkdays(P("2026-01-01"), P("2026-01-31")).work, 22);
  assert.equal(iso(addWorkdays(P("2026-02-13"), 1, { holidays: LE })), "2026-02-23");
  assert.equal(iso(addWorkdays(P("2026-02-23"), -1, { holidays: LE })), "2026-02-13");
  assert.equal(iso(addWorkdays(P("2026-10-23"), 1)), "2026-10-26");
});
