/* Trộn thư (hàm thuần): tìm và điền trường {{Tên cột}} hoặc «Tên cột» trong văn bản và trong XML của file Word (.docx),
   kể cả trường MERGEFIELD của Word và chỗ Word cắt một trường thành nhiều đoạn chữ (run); gộp nhiều bản vào một file. */
import { headKey } from "./bang.js";

/** {{ Họ tên }}, «Họ tên» (không chứa xuống dòng, tối đa 80 ký tự) */
export const FIELD_RE = /\{\{\s*([^{}\n\u0000]{1,80}?)\s*\}\}|«\s*([^«»\n\u0000]{1,80}?)\s*»/g;

/** Tên các trường trong văn bản (không trùng, giữ thứ tự) */
export function findFields(text) {
  const out = new Map();
  for (const m of String(text).matchAll(FIELD_RE)) { const n = (m[1] ?? m[2]).trim(); if (!out.has(headKey(n))) out.set(headKey(n), n); }
  return [...out.values()];
}

/** Hàm tra giá trị theo tên trường cho một dòng: khớp tiêu đề không phân biệt dấu, hoa thường, gạch dưới.
    Trả về undefined nếu không có cột đó. */
export function lookup(header, row, text = (v) => (v == null ? "" : String(v))) {
  const idx = new Map();
  header.forEach((h, i) => { const k = headKey(text(h)); if (k && !idx.has(k)) idx.set(k, i); });
  return (name) => { const i = idx.get(headKey(name)); return i == null ? undefined : text(row[i]); };
}

/** Điền văn bản. get(name) → chuỗi | undefined (không có cột: giữ nguyên trường). → { text, missing: [tên] } */
export function fillText(tpl, get) {
  const missing = new Set();
  const text = String(tpl).replace(FIELD_RE, (all, a, b) => {
    const v = get((a ?? b).trim());
    if (v === undefined) { missing.add((a ?? b).trim()); return all; }
    return v;
  });
  return { text, missing: [...missing] };
}

/* ---------- XML của Word ---------- */
export const decodeXml = (s) => String(s).replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k === "lt") return "<"; if (k === "gt") return ">"; if (k === "amp") return "&"; if (k === "quot") return '"'; if (k === "apos") return "'";
  const n = k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
  return Number.isFinite(n) ? String.fromCodePoint(n) : m;
});
// bỏ ký tự điều khiển không hợp lệ trong XML 1.0
export const encodeXml = (s) => String(s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Nội dung chữ trong một <w:t>: xuống dòng → <w:br/>, tab → <w:tab/> */
function tText(v) {
  return String(v).replace(/\r\n?/g, "\n").split(/(\n|\t)/).map((p) => (p === "\n" ? '</w:t><w:br/><w:t xml:space="preserve">' : p === "\t" ? '</w:t><w:tab/><w:t xml:space="preserve">' : encodeXml(p))).join("");
}
const makeRun = (rPr, v) => `<w:r>${rPr || ""}<w:t xml:space="preserve">${tText(v)}</w:t></w:r>`;

/** Tên trường trong mã MERGEFIELD: ` MERGEFIELD "Họ tên" \* MERGEFORMAT ` → Họ tên */
export function mergeFieldName(instr) {
  const m = /^\s*MERGEFIELD\s+(?:"([^"]+)"|(\S+))/i.exec(String(instr));
  return m ? (m[1] ?? m[2]).trim() : null;
}

