import { test } from "node:test";
import assert from "node:assert/strict";
import { toGray, otsu, detectCorners, homography, project, quadSize, warp, enhance, rotate90, orderCorners } from "../assets/lib/scan.js";

// ảnh tổng hợp: nền tối, tờ giấy sáng hình tứ giác lệch
function synth(w, h, quad, paper = 235, back = 60) {
  const data = new Uint8ClampedArray(w * h * 4);
  const inside = (x, y) => { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = quad[i], [xj, yj] = quad[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = inside(x + 0.5, y + 0.5) ? paper : back + ((x * 7 + y * 13) % 20); const i = (y * w + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255; }
  return { data, width: w, height: h };
}

test("ngưỡng Otsu tách hai mức sáng", () => {
  const g = new Uint8Array(100).map((_, i) => (i < 50 ? 30 : 220));
  const t = otsu(g);
  assert.ok(t >= 30 && t < 220, String(t));
});

test("tìm 4 góc tờ giấy", () => {
  const quad = [[40, 30], [160, 20], [170, 130], [30, 120]];
  const img = synth(200, 150, quad);
  const c = detectCorners(toGray(img), 200, 150);
  assert.ok(c);
  c.forEach((p, i) => assert.ok(Math.hypot(p[0] - quad[i][0], p[1] - quad[i][1]) < 5, `góc ${i}: ${p} ≠ ${quad[i]}`));
  // ảnh không có tờ giấy rõ ràng
  assert.equal(detectCorners(toGray(synth(60, 40, [[0, 0], [60, 0], [60, 40], [0, 40]])), 60, 40), null);
});

test("homography và nắn ảnh", () => {
  const src = [[0, 0], [99, 0], [99, 49], [0, 49]], dst = [[10, 5], [120, 12], [110, 70], [3, 60]];
  const H = homography(src, dst);
  src.forEach((p, i) => { const q = project(H, ...p); assert.ok(Math.hypot(q[0] - dst[i][0], q[1] - dst[i][1]) < 1e-6); });
  assert.deepEqual(quadSize([[0, 0], [100, 0], [100, 50], [0, 50]]), [100, 50]);
  const quad = [[40, 30], [160, 20], [170, 130], [30, 120]];
  const out = warp(synth(200, 150, quad), quad, 50, 40);
  assert.equal(out.width, 50);
  // bên trong tờ giấy đã nắn: gần như toàn màu giấy
  let bright = 0, n = 0;
  for (let y = 2; y < 38; y++) for (let x = 2; x < 48; x++) { n++; if (out.data[(y * 50 + x) * 4] > 200) bright++; }
  assert.ok(bright / n > 0.97, `${bright}/${n}`);
  assert.deepEqual(orderCorners([[9, 9], [0, 9], [9, 0], [0, 0]]), [[0, 0], [9, 0], [9, 9], [0, 9]]);
});

test("làm trắng nền, đen trắng, xoay", () => {
  const img = synth(64, 64, [[0, 0], [64, 0], [64, 64], [0, 64]], 190);
  for (let y = 30; y < 34; y++) for (let x = 10; x < 50; x++) { const i = (y * 64 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 40; }
  enhance(img, "bw");
  assert.equal(img.data[(5 * 64 + 5) * 4], 255); // giấy xám → trắng
  assert.equal(img.data[(31 * 64 + 20) * 4], 0); // mực → đen
  const r = rotate90({ data: new Uint8ClampedArray([1, 0, 0, 255, 2, 0, 0, 255]), width: 2, height: 1 }, 1);
  assert.deepEqual([r.width, r.height, r.data[0], r.data[4]], [1, 2, 1, 2]);
});
