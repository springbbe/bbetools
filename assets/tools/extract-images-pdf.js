/* Trích ảnh trong PDF: lấy ảnh JPEG nguyên bản (không nén lại), ảnh khác xuất PNG giữ nền trong suốt; bỏ qua ảnh trùng và ảnh quá nhỏ */
import { h, lib, baseName, sampleFiles, nextFrame, fmtNum } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, LOCKED_MSG } from "../pdf.js";
import { walk, filters, imagePixels } from "../pdf-objects.js";

const toPng = (px) => {
  const c = document.createElement("canvas"); c.width = px.width; c.height = px.height;
  c.getContext("2d").putImageData(new ImageData(px.rgba, px.width, px.height), 0, 0);
  return new Promise((res) => c.toBlob(res, "image/png"));
};

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Trích ảnh",
  sample: () => sampleFiles("tai-lieu-co-anh.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => openItem(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx),
  options(el) {
    const min = h("select", { class: "select", id: "min" }, [["0", "Lấy tất cả"], ["50", "Bỏ ảnh nhỏ hơn 50 px"], ["150", "Bỏ ảnh nhỏ hơn 150 px (biểu tượng, đường kẻ)"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === "50" })));
    el.append(h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Kích thước tối thiểu" }), min)),
      h("p", { class: "hint", text: "Ảnh JPEG được lấy nguyên bản, không nén lại. Ảnh khác lưu PNG, giữ nền trong suốt. Ảnh dùng lặp lại nhiều lần chỉ lấy một lần." }),
      h("p", { class: "hint", text: "Chữ và hình vẽ vector không phải ảnh nên không được lấy; muốn chụp cả trang hãy dùng PDF sang ảnh." }));
    return () => ({ min: +min.value });
  },
  ready: (items) => (items.some((i) => i.locked) ? LOCKED_MSG : true),
  async run(items, o, ctx) {
    const L = await lib("pdflib");
    const outs = [];
    let skipped = 0, small = 0;
    for (let f = 0; f < items.length; f++) {
      const it = items[f], doc = await libDoc(it.bytes, it.password), base = baseName(it.name);
      const imgs = [];
      walk(L, doc, (x) => { if (x.kind === "image") imgs.push(x); });
      const perPage = {};
      for (let i = 0; i < imgs.length; i++) {
        ctx.check();
        ctx.status(`Đang lấy ảnh ${i + 1}/${imgs.length}${items.length > 1 ? " của " + it.name : ""}…`);
        const { stream, index } = imgs[i], d = stream.dict;
        const w = d.lookup(L.PDFName.of("Width")).asNumber(), hh = d.lookup(L.PDFName.of("Height")).asNumber();
        if (Math.min(w, hh) < o.min) { small++; continue; }
        const fl = filters(L, d), n = (perPage[index] = (perPage[index] || 0) + 1);
        const name = `${base}-trang-${index + 1}-anh-${n}`;
        let blob = null, ext = "png";
        if (fl.length === 1 && fl[0] === "DCTDecode" && stream instanceof L.PDFRawStream) { blob = new Blob([stream.contents], { type: "image/jpeg" }); ext = "jpg"; }
        else if (fl.length === 1 && fl[0] === "JPXDecode" && stream instanceof L.PDFRawStream) { blob = new Blob([stream.contents], { type: "image/jp2" }); ext = "jp2"; }
        else {
          const px = imagePixels(L, doc.context, stream);
          if (px) blob = await toPng(px);
        }
        if (!blob) { skipped++; continue; }
        outs.push({ blob, name: `${name}.${ext}`, note: `${fmtNum(w)}×${fmtNum(hh)} px · trang ${index + 1}` });
        ctx.progress((f + (i + 1) / imgs.length) / items.length);
        if (i % 4 === 3) await nextFrame();
      }
    }
    if (!outs.length) {
      ctx.status(small ? `Không có ảnh đủ lớn (đã bỏ ${small} ảnh nhỏ). Chọn “Lấy tất cả” để lấy cả ảnh nhỏ.` : "Không tìm thấy ảnh nào trong file: có thể nội dung toàn là chữ và hình vẽ vector.", "err");
      return null;
    }
    outs.info = { skipped, small };
    return outs;
  },
  zipName: "anh-trong-pdf",
  doneTitle: (outs) => `Đã lấy ${outs.length} ảnh!`,
  summary: (outs) => [outs.info.small ? `Đã bỏ ${outs.info.small} ảnh nhỏ.` : "", outs.info.skipped ? `${outs.info.skipped} ảnh dùng định dạng đặc biệt (CCITT, JBIG2…) chưa lấy được.` : ""].filter(Boolean).join(" ") || null
});
