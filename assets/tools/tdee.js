/* Calo cần mỗi ngày: BMR (Mifflin–St Jeor), TDEE theo mức vận động, lượng calo để giữ, giảm hoặc tăng cân */
import { h, fmtNum } from "../core.js";
import { formTool } from "../frames/form.js";
import { num, stat, stats, table, alert, note } from "../calc.js";
import { tdee, ACTIVITY } from "../lib/suc-khoe.js";
import { parseNum } from "../lib/don-vi.js";

formTool({
  fields: [
    { id: "sex", type: "seg", label: "Giới tính", value: "m", choices: [["m", "Nam"], ["f", "Nữ"]] },
    { id: "age", type: "number", label: "Tuổi", value: "30", attrs: { min: 15, max: 100, step: 1, inputmode: "numeric" } },
    { id: "h", type: "text", label: "Chiều cao (cm)", value: "170", attrs: { inputmode: "decimal" } },
    { id: "w", type: "text", label: "Cân nặng (kg)", value: "65", attrs: { inputmode: "decimal" } },
    { id: "act", type: "select", label: "Mức vận động", value: "1.375", choices: ACTIVITY.map(([f, l]) => [String(f), l]) }
  ],
  compute(v, out) {
    out.textContent = "";
    const age = +v.age, cm = parseNum(v.h), kg = parseNum(v.w);
    if (!(age >= 15 && age <= 100) || !(cm >= 100 && cm <= 250) || !(kg >= 25 && kg <= 300)) { out.append(alert("info", "Nhập tuổi (15–100), chiều cao (100–250 cm) và cân nặng (25–300 kg).")); return; }
    const r = tdee(v.sex, kg, cm, age, +v.act);
    out.append(stats(stat("Calo để giữ cân (TDEE)", fmtNum(Math.round(r.tdee)) + " kcal/ngày", { hl: true }), stat("Chuyển hoá cơ bản (BMR)", fmtNum(Math.round(r.bmr)) + " kcal/ngày", { note: "năng lượng khi nằm nghỉ cả ngày" })));
    const label = (k) => (k === 0 ? "Giữ cân" : (k < 0 ? "Giảm " : "Tăng ") + num(Math.abs(k), 2) + " kg/tuần");
    out.append(table(["Mục tiêu", "Calo mỗi ngày", "So với TDEE"], r.goals.map(([k, c]) => [label(k), fmtNum(Math.round(c)) + " kcal", k === 0 ? "–" : (c - r.tdee > 0 ? "+" : "−") + fmtNum(Math.abs(Math.round(c - r.tdee)))]), { hl: (row) => row[0] === "Giữ cân", cls: ["l"] }));
    if (r.goals.some(([k, c]) => k < 0 && c <= r.floor)) out.append(alert("warn", `Một số mục tiêu giảm cân đã được giữ ở mức tối thiểu ${fmtNum(r.floor)} kcal/ngày — ăn ít hơn mức này cần có bác sĩ theo dõi.`));
    // gợi ý chia chất (30% đạm, 25% béo, 45% bột đường)
    const t = r.tdee;
    out.append(h("p", { class: "opt-title", text: "Gợi ý chia chất cho mức giữ cân" }),
      table(["Nhóm chất", "Tỉ lệ năng lượng", "Gam mỗi ngày"], [["Chất đạm (4 kcal/g)", "30%", num((t * 0.3) / 4, 0) + " g"], ["Chất béo (9 kcal/g)", "25%", num((t * 0.25) / 9, 0) + " g"], ["Bột đường (4 kcal/g)", "45%", num((t * 0.45) / 4, 0) + " g"]], { cls: ["l"] }),
      note("Công thức Mifflin–St Jeor: BMR = 10 × cân nặng + 6,25 × chiều cao − 5 × tuổi + 5 (nam) hoặc − 161 (nữ). Kết quả là ước tính trung bình, sai số khoảng ±10%; hãy theo dõi cân nặng 2–3 tuần để điều chỉnh. Giảm 0,5 kg/tuần ứng với thâm hụt khoảng 550 kcal/ngày."));
  }
});
