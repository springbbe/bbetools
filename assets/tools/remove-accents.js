/* Bỏ dấu tiếng Việt: "Tiếng Việt có dấu" → "Tieng Viet co dau" */
import { textTool } from "../frames/text.js";
import { removeAccents } from "../lib/van-ban.js";

textTool({
  inputLabel: "Văn bản có dấu",
  outputLabel: "Không dấu",
  placeholder: "Dán văn bản tiếng Việt có dấu vào đây…",
  sample: "Đường Trường Sơn, Thành phố Hồ Chí Minh\nNguyễn Thị Hồng Nhung – Phòng Kế toán\nỞ đâu có ý chí, ở đó có con đường.",
  options: [
    { id: "keepD", type: "check", label: "Giữ chữ đ/Đ", value: false },
    { id: "lower", type: "check", label: "Chuyển thành chữ thường", value: false }
  ],
  download: { name: "khong-dau.txt" },
  transform(text, o) {
    const r = removeAccents(text, { keepD: o.keepD });
    return o.lower ? r.toLowerCase() : r;
  }
});
