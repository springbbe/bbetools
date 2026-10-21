/* Tính giảm giá: giảm theo %, giảm nhiều lần liên tiếp (20% + 10%), giảm số tiền cố định; số tiền tiết kiệm */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { money, num, stat, stats, table, alert, note } from "../calc.js";
import { parseChain, discountChain } from "../lib/phan-tram.js";

formTool({
  fields: [
    { id: "price", type: "money", label: "Giá gốc", value: "1500000", suffix: "đ" },
    { id: "type", type: "seg", label: "Kiểu giảm", value: "pct", choices: [["pct", "Phần trăm"], ["amount", "Số tiền"]] },
    { id: "pct", type: "text", label: "Mức giảm (%)", value: "20+10", attrs: { inputmode: "decimal" }, show: (v) => v.type === "pct", hint: "Giảm nhiều lần liên tiếp: viết 20+10 (giảm 20% rồi giảm tiếp 10% trên giá đã giảm)." },
    { id: "off", type: "money", label: "Số tiền được giảm", value: "200000", suffix: "đ", show: (v) => v.type === "amount" },
    { id: "qty", type: "number", label: "Số lượng", value: "1", attrs: { min: 1, step: 1, inputmode: "numeric" } }
  ],
  compute(v, out) {
    out.textContent = "";
    const price = +v.price || 0, qty = Math.max(1, Math.round(+v.qty || 1));
    if (!price) { out.append(alert("info", "Nhập giá gốc.")); return; }
    let final, steps = [];
    if (v.type === "amount") {
      const off = Math.min(+v.off || 0, price);
      final = price - off;
    } else {
      const chain = parseChain(v.pct);
      if (!chain.length) { out.append(alert("info", "Nhập mức giảm, ví dụ 30 hoặc 20+10.")); return; }
      if (chain.some((x) => x < 0 || x > 100)) { out.append(alert("err", "Mỗi mức giảm phải từ 0 đến 100%.")); return; }
      const r = discountChain(price, chain);
      final = r.price; steps = r.steps;
    }
    const saved = price - final;
    out.append(stats(
      stat("Giá sau giảm", money(final * qty), { hl: true, note: qty > 1 ? money(final) + " × " + qty : "" }),
      stat("Tiết kiệm được", money(saved * qty)),
      stat("Tổng mức giảm", num((saved / price) * 100, 2) + "%")));
    if (steps.length > 1) {
      out.append(table(["Lần giảm", "Giá trước", "Giảm", "Giá sau"], steps.map((s, i) => [`${i + 1}: ${num(s.pct, 2)}%`, money(s.before), "−\u00a0" + money(s.off), money(s.after)])),
        note(`Giảm ${steps.map((s) => num(s.pct, 2) + "%").join(" + ")} liên tiếp chỉ bằng giảm ${num((saved / price) * 100, 2)}% một lần, không phải ${num(steps.reduce((a, s) => a + s.pct, 0), 2)}%.`));
    }
  }
});
