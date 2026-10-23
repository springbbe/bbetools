/* Tự sinh bởi scripts/build.js từ assets/tools/json-formatter.js và i18n/en/js/ — đừng sửa tay. */
/* Định dạng & kiểm tra JSON: làm đẹp, rút gọn, sắp xếp khoá, báo lỗi đúng dòng/cột */
import { textTool } from "../frames/text.js";
import { findError, loosen, sortKeys, highlight } from "../lib/json-tools.js";

textTool({
  mono: true,
  inputLabel: "Input JSON",
  outputLabel: "Result",
  placeholder: '{"ten": "BbeTools", "congCu": 13}',
  sample: "{\"name\":\"BbeTools\",\"description\":\"Tools that run in the browser\",\"version\":1.2,\"free\":true,\"groups\":[\"PDF\",\"Image\",\"Text\"],\"author\":null,\"stats\":{\"tools\":13,\"uses\":0}}",
  options: [
    { id: "indent", label: "Indent", value: "2", choices: [["2", "2 spaces"], ["4", "4 spaces"], ["tab", "Tab"], ["min", "Minify (1 line)"]] },
    { id: "sort", type: "check", label: "Sort keys A→Z", value: false },
    { id: "loose", type: "check", label: "Repair near-valid JSON (comments, single quotes, trailing commas)", value: false }
  ],
  download: { name: "data.json", type: "application/json" },
  transform(text, o) {
    if (!text.trim()) return { text: "" };
    let src = text;
    if (o.loose) src = loosen(text);
    let data;
    try { data = JSON.parse(src); }
    catch (e) {
      const err = findError(src);
      const where = err ? `Line ${err.line}, column ${err.col}: ${err.message}` : e.message;
      const lines = src.split("\n");
      const ctxLine = err ? lines[err.line - 1] : "";
      const pointer = err ? ctxLine.slice(Math.max(0, err.col - 40), err.col + 40) + "\n" + " ".repeat(Math.min(err.col - 1, 39)) + "^" : "";
      return { text: "", error: where + (o.loose ? "" : " — try turning on “Repair near-valid JSON”."), node: pointer ? Object.assign(document.createElement("pre"), { textContent: pointer, style: "margin:0;color:var(--err)" }) : null };
    }
    if (o.sort) data = sortKeys(data);
    const ind = o.indent === "min" ? 0 : o.indent === "tab" ? "\t" : +o.indent;
    const out = JSON.stringify(data, null, ind);
    return out.length < 400000 ? { text: out, html: highlight(out) } : { text: out };
  }
});
