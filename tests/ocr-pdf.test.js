import { test } from "node:test";
import assert from "node:assert/strict";
import { placeWords, squeeze, linesOf } from "../assets/lib/ocr-pdf.js";
import { geom } from "../assets/lib/pdf-geom.js";

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≈ ${b}`);
// ảnh 2× (ảnh 1190 × 1684 px cho trang A4 595 × 842 pt)
const line = { baseline: { x0: 100, y0: 400, x1: 900, y1: 400 }, bbox: { x0: 100, y0: 350, x1: 900, y1: 412 }, rowAttributes: { rowHeight: 50 },
  words: [{ text: "Cộng", bbox: { x0: 100, y0: 352, x1: 220, y1: 412 } }, { text: "  ", bbox: { x0: 230, y0: 352, x1: 240, y1: 412 } }, { text: "hoà", bbox: { x0: 240, y0: 360, x1: 330, y1: 400 } }] };

test("trang thẳng: đổi điểm ảnh sang pt, gốc dưới trái", () => {
  const W = placeWords([line], 1190, 1684, geom({ x: 0, y: 0, width: 595, height: 842 }, 0));
  assert.equal(W.length, 2); // bỏ từ rỗng
  const [a, b] = W;
  assert.equal(a.text, "Cộng");
  near(a.x, 50, "x"); near(a.y, 842 - 200, "y chân chữ"); near(a.size, 25, "cỡ chữ"); near(a.width, 60, "bề ngang"); near(a.angle, 0, "góc");
  near(b.x, 120, "x từ 2");
});

test("CropBox lệch gốc và trang xoay 90°", () => {
  const g = geom({ x: 10, y: 20, width: 595, height: 842 }, 90); // nhìn thấy: 842 × 595
  const W = placeWords([line], 1684, 1190, g);
  const a = W[0];
  // nhìn thấy (vx = 50, vy từ dưới = 595 − 200 = 395) → PDF: x = x0 + W − vy, y = y0 + vx
  near(a.x, 10 + 595 - 395, "x"); near(a.y, 20 + 50, "y"); near(a.angle, 90, "chữ chạy theo trục y");
});

test("dòng nghiêng: góc theo đường chân chữ, chân chữ nội suy theo vị trí từ", () => {
  const tilted = { ...line, baseline: { x0: 100, y0: 400, x1: 900, y1: 360 } }; // đi lên sang phải
  const W = placeWords([tilted], 1190, 1684, geom({ x: 0, y: 0, width: 595, height: 842 }, 0));
  near(W[0].angle, (Math.atan2(20, 400) * 180) / Math.PI, "góc dương");
  near(W[1].y, 842 - (400 - 40 * (140 / 800)) / 2, "chân chữ từ 2");
  assert.ok(W[0].width > 60);
});

test("nén ngang và lấy dòng", () => {
  assert.equal(squeeze(50, 100), 50);
  assert.equal(squeeze(50, 0), 100);
  assert.equal(squeeze(1, 1000), 5);
  assert.deepEqual(linesOf({ blocks: [{ paragraphs: [{ lines: [1, 2] }, { lines: [3] }] }] }), [1, 2, 3]);
  assert.deepEqual(linesOf(null), []);
});
