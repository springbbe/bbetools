/* Tự sinh bởi scripts/build.js từ assets/tools/due-date.js và i18n/en/js/ — đừng sửa tay. */
/* Tính ngày dự sinh và tuổi thai theo ngày đầu kỳ kinh cuối (có chỉnh theo độ dài chu kỳ) hoặc theo kết quả siêu âm */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { stat, stats, table, alert, note, dateVN } from "../calc.js";
import { parseDate, toDays, fromDays, iso, today, addDays } from "../lib/ngay.js";
import { dueFromLmp, gestation } from "../lib/suc-khoe.js";

const T = today();
const MILESTONES = [
  [6, 8, "First ultrasound: confirm the pregnancy is in the uterus, fetal heartbeat"],
  [11, 13.86, "Nuchal translucency scan, prenatal screening (Double test, NIPT)"],
  [16, 18, "Triple test screening (if needed)"],
  [18, 22, "Detailed anatomy scan"],
  [24, 28, "Glucose tolerance test (gestational diabetes)"],
  [30, 32, "Ultrasound for growth and fetal position"],
  [37, 40, "Full term, watch for signs of labor"]
];

formTool({
  fields: [
    { id: "by", type: "seg", label: "Calculate from", value: "lmp", choices: [["lmp", "Last period"], ["us", "Ultrasound result"]] },
    { id: "lmp", type: "date", label: "First day of the last period", value: iso(addDays(T, -70)), show: (v) => v.by === "lmp" },
    { id: "cycle", type: "number", label: "Cycle length (days)", value: "28", attrs: { min: 20, max: 45, step: 1, inputmode: "numeric" }, show: (v) => v.by === "lmp", hint: "Usually 28 days; a longer cycle moves the due date later accordingly." },
    { id: "us", type: "date", label: "Ultrasound date", value: iso(addDays(T, -14)), show: (v) => v.by === "us" },
    { id: "w", type: "number", label: "Gestational age at ultrasound (weeks)", value: "8", attrs: { min: 4, max: 42, step: 1, inputmode: "numeric" }, show: (v) => v.by === "us" },
    { id: "d", type: "number", label: "and (days)", value: "0", attrs: { min: 0, max: 6, step: 1, inputmode: "numeric" }, show: (v) => v.by === "us" }
  ],
  compute(v, out) {
    out.textContent = "";
    let due;
    if (v.by === "us") {
      const u = parseDate(v.us);
      const ga = Math.round(+v.w || 0) * 7 + Math.round(+v.d || 0);
      if (!u || !ga) { out.append(alert("info", "Enter the ultrasound date and gestational age.")); return; }
      due = toDays(u) - ga + 280;
    } else {
      const l = parseDate(v.lmp);
      if (!l) { out.append(alert("info", "Choose the first day of the last period.")); return; }
      const cyc = Math.max(20, Math.min(45, Math.round(+v.cycle || 28)));
      due = dueFromLmp(toDays(l), cyc);
    }
    const now = toDays(T);
    const g = gestation(due, now);
    if (g.totalDays < 0) { out.append(alert("err", "The date is in the future — please check.")); return; }
    if (g.totalDays > 44 * 7) { out.append(alert("warn", "Gestational age is over 44 weeks — please check the date.")); }
    const D = fromDays(due), conceive = fromDays(due - 266);
    out.append(stats(
      stat("Due date", dateVN(D), { hl: true, note: g.totalDays <= 280 ? `${due - now} ${(due - now) == 1 ? "day" : "days"} to go` : `${now - due} ${(now - due) == 1 ? "day" : "days"} past` }),
      stat("Gestational age today", `${g.weeks} weeks ${g.days} days`, { note: `trimester ${g.trimester}` }),
      stat("Estimated conception date", dateVN(conceive))));
    const pct = Math.max(0, Math.min(100, (g.totalDays / 280) * 100));
    out.append(h("div", { class: "meter", role: "img", "aria-label": `${Math.round(pct)}% of the 40-week pregnancy completed` }, h("span", { style: { width: pct + "%", "--c": "var(--ok)" } })));
    const start = due - 280;
    out.append(h("p", { class: "opt-title", text: "Common prenatal checkups" }),
      table(["Week", "Date range", "Details"], MILESTONES.map(([a, b, t]) => [`${a}–${Math.floor(b)}`, `${dateVN(fromDays(start + Math.round(a * 7)))} – ${dateVN(fromDays(start + Math.floor(b) * 7 + 6))}`, t]),
        { cls: ["l", "", "l wrap"], hl: (r, i) => g.weeks >= MILESTONES[i][0] && g.weeks <= MILESTONES[i][1] }),
      note("The due date uses Naegele's rule (last period + 280 days). Only about 4–5% of babies are born on their due date; birth between 37 and 42 weeks is normal. If a first-trimester ultrasound differs, doctors usually go by the ultrasound. This tool is for reference only and doesn't replace your doctor's advice."));
  }
});
