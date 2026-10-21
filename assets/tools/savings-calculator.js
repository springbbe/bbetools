/* Tính lãi tiết kiệm: lĩnh lãi cuối kỳ, hằng tháng, hoặc tái tục gốc + lãi; tính theo tháng hoặc theo số ngày thực tế */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { money, stat, stats, table, alert, note, dateVN } from "../calc.js";
import { savings } from "../lib/tai-chinh.js";
import { parseDate } from "../lib/ngay.js";

const TERMS = [1, 2, 3, 6, 9, 12, 13, 15, 18, 24, 36, 48, 60];

formTool({
  fields: [
    { id: "a", type: "money", label: "Số tiền gửi", value: "100000000", suffix: "đ" },
    { id: "r", type: "number", label: "Lãi suất (%/năm)", value: "5.5", attrs: { min: 0, max: 50, step: "any" }, hint: "Xem lãi suất niêm yết của ngân hàng cho đúng kỳ hạn và hình thức lĩnh lãi." },
    { id: "m", type: "select", label: "Kỳ hạn", value: "12", choices: TERMS.map((t) => [String(t), t + " tháng"]) },
    { id: "payout", type: "seg", label: "Lĩnh lãi", value: "end", choices: [["end", "Cuối kỳ"], ["monthly", "Hằng tháng"], ["rollover", "Tái tục gốc + lãi"]] },
    { id: "cycles", type: "number", label: "Số kỳ tái tục", value: "3", attrs: { min: 1, max: 50, step: 1, inputmode: "numeric" }, show: (v) => v.payout === "rollover", hint: "Hết kỳ, ngân hàng nhập lãi vào gốc và gửi tiếp kỳ hạn cũ (giả sử lãi suất không đổi)." },
    { id: "basis", type: "seg", label: "Cách tính lãi", value: "month", choices: [["month", "Theo tháng (lãi suất ÷ 12)"], ["day", "Theo số ngày thực tế / 365"]] },
    { id: "start", type: "date", label: "Ngày gửi", value: "", show: (v) => v.basis === "day", hint: "Để trống: hôm nay." }
  ],
  compute(v, out) {
    out.textContent = "";
    const A = +v.a || 0;
    if (!A) { out.append(alert("info", "Nhập số tiền gửi.")); return; }
    const sd = parseDate(v.start);
    const r = savings({ amount: A, rate: +v.r || 0, months: +v.m, payout: v.payout, cycles: +v.cycles || 1, basis: v.basis, start: sd ? new Date(sd.y, sd.m - 1, sd.d) : new Date() });
    const months = v.payout === "rollover" ? +v.m * (+v.cycles || 1) : +v.m;
    out.append(stats(
      stat("Tiền lãi", money(r.interest), { hl: true, note: v.payout === "monthly" ? "≈ " + money(r.interest / r.rows.length) + " mỗi tháng" : "" }),
      stat("Gốc + lãi khi tất toán", money(r.total)),
      stat("Thời gian gửi", months >= 12 && months % 12 === 0 ? months / 12 + " năm" : months + " tháng"),
      stat("Ngày đáo hạn", dateVN(r.rows[r.rows.length - 1].to))));
    const head = ["Kỳ", "Từ ngày", "Đến ngày", v.basis === "day" ? "Số ngày" : null, "Tiền gốc", "Tiền lãi", "Gốc + lãi"].filter(Boolean);
    out.append(table(head, r.rows.map((x) => [String(x.n), dateVN(x.from), dateVN(x.to), v.basis === "day" ? String(x.days) : null, money(x.principal, ""), money(x.interest, ""), money(v.payout === "monthly" ? x.principal + x.interest : x.balance, "")].filter((c) => c !== null)),
      { tall: r.rows.length > 12, caption: "Tiền lãi từng kỳ", foot: v.payout === "monthly" ? ["Cộng", "", "", v.basis === "day" ? "" : null, "", money(r.interest, ""), ""].filter((c) => c !== null) : null }));
    out.append(note("Đơn vị: đồng. Rút trước hạn thường chỉ được hưởng lãi không kỳ hạn (khoảng 0,1–0,5%/năm). Lãi tiền gửi tiết kiệm của cá nhân không phải nộp thuế TNCN."));
  }
});
