import { test } from "node:test";
import assert from "node:assert/strict";
import { fitSize, rotatedSize, normRot, orientMatrix, apply, centeredRect, clampRect, roundRect, moveRect, resizeRect, applyRatio, gridTiles, mergeLayout } from "../assets/lib/image-geom.js";

test("đổi cỡ theo pixel, giữ tỉ lệ", () => {
  assert.deepEqual(fitSize(4000, 3000, { mode: "px", width: 800 }), [800, 600]);
  assert.deepEqual(fitSize(4000, 3000, { mode: "px", height: 300 }), [400, 300]);
  // nhập cả hai cạnh: vừa khít trong khung
  assert.deepEqual(fitSize(4000, 3000, { mode: "px", width: 1000, height: 1000 }), [1000, 750]);
  assert.deepEqual(fitSize(3000, 4000, { mode: "px", width: 1000, height: 1000 }), [750, 1000]);
  // không giữ tỉ lệ: kéo giãn đúng kích thước nhập
  assert.deepEqual(fitSize(4000, 3000, { mode: "px", width: 500, height: 500, keep: false }), [500, 500]);
  assert.deepEqual(fitSize(4000, 3000, { mode: "px", width: 500, keep: false }), [500, 3000]);
});

test("đổi cỡ theo %, cạnh dài, cạnh ngắn", () => {
  assert.deepEqual(fitSize(2400, 1600, { mode: "pct", pct: 50 }), [1200, 800]);
  assert.deepEqual(fitSize(2400, 1600, { mode: "long", long: 1200 }), [1200, 800]);
  assert.deepEqual(fitSize(1600, 2400, { mode: "long", long: 1200 }), [800, 1200]);
  assert.deepEqual(fitSize(2400, 1600, { mode: "short", short: 800 }), [1200, 800]);
  assert.deepEqual(fitSize(3, 3, { mode: "pct", pct: 1 }), [1, 1]);
});

test("không phóng to ảnh nhỏ", () => {
  assert.deepEqual(fitSize(800, 600, { mode: "px", width: 1600, noUpscale: true }), [800, 600]);
  assert.deepEqual(fitSize(800, 600, { mode: "pct", pct: 200, noUpscale: true }), [800, 600]);
  assert.deepEqual(fitSize(800, 600, { mode: "pct", pct: 200 }), [1600, 1200]);
  assert.deepEqual(fitSize(800, 600, { mode: "px", width: 2000, height: 300, keep: false, noUpscale: true }), [800, 120]);
});

test("xoay, lật: kích thước và vị trí góc", () => {
  assert.deepEqual(rotatedSize(40, 30, 90), [30, 40]);
  assert.deepEqual(rotatedSize(40, 30, -90), [30, 40]);
  assert.deepEqual(rotatedSize(40, 30, 180), [40, 30]);
  assert.equal(normRot(-90), 270);
  assert.equal(normRot(450), 90);
  const w = 40, h = 30;
  // góc trên trái (0,0) của ảnh gốc đi đâu
  const at = (rot, fh, fv) => { const o = orientMatrix(w, h, rot, fh, fv); return [o.width, o.height, ...apply(o.m, 0, 0)]; };
  assert.deepEqual(at(0, false, false), [40, 30, 0, 0]);
  assert.deepEqual(at(90, false, false), [30, 40, 30, 0]);   // xoay phải: góc trên trái sang góc trên phải
  assert.deepEqual(at(180, false, false), [40, 30, 40, 30]);
  assert.deepEqual(at(270, false, false), [30, 40, 0, 40]);  // xoay trái: sang góc dưới trái
  assert.deepEqual(at(0, true, false), [40, 30, 40, 0]);
  assert.deepEqual(at(0, false, true), [40, 30, 0, 30]);
  assert.deepEqual(at(90, true, false), [30, 40, 0, 0]);
  // mọi góc của ảnh đều nằm trong khung đích
  for (const rot of [0, 90, 180, 270]) for (const fh of [false, true]) for (const fv of [false, true]) {
    const o = orientMatrix(w, h, rot, fh, fv);
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      const [X, Y] = apply(o.m, x, y);
      assert.ok(X >= 0 && X <= o.width && Y >= 0 && Y <= o.height, `${rot} ${fh} ${fv}: ${X},${Y}`);
    }
  }
});

test("khung cắt giữa ảnh theo tỉ lệ", () => {
  assert.deepEqual(centeredRect(400, 300, 1), { x: 50, y: 0, w: 300, h: 300 });
  assert.deepEqual(centeredRect(400, 300, 16 / 9), { x: 0, y: 37.5, w: 400, h: 225 });
  assert.deepEqual(centeredRect(400, 300, 0), { x: 0, y: 0, w: 400, h: 300 });
  assert.deepEqual(centeredRect(400, 300, 1, 0.5), { x: 125, y: 75, w: 150, h: 150 });
});

test("giữ khung trong ảnh", () => {
  assert.deepEqual(clampRect({ x: -10, y: 280, w: 100, h: 50 }, 400, 300), { x: 0, y: 250, w: 100, h: 50 });
  assert.deepEqual(clampRect({ x: 0, y: 0, w: 900, h: 50 }, 400, 300), { x: 0, y: 0, w: 400, h: 50 });
  assert.deepEqual(moveRect({ x: 10, y: 10, w: 100, h: 100 }, 500, -50, 400, 300), { x: 300, y: 0, w: 100, h: 100 });
  assert.deepEqual(roundRect({ x: 10.4, y: 0.6, w: 99.4, h: 50.2 }), { x: 10, y: 1, w: 100, h: 50 });
});

