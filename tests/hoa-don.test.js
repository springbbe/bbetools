import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVN, totals, nextNumber } from "../assets/lib/hoa-don.js";
import { signatureHtml, signatureText, normUrl, shortUrl } from "../assets/lib/chu-ky-email.js";

test("đọc số kiểu Việt Nam", () => {
  assert.equal(parseVN("1.500.000"), 1500000);
  assert.equal(parseVN("1.500.000 đ"), 1500000);
  assert.equal(parseVN("2,5"), 2.5);
  assert.equal(parseVN("1.234,75"), 1234.75);
  assert.equal(parseVN("1500000.5"), 1500000.5);
  assert.equal(parseVN("1.5"), 1.5);
  assert.equal(parseVN("12"), 12);
  assert.equal(parseVN(""), 0);
  assert.equal(parseVN("-3"), -3);
  assert.ok(Number.isNaN(parseVN("abc")));
  assert.ok(Number.isNaN(parseVN("1.2.3")));
});

test("tính tổng hoá đơn", () => {
  const items = [{ qty: "2", price: "1.500.000" }, { qty: "0,5", price: "333.333" }, { qty: "", price: "100" }, { qty: "x", price: "1" }];
  const t = totals(items, { discount: "10", discountType: "pct", vat: "8", shipping: "30.000" });
  assert.deepEqual(t.lines, [3000000, 166667, 0, 0]);
  assert.equal(t.subtotal, 3166667);
  assert.equal(t.discount, 316667);
  assert.equal(t.taxable, 2850000);
  assert.equal(t.vat, 228000);
  assert.equal(t.rate, 8);
  assert.equal(t.total, 2850000 + 228000 + 30000);
  const t2 = totals([{ qty: 1, price: 500000 }], { discount: "700.000", discountType: "amount", vat: null });
  assert.equal(t2.discount, 500000);
  assert.equal(t2.vat, 0);
  assert.equal(t2.rate, null);
  assert.equal(t2.total, 0);
  assert.equal(totals([]).total, 0);
});

test("số chứng từ kế tiếp", () => {
  assert.equal(nextNumber("BG-2026-009"), "BG-2026-010");
  assert.equal(nextNumber("HD99"), "HD100");
  assert.equal(nextNumber("0099/HĐ"), "0100/HĐ");
  assert.equal(nextNumber(""), "001");
});

test("chữ ký email", () => {
  assert.equal(normUrl("congty.vn"), "https://congty.vn");
  assert.equal(normUrl("http://a.vn/x y"), "http://a.vn/x%20y");
  assert.equal(normUrl("javascript:alert(1)"), "");
  assert.equal(normUrl("abc"), "");
  assert.equal(shortUrl("https://www.congty.vn/"), "congty.vn");
  const d = { name: "Nguyễn <An>", title: "Kế toán", company: "Cty A&B", phone: "0901 234 567", email: "an@congty.vn", website: "congty.vn", facebook: "facebook.com/an", color: "#18794E", photo: "data:image/png;base64,xx" };
  const html = signatureHtml(d);
  assert.match(html, /Nguyễn &lt;An&gt;/);
  assert.match(html, /Cty A&amp;B/);
  assert.match(html, /href="tel:0901234567"/);
  assert.match(html, /href="mailto:an@congty.vn"/);
  assert.match(html, /href="https:\/\/congty.vn" style="[^"]*">congty.vn</);
  assert.doesNotMatch(html, /style=""/);
  assert.match(html, /#18794E/);
  assert.doesNotMatch(html, /<img/);          // ảnh data: bị bỏ (Gmail chặn)
  assert.doesNotMatch(html, /<style|class=/);  // chỉ CSS inline
  for (const layout of ["left", "top"]) assert.match(signatureHtml({ ...d, layout, photo: "https://a.vn/p.jpg" }), /<img src="https:\/\/a.vn\/p.jpg"/);
  assert.equal(signatureText(d), "--\nNguyễn <An>\nKế toán · Cty A&B\nĐT: 0901 234 567\nEmail: an@congty.vn\nWeb: congty.vn");
});
