import { test } from "node:test";
import assert from "node:assert/strict";
import { crc16, buildVietQR, parseVietQR, cleanMessage, parseTLV } from "../assets/lib/vietqr.js";

test("CRC-16/CCITT-FALSE chuẩn", () => {
  assert.equal(crc16("123456789"), "29B1");
  assert.equal(crc16(""), "FFFF");
});

test("tạo chuỗi VietQR tĩnh (không số tiền)", () => {
  const s = buildVietQR({ bin: "970436", account: "0011000597049" });
  assert.equal(s.slice(0, -4), "00020101021138570010A00000072701270006970436011300110005970490208QRIBFTTA53037045802VN6304");
  const p = parseVietQR(s);
  assert.equal(p.crcOk, true);
  assert.equal(p.bin, "970436");
  assert.equal(p.account, "0011000597049");
  assert.equal(p.amount, 0);
});

test("tạo chuỗi VietQR động có số tiền và nội dung", () => {
  const s = buildVietQR({ bin: "970422", account: "123 456 789", amount: "1.500.000", message: "Tiền nhà tháng 10" });
  const top = parseTLV(s);
  assert.deepEqual(top.map((x) => x.id), ["00", "01", "38", "53", "54", "58", "62", "63"]);
  const p = parseVietQR(s);
  assert.equal(p.crcOk, true);
  assert.equal(p.fields["01"], "12");
  assert.equal(p.amount, 1500000);
  assert.equal(p.message, "Tien nha thang 10");
  assert.equal(p.account, "123456789");
  assert.equal(p.service, "QRIBFTTA");
});

test("phát hiện chuỗi bị sửa", () => {
  const s = buildVietQR({ bin: "970422", account: "123456789", amount: 50000 });
  const bad = s.replace("50000", "90000");
  assert.equal(parseVietQR(bad).crcOk, false);
  assert.equal(parseVietQR("https://example.com"), null);
});

test("kiểm tra đầu vào", () => {
  assert.throws(() => buildVietQR({ bin: "97", account: "1" }));
  assert.throws(() => buildVietQR({ bin: "970422", account: "" }));
  assert.equal(cleanMessage("Chuyển tiền: Đặt cọc #12!"), "Chuyen tien Dat coc 12");
});

test("khớp từng ký tự với mã do img.vietqr.io tạo (đối chiếu ngày 21/10/2026)", () => {
  const s = buildVietQR({ bin: "970436", account: "0011000597049", amount: 150000, message: "Tiền ăn trưa" });
  assert.equal(s, "00020101021238570010A00000072701270006970436011300110005970490208QRIBFTTA530370454061500005802VN62160812Tien an trua630428E3");
});
