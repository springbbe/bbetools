/* Tự sinh bởi scripts/build.js từ assets/tools/dedupe-lines.js và i18n/en/js/ — đừng sửa tay. */
/* Lọc dòng trùng & sắp xếp dòng: bỏ trùng, bỏ dòng trống, sắp xếp A→Z theo tiếng Việt, theo độ dài, đảo ngược, trộn */
import { fmtNum } from "../core.js";
import { textTool } from "../frames/text.js";
import { processLines } from "../lib/van-ban.js";

textTool({
  inputLabel: "List (one item per line)",
  outputLabel: "Result",
  placeholder: "Paste a list, one item per line…",
  sample: "Nguyen Van Binh\nTran Thi An\nle minh chau\nDang Quoc Dat\nTran Thi An\n\nAu Duong Phong\nnguyen van binh\nBui Thu Ha\nDo Huu Cuong\n",
  options: [
    { id: "sort", label: "Sort", value: "az", choices: [["none", "Keep order"], ["az", "A → Z"], ["za", "Z → A"], ["len", "Short → long"], ["lenDesc", "Long → short"], ["reverse", "Reverse order"], ["shuffle", "Shuffle"]] },
    { id: "dedupe", type: "check", label: "Remove duplicate lines", value: true },
    { id: "removeEmpty", type: "check", label: "Remove empty lines", value: true },
    { id: "trim", type: "check", label: "Trim spaces at both ends", value: true },
    { id: "ignoreCase", type: "check", label: "Case-insensitive", value: true }
  ],
  download: { name: "list.txt" },
  transform(text, o) {
    if (!text) return { text: "" };
    const r = processLines(text, o);
    const bits = [`${fmtNum(r.total)} lines → ${fmtNum(r.kept)} lines left`];
    if (o.dedupe) bits.push(`removed ${fmtNum(r.dup)} duplicate ${(fmtNum(r.dup)) == 1 ? "line" : "lines"}`);
    if (o.removeEmpty) bits.push(`${fmtNum(r.empty)} empty ${(fmtNum(r.empty)) == 1 ? "line" : "lines"}`);
    return { text: r.text, info: bits.join(" · ") };
  }
});
