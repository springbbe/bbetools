/* Tự sinh bởi scripts/build.js từ assets/tools/discount.js và i18n/en/js/ — đừng sửa tay. */
/* Tính giảm giá: giảm theo %, giảm nhiều lần liên tiếp (20% + 10%), giảm số tiền cố định; số tiền tiết kiệm */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { money, num, stat, stats, table, alert, note } from "../calc.js";
import { parseChain, discountChain } from "../lib/phan-tram.js";

formTool({
  fields: [
    { id: "price", type: "money", label: "Original price", value: "150", suffix: "" },
    { id: "type", type: "seg", label: "Discount type", value: "pct", choices: [["pct", "Percentage"], ["amount", "Amount"]] },
    { id: "pct", type: "text", label: "Discount (%)", value: "20+10", attrs: { inputmode: "decimal" }, show: (v) => v.type === "pct", hint: "Stacked discounts: write 20+10 (20% off, then another 10% off the discounted price)." },
    { id: "off", type: "money", label: "Discount amount", value: "20", suffix: "", show: (v) => v.type === "amount" },
    { id: "qty", type: "number", label: "Quantity", value: "1", attrs: { min: 1, step: 1, inputmode: "numeric" } }
  ],
  compute(v, out) {
    out.textContent = "";
    const price = +v.price || 0, qty = Math.max(1, Math.round(+v.qty || 1));
    if (!price) { out.append(alert("info", "Enter the original price.")); return; }
    let final, steps = [];
    if (v.type === "amount") {
      const off = Math.min(+v.off || 0, price);
      final = price - off;
    } else {
      const chain = parseChain(v.pct);
      if (!chain.length) { out.append(alert("info", "Enter the discount, e.g. 30 or 20+10.")); return; }
      if (chain.some((x) => x < 0 || x > 100)) { out.append(alert("err", "Each discount must be between 0 and 100%.")); return; }
      const r = discountChain(price, chain);
      final = r.price; steps = r.steps;
    }
    const saved = price - final;
    out.append(stats(
      stat("Price after discount", money(final * qty), { hl: true, note: qty > 1 ? money(final) + " × " + qty : "" }),
      stat("You save", money(saved * qty)),
      stat("Total discount", num((saved / price) * 100, 2) + "%")));
    if (steps.length > 1) {
      out.append(table(["Step", "Before", "Discount", "After"], steps.map((s, i) => [`${i + 1}: ${num(s.pct, 2)}%`, money(s.before), "−\u00a0" + money(s.off), money(s.after)])),
        note(`Stacked ${steps.map((s) => num(s.pct, 2) + "%").join(" + ")} discounts equal a single ${num((saved / price) * 100, 2)}% discount, not ${num(steps.reduce((a, s) => a + s.pct, 0), 2)}%.`));
    }
  }
});
