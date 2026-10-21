/* Đổi lịch âm ↔ dương, can chi, tiết khí, giờ hoàng đạo và lịch tháng có ngày âm */
import { h, icon } from "../core.js";
import { formTool } from "../frames/form.js";
import { dayInfo, lunarToSolar, solarToLunar, lunarMonthName, leapMonthOf, daysInSolarMonth, NGAY_LE, CON_GIAP, canChiYear } from "../lib/am-lich.js";

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const TODAY = { d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() };
const todayIso = `${TODAY.y}-${pad(TODAY.m)}-${pad(TODAY.d)}`;
const todayL = solarToLunar(TODAY.d, TODAY.m, TODAY.y);
let cal = null; // tháng đang xem trên lịch { m, y }

function holidays(s, l) {
  const lunar = !l.leap && NGAY_LE[`a:${l.day}/${l.month}`];
  return [NGAY_LE[`${s.day}/${s.month}`], lunar, !lunar && l.day === 1 ? "Mùng 1 (đầu tháng âm)" : null, !lunar && l.day === 15 ? "Rằm" : null].filter(Boolean);
}
// Giao thừa: ngày cuối tháng Chạp
function isNewYearEve(s) { const d = new Date(s.year, s.month - 1, s.day + 1); const n = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear()); return n.day === 1 && n.month === 1 && !n.leap; }

const api = formTool({
  fields: [
    { id: "mode", type: "seg", label: "Chiều đổi", value: "s2l", choices: [["s2l", "Dương → Âm"], ["l2s", "Âm → Dương"]] },
    { id: "d", type: "date", label: "Ngày dương lịch", value: todayIso, attrs: { min: "1800-01-01", max: "2199-12-31" }, show: (v) => v.mode === "s2l" },
    { id: "ld", type: "select", label: "Ngày âm", value: String(todayL.day), choices: Array.from({ length: 30 }, (_, i) => [String(i + 1), "Ngày " + (i + 1)]), show: (v) => v.mode === "l2s" },
    { id: "lm", type: "select", label: "Tháng âm", value: String(todayL.month), choices: Array.from({ length: 12 }, (_, i) => [String(i + 1), "Tháng " + (i + 1) + (i === 0 ? " (Giêng)" : i === 11 ? " (Chạp)" : "")]), show: (v) => v.mode === "l2s" },
    { id: "ly", type: "number", label: "Năm âm", value: String(todayL.year), attrs: { min: 1800, max: 2199, step: 1 }, show: (v) => v.mode === "l2s" },
    { id: "leap", type: "check", label: "Tháng nhuận", value: false, show: (v) => v.mode === "l2s" }
  ],
  compute(v, out) {
    out.textContent = "";
    let s;
    if (v.mode === "s2l") {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.d || "");
      if (!m) { out.append(h("p", { class: "alert info", text: "Chọn một ngày dương lịch." })); return; }
      s = { day: +m[3], month: +m[2], year: +m[1] };
    } else {
      const ly = +v.ly;
      if (!(ly >= 1800 && ly <= 2199)) { out.append(h("p", { class: "alert err", text: "Năm âm lịch cần trong khoảng 1800–2199." })); return; }
      const leapM = leapMonthOf(ly);
      const r = lunarToSolar(+v.ld, +v.lm, ly, !!v.leap);
      if (!r) {
        out.append(h("p", { class: "alert err", text: v.leap ? `Năm ${ly} (${canChiYear(ly)}) ${leapM ? "chỉ nhuận tháng " + leapM : "không có tháng nhuận"}.` : `Tháng ${v.lm} năm ${ly} không có ngày ${v.ld} (tháng thiếu chỉ có 29 ngày).` }));
        return;
      }
      s = r;
    }
    if (s.year < 1800 || s.year > 2199) { out.append(h("p", { class: "alert err", text: "Chỉ hỗ trợ từ năm 1800 đến 2199." })); return; }
    const i = dayInfo(s.day, s.month, s.year);
    const l = i.lunar;
    const hd = holidays(s, l);
    if (isNewYearEve(s)) hd.unshift("Giao thừa (30 Tết)");
    const big = v.mode === "s2l"
      ? `Ngày ${l.day} ${lunarMonthName(l.month, l.leap)} năm ${i.canChi.year}`
      : `${i.weekday}, ${pad(s.day)}/${pad(s.month)}/${s.year}`;
    out.append(
      h("p", { class: "hint", text: v.mode === "s2l" ? `${i.weekday}, ${pad(s.day)}/${pad(s.month)}/${s.year} dương lịch là:` : `Ngày ${l.day} ${lunarMonthName(l.month, l.leap)} năm ${i.canChi.year} âm lịch là:` }),
      h("p", { class: "result-big", text: big }),
      hd.length ? h("p", { class: "alert ok", html: icon("sparkles") + "<span></span>" }) : "",
      h("dl", { class: "kv" },
        kv("Âm lịch", `${pad(l.day)}/${pad(l.month)}${l.leap ? " (nhuận)" : ""}/${l.year}`),
        kv("Ngày", i.canChi.day),
        kv("Tháng", i.canChi.month + (l.leap ? " (nhuận)" : "") + ` · ${i.monthLength === 30 ? "tháng đủ (30 ngày)" : "tháng thiếu (29 ngày)"}`),
        kv("Năm", `${i.canChi.year} · tuổi ${CON_GIAP[(l.year + 8) % 12]}`),
        kv("Tiết khí", i.tietKhi),
        kv("Năm nhuận", i.leapMonth ? `Có, nhuận tháng ${i.leapMonth}` : "Không")),
      h("div", null, h("p", { class: "opt-title", text: "Giờ hoàng đạo (giờ tốt)" }),
        h("ul", { class: "chip-list", style: { marginTop: "8px" } }, i.gioHoangDao.map((g) => h("li", { class: "chip", html: `${g.chi} <small>${g.range}h</small>` })))));
    if (hd.length) out.querySelector(".alert.ok span").textContent = hd.join(" · ");
    cal = { m: s.month, y: s.year };
    out.append(calendar(s));
  }
});
function kv(k, v) { return [h("dt", { text: k }), h("dd", { text: v })]; }

