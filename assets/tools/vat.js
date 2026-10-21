/* Tính VAT (thuế GTGT): giá chưa thuế → có thuế, hoặc tách thuế từ giá đã gồm VAT; số tiền bằng chữ cho hoá đơn */
import { h, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { money, stat, stats, kv, alert, note } from "../calc.js";
import { vat } from "../lib/phan-tram.js";
import { readNumber } from "../lib/doc-so.js";
import { parseNum } from "../lib/don-vi.js";

formTool({
  fields: [
    { id: "dir", type: "seg", label: "Chiều tính", value: "add", choices: [["add", "Chưa thuế → có thuế"], ["remove", "Đã gồm thuế → tách thuế"]] },
    { id: "amount", type: "money", label: "Số tiền", value: "10000000", suffix: "đ" },
    { id: "rate", type: "seg", label: "Thuế suất", value: "10", choices: [["0", "0%"], ["5", "5%"], ["8", "8%"], ["10", "10%"], ["other", "Khác"]], full: false,
      hint: "8%: mức giảm 2% cho phần lớn hàng hoá, dịch vụ chịu thuế 10% đến hết 31/12/2026 (Nghị quyết 204/2025/QH15), trừ viễn thông, tài chính, bất động sản, kim loại… và hàng chịu thuế tiêu thụ đặc biệt." },
    { id: "other", type: "text", label: "Thuế suất khác (%)", value: "", attrs: { inputmode: "decimal" }, show: (v) => v.rate === "other" }
  ],
  compute(v, out) {
    out.textContent = "";
    const amt = +v.amount || 0;
    const rate = v.rate === "other" ? parseNum(v.other) : +v.rate;
    if (!amt) { out.append(alert("info", "Nhập số tiền.")); return; }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) { out.append(alert("info", "Nhập thuế suất từ 0 đến 100%.")); return; }
    const r = vat(amt, rate, v.dir);
    out.append(stats(
      stat("Giá chưa thuế", money(r.net), { hl: v.dir === "remove" }),
      stat(`Tiền thuế GTGT (${String(rate).replace(".", ",")}%)`, money(r.tax)),
      stat("Tổng thanh toán", money(r.gross), { hl: v.dir === "add" })));
    const words = (n) => readNumber(String(n), { unit: "đồng" });
    out.append(kv([["Cộng tiền hàng", money(r.net)], ["Tiền thuế GTGT", money(r.tax)], ["Tổng cộng tiền thanh toán", money(r.gross)]]),
      h("div", { class: "field" }, h("span", { class: "lbl", text: "Số tiền viết bằng chữ" }), h("p", { style: { margin: 0 }, text: words(r.gross) }),
        h("button", { class: "btn ghost sm", type: "button", style: { alignSelf: "flex-start" }, onclick: () => copyText(words(r.gross)), text: "Sao chép" })),
      note(v.dir === "remove" ? `Giá chưa thuế = ${money(r.gross)} ÷ (1 + ${String(rate).replace(".", ",")}%), làm tròn đến đồng.` : `Thuế = ${money(r.net)} × ${String(rate).replace(".", ",")}%, làm tròn đến đồng.`));
  }
});
