/* PDF scan thành PDF tìm kiếm được: vẽ từng trang bằng pdf.js → Tesseract nhận dạng chữ kèm toạ độ từng từ →
   chèn lớp chữ ẩn (chế độ vẽ chữ 3: không tô, không viền) đúng vị trí lên chính trang gốc bằng pdf-lib.
   Hình trang giữ nguyên; chữ ẩn dùng font Be Vietnam Pro nhúng trong file nên tìm, bôi đen, sao chép được cả chữ có dấu. */
import { h, lib, baseName, sampleFiles, fmtNum, LANG, nextFrame } from "../core.js";
import { fileTool, seg, radioVal, Cancelled } from "../frames/file.js";
import { openPdf, renderPage, thumbnail, libDoc, pdfBlob, embedVnFont, Locked } from "../pdf.js";
import { geom } from "../lib/pdf-geom.js";
import { placeWords, squeeze, linesOf } from "../lib/ocr-pdf.js";
import { getWorker, stopWorker } from "../tesseract.js";

const LONG_SIDE = 2800, MAX_PIXELS = 9e6; // ~300 dpi với trang A4

async function load(it) {
  let r;
  try { r = await openPdf(it.file, { prompt: true }); }
  catch (e) {
    if (!(e instanceof Locked)) throw e;
    throw Object.assign(new Error("locked"), { userMsg: `Chưa mở được ${it.name}: file có mật khẩu, cần nhập đúng mật khẩu.` });
  }
  Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages });
  it.thumb = await thumbnail(r.doc, 1, 56);
  // đếm trang đã có chữ (PDF tạo từ Word…) để báo trước
  let withText = 0;
  for (let n = 1; n <= r.pages; n++) if (await hasText(r.doc, n)) withText++;
  it.textPages = withText;
  it.info = `${r.pages} trang` + (withText === r.pages ? " · đã có chữ, không cần nhận dạng" : withText ? ` · ${withText} trang đã có chữ` : " · bản scan");
}
async function hasText(doc, n) {
  const tc = await (await doc.getPage(n)).getTextContent();
  return tc.items.reduce((s, x) => s + (x.str || "").replace(/\s/g, "").length, 0) >= 20;
}

