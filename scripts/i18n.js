/* Đa ngôn ngữ: mã nguồn viết bằng tiếng Việt, lúc build sinh bản dịch của từng module JS.

   - Ngôn ngữ gốc "vi" nằm ở gốc site (/bbetools/ghep-pdf/). Ngôn ngữ khác nằm dưới /bbetools/<lang>/ (vd. /bbetools/en/merge-pdf/).
   - Mỗi file JS trong assets/ mà trang <lang> cần (đi theo import từ core.js, home.js, notfound.js và công cụ có bản dịch)
     được chép sang assets/<lang>/… với mọi chuỗi (chuỗi thường và template literal) thay bằng bản dịch.
     Import tương đối giữ nguyên nên bản dịch tự nhập lẫn nhau; riêng assets/<lang>/registry.js do build.js sinh.
   - Từ điển: i18n/<lang>/js/<đường dẫn file trong assets>.json, dạng { "chuỗi gốc": "bản dịch" }, rồi tới i18n/<lang>/js/_shared.json.
     Template literal dùng {0}, {1}… thay cho ${…} theo thứ tự; bản dịch được đổi chỗ. {0|file|files}: "file" khi biểu thức thứ 0
     bằng 1, ngược lại "files". Giá trị null = chưa dịch (giữ chuỗi gốc, check.js báo lỗi).
   - Chuỗi có chữ tiếng Việt (có dấu) bắt buộc phải có trong từ điển (dịch, hoặc ghi lại y nguyên nếu cố ý giữ).
     Chuỗi không dấu chỉ được dịch khi từ điển có (vd. tên file tải về "da-ghep.pdf").

   Chạy: node scripts/i18n.js extract   — thêm khoá còn thiếu (giá trị null) vào từ điển, báo khoá thừa. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, posix } from "node:path";
import * as acorn from "./vendor/acorn.mjs";
import { ROOT, loadRegistry, isLive } from "./registry.js";

export const LANGS = {
  en: { name: "English", short: "EN", locale: "en-US", og: "en_US", groups: "category/", about: "about/" }
};
export const VI_CHARS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
export const hasVi = (s) => VI_CHARS.test(s);

/* ---------- phân tích ---------- */
const parse = (src, file) => {
  try { return acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", allowAwaitOutsideFunction: true }); }
  catch (e) { throw new Error(`${file}: ${e.message}`); }
};
const isNode = (v) => v && typeof v === "object" && typeof v.type === "string";
const SKIP_SOURCE = new Set(["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression"]);

/** Các chuỗi dịch được (cây: template literal chứa các chuỗi trong biểu thức của nó) */
function collect(node, out) {
  if (!isNode(node)) return;
  if (node.type === "Literal") { if (typeof node.value === "string") out.push({ node }); return; }
  if (node.type === "TemplateLiteral") {
    out.push({ node, exprs: node.expressions.map((e) => { const l = []; collect(e, l); return l; }) });
    return;
  }
  if (node.type === "TaggedTemplateExpression") { collect(node.tag, out); node.quasi.expressions.forEach((e) => collect(e, out)); return; }
  for (const k in node) {
    if (k === "source" && SKIP_SOURCE.has(node.type)) continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((x) => collect(x, out));
    else if (isNode(v)) collect(v, out);
  }
}
const tplKey = (n) => (n.quasis.some((q) => q.value.cooked == null) ? null : n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? `{${i}}` : "")).join(""));
const tplEsc = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

/** Danh sách khoá (chuỗi gốc) trong một file, theo thứ tự xuất hiện */
export function keysOf(src, file = "") {
  const items = [];
  collect(parse(src, file), items);
  const keys = [];
  const walk = (list) => list.forEach((it) => {
    const k = it.exprs ? tplKey(it.node) : it.node.value;
    if (k != null) keys.push(k);
    if (it.exprs) it.exprs.forEach(walk);
  });
  walk(items);
  return keys;
}

/**
 * Dịch một module. lookup(key) → bản dịch | undefined.
 * Trả về { code, missing: [khoá có tiếng Việt chưa dịch], used: Set(khoá đã dịch) }
 */
export function compile(src, lookup, file = "") {
  const items = [];
  collect(parse(src, file), items);
  const missing = [], used = new Set();
  const get = (k) => {
    if (k == null) return undefined;
    const v = lookup(k);
    if (typeof v === "string") { used.add(k); return v; }
    if (hasVi(k)) missing.push(k);
    return undefined;
  };
  // ghép lại đoạn [start, end) của mã gốc, thay các chuỗi con trong list
  const emit = (start, end, list) => {
    let s = "", pos = start;
    // acorn không luôn liệt kê nút con theo thứ tự trong mã (vd. SwitchCase: consequent trước test)
    for (const it of [...list].sort((x, y) => x.node.start - y.node.start)) { s += src.slice(pos, it.node.start) + render(it); pos = it.node.end; }
    return s + src.slice(pos, end);
  };
  const render = (it) => {
    const n = it.node;
    if (!it.exprs) { const v = get(n.value); return v === undefined ? src.slice(n.start, n.end) : JSON.stringify(v); }
    const ex = n.expressions.map((e, i) => emit(e.start, e.end, it.exprs[i]));
    const v = get(tplKey(n));
    if (v === undefined) return emit(n.start, n.end, it.exprs.flat()); // giữ nguyên từng ký tự, chỉ thay chuỗi con
    let out = "", last = 0;
    const re = /\{(\d+)(?:\|([^|}]*)\|([^}]*))?\}/g;
    let m;
    while ((m = re.exec(v))) {
      const i = +m[1];
      if (i >= ex.length) continue;
      out += tplEsc(v.slice(last, m.index)) + "${" + (m[2] != null ? `(${ex[i]}) == 1 ? ${JSON.stringify(m[2])} : ${JSON.stringify(m[3])}` : ex[i]) + "}";
      last = re.lastIndex;
    }
    return "`" + out + tplEsc(v.slice(last)) + "`";
  };
  return { code: emit(0, src.length, items), missing, used };
}

