import { test } from "node:test";
import assert from "node:assert/strict";
import { CARD, turnQuad, landscapeTurns, cornerFix, layoutCards, toneCard, stampFit, splitStamp } from "../assets/lib/the-cccd.js";

const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} ${a} ≈ ${b}`);

test("xoay thứ tự góc và tự chọn hướng nằm ngang", () => {
  const q = [[0, 0], [10, 0], [10, 20], [0, 20]];
  assert.deepEqual(turnQuad(q, 1), [[0, 20], [0, 0], [10, 0], [10, 20]]);
  assert.deepEqual(turnQuad(q, 4), q);
  assert.deepEqual(turnQuad(q, -1), turnQuad(q, 3));
  assert.equal(landscapeTurns(q), 1); // thẻ đứng → xoay 1 lần
  assert.equal(landscapeTurns(turnQuad(q, 1)), 0);
  assert.equal(landscapeTurns([[0, 0], [856, 0], [856, 540], [0, 540]]), 0);
});

test("bù góc bo tròn: 4 điểm trên cung tròn → 4 góc thật của thẻ", () => {
  const k = 10, d = CARD.r * (1 - Math.SQRT1_2);
  // thẻ thẳng, 10 px/mm, đặt ở (100, 50)
  const found = [[100 + d * k, 50 + d * k], [100 + (CARD.w - d) * k, 50 + d * k], [100 + (CARD.w - d) * k, 50 + (CARD.h - d) * k], [100 + d * k, 50 + (CARD.h - d) * k]];
  const fixed = cornerFix(found);
  const want = [[100, 50], [100 + CARD.w * k, 50], [100 + CARD.w * k, 50 + CARD.h * k], [100, 50 + CARD.h * k]];
  fixed.forEach((p, i) => { near(p[0], want[i][0], 1e-6, "x" + i); near(p[1], want[i][1], 1e-6, "y" + i); });
  // điểm dò được nở ra ngoài, không co vào
  assert.ok(fixed[0][0] < found[0][0] && fixed[2][1] > found[2][1]);
});

test("xếp 1 bộ trên – dưới ở giữa trang A4", () => {
  const L = layoutCards({ copies: 1, arrange: "stack", gap: 12 });
  assert.equal(L.length, 2);
  near(L[0].x, (210 - 85.6) / 2, 1e-9, "căn giữa ngang");
  near(L[1].y - L[0].y, 54 + 12, 1e-9, "mặt sau ngay dưới");
  near(L[0].y + (L[1].y + 54 - L[0].y) / 2, 297 / 2, 1e-9, "căn giữa dọc");
  assert.deepEqual(L.map((c) => c.side), [0, 1]);
  const top = layoutCards({ copies: 1, arrange: "stack", pos: "top" });
  assert.equal(top[0].y, 25);
});

test("xếp nhiều bộ: vừa trang, không chồng nhau", () => {
  for (const arrange of ["stack", "side"]) for (const copies of [1, 2, 4]) {
    const L = layoutCards({ copies, arrange });
    assert.ok(L, `${arrange} × ${copies}`);
    assert.equal(L.length, copies * 2);
    for (const c of L) assert.ok(c.x >= 10 - 1e-9 && c.y >= 10 - 1e-9 && c.x + c.w <= 200 + 1e-9 && c.y + c.h <= 287 + 1e-9, `${arrange} × ${copies} ra ngoài lề`);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${arrange} × ${copies}: thẻ ${i} chồng ${j}`);
    }
  }
  // cạnh nhau: 2 mặt cùng hàng
  const S = layoutCards({ copies: 1, arrange: "side" });
  assert.equal(S[0].y, S[1].y);
  // chỉ một mặt
  assert.equal(layoutCards({ copies: 2, sides: 1 }).length, 2);
  // quá nhiều thì không vừa
  assert.equal(layoutCards({ copies: 12, arrange: "stack" }), null);
});