/** Thay các trường MERGEFIELD (dạng đơn giản fldSimple và dạng phức fldChar). fill(name) → chuỗi | undefined */
function replaceMergeFields(xml, fill, fields) {
  xml = xml.replace(/<w:fldSimple\b([^>]*?)(?:\/>|>([\s\S]*?)<\/w:fldSimple>)/g, (all, attrs, inner) => {
    const name = mergeFieldName(decodeXml((/w:instr="([^"]*)"/.exec(attrs) || [])[1] || ""));
    if (!name) return all;
    if (fields) { fields.push(name); return all; }
    const v = fill(name);
    if (v === undefined) return all;
    const run = inner ? (/<w:r\b[^>]*>[\s\S]*?<\/w:r>/.exec(inner) || [])[0] : "";
    return makeRun(run ? (/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(run) || [])[0] : "", v);
  });
  const marker = /<w:fldChar\b[^>]*w:fldCharType="(begin|separate|end)"[^>]*\/?>|<w:instrText\b[^>]*>([^<]*)<\/w:instrText>/g;
  let out = "", from = 0, depth = 0, start = -1, instr = "", sepAt = -1;
  for (const m of xml.matchAll(marker)) {
    if (m[2] != null) { if (depth === 1 && sepAt < 0) instr += decodeXml(m[2]); continue; }
    const type = m[1];
    if (type === "begin") {
      if (depth++ === 0) { start = runStart(xml, m.index); instr = ""; sepAt = -1; }
    } else if (type === "separate") {
      if (depth === 1) sepAt = m.index;
    } else if (depth > 0 && --depth === 0) {
      const name = mergeFieldName(instr);
      if (!name || start < from) continue;
      if (fields) { fields.push(name); continue; }
      const v = fill(name);
      if (v === undefined) continue;
      const close = xml.indexOf("</w:r>", m.index);
      const end = close < 0 ? m.index + m[0].length : close + 6;
      // giữ định dạng chữ của phần kết quả (hoặc của run mở đầu)
      const resRun = sepAt >= 0 ? (/<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:t\b/.exec(xml.slice(sepAt, end)) || [])[0] : "";
      const rPr = (/<w:rPr>[\s\S]*?<\/w:rPr>/.exec(resRun || xml.slice(start, xml.indexOf("</w:r>", start))) || [])[0] || "";
      out += xml.slice(from, start) + makeRun(rPr, v);
      from = end;
    }
  }
  return fields ? xml : out + xml.slice(from);
}
function runStart(xml, pos) {
  return Math.max(xml.lastIndexOf("<w:r>", pos), xml.lastIndexOf("<w:r ", pos));
}

/** Các đoạn chữ <w:t> và ranh giới đoạn văn, để tìm trường bị Word cắt thành nhiều run */
function textNodes(xml) {
  const nodes = [];
  let all = "";
  for (const m of xml.matchAll(/(<w:t(?:\s[^>]*)?>)([^<]*)<\/w:t>|<\/w:p>/g)) {
    if (m[1] == null) { all += "\u0000"; continue; }
    const text = decodeXml(m[2]);
    nodes.push({ start: m.index, end: m.index + m[0].length, pos: all.length, text, orig: text });
    all += text;
  }
  return { nodes, all };
}

/** Tên các trường trong XML (chữ {{…}}/«…» và MERGEFIELD) */
export function xmlFields(xml) {
  const names = [];
  replaceMergeFields(xml, null, names);
  const found = new Map();
  for (const n of [...names, ...findFields(textNodes(xml).all)]) if (!found.has(headKey(n))) found.set(headKey(n), n);
  return [...found.values()];
}

/** Điền một phần XML của docx. get(name) → chuỗi | undefined. → { xml, missing } */
export function fillXml(xml, get) {
  const missing = new Set();
  const fill = (name) => { const v = get(name); if (v === undefined) missing.add(name); return v; };
  xml = replaceMergeFields(xml, fill);
  const { nodes, all } = textNodes(xml);
  const at = (p) => { let lo = 0, hi = nodes.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (nodes[mid].pos <= p) lo = mid; else hi = mid - 1; } return lo; };
  const matches = [...all.matchAll(FIELD_RE)];
  for (let k = matches.length - 1; k >= 0; k--) {
    const m = matches[k], name = (m[1] ?? m[2]).trim();
    const v = fill(name);
    if (v === undefined) continue;
    const a = m.index, b = m.index + m[0].length;
    const i = at(a), j = at(b - 1);
    const A = nodes[i], B = nodes[j];
    if (i === j) { A.text = A.text.slice(0, a - A.pos) + "\u0001" + v + "\u0002" + A.text.slice(b - A.pos); continue; }
    const tail = B.text.slice(b - B.pos);
    A.text = A.text.slice(0, a - A.pos) + "\u0001" + v + "\u0002";
    for (let x = i + 1; x < j; x++) nodes[x].text = "";
    B.text = tail;
  }
  let out = "", from = 0;
  for (const n of nodes) {
    if (n.text === n.orig) continue;
    // phần chữ gốc mã hoá lại bình thường; giá trị mới (giữa \u0001…\u0002) có thể chứa xuống dòng
    const inner = n.text.split(/(\u0001[\s\S]*?\u0002)/).map((p) => (p[0] === "\u0001" ? tText(p.slice(1, -1)) : encodeXml(p))).join("");
    out += xml.slice(from, n.start) + `<w:t xml:space="preserve">${inner}</w:t>`;
    from = n.end;
  }
  return { xml: out + xml.slice(from), missing: [...missing] };
}