test("kéo góc, cạnh khung cắt tự do", () => {
  const r = { x: 100, y: 100, w: 100, h: 100 };
  assert.deepEqual(resizeRect(r, "se", 50, 20, 400, 300), { x: 100, y: 100, w: 150, h: 120 });
  assert.deepEqual(resizeRect(r, "nw", -30, -200, 400, 300), { x: 70, y: 0, w: 130, h: 200 });
  assert.deepEqual(resizeRect(r, "e", 500, 0, 400, 300), { x: 100, y: 100, w: 300, h: 100 });
  // kéo quá cạnh đối diện: dừng ở cỡ tối thiểu
  assert.deepEqual(resizeRect(r, "w", 300, 0, 400, 300, 0, 8), { x: 192, y: 100, w: 8, h: 100 });
});

test("kéo khung cắt giữ tỉ lệ", () => {
  const r = { x: 100, y: 100, w: 100, h: 100 };
  const a = resizeRect(r, "se", 50, 10, 400, 300, 1);
  assert.equal(a.w, a.h);
  assert.deepEqual([a.x, a.y], [100, 100]);
  // không vượt ra ngoài ảnh
  const b = resizeRect(r, "se", 400, 400, 400, 300, 1);
  assert.deepEqual(b, { x: 100, y: 100, w: 200, h: 200 });
  const c = resizeRect({ x: 0, y: 0, w: 160, h: 90 }, "e", 100, 0, 400, 300, 16 / 9);
  assert.ok(Math.abs(c.w / c.h - 16 / 9) < 1e-9);
  assert.ok(c.y >= 0 && c.y + c.h <= 300 && c.x + c.w <= 400);
  const d = resizeRect({ x: 150, y: 100, w: 100, h: 100 }, "n", 0, -500, 400, 300, 1);
  assert.ok(Math.abs(d.w - d.h) < 1e-9 && d.y >= 0 && d.x >= 0 && d.x + d.w <= 400, JSON.stringify(d));
});

test("đổi tỉ lệ khung đang có", () => {
  const r = applyRatio({ x: 100, y: 50, w: 200, h: 200 }, 16 / 9, 400, 300);
  assert.ok(Math.abs(r.w / r.h - 16 / 9) < 1e-9);
  assert.ok(Math.abs(r.x + r.w / 2 - 200) < 1e-9 && Math.abs(r.y + r.h / 2 - 150) < 1e-9);
  const big = applyRatio({ x: 0, y: 0, w: 400, h: 300 }, 1, 400, 300);
  assert.deepEqual(big, { x: 50, y: 0, w: 300, h: 300 });
});


test("chia lưới: các ô khít nhau, phủ kín ảnh", () => {
  const t = gridTiles(1001, 700, 2, 3);
  assert.equal(t.length, 6);
  assert.equal(t.reduce((s, x) => s + x.w * x.h, 0), 1001 * 700);
  assert.deepEqual(t[0], { row: 0, col: 0, x: 0, y: 0, w: 334, h: 350 });
  assert.deepEqual(t[5], { row: 1, col: 2, x: 667, y: 350, w: 334, h: 350 });
  for (const a of t) assert.ok(a.x + a.w <= 1001 && a.y + a.h <= 700);
});

test("ghép ngang: cùng chiều cao, có khoảng cách", () => {
  const L = mergeLayout([[400, 300], [200, 300], [800, 600]], { dir: "h", gap: 10 });
  assert.equal(L.H, 600 + 20);
  assert.deepEqual(L.cells.map((c) => [c.x, c.y, c.w, c.h]), [[10, 10, 800, 600], [820, 10, 400, 600], [1230, 10, 800, 600]]);
  assert.equal(L.W, 2040);
});

test("ghép dọc không cùng cỡ: căn giữa", () => {
  const L = mergeLayout([[400, 300], [200, 100]], { dir: "v", gap: 0, match: false });
  assert.deepEqual([L.W, L.H], [400, 400]);
  assert.deepEqual(L.cells.map((c) => [c.x, c.y, c.w, c.h]), [[0, 0, 400, 300], [100, 300, 200, 100]]);
});

test("ghép lưới: cắt vừa ô và giới hạn kích thước", () => {
  const L = mergeLayout([[400, 400], [800, 400], [400, 800]], { dir: "grid", cols: 2, cell: 100, gap: 0, fit: "cover" });
  assert.deepEqual([L.W, L.H], [200, 200]);
  assert.deepEqual(L.cells[1], { x: 100, y: 0, w: 100, h: 100, sx: 200, sy: 0, sw: 400, sh: 400 });
  const C = mergeLayout([[400, 400], [800, 400]], { dir: "grid", cols: 2, cell: 100, gap: 0, fit: "contain" });
  assert.deepEqual(C.cells[1], { x: 100, y: 25, w: 100, h: 50, sx: 0, sy: 0, sw: 800, sh: 400 });
  const M = mergeLayout([[4000, 3000], [4000, 3000]], { dir: "h", gap: 0, max: 4000 });
  assert.deepEqual([M.W, M.H], [4000, 1500]);
});
