/* Đổi đơn vị đất: m², ha, sào, mẫu, thước (Bắc Bộ, Trung Bộ), công (Nam Bộ)… */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, table, alert, note } from "../calc.js";
import { parseNum, fmtUnit } from "../lib/don-vi.js";

const D = await loadData("don-vi-dat");
const U = Object.fromEntries(D.units.map((u) => [u.id, u]));
const groups = [["", "Đơn vị chuẩn"], ["Bắc Bộ", "Bắc Bộ"], ["Trung Bộ", "Trung Bộ"], ["Nam Bộ", "Nam Bộ"]];

function unitSelect() {
  const s = h("select", { id: "u-from" }, groups.map(([r, label]) => h("optgroup", { label }, D.units.filter((u) => (u.region || "") === r).map((u) => h("option", { value: u.id, text: u.name })))));
  const el = h("div", { class: "field" }, h("label", { for: "u-from", text: "Đơn vị" }), s);
  return { el, get: () => s.value, set: (v) => { s.value = U[v] ? v : "sao-bac"; } };
}

formTool({
  fields: [
    { id: "v", type: "text", label: "Diện tích", value: "1", attrs: { inputmode: "decimal" }, placeholder: "Ví dụ: 2,5" },
    { id: "u", type: "custom", value: "sao-bac", render: unitSelect },
    { id: "region", type: "seg", label: "Hiện đơn vị của", value: "all", choices: [["all", "Cả nước"], ["Bắc Bộ", "Bắc"], ["Trung Bộ", "Trung"], ["Nam Bộ", "Nam"]] }
  ],
  compute(v, out) {
    out.textContent = "";
    const x = parseNum(v.v);
    if (!Number.isFinite(x) || x < 0) { out.append(alert("info", "Nhập diện tích là một số không âm, ví dụ 2,5.")); return; }
    const from = U[v.u];
    const m2 = x * from.m2;
    out.append(h("p", { class: "result-big", text: `${fmtUnit(x)} ${from.name.replace(/ \(.*\)$/, "")} = ${fmtUnit(m2)} m²` }));
    const rows = D.units.filter((u) => u.id !== from.id && (v.region === "all" || !u.region || u.region === v.region));
    out.append(table(["Đơn vị", "Giá trị", "1 đơn vị bằng"], rows.map((u) => [u.name, fmtUnit(m2 / u.m2), fmtUnit(u.m2) + " m²"]), { cls: ["l wrap"] }));
    out.append(note(D.note));
  }
});
