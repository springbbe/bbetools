/* Từ ngữ thống nhất trong chuỗi hiển thị tiếng Việt (tools.json trừ "keywords", data/*.json, content/, chuỗi trong JS).
   "keywords" không kiểm tra vì đó là biến thể tìm kiếm người dùng hay gõ. Dùng cho check.js. */

const W = "\\p{L}\\p{M}";
const word = (w) => new RegExp(`(?<![${W}])${w}(?![${W}])`, "giu");

/** [regex, gợi ý, chỉ áp dụng cho văn bản (không áp dụng cho chuỗi JS)?] */
export const RULES = [
  // ngoại lệ: "nhấn mạnh", "nhấp nháy", "màu nhấn" (màu điểm nhấn)
  [new RegExp(`(?<![${W}])(?<!màu )(nhấn|nhấp)(?![${W}])(?! mạnh| nháy)`, "giu"), "dùng “bấm” thay cho “nhấn/nhấp”"],
  [word("click"), "dùng “bấm” thay cho “click”"],
  [new RegExp(`(?<![${W}])server(?![${W}])`, "giu"), "dùng “máy chủ” thay cho “server”", (s, i) => !/SQL $/i.test(s.slice(Math.max(0, i - 4), i))],
  [/(?<![\p{L}])[vV][dD]\.|(?<![\p{L}])vd:|(?<![\p{L}])Vd:/gu, "viết “ví dụ” trong câu văn, “VD:” trong placeholder (bỏ “vd.”)"],
  [/(?<![\p{L}])VD:/gu, "trong câu văn viết “ví dụ” (“VD:” chỉ dùng cho placeholder)", null, true],
  [word("x[óÓ]a"), "viết “xoá” (kiểu đang dùng) thay cho “xóa”"],
  [word("h[óÓ]a"), "viết “hoá” (kiểu đang dùng) thay cho “hóa”"],
  [word("t[ỷỶ] lệ"), "viết “tỉ lệ” thay cho “tỷ lệ”"]
];

/** Các vi phạm trong một chuỗi: [{ found, hint }]. prose = true với văn bản (tools.json, content/), false với chuỗi trong JS */
export function wordingIssues(s, prose = true) {
  const out = [];
  for (const [re, hint, ok, proseOnly] of RULES) {
    if (proseOnly && !prose) continue;
    re.lastIndex = 0;
    for (const m of String(s).matchAll(re)) if (!ok || ok(s, m.index)) out.push({ found: m[0], hint });
  }
  return out;
}

/** Các chuỗi hiển thị của registry (bỏ "keywords"), kèm vị trí để báo lỗi */
export function registryStrings(reg) {
  const out = [];
  const push = (where, v) => { if (typeof v === "string") out.push([where, v]); };
  for (const k of ["tagline", "title", "description"]) push(`site.${k}`, reg.site[k]);
  for (const g of reg.groups) {
    for (const k of ["name", "desc", "intro"]) push(`nhóm ${g.id}.${k}`, g[k]);
    for (const f of g.faq || []) { push(`nhóm ${g.id}.faq`, f.q); push(`nhóm ${g.id}.faq`, f.a); }
  }
  for (const t of reg.tools) {
    for (const k of ["name", "seoTitle", "desc", "privacy"]) push(`${t.id}.${k}`, t[k]);
    for (const x of t.howto || []) push(`${t.id}.howto`, x);
    for (const x of t.hosts || []) push(`${t.id}.hosts`, x);
    for (const f of t.faq || []) { push(`${t.id}.faq`, f.q); push(`${t.id}.faq`, f.a); }
  }
  return out;
}
