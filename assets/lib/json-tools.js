/* Công cụ JSON (hàm thuần): tìm vị trí lỗi kèm thông báo tiếng Việt, sửa JSON "gần đúng", sắp xếp khoá, tô màu. */

/** Đổi vị trí ký tự → { line, col } (bắt đầu từ 1) */
export function lineCol(text, pos) {
  let line = 1, col = 1;
  for (let i = 0; i < pos && i < text.length; i++) { if (text[i] === "\n") { line++; col = 1; } else col++; }
  return { line, col };
}

class JErr extends Error { constructor(msg, pos) { super(msg); this.pos = pos; } }

/** Kiểm tra JSON chặt (RFC 8259). Trả về null nếu hợp lệ, hoặc { message, pos, line, col } */
export function findError(text) {
  let i = 0;
  const n = text.length;
  const ws = () => { while (i < n && (text[i] === " " || text[i] === "\t" || text[i] === "\n" || text[i] === "\r")) i++; };
  const ch = () => text[i];
  const show = (c) => (c === undefined ? "cuối văn bản" : c === "\n" ? "xuống dòng" : `“${c}”`);
  function value() {
    ws();
    const c = ch();
    if (c === "{") return object();
    if (c === "[") return array();
    if (c === '"') return string();
    if (c === "-" || (c >= "0" && c <= "9")) return number();
    for (const lit of ["true", "false", "null"]) if (text.startsWith(lit, i)) { i += lit.length; return; }
    if (c === "'") throw new JErr("Chuỗi phải dùng nháy kép \" chứ không dùng nháy đơn '", i);
    if (c === undefined) throw new JErr("Thiếu giá trị (văn bản kết thúc quá sớm)", i);
    if (/[A-Za-z_]/.test(c)) throw new JErr(`Giá trị không hợp lệ bắt đầu bằng ${show(c)} — chuỗi phải đặt trong nháy kép`, i);
    throw new JErr(`Gặp ${show(c)} ở chỗ cần một giá trị`, i);
  }
  function object() {
    i++; ws();
    if (ch() === "}") { i++; return; }
    for (;;) {
      ws();
      if (ch() === "}") throw new JErr("Dấu phẩy thừa trước }", i);
      if (ch() !== '"') throw new JErr(ch() === "'" ? "Tên khoá phải dùng nháy kép \"" : `Tên khoá phải là chuỗi trong nháy kép, gặp ${show(ch())}`, i);
      string(); ws();
      if (ch() !== ":") throw new JErr(`Thiếu dấu hai chấm “:” sau tên khoá, gặp ${show(ch())}`, i);
      i++;
      value(); ws();
      if (ch() === ",") { i++; continue; }
      if (ch() === "}") { i++; return; }
      throw new JErr(`Thiếu dấu phẩy “,” hoặc “}” sau giá trị, gặp ${show(ch())}`, i);
    }
  }
  function array() {
    i++; ws();
    if (ch() === "]") { i++; return; }
    for (;;) {
      ws();
      if (ch() === "]") throw new JErr("Dấu phẩy thừa trước ]", i);
      value(); ws();
      if (ch() === ",") { i++; continue; }
      if (ch() === "]") { i++; return; }
      throw new JErr(`Thiếu dấu phẩy “,” hoặc “]” sau phần tử, gặp ${show(ch())}`, i);
    }
  }
  function string() {
    const start = i;
    i++;
    while (i < n) {
      const c = text[i];
      if (c === '"') { i++; return; }
      if (c === "\\") {
        const e = text[i + 1];
        if (e === "u") { if (!/^[0-9a-fA-F]{4}$/.test(text.substr(i + 2, 4))) throw new JErr("Mã \\u phải có đúng 4 chữ số hex", i); i += 6; continue; }
        if (!'"\\/bfnrt'.includes(e)) throw new JErr(`Ký tự thoát không hợp lệ \\${e === undefined ? "" : e}`, i);
        i += 2; continue;
      }
      if (c === "\n") throw new JErr("Chuỗi bị xuống dòng — dùng \\n thay cho xuống dòng thật", i);
      if (c < " ") throw new JErr("Chuỗi chứa ký tự điều khiển (tab, …) chưa thoát", i);
      i++;
    }
    throw new JErr("Chuỗi chưa đóng nháy kép", start);
  }
  function number() {
    const start = i;
    if (text[i] === "-") i++;
    if (text[i] === "0") i++;
    else if (text[i] >= "1" && text[i] <= "9") while (text[i] >= "0" && text[i] <= "9") i++;
    else throw new JErr("Số không hợp lệ", start);
    if (text[i] === ".") { i++; if (!(text[i] >= "0" && text[i] <= "9")) throw new JErr("Sau dấu chấm thập phân phải có chữ số", i); while (text[i] >= "0" && text[i] <= "9") i++; }
    if (text[i] === "e" || text[i] === "E") { i++; if (text[i] === "+" || text[i] === "-") i++; if (!(text[i] >= "0" && text[i] <= "9")) throw new JErr("Số mũ không hợp lệ", i); while (text[i] >= "0" && text[i] <= "9") i++; }
    if (text[start] === "0" && text[start + 1] >= "0" && text[start + 1] <= "9") throw new JErr("Số không được có chữ số 0 ở đầu", start);
  }
  try {
    if (text.charCodeAt(0) === 0xfeff) i = 1;
    value(); ws();
    if (i < n) throw new JErr(`Thừa nội dung sau khi JSON đã kết thúc: ${show(text[i])}`, i);
    return null;
  } catch (e) {
    if (!(e instanceof JErr)) throw e;
    return { message: e.message, pos: e.pos, ...lineCol(text, e.pos) };
  }
}

/** Sửa JSON "gần đúng": bỏ chú thích, dấu phẩy thừa, đổi nháy đơn → nháy kép, thêm nháy cho khoá chưa có nháy */
export function loosen(text) {
  let out = "", i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '"' || c === "'") {
      const q = c; let s = ""; i++;
      while (i < n && text[i] !== q) {
        if (text[i] === "\\") { const e = text[i + 1]; s += e === "'" ? "'" : "\\" + e; i += 2; continue; }
        if (q === "'" && text[i] === '"') { s += '\\"'; i++; continue; }
        if (text[i] === "\n") { s += "\\n"; i++; continue; }
        s += text[i++];
      }
      i++;
      out += '"' + s + '"';
    } else if (c === "/" && text[i + 1] === "/") { while (i < n && text[i] !== "\n") i++; }
    else if (c === "/" && text[i + 1] === "*") { const e = text.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; }
    else if (/[A-Za-z_$]/.test(c)) {
      let w = ""; while (i < n && /[\w$]/.test(text[i])) w += text[i++];
      let j = i; while (j < n && /\s/.test(text[j])) j++;
      if (text[j] === ":" && !/^(true|false|null)$/.test(w)) out += '"' + w + '"';
      else out += w === "undefined" ? "null" : w === "True" ? "true" : w === "False" ? "false" : w === "None" ? "null" : w;
    } else { out += c; i++; }
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

export function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort((a, b) => a.localeCompare(b)).map((k) => [k, sortKeys(v[k])]));
  return v;
}

const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Tô màu chuỗi JSON đã định dạng (HTML) */
export function highlight(json) {
  return escHtml(json).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, (m, str, colon, lit) => {
    if (str) return colon ? `<span class="j-k">${str}</span>${colon}` : `<span class="j-s">${str}</span>`;
    if (lit) return `<span class="j-l">${m}</span>`;
    return `<span class="j-n">${m}</span>`;
  });
}
