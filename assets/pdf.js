/* Tiện ích PDF dùng chung cho các công cụ PDF: mở file (hỏi mật khẩu khi cần), vẽ trang, ảnh thu nhỏ,
   tài liệu pdf-lib để chỉnh sửa (gỡ mã hoá khi đã biết mật khẩu). Dùng pdf.js để đọc và @cantoo/pdf-lib để ghi. */
import { h, lib, dialog, passwordField, CDN } from "./core.js";

export class Locked extends Error { constructor() { super("locked"); this.locked = true; } }
const OPTS = { cMapUrl: CDN.pdfjs.replace("build/", "cmaps/"), cMapPacked: true, standardFontDataUrl: CDN.pdfjs.replace("build/", "standard_fonts/"), isEvalSupported: false };

export function askPassword(name, wrong) {
  return dialog((close) => {
    const pw = passwordField({ placeholder: "Mật khẩu của file", "aria-label": "Mật khẩu" });
    const form = h("form", { class: "dlg-body" },
      h("h2", { text: "File có mật khẩu" }),
      h("p", null, h("b", { text: name }), " đang được khoá. Nhập mật khẩu để mở; mật khẩu chỉ dùng trên máy bạn."),
      pw.el,
      wrong ? h("p", { class: "field-err", text: "Mật khẩu chưa đúng, thử lại nhé." }) : null,
      h("div", { class: "dlg-acts" },
        h("button", { class: "btn ghost", type: "button", text: "Bỏ qua", onclick: () => close(null) }),
        h("button", { class: "btn", type: "submit", text: "Mở file" })));
    form.addEventListener("submit", (e) => { e.preventDefault(); close(pw.input.value); });
    setTimeout(() => pw.input.focus(), 30);
    return form;
  }, { label: "Nhập mật khẩu PDF" });
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
      if (e && e.name === "InvalidPDFException") { const err = new Error(file.name + " không phải PDF hợp lệ hoặc đã bị hỏng."); err.userMsg = err.message; throw err; }
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
