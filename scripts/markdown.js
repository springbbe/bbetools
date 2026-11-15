/* Bộ chuyển Markdown tối thiểu cho bài hướng dẫn (content/huong-dan/*.md), không cần thư viện ngoài.
   Hỗ trợ: frontmatter (key: giá trị, mảng [a, b]), ## h2, ### h3, đoạn văn, danh sách có/không đánh số,
   bảng (| a | b | + dòng |---|), **đậm**, [chữ](liên kết). Mọi ký tự HTML được thoát.
   Liên kết đặc biệt [Tên](tool:id) do hàm link() của người gọi đổi thành đường dẫn thật. */

export const escHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Tách frontmatter: trả về { meta, body } */
export function frontmatter(src) {
  src = src.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((x) => unquote(x.trim())).filter(Boolean);
    else v = unquote(v);
    meta[kv[1]] = v;
  }
  return { meta, body: src.slice(m[0].length) };
}
const unquote = (s) => (/^(["']).*\1$/.test(s) ? s.slice(1, -1) : s);

/** Bỏ dấu, chữ thường, nối bằng "-" (dùng làm id cho tiêu đề) */
export const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Liên kết trong chữ: [chữ](url). link(url, text) trả về href (chuỗi) hoặc null nếu không hợp lệ. */
function inline(text, link) {
  // tách liên kết trước khi thoát HTML để giữ nguyên URL
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    parts.push(fmt(text.slice(last, m.index)));
    const href = link(m[2], m[1]);
    const label = fmt(m[1]);
    if (href == null) parts.push(label);
    else {
      const ext = /^https?:/.test(href);
      parts.push(`<a href="${escHtml(href)}"${ext ? ' rel="noopener"' : ""}>${label}</a>`);
    }
    last = m.index + m[0].length;
  }
  parts.push(fmt(text.slice(last)));
  return parts.join("");
}
const fmt = (s) => escHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isSep = (line) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line.trim());

/**
 * Markdown → { html, headings: [{ level, text, id }], blocks: [html của từng khối] }
 * opts.link(url, text) → href | null; opts.table(html) bọc bảng (mặc định trả nguyên)
 */
export function markdown(body, opts = {}) {
  const link = opts.link || ((u) => u);
  const wrapTable = opts.table || ((t) => t);
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [], headings = [], used = new Set();
  let i = 0;
  const isBlockStart = (l) => /^#{2,3}\s/.test(l) || /^\s*([-*]|\d+\.)\s+/.test(l) || /^\|/.test(l.trim());
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const hm = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (hm) {
      const level = hm[1].length, text = hm[2];
      let id = slugify(text) || "muc", n = 1;
      while (used.has(id)) id = slugify(text) + "-" + ++n;
      used.add(id);
      headings.push({ level, text, id });
      blocks.push(`<h${level} id="${id}">${inline(text, link)}</h${level}>`);
      i++; continue;
    }
    if (/^\|/.test(line.trim()) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-:$/.test(c) ? "right" : null));
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) rows.push(cells(lines[i++]));
      const td = (tag, c, k) => `<${tag}${tag === "th" ? ' scope="col"' : ""}${align[k] ? ` style="text-align:${align[k]}"` : ""}>${inline(c, link)}</${tag}>`;
      blocks.push(wrapTable(`<table class="tbl"><thead><tr>${head.map((c, k) => td("th", c, k)).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${head.map((_, k) => td("td", r[k] || "", k)).join("")}</tr>`).join("")}</tbody></table>`));
      continue;
    }
    const lm = /^\s*([-*]|\d+\.)\s+/.exec(line);
    if (lm) {
      const ordered = /\d/.test(lm[1]);
      const items = [];
      while (i < lines.length) {
        const m = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (m && /\d/.test(m[1]) === ordered) { items.push(m[2]); i++; continue; }
        // dòng nối tiếp của mục trước (thụt vào, không phải khối mới)
        if (lines[i].trim() && /^\s+/.test(lines[i]) && !isBlockStart(lines[i]) && items.length) { items[items.length - 1] += " " + lines[i].trim(); i++; continue; }
        break;
      }
      const tag = ordered ? "ol" : "ul";
      const cls = ordered && opts.olClass ? ` class="${opts.olClass}"` : "";
      blocks.push(`<${tag}${cls}>${items.map((x) => `<li>${inline(x, link)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++].trim());
    if (para.length) blocks.push(`<p>${inline(para.join(" "), link)}</p>`);
    else i++; // dòng lạ (vd. "|" lẻ) → bỏ qua
  }
  return { html: blocks.join("\n"), headings, blocks };
}
