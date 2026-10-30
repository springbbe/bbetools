/* Tính thuế TNCN từ tiền lương, tiền công: theo tháng hoặc quyết toán năm, có giảm trừ gia cảnh, so sánh với cách tính cũ */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, money, pct, kv, stat, stats, table, alert, note } from "../calc.js";
import { progressiveTax, yearlyBrackets, insurance } from "../lib/tien-luong.js";

const [TAX, BH, VUNG] = await Promise.all([loadData("thue-tncn"), loadData("bhxh"), loadData("luong-toi-thieu-vung")]);

function calc(v, rules) {
  const k = v.period === "year" ? 12 : 1;
  const income = +v.income || 0;
  const exempt = Math.min(+v.exempt || 0, income);
  const ins = v.insMode === "manual" ? +v.ins || 0
    : insurance(income / k, { baseSalary: BH.baseSalary, capMultiple: BH.capMultiple, minWage: VUNG.regions["1"], rates: BH.employee }).total * k;
  const dep = Math.max(0, Math.round(+v.dep || 0));
  const other = +v.other || 0;
  const personal = rules.personal * k, depAmt = rules.dependent * dep * k;
  const assessable = income - exempt;
  const taxable = Math.max(0, assessable - personal - depAmt - ins - other);
  const t = progressiveTax(taxable, k === 12 ? yearlyBrackets(rules.brackets) : rules.brackets);
  return { k, income, exempt, ins, dep, other, personal, depAmt, assessable, taxable, ...t };
}

formTool({
  fields: [
    { id: "period", type: "seg", label: "Tính theo", value: "month", choices: [["month", "Tháng"], ["year", "Cả năm (quyết toán)"]] },
    { id: "resident", type: "seg", label: "Cá nhân", value: "1", choices: [["1", "Cư trú"], ["0", "Không cư trú"]], hint: "Không cư trú: ở Việt Nam dưới 183 ngày trong năm và không có nơi ở thường xuyên — chịu 20% trên thu nhập, không được giảm trừ." },
    { id: "income", type: "money", label: "Tổng thu nhập từ lương, thưởng", value: "35000000", suffix: "đ", hint: "Kỳ tháng: thu nhập của tháng; quyết toán: tổng cả năm." },
    { id: "exempt", type: "money", label: "Khoản không chịu thuế (tuỳ chọn)", value: "", suffix: "đ", placeholder: "Ăn giữa ca, làm thêm giờ phần vượt…", show: (v) => v.resident === "1" },
    { id: "insMode", type: "seg", label: "Bảo hiểm bắt buộc đã đóng", value: "auto", choices: [["auto", "Tự tính (10,5%)"], ["manual", "Nhập số tiền"]], show: (v) => v.resident === "1" },
    { id: "ins", type: "money", label: "Số tiền bảo hiểm đã đóng", value: "", suffix: "đ", show: (v) => v.resident === "1" && v.insMode === "manual" },
    { id: "dep", type: "number", label: "Số người phụ thuộc", value: "0", attrs: { min: 0, max: 20, step: 1, inputmode: "numeric" }, show: (v) => v.resident === "1" },
    { id: "other", type: "money", label: "Từ thiện, quỹ hưu trí tự nguyện (tuỳ chọn)", value: "", suffix: "đ", hint: "Khoản đóng góp được trừ khi tính thuế (quỹ hưu trí tự nguyện tối đa 1 triệu đồng/tháng).", show: (v) => v.resident === "1" }
  ],
  compute(v, out) {
    out.textContent = "";
    const income = +v.income || 0;
    if (!income) { out.append(alert("info", "Nhập thu nhập để tính thuế.")); return; }
    const unit = v.period === "year" ? "/năm" : "/tháng";
    if (v.resident === "0") {
      const tax = Math.round(income * TAX.nonResidentRate);
      out.append(stats(stat("Thuế TNCN", money(tax), { hl: true }), stat("Thu nhập sau thuế", money(income - tax))),
        note(`Cá nhân không cư trú nộp ${pct(TAX.nonResidentRate, 0)} trên toàn bộ thu nhập từ tiền lương, tiền công, không được giảm trừ gia cảnh.`));
      return;
    }
    const r = calc(v, TAX);
    out.append(stats(
      stat(v.period === "year" ? "Thuế TNCN phải nộp mỗi năm" : "Thuế TNCN phải nộp mỗi tháng", money(r.tax), { hl: true }),
      stat("Thu nhập tính thuế", money(r.taxable)),
      stat("Thuế suất bình quân", r.income ? pct(r.tax / r.income, 2) : "0%", { note: "trên tổng thu nhập" }),
      stat("Thuế suất cao nhất phải chịu", r.parts.length ? pct(r.parts[r.parts.length - 1].rate, 0) : "0%")));
    out.append(h("p", { class: "opt-title", text: "Cách tính" }), kv([
      ["Tổng thu nhập", money(r.income)],
      r.exempt ? ["Khoản không chịu thuế", "−\u00a0" + money(r.exempt)] : null,
      ["Thu nhập chịu thuế", money(r.assessable)],
      ["Giảm trừ bản thân", "−\u00a0" + money(r.personal)],
      r.dep ? [`Giảm trừ ${r.dep} người phụ thuộc`, "−\u00a0" + money(r.depAmt)] : null,
      ["Bảo hiểm bắt buộc", "−\u00a0" + money(r.ins)],
      r.other ? ["Từ thiện, hưu trí tự nguyện", "−\u00a0" + money(r.other)] : null,
      ["Thu nhập tính thuế", money(r.taxable)],
      ["Thuế TNCN", money(r.tax)]
    ]));
    if (r.parts.length) {
      out.append(table(["Bậc", r.k === 12 ? "Khoảng thu nhập/năm" : "Khoảng thu nhập/tháng", "Thuế suất", "Phần chịu thuế", "Thuế"],
        r.parts.map((p, i) => [String(i + 1), p.to == null ? "trên " + money(p.from, "") : money(p.from, "") + " – " + money(p.to, ""), pct(p.rate, 0), money(p.amount), money(p.tax)]),
        { foot: ["", "", "", money(r.taxable), money(r.tax)] }));
    } else out.append(alert("ok", "Thu nhập chưa đến mức phải nộp thuế."));
    const old = calc(v, TAX.previous);
    if (old.tax !== r.tax) out.append(alert(old.tax > r.tax ? "ok" : "info", `Theo cách tính ${TAX.previous.label} (giảm trừ bản thân ${money(TAX.previous.personal)}, người phụ thuộc ${money(TAX.previous.dependent)}, biểu 7 bậc), thuế là ${money(old.tax)}${unit} — ${old.tax > r.tax ? "nhiều hơn " + money(old.tax - r.tax) : "ít hơn " + money(r.tax - old.tax)}.`));
    if (v.insMode === "auto") out.append(note(`Bảo hiểm tự tính 10,5% trên thu nhập, tối đa theo trần 20 lần lương cơ sở (${money(BH.baseSalary * BH.capMultiple)}). Nếu mức đóng bảo hiểm của bạn thấp hơn lương, hãy chọn “Nhập số tiền”.`));
  }
});
