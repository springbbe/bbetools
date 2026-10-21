import { test } from "node:test";
import assert from "node:assert/strict";
import { diffSeq, diffText, tokenize } from "../assets/lib/diff.js";

const apply = (parts) => ({ a: parts.filter((p) => p.op !== "+").map((p) => p.items.join("")).join(""), b: parts.filter((p) => p.op !== "-").map((p) => (p.right || p.items).join("")).join("") });

test("Myers: đoạn ngắn nhất", () => {
  const r = diffSeq([..."ABCABBA"], [..."CBABAC"]);
  const edits = r.filter((p) => p.op !== "=").reduce((n, p) => n + p.items.length, 0);
  assert.equal(edits, 5);
  assert.deepEqual(diffSeq([], []), []);
  assert.deepEqual(diffSeq(["a"], []), [{ op: "-", items: ["a"] }]);
});

test("so sánh theo dòng, từ, ký tự và dựng lại được hai bản", () => {
  const A = "Hà Nội\nmùa thu\ncây cơm nguội\n", B = "Hà Nội\nmùa xuân\ncây cơm nguội\nphố cổ\n";
  for (const by of ["line", "word", "char"]) {
    const r = diffText(A, B, { by });
    const x = apply(r.parts);
    assert.equal(x.a, A, by); assert.equal(x.b, B, by);
  }
  const l = diffText(A, B, { by: "line" });
  assert.equal(l.added, 2); assert.equal(l.removed, 1);
  const w = diffText("tôi đi học", "tôi đi làm", { by: "word" });
  assert.deepEqual(w.parts.filter((p) => p.op !== "=").map((p) => p.op + p.items.join("")), ["-học", "+làm"]);
});

test("bỏ qua hoa/thường, khoảng trắng", () => {
  assert.equal(diffText("Xin  Chào\n", "xin chào\n", { by: "line", ignoreCase: true, ignoreSpace: true }).added, 0);
  assert.equal(diffText("a\n", "a", { by: "line" }).added, 0);
  assert.deepEqual(tokenize("a, b", "word"), ["a", ",", " ", "b"]);
});

test("văn bản dài khác nhiều vẫn chạy nhanh", () => {
  const a = Array.from({ length: 3000 }, (_, i) => "dòng " + i).join("\n");
  const b = Array.from({ length: 3000 }, (_, i) => (i % 3 ? "dòng " + i : "khác " + i)).join("\n");
  const t = Date.now();
  const r = diffText(a, b);
  assert.ok(Date.now() - t < 3000);
  const x = apply(r.parts);
  assert.equal(x.a, a); assert.equal(x.b, b);
});
