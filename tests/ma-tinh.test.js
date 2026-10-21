import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTables, parseCccd, parsePlate, detect } from "../assets/lib/ma-tinh.js";

const T = buildTables(JSON.parse(readFileSync(new URL("../data/ma-tinh.json", import.meta.url))));

test("đọc số CCCD", () => {
  const a = parseCccd("001 2 03 012345", T);
  assert.ok(a.ok);
  assert.equal(a.rec.old.name, "Thành phố Hà Nội");
  assert.deepEqual([a.gender, a.year], ["Nam", 2003]);
  const b = parseCccd("079190000001", T);
  assert.deepEqual([b.rec.now.name, b.gender, b.year], ["Thành phố Hồ Chí Minh", "Nữ", 1990]);
  const c = parseCccd("002085000001", T);
  assert.equal(c.rec.old.name, "Tỉnh Hà Giang");
  assert.equal(c.rec.now.name, "Tỉnh Tuyên Quang");
  assert.equal(parseCccd("123456789", T).ok, false);
  assert.equal(parseCccd("099190000001", T).ok, false);
});

test("đọc biển số", () => {
  assert.equal(parsePlate("30A-123.45", T).rec.old.name, "Thành phố Hà Nội");
  const b = parsePlate("61A 999.99", T);
  assert.equal(b.rec.old.name, "Tỉnh Bình Dương");
  assert.equal(b.rec.now.name, "Thành phố Hồ Chí Minh");
  assert.equal(parsePlate("59-X1 234.56", T).rec.now.name, "Thành phố Hồ Chí Minh");
  assert.equal(parsePlate("80NG-123", T).series, "NG");
  assert.ok(parsePlate("80B-12345", T).special);
  assert.equal(parsePlate("13A", T).ok, false);
  assert.equal(parsePlate("abc", T).ok, false);
});

test("mỗi tỉnh mới có ký hiệu biển số và đủ 63 tỉnh cũ", () => {
  const D = JSON.parse(readFileSync(new URL("../data/ma-tinh.json", import.meta.url)));
  assert.equal(D.oldProvinces.length, 63);
  for (const p of D.provinces) assert.ok(D.oldProvinces.some((o) => o.now === p.code && o.plates.length), p.name);
  assert.equal(detect("001203012345"), "cccd");
  assert.equal(detect("30A-12345"), "plate");
});
