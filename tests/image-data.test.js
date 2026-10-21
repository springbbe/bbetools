import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIco, svgSize, svgWithSize, hex, rgbToHsl, luma, palette, paperLevel, extractInk, inkKind } from "../assets/lib/image-data.js";

test("tạo file .ico từ nhiều PNG", () => {
  const a = Uint8Array.of(1, 2, 3), b = Uint8Array.of(4, 5, 6, 7);
  const ico = buildIco([{ size: 16, png: a }, { size: 256, png: b }]);
  const v = new DataView(ico.buffer);
  assert.deepEqual([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)], [0, 1, 2]);
  assert.equal(ico[6], 16);
  assert.equal(ico[22], 0);                       // 256 ghi là 0
  assert.equal(v.getUint16(6 + 6, true), 32);     // 32 bit
  assert.equal(v.getUint32(6 + 8, true), 3);
  assert.equal(v.getUint32(6 + 12, true), 38);    // 6 + 2×16
  assert.deepEqual([...ico.subarray(38, 41)], [1, 2, 3]);
  assert.deepEqual([...ico.subarray(41)], [4, 5, 6, 7]);
});

test("kích thước SVG", () => {
  assert.deepEqual(svgSize('<svg width="120" height="60"></svg>'), { width: 120, height: 60, viewBox: null });
  assert.equal(svgSize('<svg viewBox="0 0 24 12"/>').width, 24);
  assert.deepEqual([svgSize('<svg width="48" viewBox="0 0 24 12"/>').width, svgSize('<svg width="48" viewBox="0 0 24 12"/>').height], [48, 24]);
  assert.ok(Math.abs(svgSize('<svg width="10mm" height="1in">').width - 37.795) < 0.01);
  assert.equal(svgSize('<svg width="1in" height="1in">').height, 96);
  assert.deepEqual([svgSize('<?xml version="1.0"?><svg width="100%" height="100%" viewBox="0,0,50,40">').width, svgSize('<svg width="100%" viewBox="0,0,50,40">').height], [50, 40]);
  assert.deepEqual([svgSize("<svg>").width, svgSize("<svg>").height], [300, 150]);
  const s = svgWithSize('<svg width="10" height="5"><rect/></svg>', 400, 200);
  assert.match(s, /^<svg width="400" height="200" xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 10 5">/);
  assert.match(svgWithSize('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>', 8, 8), /^<svg width="8" height="8" xmlns="[^"]+" viewBox="0 0 1 1">/);
});

test("đổi hệ màu", () => {
  assert.equal(hex([62, 91, 242]), "#3E5BF2");
  assert.deepEqual(rgbToHsl([255, 0, 0]), [0, 100, 50]);
  assert.deepEqual(rgbToHsl([0, 0, 255]), [240, 100, 50]);
  assert.deepEqual(rgbToHsl([128, 128, 128]), [0, 0, 50]);
  assert.ok(luma([255, 255, 255]) > 0.99 && luma([0, 0, 0]) === 0);
});

function img(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = c[3] == null ? 255 : c[3]; }
  return { data, width: w, height: h };
}

test("bảng màu chủ đạo", () => {
  // 60% đỏ, 30% xanh, 10% trắng
  const p = palette(img(100, 100, (x) => (x < 60 ? [220, 30, 40] : x < 90 ? [20, 60, 200] : [255, 255, 255])), 6);
  assert.equal(p.length, 3);
  assert.deepEqual(p.map((c) => hex(c.rgb)), ["#DC1E28", "#143CC8", "#FFFFFF"]);
  assert.ok(Math.abs(p[0].share - 0.6) < 0.02);
  // bỏ điểm trong suốt
  assert.deepEqual(palette(img(10, 10, (x) => (x < 5 ? [0, 0, 0, 0] : [0, 255, 0])), 4).map((c) => hex(c.rgb)), ["#00FF00"]);
});

test("tách nét mực trên nền có bóng đổ", () => {
  // nền giấy sáng dần từ 150 (trong bóng) đến 240, một nét mực xanh nằm ngang ở giữa
  const W = 200, H = 100;
  const paper = (x) => 150 + (90 * x) / W;
  const im = img(W, H, (x, y) => (y >= 45 && y < 55 && x >= 20 && x < 180 ? [paper(x) * 0.25, paper(x) * 0.3, paper(x) * 0.7] : [paper(x), paper(x), paper(x) * 0.97]));
  const lv = paperLevel(im, 32);
  assert.ok(Math.abs(lv[50 * W + 5] - paper(5)) < 12, String(lv[50 * W + 5]));
  const r = extractInk(im, { level: lv, sens: 0.5 });
  const a = (x, y) => r.data[(y * W + x) * 4 + 3];
  assert.ok(a(30, 50) > 240 && a(170, 50) > 240);   // nét mực, cả trong bóng lẫn chỗ sáng
  assert.equal(a(30, 20), 0);                        // giấy trong bóng vẫn trong suốt
  assert.equal(a(190, 90), 0);
  assert.deepEqual(r.box, { x: 20, y: 45, w: 160, h: 10 });
  // giữ màu mực: xanh trội
  const i = (50 * W + 100) * 4;
  assert.ok(r.data[i + 2] > r.data[i] * 2);
  // đổi màu mực
  const red = extractInk(im, { level: lv, color: [200, 0, 0] });
  assert.deepEqual([...red.data.subarray(i, i + 3)], [200, 0, 0]);
});

test("phân loại mực và chỉ lấy nét một màu", () => {
  assert.equal(inkKind(27, 58, 147), "blue");
  assert.equal(inkKind(199, 38, 44), "red");
  assert.equal(inkKind(42, 45, 54), "dark");
  assert.equal(inkKind(150, 30, 35, 180), "red");
  // nửa trái nét xanh, nửa phải nét đỏ
  const W = 100, H = 40;
  const im = img(W, H, (x, y) => (y >= 15 && y < 25 ? (x < 50 ? [30, 60, 160] : [200, 40, 45]) : [235, 232, 225]));
  const blue = extractInk(im, { only: "blue" }), red = extractInk(im, { only: "red" });
  const a = (r, x) => r.data[(20 * W + x) * 4 + 3];
  assert.ok(a(blue, 20) > 200 && a(blue, 80) === 0);
  assert.ok(a(red, 80) > 200 && a(red, 20) === 0);
  assert.deepEqual(red.box, { x: 50, y: 15, w: 50, h: 10 });
});
