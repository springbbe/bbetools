/* Đổi chữ hoa/thường: IN HOA, thường, Viết Hoa Mỗi Từ, Viết hoa đầu câu, đảo hoa/thường, camelCase, snake_case… */
import { textTool } from "../frames/text.js";
import { convertCase } from "../lib/van-ban.js";

textTool({
  inputLabel: "Văn bản",
  outputLabel: "Kết quả",
  placeholder: "Gõ hoặc dán văn bản cần đổi chữ hoa, chữ thường…",
  sample: "cộng hoà xã hội chủ nghĩa việt nam. độc lập - tự do - hạnh phúc!\nbbetools giúp bạn đổi chữ HOA, chữ thường thật nhanh.",
  options: [{
    id: "mode", label: "Kiểu chữ", value: "upper", choices: [
      ["upper", "IN HOA TOÀN BỘ"], ["lower", "chữ thường toàn bộ"], ["title", "Viết Hoa Chữ Cái Đầu Mỗi Từ"], ["sentence", "Viết hoa đầu câu"],
      ["toggle", "đẢO hOA/tHƯỜNG"], ["camel", "camelCase (lập trình)"], ["pascal", "PascalCase"], ["snake", "snake_case"], ["constant", "CONSTANT_CASE"], ["kebab", "kebab-case"]
    ]
  }],
  download: { name: "doi-chu-hoa-thuong.txt" },
  transform: (text, o) => convertCase(text, o.mode)
});
