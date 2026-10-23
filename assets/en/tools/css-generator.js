/* Tự sinh bởi scripts/build.js từ assets/tools/css-generator.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo CSS gradient, box-shadow, border-radius: chỉnh bằng thanh trượt, xem trước trực tiếp, sao chép CSS */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { gradient, boxShadow, borderRadius } from "../lib/css-gen.js";

const range = (id, label, min, max, value, show, unit = "px") => ({ id, type: "range", label, value: String(value), show, unit, attrs: { min, max, step: 1 } });
const isG = (v) => v.mode === "gradient", isS = (v) => v.mode === "shadow", isR = (v) => v.mode === "radius";

const fields = [
  { id: "mode", type: "seg", label: "Effect", value: "gradient", choices: [["gradient", "Gradient"], ["shadow", "Box-shadow"], ["radius", "Border radius"]] },
  // gradient
  { id: "gtype", type: "seg", label: "Gradient type", value: "linear", choices: [["linear", "Linear"], ["radial", "Radial"], ["conic", "Conic"]], show: isG },
  range("angle", "Angle", 0, 360, 135, (v) => isG(v) && v.gtype !== "radial", "°"),
  { id: "c1", type: "color", label: "Color 1", value: "#3e5bf2", show: isG },
  range("p1", "Color 1 position", 0, 100, 0, isG, "%"),
  { id: "c2", type: "color", label: "Color 2", value: "#a855f7", show: isG },
  range("p2", "Color 2 position", 0, 100, 50, isG, "%"),
  { id: "use3", type: "check", label: "Add color 3", value: true, show: isG },
  { id: "c3", type: "color", label: "Color 3", value: "#f97316", show: (v) => isG(v) && v.use3 },
  range("p3", "Color 3 position", 0, 100, 100, (v) => isG(v) && v.use3, "%"),
  // shadow
  range("sx", "Horizontal offset", -100, 100, 0, isS), range("sy", "Vertical offset", -100, 100, 12, isS),
  range("blur", "Blur", 0, 150, 32, isS), range("spread", "Spread", -50, 50, -8, isS),
  { id: "scolor", type: "color", label: "Shadow color", value: "#101828", show: isS },
  range("alpha", "Opacity", 0, 100, 25, isS, "%"),
  { id: "inset", type: "check", label: "Inset shadow", show: isS },
  { id: "layer2", type: "check", label: "Add a second soft shadow layer", value: true, show: isS },
  // radius
  { id: "same", type: "check", label: "All corners equal", value: true, show: isR },
  range("r1", "Top-left corner", 0, 200, 24, isR), range("r2", "Top-right corner", 0, 200, 24, (v) => isR(v) && !v.same),
  range("r3", "Bottom-right corner", 0, 200, 24, (v) => isR(v) && !v.same), range("r4", "Bottom-left corner", 0, 200, 24, (v) => isR(v) && !v.same)
];

formTool({
  fields,
  init(api) {
    // hiện giá trị đang chọn cạnh nhãn thanh trượt
    for (const f of fields.filter((x) => x.type === "range")) {
      const c = api.ctrls[f.id], lab = c.el.querySelector("label"), inp = c.el.querySelector("input");
      const out = h("output", { class: "rng-v" });
      lab.append(" ", out);
      const upd = () => { out.textContent = inp.value + f.unit; };
      inp.addEventListener("input", upd); upd();
      c.set = ((set) => (val) => { set(val); upd(); })(c.set);
    }
  },
  compute(v, out) {
    out.textContent = "";
    let prop, val;
    if (v.mode === "gradient") {
      const stops = [{ color: v.c1, pos: +v.p1 }, { color: v.c2, pos: +v.p2 }];
      if (v.use3) stops.push({ color: v.c3, pos: +v.p3 });
      prop = "background"; val = gradient({ type: v.gtype, angle: +v.angle, stops });
    } else if (v.mode === "shadow") {
      const layers = [{ x: +v.sx, y: +v.sy, blur: +v.blur, spread: +v.spread, color: v.scolor, alpha: v.alpha / 100, inset: v.inset }];
      if (v.layer2) layers.push({ x: 0, y: Math.round(+v.sy / 6), blur: Math.round(+v.blur / 8), spread: 0, color: v.scolor, alpha: v.alpha / 250, inset: v.inset });
      prop = "box-shadow"; val = boxShadow(layers);
    } else {
      prop = "border-radius"; val = borderRadius(v.same ? [v.r1, v.r1, v.r1, v.r1] : [v.r1, v.r2, v.r3, v.r4]);
    }
    const css = `${prop}: ${val};`;
    const box = h("div", { class: "css-box" + (v.mode === "gradient" ? " grad" : "") });
    box.style.setProperty(prop, val);
    out.append(h("div", { class: "css-stage" }, box),
      h("pre", { class: "css-code mono", text: css }),
      h("div", { class: "fm-foot" }, h("button", { class: "btn sm", type: "button", onclick: () => copyText(css) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy CSS")));
  }
});
