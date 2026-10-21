import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRegistry, validate } from "../scripts/registry.js";
import { fold } from "../assets/lib/search.js";

const reg = await loadRegistry();

test("tools.json hợp lệ", () => {
  assert.deepEqual(validate(reg), []);
});

test("mỗi công cụ có từ khoá tìm được theo tên không dấu", () => {
  for (const t of reg.tools) {
    assert.ok(fold(t.name).length > 0, t.id);
    assert.equal(t.slug, t.slug.toLowerCase(), t.id);
  }
});

test("có đủ 11 nhóm và trên 100 công cụ trong registry", () => {
  assert.equal(reg.groups.length, 11);
  assert.ok(reg.tools.length > 100);
});
