/* Đổi định dạng ảnh: JPG, PNG, WebP, AVIF (từ JPG, PNG, WebP, AVIF, GIF, BMP, ICO, HEIC); hàng loạt.
   AVIF mã hoá bằng libavif (WebAssembly, @jsquash/avif) khi trình duyệt không tự xuất được. */
import { h, lib, baseName, sampleFiles, fmtSize } from "../core.js";
import { fileTool, seg, radioVal, deltaText } from "../frames/file.js";
import { decodeImage, canvas, encode, EXT, FMT_LABEL, typeOfFile, thumbUrl } from "../image.js";

const HINT = {
  "image/jpeg": "Mở được ở mọi nơi, nhẹ, hợp với ảnh chụp. Không có nền trong suốt: vùng trong suốt sẽ được tô màu nền bên dưới.",
  "image/png": "Giữ nguyên từng điểm ảnh và nền trong suốt; hợp với ảnh chụp màn hình, logo. Ảnh chụp thật sẽ nặng hơn nhiều.",
  "image/webp": "Nhẹ hơn JPG khoảng 25–35%, có nền trong suốt; mọi trình duyệt hiện nay đều mở được.",
  "image/avif": "Nhẹ nhất (thường chỉ bằng một nửa JPG), có nền trong suốt. Mã hoá chậm hơn (vài giây mỗi ảnh); một số phần mềm cũ chưa mở được."
};

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "ảnh",
  action: "Chuyển đổi",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png"),
  async load(it) {
    const bmp = await decodeImage(it.file);
    it.w = bmp.width; it.h = bmp.height;
    it.thumb = await thumbUrl(bmp, 112);
    if (bmp.close) bmp.close();
    const src = typeOfFile(it.file);
    it.info = `${(src && FMT_LABEL[src]) || (/\.(\w+)$/.exec(it.name) || ["", "ảnh"])[1].toUpperCase()} · ${it.w}×${it.h}`;
  },
  options(el) {
    const q = h("input", { type: "range", min: 30, max: 100, value: 85, id: "q", "aria-label": "Chất lượng" });
    const qv = h("output", { for: "q", text: "85" });
    const bg = h("input", { type: "color", id: "bg", value: "#ffffff", "aria-label": "Màu nền thay cho vùng trong suốt" });
    el.append(
      seg("to", Object.entries(FMT_LABEL).map(([v, l]) => [v, l]), "image/webp", "Chuyển sang"),
      h("p", { class: "hint", id: "to-hint" }),
      h("div", { class: "opt-group", id: "qg" }, h("p", { class: "opt-title", text: "Chất lượng" }), h("div", { class: "range-row" }, q, qv),
        h("p", { class: "hint", text: "80–90 khó thấy khác biệt bằng mắt thường. 100 gần như không mất chi tiết nhưng nặng." })),
      h("div", { class: "opt-group", id: "bgg" }, h("label", { class: "field cv-bg" }, h("span", { text: "Màu nền (cho vùng trong suốt)" }), bg)));
    const upd = () => {
      const to = radioVal(el, "to");
      qv.textContent = q.value;
      el.querySelector("#to-hint").textContent = HINT[to];
      el.querySelector("#qg").hidden = to === "image/png";
      el.querySelector("#bgg").hidden = to !== "image/jpeg";
    };
    el.addEventListener("input", upd); upd();
    return () => ({ to: radioVal(el, "to"), q: +q.value / 100, bg: bg.value });
  },
  ready(items, o) {
    if (items.every((it) => typeOfFile(it.file) === o.to)) return `Các ảnh đã là ${FMT_LABEL[o.to]}. Hãy chọn định dạng khác.`;
    return true;
  },
  async run(items, o, ctx) {
    const outs = [];
    if (o.to === "image/avif") { ctx.status("Đang tải bộ mã hoá AVIF (khoảng 3,5 MB, chỉ lần đầu)…"); ctx.progress(-1); await lib("avif"); }
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      ctx.status(`Đang chuyển ${it.name} sang ${FMT_LABEL[o.to]}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      if (items.length === 1) ctx.progress(-1);
      const bmp = await decodeImage(it.file);
      const c = canvas(bmp.width, bmp.height), g = c.getContext("2d");
      if (o.to === "image/jpeg") { g.fillStyle = o.bg; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(bmp, 0, 0);
      if (bmp.close) bmp.close();
      const blob = await encode(c, o.to, o.q);
      c.width = c.height = 0;
      outs.push({ blob, name: `${baseName(it.name)}.${EXT[o.to]}`, before: it.size, note: `${deltaText(it.size, blob.size)} · ${it.w}×${it.h}` });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "anh-doi-dinh-dang",
  doneTitle: (outs) => `Đã chuyển ${outs.length} ảnh sang ${(outs[0].name.split(".").pop() || "").toUpperCase()}!`,
  summary(outs) {
    const b = outs.reduce((s, o) => s + o.before, 0), a = outs.reduce((s, o) => s + o.blob.size, 0);
    return outs.length > 1 ? `Tổng dung lượng: ${fmtSize(b)} → ${fmtSize(a)}` : null;
  }
});

const css = document.createElement("style");
css.textContent = ".cv-bg{flex-direction:row;align-items:center;justify-content:space-between}.cv-bg input[type=color]{width:48px;height:36px;border:1px solid var(--line);border-radius:8px;padding:2px;background:var(--surface)}";
document.head.append(css);
