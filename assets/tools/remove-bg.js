/* Xoá phông ảnh: AI tách người (MODNet, chạy trên máy) → PNG nền trong suốt, nền màu, hoặc làm mờ nền gốc (kiểu chụp xoá phông) */
import { h, baseName, sampleFiles, fmtNum } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, encode, thumbUrl, softBlur } from "../image.js";
import { loadMatting, matte, composite } from "../ai/matting.js";

const MAX = 3000; // ảnh lớn hơn được thu nhỏ trước khi tách (mặt nạ AI chỉ khoảng 512–1024 px)

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "ảnh",
  action: "Xoá phông",
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
      seg("bg", [["none", "Trong suốt"], ["white", "Trắng"], ["color", "Màu khác"], ["blur", "Làm mờ nền"]], "none", "Nền mới"),
      h("label", { class: "field color-in", id: "g-color", hidden: true }, h("span", { text: "Màu nền" }), h("input", { type: "color", id: "bgc", value: "#3D7FD1", "aria-label": "Màu nền" })),
      h("div", { class: "opt-group", id: "g-blur", hidden: true }, h("p", { class: "opt-title", text: "Độ mờ" }),
        h("div", { class: "range-row" }, h("input", { type: "range", id: "blur", min: 1, max: 5, value: 3, "aria-label": "Độ mờ nền" }), h("output", { id: "blur-v" }))),
      h("p", { class: "hint", text: "AI chạy ngay trên máy bạn (lần đầu tải khoảng 6,6 MB mô hình). Hợp nhất với ảnh có người: chân dung, ảnh bán hàng có người mẫu. Ảnh đồ vật, con vật có thể tách chưa chuẩn." }));
    const upd = () => {
      const b = radioVal(el, "bg");
      el.querySelector("#g-color").hidden = b !== "color";
      el.querySelector("#g-blur").hidden = b !== "blur";
      el.querySelector("#blur-v").textContent = ["", "Nhẹ", "Vừa", "Rõ", "Mạnh", "Rất mạnh"][el.querySelector("#blur").value];
    };
    el.addEventListener("input", upd); upd();
    return () => ({ bg: radioVal(el, "bg"), color: el.querySelector("#bgc").value, blur: +el.querySelector("#blur").value });
  },
  async run(items, o, ctx) {
    ctx.progress(-1);
    ctx.status("Đang tải mô hình AI tách nền…");
    await loadMatting((f) => ctx.status(`Đang tải mô hình AI (${Math.round(f * 100)}%, chỉ lần đầu)…`));
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i], t0 = performance.now();
      ctx.status(`AI đang tách nền ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
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
      outs.push({ blob, name: `${baseName(it.name)}-xoa-phong.${type === "image/png" ? "png" : "jpg"}`, note: `${out.width}×${out.height} · ${fmtNum((performance.now() - t0) / 1000, 1)} giây` });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "anh-xoa-phong",
  doneTitle: (outs) => (outs.length > 1 ? `Đã xoá phông ${outs.length} ảnh!` : "Đã xoá phông!"),
  summary: () => "Bấm biểu tượng con mắt để xem ảnh lớn. Viền tóc, chỗ giáp nền có thể chưa hoàn hảo với ảnh nền rối."
});
