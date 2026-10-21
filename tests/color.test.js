import { test } from "node:test";
import assert from "node:assert/strict";
import { parseColor, formats, contrast, bestText, rgbToOklch, shades } from "../assets/lib/color.js";

const rgb = (s) => { const c = parseColor(s); return c && [Math.round(c.r), Math.round(c.g), Math.round(c.b), c.a]; };

test("đọc nhiều cách viết màu", () => {
  assert.deepEqual(rgb("#3e63dd"), [62, 99, 221, 1]);
  assert.deepEqual(rgb("3E63DD"), [62, 99, 221, 1]);
  assert.deepEqual(rgb("#f00"), [255, 0, 0, 1]);
  assert.deepEqual(rgb("#ff000080"), [255, 0, 0, 0.502]);
  assert.deepEqual(rgb("rgb(62, 99, 221)"), [62, 99, 221, 1]);
  assert.deepEqual(rgb("rgba(62 99 221 / 50%)"), [62, 99, 221, 0.5]);
  assert.deepEqual(rgb("hsl(226, 70%, 55.5%)"), [62, 99, 221, 1]);
  assert.deepEqual(rgb("hsl(0.5turn 100% 50%)"), [0, 255, 255, 1]);
  assert.deepEqual(rgb("hwb(0 0% 0%)"), [255, 0, 0, 1]);
  assert.deepEqual(rgb("rebeccapurple"), [102, 51, 153, 1]);
  assert.deepEqual(rgb("62 99 221"), [62, 99, 221, 1]);
  assert.deepEqual(rgb("oklch(62.8% 0.2577 29.23)"), [255, 0, 0, 1]);
  assert.equal(parseColor("xanh"), null);
  assert.equal(parseColor("rgb(1,2)"), null);
});

test("đổi qua các hệ màu", () => {
  const f = formats(parseColor("#3e63dd"));
  assert.equal(f.hex, "#3e63dd");
  assert.equal(f.rgb, "rgb(62, 99, 221)");
  assert.equal(f.hsl, "hsl(226, 70%, 55%)");
  assert.match(f.oklch, /^oklch\(5\d\.\d% 0\.1\d\d 2\d\d(\.\d)?\)$/);
  assert.equal(formats(parseColor("red")).name, "red");
  assert.equal(formats(parseColor("#000")).cmyk, "cmyk(0%, 0%, 0%, 100%)");
  assert.equal(formats(parseColor("rgb(255 0 0 / 50%)")).hex, "#ff000080");
  const l = rgbToOklch(parseColor("white"));
  assert.ok(Math.abs(l.L - 1) < 1e-4 && l.C < 1e-3);
  assert.equal(shades(parseColor("#3e63dd")).length, 9);
});

test("tương phản WCAG", () => {
  assert.equal(Math.round(contrast(parseColor("#000"), parseColor("#fff")) * 100) / 100, 21);
  assert.equal(Math.round(contrast(parseColor("#777"), parseColor("#fff")) * 100) / 100, 4.48);
  assert.equal(bestText(parseColor("#ffd700")), "#000000");
  assert.equal(bestText(parseColor("#1e3a8a")), "#ffffff");
});
