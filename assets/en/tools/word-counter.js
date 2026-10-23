/* Tự sinh bởi scripts/build.js từ assets/tools/word-counter.js và i18n/en/js/ — đừng sửa tay. */
/* Đếm từ & ký tự: cập nhật ngay khi gõ */
import { h, esc } from "../core.js";
import { textTool } from "../frames/text.js";
import { stats, fmtDuration } from "../lib/text-stats.js";

const n = (x) => x.toLocaleString("en-US");
textTool({
  inputLabel: "Your text",
  outputLabel: "Statistics",
  placeholder: "Type or paste the text to count words, characters…",
  sample: "Autumn in the old city: golden leaves drift down quiet streets, past tiled roofs weathered by time.\n\nBbeTools counts words the way Word and Google Docs do: each group of characters separated by spaces counts as one word. Your text never leaves your device!",
  output: "custom",
  transform: (text) => stats(text),
  render(out, s) {
    out.classList.remove("out");
    out.textContent = "";
    const stat = (v, label, hl) => h("div", { class: "stat" + (hl ? " hl" : "") }, h("b", { text: v }), h("span", { text: label }));
    out.append(h("div", { class: "stats" },
      stat(n(s.words), "words", true),
      stat(n(s.chars), "characters", true),
      stat(n(s.noSpace), "characters excluding spaces"),
      stat(n(s.sentences), "sentences"),
      stat(n(s.paragraphs), "paragraphs"),
      stat(n(s.lines), "lines"),
      stat(fmtDuration(s.readMin), "reading time"),
      stat(fmtDuration(s.speakMin), "speaking time")));
    if (s.top.length) {
      out.append(h("div", { style: { padding: "0 16px 16px" } },
        h("p", { class: "opt-title", text: "Most used words", style: { marginBottom: "8px" } }),
        h("ul", { class: "chip-list" }, s.top.map(([w, c]) => h("li", { class: "chip", html: esc(w) + " <small>×" + c + "</small>" })))));
    }
  }
});
