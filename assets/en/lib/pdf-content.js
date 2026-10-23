/* Tự sinh bởi scripts/build.js từ assets/lib/pdf-content.js và i18n/en/js/ — đừng sửa tay. */
/* Đọc và viết lại luồng nội dung (content stream) của trang PDF: dùng để chuyển màu sang thang xám mà chữ vẫn là chữ.
   Chuỗi vào/ra là "latin1" (mỗi ký tự = 1 byte) để giữ nguyên dữ liệu nhị phân trong chuỗi, ảnh inline.
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/pdf-content.test.js */

const WS = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIM = new Set("()<>[]{}/%".split("").map((c) => c.charCodeAt(0)));
const isWs = (c) => WS.has(c);

/** Tách luồng nội dung thành token { t: "num"|"name"|"str"|"hex"|"open"|"close"|"op"|"raw", v: văn bản gốc } */
export function tokenize(s) {
  const out = [], n = s.length;
  let i = 0;
  while (i < n) {
    const c = s.charCodeAt(i);
    if (isWs(c)) { i++; continue; }
    if (c === 0x25) { while (i < n && s[i] !== "\n" && s[i] !== "\r") i++; continue; } // % chú thích
    if (c === 0x28) { // ( chuỗi ), có lồng ngoặc và ký tự thoát
      let depth = 0, j = i;
      for (; j < n; j++) {
        const ch = s[j];
        if (ch === "\\") { j++; continue; }
        if (ch === "(") depth++;
        else if (ch === ")" && --depth === 0) break;
      }
      out.push({ t: "str", v: s.slice(i, j + 1) }); i = j + 1; continue;
    }
    if (c === 0x3c && s[i + 1] === "<") { out.push({ t: "open", v: "<<" }); i += 2; continue; }
    if (c === 0x3e && s[i + 1] === ">") { out.push({ t: "close", v: ">>" }); i += 2; continue; }
    if (c === 0x3c) { const j = s.indexOf(">", i); const e = j < 0 ? n : j + 1; out.push({ t: "hex", v: s.slice(i, e) }); i = e; continue; }
    if (c === 0x5b || c === 0x7b) { out.push({ t: "open", v: s[i] }); i++; continue; }
    if (c === 0x5d || c === 0x7d) { out.push({ t: "close", v: s[i] }); i++; continue; }
    if (c === 0x2f) { // /tên
      let j = i + 1;
      while (j < n && !isWs(s.charCodeAt(j)) && !DELIM.has(s.charCodeAt(j))) j++;
      out.push({ t: "name", v: s.slice(i, j) }); i = j; continue;
    }
    let j = i;
    while (j < n && !isWs(s.charCodeAt(j)) && !DELIM.has(s.charCodeAt(j))) j++;
    if (j === i) { out.push({ t: "raw", v: s[i] }); i++; continue; } // ký tự lạ (vd. ">" lẻ): giữ nguyên
    const w = s.slice(i, j);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) out.push({ t: "num", v: w });
    else if (w === "ID") {
      // dữ liệu ảnh inline: từ sau "ID " tới " EI" (EI đứng riêng, sau là khoảng trắng / hết chuỗi)
      let k = j + 1, end = -1;
      while ((k = s.indexOf("EI", k)) >= 0) {
        if (isWs(s.charCodeAt(k - 1)) && (k + 2 >= n || isWs(s.charCodeAt(k + 2)))) { end = k; break; }
        k += 2;
      }
      if (end < 0) end = n;
      out.push({ t: "op", v: "ID" }, { t: "raw", v: s.slice(j, end) }, { t: "op", v: "EI" });
      i = Math.min(n, end + 2); continue;
    } else out.push({ t: "op", v: w });
    i = j;
  }
  return out;
}

/** Ghép token lại thành luồng nội dung (mỗi lệnh một dòng) */
export function serialize(tokens) {
  let s = "";
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // "ID" + dữ liệu ảnh inline: giữ nguyên từng byte (dữ liệu đã kèm khoảng trắng đầu và cuối)
    if (t.t === "op" && t.v === "ID") { s += "ID"; continue; }
    if (t.t === "raw" && tokens[i - 1] && tokens[i - 1].v === "ID") { s += t.v; continue; }
    s += t.v + (t.t === "op" ? "\n" : " ");
  }
  return s;
}

