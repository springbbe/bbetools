/* PDF đen trắng: viết lại lệnh màu trong nội dung trang (chữ vẫn là chữ, chọn được), chuyển ảnh, bảng màu, dải chuyển màu sang thang xám */
import { h, lib, baseName, sampleFiles, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, pdfBlob, LOCKED_MSG } from "../pdf.js";
import { N, walk, decode, filters, colorSpace, csResolver, imagePixels, replaceStream, bytesToLatin1, latin1ToBytes } from "../pdf-objects.js";
import { grayContent, toGray } from "../lib/pdf-content.js";
import { luma } from "../lib/pdf-image.js";

const deflate = async (u) => new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());

// ảnh → thang xám. Trả về true nếu đã đổi
async function grayImage(L, ctx, ref, s, q) {
  const d = s.dict, get = (k) => d.lookup(N(L, k));
  if (get("ImageMask")) return true; // ảnh mặt nạ lấy màu tô hiện hành (đã là xám)
  const cs = colorSpace(L, ctx, d.get(N(L, "ColorSpace")));
  if (cs.model === "gray") return true;
  const fl = filters(L, d);
  // ảnh có bảng màu: chỉ cần đổi bảng màu, giữ nguyên dữ liệu
  if (cs.model === "indexed" && cs.palette && cs.base !== "other") {
    const pn = cs.base === "gray" ? 1 : cs.base === "cmyk" ? 4 : 3, n = cs.hival + 1, pal = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const v = []; for (let c = 0; c < pn; c++) v.push((cs.palette[i * pn + c] || 0) / 255); pal[i] = Math.round(toGray(cs.base, v) * 255); }
    d.set(N(L, "ColorSpace"), ctx.obj([N(L, "Indexed"), N(L, "DeviceGray"), cs.hival, L.PDFHexString.of([...pal].map((x) => x.toString(16).padStart(2, "0")).join(""))]));
    return true;
  }
  const w = get("Width").asNumber(), hh = get("Height").asNumber();
  if (fl.length === 1 && fl[0] === "DCTDecode") {
    // JPEG: giải mã bằng trình duyệt, đổi xám, nén JPEG lại
    let bmp;
    try { bmp = await createImageBitmap(new Blob([s.contents], { type: "image/jpeg" })); } catch (_) { return false; }
    const c = document.createElement("canvas"); c.width = w; c.height = hh;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.filter = "grayscale(1)"; g.drawImage(bmp, 0, 0, w, hh); bmp.close();
    const jpg = new Uint8Array(await (await new Promise((r) => c.toBlob(r, "image/jpeg", q))).arrayBuffer());
    const ns = ctx.stream(jpg, { Type: "XObject", Subtype: "Image", Width: w, Height: hh, ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "DCTDecode" });
    const sm = d.get(N(L, "SMask")); if (sm) ns.dict.set(N(L, "SMask"), sm);
    ctx.assign(ref, ns);
    return true;
  }
  const px = imagePixels(L, ctx, s);
  if (!px) return false;
  const gray = new Uint8Array(w * hh);
  for (let i = 0; i < gray.length; i++) gray[i] = Math.round(luma(px.rgba[i * 4], px.rgba[i * 4 + 1], px.rgba[i * 4 + 2]));
  const ns = ctx.stream(await deflate(gray), { Type: "XObject", Subtype: "Image", Width: w, Height: hh, ColorSpace: "DeviceGray", BitsPerComponent: 8, Filter: "FlateDecode" });
  for (const k of ["SMask", "Interpolate", "Intent"]) { const v = d.get(N(L, k)); if (v) ns.dict.set(N(L, k), v); }
  ctx.assign(ref, ns);
  return true;
}

