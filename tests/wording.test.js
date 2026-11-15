import { test } from "node:test";
import assert from "node:assert/strict";
import { wordingIssues } from "../scripts/wording.js";
import { quoted, inSource } from "../scripts/sources.js";

const found = (s, prose) => wordingIssues(s, prose).map((i) => i.found);

test("từ cấm trong chuỗi hiển thị", () => {
  assert.deepEqual(found("Nhấn nút rồi nhấp chuột, click vào đây"), ["Nhấn", "nhấp", "click"]);
  assert.deepEqual(found("Lỗi máy chủ (server) 500"), ["server"]);
  assert.deepEqual(found("Nhập số (vd. 12)"), ["vd."]);
  assert.deepEqual(found("Xóa trang, mã hóa, tỷ lệ khung"), ["Xóa", "hóa", "tỷ lệ"]);
});

test("ngoại lệ hợp lệ không bị báo", () => {
  assert.deepEqual(found("nhấn mạnh, đèn nhấp nháy, màu nhấn, Microsoft SQL Server, xoá, hoá đơn, tỉ lệ, 2 tỷ đồng"), []);
  assert.deepEqual(found("VD: Luộc trứng", false), [], "VD: được dùng trong placeholder (chuỗi JS)");
  assert.deepEqual(found("VD: Luộc trứng", true), ["VD:"], "trong câu văn phải viết ví dụ");
});

test("tên nút trong howto", () => {
  assert.deepEqual(quoted("Bấm “Nén PDF”, ví dụ “abc”, rồi “Tải về”"), ["Nén PDF", "Tải về"]);
  assert.ok(inSource("h('button', null, `Tải ${n} file dạng .zip`)", "Tải … file dạng .zip"));
  assert.ok(!inSource("h('button', null, 'Tải về')", "Tải xuống"));
});
