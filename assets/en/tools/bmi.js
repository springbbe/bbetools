/* Tự sinh bởi scripts/build.js từ assets/tools/bmi.js và i18n/en/js/ — đừng sửa tay. */
/* Tính BMI theo ngưỡng cho người châu Á (WHO 2000), cân nặng hợp lý theo chiều cao */
import { h, HOME } from "../core.js";
import { formTool } from "../frames/form.js";
import { num, stat, stats, table, alert } from "../calc.js";
import { bmi, bmiClass, healthyRange, BMI_ASIA, BMI_WHO } from "../lib/suc-khoe.js";
import { parseNum } from "../lib/don-vi.js";

formTool({
  fields: [
    { id: "h", type: "text", label: "Height (cm)", value: "165", attrs: { inputmode: "decimal" } },
    { id: "w", type: "text", label: "Weight (kg)", value: "60", attrs: { inputmode: "decimal" } },
    { id: "std", type: "seg", label: "Classification standard", value: "asia", choices: [["asia", "Asian"], ["who", "International (WHO)"]] }
  ],
  compute(v, out) {
    out.textContent = "";
    const cm = parseNum(v.h), kg = parseNum(v.w);
    if (!(cm >= 50 && cm <= 250) || !(kg >= 10 && kg <= 400)) { out.append(alert("info", "Enter height (50–250 cm) and weight (10–400 kg).")); return; }
    const T = v.std === "who" ? BMI_WHO : BMI_ASIA;
    const b = bmi(kg, cm), c = bmiClass(b, T), r = healthyRange(cm, T);
    out.append(stats(stat("BMI", num(b, 1), { hl: true }), stat("Category", c.label, { tone: c.tone === "ok" ? "ok" : c.tone === "err" ? "err" : null }), stat("Healthy weight", `${num(r.min, 1)} – ${num(r.max, 1)} kg`)));
    // thang màu từ 15 đến 35
    const lo = 15, hi = 35, pos = Math.max(0, Math.min(100, ((b - lo) / (hi - lo)) * 100));
    const segs = T.map((x, i) => { const from = i ? T[i - 1].max : lo, to = Math.min(x.max, hi); return { w: ((Math.max(0, to - Math.max(from, lo))) / (hi - lo)) * 100, tone: x.tone, label: x.label }; }).filter((s) => s.w > 0);
    out.append(h("div", { class: "bmi-scale", role: "img", "aria-label": `BMI ${num(b, 1)}: ${c.label}` },
      h("div", { class: "meter" }, segs.map((s) => h("span", { style: { width: s.w + "%", "--c": `var(--${s.tone})` } }))),
      h("span", { class: "bmi-pin", style: { left: pos + "%" } })));
    if (kg < r.min) out.append(alert("warn", `Gain about ${num(r.min - kg, 1)} kg to reach the normal range.`));
    else if (kg > r.max) out.append(alert("warn", `Lose about ${num(kg - r.max, 1)} kg to reach the normal range.`));
    else out.append(alert("ok", "Your weight is in the normal range."));
    out.append(table(["Category", "BMI"], T.map((x, i) => [x.label, i === 0 ? `under ${num(x.max, 1)}` : x.max === Infinity ? `${num(T[i - 1].max, 1)} and above` : `${num(T[i - 1].max, 1)} – under ${num(x.max, 1)}`]), { hl: (row) => row[0] === c.label, cls: ["l"] }),
      h("p", { class: "hint" }, "BMI = weight (kg) ÷ height (m)². Asians have more body fat at the same BMI, so the overweight threshold is lower (23). BMI doesn't apply to children under 18, pregnant women or very muscular athletes. Daily calorie needs: ",
        h("a", { href: HOME + "tdee/", text: "Daily calorie needs (TDEE)" }), "."));
  }
});

const st = document.createElement("style");
st.textContent = `.bmi-scale{position:relative;padding:8px 0 4px}.bmi-scale .meter{height:14px;gap:2px;background:transparent}.bmi-pin{position:absolute;top:2px;width:4px;height:26px;margin-left:-2px;border-radius:2px;background:var(--ink);box-shadow:0 0 0 2px var(--surface)}`;
document.head.append(st);
