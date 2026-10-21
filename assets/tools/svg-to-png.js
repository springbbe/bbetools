/* SVG sang PNG/JPG/WebP: vẽ ảnh vector ở độ phân giải tuỳ chọn (gấp 1–8 lần hoặc theo chiều rộng), nền trong suốt hoặc màu */
import { h, baseName, sampleFiles, toast } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { canvas, encode, EXT } from "../image.js";
import { svgSize, svgWithSize } from "../lib/image-data.js";

const MAX = 8192;

/** Kích thước ra theo tuỳ chọn, giới hạn cạnh dài MAX */
function outSize(it, o) {
  let w = it.sz.width, hh = it.sz.height;
  const k = o.mode === "width" ? (o.width || w) / w : o.scale;
  w *= k; hh *= k;
  const lim = Math.min(1, MAX / Math.max(w, hh));
  return [Math.max(1, Math.round(w * lim)), Math.max(1, Math.round(hh * lim))];
}

async function render(it, w, hh) {
  const url = URL.createObjectURL(new Blob([svgWithSize(it.text, w, hh)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

fileTool({
  accept: ["svg"], multiple: true, noun: "file SVG",
  action: "Chuyển đổi",
  sample: () => sampleFiles("logo-mau.svg"),
  async load(it) {
    it.text = await it.file.text();
    if (!/<svg[\s>]/i.test(it.text)) throw Object.assign(new Error("not svg"), { userMsg: `${it.name} không phải file SVG hợp lệ.` });
    it.sz = svgSize(it.text);
    it.thumbUrl = URL.createObjectURL(new Blob([it.text], { type: "image/svg+xml" }));
    it.thumb = it.thumbUrl;
    it.info = `${Math.round(it.sz.width)}×${Math.round(it.sz.height)}`;
  },
  options(el) {
    const width = h("input", { class: "input", id: "sw", type: "number", min: 1, max: MAX, value: 1024, inputmode: "numeric", "aria-label": "Chiều rộng (px)", style: { width: "120px" } });
    const bg = h("input", { type: "color", id: "bgc", value: "#ffffff", "aria-label": "Màu nền" });
    el.append(
      seg("mode", [["scale", "Gấp mấy lần"], ["width", "Theo chiều rộng"]], "scale", "Độ phân giải"),
      h("div", { class: "opt-group", id: "g-scale" }, seg("scale", [["1", "1×"], ["2", "2×"], ["3", "3×"], ["4", "4×"], ["8", "8×"]], "2")),
      h("div", { class: "opt-group", id: "g-width", hidden: true }, h("div", { class: "row" }, width, h("span", { text: "px (chiều cao tự tính)" }))),
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Lưu dưới dạng" }),
        h("select", { id: "to" }, [["image/png", "PNG (giữ nền trong suốt)"], ["image/jpeg", "JPG"], ["image/webp", "WebP"]].map(([v, l]) => h("option", { value: v, text: l }))))),
      seg("bg", [["none", "Trong suốt"], ["color", "Tô màu nền"]], "none", "Nền"),
      h("label", { class: "field color-in", id: "g-bg", hidden: true }, h("span", { text: "Màu nền" }), bg),
      h("p", { class: "hint", id: "sv-prev", "aria-live": "polite" }),
      h("p", { class: "hint", text: "SVG là ảnh vector nên phóng to bao nhiêu cũng nét. Ảnh hay font chữ mà SVG lấy từ mạng có thể không hiện; hãy nhúng sẵn vào file." }));
    const upd = () => {
      el.querySelector("#g-scale").hidden = radioVal(el, "mode") !== "scale";
      el.querySelector("#g-width").hidden = radioVal(el, "mode") !== "width";
      el.querySelector("#g-bg").hidden = radioVal(el, "bg") !== "color" && el.querySelector("#to").value !== "image/jpeg";
    };
    el.addEventListener("input", upd); el.addEventListener("change", upd); upd();
    return () => {
      const to = el.querySelector("#to").value;
      return { mode: radioVal(el, "mode"), scale: +radioVal(el, "scale"), width: +width.value || 0, to, bg: radioVal(el, "bg") === "color" || to === "image/jpeg" ? bg.value : null };
    };
  },
  onChange(ctx) {
    const p = document.getElementById("sv-prev"), o = ctx.opts, ok = ctx.items.filter((i) => i.sz);
    if (p) p.textContent = ok.slice(0, 3).map((it) => outSize(it, o).join("×") + " px").join(" · ");
  },
  ready: (items, o) => (o.mode === "width" && !o.width ? "Nhập chiều rộng ảnh cần xuất." : true),
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i], [w, hh] = outSize(it, o);
      ctx.status(`Đang vẽ ${it.name} ở ${w}×${hh}…`);
      let img;
      try { img = await render(it, w, hh); }
      catch (e) { console.error(e); toast(`Không vẽ được ${it.name}: SVG có lỗi hoặc dùng tính năng trình duyệt chưa hỗ trợ.`, { type: "err" }); continue; }
      const c = canvas(w, hh), g = c.getContext("2d");
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, hh); }
      g.drawImage(img, 0, 0, w, hh);
      const blob = await encode(c, o.to, 0.92);
      c.width = c.height = 0;
      outs.push({ blob, name: `${baseName(it.name)}-${w}x${hh}.${EXT[o.to]}`, note: `${w}×${hh} px` });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "svg-sang-anh",
  doneTitle: (outs) => `Đã chuyển ${outs.length} file SVG!`
});
