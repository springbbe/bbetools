/* Máy tính phần trăm: X% của Y, X là bao nhiêu % của Y, tăng/giảm bao nhiêu %, cộng/trừ phần trăm, tìm số gốc */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { alert, note } from "../calc.js";
import { percentOf, whatPercent, change, applyChange, baseFromPart } from "../lib/phan-tram.js";
import { parseNum, fmtUnit } from "../lib/don-vi.js";

const MODES = [
  ["of", "X% của Y", "Phần trăm X (%)", "Số Y"],
  ["what", "X là bao nhiêu % của Y", "Số X", "Số Y"],
  ["change", "Tăng/giảm từ X đến Y", "Giá trị cũ X", "Giá trị mới Y"],
  ["apply", "Y tăng/giảm X%", "Phần trăm X (%, âm = giảm)", "Số Y"],
  ["base", "X là Y% của số nào", "Số X", "Phần trăm Y (%)"]
];
const M = Object.fromEntries(MODES.map((m) => [m[0], m]));

formTool({
  fields: [
    { id: "mode", type: "select", label: "Phép tính", value: "of", choices: MODES.map((m) => [m[0], m[1]]) },
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
    if (!Number.isFinite(a) || !Number.isFinite(b)) { out.append(alert("info", "Nhập hai số (dùng dấu phẩy cho phần thập phân, ví dụ 12,5).")); return; }
    const f = fmtUnit;
    let big, explain;
    switch (v.mode) {
      case "what": { const r = whatPercent(a, b); if (!Number.isFinite(r)) return void out.append(alert("err", "Y phải khác 0.")); big = `${f(a)} là ${f(r)}% của ${f(b)}`; explain = `${f(a)} ÷ ${f(b)} × 100 = ${f(r)}%`; break; }
      case "change": { const r = change(a, b); if (!Number.isFinite(r)) return void out.append(alert("err", "Giá trị cũ phải khác 0.")); big = r === 0 ? "Không đổi" : `${r > 0 ? "Tăng" : "Giảm"} ${f(Math.abs(r))}%`; explain = `(${f(b)} − ${f(a)}) ÷ ${f(Math.abs(a))} × 100 = ${f(r)}% · chênh lệch ${f(b - a)}`; break; }
      case "apply": { const r = applyChange(b, a); big = `${f(b)} ${a >= 0 ? "tăng" : "giảm"} ${f(Math.abs(a))}% = ${f(r)}`; explain = `${f(b)} × (1 ${a >= 0 ? "+" : "−"} ${f(Math.abs(a))}%) = ${f(r)} · chênh lệch ${f(r - b)}`; break; }
      case "base": { const r = baseFromPart(a, b); if (!Number.isFinite(r)) return void out.append(alert("err", "Phần trăm phải khác 0.")); big = `${f(a)} là ${f(b)}% của ${f(r)}`; explain = `${f(a)} ÷ ${f(b)}% = ${f(r)}`; break; }
      default: { const r = percentOf(a, b); big = `${f(a)}% của ${f(b)} = ${f(r)}`; explain = `${f(b)} × ${f(a)} ÷ 100 = ${f(r)}`; }
    }
    out.append(h("p", { class: "result-big", text: big }), h("p", { class: "muted", text: explain }));
    out.append(note("Mẹo: tăng 10% rồi giảm 10% không về số cũ (100 → 110 → 99). Muốn biết giá trước khi tăng, dùng “X là Y% của số nào” với Y = 110."));
  }
});
