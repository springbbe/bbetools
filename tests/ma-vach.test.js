import { test } from "node:test";
import assert from "node:assert/strict";
import { encode, gs1Check, code39Check, code128Values, C128, bars, toSvg, TYPES } from "../assets/lib/ma-vach.js";

test("số kiểm tra GS1", () => {
  assert.equal(gs1Check("400638133393"), "1");     // 4006381333931
  assert.equal(gs1Check("893460400100"), "7");     // mã Việt Nam 893…
  assert.equal(gs1Check("9638507"), "4");          // EAN-8 96385074
  assert.equal(gs1Check("03600029145"), "2");      // UPC-A 036000291452
  assert.equal(gs1Check("1540014128876"), "3");    // ITF-14 15400141288763
});

test("EAN-13, EAN-8, UPC-A", () => {
  const e = encode("ean13", "400638133393");
  assert.equal(e.text, "4006381333931");
  assert.equal(e.modules.length, 95);
  assert.equal(e.modules.slice(0, 3), "101");
  assert.equal(e.modules.slice(45, 50), "01010");
  assert.equal(e.modules.slice(-3), "101");
  // số 4 → mẫu chẵn lẻ LGLLGG; số thứ hai (0) mã L = 0001101
  assert.equal(e.modules.slice(3, 10), "0001101");
  assert.equal(encode("ean13", "4006381333931").text, "4006381333931");
  assert.throws(() => encode("ean13", "4006381333932"), /Số kiểm tra/);
  assert.throws(() => encode("ean13", "12345"), /12 chữ số/);
  assert.throws(() => encode("ean13", "12345678901a"), /chữ số/);
  assert.equal(encode("ean8", "9638507").text, "96385074");
  assert.equal(encode("ean8", "9638507").modules.length, 67);
  const u = encode("upca", "03600029145");
  assert.equal(u.text, "036000291452");
  assert.equal(u.modules, encode("ean13", "0036000291452").modules);
});

test("ITF-14", () => {
  const c = encode("itf14", "1540014128876");
  assert.equal(c.text, "15400141288763");
  assert.ok(c.modules.startsWith("1010"));
  assert.ok(c.modules.endsWith("111" + "01"));
  // 7 cặp số × (2 × (3 rộng + 2 hẹp)) ô + mở đầu 4 + kết thúc 5
  assert.equal(c.modules.length, 7 * 2 * (3 * 2 + 3) + 4 + 5);
});

test("Code 39", () => {
  const c = encode("code39", "abc-123");
  assert.equal(c.text, "ABC-123");
  // mỗi ký tự 3 phần tử rộng (×3) + 6 hẹp = 15 ô, cách nhau 1 ô; thêm 2 dấu * mở/đóng
  assert.equal(c.modules.length, 9 * 15 + 8);
  assert.equal(code39Check("CODE39"), "W");
  assert.equal(encode("code39", "CODE39", { check: true }).text, "CODE39W");
  assert.throws(() => encode("code39", "Hà Nội"), /Không nhận: À Ộ/);
});

test("Code 128", () => {
  for (const [i, p] of C128.entries()) assert.equal([...p].reduce((a, b) => a + +b, 0), i === 106 ? 13 : 11, "mẫu " + i);
  assert.deepEqual(code128Values("PJJ123C"), [104, 48, 42, 42, 17, 18, 19, 35, 55]);
  // toàn số, chẵn: bảng C
  assert.deepEqual(code128Values("1234567890").slice(0, 6), [105, 12, 34, 56, 78, 90]);
  // dãy số dài ở cuối: B rồi chuyển C
  assert.deepEqual(code128Values("SP00012345").slice(0, 8), [104, 51, 48, 99, 0, 1, 23, 45]);
  // dãy lẻ: mã một số ở bảng B trước rồi mới sang C
  assert.deepEqual(code128Values("SP0012345").slice(0, 8), [104, 51, 48, 16, 99, 1, 23, 45]);
  // ký tự điều khiển: bảng A
  assert.equal(code128Values("\tA")[0], 103);
  // một chữ thường giữa ký tự điều khiển: SHIFT
  assert.deepEqual(code128Values("\ta\t").slice(0, 5), [103, 73, 98, 65, 73]);
  const c = encode("code128", "Hello-123");
  assert.equal((c.modules.length - 13) % 11, 0);
  assert.throws(() => encode("code128", "Đơn hàng"), /ASCII/);
});

test("dải vạch và SVG", () => {
  const e = encode("ean8", "9638507");
  const b = bars(e);
  assert.equal(b.reduce((a, x) => a + x.w, 0), [...e.modules].filter((x) => x === "1").length);
  assert.ok(b[0].long && !b[2].long);
  const svg = toSvg(e, { module: 2, height: 60 });
  assert.match(svg, /^<svg[^>]+viewBox="0 0 \d+ \d+"/);
  assert.match(svg, />9638<\/text>/);
  assert.match(toSvg(encode("code128", "A<&>B")), /A&lt;&amp;&gt;B/);
  assert.equal(Object.keys(TYPES).length, 6);
});
