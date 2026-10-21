import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeText, toNumber, sheetNames, fileNames, headKey, trimTable, stackTables, splitBy, sortIndex, filterIndex, colName, compareCells } from "../assets/lib/bang.js";
import { jsonToTable } from "../assets/lib/csv.js";

test("giải mã file chữ: UTF-8, BOM, Windows-1258", () => {
  const utf8 = new TextEncoder().encode("Họ tên;Lương");
  assert.deepEqual(decodeText(utf8), { text: "Họ tên;Lương", encoding: "UTF-8" });
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8])).text, "Họ tên;Lương");
  // "Hà Nội" trong Windows-1258: H, à (0xE0), space, N, ô (0xF4) + dấu nặng kết hợp (0xF2)
  const cp = decodeText(new Uint8Array([0x48, 0xe0, 0x20, 0x4e, 0xf4, 0xf2, 0x69]));
  assert.equal(cp.encoding, "Windows-1258");
  assert.equal(cp.text.normalize("NFC"), "Hà Nội");
  const u16 = new Uint8Array([0xff, 0xfe, 0x41, 0, 0xe0, 0]);
  assert.equal(decodeText(u16).text, "Aà");
});

test("nhận số trong CSV", () => {
  assert.equal(toNumber("1234.5"), 1234.5);
  assert.equal(toNumber("1,234,567"), 1234567);
  assert.equal(toNumber("-12"), -12);
  assert.equal(toNumber("1.234.567", ","), 1234567);
  assert.equal(toNumber("1234,5", ","), 1234.5);
  assert.equal(toNumber("0.5"), 0.5);
  assert.equal(toNumber("0"), 0);
  assert.equal(toNumber("0901234567"), "0901234567");   // số điện thoại giữ dạng chữ
  assert.equal(toNumber("001234567890123456"), "001234567890123456");
  assert.equal(toNumber("1234567890123456"), "1234567890123456"); // > 15 chữ số
  assert.equal(toNumber("12,34"), "12,34");           // dấu phẩy sai chỗ với kiểu số "."
  assert.equal(toNumber("1.234,5"), "1.234,5");
  assert.equal(toNumber("12/10/2026"), "12/10/2026");
  assert.equal(toNumber(" 42 "), 42);
  assert.equal(toNumber(""), "");
});

test("tên sheet, tên file", () => {
  assert.deepEqual(sheetNames(["Hà Nội", "hà nội", "a/b:c?", "", "Một tên rất dài vượt quá ba mươi mốt ký tự cho phép"]),
    ["Hà Nội", "hà nội (2)", "a-b-c-", "Sheet", "Một tên rất dài vượt quá ba mươ"]);
  assert.equal(sheetNames(["Một tên rất dài vượt quá ba mươi mốt ký tự", "Một tên rất dài vượt quá ba mươi mốt ký tự"])[1].length, 31);
  assert.deepEqual(fileNames(["Nguyễn Văn An", "Nguyễn Văn An", "a/b", ""], "docx"), ["Nguyễn Văn An.docx", "Nguyễn Văn An (2).docx", "a-b.docx", "trong.docx"]);
  assert.equal(headKey("  Họ_và  Tên "), "ho va ten");
  assert.equal(colName(0), "A");
  assert.equal(colName(25), "Z");
  assert.equal(colName(26), "AA");
  assert.equal(colName(701), "ZZ");
  assert.equal(colName(702), "AAA");
});

test("bỏ dòng, cột trống ở cuối", () => {
  assert.deepEqual(trimTable([["a", "b", null], ["c", "", null], [null, null], []]), [["a", "b"], ["c", ""]]);
});

test("gộp bảng theo tiêu đề", () => {
  const r = stackTables([
    { label: "T9.xlsx", rows: [["Mã", "Họ tên", "Số tiền"], ["A1", "An", 100], [null, "", null]] },
    { label: "T10.csv", rows: [["ho ten", "Mã", "Ghi chú"], ["Bình", "B2", "mới"]] }
  ], { header: true, source: "Nguồn" });
  assert.deepEqual(r.rows, [
    ["Nguồn", "Mã", "Họ tên", "Số tiền", "Ghi chú"],
    ["T9.xlsx", "A1", "An", 100, null],
    ["T10.csv", "B2", "Bình", null, "mới"]
  ]);
  assert.deepEqual(r.added, [1, 1]);
  assert.deepEqual(r.newCols, [[], ["Ghi chú"]]);
  // không có tiêu đề: nối thẳng
  const r2 = stackTables([{ label: "a", rows: [[1, 2]] }, { label: "b", rows: [[3]] }], { header: false });
  assert.deepEqual(r2.rows, [[1, 2], [3, null]]);
  // tiêu đề trùng trong một bảng
  const r3 = stackTables([{ label: "a", rows: [["X", "X"], [1, 2]] }], { header: true });
  assert.deepEqual(r3.rows, [["X", "X (2)"], [1, 2]]);
});

test("tách bảng theo cột", () => {
  const rows = [["Tên", "Chi nhánh"], ["An", "Hà Nội"], ["Bình", "Đà Nẵng"], ["Chi", "hà nội "], ["Dũng", ""]];
  const g = splitBy(rows, 1, { header: true });
  assert.deepEqual(g.map((x) => [x.key, x.rows.length]), [["Hà Nội", 3], ["Đà Nẵng", 2], ["", 2]]);
  assert.deepEqual(g[0].rows[0], ["Tên", "Chi nhánh"]);
  assert.equal(splitBy(rows, 1, { header: true, exact: true }).length, 4);
});

test("sắp xếp, lọc kiểu tiếng Việt", () => {
  const rows = [["Đông"], ["An"], [null], ["Ánh"], ["Bình"], [10], [9]];
  assert.deepEqual(sortIndex(rows, 0).map((i) => rows[i][0]), [9, 10, "An", "Ánh", "Bình", "Đông", null]);
  assert.deepEqual(sortIndex(rows, 0, -1).map((i) => rows[i][0]), ["Đông", "Bình", "Ánh", "An", 10, 9, null]);
  assert.ok(compareCells("Đ", "E") < 0);
  const t = [["Nguyễn Văn An", "Hà Nội"], ["Trần Bình", "Huế"], ["Lê Chi", "hà nam"]];
  assert.deepEqual(filterIndex(t, "ha n"), [0, 2]);
  assert.deepEqual(filterIndex(t, "an", 0), [0, 1]);
  assert.deepEqual(filterIndex(t, "ha", 1), [0, 2]);
  assert.deepEqual(filterIndex(t, ""), [0, 1, 2]);
});

test("JSON → bảng", () => {
  assert.deepEqual(jsonToTable([{ a: 1, b: { c: 2 } }, { a: 3, d: "x" }]), [["a", "b.c", "d"], [1, 2, undefined], [3, undefined, "x"]]);
  assert.deepEqual(jsonToTable({ data: [{ x: 1 }] }), [["x"], [1]]);
  assert.throws(() => jsonToTable("abc"), /mảng/);
});
