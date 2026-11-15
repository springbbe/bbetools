#!/usr/bin/env node
/* Kiểm tra trước khi commit:  node scripts/check.js
   1. tools.json hợp lệ (id/slug không trùng, nhóm, related, file JS của công cụ đã xong…)
   2. các trang sinh ra khớp tools.json (build --check)
   3. mọi đường dẫn trong HTML/JS/CSS là tương đối và trỏ tới file có thật; không có đường dẫn tuyệt đối "/..."
   4. mỗi trang có <title> dạng "… – BbeTools", meta description, canonical, JSON-LD hợp lệ, đúng lang
   5. bản dịch đầy đủ (build --check báo câu, chuỗi JS, công cụ chưa dịch; xem scripts/i18n.js)
   6. bài hướng dẫn (content/huong-dan/): đủ frontmatter, title ≤ 60, desc ≤ 155 ký tự, công cụ và file dữ liệu có thật,
      tên hiển thị của liên kết [Tên](tool:id) đúng tên công cụ; cảnh báo khi file dữ liệu mới hơn bài
   7. FAQ: mọi công cụ "done" có ít nhất 3 câu; không lặp câu "có bị tải lên…" (dòng quyền riêng tư đã có dưới tiêu đề);
      không có câu trả lời giống hệt nhau ở từ 3 công cụ trở lên. Meta description không trang nào bị cắt dở ("…" ở cuối)
   8. dữ liệu data/*.json: công cụ đọc file nào (loadData("x") hoặc "data/x.json") phải khai báo trong trường "data";
      công cụ có "data" phải hiện dòng "Số liệu cập nhật … · Nguồn: …" (khung form tự làm, khung khác gọi sourceNote());
      file dữ liệu phải có title, updated (YYYY-MM-DD), source
   9. "howto": mọi tên nút trong ngoặc kép “…” phải có đúng chuỗi đó trong mã nguồn công cụ (kể cả module nó nhập);
      bản tiếng Anh đối chiếu với module đã dịch (assets/en/…). "…" trong tên nút là phần thay đổi; cụm sau "ví dụ" được bỏ qua
  10. từ ngữ thống nhất (scripts/wording.js) trong chuỗi hiển thị tiếng Việt: tools.json (trừ keywords), data/*.json, content/, chuỗi trong JS:
      "bấm" (không "nhấn/nhấp/click"), "máy chủ" (không "server"), "ví dụ"/"VD:" (không "vd."), "xoá/hoá", "tỉ lệ" */
