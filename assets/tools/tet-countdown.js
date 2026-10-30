/* Đếm ngược tới giao thừa Tết Nguyên Đán (giờ Việt Nam, UTC+7), kèm lịch Tết các năm tới */
import { h, icon } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { lunarToSolar, solarToLunar } from "../lib/am-lich.js";
import { yearInfo } from "../lib/con-giap.js";

const TZ_MS = 7 * 3600e3;
const ANIMAL = ["🐭", "🐮", "🐯", "🐱", "🐲", "🐍", "🐴", "🐐", "🐵", "🐔", "🐶", "🐷"];
const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
/** thời điểm 0 giờ mùng 1 Tết (giờ Việt Nam) của năm âm lịch ly, tính bằng ms UTC */
function tetAt(ly) { const s = lunarToSolar(1, 1, ly); return { s, t: Date.UTC(s.year, s.month - 1, s.day) - TZ_MS }; }
/** Năm âm lịch hiện tại theo giờ Việt Nam */
function lunarNow(now) { const v = new Date(now + TZ_MS); return solarToLunar(v.getUTCDate(), v.getUTCMonth() + 1, v.getUTCFullYear()); }

interactiveTool({
  mount(el, ctx) {
    const unitBox = (label) => { const b = h("b", { text: "0" }); return [h("div", { class: "tet-unit" }, b, h("span", { text: label })), b]; };
    const [dBox, dB] = unitBox("ngày"), [hBox, hB] = unitBox("giờ"), [mBox, mB] = unitBox("phút"), [sBox, sB] = unitBox("giây");
    const title = h("h2", { class: "tet-title" });
    const sub = h("p", { class: "tet-sub" });
    const festive = h("p", { class: "tet-festive", hidden: true });
    const timer = h("div", { class: "tet-grid", role: "timer", "aria-live": "off" }, dBox, hBox, mBox, sBox);
    const sr = h("p", { class: "sr-only", "aria-live": "polite" });
    const upcoming = h("div");
    el.append(h("div", { class: "tet" }, h("div", { class: "tet-emoji", "aria-hidden": "true" }), title, sub, timer, festive, sr,
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.fullscreen(el.querySelector(".tet")) }, h("span", { html: icon("maximize"), style: { display: "contents" } }), "Toàn màn hình"))),
      upcoming);

    let target = null, lastMin = -1;
    function pick(now) {
      const cur = lunarNow(now);
      // đang trong 3 ngày Tết: vẫn hiện năm hiện tại; sau đó đếm tới Tết năm sau
      const thisTet = tetAt(cur.year);
      const inTet = now >= thisTet.t && now < thisTet.t + 3 * 864e5;
      const ly = inTet ? cur.year : cur.year + 1;
      const tt = tetAt(ly);
      const info = yearInfo(ly);
      return { ly, ...tt, info, inTet };
    }
    function drawStatic() {
      const { s, info, ly } = target;
      el.querySelector(".tet-emoji").textContent = ANIMAL[info.chiIndex];
      title.textContent = `Tết ${info.canChi} ${ly}`;
      const wd = THU[new Date(Date.UTC(s.year, s.month - 1, s.day)).getUTCDay()];
      const eve = new Date(Date.UTC(s.year, s.month - 1, s.day) - 864e5);
      sub.textContent = `Mùng 1 Tết: ${wd}, ${s.day}/${s.month}/${s.year} · Giao thừa đêm ${eve.getUTCDate()}/${eve.getUTCMonth() + 1} · năm con ${info.conGiap}`;
      upcoming.textContent = "";
      const rows = [];
      for (let y = ly; y < ly + 6; y++) { const x = tetAt(y), i = yearInfo(y); rows.push(h("tr", null, h("td", { text: `${i.canChi} (${i.conGiap})` }), h("td", { text: `${THU[new Date(x.t + TZ_MS).getUTCDay()]}, ${x.s.day}/${x.s.month}/${x.s.year}` }))); }
      upcoming.append(h("p", { class: "opt-title", text: "Tết Nguyên Đán các năm tới" }),
        h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" }, h("thead", null, h("tr", null, h("th", { scope: "col", text: "Năm" }), h("th", { scope: "col", text: "Mùng 1 Tết" }))), h("tbody", null, rows))));
    }
    function tick() {
      const now = Date.now();
      if (!target || (now >= target.t + 3 * 864e5)) { target = pick(now); drawStatic(); }
      const left = target.t - now;
      const done = left <= 0;
      timer.hidden = done; festive.hidden = !done;
      if (done) { festive.textContent = `🎉 Chúc mừng năm mới ${target.info.canChi}! An khang thịnh vượng, vạn sự như ý.`; document.title = "Chúc mừng năm mới!"; return; }
      const s = Math.floor(left / 1000);
      dB.textContent = Math.floor(s / 86400);
      hB.textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
      mB.textContent = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      sB.textContent = String(s % 60).padStart(2, "0");
      const min = Math.floor(s / 60);
      if (min !== lastMin) { lastMin = min; sr.textContent = `Còn ${dB.textContent} ngày ${hB.textContent} giờ ${mB.textContent} phút đến Tết.`; }
    }
    tick();
    setInterval(tick, 250);
  }
});

const st = document.createElement("style");
st.textContent = `.tet{text-align:center;padding:12px 0 18px;display:flex;flex-direction:column;align-items:center;gap:10px}
.tet:fullscreen{background:var(--bg);justify-content:center}
.tet-emoji{font-size:64px;line-height:1}.tet-title{margin:0;font-size:clamp(24px,5vw,34px);letter-spacing:-.02em}.tet-sub{margin:0;color:var(--muted)}
.tet-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:min(560px,100%);margin-top:6px}
.tet-unit{background:linear-gradient(180deg,#BF2A32,#9C1D24);color:#FFE7A3;border-radius:16px;padding:14px 4px;box-shadow:var(--shadow)}
.tet-unit b{display:block;font-size:clamp(30px,8vw,56px);font-weight:800;font-variant-numeric:tabular-nums;line-height:1.05}.tet-unit span{font-size:14px;font-weight:600;color:#FFE7A3}
.tet-festive{font-size:22px;font-weight:700;color:var(--err);margin:8px 0}`;
document.head.append(st);
