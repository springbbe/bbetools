/* Tự sinh bởi scripts/build.js từ assets/tools/tdee.js và i18n/en/js/ — đừng sửa tay. */
/* Calo cần mỗi ngày: BMR (Mifflin–St Jeor), TDEE theo mức vận động, lượng calo để giữ, giảm hoặc tăng cân */
import { h, fmtNum } from "../core.js";
import { formTool } from "../frames/form.js";
import { num, stat, stats, table, alert, note } from "../calc.js";
import { tdee, ACTIVITY } from "../lib/suc-khoe.js";
import { parseNum } from "../lib/don-vi.js";

formTool({
  fields: [
    { id: "sex", type: "seg", label: "Sex", value: "m", choices: [["m", "Male"], ["f", "Female"]] },
    { id: "age", type: "number", label: "Age", value: "30", attrs: { min: 15, max: 100, step: 1, inputmode: "numeric" } },
    { id: "h", type: "text", label: "Height (cm)", value: "170", attrs: { inputmode: "decimal" } },
    { id: "w", type: "text", label: "Weight (kg)", value: "65", attrs: { inputmode: "decimal" } },
    { id: "act", type: "select", label: "Activity level", value: "1.375", choices: ACTIVITY.map(([f, l]) => [String(f), l]) }
  ],
  compute(v, out) {
    out.textContent = "";
    const age = +v.age, cm = parseNum(v.h), kg = parseNum(v.w);
    if (!(age >= 15 && age <= 100) || !(cm >= 100 && cm <= 250) || !(kg >= 25 && kg <= 300)) { out.append(alert("info", "Enter age (15–100), height (100–250 cm) and weight (25–300 kg).")); return; }
    const r = tdee(v.sex, kg, cm, age, +v.act);
    out.append(stats(stat("Calories to maintain weight (TDEE)", fmtNum(Math.round(r.tdee)) + " kcal/day", { hl: true }), stat("Basal metabolic rate (BMR)", fmtNum(Math.round(r.bmr)) + " kcal/day", { note: "energy used resting all day" })));
    const label = (k) => (k === 0 ? "Maintain" : (k < 0 ? "Lose " : "Gain ") + num(Math.abs(k), 2) + " kg/week");
    out.append(table(["Goal", "Calories per day", "Compared to TDEE"], r.goals.map(([k, c]) => [label(k), fmtNum(Math.round(c)) + " kcal", k === 0 ? "–" : (c - r.tdee > 0 ? "+" : "−") + fmtNum(Math.abs(Math.round(c - r.tdee)))]), { hl: (row) => row[0] === "Maintain", cls: ["l"] }));
    if (r.goals.some(([k, c]) => k < 0 && c <= r.floor)) out.append(alert("warn", `Some weight-loss goals were kept at the minimum of ${fmtNum(r.floor)} kcal/day — eating less than this needs a doctor's supervision.`));
    // gợi ý chia chất (30% đạm, 25% béo, 45% bột đường)
    const t = r.tdee;
    out.append(h("p", { class: "opt-title", text: "Suggested macro split for maintenance" }),
      table(["Macronutrient", "Energy share", "Grams per day"], [["Protein (4 kcal/g)", "30%", num((t * 0.3) / 4, 0) + " g"], ["Fat (9 kcal/g)", "25%", num((t * 0.25) / 9, 0) + " g"], ["Carbohydrates (4 kcal/g)", "45%", num((t * 0.45) / 4, 0) + " g"]], { cls: ["l"] }),
      note("Mifflin–St Jeor equation: BMR = 10 × weight + 6.25 × height − 5 × age + 5 (male) or − 161 (female). The result is an average estimate, about ±10%; track your weight for 2–3 weeks to adjust. Losing 0.5 kg/week corresponds to a deficit of about 550 kcal/day."));
  }
});
