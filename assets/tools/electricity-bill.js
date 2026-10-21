/* Tính tiền điện sinh hoạt bậc thang theo biểu giá EVN hiện hành; tính ngược từ số tiền ra số kWh */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, money, num, pct, stat, stats, table, alert, note } from "../calc.js";
import { electricityBill, kwhForAmount } from "../lib/tien-dien.js";

const D = await loadData("gia-dien");
const vatNow = new Date() <= new Date(D.vatUntil + "T23:59:59") ? D.vat : D.vatNormal;

formTool({
  fields: [
    { id: "mode", type: "seg", label: "Tính", value: "kwh", choices: [["kwh", "Từ số điện ra tiền"], ["money", "Từ tiền ra số điện"]] },
    { id: "input", type: "seg", label: "Nhập", value: "kwh", choices: [["kwh", "Số kWh đã dùng"], ["meter", "Chỉ số công tơ"]], show: (v) => v.mode === "kwh" },
    { id: "kwh", type: "number", label: "Số điện tiêu thụ (kWh)", value: "250", attrs: { min: 0, step: "any" }, show: (v) => v.mode === "kwh" && v.input === "kwh" },
    { id: "old", type: "number", label: "Chỉ số cũ", value: "", attrs: { min: 0, step: "any" }, show: (v) => v.mode === "kwh" && v.input === "meter" },
    { id: "new", type: "number", label: "Chỉ số mới", value: "", attrs: { min: 0, step: "any" }, show: (v) => v.mode === "kwh" && v.input === "meter" },
    { id: "amount", type: "money", label: "Số tiền trên hoá đơn (đã gồm VAT)", value: "", suffix: "đ", show: (v) => v.mode === "money" },
    { id: "hh", type: "number", label: "Số hộ dùng chung công tơ", value: "1", attrs: { min: 1, max: 50, step: 1, inputmode: "numeric" }, hint: "Mỗi hộ có sổ hộ khẩu/đăng ký cư trú riêng được tính một định mức bậc thang." },
    { id: "vat", type: "select", label: "Thuế GTGT", value: String(vatNow * 100), choices: [["8", "8% (giảm thuế đến " + D.vatUntil.split("-").reverse().join("/") + ")"], ["10", "10%"], ["0", "Không tính"]] }
  ],
  compute(v, out) {
    out.textContent = "";
    const o = { households: +v.hh || 1, vat: (+v.vat || 0) / 100 };
    let kwh;
    if (v.mode === "money") {
      const amt = +v.amount || 0;
      if (!amt) { out.append(alert("info", "Nhập số tiền điện để ước tính số kWh đã dùng.")); return; }
      kwh = kwhForAmount(amt, D.tiers, o);
      out.append(stats(stat("Số điện đã dùng khoảng", num(kwh, 0) + " kWh", { hl: true }), stat("Tiền điện ứng với " + num(kwh, 0) + " kWh", money(electricityBill(kwh, D.tiers, o).total))));
    } else {
      if (v.input === "meter") {
        if (v.old === "" || v.new === "") { out.append(alert("info", "Nhập chỉ số cũ và chỉ số mới trên công tơ.")); return; }
        kwh = +v.new - +v.old;
        if (kwh < 0) { out.append(alert("err", "Chỉ số mới nhỏ hơn chỉ số cũ.")); return; }
      } else kwh = +v.kwh || 0;
    }
    const b = electricityBill(kwh, D.tiers, o);
    if (v.mode === "kwh") out.append(stats(
      stat("Tổng tiền điện", money(b.total), { hl: true }),
      stat("Tiền điện chưa thuế", money(b.subtotal)),
      stat("Thuế GTGT " + v.vat + "%", money(b.vat)),
      stat("Giá bình quân", kwh ? money(b.total / kwh) + "/kWh" : "–")));
    if (kwh > 0) out.append(table(["Bậc", "Khoảng kWh", "Số kWh", "Đơn giá", "Thành tiền"],
      b.rows.map((r) => ["Bậc " + r.tier, r.to == null ? "từ " + r.from + " trở lên" : r.from + " – " + r.to, num(r.kwh, 2), money(r.price, ""), money(r.amount, "")]),
      { foot: ["Cộng", "", num(kwh, 2), "", money(b.subtotal, "")] }));
    out.append(h("p", { class: "opt-title", text: "Biểu giá điện sinh hoạt (chưa VAT)" }),
      table(["Bậc", "Mức sử dụng/tháng", "Giá (đ/kWh)"], D.tiers.map((t, i, a) => ["Bậc " + (i + 1), t.upTo == null ? "Từ " + (a[i - 1].upTo + 1) + " kWh trở lên" : (i ? a[i - 1].upTo + 1 : 0) + " – " + t.upTo + " kWh", money(t.price, "")])),
      note(`Công tơ thẻ trả trước: ${money(D.prepaid, "")} đ/kWh (một giá). ${o.households > 1 ? `Đang nhân định mức mỗi bậc với ${o.households} hộ. ` : ""}Kỳ ghi chỉ số không tròn tháng hoặc có đổi giá giữa kỳ, EVN chia định mức theo số ngày nên hoá đơn thực tế có thể lệch đôi chút. Thuế GTGT ${pct(o.vat, 0)}.`));
  }
});