fileTool({
  accept: ["pdf"], multiple: false, noun: "file PDF",
  action: "Nhận dạng và tạo PDF",
  sample: () => sampleFiles("tai-lieu-scan.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib"), lib("tesseract")]),
  load,
  dispose: (it) => { if (it.doc) it.doc.destroy(); },
  options(el) {
    el.append(
      seg("lang", [["vie", "Tiếng Việt"], ["eng", "Tiếng Anh"]], LANG === "vi" ? "vie" : "eng", "Ngôn ngữ trong tài liệu"),
      seg("skip", [["yes", "Bỏ qua"], ["no", "Nhận dạng lại"]], "yes", "Trang đã có chữ"),
      h("p", { class: "hint", text: "Lần đầu cần tải bộ nhận dạng (khoảng 5 MB, lưu lại cho lần sau). Mỗi trang mất vài giây; file nhiều trang hãy để tab mở cho tới khi xong. Hình trang giữ nguyên, chỉ thêm lớp chữ ẩn." }));
    return () => ({ lang: radioVal(el, "lang"), skip: radioVal(el, "skip") === "yes" });
  },
  ready: (items, o) => (items[0] && o.skip && items[0].textPages === items[0].pages ? "Mọi trang đã có chữ (tìm kiếm được rồi). Chọn “Nhận dạng lại” nếu vẫn muốn làm." : true),
  async run(items, o, ctx) {
    const it = items[0];
    ctx.progress(-1);
    ctx.status("Đang tải bộ nhận dạng chữ (chỉ lần đầu)…");
    let label = "", base = 0;
    const N = it.pages;
    const onLog = (m) => {
      if (m.status === "recognizing text") { ctx.status(`${label} ${Math.round(m.progress * 100)}%`); ctx.progress((base + m.progress) / N); }
      else if (/loading|initializ/.test(m.status) && m.progress < 1) ctx.status(`Đang tải bộ nhận dạng chữ… ${Math.round((m.progress || 0) * 100)}%`);
    };
    // Huỷ: dừng ngay worker đang nhận dạng (không phải chờ hết trang)
    let stop;
    const aborted = new Promise((_, rej) => { stop = () => rej(new Cancelled()); });
    aborted.catch(() => {});
    const abort = () => { stopWorker(o.lang); stop(); };
    ctx.signal.addEventListener("abort", abort, { once: true });
    try {
      const worker = await Promise.race([getWorker(o.lang, onLog), aborted]);
      const L = await lib("pdflib");
      const out = await libDoc(it.bytes, it.password);
      const font = await embedVnFont(out);
      let done = 0, skipped = 0, words = 0, conf = 0;
      const texts = [];
      const t0 = performance.now();
      for (let n = 1; n <= N; n++) {
        ctx.check();
        base = n - 1;
        if (o.skip && (await hasText(it.doc, n))) { skipped++; texts.push(""); continue; }
        const left = done ? ` · còn khoảng ${fmtNum(Math.ceil((((performance.now() - t0) / done) * (N - n + 1)) / 1000))} giây` : "";
        label = `Đang đọc trang ${n}/${N}${left}…`;
        ctx.status(label);
        const pv = (await it.doc.getPage(n)).getViewport({ scale: 1 });
        const c = await renderPage(it.doc, n, { scale: LONG_SIDE / Math.max(pv.width, pv.height), maxPixels: MAX_PIXELS });
        const { data } = await Promise.race([worker.recognize(c, {}, { text: true, blocks: true }), aborted]);
        ctx.check();
        const page = out.getPage(n - 1);
        const g = geom(page.getCropBox(), page.getRotation().angle);
        const placed = placeWords(linesOf(data), c.width, c.height, g);
        c.width = c.height = 0;
        if (placed.length) {
          const key = page.node.newFontDictionary("BbeOcr", font.ref);
          const ops = [L.pushGraphicsState(), L.beginText(), L.setTextRenderingMode(L.TextRenderingMode.Invisible)];
          for (const w of placed) {
            const a = (w.angle * Math.PI) / 180;
            ops.push(L.setFontAndSize(key, w.size), L.setCharacterSqueeze(squeeze(w.width, font.widthOfTextAtSize(w.text, w.size))),
              L.setTextMatrix(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), w.x, w.y), L.showText(font.encodeText(w.text + " ")));
          }
          ops.push(L.endText(), L.popGraphicsState());
          page.pushOperators(...ops);
        }
        words += placed.length; conf += data.confidence || 0; done++;
        texts.push(data.text || "");
        ctx.progress(n / N);
        await nextFrame();
      }
      ctx.status("Đang lưu file…");
      out.setProducer("BbeTools"); out.setCreator("BbeTools – PDF scan thành PDF tìm kiếm được");
      const blob = pdfBlob(await out.save({ useObjectStreams: true }));
      const txt = texts.map((t, i) => (t.trim() ? (N > 1 ? `--- Trang ${i + 1} ---\n` : "") + t.trim() : "")).filter(Boolean).join("\n\n");
      const outs = [{ blob, name: baseName(it.name) + "-tim-kiem-duoc.pdf", note: `${fmtNum(words)} từ nhận dạng` }];
      if (txt) outs.push({ blob: new Blob([txt], { type: "text/plain;charset=utf-8" }), name: baseName(it.name) + ".txt", note: "chữ nhận dạng được" });
      outs.summaryText = `Đã nhận dạng ${done} trang` + (skipped ? `, bỏ qua ${skipped} trang đã có chữ` : "") +
        (done ? ` · độ tin cậy trung bình ${Math.round(conf / done)}%` : "") + ` · ${fmtNum((performance.now() - t0) / 1000, 1)} giây. Mở file và thử Ctrl/⌘ + F để tìm chữ.`;
      return outs;
    } finally { ctx.signal.removeEventListener("abort", abort); }
  },
  summary: (outs) => outs.summaryText || null,
  zipName: "pdf-tim-kiem-duoc",
  doneTitle: () => "PDF đã tìm kiếm được!"
});
