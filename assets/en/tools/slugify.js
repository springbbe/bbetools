/* Tự sinh bởi scripts/build.js từ assets/tools/slugify.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo slug: mỗi dòng một tiêu đề → đường dẫn thân thiện (không dấu, nối bằng -) */
import { textTool } from "../frames/text.js";
import { slugify } from "../lib/van-ban.js";

textTool({
  inputLabel: "Titles (one per line)",
  outputLabel: "Slug",
  placeholder: "Example: How to install Node.js on Windows 11",
  outputPlaceholder: "huong-dan-cai-dat-node-js-tren-windows-11",
  mono: false,
  sample: "How to install Node.js on Windows 11\n10 Street Foods You Must Try in Saigon!\niPhone 17 Pro review: Is it worth it?\nCafé crème & crêpes à la française",
  options: [
    { id: "sep", label: "Separator", value: "-", choices: [["-", "Hyphen (-)"], ["_", "Underscore (_)"], [".", "Dot (.)"]] },
    { id: "max", label: "Max length", value: "0", choices: [["0", "No limit"], ["50", "50 characters"], ["60", "60 characters"], ["75", "75 characters"], ["100", "100 characters"]] },
    { id: "lower", type: "check", label: "Lowercase", value: true }
  ],
  transform: (text, o) => text.split("\n").map((l) => slugify(l, { sep: o.sep, lower: o.lower, max: +o.max })).join("\n")
});
