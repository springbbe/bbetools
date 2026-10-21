/* Tính lãi vay trả góp: dư nợ giảm dần (gốc đều) hoặc trả đều hằng tháng, có lãi suất ưu đãi, lịch trả nợ chi tiết */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { money, num, stat, stats, table, csvButton, alert, note, dateVN } from "../calc.js";
import { loanSchedule } from "../lib/tai-chinh.js";
import { parseDate, addMonths } from "../lib/ngay.js";

formTool({
  fields: [
    { id: "p", type: "money", label: "Số tiền vay", value: "500000000", suffix: "đ" },
    { id: "n", type: "number", label: "Thời hạn vay", value: "20", attrs: { min: 1, max: 600, step: 1, inputmode: "numeric" } },
    { id: "unit", type: "seg", label: "Đơn vị thời hạn", value: "y", choices: [["y", "Năm"], ["m", "Tháng"]] },
    { id: "r", type: "number", label: "Lãi suất (%/năm)", value: "10", attrs: { min: 0, max: 100, step: "any" } },
    { id: "method", type: "seg", label: "Cách trả", value: "reducing", choices: [["reducing", "Dư nợ giảm dần"], ["annuity", "Trả đều hằng tháng"]],
      hint: "Dư nợ giảm dần: gốc chia đều, lãi tính trên dư nợ còn lại (tháng đầu trả nhiều nhất). Trả đều: mỗi tháng trả một số tiền như nhau." },
    { id: "promo", type: "check", label: "Có lãi suất ưu đãi những tháng đầu" },
    { id: "pm", type: "number", label: "Số tháng ưu đãi", value: "12", attrs: { min: 1, max: 120, step: 1, inputmode: "numeric" }, show: (v) => v.promo },
    { id: "pr", type: "number", label: "Lãi suất ưu đãi (%/năm)", value: "6.5", attrs: { min: 0, max: 100, step: "any" }, show: (v) => v.promo },
    { id: "start", type: "date", label: "Ngày giải ngân (tuỳ chọn)", value: "", hint: "Để hiện ngày trả từng kỳ trong lịch trả nợ." }
  ],
  compute(v, out) {
    out.textContent = "";
    const months = Math.round((+v.n || 0) * (v.unit === "y" ? 12 : 1));
    const P = +v.p || 0;
    if (!P || !months) { out.append(alert("info", "Nhập số tiền vay và thời hạn.")); return; }
    if (months > 600) { out.append(alert("err", "Thời hạn tối đa 50 năm (600 tháng).")); return; }
    const s = loanSchedule({ principal: P, months, rate: +v.r || 0, method: v.method, promoMonths: v.promo ? +v.pm : 0, promoRate: +v.pr || 0 });
    const last = s.rows[s.rows.length - 1];
    out.append(stats(
      stat(v.method === "annuity" ? "Trả mỗi tháng" : "Trả tháng đầu", money(s.firstPayment), { hl: true, note: v.method === "reducing" ? "giảm dần, tháng cuối " + money(last.payment) : v.promo ? "sau ưu đãi: " + money(s.rows[Math.min(+v.pm, months - 1)].payment) : "" }),
      stat("Tổng tiền lãi", money(s.totalInterest)),
      stat("Tổng phải trả", money(s.totalPayment)),
      stat("Lãi / gốc", num((s.totalInterest / P) * 100, 1) + "%")));
    const share = s.totalInterest / s.totalPayment;
    out.append(h("div", null,
      h("div", { class: "meter", role: "img", "aria-label": `Gốc ${num((1 - share) * 100, 1)}%, lãi ${num(share * 100, 1)}% tổng số tiền phải trả` },
        h("span", { style: { width: (1 - share) * 100 + "%", "--c": "var(--brand)" } }), h("span", { style: { width: share * 100 + "%", "--c": "var(--warn)" } })),
      h("ul", { class: "legend" }, h("li", { style: { "--c": "var(--brand)" }, text: "Tiền gốc " + money(P) }), h("li", { style: { "--c": "var(--warn)" }, text: "Tiền lãi " + money(s.totalInterest) }))));
    if (v.promo && +v.pm >= months) out.append(alert("info", "Thời gian ưu đãi dài bằng cả khoản vay: toàn bộ tính theo lãi suất ưu đãi."));

    const start = parseDate(v.start);
    const head = ["Kỳ", start ? "Ngày trả" : null, "Dư nợ đầu kỳ", "Gốc", "Lãi", "Tổng trả", "Dư nợ cuối kỳ"].filter(Boolean);
    const rows = s.rows.map((x) => [String(x.n), start ? dateVN(addMonths(start, x.n)) : null, money(x.opening, ""), money(x.principal, ""), money(x.interest, ""), money(x.payment, ""), money(x.closing, "")].filter((c) => c !== null));
    out.append(h("div", { class: "row", style: { justifyContent: "space-between" } }, h("p", { class: "opt-title", text: `Lịch trả nợ (${months} kỳ)` }),
      csvButton("lich-tra-no.csv", head, s.rows.map((x) => [x.n, start ? dateVN(addMonths(start, x.n)) : null, x.opening, x.principal, x.interest, x.payment, x.closing].filter((c) => c !== null)))),
      table(head, rows, { tall: true, caption: "Lịch trả nợ", hl: (r, i) => v.promo && i === +v.pm, foot: ["Cộng", start ? "" : null, "", money(P, ""), money(s.totalInterest, ""), money(s.totalPayment, ""), ""].filter((c) => c !== null) }),
      note("Đơn vị: đồng. Lãi mỗi tháng = dư nợ × lãi suất năm ÷ 12; ngân hàng có thể tính theo số ngày thực tế nên lệch đôi chút. Chưa gồm phí trả nợ trước hạn, bảo hiểm khoản vay."));
  }
});
