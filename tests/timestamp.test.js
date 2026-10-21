import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInput, formatVN, isoAt, relative, dayOfYear } from "../assets/lib/timestamp.js";

test("đọc timestamp nhiều đơn vị", () => {
  assert.deepEqual(parseInput("1767225600"), { ms: 1767225600000, unit: "s" });
  assert.deepEqual(parseInput("1767225600123"), { ms: 1767225600123, unit: "ms" });
  assert.deepEqual(parseInput("1767225600123456"), { ms: 1767225600123, unit: "us" });
  assert.deepEqual(parseInput("1767225600123456789"), { ms: 1767225600123, unit: "ns" });
  assert.equal(parseInput("1.5").ms, 1500);
  assert.equal(parseInput("-86400").ms, -86400000);
});

test("đọc ngày giờ", () => {
  assert.equal(parseInput("01/01/2026 07:00").ms, Date.UTC(2026, 0, 1, 0, 0));
  assert.equal(parseInput("2026-01-01").ms, Date.UTC(2025, 11, 31, 17));
  assert.equal(parseInput("2026-01-01", 0).ms, Date.UTC(2026, 0, 1));
  assert.equal(parseInput("2026-01-01T00:00:00Z").ms, Date.UTC(2026, 0, 1));
  assert.ok(parseInput("31/02/2026 25:00").error);
  assert.ok(parseInput("hôm qua").error);
});

test("định dạng", () => {
  const ms = Date.UTC(2026, 9, 21, 7, 30, 5);
  assert.equal(formatVN(ms), "Thứ Tư, 21/10/2026 14:30:05");
  assert.equal(isoAt(ms, 420), "2026-10-21T14:30:05+07:00");
  assert.equal(isoAt(ms, 0), "2026-10-21T07:30:05Z");
  assert.equal(relative(ms - 3 * 86400000, ms), "3 ngày trước");
  assert.equal(relative(ms + 7200000, ms), "2 giờ nữa");
  assert.equal(relative(ms, ms), "ngay bây giờ");
  assert.deepEqual(dayOfYear(ms, 420), { doy: 294, week: 43 });
  assert.deepEqual(dayOfYear(Date.UTC(2027, 0, 1), 0), { doy: 1, week: 53 });
});
