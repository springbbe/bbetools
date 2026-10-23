/* Tự sinh bởi scripts/build.js từ assets/tools/ocr.js và i18n/en/js/ — đừng sửa tay. */
/* Ảnh sang chữ (OCR): Tesseract (WebAssembly, tesseract.js) chạy trên máy với dữ liệu tiếng Việt/tiếng Anh tải từ jsDelivr.
   Nhận ảnh chụp, ảnh scan, HEIC và PDF (vẽ từng trang rồi nhận dạng). Kết quả: ô văn bản sao chép được + file .txt. */
import { h, icon, lib, copyText, baseName, sampleFiles, fmtNum, LANG } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, thumbUrl } from "../image.js";
import { openPdf, renderPage, thumbnail } from "../pdf.js";
import { tidy, joinLines } from "../lib/ocr-text.js";

const JSD = "https://cdn.jsdelivr.net/npm/";
const TESS = {
  workerPath: JSD + "tesseract.js@7.0.0/dist/worker.min.js",
  corePath: JSD + "tesseract.js-core@7.0.0",
  lang: { vie: JSD + "@tesseract.js-data/vie@1.0.0/4.0.0_best_int", eng: JSD + "@tesseract.js-data/eng@1.0.0/4.0.0_best_int" }
};
const MAX_PAGES = 30;
const workers = {};

async function getWorker(lang, onLog) {
  if (!workers[lang]) workers[lang] = (async () => {
    const T = await lib("tesseract");
    return T.createWorker(lang, 1, { workerPath: TESS.workerPath, corePath: TESS.corePath, langPath: TESS.lang[lang], logger: (m) => workers.log && workers.log(m) });
  })().catch((e) => { delete workers[lang]; console.error(e); throw Object.assign(new Error("ocr"), { userMsg: "Couldn't load the text recognizer. Check your internet connection and try again." }); });
  workers.log = onLog;
  return workers[lang];
}

// ảnh nhỏ: phóng to cho chữ đủ lớn (Tesseract đọc tốt nhất khi chữ cao ~30 px)
function prepare(src) {
  const long = Math.max(src.width, src.height);
  const k = long < 1600 ? Math.min(2.5, 2000 / long) : long > 4000 ? 4000 / long : 1;
  return k === 1 ? src : drawScaled(src, src.width * k, src.height * k, "#ffffff");
}

fileTool({
  accept: ["image", "heic", "pdf"], multiple: true, noun: "images or PDFs",
  action: "Recognize text",
  sample: () => sampleFiles("van-ban-chup.jpg"),
  warm: () => lib("tesseract"),
  async load(it) {
    if (/pdf$/i.test(it.file.type) || /\.pdf$/i.test(it.name)) {
      const r = await openPdf(it.file, { prompt: true });
      it.doc = r.doc; it.pages = r.pages;
      it.thumb = await thumbnail(r.doc, 1, 112);
      it.info = `${r.pages} ${(r.pages) == 1 ? "page" : "pages"}` + (r.pages > MAX_PAGES ? ` · only the first ${MAX_PAGES} pages are read` : "");
    } else {
      const bmp = await decodeImage(it.file);
      it.info = `${bmp.width}×${bmp.height}`;
      it.thumb = await thumbUrl(bmp, 112);
      if (bmp.close) bmp.close();
    }
  },
  options(el) {
    el.append(
      seg("lang", [["vie", "Vietnamese"], ["eng", "English"]], LANG === "vi" ? "vie" : "eng", "Language in the image"),
      seg("layout", [["join", "Join into paragraphs"], ["keep", "Keep each line"]], "join", "Line breaks"),
      h("p", { class: "hint", text: "The first time, the recognizer needs to download (about 5 MB, cached for next time). Straight, sharp, well-lit photos give the best results; handwriting is hard to recognize." }));
    return () => ({ lang: radioVal(el, "lang"), layout: radioVal(el, "layout") });
  },
  async run(items, o, ctx) {
    ctx.progress(-1);
    ctx.status("Loading the text recognizer (first time only)…");
    let label = "";
    const worker = await getWorker(o.lang, (m) => {
      if (m.status === "recognizing text") { ctx.status(`${label} ${Math.round(m.progress * 100)}%`); }
      else if (/loading|initializ/.test(m.status) && m.progress < 1) ctx.status(`Loading the text recognizer… ${Math.round((m.progress || 0) * 100)}%`);
    });
    // đếm tổng số trang để hiện tiến trình
    const jobs = [];
    for (const it of items) {
      if (it.doc) for (let p = 1; p <= Math.min(it.pages, MAX_PAGES); p++) jobs.push({ it, page: p });
      else jobs.push({ it });
    }
    const texts = new Map();
    let conf = 0, t0 = performance.now();
    for (let j = 0; j < jobs.length; j++) {
      ctx.check();
      const { it, page } = jobs[j];
      label = `Reading ${it.name}${page ? ` – page ${page}` : ""}${jobs.length > 1 ? ` (${j + 1}/${jobs.length})` : ""}…`;
      ctx.status(label);
      let src;
      if (page) src = await renderPage(it.doc, page, { width: 2000 });
      else { const bmp = await decodeImage(it.file); src = canvas(bmp.width, bmp.height); const g = src.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, src.width, src.height); g.drawImage(bmp, 0, 0); if (bmp.close) bmp.close(); }
      const { data } = await worker.recognize(prepare(src));
      conf += data.confidence || 0;
      const t = o.layout === "join" ? joinLines(data.text) : tidy(data.text);
      if (!texts.has(it)) texts.set(it, []);
      texts.get(it).push(page && it.pages > 1 ? `--- Page ${page} ---
${t}` : t);
      ctx.progress((j + 1) / jobs.length);
    }
    const outs = [], blocks = [];
    for (const [it, parts] of texts) {
      const text = parts.join("\n\n").trim();
      outs.push({ blob: new Blob([text], { type: "text/plain;charset=utf-8" }), name: baseName(it.name) + ".txt", note: `${text.split(/\s+/).filter(Boolean).length.toLocaleString("en-US")} words` });
      const ta = h("textarea", { class: "textarea ocr-text", rows: 12, value: text || "(No text recognized)", "aria-label": "Text recognized from " + it.name, spellcheck: "false" });
      blocks.push(h("div", { class: "opt-group" },
        h("div", { class: "row ocr-head" }, h("b", { text: it.name }),
          h("button", { class: "btn sm", type: "button", onclick: () => copyText(ta.value) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy")),
        ta));
    }
    if (outs.length) outs[0].extra = h("div", { class: "ocr-out" }, blocks);
    outs.summaryText = `Average confidence ${Math.round(conf / Math.max(1, jobs.length))}% · ${fmtNum((performance.now() - t0) / 1000, 1)} seconds. Proofread to fix misrecognized characters (common with accents).`;
    return outs;
  },
  summary: (outs) => outs.summaryText || null,
  zipName: "recognized-text",
  doneTitle: () => "Text recognized!"
});

const css = document.createElement("style");
css.textContent = ".ocr-out{margin-top:16px;display:grid;gap:18px}.ocr-head{align-items:center;justify-content:space-between;gap:10px}.ocr-head b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ocr-text{min-height:240px;font-size:15px;line-height:1.6}";
document.head.append(css);