/** Chữ thuần của document.xml (xem trước) */
export function xmlText(xml) {
  return decodeXml(String(xml)
    .replace(/<w:tab\/>/g, "\t").replace(/<w:br\b[^>]*\/>/g, "\n").replace(/<\/w:p>/g, "\n")
    .replace(/<w:instrText\b[^>]*>[^<]*<\/w:instrText>/g, "")
    .replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();
}

/** Gộp phần thân của nhiều document.xml (cùng một mẫu) thành một, mỗi bản bắt đầu ở trang mới */
export function combineDocuments(xmls) {
  const parts = xmls.map((x) => {
    const open = /<w:body\b[^>]*>/.exec(x);
    const b = x.lastIndexOf("</w:body>");
    if (!open || b < 0) throw new Error("document.xml không có <w:body>");
    const a = open.index + open[0].length;
    const inner = x.slice(a, b);
    const sp = inner.lastIndexOf("<w:sectPr");
    const isFinal = sp >= 0 && inner.indexOf("</w:p>", sp) < 0;
    return { head: x.slice(0, a), content: isFinal ? inner.slice(0, sp) : inner, sect: isFinal ? inner.slice(sp) : "", tail: x.slice(b) };
  });
  const first = parts[0];
  // ngắt trang giữa các bản (mọi trình soạn thảo đều hiểu, kể cả loại bỏ qua ngắt phần); đoạn chứa ngắt trang cỡ chữ 1 pt
  // để không đẩy nội dung trang sau xuống
  const tiny = '<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>';
  const sep = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${tiny}</w:pPr><w:r>${tiny}<w:br w:type="page"/></w:r></w:p>`;
  let body = parts.map((p) => p.content).join(sep);
  // bookmark và id hình trùng nhau giữa các bản làm Word báo lỗi: bỏ bookmark, đánh lại id hình
  body = body.replace(/<w:bookmark(?:Start|End)\b[^>]*\/>/g, "");
  let id = 0;
  body = body.replace(/(<wp:docPr\b[^>]*?\bid=")\d+(")/g, (m, a, b) => a + ++id + b);
  return first.head + body + first.sect + first.tail;
}

/** Ngắt dòng một đoạn văn theo bề rộng. measure(chuỗi) → bề rộng. → [dòng] */
export function wrapText(para, maxWidth, measure) {
  const words = String(para).split(/( +)/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (!w) continue;
    const cand = line + w;
    if (!line || measure(cand.trimEnd()) <= maxWidth) {
      if (!line && measure(w) > maxWidth && w.trim()) {
        // từ quá dài (link): cắt theo ký tự
        let chunk = "";
        for (const ch of w) { if (chunk && measure(chunk + ch) > maxWidth) { lines.push(chunk); chunk = ""; } chunk += ch; }
        line = chunk;
      } else line = cand;
    } else {
      lines.push(line.trimEnd());
      line = w.trim() ? w : "";
      if (line && measure(line) > maxWidth) {
        let chunk = "";
        for (const ch of line) { if (chunk && measure(chunk + ch) > maxWidth) { lines.push(chunk); chunk = ""; } chunk += ch; }
        line = chunk;
      }
    }
  }
  lines.push(line.trimEnd());
  return lines;
}
