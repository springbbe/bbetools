/* PDF sang ảnh: vẽ các trang đã chọn thành ảnh JPG hoặc PNG ở độ nét tuỳ chọn (DPI) */
import { h, baseName, sampleFiles, copyImage, nextFrame, fmtNum } from "../core.js";
import { seg, radioVal } from "../frames/file.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { renderPage } from "../pdf.js";
import { setJpegDpi } from "../image.js";

const MAX_PIXELS = 40e6; // giới hạn mỗi ảnh để điện thoại không hết bộ nhớ
const DPIS = [["96", "96"], ["150", "150"], ["220", "220"], ["300", "300"]];
const DPI_HINT = { 96: "Nhẹ, xem trên điện thoại, gửi Zalo.", 150: "Khuyên dùng: rõ nét khi xem trên máy tính.", 220: "Nét cao, phóng to vẫn rõ chữ nhỏ.", 300: "Chất lượng in ấn, file khá nặng." };
let field = null;
const selCount = (B) => B.pages.filter((p) => p.sel).length;
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Không tạo được ảnh, trang có thể quá lớn."))), type, q));

pageTool({
  action: "Chuyển sang ảnh",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "sel", rangeProp: "sel", rotate: true,
  clickLabel: "Bấm để chọn hoặc bỏ chọn trang",
  initPage(p) { p.sel = true; },
  click(p) { p.sel = !p.sel; },
  tools: (B) => [
    h("button", { class: "btn ghost sm", type: "button", text: "Chọn hết", onclick: () => { B.pages.forEach((p) => { p.sel = true; }); B.changed(false); } }),
    h("button", { class: "btn ghost sm", type: "button", text: "Bỏ chọn", onclick: () => { B.pages.forEach((p) => { p.sel = false; }); B.changed(false); } })],
  options(el, ctx, B) {
    field = B.rangeField("sel", "Trang cần chuyển", "VD: 1-3, 5", "Mặc định lấy mọi trang. Bấm vào trang để bỏ chọn hoặc chọn lại.");
    el.append(
      seg("fmt", [["jpg", "JPG"], ["png", "PNG"]], "jpg", "Định dạng ảnh"),
      h("p", { class: "hint", id: "fmt-hint" }),
      seg("dpi", DPIS, "150", "Độ nét (DPI)"),
      h("p", { class: "hint", id: "dpi-hint" }),
      h("div", { class: "opt-group" }, field.el));
    return () => ({ fmt: radioVal(el, "fmt"), dpi: +radioVal(el, "dpi") });
  },
  onChange(B, ctx) {
    const o = ctx.opts, el = ctx.optsEl;
    el.querySelector("#fmt-hint").textContent = o.fmt === "png" ? "Nét nhất, chữ không bị nhoè, file nặng hơn." : "Nhẹ, hợp để gửi và xem.";
    el.querySelector("#dpi-hint").textContent = DPI_HINT[o.dpi];
    if (field) field.sync();
  },
  summary(B, o) {
    const n = selCount(B);
    if (!n) return "Chưa chọn trang nào.";
    const p = B.pages.find((x) => x.sel), k = o.dpi / 72;
    const [w, hh] = p.rot % 180 ? [p.h, p.w] : [p.w, p.h];
    return `Sẽ tạo <b>${n}</b> ảnh ${o.fmt.toUpperCase()}${n > 1 ? " (tải từng ảnh hoặc cả .zip)" : ""}. Trang đầu: ${fmtNum(Math.round(w * k))}×${fmtNum(Math.round(hh * k))} px.`;
  },
  ready: (B) => (selCount(B) ? true : "Chọn ít nhất một trang."),
  async run(B, o, ctx) {
    const mime = o.fmt === "png" ? "image/png" : "image/jpeg";
    const list = B.pages.map((p, i) => [p, i + 1]).filter(([p]) => p.sel);
    const base = baseName(firstItem(B).name), outs = [];
    let capped = false;
    for (let i = 0; i < list.length; i++) {
      ctx.check();
      const [p] = list[i];
      ctx.status(`Đang chuyển trang ${p.n} (${i + 1}/${list.length})…`);
      const c = await renderPage(p.it.doc, p.n, { scale: o.dpi / 72, maxPixels: MAX_PIXELS, rotation: p.rot });
      const dpi = Math.round(72 * c.width / (p.rot % 180 ? p.h : p.w));
      if (dpi < o.dpi - 1) capped = true;
      let blob = await toBlob(c, mime, 0.9);
      if (mime === "image/jpeg") blob = await setJpegDpi(blob, dpi);
      outs.push({ blob, name: `${base}-trang-${p.n}.${o.fmt}`, note: `${fmtNum(c.width)}×${fmtNum(c.height)} px`, actions: [{ icon: "copy", label: "Sao chép ảnh", run: (out) => copyImage(out.blob) }] });
      c.width = c.height = 0;
      ctx.progress((i + 1) / list.length);
      await nextFrame();
    }
    if (capped) outs[0].capped = true;
    return outs;
  },
  zipName: "pdf-sang-anh",
  doneTitle: (outs) => (outs.length > 1 ? `Đã chuyển ${outs.length} trang sang ảnh!` : "Đã chuyển sang ảnh!"),
  resultSummary: (outs) => (outs[0] && outs[0].capped ? "Có trang rất lớn nên ảnh được giảm độ nét để máy không hết bộ nhớ." : null)
});
