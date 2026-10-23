/* Tự sinh bởi scripts/build.js từ assets/tools/fancy-text.js và i18n/en/js/ — đừng sửa tay. */
/* Chữ kiểu nghệ thuật: một dòng chữ → hơn 20 kiểu chữ Unicode để dán vào tiểu sử Facebook, TikTok, Instagram */
import { h, icon, copyText } from "../core.js";
import { textTool } from "../frames/text.js";
import { fancy, STYLES } from "../lib/fancy-text.js";

textTool({
  inputLabel: "Your text",
  outputLabel: "Click a style to copy it",
  placeholder: "Type a name or a short phrase, e.g. Bbe Tools 2026",
  sample: "Live happy every day ✨ 2026",
  single: true,
  output: "custom",
  initial: () => "Bbe Tools",
  transform: (text) => ({ text }),
  render(out, r) {
    out.classList.remove("out");
    out.classList.add("fancy-list");
    out.textContent = "";
    const src = r.text.slice(0, 500);
    if (!src.trim()) { out.append(h("p", { class: "hint", text: "Type in the box above to see the styles." })); return; }
    for (const [id, label] of STYLES) {
      const v = fancy(src, id);
      out.append(h("button", { class: "fancy-row", type: "button", onclick: () => copyText(v, "Copied style “" + label + "”") },
        h("span", { class: "fancy-v", text: v }),
        h("small", { text: label }),
        h("span", { class: "fancy-ic", html: icon("copy") })));
    }
  }
});
