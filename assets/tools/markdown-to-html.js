/* Markdown sang HTML: chuyển bằng marked, xem trước đã lọc mã độc bằng DOMPurify, sao chép hoặc tải file .html */
import { h, lib, save, copyText, toast, icon, LANG } from "../core.js";
import { textTool } from "../frames/text.js";

let marked = null, purify = null, view = "preview";
const ready = Promise.all([lib("marked"), lib("purify")]).then(([m, p]) => { marked = m.marked || m; purify = p; });

const SAMPLE = `# Ghi chú cuộc họp

**Ngày:** 21/10/2026 · *Phòng họp tầng 3*

## Việc đã xong
- [x] Thiết kế trang chủ
- [x] Viết tài liệu hướng dẫn
- [ ] Kiểm thử trên điện thoại

## Số liệu

| Hạng mục | Kế hoạch | Thực tế |
|---|---:|---:|
| Doanh thu | 120 tr | 135 tr |
| Chi phí | 80 tr | 76 tr |

> Mọi xử lý diễn ra ngay trên trình duyệt của bạn.

\`\`\`js
console.log("Xin chào BbeTools");
\`\`\`

Xem thêm tại [BbeTools](https://springbbe.github.io/bbetools/).`;

const doc = (body, title) => `<!doctype html>
<html lang="${LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>body{font:16px/1.65 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#1f2328}pre{background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto}code{font-family:ui-monospace,Menlo,monospace}table{border-collapse:collapse}th,td{border:1px solid #d0d7de;padding:6px 12px}blockquote{margin:0;padding:0 1em;color:#59636e;border-left:4px solid #d0d7de}img{max-width:100%}</style>
</head>
<body>
${body}
</body>
</html>
`;

const tool = textTool({
  mono: true,
  inputLabel: "Markdown",
  outputLabel: "HTML",
  placeholder: "# Tiêu đề\n\nGõ **Markdown** vào đây…",
  sample: SAMPLE,
  output: "custom",
  copyable: true,
  options: [
    { id: "gfm", type: "check", label: "GitHub Flavored (bảng, gạch ngang, việc cần làm)", value: true },
    { id: "breaks", type: "check", label: "Xuống dòng = <br>", value: false }
  ],
  outputActions: [
    h("div", { class: "seg sm-seg", role: "radiogroup", "aria-label": "Chế độ xem" },
      ...[["preview", "Xem trước"], ["code", "Mã HTML"]].map(([v, l]) => h("label", null, h("input", { type: "radio", name: "md-view", value: v, checked: v === view, onchange: () => { view = v; tool.compute(); } }), h("span", { text: l })))),
    h("button", { class: "ib sm", type: "button", "aria-label": "Tải file .html", title: "Tải file .html", html: icon("download"), onclick: () => {
      const r = tool.result;
      if (!r.text) return toast("Chưa có nội dung");
      const title = (/^#\s+(.+)$/m.exec(tool.ta.value) || [])[1] || "Tài liệu";
      save(new Blob([doc(r.text, title.replace(/[<&]/g, ""))], { type: "text/html;charset=utf-8" }), "tai-lieu.html");
    } })
  ],
  async transform(text, o) {
    if (!marked) await ready;
    if (!text.trim()) return { text: "" };
    const html = marked.parse(text, { gfm: o.gfm, breaks: o.breaks, async: false });
    return { text: html.trim() };
  },
  render(out, r) {
    out.classList.toggle("mono", view === "code");
    out.classList.toggle("md-preview", view === "preview");
    if (!r.text) { out.textContent = ""; return; }
    if (view === "code") { out.textContent = r.text; return; }
    // xem trước: lọc thẻ/thuộc tính nguy hiểm (script, onerror…) trước khi chèn vào trang
    out.innerHTML = purify.sanitize(r.text, { ADD_ATTR: ["target"] });
    for (const a of out.querySelectorAll("a[href]")) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  }
});
