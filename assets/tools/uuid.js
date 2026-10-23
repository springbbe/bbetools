/* Tạo UUID v4 (ngẫu nhiên) và v7 (theo thời gian, sắp xếp được) hàng loạt bằng crypto.getRandomValues; đọc thông tin một UUID */
import { h, icon, copyText, save, LANG } from "../core.js";
import { formTool } from "../frames/form.js";
import { generate, formatUuid, inspectUuid } from "../lib/uuid.js";
import { kv, alert } from "../calc.js";
import { formatVN } from "../lib/timestamp.js";

const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
formTool({
  share: false,
  fields: [
    { id: "ver", type: "seg", label: "Phiên bản", value: "v4", choices: [["v4", "v4 – ngẫu nhiên"], ["v7", "v7 – theo thời gian"]] },
    { id: "n", type: "number", label: "Số lượng (1–10.000)", value: "5", attrs: { min: 1, max: 10000, inputmode: "numeric" } },
    { id: "upper", type: "check", label: "CHỮ HOA" },
    { id: "hyphens", type: "check", label: "Có dấu gạch ngang", value: true },
    { id: "braces", type: "check", label: "Bọc trong { }" },
    { id: "check", type: "text", label: "Kiểm tra một UUID (tuỳ chọn)", placeholder: "Dán UUID để xem phiên bản, thời điểm tạo", url: false }
  ],
  compute(v, out, api) {
    out.textContent = "";
    const n = Math.max(1, Math.min(10000, parseInt(v.n, 10) || 1));
    const list = generate(n, v.ver, rnd).map((b) => formatUuid(b, { upper: v.upper, hyphens: v.hyphens, braces: v.braces }));
    const text = list.join("\n");
    out.append(
      h("div", { class: "fm-foot" },
        h("button", { class: "btn sm", type: "button", onclick: () => copyText(text, n > 1 ? `Đã sao chép ${n} UUID` : "Đã sao chép") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => api.update() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Tạo mới"),
        h("button", { class: "ib sm", type: "button", "aria-label": "Tải file .txt", title: "Tải file .txt", html: icon("download"), onclick: () => save(new Blob([text + "\n"], { type: "text/plain" }), "uuid.txt") })),
      h("textarea", { class: "out-text", readonly: true, rows: Math.min(12, n + 1), "aria-label": "Danh sách UUID", value: text }));
    if (v.ver === "v7") out.append(h("p", { class: "hint", text: "UUID v7 bắt đầu bằng thời điểm tạo (mili giây) nên sắp xếp theo thứ tự tạo, hợp làm khoá chính cơ sở dữ liệu." }));
    if (v.check.trim()) {
      const r = inspectUuid(v.check);
      if (!r.ok) out.append(alert("err", "Không phải UUID hợp lệ (cần 32 chữ số hex, dạng 8-4-4-4-12)."));
      else out.append(h("p", { class: "opt-title", text: "Thông tin UUID" }), kv([
        ["Dạng chuẩn", r.canonical],
        ["Phiên bản", r.variant === "nil" ? "Nil (toàn số 0)" : r.variant === "max" ? "Max (toàn F)" : "v" + r.version + ({ 1: " (thời gian + MAC)", 3: " (MD5 của tên)", 4: " (ngẫu nhiên)", 5: " (SHA-1 của tên)", 6: " (thời gian, sắp xếp được)", 7: " (thời gian Unix, sắp xếp được)", 8: " (tuỳ biến)" }[r.version] || "")],
        r.variant !== "nil" && r.variant !== "max" ? ["Biến thể", r.variant] : null,
        r.time ? ["Thời điểm tạo", LANG === "vi" ? formatVN(r.time.getTime(), 420, true) + " (giờ VN)" : r.time.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC")] : null
      ]));
    }
  }
});
