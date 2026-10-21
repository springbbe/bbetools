/* Tra mã tỉnh trên CCCD (nơi đăng ký khai sinh, giới tính, năm sinh) và ký hiệu biển số xe (tỉnh cũ → tỉnh mới sau sáp nhập) */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, kv, table, alert, note } from "../calc.js";
import { buildTables, parseCccd, parsePlate, detect } from "../lib/ma-tinh.js";

const D = await loadData("ma-tinh");
const T = buildTables(D);
const merged = (code) => D.oldProvinces.filter((o) => o.now === code);
const nowText = (rec) => {
  const parts = merged(rec.now.code);
  return rec.now.name + (parts.length > 1 ? ` (hợp nhất từ ${parts.map((p) => p.name.replace(/^(Tỉnh|Thành phố) /, "")).join(", ")})` : " (giữ nguyên)");
};

formTool({
  share: false, // không đưa số CCCD lên đường link
  fields: [
    { id: "q", type: "text", label: "Số CCCD hoặc biển số xe", value: "", url: false, placeholder: "Ví dụ: 001203012345 hoặc 30A-123.45", attrs: { autocapitalize: "characters", spellcheck: "false", maxlength: 20 },
      hint: "Chỉ cần 3 số đầu của CCCD hoặc 2 số đầu của biển số. Mọi thứ được tra ngay trên máy, không gửi đi đâu." }
  ],
  compute(v, out) {
    out.textContent = "";
    const q = (v.q || "").trim();
    if (!q) {
      out.append(alert("info", "Nhập số CCCD (12 số) hoặc biển số xe để xem thuộc tỉnh nào."),
        h("p", { class: "row" }, ...["079190123456", "30A-123.45", "61A-999.99", "65B1-234.56"].map((x) => h("button", { class: "chip", type: "button", text: x, onclick: () => { const i = document.querySelector("#app input"); i.value = x; i.dispatchEvent(new Event("input", { bubbles: true })); } }))));
    } else if (detect(q) !== "plate" || (/^[\d\s.]+$/.test(q) && q.replace(/\D/g, "").length > 2)) {
      const d = q.replace(/\D/g, "");
      if (d.length !== 3 && d.length !== 12) out.append(alert(d.length === 9 ? "warn" : "info", d.length === 9 ? "Đây là số CMND 9 số (mẫu cũ); công cụ chỉ đọc số CCCD/định danh 12 số." : `Số CCCD gồm đúng 12 chữ số (bạn đã nhập ${d.length}); hoặc chỉ nhập 3 số đầu để xem tỉnh.`));
      else if (d.length === 3) {
        const rec = T.cccd.get(d);
        out.append(rec ? kv([["Mã tỉnh", d], ["Nơi đăng ký khai sinh", rec.old.name], ["Nay thuộc", nowText(rec)]]) : alert("err", `Mã ${d} không thuộc tỉnh, thành nào.`));
      } else {
        const r = parseCccd(q, T);
        if (!r.rec && r.msg && !r.code) out.append(alert("err", r.msg));
        else {
          out.append(h("p", { class: "result-big", text: r.rec ? r.rec.old.name.replace(/^(Tỉnh|Thành phố) /, "") : "Mã " + r.code }));
          out.append(kv([
            ["Mã nơi đăng ký khai sinh", r.code],
            r.rec ? ["Tỉnh, thành (khi khai sinh)", r.rec.old.name] : null,
            r.rec ? ["Nay thuộc", nowText(r.rec)] : null,
            ["Giới tính", r.gender],
            ["Năm sinh", String(r.year)],
            ["Dãy số ngẫu nhiên", r.serial]
          ]));
          if (r.msg) out.append(alert("warn", r.msg));
        }
      }
    } else {
      const r = parsePlate(q, T);
      if (!r.ok) out.append(alert("err", r.msg));
      else {
        out.append(h("p", { class: "result-big", text: r.rec ? r.rec.now.name.replace(/^(Tỉnh|Thành phố) /, "") : "Cục Cảnh sát giao thông" }));
        out.append(kv([
          ["Ký hiệu địa phương", r.code],
          r.rec ? ["Cấp tại (trước 1/7/2025)", r.rec.old.name] : null,
          r.rec ? ["Nay thuộc", nowText(r.rec)] : ["Đơn vị", r.special],
          r.rec ? ["Các ký hiệu của tỉnh mới", merged(r.rec.now.code).flatMap((o) => o.plates).sort().join(", ")] : null,
          r.series ? ["Seri", r.series + (r.seriesNote ? " – " + r.seriesNote : "")] : null
        ]));
      }
    }
    out.append(h("details", null, h("summary", { text: "Bảng mã 34 tỉnh, thành phố" }),
      table(["Tỉnh, thành phố", "Mã CCCD", "Biển số"], D.provinces.map((p) => {
        const parts = merged(p.code);
        return [h("span", null, h("b", { text: p.name.replace(/^(Tỉnh|Thành phố) /, "") }), parts.length > 1 ? h("small", { class: "muted", text: " gồm " + parts.map((o) => o.name.replace(/^(Tỉnh|Thành phố) /, "")).join(", ") }) : null),
          parts.map((o) => "0" + o.code).join(", "), parts.flatMap((o) => o.plates).sort().join(", ")];
      }), { cls: ["l wrap", "wrap", "wrap"] })));
    out.append(note("Biển 80: xe của các cơ quan trung ương, xe có yếu tố nước ngoài do Cục Cảnh sát giao thông cấp. Màu biển: trắng – xe cá nhân, doanh nghiệp; vàng – xe kinh doanh vận tải; xanh – cơ quan nhà nước; đỏ – quân đội. " + D.note));
  }
});
