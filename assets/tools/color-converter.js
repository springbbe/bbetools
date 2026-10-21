/* Đổi mã màu: HEX, RGB, HSL, HWB, OKLCH, OKLab, CMYK; dải sáng–tối; kiểm tra độ tương phản chữ/nền theo WCAG */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseColor, formats, contrast, bestText, shades } from "../lib/color.js";
import { alert } from "../calc.js";

/** Ô màu: ô chữ (nhận mọi cách viết) + ô chọn màu, đồng bộ hai chiều */
const colorField = (id, label, hint) => ({
  id, type: "custom", label, render(api) {
    const txt = h("input", { id: "f-" + id, type: "text", autocomplete: "off", spellcheck: "false", autocapitalize: "off", class: "mono" });
    const pick = h("input", { type: "color", "aria-label": label + " – bảng chọn màu" });
    const sync = () => { const c = parseColor(txt.value); if (c) pick.value = formats({ ...c, a: 1 }).hex; };
    txt.addEventListener("input", sync);
    pick.addEventListener("input", () => { txt.value = pick.value; });
    const el = h("div", { class: "field" }, h("label", { for: "f-" + id, text: label }), h("div", { class: "color-in" }, txt, pick), hint ? h("small", { html: hint }) : null);
    return { el, get: () => txt.value, set: (v) => { txt.value = v; sync(); } };
  }
});
const row = (k, v) => h("div", { class: "ts-row" }, h("span", { class: "ts-k", text: k }), h("code", { class: "ts-v", text: v }),
  h("button", { class: "ib sm", type: "button", "aria-label": "Sao chép " + k, title: "Sao chép", html: icon("copy"), onclick: () => copyText(v) }));
const badge = (ok, label) => h("span", { class: "wc " + (ok ? "pass" : "fail") }, (ok ? "✓ " : "✗ ") + label);

formTool({
  fields: [
    Object.assign(colorField("c", "Màu", "Nhận #3e63dd, rgb(62 99 221), hsl(…), oklch(…), tên màu CSS (tomato)…"), { value: "#3e63dd" }),
    Object.assign(colorField("bg", "Màu nền để kiểm tra tương phản"), { value: "#ffffff" })
  ],
  compute(v, out, api) {
    out.textContent = "";
    const c = parseColor(v.c);
    if (!c) { out.append(alert("err", "Không đọc được màu. Thử dạng #3e63dd, rgb(62, 99, 221), hsl(226 70% 55%) hoặc tên màu tiếng Anh như red, navy.")); return; }
    const f = formats(c);
    const solid = { ...c, a: 1 };
    out.append(h("div", { class: "swatch", style: { "--c": f.rgb.startsWith("rgb(") ? f.rgb : f.hex, color: bestText(solid) } }, h("b", { text: f.hex }), f.name ? h("span", { text: f.name }) : null));
    if (c.outOfGamut) out.append(alert("warn", "Màu OKLCH này nằm ngoài dải sRGB, đã được cắt về màu gần nhất màn hình thông thường hiển thị được."));
    out.append(h("div", { class: "ts-list" }, row("HEX", f.hex), row("RGB", f.rgb), row("HSL", f.hsl), row("HWB", f.hwb), row("OKLCH", f.oklch), row("OKLab", f.oklab), row("CMYK (ước lượng)", f.cmyk)));
    out.append(h("p", { class: "opt-title", text: "Dải sáng → tối (bấm để chọn)" }),
      h("div", { class: "shades" }, shades(solid).map((s) => { const x = formats(s).hex; return h("button", { type: "button", title: x, "aria-label": x, style: { background: x }, onclick: () => api.set("c", x) }); })));
    const bg = parseColor(v.bg);
    if (!bg) { out.append(alert("err", "Màu nền chưa đúng định dạng.")); return; }
    const bgs = { ...bg, a: 1 };
    const ratio = contrast(c, bgs);
    const r = Math.floor(ratio * 100) / 100;
    out.append(h("p", { class: "opt-title", text: "Độ tương phản chữ / nền (WCAG 2.2)" }),
      h("div", { class: "contrast", style: { background: formats(bgs).hex, color: f.hex } }, h("b", { text: "Chữ thường Aa" }), h("span", { class: "big", text: "Chữ lớn Aa" })),
      h("p", { class: "result-big", text: r.toLocaleString("vi-VN") + " : 1" }),
      h("div", { class: "wc-list" }, badge(ratio >= 4.5, "AA chữ thường (≥ 4,5)"), badge(ratio >= 3, "AA chữ lớn (≥ 3)"), badge(ratio >= 7, "AAA chữ thường (≥ 7)"), badge(ratio >= 4.5, "AAA chữ lớn (≥ 4,5)")),
      h("p", { class: "hint", text: `Chữ lớn: từ 24px, hoặc 18,66px đậm. Trên nền màu này, chữ ${bestText(solid) === "#000000" ? "đen" : "trắng"} dễ đọc hơn.` }));
  }
});
