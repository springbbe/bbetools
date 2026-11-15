/* Bài hướng dẫn: content/huong-dan/<slug>.md → trang huong-dan/<slug>/ (chỉ tiếng Việt).
   Frontmatter: title, desc (≤ 155 ký tự), tools (mảng id, phần tử đầu là công cụ chính), data (tuỳ chọn, tên file trong data/),
   updated (YYYY-MM-DD). Liên kết tới công cụ: [Tên công cụ](tool:id). Dùng chung cho build.js, check.js và test. */
import { readFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { ROOT } from "./registry.js";
import { frontmatter, markdown } from "./markdown.js";

export const ARTICLE_DIR = "content/huong-dan/";
export const ARTICLE_URL = "huong-dan/";
export const REQUIRED = ["title", "desc", "tools", "updated"];
export const MAX_TITLE = 60, MAX_DESC = 155;

/** Đọc mọi bài: [{ slug, file, meta, body, links: [{ id, text }] }] sắp theo updated mới nhất trước (cùng ngày thì theo tên) */
export async function loadArticles() {
  if (!existsSync(ROOT + ARTICLE_DIR)) return [];
  const names = (await readdir(ROOT + ARTICLE_DIR)).filter((n) => n.endsWith(".md")).sort();
  const list = [];
  for (const n of names) {
    const src = await readFile(ROOT + ARTICLE_DIR + n, "utf8");
    const { meta, body } = frontmatter(src);
    const links = [...body.matchAll(/\[([^\]]+)\]\(tool:([^)\s]*)\)/g)].map((m) => ({ text: m[1], id: m[2] }));
    list.push({ slug: n.replace(/\.md$/, ""), file: ARTICLE_DIR + n, meta, body, links,
      tools: Array.isArray(meta.tools) ? meta.tools : [], data: Array.isArray(meta.data) ? meta.data : [] });
  }
  return list.sort((a, b) => String(b.meta.updated || "").localeCompare(String(a.meta.updated || "")) || a.slug.localeCompare(b.slug));
}

/** Lỗi khiến build không chạy được: công cụ không tồn tại hoặc chưa "done" */
export function linkErrors(articles, reg) {
  const byId = Object.fromEntries(reg.tools.map((t) => [t.id, t]));
  const errs = [];
  for (const a of articles) {
    for (const id of new Set([...a.tools, ...a.links.map((l) => l.id)])) {
      const t = byId[id];
      if (!t) errs.push(`${a.file}: công cụ "${id}" không tồn tại`);
      else if (t.status !== "done") errs.push(`${a.file}: công cụ "${id}" chưa "done" (đang "${t.status}")`);
    }
  }
  return errs;
}

/** Kiểm tra đầy đủ cho check.js: { errors, warnings } */
export function validateArticles(articles, reg) {
  const byId = Object.fromEntries(reg.tools.map((t) => [t.id, t]));
  const errors = [...linkErrors(articles, reg)], warnings = [];
  for (const a of articles) {
    const { meta } = a, where = a.file;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) errors.push(`${where}: tên file (slug) chỉ gồm a-z, 0-9 và dấu -`);
    for (const k of REQUIRED) if (meta[k] == null || meta[k] === "" || (Array.isArray(meta[k]) && !meta[k].length)) errors.push(`${where}: thiếu "${k}" trong frontmatter`);
    if ("data" in meta && !Array.isArray(meta.data)) errors.push(`${where}: "data" phải là mảng [tên-file, …]`);
    if (meta.tools != null && !Array.isArray(meta.tools)) errors.push(`${where}: "tools" phải là mảng [id, …]`);
    if (typeof meta.title === "string" && [...meta.title].length > MAX_TITLE) errors.push(`${where}: title dài ${[...meta.title].length} ký tự (tối đa ${MAX_TITLE})`);
    if (typeof meta.desc === "string" && [...meta.desc].length > MAX_DESC) errors.push(`${where}: desc dài ${[...meta.desc].length} ký tự (tối đa ${MAX_DESC})`);
    if (meta.updated && !/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) errors.push(`${where}: updated phải có dạng YYYY-MM-DD`);
    for (const l of a.links) {
      const t = byId[l.id];
      if (t && l.text !== t.name) errors.push(`${where}: liên kết [${l.text}](tool:${l.id}) phải ghi đúng tên công cụ "${t.name}"`);
    }
    for (const d of a.data) {
      const p = ROOT + `data/${d}.json`;
      if (!existsSync(p)) { errors.push(`${where}: file dữ liệu data/${d}.json không tồn tại`); continue; }
      let j = {};
      try { j = JSON.parse(readFileSync(p, "utf8")); } catch (e) { errors.push(`data/${d}.json: ${e.message}`); continue; }
      if (j.updated && meta.updated && j.updated > meta.updated) warnings.push(`${where}: data/${d}.json cập nhật ${j.updated}, mới hơn bài (${meta.updated}) → rà lại số liệu trong bài rồi sửa "updated"`);
    }
  }
  const slugs = new Set();
  for (const a of articles) { if (slugs.has(a.slug)) errors.push(`${a.file}: trùng slug`); slugs.add(a.slug); }
  return { errors, warnings };
}

/** Markdown của bài → HTML. toolHref(id) trả về đường dẫn tới trang công cụ. */
export function renderArticle(a, toolHref) {
  return markdown(a.body, {
    link: (u) => (u.startsWith("tool:") ? toolHref(u.slice(5)) : /^(https?:|mailto:|#)/.test(u) ? u : null),
    table: (t) => `<div class="tbl-wrap" role="region" aria-label="Bảng" tabindex="0">${t}</div>`,
    olClass: "steps"
  });
}
