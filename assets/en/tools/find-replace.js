/* Tự sinh bởi scripts/build.js từ assets/tools/find-replace.js và i18n/en/js/ — đừng sửa tay. */
/* Tìm và thay thế: thay hàng loạt, phân biệt hoa/thường, nguyên từ, biểu thức chính quy (chạy trong Web Worker) */
import { esc, fmtNum } from "../core.js";
import { textTool } from "../frames/text.js";
import { findReplace } from "../lib/van-ban.js";
import { runRegexTask } from "../regex-run.js";

const show = (r) => {
  if (r.count > 20000) return { text: r.text, info: `Replaced ${fmtNum(r.count)} ${(fmtNum(r.count)) == 1 ? "match" : "matches"}.` };
  const html = r.parts.map(([keep, rep]) => esc(keep) + (rep != null ? `<mark class="hit">${esc(rep) || "<span class=\"hit-empty\" title=\"deleted\">⌫</span>"}</mark>` : "")).join("");
  return { text: r.text, html, info: r.count ? `Replaced ${fmtNum(r.count)} ${(fmtNum(r.count)) == 1 ? "match" : "matches"}.` : "No matches found." };
};

textTool({
  inputLabel: "Text",
  outputLabel: "After replacing",
  placeholder: "Paste the text to find and replace in…",
  // mẫu kèm ví dụ regex: đổi ngày dd/mm/yyyy → yyyy-mm-dd
  sample: (o) => Object.assign(o, { find: "(\\d{2})/(\\d{2})/(\\d{4})", rep: "$3-$2-$1", regex: true }) &&
    "Dear Mr. John Smith,\nOn 10/21/2026, ABC Ltd. sent quotation no. QT-2026-015.\nContact: +1 555 0123 or email hello@abc.example\n10/25/2026 is the confirmation deadline.",
  options: [
    { id: "find", type: "text", label: "Find", value: "", placeholder: "Text to find", wide: true, persist: false },
    { id: "rep", type: "text", label: "Replace with", value: "", placeholder: "Leave empty = delete", wide: true, persist: false },
    { id: "caseSensitive", type: "check", label: "Match case", value: false },
    { id: "wholeWord", type: "check", label: "Whole words only", value: false },
    { id: "regex", type: "check", label: "Regular expression (regex)", value: false }
  ],
  download: { name: "replaced.txt" },
  transform(text, o) {
    if (!o.find) return { text, info: "Enter the text to find in the “Find” box." };
    if (!o.regex) return show(findReplace(text, o.find, o.rep, o));
    return runRegexTask("replace", [text, o.find, o.rep, { regex: true, caseSensitive: o.caseSensitive, wholeWord: o.wholeWord }]).then(show);
  }
});