import { readFile, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { ROOT, loadRegistry, validate } from "./registry.js";
import { LANGS } from "./i18n.js";
import { loadArticles, validateArticles, ARTICLE_URL } from "./articles.js";
import { toolSource, quoted, inSource } from "./sources.js";
import { wordingIssues, registryStrings } from "./wording.js";
import { keysOf, hasVi } from "./i18n.js";

const problems = [];
const bad = (file, msg) => problems.push(`${relative(ROOT, file)}: ${msg}`);

const reg = await loadRegistry();
validate(reg).forEach((e) => problems.push("tools.json: " + e));
const articles = await loadArticles();
const art = validateArticles(articles, reg);
problems.push(...art.errors);
const warnings = [...art.warnings];
{
  const enReg = JSON.parse(await readFile(ROOT + "i18n/en/tools.json", "utf8"));
  for (const t of reg.tools.filter((x) => x.status === "done")) {
    const vi = toolSource(t.id);
    for (const step of t.howto || []) for (const q of quoted(step)) if (!inSource(vi, q)) problems.push(`tools.json: ${t.id}: howto nhắc nút “${q}” nhưng mã nguồn công cụ không có chuỗi này`);
    const e = enReg.tools[t.id];
    if (e && !t.vnOnly) { const en = toolSource(t.id, "en"); for (const step of e.howto || []) for (const q of quoted(step)) if (!inSource(en, q)) problems.push(`i18n/en/tools.json: ${t.id}: howto nhắc nút “${q}” nhưng giao diện tiếng Anh không có chuỗi này`); }
  }
}
for (const t of reg.tools.filter((x) => x.status === "done")) {
  const p = ROOT + `assets/tools/${t.id}.js`;
  if (!existsSync(p)) continue;
  const src = await readFile(p, "utf8");
  const used = new Set([...src.matchAll(/loadData\(\s*["']([\w-]+)["']/g), ...src.matchAll(/["'`]data\/([\w-]+)\.json/g), ...src.matchAll(/ROOT \+ "data\/([\w-]+)\.json/g)].map((m) => m[1]));
  for (const d of used) if (!(t.data || []).includes(d)) problems.push(`tools.json: ${t.id} đọc data/${d}.json nhưng chưa khai báo trong "data" (để hiện dòng nguồn số liệu)`);
  if ((t.data || []).length && t.kind !== "form" && !src.includes("sourceNote(")) problems.push(`assets/tools/${t.id}.js: công cụ có "data" nhưng không hiện dòng nguồn số liệu (gọi sourceNote() từ core.js, đặt dưới phần kết quả)`);
  for (const d of t.data || []) {
    let j = null;
    try { j = JSON.parse(await readFile(ROOT + `data/${d}.json`, "utf8")); } catch (e) { problems.push(`data/${d}.json: ${e.message}`); continue; }
    if (!j.title || !j.source || !/^\d{4}-\d{2}-\d{2}$/.test(j.updated || "")) problems.push(`data/${d}.json: cần "title", "source" và "updated" dạng YYYY-MM-DD`);
  }
}
{
  const live = reg.tools.filter((t) => t.status === "done");
  const answers = new Map();
  for (const t of live) {
    const faq = t.faq || [];
    if (faq.length < 3) problems.push(`tools.json: ${t.id} cần ít nhất 3 câu FAQ (đang có ${faq.length})`);
    for (const f of faq) {
      if (/có bị (tải|gửi) lên|bị tải lên (mạng|máy chủ)/i.test(f.q)) problems.push(`tools.json: ${t.id}: câu FAQ “${f.q}” lặp lại dòng quyền riêng tư dưới tiêu đề, hãy thay bằng câu hỏi riêng của công cụ`);
      answers.set(f.a, [...(answers.get(f.a) || []), t.id]);
    }
  }
  for (const [a, ids] of answers) if (ids.length >= 3) problems.push(`tools.json: câu trả lời FAQ giống hệt nhau ở ${ids.length} công cụ (${ids.join(", ")}): “${a.slice(0, 70)}…”`);
}
try { execFileSync(process.execPath, [ROOT + "scripts/build.js", "--check"], { stdio: "pipe" }); }
catch (e) { problems.push(String(e.stdout || "") + String(e.stderr || "")); }

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || ["node_modules", "tests", "samples", "models"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out); else out.push(p);
  }
  return out;
}
const files = await walk(ROOT);
// 10. từ ngữ thống nhất
{
  const say = (where, s, prose) => { for (const i of wordingIssues(s, prose)) problems.push(`${where}: «${i.found}» – ${i.hint}`); };
  for (const [w, s] of registryStrings(reg)) say(`tools.json ${w}`, s, true);
  for (const f of await readdir(ROOT + "data")) if (f.endsWith(".json")) { const j = JSON.parse(await readFile(ROOT + "data/" + f, "utf8")); for (const k of ["title", "source"]) if (j[k]) say(`data/${f} (${k})`, j[k], true); }
  for (const a of articles) say(a.file, a.meta.title + "\n" + a.meta.desc + "\n" + a.body, true);
  for (const f of files.filter((x) => { const r = relative(ROOT, x); return /^assets\/.*\.js$/.test(r) && !Object.keys(LANGS).some((c) => r.startsWith(`assets/${c}/`)) && !r.endsWith("registry.js"); }).concat(ROOT + "scripts/build.js")) {
    let keys = [];
    try { keys = keysOf(await readFile(f, "utf8"), f); } catch (_) { continue; }
    for (const k of keys) if (hasVi(k)) say(relative(ROOT, f), k, false);
  }
}
const exists = (p) => { const clean = p.split(/[?#]/)[0]; return existsSync(clean) && (statSync(clean).isFile() || existsSync(join(clean, "index.html"))); };

for (const f of files.filter((x) => /\.html$/.test(x))) {
  const html = await readFile(f, "utf8");
  const is404 = f.endsWith("/404.html");
  const isScriptPage = f.includes("/scripts/");
  const markup = html.replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g, "");
  for (const m of markup.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/.test(u)) continue;
    if (u.startsWith("/")) { bad(f, `đường dẫn tuyệt đối "${u}" (site nằm dưới /bbetools/, phải dùng đường dẫn tương đối)`); continue; }
    const base = is404 ? ROOT : dirname(f) + "/";
    if (!exists(join(base, u))) bad(f, `liên kết hỏng "${u}"`);
  }
  if (isScriptPage) continue;
  const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1] || "";
  // trang bài hướng dẫn: title dài hơn 60 ký tự khi thêm đuôi thì chỉ dùng tiêu đề bài
  const isArticle = new RegExp("^" + ARTICLE_URL + "[^/]+/index\\.html$").test(relative(ROOT, f));
  if (!isArticle && !/ – BbeTools$/.test(title) && !title.startsWith("BbeTools – ")) bad(f, `title "${title}" chưa theo dạng "… – BbeTools"`);
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) bad(f, "thiếu meta description");
  for (const m of html.matchAll(/<meta (?:name|property)="(description|og:description)" content="([^"]*)"/g)) {
    if (/(…|\.\.\.)$/.test(m[2])) bad(f, `${m[1]} bị cắt dở (kết thúc bằng "…"): "${m[2].slice(-60)}"`);
    if ([...m[2].replace(/&[a-z#0-9]+;/g, "x")].length > 160) bad(f, `${m[1]} dài quá 155 ký tự`);
  }
  if (!is404 && !/<link rel="canonical" href="https:\/\/[^"]+"/.test(html)) bad(f, "thiếu canonical");
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (e) { bad(f, "JSON-LD lỗi: " + e.message); } }
  const lang = (/^([a-z]{2})\//.exec(relative(ROOT, f)) || [])[1];
  const want = lang && LANGS[lang] ? lang : "vi";
  if (!html.includes(`<html lang="${want}"`)) bad(f, `thiếu lang="${want}"`);
}
for (const f of files.filter((x) => /\/assets\/.*\.(js|css)$/.test(x))) {
  const src = await readFile(f, "utf8");
  for (const m of src.matchAll(/(?:import\s[^"']*?from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) if (!exists(join(dirname(f), m[1]))) bad(f, `import hỏng "${m[1]}"`);
  for (const m of src.matchAll(/["'`](\/(?:assets|bbetools|samples|models|data)\/[^"'`]*)["'`]/g)) bad(f, `đường dẫn tuyệt đối "${m[1]}"`);
  for (const m of src.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/(@?[^@"'`\s]+)(@[^/"'`\s]*)?/g)) if (!m[2] || /@(latest|\^|~)/.test(m[2])) bad(f, `thư viện CDN chưa ghim phiên bản: ${m[0]}`);
}
if (warnings.length) console.warn("⚠ " + warnings.join("\n⚠ "));
if (problems.length) { console.error("✗ " + problems.length + " vấn đề:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`✓ Kiểm tra xong: ${files.filter((x) => x.endsWith(".html")).length} trang HTML, registry hợp lệ, đường dẫn tương đối đều đúng.`);
