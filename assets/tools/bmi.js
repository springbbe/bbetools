/* Tính BMI theo ngưỡng cho người châu Á (WHO 2000), cân nặng hợp lý theo chiều cao */
import { h, HOME } from "../core.js";
import { formTool } from "../frames/form.js";
import { num, stat, stats, table, alert } from "../calc.js";
import { bmi, bmiClass, healthyRange, BMI_ASIA, BMI_WHO } from "../lib/suc-khoe.js";
import { parseNum } from "../lib/don-vi.js";

formTool({
  fields: [
    { id: "h", type: "text", label: "Chiều cao (cm)", value: "165", attrs: { inputmode: "decimal" } },
    { id: "w", type: "text", label: "Cân nặng (kg)", value: "60", attrs: { inputmode: "decimal" } },
    { id: "std", type: "seg", label: "Chuẩn phân loại", value: "asia", choices: [["asia", "Người châu Á"], ["who", "WHO quốc tế"]] }
  ],
  compute(v, out) {
    out.textContent = "";
    const cm = parseNum(v.h), kg = parseNum(v.w);
    if (!(cm >= 50 && cm <= 250) || !(kg >= 10 && kg <= 400)) { out.append(alert("info", "Nhập chiều cao (50–250 cm) và cân nặng (10–400 kg).")); return; }
    const T = v.std === "who" ? BMI_WHO : BMI_ASIA;
    const b = bmi(kg, cm), c = bmiClass(b, T), r = healthyRange(cm, T);
    out.append(stats(stat("Chỉ số BMI", num(b, 1), { hl: true }), stat("Phân loại", c.label, { tone: c.tone === "ok" ? "ok" : c.tone === "err" ? "err" : null }), stat("Cân nặng hợp lý", `${num(r.min, 1)} – ${num(r.max, 1)} kg`)));
    // thang màu từ 15 đến 35
    const lo = 15, hi = 35, pos = Math.max(0, Math.min(100, ((b - lo) / (hi - lo)) * 100));
    const segs = T.map((x, i) => { const from = i ? T[i - 1].max : lo, to = Math.min(x.max, hi); return { w: ((Math.max(0, to - Math.max(from, lo))) / (hi - lo)) * 100, tone: x.tone, label: x.label }; }).filter((s) => s.w > 0);
    out.append(h("div", { class: "bmi-scale", role: "img", "aria-label": `BMI ${num(b, 1)}: ${c.label}` },
      h("div", { class: "meter" }, segs.map((s) => h("span", { style: { width: s.w + "%", "--c": `var(--${s.tone})` } }))),
      h("span", { class: "bmi-pin", style: { left: pos + "%" } })));
    if (kg < r.min) out.append(alert("warn", `Cần tăng khoảng ${num(r.min - kg, 1)} kg để đạt mức bình thường.`));
    else if (kg > r.max) out.append(alert("warn", `Cần giảm khoảng ${num(kg - r.max, 1)} kg để về mức bình thường.`));
    else out.append(alert("ok", "Cân nặng của bạn đang ở mức bình thường."));
    out.append(table(["Phân loại", "BMI"], T.map((x, i) => [x.label, i === 0 ? `dưới ${num(x.max, 1)}` : x.max === Infinity ? `từ ${num(T[i - 1].max, 1)} trở lên` : `${num(T[i - 1].max, 1)} – dưới ${num(x.max, 1)}`]), { hl: (row) => row[0] === c.label, cls: ["l"] }),
      h("p", { class: "hint" }, "BMI = cân nặng (kg) ÷ chiều cao (m)². Người châu Á có tỉ lệ mỡ cao hơn ở cùng BMI nên ngưỡng thừa cân thấp hơn (23). BMI không áp dụng cho trẻ dưới 18 tuổi, phụ nữ mang thai, vận động viên nhiều cơ. Tính lượng calo cần mỗi ngày: ",
        h("a", { href: HOME + "tinh-calo-tdee/", text: "Calo cần mỗi ngày (TDEE)" }), "."));
  }
});

const st = document.createElement("style");
st.textContent = `.bmi-scale{position:relative;padding:8px 0 4px}.bmi-scale .meter{height:14px;gap:2px;background:transparent}.bmi-pin{position:absolute;top:2px;width:4px;height:26px;margin-left:-2px;border-radius:2px;background:var(--ink);box-shadow:0 0 0 2px var(--surface)}`;
document.head.append(st);
