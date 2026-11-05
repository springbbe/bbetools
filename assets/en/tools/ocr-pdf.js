/* Tự sinh bởi scripts/build.js từ assets/tools/ocr-pdf.js và i18n/en/js/ — đừng sửa tay. */
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
    throw Object.assign(new Error("locked"), { userMsg: `Couldn't open ${it.name}: the file is password-protected and needs the correct password.` });
  }
  Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages });
  it.thumb = await thumbnail(r.doc, 1, 56);
  // đếm trang đã có chữ (PDF tạo từ Word…) để báo trước
  let withText = 0;
  for (let n = 1; n <= r.pages; n++) if (await hasText(r.doc, n)) withText++;
  it.textPages = withText;
  it.info = `${r.pages} trang` + (withText === r.pages ? " · already has text, no OCR needed" : withText ? ` · ${withText} ${(withText) == 1 ? "page has" : "pages have"} text` : " · scanned");
}
async function hasText(doc, n) {
  const tc = await (await doc.getPage(n)).getTextContent();
  return tc.items.reduce((s, x) => s + (x.str || "").replace(/\s/g, "").length, 0) >= 20;
}

fileTool({
  accept: ["pdf"], multiple: false, noun: "file PDF",
  action: "Recognize and create PDF",
  sample: () => sampleFiles("tai-lieu-scan.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib"), lib("tesseract")]),
  load,
  dispose: (it) => { if (it.doc) it.doc.destroy(); },
  options(el) {
    el.append(
      seg("lang", [["vie", "Vietnamese"], ["eng", "English"]], LANG === "vi" ? "vie" : "eng", "Document language"),
      seg("skip", [["yes", "Skip"], ["no", "Recognize again"]], "yes", "Pages that already have text"),
      h("p", { class: "hint", text: "The first time, the recognizer needs to download (about 5 MB, cached for next time). Each page takes a few seconds; keep the tab open for long files. Pages look exactly the same, only an invisible text layer is added." }));
    return () => ({ lang: radioVal(el, "lang"), skip: radioVal(el, "skip") === "yes" });
  },
  ready: (items, o) => (items[0] && o.skip && items[0].textPages === items[0].pages ? "Every page already has text (it's already searchable). Choose “Recognize again” if you still want to." : true),
  async run(items, o, ctx) {
    const it = items[0];
    ctx.progress(-1);
    ctx.status("Loading the text recognizer (first time only)…");
    let label = "", base = 0;
    const N = it.pages;
    const onLog = (m) => {
      if (m.status === "recognizing text") { ctx.status(`${label} ${Math.round(m.progress * 100)}%`); ctx.progress((base + m.progress) / N); }
      else if (/loading|initializ/.test(m.status) && m.progress < 1) ctx.status(`Loading the text recognizer… ${Math.round((m.progress || 0) * 100)}%`);
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
        const left = done ? ` · about ${fmtNum(Math.ceil((((performance.now() - t0) / done) * (N - n + 1)) / 1000))} s left` : "";
        label = `Reading page ${n}/${N}${left}…`;
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
      ctx.status("Saving file…");
      out.setProducer("BbeTools"); out.setCreator("BbeTools – Searchable PDF (OCR)");
      const blob = pdfBlob(await out.save({ useObjectStreams: true }));
      const txt = texts.map((t, i) => (t.trim() ? (N > 1 ? `--- Page ${i + 1} ---
` : "") + t.trim() : "")).filter(Boolean).join("\n\n");
      const outs = [{ blob, name: baseName(it.name) + "-searchable.pdf", note: `${fmtNum(words)} ${(fmtNum(words)) == 1 ? "word" : "words"} recognized` }];
      if (txt) outs.push({ blob: new Blob([txt], { type: "text/plain;charset=utf-8" }), name: baseName(it.name) + ".txt", note: "recognized text" });
      outs.summaryText = `Recognized ${done} ${(done) == 1 ? "page" : "pages"}` + (skipped ? `, skipped ${skipped} ${(skipped) == 1 ? "page" : "pages"} with text` : "") +
        (done ? ` · average confidence ${Math.round(conf / done)}%` : "") + ` · ${fmtNum((performance.now() - t0) / 1000, 1)} s. Open the file and try Ctrl/⌘ + F to search.`;
      return outs;
    } finally { ctx.signal.removeEventListener("abort", abort); }
  },
  summary: (outs) => outs.summaryText || null,
  zipName: "pdf-tim-kiem-duoc",
  doneTitle: () => "Your PDF is searchable!"
});
