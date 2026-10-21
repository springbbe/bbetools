import { test } from "node:test";
import assert from "node:assert/strict";
import { unPredict, toRGBA, applyAlpha } from "../assets/lib/pdf-image.js";

test("bỏ bộ lọc PNG (Sub, Up)", () => {
  // 2 hàng × 3 byte, bpp 1: hàng 1 lọc Sub, hàng 2 lọc Up
  const d = new Uint8Array([1, 10, 5, 5, 2, 1, 1, 1]);
  assert.deepEqual([...unPredict(d, 3, 2, 1)], [10, 15, 20, 11, 16, 21]);
});

test("RGB 8 bit, xám 1 bit, CMYK", () => {
  const rgb = toRGBA({ data: new Uint8Array([255, 0, 0, 0, 0, 255]), width: 2, height: 1, bpc: 8, cs: "rgb" });
  assert.deepEqual([...rgb], [255, 0, 0, 255, 0, 0, 255, 255]);
  const g1 = toRGBA({ data: new Uint8Array([0b10100000]), width: 3, height: 1, bpc: 1, cs: "gray" });
  assert.deepEqual([...g1].filter((_, i) => i % 4 === 0), [255, 0, 255]);
  const k = toRGBA({ data: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1, bpc: 8, cs: "cmyk" });
  assert.deepEqual([...k], [0, 0, 0, 255]);
  const inv = toRGBA({ data: new Uint8Array([0]), width: 1, height: 1, bpc: 8, cs: "gray", decode: [1, 0] });
  assert.equal(inv[0], 255);
  assert.equal(toRGBA({ data: new Uint8Array([1]), width: 2, height: 2, bpc: 8, cs: "gray" }), null);
});

test("Indexed, ImageMask, kênh trong suốt", () => {
  const ix = toRGBA({ data: new Uint8Array([0x1e]), width: 2, height: 1, bpc: 4, cs: "indexed", base: "rgb", palette: new Uint8Array(16 * 3).map((_, i) => i) });
  assert.deepEqual([...ix.slice(0, 3)], [3, 4, 5]);
  assert.deepEqual([...ix.slice(4, 7)], [42, 43, 44]);
  const m = toRGBA({ data: new Uint8Array([0b01000000]), width: 2, height: 1, mask: true });
  assert.deepEqual([m[3], m[7]], [255, 0]);
  const a = applyAlpha(new Uint8ClampedArray(8).fill(9), 2, 1, new Uint8ClampedArray([77, 0, 0, 255]), 1, 1);
  assert.deepEqual([a[3], a[7]], [77, 77]);
});

test("ảnh có Predictor PNG", () => {
  const img = toRGBA({ data: new Uint8Array([0, 1, 2, 3, 2, 1, 1, 1]), width: 1, height: 2, bpc: 8, cs: "rgb", predictor: 15 });
  assert.deepEqual([...img], [1, 2, 3, 255, 2, 3, 4, 255]);
});
