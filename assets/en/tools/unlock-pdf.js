/* Tự sinh bởi scripts/build.js từ assets/tools/unlock-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Mở khoá PDF: gỡ mật khẩu mở file (khi biết mật khẩu) và gỡ giới hạn in, sao chép, chỉnh sửa */
import { h, lib, baseName, sampleFiles, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, pdfBlob, LOCKED_MSG } from "../pdf.js";

// loại khoá: "none" (không khoá), "owner" (chỉ chặn in/sao chép), "user" (cần mật khẩu để mở)
async function detect(it) {
  try {
    const L = await lib("pdflib");
    const d = await L.PDFDocument.load(it.bytes, { ignoreEncryption: true, updateMetadata: false });
    it.lock = !d.isEncrypted ? "none" : it.password ? "user" : "owner";
  } catch (_) { it.lock = it.password ? "user" : "owner"; }
  it.info = it.pages + " pages · " + { none: "not locked", owner: "printing / copying restricted", user: "correct password entered" }[it.lock];
}

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Unlock PDF",
  sample: () => sampleFiles("mau-co-mat-khau-1234.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  async load(it) { await openItem(it, false); if (!it.locked) await detect(it); },
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx, detect),
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Unlock PDF" }),
      h("p", { class: "hint", text: "Files that only restrict printing or copying are unlocked right away, no password needed. For files that need a password to open, you must know it: click 🔒 to enter it." }),
      h("p", { class: "hint", text: "The sample file's password is 1234." })));
  },
  ready(items) {
    if (items.some((i) => i.locked)) return LOCKED_MSG;
    if (items.every((i) => i.lock === "none")) return items.length > 1 ? "These files have no password or restrictions." : "This file has no password or restrictions.";
    return true;
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      if (it.lock === "none") continue;
      ctx.status(`Unlocking ${it.name}…`);
      const doc = await libDoc(it.bytes, it.password);
      outs.push({ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name).replace(/-co-mat-khau$/, "") + "-unlocked.pdf", note: "unlocked" });
      ctx.progress((i + 1) / items.length);
      await nextFrame();
    }
    return outs;
  },
  zipName: "pdf-da-mo-khoa",
  doneTitle: (outs) => (outs.length > 1 ? `Unlocked ${outs.length} PDF files!` : "PDF unlocked!")
});
