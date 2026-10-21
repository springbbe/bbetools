import { test } from "node:test";
import assert from "node:assert/strict";
import { convertCase, removeAccents, slugify, processLines, findReplace, expandReplacement } from "../assets/lib/van-ban.js";

test("đổi chữ hoa/thường đúng tiếng Việt", () => {
  assert.equal(convertCase("đường phố hà nội", "upper"), "ĐƯỜNG PHỐ HÀ NỘI");
  assert.equal(convertCase("ĐƯỜNG PHỐ", "lower"), "đường phố");
  assert.equal(convertCase("chào bạn ĐẾN với việt nam", "title"), "Chào Bạn Đến Với Việt Nam");
  assert.equal(convertCase("xin chào. tôi là AN! bạn khỏe không?\nđây là dòng mới", "sentence"), "Xin chào. Tôi là an! Bạn khỏe không?\nĐây là dòng mới");
  assert.equal(convertCase("Việt Nam", "toggle"), "vIỆT nAM");
  assert.equal(convertCase("Tên người dùng", "camel"), "tenNguoiDung");
  assert.equal(convertCase("tên người dùng", "pascal"), "TenNguoiDung");
  assert.equal(convertCase("Số điện thoại", "snake"), "so_dien_thoai");
  assert.equal(convertCase("số điện thoại", "constant"), "SO_DIEN_THOAI");
  assert.equal(convertCase("userName HTMLParser", "kebab"), "user-name-html-parser");
});

test("bỏ dấu", () => {
  assert.equal(removeAccents("Đường Trường Sơn, Việt Nam"), "Duong Truong Son, Viet Nam");
  assert.equal(removeAccents("đã đi", { keepD: true }), "đa đi");
  assert.equal(removeAccents("Tiếng Việt tổ hợp".normalize("NFD")), "Tieng Viet to hop");
});

test("slug", () => {
  assert.equal(slugify("Hướng dẫn: Cài đặt Node.js 22!"), "huong-dan-cai-dat-node-js-22");
  assert.equal(slugify("Đổi Mã Màu", { sep: "_" }), "doi_ma_mau");
  assert.equal(slugify("Đổi Mã Màu", { lower: false }), "Doi-Ma-Mau");
  assert.equal(slugify("một hai ba bốn năm sáu", { max: 12 }), "mot-hai-ba");
  assert.equal(slugify("  --  "), "");
});

test("lọc dòng trùng và sắp xếp theo tiếng Việt", () => {
  const r = processLines("chuối\nAn\nan\n\nđào\nbưởi\nchuối\n", { dedupe: true, removeEmpty: true, ignoreCase: true, sort: "az" });
  assert.equal(r.text, "An\nbưởi\nchuối\nđào");
  assert.equal(r.dup, 2); assert.equal(r.empty, 2); assert.equal(r.kept, 4);
  assert.equal(processLines("file10\nfile2\nfile1", { sort: "az" }).text, "file1\nfile2\nfile10");
  assert.equal(processLines("a\nb\nc", { sort: "reverse" }).text, "c\nb\na");
  assert.equal(processLines("ccc\na\nbb", { sort: "len" }).text, "a\nbb\nccc");
  let k = 0; const seq = [0.1, 0.9, 0.5];
  assert.equal(processLines("1\n2\n3", { sort: "shuffle", random: () => seq[k++] }).text.split("\n").sort().join(","), "1,2,3");
});

test("tìm và thay thế", () => {
  assert.equal(findReplace("Táo, táo và TÁO", "táo", "lê").text, "lê, lê và lê");
  assert.equal(findReplace("Táo, táo", "táo", "lê", { caseSensitive: true }).count, 1);
  assert.equal(findReplace("an anh an", "an", "X", { wholeWord: true }).text, "X anh X");
  assert.equal(findReplace("an ăn", "an", "X", { wholeWord: true }).text, "X ăn");
  assert.equal(findReplace("2026-10-21", "(\\d+)-(\\d+)-(\\d+)", "$3/$2/$1", { regex: true }).text, "21/10/2026");
  assert.equal(findReplace("a,b", ",", "\\n", { regex: true }).text, "a\nb");
  assert.equal(findReplace("a.b", ".", "-").text, "a-b");
  assert.equal(findReplace("xy", "(?<k>x)", "[$<k>]", { regex: true }).text, "[x]y");
  assert.equal(findReplace("dòng 1\ndòng 2", "^", "- ", { regex: true }).text, "- dòng 1\n- dòng 2");
  const r = findReplace("ab ab", "b", "c");
  assert.deepEqual(r.parts, [["a", "c"], [" a", "c"], [""]]);
  assert.equal(expandReplacement("$$ $& $1 $9", Object.assign(["ab", "a"], { index: 0 }), "ab"), "$ ab a $9");
});
