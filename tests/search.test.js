import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fold, slugify, prepare, search, editDistance } from "../assets/lib/search.js";

const reg = JSON.parse(readFileSync(new URL("../tools.json", import.meta.url)));
const index = prepare(reg.tools, reg.groups);
const top = (q, n = 1) => search(index, q).slice(0, n).map((t) => t.id);

test("bỏ dấu", () => {
  assert.equal(fold("Ghép PDF – Đặt mật khẩu!"), "ghep pdf dat mat khau");
  assert.equal(slugify("Đọc số thành chữ"), "doc-so-thanh-chu");
  assert.equal(editDistance("pfd", "pdf"), 1);
  assert.equal(editDistance("ghep", "ghep"), 0);
});

test("tìm đúng công cụ dù gõ không dấu hoặc từ đồng nghĩa", () => {
  assert.deepEqual(top("ghep pdf"), ["merge-pdf"]);
  assert.deepEqual(top("ghép PDF"), ["merge-pdf"]);
  assert.deepEqual(top("gop pdf"), ["merge-pdf"]);
  assert.deepEqual(top("noi pdf"), ["merge-pdf"]);
  assert.deepEqual(top("merge"), ["merge-pdf"]);
  assert.deepEqual(top("nen anh"), ["compress-image"]);
  assert.deepEqual(top("nén ảnh"), ["compress-image"]);
  assert.deepEqual(top("heic"), ["heic-to-jpg"]);
  assert.deepEqual(top("nen pdf"), ["compress-pdf"]);
  assert.deepEqual(top("vietqr"), ["vietqr"]);
  assert.deepEqual(top("so tien bang chu"), ["number-to-words"]);
  assert.deepEqual(top("lich am"), ["lunar-calendar"]);
  assert.deepEqual(top("anh the"), ["id-photo"]);
  assert.deepEqual(top("json"), ["json-formatter"]);
  assert.deepEqual(top("dem tu"), ["word-counter"]);
  assert.deepEqual(top("pomodoro"), ["pomodoro"]);
  assert.deepEqual(top("tao qr"), ["qr-generator"]);
  assert.deepEqual(top("quet qr"), ["qr-scanner"]);
});

test("chịu được lỗi gõ", () => {
  assert.deepEqual(top("ghep pfd"), ["merge-pdf"]);
  assert.deepEqual(top("pomodor"), ["pomodoro"]);
  assert.ok(top("hiec", 3).includes("heic-to-jpg"));
});

test("không khớp thì trả rỗng", () => {
  assert.deepEqual(search(index, "xyzxyzxyz"), []);
  assert.deepEqual(search(index, ""), []);
});
