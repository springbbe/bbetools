/* Tự sinh bởi scripts/build.js từ assets/pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Tiện ích PDF dùng chung cho các công cụ PDF: mở file (hỏi mật khẩu khi cần), vẽ trang, ảnh thu nhỏ,
   tài liệu pdf-lib để chỉnh sửa (gỡ mã hoá khi đã biết mật khẩu). Dùng pdf.js để đọc và @cantoo/pdf-lib để ghi. */
import { h, icon, lib, dialog, passwordField, CDN } from "./core.js";

export class Locked extends Error { constructor() { super("locked"); this.locked = true; } }
const OPTS = { cMapUrl: CDN.pdfjs.replace("build/", "cmaps/"), cMapPacked: true, standardFontDataUrl: CDN.pdfjs.replace("build/", "standard_fonts/"), isEvalSupported: false };

export function askPassword(name, wrong) {
  return dialog((close) => {
    const pw = passwordField({ placeholder: "File password", "aria-label": "Password" });
    const form = h("form", { class: "dlg-body" },
      h("h2", { text: "Password-protected file" }),
      h("p", null, h("b", { text: name }), " is locked. Enter the password to open it; the password is only used on your device."),
      pw.el,
      wrong ? h("p", { class: "field-err", text: "Wrong password, please try again." }) : null,
      h("div", { class: "dlg-acts" },
        h("button", { class: "btn ghost", type: "button", text: "Skip", onclick: () => close(null) }),
        h("button", { class: "btn", type: "submit", text: "Open file" })));
    form.addEventListener("submit", (e) => { e.preventDefault(); close(pw.input.value); });
    setTimeout(() => pw.input.focus(), 30);
    return form;
  }, { label: "Enter PDF password" });
}

/** Mở PDF bằng pdf.js. opts: { password, prompt: true } → { bytes, doc, password, pages } */
export async function openPdf(file, opts = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await lib("pdfjs");
  let password = opts.password, wrong = false;
  for (;;) {
    try {
      const doc = await pdfjs.getDocument(Object.assign({ data: bytes.slice(), password }, OPTS)).promise;
      return { bytes, doc, password, pages: doc.numPages };
    } catch (e) {
      if (e && e.name === "PasswordException") {
        if (opts.prompt === false) throw new Locked();
        wrong = e.code === 2;
        password = await askPassword(file.name, wrong);
        if (password == null) throw new Locked();
        continue;
      }
      if (e && e.name === "InvalidPDFException") { const err = new Error(file.name + " is not a valid PDF or is corrupted."); err.userMsg = err.message; throw err; }
      throw e;
    }
  }
}

/** Tài liệu pdf-lib để ghi; nếu file mã hoá thì giải mã bằng mật khẩu đã biết và bỏ phần mã hoá */
export async function libDoc(bytes, password) {
  const L = await lib("pdflib");
  try { return await L.PDFDocument.load(bytes, { updateMetadata: false }); }
  catch (e) {
    if (!/encrypt/i.test(e.message || "")) throw e;
    const doc = await L.PDFDocument.load(bytes, { password: password || "", updateMetadata: false });
    dropEncryption(L, doc);
    return doc;
  }
}
// pdf-lib giữ lại /Encrypt, xref/object stream cũ sau khi giải mã → xoá để file lưu ra mở không cần mật khẩu
function dropEncryption(L, doc) {
  const N = (x) => L.PDFName.of(x), ctx = doc.context;
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof L.PDFInvalidObject) { ctx.delete(ref); continue; }
    const d = obj instanceof L.PDFDict ? obj : obj.dict;
    if (!d || !d.get) continue;
    const t = d.get(N("Type"));
    if (t === N("XRef") || t === N("ObjStm") || (d.get(N("Filter")) === N("Standard") && d.get(N("O")) && d.get(N("U")))) ctx.delete(ref);
  }
  delete ctx.trailerInfo.Encrypt;
}

