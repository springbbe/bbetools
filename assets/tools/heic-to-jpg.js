/* HEIC sang JPG/PNG: giải mã bằng trình duyệt (Safari) hoặc libheif (WebAssembly, qua heic-to), hàng loạt */
import { h, lib, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { canvas, encode } from "../image.js";

async function toBitmap(file) {
  try { return await createImageBitmap(file); } catch (_) {}
  const { heicTo } = await lib("heic");
  return heicTo({ blob: file, type: "bitmap" });
}

fileTool({
  accept: ["heic"], multiple: true, noun: "ảnh HEIC",
  action: "Chuyển đổi",
  sample: () => sampleFiles("anh-iphone.heic"),
  warm: () => lib("heic"),
  load(it) { it.info = "ảnh HEIC"; },
  options(el) {
    const q = h("input", { type: "range", min: 40, max: 100, value: 90, id: "q", "aria-label": "Chất lượng JPG" });
    const qv = h("output", { for: "q", text: "90" });
    el.append(seg("fmt", [["image/jpeg", "JPG"], ["image/png", "PNG"]], "image/jpeg", "Chuyển sang"),
      h("div", { class: "opt-group", id: "qg" }, h("p", { class: "opt-title", text: "Chất lượng JPG" }), h("div", { class: "range-row" }, q, qv)),
      h("p", { class: "hint", text: "JPG nhẹ, mở được ở mọi nơi (Zalo, Windows, trang nộp hồ sơ). PNG giữ nguyên từng điểm ảnh nhưng nặng hơn nhiều." }));
    const upd = () => { qv.textContent = q.value; el.querySelector("#qg").hidden = radioVal(el, "fmt") !== "image/jpeg"; };
    el.addEventListener("input", upd); upd();
    return () => ({ type: radioVal(el, "fmt"), q: +q.value / 100 });
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      ctx.status(`Đang chuyển ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      ctx.progress(items.length > 1 ? i / items.length : -1);
      let bmp;
      try { bmp = await toBitmap(it.file); }
      catch (e) { console.error(e); const err = new Error(`Không đọc được ${it.name}. File có thể không phải HEIC hợp lệ.`); err.userMsg = err.message; throw err; }
      const c = canvas(bmp.width, bmp.height);
      const g = c.getContext("2d");
      if (o.type === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(bmp, 0, 0);
      if (bmp.close) bmp.close();
      const blob = await encode(c, o.type, o.q, { fast: true });
      outs.push({ blob, name: baseName(it.name) + (o.type === "image/png" ? ".png" : ".jpg"), note: `${c.width}×${c.height}` });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "anh-jpg",
  doneTitle: (outs) => `Đã chuyển ${outs.length} ảnh!`
});
