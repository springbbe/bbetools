/* Tự sinh bởi scripts/build.js từ assets/tools/markdown-to-html.js và i18n/en/js/ — đừng sửa tay. */
/* Markdown sang HTML: mở/kéo thả file .md hoặc gõ trực tiếp, chuyển bằng marked, xem trước đã lọc mã độc bằng DOMPurify,
   xem toàn màn hình, sao chép hoặc tải file .html */
import { h, lib, save, toast, icon, LANG, baseName, extOf, fmtSize, sleep, takeHandoff } from "../core.js";
import { textTool } from "../frames/text.js";
import { decodeText } from "../lib/bang.js";

let marked = null, purify = null, view = "preview", fileName = "";
const MD_EXT = ["md", "markdown", "mdown", "mkd", "mkdn", "mdx", "txt", "text"];
const MAX = 20 * 1024 * 1024;
const ready = Promise.all([lib("marked"), lib("purify")]).then(([m, p]) => { marked = m.marked || m; purify = p; });

const SAMPLE = `# Meeting notes

**Date:** 10/21/2026 · *3rd floor meeting room*

## Done
- [x] Home page design
- [x] Write the user guide
- [ ] Test on phones

## Numbers

| Item | Plan | Actual |
|---|---:|---:|
| Revenue | 120k | 135k |
| Costs | 80k | 76k |

> Everything is processed right in your browser.

\`\`\`js
console.log("Hello BbeTools");
\`\`\`

Learn more at [BbeTools](https://springbbe.github.io/bbetools/).`;

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

const picker = h("input", { type: "file", hidden: true, accept: MD_EXT.map((e) => "." + e).join(",") + ",text/markdown,text/plain" });
const chip = h("span", { class: "md-file", hidden: true });
const fsBtn = h("button", { class: "ib sm", type: "button", "aria-label": "View full screen", title: "View full screen", html: icon("maximize"), onclick: () => toggleFull() });

const tool = textTool({
  mono: true,
  inputLabel: "Markdown",
  outputLabel: "HTML",
  placeholder: "# Title\n\nType **Markdown** here, or drag and drop a .md file…",
  sample: SAMPLE,
  output: "custom",
  copyable: true,
  inputActions: [
    chip,
    h("button", { class: "btn ghost sm", type: "button", title: "Open a Markdown (.md) file from your device", onclick: () => picker.click() }, h("span", { html: icon("upload"), style: { display: "contents" } }), "Open file")
  ],
  options: [
    { id: "gfm", type: "check", label: "GitHub Flavored (tables, strikethrough, task lists)", value: true },
    { id: "breaks", type: "check", label: "Line break = <br>", value: false }
  ],
  outputActions: [
    h("div", { class: "seg sm-seg", role: "radiogroup", "aria-label": "View" },
      ...[["preview", "Preview"], ["code", "HTML code"]].map(([v, l]) => h("label", null, h("input", { type: "radio", name: "md-view", value: v, checked: v === view, onchange: () => { view = v; tool.compute(); } }), h("span", { text: l })))),
    h("button", { class: "ib sm", type: "button", "aria-label": "Download .html file", title: "Download .html file", html: icon("download"), onclick: () => {
      const r = tool.result;
      if (!r.text) return toast("No content yet");
      const title = (/^#\s+(.+)$/m.exec(tool.ta.value) || [])[1] || (fileName && baseName(fileName)) || "Document";
      save(new Blob([doc(r.text, title.replace(/[<&]/g, ""))], { type: "text/html;charset=utf-8" }), fileName ? baseName(fileName) + ".html" : "document.html");
    } }),
    fsBtn
  ],
  async transform(text, o) {
    if (!marked) await ready;
    if (!text.trim()) { setFile(""); return { text: "" }; }
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

/* ---------- Mở file .md: nút "Mở file", kéo thả vào trang, hoặc chuyển từ trang chủ ---------- */
function setFile(name) {
  fileName = name;
  chip.hidden = !name;
  chip.textContent = chip.title = name;
}
async function openFile(file) {
  if (!file) return;
  const ext = extOf(file.name);
  if (!MD_EXT.includes(ext) && !/^text\//.test(file.type)) return toast(`${file.name} is not a Markdown file. Please choose a .md or .txt file.`, { type: "err" });
  if (file.size > MAX) return toast(`File too large (${fmtSize(file.size)}). Only Markdown files under 20 MB are accepted.`, { type: "err" });
  try {
    const { text } = decodeText(new Uint8Array(await file.arrayBuffer()));
    tool.setText(text.replace(/\r\n?/g, "\n"));
    setFile(file.name);
    toast(`Opened ${file.name}`);
  } catch (_) { toast(`Couldn't read ${file.name}.`, { type: "err" }); }
}
picker.addEventListener("change", () => { openFile(picker.files[0]); picker.value = ""; });
document.body.append(picker);

const inPane = tool.ta.closest(".pane");
inPane.classList.add("md-in");
// kéo thả file vào bất kỳ đâu trên trang; ô nhập sáng viền khi đang kéo
let depth = 0;
const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
document.addEventListener("dragenter", (e) => { if (hasFiles(e)) { depth++; inPane.classList.add("drop"); } });
document.addEventListener("dragleave", (e) => { if (hasFiles(e) && --depth <= 0) { depth = 0; inPane.classList.remove("drop"); } });
document.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
document.addEventListener("drop", (e) => {
  depth = 0; inPane.classList.remove("drop");
  if (!hasFiles(e) || !e.dataTransfer.files.length) return;
  e.preventDefault();
  openFile(e.dataTransfer.files[0]);
});
takeHandoff().then((fs) => fs.length && openFile(fs[0]));

/* ---------- Xem toàn màn hình (ô kết quả). iPhone không có Fullscreen API cho thẻ thường → phủ kín bằng CSS ---------- */
const outPane = tool.out.closest(".pane");
outPane.classList.add("md-out");
const isFull = () => document.fullscreenElement === outPane || outPane.classList.contains("md-full");
function syncFull() {
  if (document.fullscreenElement === outPane) { outPane.classList.remove("md-full"); document.documentElement.classList.remove("md-lock"); }
  const on = isFull();
  const label = on ? "Exit full screen" : "View full screen";
  fsBtn.innerHTML = icon(on ? "minimize" : "maximize");
  fsBtn.title = on ? label + " (Esc)" : label;
  fsBtn.setAttribute("aria-label", label);
  fsBtn.setAttribute("aria-pressed", String(on));
}
async function toggleFull() {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  else if (outPane.classList.contains("md-full")) { outPane.classList.remove("md-full"); document.documentElement.classList.remove("md-lock"); }
  else {
    let ok = false;
    // vài trình duyệt nhúng trong app treo lời hứa này mãi: quá 0,8 giây thì phủ kín bằng CSS
    if (outPane.requestFullscreen) ok = await Promise.race([outPane.requestFullscreen().then(() => true, () => false), sleep(800).then(() => false)]);
    if (!ok) { outPane.classList.add("md-full"); document.documentElement.classList.add("md-lock"); }
    tool.out.focus();
  }
  syncFull();
}
document.addEventListener("fullscreenchange", syncFull);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && outPane.classList.contains("md-full")) { e.preventDefault(); toggleFull(); } });
