/* Đọc số thành chữ: mỗi dòng một số → mỗi dòng một kết quả (dán được cả cột từ Excel) */
import { esc } from "../core.js";
import { textTool } from "../frames/text.js";
import { readNumber, parseNumber, formatVN } from "../lib/doc-so.js";

textTool({
  inputLabel: "Số cần đọc",
  outputLabel: "Bằng chữ",
  placeholder: "Ví dụ: 1.250.000 hoặc 1,5tr hoặc 500k\nMỗi dòng một số",
  outputPlaceholder: "Một triệu hai trăm năm mươi nghìn đồng",
  sample: "1.250.000\n15.000.000\n2.005.000.000\n1,5tr\n12,5",
  options: [
    { id: "unit", label: "Đơn vị", value: "đồng", choices: [["đồng", "đồng"], ["", "(không)"], ["đồng chẵn", "đồng chẵn"], ["VNĐ", "VNĐ"]] },
    { id: "thousand", label: "Hàng nghìn", value: "nghìn", choices: [["nghìn", "nghìn"], ["ngàn", "ngàn"]] },
    { id: "odd", label: "Số 0 hàng chục", value: "linh", choices: [["linh", "linh (một trăm linh năm)"], ["lẻ", "lẻ (một trăm lẻ năm)"]] },
    { id: "four", label: "Số 4", value: "tư", choices: [["tư", "hai mươi tư"], ["bốn", "hai mươi bốn"]] }
  ],
  transform(text, o) {
    const lines = text.split("\n");
    if (!text.trim()) return { text: "" };
    const unit = o.unit === "đồng chẵn" ? "đồng" : o.unit;
    const opts = { unit, even: o.unit === "đồng chẵn", thousand: o.thousand, odd: o.odd, four: o.four, billion: "tỷ" };
    const outText = [], outHtml = [];
    for (const line of lines) {
      if (!line.trim()) { outText.push(""); outHtml.push(""); continue; }
      const p = parseNumber(line);
      if (!p) { outText.push(""); outHtml.push(`<span style="color:var(--err)">⚠ Không hiểu “${esc(line.trim())}”</span>`); continue; }
      const w = readNumber(p, opts);
      outText.push(w);
      const shown = formatVN(p);
      const note = shown.replace(/^-/, "") !== line.trim().replace(/^[-−–]/, "") ? ` <small style="color:var(--muted)">(${esc(shown)})</small>` : "";
      outHtml.push(esc(w) + (lines.filter((l) => l.trim()).length > 1 || note ? note : ""));
    }
    return { text: outText.join("\n"), html: outHtml.join("\n") };
  }
});
