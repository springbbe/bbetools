/* Tự sinh bởi scripts/build.js từ assets/tools/json-convert.js và i18n/en/js/ — đừng sửa tay. */
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
  inputLabel: "Input data",
  outputLabel: "Result",
  placeholder: "[{\"name\": \"An\", \"age\": 30}]  or CSV, YAML",
  sample: "[\n  {\"id\": \"E001\", \"name\": \"John Smith\", \"department\": \"Accounting\", \"salary\": 5200, \"contact\": {\"phone\": \"+1 555 0101\", \"email\": \"john@company.example\"}},\n  {\"id\": \"E002\", \"name\": \"Jane Doe\", \"department\": \"Sales\", \"salary\": 6100, \"contact\": {\"phone\": \"+1 555 0102\", \"email\": \"jane@company.example\"}},\n  {\"id\": \"E003\", \"name\": \"Chris Lee\", \"department\": \"Engineering, IT\", \"salary\": 7400, \"contact\": {\"phone\": \"+1 555 0103\", \"email\": \"chris@company.example\"}}\n]",
  options: [
    { id: "from", label: "From", value: "auto", choices: [["auto", "Auto-detect"], ["json", "JSON"], ["csv", "CSV"], ["yaml", "YAML"]] },
    { id: "to", label: "To", value: "csv", choices: [["json", "JSON"], ["csv", "CSV"], ["yaml", "YAML"]] },
    { id: "delim", label: "CSV delimiter", value: "auto", choices: [["auto", "Auto-detect / comma"], [",", "Comma (,)"], [";", "Semicolon (;) – Excel in some locales"], ["\t", "Tab"]] },
    { id: "infer", type: "check", label: "CSV → JSON: detect numbers, true/false", value: true }
  ],
  download: { name: (o) => "data." + EXT[o.to][0], type: "text/plain" },
  async transform(text, o) {
    if (!text.trim()) return { text: "" };
    const from = o.from === "auto" ? detect(text) : o.from;
    let data;
    if (from === "json") {
      try { data = JSON.parse(text); } catch (e) { return { text: "", error: "Invalid JSON: " + e.message + ". Check it with the JSON Formatter tool." }; }
    } else if (from === "yaml") {
      await needYaml();
      try { data = yaml.load(text); } catch (e) { return { text: "", error: "Invalid YAML: " + (e.reason || e.message) + (e.mark ? ` (line ${e.mark.line + 1}, column ${e.mark.column + 1})` : "") }; }
    } else {
      const delim = o.delim === "auto" ? sniffDelimiter(text) : o.delim;
      data = csvToJson(text, { delim, infer: o.infer });
    }
    if (from === o.to && from !== "csv") return { text, info: "The input and output are the same format." };
    let res;
    if (o.to === "json") res = JSON.stringify(data, null, 2);
    else if (o.to === "yaml") { await needYaml(); res = yaml.dump(data, { lineWidth: 120, noRefs: true }); }
    else res = jsonToCsv(data, { delim: o.delim === "auto" ? "," : o.delim });
    const rows = Array.isArray(data) ? data.length : 1;
    return { text: res, info: `Read as ${from.toUpperCase()}, ${rows.toLocaleString("en-US")} ${Array.isArray(data) ? "rows/items" : "object"}.` + (o.to === "csv" ? " To open in Excel: choose the semicolon delimiter if your computer uses comma decimals." : "") };
  }
});
