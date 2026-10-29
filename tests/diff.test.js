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

test("tỉ lệ giống nhau và đếm dòng sửa/thêm/bớt", async () => {
  const { similarity, lineStats } = await import("../assets/lib/diff.js");
  assert.equal(similarity(diffText("abc", "abc", { by: "char" }).parts), 1);
  assert.equal(similarity(diffText("", "", { by: "char" }).parts), 1);
  assert.equal(similarity(diffText("abcd", "wxyz", { by: "char" }).parts), 0);
  assert.equal(similarity(diffText("ab", "abcd", { by: "char" }).parts), 4 / 6);
  // khoảng trắng không tính
  assert.equal(similarity(diffText("a b\n", "a  b\n", { by: "word" }).parts), 1);
  const s = lineStats(diffText("a\nb\nc\nd\n", "a\nB\nc\nd\ne\nf\n").parts);
  assert.deepEqual(s, { same: 3, changed: 1, added: 2, removed: 0, hunks: 2 });
  assert.deepEqual(lineStats(diffText("a\nb\nc\n", "c\n").parts), { same: 1, changed: 0, added: 0, removed: 2, hunks: 1 });
});
