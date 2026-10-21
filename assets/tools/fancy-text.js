/* Chữ kiểu nghệ thuật: một dòng chữ → hơn 20 kiểu chữ Unicode để dán vào tiểu sử Facebook, TikTok, Instagram */
import { h, icon, copyText } from "../core.js";
import { textTool } from "../frames/text.js";
import { fancy, STYLES } from "../lib/fancy-text.js";

textTool({
  inputLabel: "Chữ của bạn",
  outputLabel: "Bấm vào kiểu chữ để sao chép",
  placeholder: "Gõ tên hoặc câu ngắn, ví dụ: Bbe Tools 2026",
  sample: "Sống vui mỗi ngày ✨ 2026",
  single: true,
  output: "custom",
  initial: () => "Bbe Tools",
  transform: (text) => ({ text }),
  render(out, r) {
    out.classList.remove("out");
    out.classList.add("fancy-list");
    out.textContent = "";
    const src = r.text.slice(0, 500);
    if (!src.trim()) { out.append(h("p", { class: "hint", text: "Gõ chữ vào ô phía trên để xem các kiểu." })); return; }
    for (const [id, label] of STYLES) {
      const v = fancy(src, id);
      out.append(h("button", { class: "fancy-row", type: "button", onclick: () => copyText(v, "Đã sao chép kiểu “" + label + "”") },
        h("span", { class: "fancy-v", text: v }),
        h("small", { text: label }),
        h("span", { class: "fancy-ic", html: icon("copy") })));
    }
  }
});
