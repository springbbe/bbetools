/* Tạo slug: mỗi dòng một tiêu đề → đường dẫn thân thiện (không dấu, nối bằng -) */
import { textTool } from "../frames/text.js";
import { slugify } from "../lib/van-ban.js";

textTool({
  inputLabel: "Tiêu đề (mỗi dòng một tiêu đề)",
  outputLabel: "Slug",
  placeholder: "Ví dụ: Hướng dẫn cài đặt Node.js trên Windows 11",
  outputPlaceholder: "huong-dan-cai-dat-node-js-tren-windows-11",
  mono: false,
  sample: "Hướng dẫn cài đặt Node.js trên Windows 11\n10 món ăn đường phố Sài Gòn nhất định phải thử!\nĐánh giá iPhone 17 Pro: Có đáng tiền?",
  options: [
    { id: "sep", label: "Nối bằng", value: "-", choices: [["-", "Gạch ngang (-)"], ["_", "Gạch dưới (_)"], [".", "Dấu chấm (.)"]] },
    { id: "max", label: "Dài tối đa", value: "0", choices: [["0", "Không giới hạn"], ["50", "50 ký tự"], ["60", "60 ký tự"], ["75", "75 ký tự"], ["100", "100 ký tự"]] },
    { id: "lower", type: "check", label: "Chữ thường", value: true }
  ],
  transform: (text, o) => text.split("\n").map((l) => slugify(l, { sep: o.sep, lower: o.lower, max: +o.max })).join("\n")
});
