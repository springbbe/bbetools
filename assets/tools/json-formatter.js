/* Định dạng & kiểm tra JSON: làm đẹp, rút gọn, sắp xếp khoá, báo lỗi đúng dòng/cột */
import { textTool } from "../frames/text.js";
import { findError, loosen, sortKeys, highlight } from "../lib/json-tools.js";

textTool({
  mono: true,
  inputLabel: "JSON đầu vào",
  outputLabel: "Kết quả",
  placeholder: '{"ten": "BbeTools", "congCu": 13}',
  sample: '{"ten":"BbeTools","moTa":"Công cụ chạy trên trình duyệt","phienBan":1.2,"mienPhi":true,"nhom":["PDF","Ảnh","Văn bản"],"tacGia":null,"thongKe":{"congCu":13,"luotDung":0}}',
  options: [
    { id: "indent", label: "Thụt lề", value: "2", choices: [["2", "2 dấu cách"], ["4", "4 dấu cách"], ["tab", "Tab"], ["min", "Rút gọn (1 dòng)"]] },
    { id: "sort", type: "check", label: "Sắp xếp khoá A→Z", value: false },
    { id: "loose", type: "check", label: "Sửa JSON gần đúng (chú thích, nháy đơn, dấu phẩy thừa)", value: false }
  ],
  download: { name: "du-lieu.json", type: "application/json" },
  transform(text, o) {
    if (!text.trim()) return { text: "" };
    let src = text;
    if (o.loose) src = loosen(text);
    let data;
    try { data = JSON.parse(src); }
    catch (e) {
      const err = findError(src);
      const where = err ? `Dòng ${err.line}, cột ${err.col}: ${err.message}` : e.message;
      const lines = src.split("\n");
      const ctxLine = err ? lines[err.line - 1] : "";
      const pointer = err ? ctxLine.slice(Math.max(0, err.col - 40), err.col + 40) + "\n" + " ".repeat(Math.min(err.col - 1, 39)) + "^" : "";
      return { text: "", error: where + (o.loose ? "" : " — thử bật “Sửa JSON gần đúng”."), node: pointer ? Object.assign(document.createElement("pre"), { textContent: pointer, style: "margin:0;color:var(--err)" }) : null };
    }
    if (o.sort) data = sortKeys(data);
    const ind = o.indent === "min" ? 0 : o.indent === "tab" ? "\t" : +o.indent;
    const out = JSON.stringify(data, null, ind);
    return out.length < 400000 ? { text: out, html: highlight(out) } : { text: out };
  }
});
