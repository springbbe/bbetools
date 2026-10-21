/* Tính ngày dự sinh và tuổi thai theo ngày đầu kỳ kinh cuối (có chỉnh theo độ dài chu kỳ) hoặc theo kết quả siêu âm */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { stat, stats, table, alert, note, dateVN } from "../calc.js";
import { parseDate, toDays, fromDays, iso, today, addDays } from "../lib/ngay.js";
import { dueFromLmp, gestation } from "../lib/suc-khoe.js";

const T = today();
const MILESTONES = [
  [6, 8, "Siêu âm lần đầu: xác định thai trong tử cung, tim thai"],
  [11, 13.86, "Đo độ mờ da gáy, sàng lọc trước sinh (Double test, NIPT)"],
  [16, 18, "Sàng lọc Triple test (nếu cần)"],
  [18, 22, "Siêu âm hình thái học chi tiết"],
  [24, 28, "Nghiệm pháp dung nạp đường (tiểu đường thai kỳ)"],
  [30, 32, "Siêu âm đánh giá tăng trưởng, ngôi thai"],
  [37, 40, "Thai đủ tháng, theo dõi dấu hiệu chuyển dạ"]
];

formTool({
  fields: [
    { id: "by", type: "seg", label: "Tính theo", value: "lmp", choices: [["lmp", "Kỳ kinh cuối"], ["us", "Kết quả siêu âm"]] },
    { id: "lmp", type: "date", label: "Ngày đầu tiên của kỳ kinh cuối", value: iso(addDays(T, -70)), show: (v) => v.by === "lmp" },
    { id: "cycle", type: "number", label: "Độ dài chu kỳ (ngày)", value: "28", attrs: { min: 20, max: 45, step: 1, inputmode: "numeric" }, show: (v) => v.by === "lmp", hint: "Thường 28 ngày; chu kỳ dài hơn thì ngày dự sinh lùi lại tương ứng." },
    { id: "us", type: "date", label: "Ngày siêu âm", value: iso(addDays(T, -14)), show: (v) => v.by === "us" },
    { id: "w", type: "number", label: "Tuổi thai khi siêu âm (tuần)", value: "8", attrs: { min: 4, max: 42, step: 1, inputmode: "numeric" }, show: (v) => v.by === "us" },
    { id: "d", type: "number", label: "và (ngày)", value: "0", attrs: { min: 0, max: 6, step: 1, inputmode: "numeric" }, show: (v) => v.by === "us" }
  ],
  compute(v, out) {
    out.textContent = "";
    let due;
    if (v.by === "us") {
      const u = parseDate(v.us);
      const ga = Math.round(+v.w || 0) * 7 + Math.round(+v.d || 0);
      if (!u || !ga) { out.append(alert("info", "Nhập ngày siêu âm và tuổi thai.")); return; }
      due = toDays(u) - ga + 280;
    } else {
      const l = parseDate(v.lmp);
      if (!l) { out.append(alert("info", "Chọn ngày đầu kỳ kinh cuối.")); return; }
      const cyc = Math.max(20, Math.min(45, Math.round(+v.cycle || 28)));
      due = dueFromLmp(toDays(l), cyc);
    }
    const now = toDays(T);
    const g = gestation(due, now);
    if (g.totalDays < 0) { out.append(alert("err", "Ngày nhập ở tương lai — kiểm tra lại.")); return; }
    if (g.totalDays > 44 * 7) { out.append(alert("warn", "Tuổi thai đã quá 44 tuần — kiểm tra lại ngày nhập.")); }
    const D = fromDays(due), conceive = fromDays(due - 266);
    out.append(stats(
      stat("Ngày dự sinh", dateVN(D), { hl: true, note: g.totalDays <= 280 ? `còn ${due - now} ngày` : `đã qua ${now - due} ngày` }),
      stat("Tuổi thai hôm nay", `${g.weeks} tuần ${g.days} ngày`, { note: `tam cá nguyệt thứ ${g.trimester}` }),
      stat("Ngày thụ thai ước tính", dateVN(conceive))));
    const pct = Math.max(0, Math.min(100, (g.totalDays / 280) * 100));
    out.append(h("div", { class: "meter", role: "img", "aria-label": `Đã đi được ${Math.round(pct)}% thai kỳ 40 tuần` }, h("span", { style: { width: pct + "%", "--c": "var(--ok)" } })));
    const start = due - 280;
    out.append(h("p", { class: "opt-title", text: "Các mốc khám thai thường gặp" }),
      table(["Tuần thai", "Khoảng ngày", "Nội dung"], MILESTONES.map(([a, b, t]) => [`${a}–${Math.floor(b)}`, `${dateVN(fromDays(start + Math.round(a * 7)))} – ${dateVN(fromDays(start + Math.floor(b) * 7 + 6))}`, t]),
        { cls: ["l", "", "l wrap"], hl: (r, i) => g.weeks >= MILESTONES[i][0] && g.weeks <= MILESTONES[i][1] }),
      note("Ngày dự sinh tính theo quy tắc Naegele (kỳ kinh cuối + 280 ngày). Chỉ khoảng 4–5% trẻ sinh đúng ngày dự sinh; sinh trong khoảng 37–42 tuần đều là bình thường. Nếu siêu âm 3 tháng đầu cho kết quả lệch, bác sĩ thường lấy theo siêu âm. Công cụ chỉ để tham khảo, không thay thế tư vấn của bác sĩ."));
  }
});