function img(w, h, f) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, [r, g, b] = f(x, y); data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255; }
  return { data, width: w, height: h };
}
const at = (im, x, y) => { const i = (y * im.width + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };

test("cân sáng: nền tối dần và ám vàng thành gần trắng đều, ảnh chân dung giữ tối", () => {
  // nền ám vàng tối dần sang phải; khối "chân dung" tối ở góc trái
  const im = img(160, 100, (x, y) => (x > 10 && x < 40 && y > 30 && y < 80 ? [60, 50, 45] : [200 - x * 0.5, 190 - x * 0.5, 150 - x * 0.4]));
  toneCard(im, "color");
  const l = at(im, 60, 10), r = at(im, 150, 90), face = at(im, 25, 55);
  assert.ok(l.every((v) => v > 225) && r.every((v) => v > 205), `nền ${l} ${r}`);
  assert.ok(Math.max(...l) - Math.min(...l) < 20, "nền gần trung tính " + l);
  assert.ok(face.every((v) => v < 120), "chân dung không bị bạc " + face);
  const g = img(20, 20, () => [180, 120, 90]);
  toneCard(g, "gray");
  const p = at(g, 5, 5);
  assert.ok(p[0] === p[1] && p[1] === p[2]);
  const n = img(4, 4, () => [10, 20, 30]);
  toneCard(n, "none");
  assert.deepEqual(at(n, 1, 1), [10, 20, 30]);
});

test("chữ chéo vừa trong thẻ và chia 2 dòng", () => {
  const { angle, size } = stampFit(856, 540, 900);
  assert.ok(angle < 0 && angle > -40);
  const a = (-angle * Math.PI) / 180, L = 9 * size;
  assert.ok(L * Math.cos(a) + 1.25 * size * Math.sin(a) <= 0.86 * 856 + 1e-6);
  assert.ok(size <= 540 / 7);
  assert.deepEqual(splitStamp("  Bản sao   "), ["Bản sao"]);
  assert.deepEqual(splitStamp(""), []);
  const two = splitStamp("Bản sao dùng để làm hồ sơ vay vốn ngân hàng");
  assert.equal(two.length, 2);
  assert.equal(two.join(" "), "Bản sao dùng để làm hồ sơ vay vốn ngân hàng");
  assert.ok(Math.abs(two[0].length - two[1].length) < 10);
});

test("tinh chỉnh góc: thẻ bo góc nghiêng trên nền tối → góc thật sai dưới 1 điểm ảnh", async () => {
  const { refineQuad } = await import("../assets/lib/the-cccd.js");
  const { toGray, detectCorners } = await import("../assets/lib/scan.js");
  const W = 600, H = 450, k = 5.5, a = (4 * Math.PI) / 180, cx = 300, cy = 225;
  // góc thật của thẻ (chưa bo), xoay 4°
  const rot = ([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  const hw = (CARD.w * k) / 2, hh = (CARD.h * k) / 2, R = CARD.r * k;
  const truth = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(rot);
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // khử xoay, đo trong toạ độ thẻ; siêu lấy mẫu 4×4 để mép mịn như ảnh chụp
    let cov = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const px = x + (sx + 0.5) / 4 - cx, py = y + (sy + 0.5) / 4 - cy;
      const u = px * Math.cos(a) + py * Math.sin(a), v = -px * Math.sin(a) + py * Math.cos(a);
      const dx = Math.max(Math.abs(u) - (hw - R), 0), dy = Math.max(Math.abs(v) - (hh - R), 0);
      if (Math.abs(u) <= hw && Math.abs(v) <= hh && dx * dx + dy * dy <= R * R) cov++;
    }
    const val = 55 + ((x * 7 + y * 3) % 9) + (cov / 16) * 170, i = (y * W + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = val; data[i + 3] = 255;
  }
  const g = toGray({ data, width: W, height: H });
  const rough = detectCorners(g, W, H);
  assert.ok(rough);
  const fine = refineQuad(g, W, H, rough);
  assert.ok(fine);
  fine.forEach((p, i) => assert.ok(Math.hypot(p[0] - truth[i][0], p[1] - truth[i][1]) < 1, `góc ${i}: ${p.map((v) => v.toFixed(2))} ≠ ${truth[i].map((v) => v.toFixed(2))}`));
  // ảnh trơn (không có mép) → không chắc → null
  assert.equal(refineQuad(new Uint8Array(W * H).fill(120), W, H, rough), null);
});

test("tinh chỉnh góc: chữ đậm sát mép thẻ không kéo lệch cạnh", async () => {
  const { refineQuad } = await import("../assets/lib/the-cccd.js");
  const W = 400, H = 300, g = new Uint8Array(W * H).fill(60);
  // thẻ thẳng (50,50)–(350,240), dòng chữ đen dày sát mép dưới (cách mép 6 px)
  for (let y = 50; y < 240; y++) for (let x = 50; x < 350; x++) g[y * W + x] = 235;
  for (let y = 226; y < 234; y++) for (let x = 60; x < 340; x++) if (x % 12 < 8) g[y * W + x] = 10;
  const q = refineQuad(g, W, H, [[55, 56], [344, 53], [347, 236], [52, 230]]);
  assert.ok(q);
  const want = [[50, 50], [350, 50], [350, 240], [50, 240]];
  // mép tính theo quy ước toạ độ = chỉ số điểm ảnh, bước đổi nằm giữa 2 điểm ảnh → lệch 0,5
  q.forEach((p, i) => assert.ok(Math.hypot(p[0] - want[i][0], p[1] - want[i][1]) < 1.5, `góc ${i}: ${p.map((v) => v.toFixed(2))}`));
});
