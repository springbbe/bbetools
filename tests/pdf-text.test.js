import { test } from "node:test";
import assert from "node:assert/strict";
import { itemsToText, joinLines, charCount } from "../assets/lib/pdf-text.js";

const it = (str, x, y, w, extra) => Object.assign({ str, transform: [10, 0, 0, 10, x, y], width: w, height: 10 }, extra);

test("ghép mảnh chữ thành dòng", () => {
  const t = itemsToText([it("Xin", 0, 700, 15), it("chào", 20, 700, 20), it("Dòng hai", 0, 680, 40), it("", 0, 680, 0, { hasEOL: true }), it("Dòng ba", 0, 660, 35)]);
  assert.equal(t, "Xin chào\nDòng hai\nDòng ba");
});

test("không chèn khoảng trắng giữa các mảnh liền nhau", () => {
  assert.equal(itemsToText([it("Việt", 0, 700, 20), it("Nam", 20.5, 700, 18)]), "ViệtNam");
  assert.equal(itemsToText([it("a ", 0, 700, 10), it("b", 15, 700, 5)]), "a b");
});

test("bỏ dòng trống thừa và bỏ qua mảnh lạ", () => {
  assert.equal(itemsToText([it("A", 0, 700, 5, { hasEOL: true }), { type: "beginMarkedContent" }, it("B", 0, 600, 5)]), "A\nB");
});

test("nối dòng bị ngắt giữa câu", () => {
  assert.equal(joinLines("Hôm nay trời\nđẹp quá.\nNgày mai"), "Hôm nay trời đẹp quá.\nNgày mai");
  assert.equal(joinLines("Mục 1:\nnội dung"), "Mục 1:\nnội dung");
  assert.equal(joinLines("Tiêu đề\nĐoạn mới"), "Tiêu đề\nĐoạn mới");
  assert.equal(charCount(" a b\nc "), 3);
});

import { findAll, foldKeep } from "../assets/lib/pdf-text.js";
test("tìm chữ không phân biệt hoa thường, dấu, kể cả khi chữ bị tách mảnh", () => {
  assert.equal(foldKeep("Đường Hồ Hoàn Kiếm"), "duong ho hoan kiem");
  assert.equal(foldKeep("Đường").length, "Đường".length);
  assert.deepEqual(findAll(["Hà Nội và hà nội"], "ha noi"), [[{ item: 0, start: 0, end: 6 }], [{ item: 0, start: 10, end: 16 }]]);
  assert.deepEqual(findAll(["H", "à", " N", "ội"], "Hà Nội"), [[{ item: 0, start: 0, end: 1 }, { item: 1, start: 0, end: 1 }, { item: 2, start: 0, end: 2 }, { item: 3, start: 0, end: 2 }]]);
  assert.deepEqual(findAll(["Hà", "Nội"], "ha noi", [true]), [[{ item: 0, start: 0, end: 2 }, { item: 1, start: 0, end: 3 }]]);
  assert.deepEqual(findAll(["abc"], "  "), []);
  assert.deepEqual(findAll(["Nghỉ phép"], "PHÉP"), [[{ item: 0, start: 5, end: 9 }]]);
});
