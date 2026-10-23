/* Tự sinh bởi scripts/build.js từ assets/tools/merge-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Ghép PDF: nhiều file → một file, theo thứ tự trong danh sách, có thể xoay từng file */
import { h, icon, lib, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openPdf, libDoc, thumbnail, Locked, pdfBlob } from "../pdf.js";

async function open(it, prompt) {
  try {
    const r = await openPdf(it.file, { prompt, password: it.password });
    Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages, locked: false, error: null });
    it.info = r.pages + " pages" + (r.password ? " · unlocked" : "");
    it.thumb = await thumbnail(r.doc, 1, 56);
  } catch (e) {
    if (!(e instanceof Locked)) throw e;
    it.locked = true; it.info = "Password-protected, click 🔒 to unlock";
  }
}

fileTool({
  accept: ["pdf"], multiple: true, reorder: true, noun: "file PDF",
  action: "Merge PDF",
  sample: () => sampleFiles("bao-cao-quy-1.pdf", "bao-cao-quy-2.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => open(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => [
    it.locked ? h("button", { class: "ib sm", type: "button", title: "Enter password", "aria-label": "Enter password for " + it.name, html: icon("lock"),
      onclick: async () => { it.loading = true; ctx.render(); try { await open(it, true); } finally { it.loading = false; ctx.render(); } } }) : null,
    !it.locked && it.pages ? h("button", { class: "ib sm", type: "button", title: "Rotate 90°", "aria-label": "Rotate " + it.name, html: icon("rotate-cw"),
      onclick: () => { it.rot = (it.rot + 90) % 360; it.info = it.pages + " pages" + (it.rot ? " · rotated " + it.rot + "°" : ""); ctx.render(); } }) : null
  ],
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Merge PDF" }), h("p", { class: "alert info", id: "sum" }),
      h("p", { class: "hint", text: "Tip: drag and drop or use ↑↓ to set the order; click ↻ to rotate a file that's upside down." })));
  },
  onChange(ctx) {
    const n = ctx.items.length, pages = ctx.items.reduce((s, i) => s + (i.pages || 0), 0);
    document.getElementById("sum").innerHTML = `<span>Will merge <b>${n}</b> files into one <b>${pages}</b>-page PDF.</span>`;
  },
  ready(items) {
    if (items.some((i) => i.locked)) return "A file is locked: click 🔒 to enter its password or remove that file.";
    if (items.length < 2) return "Add at least 1 more PDF file to merge.";
    return true;
  },
  async run(items, opts, ctx) {
    const L = await lib("pdflib");
    const out = await L.PDFDocument.create();
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      ctx.status(`Merging file ${i + 1}/${items.length}…`);
      const src = await libDoc(it.bytes, it.password);
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const p of pages) {
        if (it.rot) p.setRotation(L.degrees(((p.getRotation().angle || 0) + it.rot) % 360));
        out.addPage(p);
      }
      ctx.progress((i + 1) / items.length);
      await new Promise((r) => setTimeout(r, 0));
    }
    ctx.status("Saving file…"); ctx.progress(-1);
    const bytes = await out.save({ useObjectStreams: true });
    return [{ blob: pdfBlob(bytes), name: "merged-" + items.length + "-files.pdf", note: out.getPageCount() + " pages" }];
  },
  doneTitle: (outs, items) => `Merged ${items.length} PDF files!`
});
