/* Trình dịch module JS lúc build (scripts/i18n.js) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compile, keysOf, hasVi, moduleGraph } from "../scripts/i18n.js";

const dict = (o) => (k) => o[k];

test("không có bản dịch thì mã giữ nguyên từng ký tự (mọi module của site)", async () => {
  const files = await moduleGraph(["core.js", "home.js", "notfound.js"]);
  const { readdir } = await import("node:fs/promises");
  const tools = (await readdir(new URL("../assets/tools/", import.meta.url))).map((f) => "tools/" + f);
  for (const rel of [...new Set([...files, ...tools])]) {
    const src = await readFile(new URL("../assets/" + rel, import.meta.url), "utf8");
    assert.equal(compile(src, () => undefined, rel).code, src, rel);
  }
});

test("chuỗi thường, template đổi chỗ biến, số nhiều", () => {
  const src = 'const a = "Xin chào", b = `Đã ghép ${n} file vào ${name}`, c = `Còn ${k} việc`;';
  const r = compile(src, dict({ "Xin chào": "Hello", "Đã ghép {0} file vào {1}": "Merged into {1}: {0} {0|file|files}", "Còn {0} việc": "{0} left" }));
  assert.equal(r.code, 'const a = "Hello", b = `Merged into ${name}: ${n} ${(n) == 1 ? "file" : "files"}`, c = `${k} left`;');
  assert.deepEqual(r.missing, []);
});

test("template lồng nhau và chuỗi trong biểu thức", () => {
  const src = 'x = `Tổng: ${ok ? "Đúng" : `Sai ${n}`}`;';
  const r = compile(src, dict({ "Tổng: {0}": "Total: {0}", "Đúng": "Right", "Sai {0}": "Wrong {0}" }));
  assert.equal(r.code, 'x = `Total: ${ok ? "Right" : `Wrong ${n}`}`;');
});

test("switch/case: chuỗi ở test và consequent ghép đúng thứ tự", () => {
  const src = 'const f = (k) => { switch (k) { case "url": return "Đường link"; case "a": return "b"; } };';
  const r = compile(src, dict({ "Đường link": "Link" }));
  assert.equal(r.code, 'const f = (k) => { switch (k) { case "url": return "Link"; case "a": return "b"; } };');
});

test("báo chuỗi tiếng Việt chưa dịch; không đụng tới đường dẫn import và regex", () => {
  const src = 'import { a } from "./ảnh.js";\nconst r = /đ/g, s = "Chưa dịch", t = "plain";';
  const r = compile(src, () => undefined);
  assert.deepEqual(r.missing, ["Chưa dịch"]);
  assert.deepEqual(keysOf(src).filter(hasVi), ["Chưa dịch"]);
  assert.equal(r.code, src);
});
