/* Tính tuổi chính xác: năm, tháng, ngày; tổng số ngày, tuần, giờ; sinh nhật tiếp theo; thứ trong tuần; ngày âm lịch */
import { h, fmtNum, ROOT } from "../core.js";
import { formTool } from "../frames/form.js";
import { kv, stat, stats, alert } from "../calc.js";
import { parseDate, diffYMD, toDays, iso, today, weekday, daysInMonth } from "../lib/ngay.js";
import { solarToLunar, lunarMonthName, canChiYear, CON_GIAP, THU } from "../lib/am-lich.js";

const T = today();

formTool({
  fields: [
    { id: "b", type: "date", label: "Ngày sinh", value: "1995-06-15", attrs: { min: "1800-01-01", max: "2199-12-31" } },
    { id: "at", type: "date", label: "Tính đến ngày", value: iso(T), hint: "Mặc định là hôm nay." }
  ],
  compute(v, out) {
    out.textContent = "";
    const b = parseDate(v.b), at = parseDate(v.at) || T;
    if (!b) { out.append(alert("info", "Chọn ngày sinh.")); return; }
    if (toDays(at) < toDays(b)) { out.append(alert("err", "Ngày tính tuổi phải sau ngày sinh.")); return; }
    const d = diffYMD(b, at);
    const days = toDays(at) - toDays(b);
    out.append(h("p", { class: "result-big", text: `${d.years} tuổi ${d.months} tháng ${d.days} ngày` }));
    // sinh nhật tiếp theo (29/2 → 28/2 năm không nhuận)
    let ny = at.y;
    const bd = (y) => ({ y, m: b.m, d: Math.min(b.d, daysInMonth(y, b.m)) });
    if (toDays(bd(ny)) < toDays(at)) ny++;
    const next = bd(ny), left = toDays(next) - toDays(at);
    out.append(stats(
      stat("Tổng số ngày", fmtNum(days)),
      stat("Tổng số tuần", fmtNum(Math.floor(days / 7)), { note: days % 7 ? `và ${days % 7} ngày` : "" }),
      stat("Tổng số tháng", fmtNum(d.totalMonths)),
      stat(left === 0 ? "Hôm nay là sinh nhật! 🎂" : "Đến sinh nhật tiếp theo", left === 0 ? `Tròn ${d.years} tuổi` : fmtNum(left) + " ngày", { hl: true, note: left ? `${THU[weekday(next)]}, ${next.d}/${next.m}/${next.y} (tròn ${next.y - b.y} tuổi)` : "" })));
    const l = solarToLunar(b.d, b.m, b.y);
    out.append(kv([
      ["Sinh vào", `${THU[weekday(b)]}, ${b.d}/${b.m}/${b.y}`],
      ["Ngày âm lịch", `${l.day} ${lunarMonthName(l.month, l.leap)} năm ${canChiYear(l.year)}`],
      ["Con giáp", `${CON_GIAP[(l.year + 8) % 12]} (tuổi mụ ${solarToLunar(at.d, at.m, at.y).year - l.year + 1})`],
      ["Tổng số giờ", "≈ " + fmtNum(days * 24)],
      ["Mốc 10.000 ngày", (() => { const x = new Date(Date.UTC(b.y, b.m - 1, b.d) + 1e4 * 864e5); return `${x.getUTCDate()}/${x.getUTCMonth() + 1}/${x.getUTCFullYear()}`; })()]
    ]), h("p", { class: "hint" }, "Xem thêm mệnh, can chi: ", h("a", { href: ROOT + "xem-tuoi-con-giap/?d=" + iso(b), text: "Xem tuổi, con giáp" }), "."));
  }
});
