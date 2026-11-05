/* Tự sinh bởi scripts/build.js từ assets/tesseract.js và i18n/en/js/ — đừng sửa tay. */
/* Bộ nhận dạng chữ Tesseract (tesseract.js, WebAssembly trong Web Worker) dùng chung cho Ảnh sang chữ và PDF scan tìm kiếm được.
   Dữ liệu tiếng Việt / tiếng Anh tải từ jsDelivr (ghim phiên bản), trình duyệt lưu lại cho lần sau. */
import { lib } from "./core.js";

const JSD = "https://cdn.jsdelivr.net/npm/";
const TESS = {
  workerPath: JSD + "tesseract.js@7.0.0/dist/worker.min.js",
  corePath: JSD + "tesseract.js-core@7.0.0",
  lang: { vie: JSD + "@tesseract.js-data/vie@1.0.0/4.0.0_best_int", eng: JSD + "@tesseract.js-data/eng@1.0.0/4.0.0_best_int" }
};
const workers = {};
let logFn = null;

/** Worker cho ngôn ngữ lang ("vie" | "eng"), tạo một lần. onLog(m) nhận tiến trình { status, progress } */
export async function getWorker(lang, onLog) {
  logFn = onLog;
  if (!workers[lang]) workers[lang] = (async () => {
    const T = await lib("tesseract");
    return T.createWorker(lang, 1, { workerPath: TESS.workerPath, corePath: TESS.corePath, langPath: TESS.lang[lang], logger: (m) => logFn && logFn(m) });
  })().catch((e) => { delete workers[lang]; console.error(e); throw Object.assign(new Error("ocr"), { userMsg: "Couldn't load the text recognizer. Check your internet connection and try again." }); });
  return workers[lang];
}

/** Dừng ngay worker đang chạy (khi người dùng bấm Huỷ giữa chừng); lần sau getWorker tạo lại */
export async function stopWorker(lang) {
  const w = workers[lang];
  delete workers[lang];
  if (w) try { await (await w).terminate(); } catch (_) {}
}
