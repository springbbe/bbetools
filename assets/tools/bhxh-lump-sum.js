/* Ước tính BHXH một lần: nhập các giai đoạn đóng (từ tháng – đến tháng – mức lương), áp hệ số điều chỉnh tiền lương năm hiện hành */
import { h, icon } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, money, num, kv, stat, stats, table, alert, note } from "../calc.js";
import { lumpSum, parseMonth } from "../lib/bhxh.js";

const D = await loadData("bhxh");
const fmtMoney = (d) => (d ? d.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "");
const toMonthInput = (s) => { const p = parseMonth(s); return p ? `${p.y}-${String(p.m).padStart(2, "0")}` : ""; };

function periodsEditor() {
  const list = h("div", { class: "bh-rows" });
  const fire = () => list.dispatchEvent(new Event("input", { bubbles: true }));
  const addRow = (p = {}) => {
    const n = list.children.length + 1;
    const sal = h("input", { type: "text", inputmode: "numeric", placeholder: "Mức lương đóng", "aria-label": `Mức lương đóng giai đoạn ${n}`, value: fmtMoney(String(p.salary || "").replace(/\D/g, "")) });
    sal.addEventListener("input", () => { sal.value = fmtMoney(sal.value.replace(/\D/g, "").slice(0, 12)); });
    const row = h("div", { class: "bh-row" },
      h("label", { class: "field" }, h("span", { text: "Từ tháng" }), h("input", { type: "month", class: "from", min: "1975-01", max: "2099-12", placeholder: "MM/YYYY", value: toMonthInput(p.from) })),
      h("label", { class: "field" }, h("span", { text: "Đến tháng" }), h("input", { type: "month", class: "to", min: "1975-01", max: "2099-12", placeholder: "MM/YYYY", value: toMonthInput(p.to) })),
      h("label", { class: "field" }, h("span", { text: "Mức lương đóng (đ)" }), sal),
      h("button", { class: "ib sm", type: "button", title: "Xoá giai đoạn", "aria-label": "Xoá giai đoạn này", html: icon("trash-2"), onclick: () => { row.remove(); if (!list.children.length) addRow(); fire(); } }));
    sal.classList.add("sal");
    list.append(row);
  };
  const el = h("div", { class: "field" }, h("span", { class: "lbl", text: "Quá trình đóng BHXH bắt buộc" }), list,
    h("button", { class: "btn ghost sm", type: "button", style: { alignSelf: "flex-start" }, onclick: () => { const last = list.lastElementChild; addRow({ from: "", to: "", salary: last ? last.querySelector(".sal").value : "" }); fire(); } }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Thêm giai đoạn"),
    h("small", { text: "Mỗi lần đổi mức lương là một giai đoạn. Tháng nhập dạng MM/YYYY nếu trình duyệt không có ô chọn tháng." }));
  const get = () => [...list.children].map((r) => [r.querySelector(".from").value, r.querySelector(".to").value, r.querySelector(".sal").value.replace(/\D/g, "")].join("_")).join("~");
  const set = (v) => {
    list.textContent = "";
    const rows = String(v || "").split("~").filter(Boolean).map((x) => { const [from, to, salary] = x.split("_"); return { from, to, salary }; });
    (rows.length ? rows : [{}]).forEach(addRow);
  };
  return { el, get, set };
}

formTool({
  fields: [
    { id: "ds", type: "custom", render: periodsEditor, value: "2012-03_2016-12_6500000~2017-01_2021-06_9000000~2021-07_2024-12_12000000" }
  ],
  compute(v, out) {
    out.textContent = "";
    const periods = String(v.ds || "").split("~").map((x) => { const [from, to, salary] = x.split("_"); return { from, to, salary }; }).filter((p) => p.from || p.to || p.salary);
    if (!periods.length) { out.append(alert("info", "Nhập ít nhất một giai đoạn đóng BHXH.")); return; }
    const r = lumpSum(periods, D);
    if (r.errors.length) { r.errors.forEach((e) => out.append(alert("err", e))); return; }
    const y = Math.floor(r.months / 12), m = r.months % 12;
    out.append(stats(
      stat("Tiền BHXH một lần (ước tính)", money(r.amount), { hl: true }),
      stat("Thời gian đóng", (y ? y + " năm " : "") + (m ? m + " tháng" : "")),
      stat("Bình quân tiền lương đã điều chỉnh", money(r.average)),
      stat("Số tháng lương được hưởng", num(r.multiplier, 1))));
    out.append(kv(r.under1 ? [
      ["Đóng chưa đủ 1 năm", "bằng số tiền đã đóng (22% tiền lương)"],
      ["Tối đa", "2 tháng lương bình quân"]
    ] : [
      ["Số năm đóng trước 2014", num(r.yearsBefore, 1) + " năm × 1,5 tháng"],
      ["Số năm đóng từ 2014", num(r.yearsAfter, 1) + " năm × 2 tháng"],
      ["Mức hưởng", `${money(r.average)} × ${num(r.multiplier, 1)} = ${money(r.amount)}`]
    ]));
    if (r.monthsBefore % 12 && !r.under1) out.append(note(`${r.monthsBefore % 12} tháng lẻ của giai đoạn trước 2014 được cộng sang giai đoạn từ 2014; tháng lẻ 1–6 tính nửa năm, 7–11 tính một năm.`));
    out.append(h("p", { class: "opt-title", text: `Điều chỉnh tiền lương theo hệ số năm ${D.adjustYear}` }),
      table(["Năm", "Số tháng", "Hệ số", "Tổng lương đã điều chỉnh"], r.years.map((x) => [String(x.year), String(x.months), x.coef.toFixed(2).replace(".", ","), money(x.adjusted, "")]), { tall: r.years.length > 10, caption: "Hệ số điều chỉnh theo năm" }));
    out.append(alert("warn", "Từ 01/7/2025 (Luật BHXH 2024), người bắt đầu đóng BHXH từ ngày này không được rút một lần trừ trường hợp đặc biệt (ra nước ngoài định cư, bệnh hiểm nghèo…). Người đã đóng trước đó được rút khi nghỉ việc đủ 12 tháng không đóng tiếp và tổng thời gian đóng dưới 20 năm."),
      note("Kết quả là ước tính cho BHXH bắt buộc, chưa trừ phần Nhà nước hỗ trợ (với BHXH tự nguyện) và chưa xét các trường hợp đặc biệt. Số tiền chính xác do cơ quan BHXH tính khi giải quyết hồ sơ."));
  }
});

const st = document.createElement("style");
st.textContent = `.bh-rows{display:flex;flex-direction:column;gap:10px}.bh-row{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;align-items:end;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.bh-row .ib{justify-self:end;margin-bottom:4px}.bh-row input[type=month]{font-size:14.5px;padding-left:8px;padding-right:6px;min-width:0}`;
document.head.append(st);
