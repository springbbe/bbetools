/* Xem tuổi, con giáp, can chi, mệnh ngũ hành nạp âm, tuổi mụ theo ngày sinh (tính đúng người sinh trước Tết) */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { kv, alert, note, table } from "../calc.js";
import { yearInfo, tuoiMu, sameChiYears } from "../lib/con-giap.js";
import { solarToLunar, lunarToSolar, lunarMonthName } from "../lib/am-lich.js";
import { parseDate, today } from "../lib/ngay.js";

const ANIMAL = ["🐭", "🐮", "🐯", "🐱", "🐲", "🐍", "🐴", "🐐", "🐵", "🐔", "🐶", "🐷"];
const T = today();
const nowLunar = solarToLunar(T.d, T.m, T.y).year;

formTool({
  fields: [
    { id: "by", type: "seg", label: "Nhập", value: "date", choices: [["date", "Ngày sinh dương lịch"], ["year", "Chỉ năm sinh"]] },
    { id: "d", type: "date", label: "Ngày sinh (dương lịch)", value: "1990-08-15", attrs: { min: "1900-01-31", max: "2199-12-31" }, show: (v) => v.by === "date" },
    { id: "y", type: "number", label: "Năm sinh âm lịch", value: "1990", attrs: { min: 1900, max: 2199, step: 1, inputmode: "numeric" }, show: (v) => v.by === "year",
      hint: "Sinh vào tháng 1 hoặc đầu tháng 2 dương lịch, trước Tết, thì năm âm lịch là năm trước — hãy nhập ngày sinh để tính chính xác." }
  ],
  compute(v, out) {
    out.textContent = "";
    let ly, l = null, sd = null;
    if (v.by === "date") {
      sd = parseDate(v.d);
      if (!sd) { out.append(alert("info", "Chọn ngày sinh.")); return; }
      l = solarToLunar(sd.d, sd.m, sd.y);
      ly = l.year;
    } else {
      ly = Math.round(+v.y);
      if (!(ly >= 1900 && ly <= 2199)) { out.append(alert("err", "Năm sinh cần trong khoảng 1900–2199.")); return; }
    }
    const i = yearInfo(ly);
    const tet = lunarToSolar(1, 1, ly);
    out.append(h("div", { class: "zd-hero" }, h("span", { class: "zd-emoji", "aria-hidden": "true", text: ANIMAL[i.chiIndex] }),
      h("div", null, h("p", { class: "result-big", text: `Tuổi ${i.chi} (${i.conGiap})` }), h("p", { class: "muted", text: `Năm ${i.canChi} · mệnh ${i.hanh} (${i.napAm})` }))));
    if (sd && sd.y !== ly) out.append(alert("info", `Sinh ngày ${sd.d}/${sd.m}/${sd.y} là trước Tết Nguyên Đán ${sd.y} nên thuộc năm âm lịch ${ly} (${i.canChi}).`));
    const age = tuoiMu(ly, nowLunar);
    out.append(kv([
      l ? ["Ngày sinh âm lịch", `${l.day} ${lunarMonthName(l.month, l.leap)} năm ${i.canChi}`] : null,
      ["Năm âm lịch", `${ly} – ${i.canChi}`],
      ["Tết năm đó", tet ? `${tet.day}/${tet.month}/${tet.year}` : "–"],
      ["Con giáp", `${i.chi} (${i.conGiap})`],
      ["Ngũ hành nạp âm", `${i.napAm} – ${i.meaning}`],
      ["Mệnh", i.hanh],
      ["Tuổi mụ năm nay", age > 0 ? `${age} tuổi (năm âm lịch ${nowLunar})` : "chưa sinh"],
      ["Tam hợp", `${i.chi} – ${i.tamHop.join(" – ")}`],
      ["Tứ hành xung", `${i.chi} – ${i.tuXung.join(" – ")}`],
      ["Hành tương sinh", `${i.duocSinh} sinh ${i.hanh}, ${i.hanh} sinh ${i.sinhRa}`],
      ["Hành tương khắc", `${i.hanh} khắc ${i.khac}, ${i.biKhac} khắc ${i.hanh}`]
    ]));
    const years = sameChiYears(i.chiIndex, T.y - 96, T.y + 12);
    out.append(h("p", { class: "opt-title", text: `Những năm tuổi ${i.chi}` }),
      table(["Năm", "Can chi", "Mệnh", "Tuổi mụ"], years.map((y) => { const x = yearInfo(y); return [String(y), x.canChi, `${x.hanh} – ${x.napAm}`, y <= nowLunar ? String(tuoiMu(y, nowLunar)) : "–"]; }),
        { hl: (r) => r[0] === String(ly), cls: ["", "l", "l wrap"] }),
      note("Can chi, nạp âm theo lịch âm Việt Nam (múi giờ UTC+7). Thông tin tam hợp, tương sinh mang tính văn hoá dân gian để tham khảo."));
  }
});

const st = document.createElement("style");
st.textContent = `.zd-hero{display:flex;gap:14px;align-items:center}.zd-hero p{margin:0}.zd-emoji{font-size:56px;line-height:1}`;
document.head.append(st);
