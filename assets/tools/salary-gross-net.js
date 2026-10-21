/* Tính lương gross ↔ net: BHXH, BHYT, BHTN (có trần), thuế TNCN biểu 5 bậc 2026, chi phí doanh nghiệp */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, money, pct, kv, stat, stats, table, alert, note } from "../calc.js";
import { grossToNet, netToGross } from "../lib/tien-luong.js";

const [TAX, BH, VUNG] = await Promise.all([loadData("thue-tncn"), loadData("bhxh"), loadData("luong-toi-thieu-vung")]);
const ROMAN = ["", "I", "II", "III", "IV"];

function options(v, rules = TAX) {
  const minWage = VUNG.regions[v.region] || VUNG.regions["1"];
  return {
    ins: { baseSalary: BH.baseSalary, capMultiple: BH.capMultiple, minWage, rates: BH.employee, employerRates: BH.employer },
    insBase: v.insMode === "none" ? 0 : v.insMode === "custom" ? +v.insBase || 0 : null,
    tax: { personal: rules.personal, dependent: rules.dependent, brackets: rules.brackets },
    dependents: Math.max(0, Math.min(20, Math.round(+v.dep || 0))), exempt: +v.exempt || 0, minWage
  };
}

formTool({
  fields: [
    { id: "mode", type: "seg", label: "Chiều tính", value: "g2n", choices: [["g2n", "Gross → Net"], ["n2g", "Net → Gross"]] },
    { id: "gross", type: "money", label: "Lương gross (trước bảo hiểm và thuế)", value: "30000000", suffix: "đ", show: (v) => v.mode === "g2n" },
    { id: "net", type: "money", label: "Lương net mong muốn (thực nhận)", value: "25000000", suffix: "đ", show: (v) => v.mode === "n2g" },
    { id: "dep", type: "number", label: "Số người phụ thuộc", value: "0", attrs: { min: 0, max: 20, step: 1, inputmode: "numeric" }, hint: `Mỗi người được giảm trừ ${money(TAX.dependent)}/tháng (bản thân ${money(TAX.personal)}).` },
    { id: "region", type: "select", label: "Vùng (nơi doanh nghiệp hoạt động)", value: "1", choices: Object.entries(VUNG.regions).map(([k, m]) => [k, `Vùng ${ROMAN[k]} – lương tối thiểu ${money(m)}`]), hint: "Dùng để tính trần BHTN và kiểm tra mức lương tối thiểu." },
    { id: "insMode", type: "seg", label: "Mức lương đóng bảo hiểm", value: "full", choices: [["full", "Trên lương chính thức"], ["custom", "Mức khác"], ["none", "Không đóng"]] },
    { id: "insBase", type: "money", label: "Mức lương đóng bảo hiểm", value: "", suffix: "đ", placeholder: "Ví dụ: 6.000.000", show: (v) => v.insMode === "custom" },
    { id: "exempt", type: "money", label: "Khoản không tính thuế (tuỳ chọn)", value: "", suffix: "đ", placeholder: "Ăn trưa, phụ cấp điện thoại…", hint: "Các khoản được miễn thuế TNCN theo quy định (đã nằm trong lương gross)." }
  ],
  compute(v, out) {
    out.textContent = "";
    const o = options(v);
    const target = +(v.mode === "g2n" ? v.gross : v.net) || 0;
    if (!target) { out.append(alert("info", "Nhập mức lương để xem kết quả.")); return; }
    const r = v.mode === "g2n" ? grossToNet(target, o) : netToGross(target, o);
    const insBase = o.insBase == null ? r.gross : o.insBase;

    out.append(stats(
      stat("Lương gross", money(r.gross), { hl: v.mode === "n2g" }),
      stat("Lương net (thực nhận)", money(r.net), { hl: v.mode === "g2n" }),
      stat("Bảo hiểm (10,5%)", money(r.ins.total)),
      stat("Thuế TNCN", money(r.tax), { note: r.gross ? "≈ " + pct(r.tax / r.gross, 1) + " lương gross" : "" })));

    if (insBase > 0 && insBase < o.minWage) out.append(alert("warn", `Mức đóng bảo hiểm ${money(insBase)} thấp hơn lương tối thiểu vùng ${ROMAN[v.region]} (${money(o.minWage)}).`));
    if (r.ins.capped) out.append(alert("info", `Lương đóng bảo hiểm vượt trần: BHXH, BHYT tính tối đa trên ${money(BH.baseSalary * BH.capMultiple)} (20 lần lương cơ sở); BHTN tối đa trên ${money(o.minWage * BH.capMultiple)} (20 lần lương tối thiểu vùng).`));

    out.append(h("p", { class: "opt-title", text: "Diễn giải (người lao động)" }), kv([
      ["Lương gross", money(r.gross)],
      ["Mức lương đóng bảo hiểm", money(insBase)],
      [`BHXH (${pct(BH.employee.bhxh, 1)})`, "−\u00a0" + money(r.ins.bhxh)],
      [`BHYT (${pct(BH.employee.bhyt, 1)})`, "−\u00a0" + money(r.ins.bhyt)],
      [`BHTN (${pct(BH.employee.bhtn, 1)})`, "−\u00a0" + money(r.ins.bhtn)],
      ["Thu nhập trước thuế", money(r.gross - r.ins.total)],
      o.exempt ? ["Khoản không tính thuế", "−\u00a0" + money(Math.min(o.exempt, r.gross))] : null,
      ["Giảm trừ bản thân", "−\u00a0" + money(TAX.personal)],
      o.dependents ? [`Giảm trừ ${o.dependents} người phụ thuộc`, "−\u00a0" + money(TAX.dependent * o.dependents)] : null,
      ["Thu nhập tính thuế", money(r.taxable)],
      ["Thuế TNCN", "−\u00a0" + money(r.tax)],
      ["Lương net", money(r.net)]
    ]));

    if (r.parts.length) {
      out.append(h("p", { class: "opt-title", text: "Thuế theo từng bậc" }),
        table(["Bậc", "Phần thu nhập", "Thuế suất", "Thuế"], r.parts.map((p, i) => [String(i + 1), money(p.amount), pct(p.rate, 0), money(p.tax)]), { foot: ["Cộng", money(r.taxable), "", money(r.tax)] }));
    }

    out.append(h("p", { class: "opt-title", text: "Doanh nghiệp phải trả" }),
      table(["Khoản", "Tỉ lệ", "Số tiền"], [
        ["Lương gross", "", money(r.gross)],
        ["BHXH", pct(BH.employer.bhxh, 1), money(r.employer.bhxh)],
        ["BHYT", pct(BH.employer.bhyt, 1), money(r.employer.bhyt)],
        ["BHTN", pct(BH.employer.bhtn, 1), money(r.employer.bhtn)]
      ], { foot: ["Tổng chi phí", "", money(r.cost)] }),
      note(BH.employerNote));

    // so với cách tính năm 2025 (biểu 7 bậc, giảm trừ 11 triệu / 4,4 triệu)
    const old = grossToNet(r.gross, options(v, TAX.previous));
    const diff = old.tax - r.tax;
    if (diff > 0) out.append(alert("ok", `So với cách tính ${TAX.previous.label} (giảm trừ ${money(TAX.previous.personal)}, biểu 7 bậc), bạn nộp ít hơn ${money(diff)}/tháng (${money(diff * 12)}/năm).`));
  }
});
