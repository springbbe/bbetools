import { test } from "node:test";
import assert from "node:assert/strict";
import { frontmatter, markdown, slugify } from "../scripts/markdown.js";
import { loadArticles, validateArticles, linkErrors } from "../scripts/articles.js";
import { loadRegistry } from "../scripts/registry.js";

const reg = await loadRegistry();

test("frontmatter: chuỗi, mảng, bỏ ngoặc kép", () => {
  const { meta, body } = frontmatter("---\ntitle: \"A: b\"\ntools: [merge-pdf, split-pdf]\nupdated: 2026-11-13\n---\n\nXin chào");
  assert.equal(meta.title, "A: b");
  assert.deepEqual(meta.tools, ["merge-pdf", "split-pdf"]);
  assert.equal(meta.updated, "2026-11-13");
  assert.equal(body.trim(), "Xin chào");
});

test("markdown: tiêu đề, đoạn, danh sách, bảng, đậm, liên kết, thoát HTML", () => {
  const md = `Mở đầu <b>x</b> & **đậm** [Ghép PDF](tool:merge-pdf).
nối dòng

## Bảng giá
| A | B |
|---|---:|
| 1 | 2 |

### Bước
1. Một
2. Hai

- x
- [ngoài](https://example.com)
- [lạ](javascript:alert(1))`;
  const { html, headings } = markdown(md, { link: (u) => (u.startsWith("tool:") ? "../" + u.slice(5) + "/" : /^https?:/.test(u) ? u : null), olClass: "steps" });
  assert.match(html, /<p>Mở đầu &lt;b&gt;x&lt;\/b&gt; &amp; <strong>đậm<\/strong> <a href="\.\.\/merge-pdf\/">Ghép PDF<\/a>\. nối dòng<\/p>/);
  assert.match(html, /<h2 id="bang-gia">Bảng giá<\/h2>/);
  assert.match(html, /<table class="tbl"><thead><tr><th scope="col">A<\/th><th scope="col" style="text-align:right">B<\/th>/);
  assert.match(html, /<ol class="steps"><li>Một<\/li><li>Hai<\/li><\/ol>/);
  assert.match(html, /<a href="https:\/\/example\.com" rel="noopener">ngoài<\/a>/);
  assert.ok(!html.includes("javascript:"), "liên kết không hợp lệ chỉ còn chữ");
  assert.deepEqual(headings.map((h) => h.id), ["bang-gia", "buoc"]);
});

test("slugify bỏ dấu tiếng Việt", () => {
  assert.equal(slugify("Đổi nhanh ra héc-ta"), "doi-nhanh-ra-hec-ta");
});

test("mọi bài hướng dẫn hợp lệ", async () => {
  const list = await loadArticles();
  assert.ok(list.length >= 30);
  assert.deepEqual(validateArticles(list, reg).errors, []);
});

test("bắt lỗi công cụ không tồn tại, sai tên hiển thị, thiếu trường, quá dài", () => {
  const a = { slug: "thu", file: "thu.md", meta: { title: "x".repeat(61), desc: "d", tools: ["khong-co"], updated: "2026-01-01" },
    tools: ["khong-co"], data: ["khong-co-file"], links: [{ id: "merge-pdf", text: "Gộp PDF" }], body: "" };
  const { errors } = validateArticles([a], reg);
  assert.ok(errors.some((e) => e.includes('"khong-co" không tồn tại')));
  assert.ok(errors.some((e) => e.includes("phải ghi đúng tên công cụ")));
  assert.ok(errors.some((e) => e.includes("title dài 61")));
  assert.ok(errors.some((e) => e.includes("data/khong-co-file.json")));
  const b = { ...a, meta: { title: "t" }, tools: [], links: [], data: [] };
  assert.ok(validateArticles([b], reg).errors.some((e) => e.includes('thiếu "desc"')));
  const todo = reg.tools.find((t) => t.status !== "done");
  if (todo) assert.equal(linkErrors([{ ...b, tools: [todo.id] }], reg).length, 1);
});
