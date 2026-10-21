import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, serialize, grayContent, rgbGray, cmykGray } from "../assets/lib/pdf-content.js";

test("tách token: chuỗi lồng ngoặc, ký tự thoát, hex, từ điển, chú thích", () => {
  const t = tokenize("BT /F1 12 Tf (a(b)c\\) d) Tj <48656C6C6F> Tj ET % chú thích\n<< /MCID 0 >> BDC [(x) -250 (y)] TJ .5 -1 Td");
  assert.deepEqual(t.map((x) => x.v), ["BT", "/F1", "12", "Tf", "(a(b)c\\) d)", "Tj", "<48656C6C6F>", "Tj", "ET", "<<", "/MCID", "0", ">>", "BDC", "[", "(x)", "-250", "(y)", "]", "TJ", ".5", "-1", "Td"]);
  assert.equal(t[4].t, "str"); assert.equal(t[20].t, "num");
});

test("ảnh inline được giữ nguyên byte", () => {
  const bin = "\x00\xff EI? (\x01";
  const src = `q BI /W 2 /H 1 /CS /RGB /BPC 8 ID ${bin} EI Q 1 0 0 rg`;
  const out = grayContent(src).text;
  assert.ok(out.includes(`ID ${bin} EI`), out);
  assert.ok(/0\.299 g/.test(out));
});

test("đổi màu RGB, CMYK sang xám", () => {
  assert.equal(rgbGray(1, 1, 1), 1);
  assert.equal(cmykGray(0, 0, 0, 1), 0);
  const r = grayContent("1 0 0 rg 0 0 1 RG 0 0 0 1 k 0.5 g 10 10 m");
  assert.equal(r.changed, 3);
  assert.equal(r.text.trim().split("\n").join(" | "), "0.299 g | 0.114 G | 0 g | 0.5 g | 10 10 m");
});

test("hệ màu đặt tên, sc/scn, q/Q", () => {
  const csOf = (n) => ({ CS0: "rgb", CS1: "gray", P0: "other" })[n];
  const r = grayContent("/CS0 cs 0 1 0 sc q /CS1 cs 0.2 sc Q 1 1 0 scn /Pattern cs /P0 scn /DeviceCMYK CS 0 0 0 0.5 SC", csOf);
  const lines = r.text.trim().split("\n");
  assert.deepEqual(lines, ["/DeviceGray cs", "0.587 sc", "q", "/CS1 cs", "0.2 sc", "Q", "0.886 scn", "/Pattern cs", "/P0 scn", "/DeviceGray CS", "0.5 SC"]);
});

test("không đụng tới lệnh không phải màu, văn bản ra đọc lại được", () => {
  const src = "BT /F1 9 Tf 72 700 Td (Xin ch\\340o) Tj ET 0 0 1 rg 0 0 100 100 re f";
  const r = grayContent(src);
  const again = tokenize(r.text).map((t) => t.v);
  assert.deepEqual(again.slice(0, 9), ["BT", "/F1", "9", "Tf", "72", "700", "Td", "(Xin ch\\340o)", "Tj"]);
  assert.equal(serialize(tokenize("a b")), "a\nb\n");
});
