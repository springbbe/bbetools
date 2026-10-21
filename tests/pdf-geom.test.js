import { test } from "node:test";
import assert from "node:assert/strict";
import { geom, toUser, place, imagePageSize, fitBox, pageLabel, labelPos, markLayout, hexRgb, PAPER } from "../assets/lib/pdf-geom.js";

const A4 = { x: 0, y: 0, width: 595, height: 842 };
const near = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-6, `${a} ≈ ${b}`));

test("hình học trang theo /Rotate", () => {
  assert.deepEqual(geom(A4, 0), { x0: 0, y0: 0, W: 595, H: 842, r: 0, VW: 595, VH: 842 });
  const g = geom(A4, 90);
  assert.equal(g.VW, 842); assert.equal(g.VH, 595);
  assert.equal(geom(A4, -90).r, 270);
  assert.equal(geom(A4, 450).r, 90);
});

test("đổi điểm nhìn thấy sang toạ độ PDF", () => {
  // góc dưới trái nhìn thấy
  near(toUser(geom(A4, 0), 0, 0), [0, 0]);
  near(toUser(geom(A4, 90), 0, 0), [595, 0]);
  near(toUser(geom(A4, 180), 0, 0), [595, 842]);
  near(toUser(geom(A4, 270), 0, 0), [0, 842]);
  // CropBox lệch gốc
  near(toUser(geom({ x: 10, y: 20, width: 100, height: 200 }, 0), 5, 5), [15, 25]);
});

test("đặt hộp: không xoay, trang xoay 90°", () => {
  const p0 = place(geom(A4, 0), { x: 10, y: 20, w: 100, h: 50 });
  near([p0.x, p0.y, p0.width, p0.height, p0.rotate], [10, 842 - 20 - 50, 100, 50, 0]);
  // trang xoay 90: góc dưới trái của hộp (nhìn thấy) phải nằm đúng chỗ, hướng xoay theo trang
  const g = geom(A4, 90), p = place(g, { x: 0, y: g.VH - 50, w: 100, h: 50 });
  near([p.x, p.y], toUser(g, 0, 0));
  assert.equal(p.rotate, 90);
});

test("đặt hộp xoay 90° quanh tâm giữ nguyên tâm", () => {
  const g = geom(A4, 0), b = { x: 100, y: 100, w: 200, h: 40, angle: 90 };
  const p = place(g, b);
  // tâm = điểm neo + nửa hộp đã xoay
  const a = Math.PI / 2, cx = p.x + (b.w / 2) * Math.cos(a) - (b.h / 2) * Math.sin(a), cy = p.y + (b.w / 2) * Math.sin(a) + (b.h / 2) * Math.cos(a);
  near([cx, cy], [200, 842 - 120]);
});

test("khổ trang cho ảnh", () => {
  assert.deepEqual(imagePageSize(1000, 800, { size: "a4", orient: "p", margin: 0 }), PAPER.a4);
  assert.deepEqual(imagePageSize(1000, 800, { size: "a4", orient: "auto", margin: 0 }), [297, 210]);
  assert.deepEqual(imagePageSize(800, 1000, { size: "a4", orient: "auto", margin: 0 }), [210, 297]);
  assert.deepEqual(imagePageSize(800, 1000, { size: "letter", orient: "l", margin: 0 }), [279.4, 215.9]);
  near(imagePageSize(1000, 500, { size: "fit", margin: 10 }), [317, 168.5]);
  const b = fitBox(210, 297, 10, 1000, 1000);
  near([b.x, b.w, b.h], [10, 190, 190]);
  near([b.y], [(297 - 190) / 2]);
});

test("nhãn số trang", () => {
  assert.equal(pageLabel({ fmt: "{n} / {N}" }, 0, 10), "1 / 10");
  assert.equal(pageLabel({ fmt: "Trang {n}", skip: 1 }, 0, 10), null);
  assert.equal(pageLabel({ fmt: "Trang {n} / {N}", skip: 1 }, 1, 10), "Trang 1 / 9");
  assert.equal(pageLabel({ fmt: "- {n} -", start: 5 }, 2, 3), "- 7 -");
  near(labelPos(595, 842, "bc", 20, 11, 30), [287.5, 30]);
  near(labelPos(595, 842, "tr", 20, 10, 30), [545, 842 - 30 - 7.2]);
});

test("bố cục watermark", () => {
  assert.deepEqual(markLayout(595, 842, 100, 40, { pos: "mc" }), [{ cx: 297.5, cy: 421 }]);
  const [tl] = markLayout(595, 842, 100, 40, { pos: "tl", angle: 0 });
  assert.deepEqual(tl, { cx: 28 + 50, cy: 28 + 20 });
  const tiles = markLayout(595, 842, 100, 40, { tile: true, angle: 45 });
  assert.ok(tiles.length > 10);
  assert.ok(tiles.every((t) => t.cx > -100 && t.cx < 700 && t.cy > -100 && t.cy < 950));
});

test("màu hex", () => {
  near(hexRgb("#FF8000"), [1, 128 / 255, 0]);
  near(hexRgb("#fff"), [1, 1, 1]);
});
