/* Tự sinh bởi scripts/build.js từ assets/tools/date-calculator.js và i18n/en/js/ — đừng sửa tay. */
/* Cộng trừ ngày & đếm ngày làm việc: khoảng cách hai ngày, cộng/trừ ngày (lịch hoặc làm việc), trừ cuối tuần và lễ Tết Việt Nam */
import { h, fmtNum, LANG } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, kv, stat, stats, table, alert, note } from "../calc.js";
import { parseDate, diffYMD, toDays, iso, today, weekday, addDays, addMonths, countWorkdays, addWorkdays } from "../lib/ngay.js";
import { THU } from "../lib/am-lich.js";

const LE = await loadData("ngay-le");
const T = today();
const show = (p) => `${THU[weekday(p)]}, ${String(p.m).padStart(2, "0")}/${String(p.d).padStart(2, "0")}/${p.y}`;

formTool({
  fields: [
    { id: "mode", type: "seg", label: "Calculate", value: "diff", choices: [["diff", "Days between two dates"], ["add", "Add / subtract days"]] },
    { id: "a", type: "date", label: "From date", value: iso(T) },
    { id: "b", type: "date", label: "To date", value: iso(addDays(T, 30)), show: (v) => v.mode === "diff" },
    { id: "n", type: "number", label: "Amount (negative = subtract)", value: "30", attrs: { step: 1, inputmode: "numeric" }, show: (v) => v.mode === "add" },
    { id: "unit", type: "select", label: "Unit", value: "d", choices: [["d", "Days"], ["wd", "Working days"], ["w", "Weeks"], ["m", "Months"], ["y", "Years"]], show: (v) => v.mode === "add" },
    { id: "sat", type: "check", label: "Saturday is a working day", hint: "Saturday and Sunday are days off by default." },
    { id: "hol", type: "check", label: "Exclude public holidays (Vietnam)", value: true, hint: "Vietnam's public holidays: New Year's Day, 5 days of Lunar New Year, Hung Kings' Day, 30/4, 1/5, National Day (2 days), Vietnam Culture Day 24/11 (from 2026)." },
    { id: "comp", type: "check", label: "Add a day off in lieu when a holiday falls on a day off", value: true, show: (v) => v.hol }
  ],
  compute(v, out) {
    out.textContent = "";
    const a = parseDate(v.a);
    if (!a) { out.append(alert("info", "Choose a start date.")); return; }
    const o = { weekend: v.sat ? [0] : [0, 6], holidays: v.hol ? LE : null, compensate: v.comp };
    if (v.mode === "add") {
      const n = Math.round(+v.n || 0);
      if (Math.abs(n) > 100000) { out.append(alert("err", "Number too large.")); return; }
      const r = v.unit === "wd" ? addWorkdays(a, n, o) : v.unit === "w" ? addDays(a, n * 7) : v.unit === "m" ? addMonths(a, n) : v.unit === "y" ? addMonths(a, n * 12) : addDays(a, n);
      if (r.y < 1800 || r.y > 2199) { out.append(alert("err", "The result is outside the years 1800–2199.")); return; }
      const label = { d: "days", wd: "working days", w: "weeks", m: "months", y: "years" }[v.unit];
      out.append(h("p", { class: "hint", text: `${show(a)} ${n >= 0 ? "plus" : "minus"} ${fmtNum(Math.abs(n))} ${label} is:` }), h("p", { class: "result-big", text: show(r) }));
      const span = countWorkdays(n >= 0 ? addDays(a, 1) : r, n >= 0 ? r : addDays(a, -1), o);
      out.append(kv([["In " + (n >= 0 ? "sau" : "ago"), fmtNum(Math.abs(toDays(r) - toDays(a))) + " calendar days"], ["Of which working days", fmtNum(span.work)]]));
      if (v.unit === "m" || v.unit === "y") out.append(note("Month-end dates stay at the end of the target month if it's shorter (Jan 31 + 1 month = Feb 28 or 29)."));
      if (span.list.length) out.append(holTable(span.list));
      return;
    }
    const b = parseDate(v.b);
    if (!b) { out.append(alert("info", "Choose an end date.")); return; }
    const days = toDays(b) - toDays(a);
    const d = diffYMD(a, b);
    const c = countWorkdays(a, b, o);
    out.append(h("p", { class: "result-big", text: `${fmtNum(Math.abs(days))} ${(fmtNum(Math.abs(days))) == 1 ? "day" : "days"}` }),
      h("p", { class: "muted", text: `${days < 0 ? "The end date is before the start date · " : ""}${d.years ? d.years + " years " : ""}${d.months ? d.months + " months " : ""}${d.days} days · ${fmtNum(Math.floor(Math.abs(days) / 7))} weeks ${Math.abs(days) % 7} days` }));
    out.append(stats(
      stat("Working days", fmtNum(c.work), { hl: true, note: "counting both the first and last day" }),
      stat("Weekend days off", fmtNum(c.weekend)),
      stat("Public holidays (on weekdays)", fmtNum(c.holiday)),
      stat("Days counting both ends", fmtNum(Math.abs(days) + 1))));
    if (c.list.length) out.append(holTable(c.list));
    // ghi chú trong data/ngay-le.json viết tiếng Việt; trang ngôn ngữ khác dùng câu đã dịch
    out.append(note(LANG === "vi" ? LE.note : "The second National Day holiday is September 1 or 3 depending on the year; the 5 Lunar New Year days are set by the government each year (usually the last day of the year and days 1–4). Swapped working days aren't counted."));
  }
});

function holTable(list) {
  return h("details", null, h("summary", { text: `Holidays excluded (${list.length})` }), table(["Days", "Holiday"], list.map((x) => [show(x.date), x.name]), { cls: ["l", "l"] }));
}
