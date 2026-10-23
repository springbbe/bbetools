/* Tự sinh bởi scripts/build.js từ assets/tools/age-calculator.js và i18n/en/js/ — đừng sửa tay. */
/* Tính tuổi chính xác: năm, tháng, ngày; tổng số ngày, tuần, giờ; sinh nhật tiếp theo; thứ trong tuần; ngày âm lịch */
import { h, fmtNum, ROOT, LANG } from "../core.js";
import { formTool } from "../frames/form.js";
import { kv, stat, stats, alert } from "../calc.js";
import { parseDate, diffYMD, toDays, iso, today, weekday, daysInMonth } from "../lib/ngay.js";
import { solarToLunar, lunarMonthName, canChiYear, CON_GIAP, THU } from "../lib/am-lich.js";

const T = today();

formTool({
  fields: [
    { id: "b", type: "date", label: "Date of birth", value: "1995-06-15", attrs: { min: "1800-01-01", max: "2199-12-31" } },
    { id: "at", type: "date", label: "Age at date", value: iso(T), hint: "Today by default." }
  ],
  compute(v, out) {
    out.textContent = "";
    const b = parseDate(v.b), at = parseDate(v.at) || T;
    if (!b) { out.append(alert("info", "Choose a date of birth.")); return; }
    if (toDays(at) < toDays(b)) { out.append(alert("err", "The date must be after the date of birth.")); return; }
    const d = diffYMD(b, at);
    const days = toDays(at) - toDays(b);
    out.append(h("p", { class: "result-big", text: `${d.years} years ${d.months} months ${d.days} days` }));
    // sinh nhật tiếp theo (29/2 → 28/2 năm không nhuận)
    let ny = at.y;
    const bd = (y) => ({ y, m: b.m, d: Math.min(b.d, daysInMonth(y, b.m)) });
    if (toDays(bd(ny)) < toDays(at)) ny++;
    const next = bd(ny), left = toDays(next) - toDays(at);
    out.append(stats(
      stat("Total days", fmtNum(days)),
      stat("Total weeks", fmtNum(Math.floor(days / 7)), { note: days % 7 ? `and ${days % 7} ${(days % 7) == 1 ? "day" : "days"}` : "" }),
      stat("Total months", fmtNum(d.totalMonths)),
      stat(left === 0 ? "Happy birthday today! 🎂" : "Until the next birthday", left === 0 ? `Turning ${d.years}` : fmtNum(left) + " days", { hl: true, note: left ? `${THU[weekday(next)]}, ${next.m}/${next.d}/${next.y} (turning ${next.y - b.y})` : "" })));
    const l = solarToLunar(b.d, b.m, b.y);
    out.append(kv([
      ["Born on", `${THU[weekday(b)]}, ${b.m}/${b.d}/${b.y}`],
      ["Lunar date (Vietnamese calendar)", `Day ${l.day} of ${lunarMonthName(l.month, l.leap)}, ${canChiYear(l.year)} year`],
      ["Zodiac animal", `${CON_GIAP[(l.year + 8) % 12]} (East Asian age ${solarToLunar(at.d, at.m, at.y).year - l.year + 1})`],
      ["Total hours", "≈ " + fmtNum(days * 24)],
      ["10,000-day milestone", (() => { const x = new Date(Date.UTC(b.y, b.m - 1, b.d) + 1e4 * 864e5); return `${x.getUTCMonth() + 1}/${x.getUTCDate()}/${x.getUTCFullYear()}`; })()]
    ]));
    // trang tiếng Việt: gợi ý công cụ Xem tuổi, con giáp (chỉ có ở tiếng Việt)
    if (LANG === "vi") out.append(h("p", { class: "hint" }, "See more about the five elements and stems: ", h("a", { href: ROOT + "xem-tuoi-con-giap/?d=" + iso(b), text: "Age & zodiac" }), "."));
  }
});
