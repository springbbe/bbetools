/* Đổi đơn vị: chiều dài, khối lượng, nhiệt độ, diện tích, thể tích, tốc độ, thời gian, dữ liệu, áp suất, năng lượng */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { table, alert } from "../calc.js";
import { UNITS, convert, fmtUnit, parseNum } from "../lib/don-vi.js";

const DEF = { length: ["in", "cm"], mass: ["kg", "lb"], temp: ["F", "C"], area: ["m2", "ft2"], volume: ["l", "gal"], speed: ["kmh", "mph"], time: ["h", "min"], data: ["GB", "MB"], pressure: ["bar", "psi"], energy: ["kcal", "kJ"] };
let API = null;

function unitPair() {
  const from = h("select", { id: "uc-from" }), to = h("select", { id: "uc-to" });
  const fill = (cat) => { for (const s of [from, to]) { s.textContent = ""; UNITS[cat].units.forEach((u) => s.append(h("option", { value: u[0], text: u[1] }))); } };
  const swap = h("button", { class: "ib", type: "button", title: "Đảo chiều", "aria-label": "Đảo chiều đổi", html: icon("arrow-left-right"), onclick: () => { const a = from.value; from.value = to.value; to.value = a; API && API.update(); } });
  const el = h("div", { class: "uc-pair" },
    h("div", { class: "field" }, h("label", { for: "uc-from", text: "Từ" }), from), swap,
    h("div", { class: "field" }, h("label", { for: "uc-to", text: "Sang" }), to));
  let cat = "length";
  el._setCat = (c) => { if (c === cat && from.options.length) return; cat = c; fill(c); from.value = DEF[c][0]; to.value = DEF[c][1]; };
  return {
    el,
    get: () => from.value + ">" + to.value,
    set: (v) => {
      const [a, b] = String(v || "").split(">");
      const c = Object.keys(UNITS).find((k) => UNITS[k].units.some((u) => u[0] === a) && UNITS[k].units.some((u) => u[0] === b)) || "length";
      cat = c; fill(c); from.value = a && UNITS[c].units.some((u) => u[0] === a) ? a : DEF[c][0]; to.value = b && UNITS[c].units.some((u) => u[0] === b) ? b : DEF[c][1];
    }
  };
}

formTool({
  fields: [
    { id: "cat", type: "select", label: "Loại đại lượng", value: "length", choices: Object.entries(UNITS).map(([k, g]) => [k, g.name]) },
    { id: "v", type: "text", label: "Giá trị", value: "1", attrs: { inputmode: "decimal" } },
    { id: "u", type: "custom", render: unitPair, value: "in>cm" }
  ],
  init(api) {
    API = api;
    const sel = api.ctrls.cat.el.querySelector("select");
    // đồng bộ loại đại lượng với cặp đơn vị lấy từ URL
    const pairCat = Object.keys(UNITS).find((k) => UNITS[k].units.some((u) => u[0] === api.get("u").split(">")[0]));
    if (pairCat && pairCat !== sel.value) sel.value = pairCat;
    api.ctrls.u.el._setCat(sel.value);
    sel.addEventListener("change", () => api.ctrls.u.el._setCat(sel.value), true);
  },
  compute(v, out) {
    out.textContent = "";
    const x = parseNum(v.v);
    const [from, to] = v.u.split(">");
    const g = UNITS[v.cat];
    if (!Number.isFinite(x)) { out.append(alert("info", "Nhập một số, ví dụ 12,5.")); return; }
    if (!g.units.some((u) => u[0] === from)) return;
    const name = (id) => g.units.find((u) => u[0] === id)[1];
    const r = convert(v.cat, x, from, to);
    const text = `${fmtUnit(x)} ${name(from)} = ${fmtUnit(r)} ${name(to)}`;
    out.append(h("p", { class: "result-big", text }),
      h("p", { class: "row" }, h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(fmtUnit(r)) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép kết quả")));
    if (v.cat === "temp" && convert("temp", x, from, "K") < 0) out.append(alert("warn", "Nhiệt độ thấp hơn độ không tuyệt đối (0 K) — không có trong thực tế."));
    out.append(h("p", { class: "opt-title", text: `${fmtUnit(x)} ${name(from)} bằng` }),
      table(["Đơn vị", "Giá trị"], g.units.filter((u) => u[0] !== from).map((u) => [u[1], fmtUnit(convert(v.cat, x, from, u[0]))]), { hl: (row) => row[0] === name(to), cls: ["l wrap"] }));
  }
});

const st = document.createElement("style");
st.textContent = `.uc-pair{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:end}.uc-pair .ib{margin-bottom:2px}`;
document.head.append(st);