function calendar(sel) {
  const box = h("div", { class: "lcal" });
  const draw = () => {
    box.textContent = "";
    const { m, y } = cal;
    const first = new Date(y, m - 1, 1).getDay(); // 0 = CN
    const offset = (first + 6) % 7;               // tuần bắt đầu từ thứ Hai
    const days = daysInSolarMonth(m, y);
    const l1 = solarToLunar(1, m, y);
    box.append(h("div", { class: "lcal-head" },
      h("button", { class: "ib sm", type: "button", "aria-label": "Tháng trước", html: icon("chevron-left"), onclick: () => { cal = m === 1 ? { m: 12, y: y - 1 } : { m: m - 1, y }; draw(); } }),
      h("b", { text: `Tháng ${m}/${y}`, "aria-live": "polite" }),
      h("small", { text: `${lunarMonthName(l1.month, l1.leap)} năm ${canChiYear(l1.year)}` }),
      h("button", { class: "ib sm", type: "button", "aria-label": "Tháng sau", html: icon("chevron-right"), onclick: () => { cal = m === 12 ? { m: 1, y: y + 1 } : { m: m + 1, y }; draw(); } })));
    const grid = h("div", { class: "lcal-grid", role: "grid", "aria-label": `Lịch tháng ${m}/${y}` });
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach((d) => grid.append(h("span", { class: "lcal-dow", role: "columnheader", text: d })));
    for (let k = 0; k < offset; k++) grid.append(h("span"));
    for (let d = 1; d <= days; d++) {
      const l = solarToLunar(d, m, y);
      const isSel = sel.day === d && sel.month === m && sel.year === y;
      const isToday = TODAY.d === d && TODAY.m === m && TODAY.y === y;
      const special = holidays({ day: d, month: m, year: y }, l).filter((x) => !/^Mùng 1|^Rằm$/.test(x));
      const cls = ["lcal-day", isSel && "sel", isToday && "today", (offset + d - 1) % 7 === 6 && "sun", special.length && "hol", (l.day === 1 || l.day === 15) && "moon"].filter(Boolean).join(" ");
      grid.append(h("button", { class: cls, type: "button", title: special.join(", ") || null, "aria-label": `${d}/${m}/${y}, âm lịch ${l.day}/${l.month}${l.leap ? " nhuận" : ""}${special.length ? ", " + special.join(", ") : ""}`, "aria-pressed": isSel ? "true" : "false",
        onclick: () => { api.set("mode", "s2l"); api.set("d", `${y}-${pad(m)}-${pad(d)}`); } },
        h("b", { text: d }), h("small", { text: l.day === 1 ? `${l.day}/${l.month}${l.leap ? "n" : ""}` : l.day })));
    }
    box.append(grid,
      h("p", { class: "row small muted", style: { marginTop: "8px" } }, h("button", { class: "btn ghost sm", type: "button", onclick: () => { api.set("mode", "s2l"); api.set("d", todayIso); } }, "Hôm nay"), "Số nhỏ là ngày âm; ô viền màu là ngày lễ."));
  };
  draw();
  return box;
}

const st = document.createElement("style");
st.textContent = `.lcal{margin-top:6px}.lcal-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}.lcal-head b{font-size:17px}.lcal-head small{color:var(--muted);margin-right:auto}
.lcal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.lcal-dow{text-align:center;font-size:12.5px;font-weight:700;color:var(--muted);padding:4px 0}
.lcal-day{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;min-height:48px;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:4px 0;line-height:1.15}
.lcal-day b{font-size:16px}.lcal-day small{font-size:11.5px;color:var(--muted)}.lcal-day.sun b{color:var(--err)}.lcal-day.moon small{color:var(--brand);font-weight:700}
.lcal-day.hol{border-color:color-mix(in srgb,var(--err) 55%,var(--line))}.lcal-day.today{background:var(--brand-soft)}.lcal-day.sel{background:var(--brand);border-color:var(--brand)}.lcal-day.sel b,.lcal-day.sel small{color:var(--brand-ink)}
.lcal-day:hover{border-color:var(--brand)}`;
document.head.append(st);
