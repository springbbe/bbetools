import { test } from "node:test";
import assert from "node:assert/strict";
import { uuidV4, uuidV7, formatUuid, generate, inspectUuid } from "../assets/lib/uuid.js";

const rnd = (n) => Uint8Array.from({ length: n }, (_, i) => (i * 73 + 41) & 255);

test("v4, v7 đúng phiên bản và biến thể", () => {
  const v4 = formatUuid(uuidV4(rnd(16)));
  assert.match(v4, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const ms = Date.UTC(2026, 9, 21, 7, 30);
  const v7 = formatUuid(uuidV7(ms, rnd(16)));
  assert.match(v7, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(inspectUuid(v7).time.getTime(), ms);
  assert.equal(formatUuid(uuidV4(rnd(16)), { upper: true, hyphens: false, braces: true }).length, 34);
});

test("v7 tạo hàng loạt vẫn tăng dần", () => {
  const list = generate(5000, "v7", rnd, () => 1760000000000).map((b) => formatUuid(b));
  for (let i = 1; i < list.length; i++) assert.ok(list[i] > list[i - 1], i);
  assert.equal(new Set(generate(100, "v4", () => crypto.getRandomValues(new Uint8Array(16))).map((b) => formatUuid(b))).size, 100);
});

test("đọc UUID", () => {
  assert.deepEqual(inspectUuid("not-a-uuid"), { ok: false });
  assert.equal(inspectUuid("{550E8400-E29B-41D4-A716-446655440000}").version, 4);
  assert.equal(inspectUuid("00000000-0000-0000-0000-000000000000").variant, "nil");
  const v1 = inspectUuid("c232ab00-9414-11ec-b3c8-9e6bdeced846");
  assert.equal(v1.version, 1);
  assert.equal(v1.time.toISOString(), "2022-02-22T19:22:22.000Z");
});
