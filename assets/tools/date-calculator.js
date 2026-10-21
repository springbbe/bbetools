/* Cộng trừ ngày & đếm ngày làm việc: khoảng cách hai ngày, cộng/trừ ngày (lịch hoặc làm việc), trừ cuối tuần và lễ Tết Việt Nam */
import { h, fmtNum } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, kv, stat, stats, table, alert, note } from "../calc.js";
import { parseDate, diffYMD, toDays, iso, today, weekday, addDays, addMonths, countWorkdays, addWorkdays } from "../lib/ngay.js";
import { THU } from "../lib/am-lich.js";

const LE = await loadData("ngay-le");
const T = today();
const show = (p) => `${THU[weekday(p)]}, ${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;

formTool({
  fields: [
    { id: "mode", type: "seg", label: "Tính", value: "diff", choices: [["diff", "Khoảng cách hai ngày"], ["add", "Cộng / trừ ngày"]] },
    { id: "a", type: "date", label: "Từ ngày", value: iso(T) },
    { id: "b", type: "date", label: "Đến ngày", value: iso(addDays(T, 30)), show: (v) => v.mode === "diff" },
    { id: "n", type: "number", label: "Số lượng (số âm = trừ)", value: "30", attrs: { step: 1, inputmode: "numeric" }, show: (v) => v.mode === "add" },
    { id: "unit", type: "select", label: "Đơn vị", value: "d", choices: [["d", "Ngày"], ["wd", "Ngày làm việc"], ["w", "Tuần"], ["m", "Tháng"], ["y", "Năm"]], show: (v) => v.mode === "add" },
    { id: "sat", type: "check", label: "Làm việc cả thứ Bảy", hint: "Mặc định nghỉ thứ Bảy và Chủ nhật." },
    { id: "hol", type: "check", label: "Trừ ngày lễ, Tết", value: true, hint: "Tết Dương lịch, 5 ngày Tết Âm lịch, Giỗ Tổ, 30/4, 1/5, Quốc khánh (2 ngày), Ngày Văn hoá Việt Nam 24/11 (từ 2026)." },
    { id: "comp", type: "check", label: "Tính nghỉ bù khi lễ trùng ngày nghỉ", value: true, show: (v) => v.hol }
  ],
  compute(v, out) {
    out.textContent = "";
    const a = parseDate(v.a);
    if (!a) { out.append(alert("info", "Chọn ngày bắt đầu.")); return; }
    const o = { weekend: v.sat ? [0] : [0, 6], holidays: v.hol ? LE : null, compensate: v.comp };
    if (v.mode === "add") {
      const n = Math.round(+v.n || 0);
      if (Math.abs(n) > 100000) { out.append(alert("err", "Số quá lớn.")); return; }
      const r = v.unit === "wd" ? addWorkdays(a, n, o) : v.unit === "w" ? addDays(a, n * 7) : v.unit === "m" ? addMonths(a, n) : v.unit === "y" ? addMonths(a, n * 12) : addDays(a, n);
      if (r.y < 1800 || r.y > 2199) { out.append(alert("err", "Kết quả nằm ngoài khoảng năm 1800–2199.")); return; }
      const label = { d: "ngày", wd: "ngày làm việc", w: "tuần", m: "tháng", y: "năm" }[v.unit];
      out.append(h("p", { class: "hint", text: `${show(a)} ${n >= 0 ? "cộng" : "trừ"} ${fmtNum(Math.abs(n))} ${label} là:` }), h("p", { class: "result-big", text: show(r) }));
      const span = countWorkdays(n >= 0 ? addDays(a, 1) : r, n >= 0 ? r : addDays(a, -1), o);
      out.append(kv([["Cách " + (n >= 0 ? "sau" : "trước"), fmtNum(Math.abs(toDays(r) - toDays(a))) + " ngày lịch"], ["Trong đó ngày làm việc", fmtNum(span.work)]]));
      if (v.unit === "m" || v.unit === "y") out.append(note("Ngày cuối tháng được giữ ở cuối tháng đích nếu tháng đó ngắn hơn (31/1 + 1 tháng = 28 hoặc 29/2)."));
      if (span.list.length) out.append(holTable(span.list));
      return;
    }
    const b = parseDate(v.b);
    if (!b) { out.append(alert("info", "Chọn ngày kết thúc.")); return; }
    const days = toDays(b) - toDays(a);
    const d = diffYMD(a, b);
    const c = countWorkdays(a, b, o);
    out.append(h("p", { class: "result-big", text: `${fmtNum(Math.abs(days))} ngày` }),
      h("p", { class: "muted", text: `${days < 0 ? "Ngày kết thúc trước ngày bắt đầu · " : ""}${d.years ? d.years + " năm " : ""}${d.months ? d.months + " tháng " : ""}${d.days} ngày · ${fmtNum(Math.floor(Math.abs(days) / 7))} tuần ${Math.abs(days) % 7} ngày` }));
    out.append(stats(
      stat("Ngày làm việc", fmtNum(c.work), { hl: true, note: "tính cả ngày đầu và ngày cuối" }),
      stat("Ngày nghỉ cuối tuần", fmtNum(c.weekend)),
      stat("Ngày lễ, Tết (rơi vào ngày thường)", fmtNum(c.holiday)),
      stat("Số ngày tính cả hai đầu", fmtNum(Math.abs(days) + 1))));
    if (c.list.length) out.append(holTable(c.list));
    out.append(note(LE.note));
  }
});

function holTable(list) {
  return h("details", null, h("summary", { text: `Các ngày lễ được trừ (${list.length})` }), table(["Ngày", "Lễ"], list.map((x) => [show(x.date), x.name]), { cls: ["l", "l"] }));
}