/* ---------- đồ thị import ---------- */
/** Các module (đường dẫn trong assets/, vd. "tools/merge-pdf.js") mà các file entries cần, gồm cả chính chúng */
export async function moduleGraph(entries) {
  const seen = new Set(), todo = [...entries];
  while (todo.length) {
    const rel = todo.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const src = await readFile(ROOT + "assets/" + rel, "utf8");
    const deps = [];
    const visit = (n) => {
      if (!isNode(n)) return;
      if ((SKIP_SOURCE.has(n.type)) && n.source && typeof n.source.value === "string") deps.push(n.source.value);
      if (n.type === "NewExpression" && n.callee.name === "URL" && n.arguments[0] && typeof n.arguments[0].value === "string" &&
        n.arguments[1] && n.arguments[1].type === "MemberExpression" && n.arguments[1].object.type === "MetaProperty") deps.push(n.arguments[0].value);
      for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (isNode(v)) visit(v); }
    };
    visit(parse(src, rel));
    for (const d of deps) {
      if (!d.startsWith(".")) continue;
      const p = posix.normalize(posix.join(posix.dirname(rel), d));
      if (!p.startsWith("..") && p.endsWith(".js") && existsSync(ROOT + "assets/" + p)) todo.push(p);
    }
  }
  return [...seen].sort();
}

/* ---------- từ điển ---------- */
const dictCache = {};
export const dictPath = (lang, rel) => `i18n/${lang}/js/${rel.replace(/\.js$/, "")}.json`;
export async function loadJson(rel) {
  if (!(rel in dictCache)) dictCache[rel] = existsSync(ROOT + rel) ? JSON.parse(await readFile(ROOT + rel, "utf8")) : null;
  return dictCache[rel];
}
export async function lookupFor(lang, rel) {
  const own = (await loadJson(dictPath(lang, rel))) || {};
  const shared = (await loadJson(`i18n/${lang}/js/_shared.json`)) || {};
  return (k) => (Object.prototype.hasOwnProperty.call(own, k) && own[k] != null ? own[k] : Object.prototype.hasOwnProperty.call(shared, k) ? shared[k] ?? undefined : undefined);
}

/* ---------- công cụ và module của từng ngôn ngữ ---------- */
/** Công cụ có mặt ở ngôn ngữ lang (công cụ "vnOnly" chỉ có ở tiếng Việt) */
export const inLang = (t, lang) => isLive(t) && (lang === "vi" || !t.vnOnly);
/** Bản dịch nội dung registry: { site, groups: { id: {…} }, tools: { id: {…} } } */
export async function langData(lang) {
  const d = (await loadJson(`i18n/${lang}/tools.json`)) || {};
  return { site: d.site || {}, groups: d.groups || {}, tools: d.tools || {}, data: d.data || {} };
}
/** Các module (trong assets/) cần dịch cho ngôn ngữ lang */
export async function langFiles(lang, reg) {
  reg = reg || (await loadRegistry());
  const entries = ["core.js", "home.js", "notfound.js", ...reg.tools.filter((t) => inLang(t, lang)).map((t) => `tools/${t.id}.js`)];
  return (await moduleGraph(entries)).filter((f) => f !== "registry.js");
}

/* ---------- dòng lệnh ---------- */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()) && process.argv[2] === "extract") {
  for (const lang of Object.keys(LANGS)) {
    const files = await langFiles(lang);
    const shared = (await loadJson(`i18n/${lang}/js/_shared.json`)) || {};
    let added = 0, stale = 0;
    for (const rel of files) {
      const src = await readFile(ROOT + "assets/" + rel, "utf8");
      const keys = [...new Set(keysOf(src, rel))];
      const p = dictPath(lang, rel);
      const old = (await loadJson(p)) || {};
      const next = {};
      for (const k of keys) {
        if (k in old) next[k] = old[k];
        else if (hasVi(k) && !(k in shared && shared[k] != null)) { next[k] = null; added++; }
      }
      // khoá không còn trong mã: bỏ nếu chưa dịch, giữ lại (và báo) nếu đã dịch hoặc được thêm tay (chuỗi không dấu, "@keep")
      for (const k of Object.keys(old)) {
        if (k in next || old[k] === null) continue;
        next[k] = old[k];
        if (!k.startsWith("@") && hasVi(k)) { stale++; console.log(`  ${p}: khoá không còn dùng: ${JSON.stringify(k).slice(0, 80)}`); }
      }
      if (!Object.keys(next).length && !existsSync(ROOT + p)) continue;
      const text = JSON.stringify(next, null, 1) + "\n";
      if (existsSync(ROOT + p) && (await readFile(ROOT + p, "utf8")) === text) continue;
      await mkdir(dirname(ROOT + p), { recursive: true });
      await writeFile(ROOT + p, text);
    }
    console.log(`${lang}: ${files.length} module, thêm ${added} khoá chưa dịch, ${stale} khoá thừa`);
  }
}
