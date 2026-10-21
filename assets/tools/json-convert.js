/* JSON ↔ CSV/YAML: chuyển qua lại giữa JSON, CSV (Excel mở được) và YAML; tự nhận định dạng đầu vào */
import { lib } from "../core.js";
import { textTool } from "../frames/text.js";
import { jsonToCsv, csvToJson, sniffDelimiter } from "../lib/csv.js";

let yaml = null;
const needYaml = async () => (yaml = yaml || (await lib("yaml")));
const EXT = { json: ["json", "application/json"], csv: ["csv", "text/csv"], yaml: ["yaml", "application/yaml"] };

function detect(s) {
  const t = s.trim();
  if (/^[[{]/.test(t)) return "json";
  const first = t.split("\n")[0];
  if (/^(---|[\w"'-][^:,;\t]*:(\s|$)|-\s)/.test(first) && !/[,;\t]/.test(first.replace(/:.*/, ""))) return "yaml";
  return "csv";
}

textTool({
  mono: true,
  inputLabel: "Dữ liệu đầu vào",
  outputLabel: "Kết quả",
  placeholder: '[{"ten": "An", "tuoi": 30}]  hoặc CSV, YAML',
  sample: '[\n  {"maNV": "NV001", "hoTen": "Nguyễn Văn An", "phongBan": "Kế toán", "luong": 15000000, "lienHe": {"dienThoai": "0901234567", "email": "an@congty.vn"}},\n  {"maNV": "NV002", "hoTen": "Trần Thị Bình", "phongBan": "Kinh doanh", "luong": 18500000, "lienHe": {"dienThoai": "0912345678", "email": "binh@congty.vn"}},\n  {"maNV": "NV003", "hoTen": "Lê Minh Châu", "phongBan": "Kỹ thuật, IT", "luong": 22000000, "lienHe": {"dienThoai": "0987654321", "email": "chau@congty.vn"}}\n]',
  options: [
    { id: "from", label: "Từ", value: "auto", choices: [["auto", "Tự nhận"], ["json", "JSON"], ["csv", "CSV"], ["yaml", "YAML"]] },
    { id: "to", label: "Sang", value: "csv", choices: [["json", "JSON"], ["csv", "CSV"], ["yaml", "YAML"]] },
    { id: "delim", label: "Dấu phân cách CSV", value: "auto", choices: [["auto", "Tự nhận / dấu phẩy"], [",", "Dấu phẩy (,)"], [";", "Chấm phẩy (;) – Excel tiếng Việt"], ["\t", "Tab"]] },
    { id: "infer", type: "check", label: "CSV → JSON: nhận số, true/false", value: true }
  ],
  download: { name: (o) => "du-lieu." + EXT[o.to][0], type: "text/plain" },
  async transform(text, o) {
    if (!text.trim()) return { text: "" };
    const from = o.from === "auto" ? detect(text) : o.from;
    let data;
    if (from === "json") {
      try { data = JSON.parse(text); } catch (e) { return { text: "", error: "JSON không hợp lệ: " + e.message + ". Kiểm tra bằng công cụ Định dạng JSON." }; }
    } else if (from === "yaml") {
      await needYaml();
      try { data = yaml.load(text); } catch (e) { return { text: "", error: "YAML không hợp lệ: " + (e.reason || e.message) + (e.mark ? ` (dòng ${e.mark.line + 1}, cột ${e.mark.column + 1})` : "") }; }
    } else {
      const delim = o.delim === "auto" ? sniffDelimiter(text) : o.delim;
      data = csvToJson(text, { delim, infer: o.infer });
    }
    if (from === o.to && from !== "csv") return { text, info: "Đầu vào và đầu ra cùng định dạng." };
    let res;
    if (o.to === "json") res = JSON.stringify(data, null, 2);
    else if (o.to === "yaml") { await needYaml(); res = yaml.dump(data, { lineWidth: 120, noRefs: true }); }
    else res = jsonToCsv(data, { delim: o.delim === "auto" ? "," : o.delim });
    const rows = Array.isArray(data) ? data.length : 1;
    return { text: res, info: `Đọc được dạng ${from.toUpperCase()}, ${rows.toLocaleString("vi-VN")} ${Array.isArray(data) ? "dòng/phần tử" : "đối tượng"}.` + (o.to === "csv" ? " Mở bằng Excel: chọn dấu phân cách chấm phẩy nếu máy đặt định dạng số kiểu Việt Nam." : "") };
  }
});
