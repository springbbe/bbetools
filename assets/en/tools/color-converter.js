/* Tự sinh bởi scripts/build.js từ assets/tools/color-converter.js và i18n/en/js/ — đừng sửa tay. */
/* Đổi mã màu: HEX, RGB, HSL, HWB, OKLCH, OKLab, CMYK; dải sáng–tối; kiểm tra độ tương phản chữ/nền theo WCAG */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseColor, formats, contrast, bestText, shades } from "../lib/color.js";
import { alert } from "../calc.js";

/** Ô màu: ô chữ (nhận mọi cách viết) + ô chọn màu, đồng bộ hai chiều */
const colorField = (id, label, hint) => ({
  id, type: "custom", label, render(api) {
    const txt = h("input", { id: "f-" + id, type: "text", autocomplete: "off", spellcheck: "false", autocapitalize: "off", class: "mono" });
    const pick = h("input", { type: "color", "aria-label": label + " – color picker" });
    const sync = () => { const c = parseColor(txt.value); if (c) pick.value = formats({ ...c, a: 1 }).hex; };
    txt.addEventListener("input", sync);
    pick.addEventListener("input", () => { txt.value = pick.value; });
    const el = h("div", { class: "field" }, h("label", { for: "f-" + id, text: label }), h("div", { class: "color-in" }, txt, pick), hint ? h("small", { html: hint }) : null);
    return { el, get: () => txt.value, set: (v) => { txt.value = v; sync(); } };
  }
});
const row = (k, v) => h("div", { class: "ts-row" }, h("span", { class: "ts-k", text: k }), h("code", { class: "ts-v", text: v }),
  h("button", { class: "ib sm", type: "button", "aria-label": "Copy " + k, title: "Copy", html: icon("copy"), onclick: () => copyText(v) }));
const badge = (ok, label) => h("span", { class: "wc " + (ok ? "pass" : "fail") }, (ok ? "✓ " : "✗ ") + label);

formTool({
  fields: [
    Object.assign(colorField("c", "Color", "Accepts #3e63dd, rgb(62 99 221), hsl(…), oklch(…), CSS color names (tomato)…"), { value: "#3e63dd" }),
    Object.assign(colorField("bg", "Background color for the contrast check"), { value: "#ffffff" })
  ],
  compute(v, out, api) {
    out.textContent = "";
    const c = parseColor(v.c);
    if (!c) { out.append(alert("err", "Couldn't read the color. Try #3e63dd, rgb(62, 99, 221), hsl(226 70% 55%) or a color name like red, navy.")); return; }
    const f = formats(c);
    const solid = { ...c, a: 1 };
    out.append(h("div", { class: "swatch", style: { "--c": f.rgb.startsWith("rgb(") ? f.rgb : f.hex, color: bestText(solid) } }, h("b", { text: f.hex }), f.name ? h("span", { text: f.name }) : null));
    if (c.outOfGamut) out.append(alert("warn", "This OKLCH color is outside the sRGB gamut and was clipped to the nearest color a normal screen can display."));
    out.append(h("div", { class: "ts-list" }, row("HEX", f.hex), row("RGB", f.rgb), row("HSL", f.hsl), row("HWB", f.hwb), row("OKLCH", f.oklch), row("OKLab", f.oklab), row("CMYK (estimated)", f.cmyk)));
    out.append(h("p", { class: "opt-title", text: "Light → dark scale (click to pick)" }),
      h("div", { class: "shades" }, shades(solid).map((s) => { const x = formats(s).hex; return h("button", { type: "button", title: x, "aria-label": x, style: { background: x }, onclick: () => api.set("c", x) }); })));
    const bg = parseColor(v.bg);
    if (!bg) { out.append(alert("err", "The background color format isn't valid.")); return; }
    const bgs = { ...bg, a: 1 };
    const ratio = contrast(c, bgs);
    const r = Math.floor(ratio * 100) / 100;
    out.append(h("p", { class: "opt-title", text: "Text / background contrast (WCAG 2.2)" }),
      h("div", { class: "contrast", style: { background: formats(bgs).hex, color: f.hex } }, h("b", { text: "Normal text Aa" }), h("span", { class: "big", text: "Large text Aa" })),
      h("p", { class: "result-big", text: r.toLocaleString("en-US") + " : 1" }),
      h("div", { class: "wc-list" }, badge(ratio >= 4.5, "AA normal text (≥ 4.5)"), badge(ratio >= 3, "AA large text (≥ 3)"), badge(ratio >= 7, "AAA normal text (≥ 7)"), badge(ratio >= 4.5, "AAA large text (≥ 4.5)")),
      h("p", { class: "hint", text: `Large text: 24px and up, or 18.66px bold. On this background, ${bestText(solid) === "#000000" ? "black" : "white"} text is easier to read.` }));
  }
});
