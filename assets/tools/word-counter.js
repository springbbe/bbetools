/* Đếm từ & ký tự: cập nhật ngay khi gõ */
import { h, esc } from "../core.js";
import { textTool } from "../frames/text.js";
import { stats, fmtDuration } from "../lib/text-stats.js";

const n = (x) => x.toLocaleString("vi-VN");
textTool({
  inputLabel: "Văn bản của bạn",
  outputLabel: "Thống kê",
  placeholder: "Gõ hoặc dán văn bản cần đếm từ, ký tự…",
  sample: "Hà Nội mùa thu, cây cơm nguội vàng, cây bàng lá đỏ, nằm kề bên nhau, phố xưa nhà cổ, mái ngói thâm nâu.\n\nBbeTools đếm từ theo cách của Word và Google Docs: mỗi tiếng cách nhau bởi khoảng trắng được tính là một từ. Văn bản của bạn không rời khỏi máy!",
  output: "custom",
  transform: (text) => stats(text),
  render(out, s) {
    out.classList.remove("out");
    out.textContent = "";
    const stat = (v, label, hl) => h("div", { class: "stat" + (hl ? " hl" : "") }, h("b", { text: v }), h("span", { text: label }));
    out.append(h("div", { class: "stats" },
      stat(n(s.words), "từ (tiếng)", true),
      stat(n(s.chars), "ký tự", true),
      stat(n(s.noSpace), "ký tự không tính khoảng trắng"),
      stat(n(s.sentences), "câu"),
      stat(n(s.paragraphs), "đoạn"),
      stat(n(s.lines), "dòng"),
      stat(fmtDuration(s.readMin), "thời gian đọc"),
      stat(fmtDuration(s.speakMin), "thời gian nói")));
    if (s.top.length) {
      out.append(h("div", { style: { padding: "0 16px 16px" } },
        h("p", { class: "opt-title", text: "Từ dùng nhiều nhất", style: { marginBottom: "8px" } }),
        h("ul", { class: "chip-list" }, s.top.map(([w, c]) => h("li", { class: "chip", html: esc(w) + " <small>×" + c + "</small>" })))));
    }
  }
});
