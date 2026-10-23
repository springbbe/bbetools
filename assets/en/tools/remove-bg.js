/* Tự sinh bởi scripts/build.js từ assets/tools/remove-bg.js và i18n/en/js/ — đừng sửa tay. */
/* Xoá phông ảnh: AI tách người (MODNet, chạy trên máy) → PNG nền trong suốt, nền màu, hoặc làm mờ nền gốc (kiểu chụp xoá phông) */
import { h, baseName, sampleFiles, fmtNum } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, encode, thumbUrl, softBlur } from "../image.js";
import { loadMatting, matte, composite } from "../ai/matting.js";

const MAX = 3000; // ảnh lớn hơn được thu nhỏ trước khi tách (mặt nạ AI chỉ khoảng 512–1024 px)

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "images",
  action: "Remove background",
  sample: () => sampleFiles("chan-dung-mau.jpg"),
  warm: () => loadMatting(),
  async load(it) {
    const bmp = await decodeImage(it.file);
    it.info = `${bmp.width}×${bmp.height}`;
    it.thumb = await thumbUrl(bmp, 112);
    if (bmp.close) bmp.close();
  },
  options(el) {
    el.append(
      seg("bg", [["none", "Transparent"], ["white", "White"], ["color", "Other color"], ["blur", "Blur background"]], "none", "New background"),
      h("label", { class: "field color-in", id: "g-color", hidden: true }, h("span", { text: "Background color" }), h("input", { type: "color", id: "bgc", value: "#3D7FD1", "aria-label": "Background color" })),
      h("div", { class: "opt-group", id: "g-blur", hidden: true }, h("p", { class: "opt-title", text: "Blur" }),
        h("div", { class: "range-row" }, h("input", { type: "range", id: "blur", min: 1, max: 5, value: 3, "aria-label": "Background blur" }), h("output", { id: "blur-v" }))),
      h("p", { class: "hint", text: "The AI runs right on your device (about 6.6 MB model downloaded the first time). Works best on photos of people: portraits, product shots with models. Objects and animals may not be cut out perfectly." }));
    const upd = () => {
      const b = radioVal(el, "bg");
      el.querySelector("#g-color").hidden = b !== "color";
      el.querySelector("#g-blur").hidden = b !== "blur";
      el.querySelector("#blur-v").textContent = ["", "Light", "Medium", "Clear", "Strong", "Very strong"][el.querySelector("#blur").value];
    };
    el.addEventListener("input", upd); upd();
    return () => ({ bg: radioVal(el, "bg"), color: el.querySelector("#bgc").value, blur: +el.querySelector("#blur").value });
  },
  async run(items, o, ctx) {
    ctx.progress(-1);
    ctx.status("Loading the background-removal AI model…");
    await loadMatting((f) => ctx.status(`Loading the AI model (${Math.round(f * 100)}%, first time only)…`));
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i], t0 = performance.now();
      ctx.status(`AI is removing the background ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      const bmp = await decodeImage(it.file);
      const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      const src = drawScaled(bmp, bmp.width * k, bmp.height * k);
      if (bmp.close) bmp.close();
      const mask = await matte(src);
      let out, type = "image/jpeg";
      if (o.bg === "blur") {
        out = softBlur(src, [0, 8, 16, 24, 40, 64][o.blur]);
        out.getContext("2d").drawImage(composite(src, mask, null), 0, 0);
      } else if (o.bg === "none") { out = composite(src, mask, null); type = "image/png"; }
      else out = composite(src, mask, o.bg === "white" ? "#ffffff" : o.color);
      const blob = await encode(out, type, 0.92, { fast: true });
      outs.push({ blob, name: `${baseName(it.name)}-no-background.${type === "image/png" ? "png" : "jpg"}`, note: `${out.width}×${out.height} · ${fmtNum((performance.now() - t0) / 1000, 1)} seconds` });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "background-removed",
  doneTitle: (outs) => (outs.length > 1 ? `Removed the background from ${outs.length} images!` : "Background removed!"),
  summary: () => "Click the eye icon to view the large image. Hair edges and boundaries may not be perfect on busy backgrounds."
});