// dải chuyển màu dạng hàm mũ (Function type 2) hoặc ghép (type 3 gồm các hàm type 2) → xám
function grayShading(L, ctx, dict) {
  const cs = colorSpace(L, ctx, dict.get(N(L, "ColorSpace")));
  if (cs.model === "gray") return true;
  if (!/rgb|cmyk|lab/.test(cs.model)) return false;
  const fnOk = (f) => {
    f = ctx.lookup(f);
    const fd = f instanceof L.PDFStream ? f.dict : f;
    if (!(fd instanceof L.PDFDict)) return false;
    const t = fd.lookup(N(L, "FunctionType")).asNumber();
    if (t === 2) {
      const conv = (k, def) => { const a = fd.lookup(N(L, k)); const v = a ? a.asArray().map((x) => ctx.lookup(x).asNumber()) : def; fd.set(N(L, k), ctx.obj([toGray(cs.model, v)])); };
      conv("C0", cs.model === "cmyk" ? [0, 0, 0, 0] : [0, 0, 0]); conv("C1", cs.model === "cmyk" ? [0, 0, 0, 1] : [1, 1, 1]);
      fd.delete(N(L, "Range"));
      return true;
    }
    if (t === 3) return fd.lookup(N(L, "Functions")).asArray().every(fnOk);
    return false;
  };
  const fn = dict.get(N(L, "Function"));
  if (!fn || fn instanceof L.PDFArray || !fnOk(fn)) return false;
  dict.set(N(L, "ColorSpace"), N(L, "DeviceGray"));
  return true;
}

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Chuyển đen trắng",
  sample: () => sampleFiles("bao-cao-quy-1.pdf", "tai-lieu-co-anh.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => openItem(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx),
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "PDF đen trắng (thang xám)" }),
      h("p", { class: "hint", text: "Chữ, hình vẽ và ảnh được chuyển sang thang xám ngay trong file: chữ vẫn sắc nét và chọn, tìm được. Hợp để in tiết kiệm mực màu." }),
      h("p", { class: "hint", text: "Ảnh JPEG được nén lại ở chất lượng cao; ảnh JPEG 2000 và vài kiểu chuyển màu đặc biệt (hiếm gặp) có thể giữ nguyên màu." })));
  },
  ready: (items) => (items.some((i) => i.locked) ? LOCKED_MSG : true),
  async run(items, o, ctx) {
    const L = await lib("pdflib");
    const outs = [];
    let left = 0;
    for (let f = 0; f < items.length; f++) {
      const it = items[f], doc = await libDoc(it.bytes, it.password), dctx = doc.context;
      const jobs = [];
      walk(L, doc, (x) => jobs.push(x));
      for (let i = 0; i < jobs.length; i++) {
        ctx.check();
        const x = jobs[i];
        if (i % 10 === 0) { ctx.status(`Đang chuyển ${it.name}: trang ${x.index + 1}/${doc.getPageCount()}…`); ctx.progress((f + i / jobs.length) / items.length); await nextFrame(); }
        try {
          if (x.kind === "page") {
            // gộp mọi luồng nội dung của trang thành một (lệnh có thể bị cắt ngang giữa hai luồng)
            const c = x.page.node.Contents();
            if (!c) continue;
            const parts = c instanceof L.PDFArray ? c.asArray().map((r) => dctx.lookup(r)) : [c];
            const src = parts.map((s) => bytesToLatin1(decode(L, s))).join("\n");
            const r = grayContent(src, csResolver(L, dctx, x.resources));
            if (r.changed) x.page.node.set(N(L, "Contents"), dctx.register(dctx.flateStream(latin1ToBytes(r.text))));
          } else if (x.kind === "form") {
            const r = grayContent(bytesToLatin1(decode(L, x.stream)), csResolver(L, dctx, x.resources));
            if (r.changed) replaceStream(L, dctx, x.ref, x.stream, latin1ToBytes(r.text));
          } else if (x.kind === "image") { if (!(await grayImage(L, dctx, x.ref, x.stream, 0.9))) left++; }
          else if (x.kind === "shading") { if (!grayShading(L, dctx, x.dict)) left++; }
        } catch (e) { console.warn("Bỏ qua một thành phần không đọc được", e); left++; }
      }
      outs.push({ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + "-den-trang.pdf", note: doc.getPageCount() + " trang", before: it.size });
      ctx.progress((f + 1) / items.length);
    }
    outs.left = left;
    return outs;
  },
  zipName: "pdf-den-trang",
  doneTitle: (outs) => (outs.length > 1 ? `Đã chuyển ${outs.length} file sang đen trắng!` : "Đã chuyển PDF sang đen trắng!"),
  summary: (outs) => (outs.left ? `Có ${outs.left} thành phần đặc biệt chưa chuyển được nên có thể còn màu.` : null)
});
