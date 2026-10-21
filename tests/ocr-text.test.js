import { test } from "node:test";
import assert from "node:assert/strict";
import { tidy, joinLines } from "../assets/lib/ocr-text.js";

test("dọn khoảng trắng", () => {
  assert.equal(tidy("  Xin  chào \r\n\n\n\nbạn\t nhé  "), "Xin chào\n\nbạn nhé");
});

test("nối dòng trong đoạn, giữ đoạn và danh sách", () => {
  const t = "Căn cứ quy định hiện hành,\ncông ty thông báo lịch nghỉ\nnhư sau:\n- Nghỉ thứ Bảy\n- Nghỉ thứ Ba\n\nTrân trọng\nthông báo.";
  assert.equal(joinLines(t), "Căn cứ quy định hiện hành, công ty thông báo lịch nghỉ như sau:\n- Nghỉ thứ Bảy\n- Nghỉ thứ Ba\n\nTrân trọng thông báo.");
  assert.equal(joinLines("1. Một\n2. Hai"), "1. Một\n2. Hai");
});

test("dòng ngắn hẳn (tiêu đề, cuối đoạn) giữ xuống dòng", () => {
  const t = "V/v nghỉ lễ Quốc khánh 2/9\nKính gửi: Toàn thể cán bộ, nhân viên công ty.\nCăn cứ quy định hiện hành, công ty thông báo lịch nghỉ lễ\nQuốc khánh như sau: nhân viên được nghỉ từ thứ Bảy ngày";
  assert.equal(joinLines(t), "V/v nghỉ lễ Quốc khánh 2/9\nKính gửi: Toàn thể cán bộ, nhân viên công ty.\nCăn cứ quy định hiện hành, công ty thông báo lịch nghỉ lễ Quốc khánh như sau: nhân viên được nghỉ từ thứ Bảy ngày");
});
