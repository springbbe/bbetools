/* Xử lý văn bản (hàm thuần): đổi chữ hoa/thường, bỏ dấu, tạo slug, lọc/sắp xếp dòng, tìm và thay thế. */

const LOWER = (s) => s.toLocaleLowerCase("vi");
const UPPER = (s) => s.toLocaleUpperCase("vi");
const capFirst = (w) => { const c = [...w]; return c.length ? UPPER(c[0]) + c.slice(1).join("") : w; };
const WORD = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’]*/gu;

/** Bỏ dấu tiếng Việt: "Đường phố" → "Duong pho". keepD: giữ đ/Đ */
export function removeAccents(s, { keepD = false } = {}) {
  let r = String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!keepD) r = r.replace(/đ/g, "d").replace(/Đ/g, "D");
  return r.normalize("NFC");
}

/** Tách thành các từ (bỏ dấu câu) để ghép kiểu camelCase, snake_case… */
function identWords(s) {
  return removeAccents(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")      // tachTu → tach Tu
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")   // HTMLParser → HTML Parser
    .split(/[^A-Za-z0-9]+/).filter(Boolean);
}

export const CASES = {
  upper: (s) => UPPER(s),
  lower: (s) => LOWER(s),
  title: (s) => LOWER(s).replace(WORD, capFirst),
  sentence: (s) => LOWER(s).replace(/(^|[.!?…]\s+|\n\s*)(["'“(\[]*)(\p{L})/gu, (m, a, q, c) => a + q + UPPER(c)),
  toggle: (s) => [...s].map((c) => (c === LOWER(c) ? UPPER(c) : LOWER(c))).join(""),
  camel: (s) => s.split("\n").map((l) => identWords(l).map((w, i) => (i ? capFirst(w.toLowerCase()) : w.toLowerCase())).join("")).join("\n"),
  pascal: (s) => s.split("\n").map((l) => identWords(l).map((w) => capFirst(w.toLowerCase())).join("")).join("\n"),
  snake: (s) => s.split("\n").map((l) => identWords(l).map((w) => w.toLowerCase()).join("_")).join("\n"),
  constant: (s) => s.split("\n").map((l) => identWords(l).map((w) => w.toUpperCase()).join("_")).join("\n"),
  kebab: (s) => s.split("\n").map((l) => identWords(l).map((w) => w.toLowerCase()).join("-")).join("\n")
};
export const convertCase = (s, mode) => (CASES[mode] || CASES.lower)(String(s ?? ""));

/** Slug: "Hướng dẫn: Cài đặt Node.js 22!" → "huong-dan-cai-dat-node-js-22" */
export function slugify(s, { sep = "-", lower = true, max = 0 } = {}) {
  let r = removeAccents(String(s ?? "")).replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (lower) r = r.toLowerCase();
  r = r.replace(/\s+/g, sep);
  if (max > 0 && r.length > max) {
    r = r.slice(0, max);
    const cut = r.lastIndexOf(sep);
    if (cut > max / 2) r = r.slice(0, cut); // không cắt giữa từ
    r = r.replace(new RegExp("\\" + sep + "+$"), "");
  }
  return r;
}

const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });
const collatorCase = new Intl.Collator("vi", { numeric: true, sensitivity: "variant", caseFirst: "upper" });

/** Lọc và sắp xếp dòng.
    o: { dedupe, removeEmpty, trim, ignoreCase, sort: "none"|"az"|"za"|"len"|"lenDesc"|"reverse"|"shuffle", random } */
export function processLines(text, o = {}) {
  let lines = String(text ?? "").split(/\r?\n/);
  const total = lines.length;
  if (o.trim) lines = lines.map((l) => l.trim());
  let empty = 0, dup = 0;
  if (o.removeEmpty) { const n = lines.length; lines = lines.filter((l) => l.trim() !== ""); empty = n - lines.length; }
  if (o.dedupe) {
    const seen = new Set();
    const n = lines.length;
    lines = lines.filter((l) => { const k = o.ignoreCase ? LOWER(l) : l; if (seen.has(k)) return false; seen.add(k); return true; });
    dup = n - lines.length;
  }
  const cmp = o.ignoreCase ? collator.compare : collatorCase.compare;
  switch (o.sort) {
    case "az": lines.sort(cmp); break;
    case "za": lines.sort((a, b) => cmp(b, a)); break;
    case "len": lines.sort((a, b) => [...a].length - [...b].length || cmp(a, b)); break;
    case "lenDesc": lines.sort((a, b) => [...b].length - [...a].length || cmp(a, b)); break;
    case "reverse": lines.reverse(); break;
    case "shuffle": {
      const rnd = o.random || Math.random;
      for (let i = lines.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lines[i], lines[j]] = [lines[j], lines[i]]; }
      break;
    }
  }
  return { text: lines.join("\n"), total, kept: lines.length, dup, empty };
}

/** Dựng RegExp cho tìm/thay. o: { regex, caseSensitive, wholeWord } */
export function buildPattern(find, o = {}) {
  let src = o.regex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (o.wholeWord) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
  return new RegExp(src, "g" + (o.caseSensitive ? "" : "i") + "u" + (o.regex && o.dotAll ? "s" : "") + (o.regex && o.multiline !== false ? "m" : ""));
}

/** Mở rộng chuỗi thay thế như String.replace: $&, $1…$99, $<tên>, $$, $`, $' */
export function expandReplacement(rep, m, input) {
  return rep.replace(/\$(\$|&|`|'|<([^>]*)>|(\d\d?))/g, (all, t, name, num) => {
    if (t === "$") return "$";
    if (t === "&") return m[0];
    if (t === "`") return input.slice(0, m.index);
    if (t === "'") return input.slice(m.index + m[0].length);
    if (name != null) return m.groups && name in m.groups ? m.groups[name] ?? "" : all;
    let n = +num;
    if (n >= m.length && num.length === 2 && +num[0] < m.length) return (m[+num[0]] ?? "") + num[1];
    return n > 0 && n < m.length ? m[n] ?? "" : all;
  });
}

/** Tìm và thay thế. Trả về { text, count, parts: [[đoạn giữ nguyên, đoạn thay vào], …, [phần cuối]] } */
export function findReplace(text, find, replacement, o = {}) {
  text = String(text ?? "");
  if (!find) return { text, count: 0, parts: [[text]] };
  const re = buildPattern(find, o);
  // khi bật regex: "\n", "\t" trong ô thay thế là xuống dòng, tab; $1, $<tên> là nhóm bắt được
  const rep = o.regex ? replacement.replace(/\\n/g, "\n").replace(/\\t/g, "\t") : replacement;
  const parts = [];
  let last = 0, count = 0;
  for (const m of text.matchAll(re)) {
    parts.push([text.slice(last, m.index), o.regex ? expandReplacement(rep, m, text) : rep]);
    last = m.index + m[0].length;
    if (++count >= (o.limit || 200000)) break;
  }
  parts.push([text.slice(last)]);
  return { text: parts.map((p) => p.join("")).join(""), count, parts };
}
