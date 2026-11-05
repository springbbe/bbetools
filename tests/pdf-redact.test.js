import { test } from "node:test";
import assert from "node:assert/strict";
import { PATTERNS, textRect, mergeLine, toShare, sameBox } from "../assets/lib/pdf-redact.js";
import { findPattern } from "../assets/lib/pdf-text.js";

const texts = (re, s) => [...s.matchAll(new RegExp(re.source, re.flags))].map((m) => m[0]);

test("mẫu dãy 9–12 chữ số", () => {
  const re = PATTERNS.number.re;
  assert.deepEqual(texts(re, "Số CCCD: 001090012345, cấp 10/08/2021"), ["001090012345"]);
  assert.deepEqual(texts(re, "ĐT 0912 345 678 hoặc 0987.654.321"), ["0912 345 678", "0987.654.321"]);
  assert.deepEqual(texts(re, "CMND 123456789"), ["123456789"]);
  assert.deepEqual(texts(re, "mã 12345678 và 1234567890123"), []); // 8 và 13 chữ số
  assert.deepEqual(texts(re, "HĐ-2026/0815 ngày 01/11/2026"), []);
  assert.deepEqual(texts(re, "AB123456789"), []); // dính chữ cái
  assert.deepEqual(texts(PATTERNS.longnum.re, "STK 1903 4567 8901 23"), ["1903 4567 8901 23"]);
  assert.deepEqual(texts(re, "STK 1903 4567 8901 23"), []); // không bắt một phần của dãy dài hơn
  assert.deepEqual(texts(re, "số 15.000.000 và 150.000.000 đồng"), ["150.000.000"]);
  assert.deepEqual(texts(PATTERNS.email.re, "Email: nguyenvanmau@example.com."), ["nguyenvanmau@example.com"]);
});

test("findPattern: số bị tách thành nhiều mảnh", () => {
  const strs = ["Số CCCD: 0010", "90012345", " cấp ngày"];
  const r = findPattern(strs, PATTERNS.number.re);
  assert.equal(r.length, 1);
  assert.equal(r[0].text, "001090012345");
  assert.deepEqual(r[0].parts, [{ item: 0, start: 9, end: 13 }, { item: 1, start: 0, end: 8 }]);
  // mảnh có xuống dòng → thêm dấu cách, không nối số của hai dòng thành một
  assert.equal(findPattern(["0912345", "678901"], PATTERNS.number.re, [true, false]).length, 0);
});

test("textRect: chữ ngang trên trang A4 (viewport lật trục y)", () => {
  // viewport scale 1, trang cao 842: (x, y) PDF → (x, 842 − y)
  const vt = [1, 0, 0, -1, 0, 842];
  const it = { str: "0123456789", transform: [12, 0, 0, 12, 100, 700], width: 60, height: 12 };
  const r = textRect(it, 2, 5, vt, null, 0);
  assert.ok(Math.abs(r.x - 112) < 1e-9 && Math.abs(r.w - 18) < 1e-9);
  assert.ok(Math.abs(r.y - (842 - 700 - 1.15 * 12)) < 1e-9);
  assert.ok(Math.abs(r.h - 1.45 * 12) < 1e-9);
  // chữ xoay 90° (trang in ngang): khung vẫn bao đúng phía của dòng chữ
  const rot = { str: "abcd", transform: [0, 10, -10, 0, 300, 100], width: 40, height: 10 };
  const q = textRect(rot, 0, 4, [1, 0, 0, 1, 0, 0], null, 0);
  // đo độ rộng thật: "ii" hẹp, "WW" rộng → khung của "WW" lệch về sau
  const m = (s) => [...s].reduce((a, c) => a + (c === "i" ? 1 : 4), 0);
  const w2 = textRect({ str: "iiWW", transform: [10, 0, 0, 10, 0, 0], width: 100 }, 2, 4, [1, 0, 0, 1, 0, 0], m, 0);
  assert.ok(Math.abs(w2.x - 20) < 1e-9 && Math.abs(w2.w - 80) < 1e-9);
  assert.ok(Math.abs(q.y - 100) < 1e-9 && Math.abs(q.h - 40) < 1e-9);
  assert.ok(Math.abs(q.x - (300 - 11.5)) < 1e-9 && Math.abs(q.w - 14.5) < 1e-9);
});

test("gộp khung cùng dòng, đổi sang phần của trang", () => {
  const m = mergeLine([{ x: 10, y: 100, w: 30, h: 14 }, { x: 41, y: 101, w: 20, h: 14 }, { x: 10, y: 130, w: 30, h: 14 }]);
  assert.equal(m.length, 2);
  assert.deepEqual(m[0], { x: 10, y: 100, w: 51, h: 15 });
  assert.deepEqual(toShare({ x: -5, y: 10, w: 25, h: 10 }, 100, 200), { x: 0, y: 0.05, w: 0.2, h: 0.05 });
  assert.equal(toShare({ x: 120, y: 10, w: 5, h: 5 }, 100, 200), null);
  assert.ok(sameBox({ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }, { x: 0.1005, y: 0.2, w: 0.3, h: 0.05 }));
});
