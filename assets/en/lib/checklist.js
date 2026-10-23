/* Tự sinh bởi scripts/build.js từ assets/lib/checklist.js và i18n/en/js/ — đừng sửa tay. */
/* Checklist (hàm thuần): đọc danh sách việc từ văn bản (mỗi dòng một việc; hiểu "- [x] việc", "[ ] việc", "✓ việc", "* việc", "1. việc"),
   xuất ra Markdown / văn bản thường, di chuyển phần tử. */

const LINE = /^\s*(?:[-*+•]|\d+[.)])?\s*(?:\[([ xX✓✔])\]|([✓✔☑☐□]))?\s*(.*?)\s*$/u;
/** Văn bản → [{ text, done }] */
export function parseItems(text) {
  const out = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = LINE.exec(raw);
    const t = m[3].trim();
    if (!t) continue;
    const mark = m[1] || m[2] || "";
    out.push({ text: t, done: /[xX✓✔☑]/.test(mark) });
  }
  return out;
}
/** [{ text, done }] → Markdown "- [x] việc" */
export const toMarkdown = (items, title) => (title ? "# " + title + "\n\n" : "") + items.map((i) => `- [${i.done ? "x" : " "}] ${i.text}`).join("\n") + "\n";
/** [{ text, done }] → văn bản thường "☑ việc" / "☐ việc" */
export const toPlain = (items, title) => (title ? title + "\n" : "") + items.map((i) => `${i.done ? "☑" : "☐"} ${i.text}`).join("\n");
/** Di chuyển phần tử from → to (trả mảng mới) */
export function move(arr, from, to) {
  const a = arr.slice();
  if (from < 0 || from >= a.length) return a;
  to = Math.max(0, Math.min(a.length - 1, to));
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}