const clamp01 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 1e6) / 1e6;
export const rgbGray = (r, g, b) => clamp01(0.299 * r + 0.587 * g + 0.114 * b);
export const cmykGray = (c, m, y, k) => clamp01(1 - Math.min(1, 0.3 * c + 0.59 * m + 0.11 * y + k));
const fmt = (v) => String(Math.round(v * 1000) / 1000);
const DEVICE = { "/DeviceGray": "gray", "/G": "gray", "/CalGray": "gray", "/DeviceRGB": "rgb", "/RGB": "rgb", "/CalRGB": "rgb", "/DeviceCMYK": "cmyk", "/CMYK": "cmyk", "/Lab": "lab" };

/** Màu xám (0..1) từ các thành phần theo hệ màu model */
export function toGray(model, v) {
  if (model === "rgb") return rgbGray(v[0], v[1], v[2]);
  if (model === "cmyk") return cmykGray(v[0], v[1], v[2], v[3]);
  if (model === "lab") return clamp01(v[0] / 100);
  return clamp01(v[0]);
}

/**
 * Viết lại các lệnh màu của luồng nội dung sang thang xám.
 * csOf(name) → "gray"|"rgb"|"cmyk"|"lab"|"other" cho tên hệ màu khai báo trong /Resources /ColorSpace của luồng.
 * Trả về { text, changed } (changed = số lệnh màu đã đổi).
 */
export function grayContent(src, csOf = () => "other") {
  const toks = tokenize(src), out = [];
  let ops = [], changed = 0;
  let st = { fill: "gray", stroke: "gray" };
  const stack = [];
  const nums = () => (ops.every((o) => o.t === "num") ? ops.map((o) => +o.v) : null);
  const modelOf = (name) => DEVICE[name] || (name === "/Pattern" ? "other" : csOf(name.slice(1)) || "other");
  const emit = (gray, op) => { out.push({ t: "num", v: fmt(gray) }, { t: "op", v: op }); changed++; };
  for (const tk of toks) {
    if (tk.t !== "op") { ops.push(tk); continue; }
    const op = tk.v, v = nums();
    let done = false;
    if ((op === "rg" || op === "RG") && v && v.length === 3) { emit(rgbGray(v[0], v[1], v[2]), op === "rg" ? "g" : "G"); st[op === "rg" ? "fill" : "stroke"] = "gray"; done = true; }
    else if ((op === "k" || op === "K") && v && v.length === 4) { emit(cmykGray(...v), op === "k" ? "g" : "G"); st[op === "k" ? "fill" : "stroke"] = "gray"; done = true; }
    else if ((op === "g" || op === "G") && v) st[op === "g" ? "fill" : "stroke"] = "gray";
    else if ((op === "cs" || op === "CS") && ops.length === 1 && ops[0].t === "name") {
      const m = modelOf(ops[0].v), key = op === "cs" ? "fill" : "stroke";
      if (m === "rgb" || m === "cmyk" || m === "lab") { out.push({ t: "name", v: "/DeviceGray" }, tk); st[key] = m; changed++; done = true; }
      else st[key] = m === "gray" ? "gray" : "other";
    } else if (/^(sc|scn|SC|SCN)$/.test(op) && v) {
      const key = op[0] === "s" ? "fill" : "stroke", m = st[key];
      const need = m === "rgb" || m === "lab" ? 3 : m === "cmyk" ? 4 : 0;
      if (need && v.length === need) { emit(toGray(m, v), op); done = true; }
    } else if (op === "q") stack.push({ ...st });
    else if (op === "Q") st = stack.pop() || { fill: "gray", stroke: "gray" };
    if (!done) out.push(...ops, tk);
    ops = [];
  }
  out.push(...ops);
  return { text: serialize(out), changed };
}
