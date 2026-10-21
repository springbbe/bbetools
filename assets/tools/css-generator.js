/* Tạo CSS gradient, box-shadow, border-radius: chỉnh bằng thanh trượt, xem trước trực tiếp, sao chép CSS */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { gradient, boxShadow, borderRadius } from "../lib/css-gen.js";

const range = (id, label, min, max, value, show, unit = "px") => ({ id, type: "range", label, value: String(value), show, unit, attrs: { min, max, step: 1 } });
const isG = (v) => v.mode === "gradient", isS = (v) => v.mode === "shadow", isR = (v) => v.mode === "radius";

const fields = [
  { id: "mode", type: "seg", label: "Hiệu ứng", value: "gradient", choices: [["gradient", "Gradient"], ["shadow", "Box-shadow"], ["radius", "Bo góc"]] },
  // gradient
  { id: "gtype", type: "seg", label: "Kiểu gradient", value: "linear", choices: [["linear", "Thẳng"], ["radial", "Tròn"], ["conic", "Nón"]], show: isG },
  range("angle", "Góc", 0, 360, 135, (v) => isG(v) && v.gtype !== "radial", "°"),
  { id: "c1", type: "color", label: "Màu 1", value: "#3e5bf2", show: isG },
  range("p1", "Vị trí màu 1", 0, 100, 0, isG, "%"),
  { id: "c2", type: "color", label: "Màu 2", value: "#a855f7", show: isG },
  range("p2", "Vị trí màu 2", 0, 100, 50, isG, "%"),
  { id: "use3", type: "check", label: "Thêm màu 3", value: true, show: isG },
  { id: "c3", type: "color", label: "Màu 3", value: "#f97316", show: (v) => isG(v) && v.use3 },
  range("p3", "Vị trí màu 3", 0, 100, 100, (v) => isG(v) && v.use3, "%"),
  // shadow
  range("sx", "Lệch ngang", -100, 100, 0, isS), range("sy", "Lệch dọc", -100, 100, 12, isS),
  range("blur", "Độ nhoè", 0, 150, 32, isS), range("spread", "Độ lan", -50, 50, -8, isS),
  { id: "scolor", type: "color", label: "Màu bóng", value: "#101828", show: isS },
  range("alpha", "Độ đậm", 0, 100, 25, isS, "%"),
  { id: "inset", type: "check", label: "Bóng vào trong (inset)", show: isS },
  { id: "layer2", type: "check", label: "Thêm lớp bóng mềm thứ 2", value: true, show: isS },
  // radius
  { id: "same", type: "check", label: "Bốn góc bằng nhau", value: true, show: isR },
  range("r1", "Góc trên trái", 0, 200, 24, isR), range("r2", "Góc trên phải", 0, 200, 24, (v) => isR(v) && !v.same),
  range("r3", "Góc dưới phải", 0, 200, 24, (v) => isR(v) && !v.same), range("r4", "Góc dưới trái", 0, 200, 24, (v) => isR(v) && !v.same)
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
      h("div", { class: "fm-foot" }, h("button", { class: "btn sm", type: "button", onclick: () => copyText(css) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép CSS")));
  }
});
