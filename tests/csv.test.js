import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, sniffDelimiter, jsonToCsv, csvToJson, flatten, unflatten, inferValue } from "../assets/lib/csv.js";

test("đọc CSV theo RFC 4180", () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","dòng\nmới"\n"có ""nháy"""', ","), [["a", "b"], ["x, y", "dòng\nmới"], ['có "nháy"']]);
  assert.deepEqual(parseCsv("﻿tên;tuổi\r\nAn;30\r\n"), [["tên", "tuổi"], ["An", "30"]]);
  assert.equal(sniffDelimiter("a\tb\tc\n1\t2\t3"), "\t");
  assert.equal(sniffDelimiter("a;b\n1,5;2"), ";");
});

test("JSON ↔ CSV", () => {
  const data = [{ ten: "An", tuoi: 30, diaChi: { tinh: "Hà Nội" }, so: ["090", "091"] }, { ten: "Bình, Minh", tuoi: 25, ghiChu: 'nói "chào"' }];
  const csv = jsonToCsv(data);
  assert.equal(csv, 'ten,tuoi,diaChi.tinh,so,ghiChu\r\nAn,30,Hà Nội,090; 091,\r\n"Bình, Minh",25,,,"nói ""chào"""');
  const back = csvToJson(csv);
  assert.deepEqual(back[0], { ten: "An", tuoi: 30, diaChi: { tinh: "Hà Nội" }, so: "090; 091", ghiChu: "" });
  assert.equal(back[1].ghiChu, 'nói "chào"');
  assert.equal(jsonToCsv({ items: [{ a: 1 }] }), "a\r\n1");
  assert.equal(jsonToCsv([[1, 2], [3, 4]], { delim: ";" }), "1;2\r\n3;4");
  assert.throws(() => jsonToCsv(5), /mảng/);
});

test("đoán kiểu giá trị", () => {
  assert.equal(inferValue("0901234567"), "0901234567");
  assert.equal(inferValue("12.5"), 12.5);
  assert.equal(inferValue("0"), 0);
  assert.equal(inferValue("TRUE"), true);
  assert.equal(inferValue("null"), null);
  assert.equal(inferValue("12345678901234567890"), "12345678901234567890");
  assert.deepEqual(unflatten(flatten({ a: { b: { c: 1 } }, d: 2 })), { a: { b: { c: 1 } }, d: 2 });
});
