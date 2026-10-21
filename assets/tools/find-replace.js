/* Tìm và thay thế: thay hàng loạt, phân biệt hoa/thường, nguyên từ, biểu thức chính quy (chạy trong Web Worker) */
import { esc, fmtNum } from "../core.js";
import { textTool } from "../frames/text.js";
import { findReplace } from "../lib/van-ban.js";
import { runRegexTask } from "../regex-run.js";

const show = (r) => {
  if (r.count > 20000) return { text: r.text, info: `Đã thay ${fmtNum(r.count)} chỗ.` };
  const html = r.parts.map(([keep, rep]) => esc(keep) + (rep != null ? `<mark class="hit">${esc(rep) || "<span class=\"hit-empty\" title=\"đã xoá\">⌫</span>"}</mark>` : "")).join("");
  return { text: r.text, html, info: r.count ? `Đã thay ${fmtNum(r.count)} chỗ.` : "Không tìm thấy chỗ nào khớp." };
};

textTool({
  inputLabel: "Văn bản",
  outputLabel: "Sau khi thay",
  placeholder: "Dán văn bản cần tìm và thay thế…",
  // mẫu kèm ví dụ regex: đổi ngày dd/mm/yyyy → yyyy-mm-dd
  sample: (o) => Object.assign(o, { find: "(\\d{2})/(\\d{2})/(\\d{4})", rep: "$3-$2-$1", regex: true }) &&
    "Kính gửi: Ông Nguyễn Văn A\nNgày 21/10/2026, Công ty TNHH ABC đã gửi báo giá số BG-2026-015.\nLiên hệ: 0901 234 567 hoặc email lienhe@abc.vn\nNgày 25/10/2026 là hạn chót xác nhận.",
  options: [
    { id: "find", type: "text", label: "Tìm", value: "", placeholder: "Từ cần tìm", wide: true, persist: false },
    { id: "rep", type: "text", label: "Thay bằng", value: "", placeholder: "Để trống = xoá", wide: true, persist: false },
    { id: "caseSensitive", type: "check", label: "Phân biệt hoa/thường", value: false },
    { id: "wholeWord", type: "check", label: "Chỉ khớp nguyên từ", value: false },
    { id: "regex", type: "check", label: "Biểu thức chính quy (regex)", value: false }
  ],
  download: { name: "da-thay-the.txt" },
  transform(text, o) {
    if (!o.find) return { text, info: "Nhập từ cần tìm ở ô “Tìm”." };
    if (!o.regex) return show(findReplace(text, o.find, o.rep, o));
    return runRegexTask("replace", [text, o.find, o.rep, { regex: true, caseSensitive: o.caseSensitive, wholeWord: o.wholeWord }]).then(show);
  }
});
