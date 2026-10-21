/* Rút gọn mã (hàm thuần): HTML (bỏ chú thích, gom khoảng trắng, giữ nguyên <pre>/<textarea>), SQL một dòng,
   và đoán ngôn ngữ của đoạn mã. Rút gọn JS/CSS dùng thư viện Terser/CSSO (trong công cụ), truyền vào qua tham số. */

/** Đoán ngôn ngữ: "html" | "css" | "js" | "json" */
export function detectLang(src) {
  const s = String(src ?? "").trim();
  if (!s) return "js";
  if (/^[[{]/.test(s)) { try { JSON.parse(s); return "json"; } catch (_) { /* không phải JSON */ } }
  if (/^<(!doctype|html|head|body|div|p|span|section|main|header|nav|ul|table|meta|link|script|style|!--|[a-z][\w-]*[\s>/])/i.test(s)) return "html";
  if (/(^|\})\s*(@media|@import|@font-face|@keyframes|:root|[.#]?[a-z][\w-]*(\s*[>+~,]?\s*[.#:]?[\w-]+)*\s*\{)/i.test(s) && !/\b(function|const|let|var|return|=>|import|export)\b/.test(s)) return "css";
  return "js";
}

/** HTML: o.minifyJs(src) / o.minifyCss(src) → chuỗi (có thể async) dùng cho <script>, <style> bên trong */
export async function minifyHtml(src, o = {}) {
  const keep = [];
  const hold = (s) => { keep.push(s); return `\u0000${keep.length - 1}\u0000`; };
  let s = String(src ?? "");
  // khối giữ nguyên
  s = s.replace(/<(pre|textarea)\b[\s\S]*?<\/\1>/gi, hold);
  const jobs = [];
  s = s.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, body, close) => {
    const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(open) || [])[1] || "";
    const isJs = !type || /javascript|module|ecmascript/i.test(type);
    const isJson = /json/i.test(type);
    const i = keep.push(m) - 1;
    if (body.trim() && isJs && o.minifyJs) jobs.push(Promise.resolve(o.minifyJs(body)).then((r) => { keep[i] = open + r + close; }).catch(() => {}));
    if (body.trim() && isJson) { try { keep[i] = open + JSON.stringify(JSON.parse(body)) + close; } catch (_) { /* giữ nguyên */ } }
    return `\u0000${i}\u0000`;
  });
  s = s.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, body, close) => {
    const i = keep.push(m) - 1;
    if (body.trim() && o.minifyCss) jobs.push(Promise.resolve(o.minifyCss(body)).then((r) => { keep[i] = open + r + close; }).catch(() => {}));
    return `\u0000${i}\u0000`;
  });
  // bỏ chú thích (trừ chú thích điều kiện của IE)
  s = s.replace(/<!--(?!\[if|<!\[endif)[\s\S]*?-->/g, "");
  // gom khoảng trắng; bỏ hẳn khoảng trắng giữa hai thẻ khối
  s = s.replace(/\s+/g, " ");
  const BLOCK = "html|head|body|title|meta|link|script|style|div|p|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|section|article|header|footer|nav|main|aside|h[1-6]|form|fieldset|figure|figcaption|br|hr|option|select|!doctype";
  s = s.replace(new RegExp(`\\s*(</?(?:${BLOCK})\\b[^>]*>)\\s*`, "gi"), "$1");
  s = s.replace(/\s*(\u0000\d+\u0000)\s*/g, "$1");
  // thuộc tính: gom khoảng trắng trong thẻ
  s = s.replace(/<([a-z][\w-]*)((?:\s+[^\s=>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi, (m, tag, attrs, slash) =>
    "<" + tag + attrs.replace(/\s*=\s*/g, "=").replace(/\s+/g, " ") + (slash ? "/" : "") + ">");
  await Promise.all(jobs);
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
  return s.trim();
}

/** SQL trên một dòng: bỏ chú thích, gom khoảng trắng, giữ nguyên chuỗi trong nháy */
export function compactSql(src) {
  const s = String(src ?? "");
  const strs = [];
  let out = "", i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < s.length) { if (s[j] === c) { if (s[j + 1] === c) { j += 2; continue; } break; } j++; }
      out += "\u0001" + (strs.push(s.slice(i, j + 1)) - 1) + "\u0001"; i = j + 1; continue;
    }
    if (c === "-" && s[i + 1] === "-") { while (i < s.length && s[i] !== "\n") i++; out += " "; continue; }
    if (c === "/" && s[i + 1] === "*") { const e = s.indexOf("*/", i + 2); i = e < 0 ? s.length : e + 2; out += " "; continue; }
    if (/\s/.test(c)) { if (!/\s$/.test(out)) out += " "; i++; continue; }
    out += c; i++;
  }
  return out.replace(/\s*([(),;])\s*/g, (m, p) => (p === "," ? ", " : p)).replace(/\)(?=[\w"`\u0001])/g, ") ").replace(/ {2,}/g, " ").trim().replace(/\u0001(\d+)\u0001/g, (m, k) => strs[+k]);
}
