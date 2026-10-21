/* Ghép PDF: nhiều file → một file, theo thứ tự trong danh sách, có thể xoay từng file */
import { h, icon, lib, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openPdf, libDoc, thumbnail, Locked, pdfBlob } from "../pdf.js";

async function open(it, prompt) {
  try {
    const r = await openPdf(it.file, { prompt, password: it.password });
    Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages, locked: false, error: null });
    it.info = r.pages + " trang" + (r.password ? " · đã mở khoá" : "");
    it.thumb = await thumbnail(r.doc, 1, 56);
  } catch (e) {
    if (!(e instanceof Locked)) throw e;
    it.locked = true; it.info = "Có mật khẩu, bấm 🔒 để mở";
  }
}

fileTool({
  accept: ["pdf"], multiple: true, reorder: true, noun: "file PDF",
  action: "Ghép PDF",
  sample: () => sampleFiles("bao-cao-quy-1.pdf", "bao-cao-quy-2.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => open(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => [
    it.locked ? h("button", { class: "ib sm", type: "button", title: "Nhập mật khẩu", "aria-label": "Nhập mật khẩu cho " + it.name, html: icon("lock"),
      onclick: async () => { it.loading = true; ctx.render(); try { await open(it, true); } finally { it.loading = false; ctx.render(); } } }) : null,
    !it.locked && it.pages ? h("button", { class: "ib sm", type: "button", title: "Xoay 90°", "aria-label": "Xoay " + it.name, html: icon("rotate-cw"),
      onclick: () => { it.rot = (it.rot + 90) % 360; it.info = it.pages + " trang" + (it.rot ? " · xoay " + it.rot + "°" : ""); ctx.render(); } }) : null
  ],
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Ghép PDF" }), h("p", { class: "alert info", id: "sum" }),
      h("p", { class: "hint", text: "Mẹo: kéo thả hoặc dùng nút ↑↓ để sắp thứ tự; bấm ↻ để xoay file bị ngược." })));
  },
  onChange(ctx) {
    const n = ctx.items.length, pages = ctx.items.reduce((s, i) => s + (i.pages || 0), 0);
    document.getElementById("sum").innerHTML = `<span>Sẽ ghép <b>${n}</b> file thành một PDF <b>${pages}</b> trang.</span>`;
  },
  ready(items) {
    if (items.some((i) => i.locked)) return "Có file đang khoá: bấm 🔒 để nhập mật khẩu hoặc bỏ file đó.";
    if (items.length < 2) return "Thêm ít nhất 1 file PDF nữa để ghép.";
    return true;
  },
  async run(items, opts, ctx) {
    const L = await lib("pdflib");
    const out = await L.PDFDocument.create();
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      ctx.status(`Đang ghép file ${i + 1}/${items.length}…`);
      const src = await libDoc(it.bytes, it.password);
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const p of pages) {
        if (it.rot) p.setRotation(L.degrees(((p.getRotation().angle || 0) + it.rot) % 360));
        out.addPage(p);
      }
      ctx.progress((i + 1) / items.length);
      await new Promise((r) => setTimeout(r, 0));
    }
    ctx.status("Đang lưu file…"); ctx.progress(-1);
    const bytes = await out.save({ useObjectStreams: true });
    return [{ blob: pdfBlob(bytes), name: "ghep-" + items.length + "-file.pdf", note: out.getPageCount() + " trang" }];
  },
  doneTitle: (outs, items) => `Đã ghép ${items.length} file PDF!`
});
