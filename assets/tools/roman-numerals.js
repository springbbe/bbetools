/* Đổi số La Mã: mỗi dòng một số, tự nhận chiều (số thường → La Mã, La Mã → số thường) */
import { esc } from "../core.js";
import { textTool } from "../frames/text.js";
import { convertRoman } from "../lib/so-la-ma.js";

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

textTool({
  inputLabel: "Số thường hoặc số La Mã",
  outputLabel: "Kết quả",
  placeholder: "Ví dụ: 2026 hoặc XIV\nMỗi dòng một số",
  outputPlaceholder: "MMXXVI",
  sample: "2026\n1945\nXIV\nMCMLXXV\n4000\nIIII",
  transform(text) {
    if (!text.trim()) return { text: "" };
    const outText = [], outHtml = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) { outText.push(""); outHtml.push(""); continue; }
      const r = convertRoman(line);
      if (r.kind === "error") { outText.push(""); outHtml.push(`<span style="color:var(--err)">⚠ ${esc(line.trim())}: ${esc(r.msg)}</span>`); continue; }
      const v = r.kind === "toRoman" ? r.roman : String(r.n);
      outText.push(v);
      outHtml.push(esc(v) + ` <small style="color:var(--muted)">(${r.kind === "toRoman" ? fmt(r.n) : esc(line.trim().toUpperCase())})</small>`);
    }
    return { text: outText.join("\n"), html: outHtml.join("\n") };
  }
});