/** Vẽ một trang ra canvas (nền trắng). opts: { width } (px) hoặc { scale }, maxPixels */
export async function renderPage(doc, n, opts = {}) {
  const page = await doc.getPage(n);
  const rotation = ((page.rotate + (opts.rotation || 0)) % 360 + 360) % 360;
  const vp1 = page.getViewport({ scale: 1, rotation });
  let scale = opts.scale || (opts.width / vp1.width);
  if (opts.maxPixels) scale = Math.min(scale, Math.sqrt(opts.maxPixels / (vp1.width * vp1.height)));
  const vp = page.getViewport({ scale, rotation });
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: g, viewport: vp, intent: "print" }).promise;
  page.cleanup();
  return c;
}

/** Ảnh thu nhỏ trang đầu (data URL) */
export async function thumbnail(doc, n = 1, width = 120) {
  const c = await renderPage(doc, n, { width: width * Math.min(2, devicePixelRatio || 1) });
  return c.toDataURL("image/jpeg", 0.8);
}

export const pdfBlob = (bytes) => new Blob([bytes], { type: "application/pdf" });

/** Mở PDF cho một mục trong danh sách file (khung file): đặt it.bytes/doc/password/pages/thumb.
    File có mật khẩu: không hỏi ngay (prompt = false) mà đánh dấu it.locked để người dùng bấm 🔒 */
export async function openItem(it, prompt) {
  try {
    const r = await openPdf(it.file, { prompt, password: it.password });
    Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages, locked: false });
    it.info = r.pages + " trang" + (r.password ? " · unlocked" : "");
    it.thumb = await thumbnail(r.doc, 1, 56);
  } catch (e) {
    if (!(e instanceof Locked)) throw e;
    it.locked = true; it.info = "Password-protected, click 🔒 to unlock";
  }
}
/** Nút 🔒 nhập mật khẩu cho mục đang khoá (dùng trong itemActions) */
export const lockButton = (it, ctx, after) => it.locked ? h("button", { class: "ib sm", type: "button", title: "Enter password", "aria-label": "Enter password for " + it.name, html: icon("lock"),
  onclick: async () => { it.loading = true; ctx.render(); try { await openItem(it, true); if (after) await after(it); } finally { it.loading = false; ctx.render(); } } }) : null;
export const LOCKED_MSG = "A file is locked: click 🔒 to enter its password or remove that file.";

/** Font TTF có đủ dấu tiếng Việt để nhúng vào PDF (điền form): Be Vietnam Pro, OFL */
export const VN_TTF = "https://cdn.jsdelivr.net/npm/@expo-google-fonts/be-vietnam-pro@0.4.1/400Regular/BeVietnamPro_400Regular.ttf";
/** Chuỗi có ký tự ngoài bảng mã WinAnsi (font chuẩn Helvetica của PDF không vẽ được) */
export const needsUnicodeFont = (s) => /[^\x20-\x7E\xA0-\xFF\n\r\t]/.test(s || "");
const VN_TTF_BOLD = "https://cdn.jsdelivr.net/npm/@expo-google-fonts/be-vietnam-pro@0.4.1/700Bold/BeVietnamPro_700Bold.ttf";
/** Nhúng font tiếng Việt vào tài liệu pdf-lib (tải fontkit + font khi cần). bold: bản đậm */
export async function embedVnFont(doc, bold = false) {
  const [fontkit, bytes] = await Promise.all([lib("fontkit"), fetch(bold ? VN_TTF_BOLD : VN_TTF).then((r) => { if (!r.ok) throw new Error("font"); return r.arrayBuffer(); })]);
  doc.registerFontkit(fontkit);
  // không dùng subset: fontkit 1.1.1 lỗi khi cắt font này (lỗi "reading 'pos'" lúc lưu); nhúng nguyên font (~130 KB)
  // tắt chữ ghép (fi, fl…): chữ ghép làm sai bảng ToUnicode, sao chép từ PDF ra ký tự lạ
  return doc.embedFont(bytes, { subset: false, features: { liga: false, clig: false, dlig: false, rlig: false } });
}
