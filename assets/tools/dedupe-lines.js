/* Lọc dòng trùng & sắp xếp dòng: bỏ trùng, bỏ dòng trống, sắp xếp A→Z theo tiếng Việt, theo độ dài, đảo ngược, trộn */
import { fmtNum } from "../core.js";
import { textTool } from "../frames/text.js";
import { processLines } from "../lib/van-ban.js";

textTool({
  inputLabel: "Danh sách (mỗi dòng một mục)",
  outputLabel: "Kết quả",
  placeholder: "Dán danh sách, mỗi mục một dòng…",
  sample: "Nguyễn Văn Bình\nTrần Thị An\nlê minh châu\nĐặng Quốc Đạt\nTrần Thị An\n\nÂu Dương Phong\nnguyễn văn bình\nBùi Thu Hà\nĐỗ Hữu Cường\n",
  options: [
    { id: "sort", label: "Sắp xếp", value: "az", choices: [["none", "Giữ thứ tự"], ["az", "A → Z (tiếng Việt)"], ["za", "Z → A"], ["len", "Ngắn → dài"], ["lenDesc", "Dài → ngắn"], ["reverse", "Đảo ngược thứ tự"], ["shuffle", "Trộn ngẫu nhiên"]] },
    { id: "dedupe", type: "check", label: "Xoá dòng trùng", value: true },
    { id: "removeEmpty", type: "check", label: "Xoá dòng trống", value: true },
    { id: "trim", type: "check", label: "Cắt khoảng trắng 2 đầu", value: true },
    { id: "ignoreCase", type: "check", label: "Không phân biệt hoa/thường", value: true }
  ],
  download: { name: "danh-sach.txt" },
  transform(text, o) {
    if (!text) return { text: "" };
    const r = processLines(text, o);
    const bits = [`${fmtNum(r.total)} dòng → còn ${fmtNum(r.kept)} dòng`];
    if (o.dedupe) bits.push(`bỏ ${fmtNum(r.dup)} dòng trùng`);
    if (o.removeEmpty) bits.push(`${fmtNum(r.empty)} dòng trống`);
    return { text: r.text, info: bits.join(" · ") };
  }
});
