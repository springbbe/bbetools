#!/usr/bin/env node
/* Kiểm tra trước khi commit:  node scripts/check.js
   1. tools.json hợp lệ (id/slug không trùng, nhóm, related, file JS của công cụ đã xong…)
   2. các trang sinh ra khớp tools.json (build --check)
   3. mọi đường dẫn trong HTML/JS/CSS là tương đối và trỏ tới file có thật; không có đường dẫn tuyệt đối "/..."
   4. mỗi trang có <title> dạng "… – BbeTools", meta description, canonical, JSON-LD hợp lệ */
import { readFile, readdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { ROOT, loadRegistry, validate } from "./registry.js";

const problems = [];
const bad = (file, msg) => problems.push(`${relative(ROOT, file)}: ${msg}`);

const reg = await loadRegistry();
validate(reg).forEach((e) => problems.push("tools.json: " + e));
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
  if (!/ – BbeTools$/.test(title) && !title.startsWith("BbeTools – ")) bad(f, `title "${title}" chưa theo dạng "… – BbeTools"`);
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) bad(f, "thiếu meta description");
  if (!is404 && !/<link rel="canonical" href="https:\/\/[^"]+"/.test(html)) bad(f, "thiếu canonical");
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (e) { bad(f, "JSON-LD lỗi: " + e.message); } }
  if (!html.includes('lang="vi"')) bad(f, 'thiếu lang="vi"');
}
for (const f of files.filter((x) => /\/assets\/.*\.(js|css)$/.test(x))) {
  const src = await readFile(f, "utf8");
  for (const m of src.matchAll(/(?:import\s[^"']*?from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) if (!exists(join(dirname(f), m[1]))) bad(f, `import hỏng "${m[1]}"`);
  for (const m of src.matchAll(/["'`](\/(?:assets|bbetools|samples|models|data)\/[^"'`]*)["'`]/g)) bad(f, `đường dẫn tuyệt đối "${m[1]}"`);
  for (const m of src.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/(@?[^@"'`\s]+)(@[^/"'`\s]*)?/g)) if (!m[2] || /@(latest|\^|~)/.test(m[2])) bad(f, `thư viện CDN chưa ghim phiên bản: ${m[0]}`);
}
if (problems.length) { console.error("✗ " + problems.length + " vấn đề:\n- " + problems.join("\n- ")); process.exit(1); }
console.log(`✓ Kiểm tra xong: ${files.filter((x) => x.endsWith(".html")).length} trang HTML, registry hợp lệ, đường dẫn tương đối đều đúng.`);
