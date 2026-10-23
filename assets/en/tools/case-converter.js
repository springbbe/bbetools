/* Tự sinh bởi scripts/build.js từ assets/tools/case-converter.js và i18n/en/js/ — đừng sửa tay. */
/* Đổi chữ hoa/thường: IN HOA, thường, Viết Hoa Mỗi Từ, Viết hoa đầu câu, đảo hoa/thường, camelCase, snake_case… */
import { textTool } from "../frames/text.js";
import { convertCase } from "../lib/van-ban.js";

textTool({
  inputLabel: "Text",
  outputLabel: "Result",
  placeholder: "Type or paste the text to change to UPPER or lower case…",
  sample: "the quick brown fox jumps over the lazy dog. HELLO world!\nbbetools changes UPPER and lower case in a flash.",
  options: [{
    id: "mode", label: "Case", value: "upper", choices: [
      ["upper", "UPPERCASE"], ["lower", "lowercase"], ["title", "Capitalize Each Word"], ["sentence", "Sentence case"],
      ["toggle", "tOGGLE cASE"], ["camel", "camelCase (programming)"], ["pascal", "PascalCase"], ["snake", "snake_case"], ["constant", "CONSTANT_CASE"], ["kebab", "kebab-case"]
    ]
  }],
  download: { name: "case-converted.txt" },
  transform: (text, o) => convertCase(text, o.mode)
});
