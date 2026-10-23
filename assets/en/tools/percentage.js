/* Tự sinh bởi scripts/build.js từ assets/tools/percentage.js và i18n/en/js/ — đừng sửa tay. */
/* Máy tính phần trăm: X% của Y, X là bao nhiêu % của Y, tăng/giảm bao nhiêu %, cộng/trừ phần trăm, tìm số gốc */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { alert, note } from "../calc.js";
import { percentOf, whatPercent, change, applyChange, baseFromPart } from "../lib/phan-tram.js";
import { parseNum, fmtUnit } from "../lib/don-vi.js";

const MODES = [
  ["of", "X% of Y", "Percent X (%)", "Number Y"],
  ["what", "X is what % of Y", "Number X", "Number Y"],
  ["change", "Change from X to Y", "Old value X", "New value Y"],
  ["apply", "Y increased/decreased by X%", "Percent X (%, negative = decrease)", "Number Y"],
  ["base", "X is Y% of what number", "Number X", "Percent Y (%)"]
];
const M = Object.fromEntries(MODES.map((m) => [m[0], m]));

formTool({
  fields: [
    { id: "mode", type: "select", label: "Calculation", value: "of", choices: MODES.map((m) => [m[0], m[1]]) },
    { id: "a", type: "text", label: "X", value: "15", attrs: { inputmode: "decimal" } },
    { id: "b", type: "text", label: "Y", value: "200", attrs: { inputmode: "decimal" } }
  ],
  init(api) {
    const relabel = () => { const m = M[api.get("mode")]; api.ctrls.a.el.querySelector("label").textContent = m[2]; api.ctrls.b.el.querySelector("label").textContent = m[3]; };
    api.ctrls.mode.el.querySelector("select").addEventListener("change", relabel);
    relabel();
  },
  compute(v, out) {
    out.textContent = "";
    const a = parseNum(v.a), b = parseNum(v.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) { out.append(alert("info", "Enter two numbers (e.g. 12.5).")); return; }
    const f = fmtUnit;
    let big, explain;
    switch (v.mode) {
      case "what": { const r = whatPercent(a, b); if (!Number.isFinite(r)) return void out.append(alert("err", "Y must not be 0.")); big = `${f(a)} is ${f(r)}% of ${f(b)}`; explain = `${f(a)} ÷ ${f(b)} × 100 = ${f(r)}%`; break; }
      case "change": { const r = change(a, b); if (!Number.isFinite(r)) return void out.append(alert("err", "The old value must not be 0.")); big = r === 0 ? "No change" : `${r > 0 ? "Increase" : "Decrease"} ${f(Math.abs(r))}%`; explain = `(${f(b)} − ${f(a)}) ÷ ${f(Math.abs(a))} × 100 = ${f(r)}% · difference ${f(b - a)}`; break; }
      case "apply": { const r = applyChange(b, a); big = `${f(b)} ${a >= 0 ? "increase" : "decrease"} ${f(Math.abs(a))}% = ${f(r)}`; explain = `${f(b)} × (1 ${a >= 0 ? "+" : "−"} ${f(Math.abs(a))}%) = ${f(r)} · difference ${f(r - b)}`; break; }
      case "base": { const r = baseFromPart(a, b); if (!Number.isFinite(r)) return void out.append(alert("err", "The percentage must not be 0.")); big = `${f(a)} is ${f(b)}% of ${f(r)}`; explain = `${f(a)} ÷ ${f(b)}% = ${f(r)}`; break; }
      default: { const r = percentOf(a, b); big = `${f(a)}% of ${f(b)} = ${f(r)}`; explain = `${f(b)} × ${f(a)} ÷ 100 = ${f(r)}`; }
    }
    out.append(h("p", { class: "result-big", text: big }), h("p", { class: "muted", text: explain }));
    out.append(note("Tip: +10% then −10% doesn't return to the original (100 → 110 → 99). To find the price before an increase, use “X is Y% of what number” with Y = 110."));
  }
});
