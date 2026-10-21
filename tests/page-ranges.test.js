import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRanges, toRanges, chunkPages, halves, rangeSlug } from "../assets/lib/page-ranges.js";

test("đọc khoảng trang", () => {
  assert.deepEqual(parseRanges("1-3, 5, 8-", 10), { pages: [1, 2, 3, 5, 8, 9, 10], groups: [[1, 2, 3], [5], [8, 9, 10]], bad: false });
  assert.deepEqual(parseRanges("-2", 5).pages, [1, 2]);
  assert.deepEqual(parseRanges("1 - 3", 5).groups, [[1, 2, 3]]);
  assert.deepEqual(parseRanges("1 3 5", 5).groups, [[1], [3], [5]]);
  assert.deepEqual(parseRanges("5-2", 5).groups, [[2, 3, 4, 5]]);
  assert.deepEqual(parseRanges("2–4; 4", 5).pages, [2, 3, 4]);
  assert.deepEqual(parseRanges("", 5), { pages: [], groups: [], bad: false });
});

test("khoảng sai hoặc vượt số trang bị đánh dấu", () => {
  const r = parseRanges("3-9", 5);
  assert.equal(r.bad, true);
  assert.deepEqual(r.pages, [3, 4, 5]);
  assert.equal(parseRanges("abc", 5).bad, true);
  assert.equal(parseRanges("0", 5).bad, true);
  assert.deepEqual(parseRanges("7-9", 5).groups, []);
});

test("viết lại thành khoảng", () => {
  assert.equal(toRanges([5, 1, 2, 3, 9, 8, 3]), "1-3, 5, 8-9");
  assert.equal(toRanges([]), "");
  assert.equal(rangeSlug([1, 2, 3, 7]), "1-3_7");
  assert.equal(toRanges(parseRanges("8-, 1-2", 10).pages), "1-2, 8-10");
});

test("chia đều và chia đôi", () => {
  assert.deepEqual(chunkPages(7, 3), [[1, 2, 3], [4, 5, 6], [7]]);
  assert.deepEqual(chunkPages(2, 0), [[1], [2]]);
  assert.equal(halves(8), "1-4, 5-8");
  assert.equal(halves(3), "1-2, 3");
  assert.equal(halves(2), "1, 2");
  assert.equal(halves(1), "1");
});
