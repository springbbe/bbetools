/* Tự sinh bởi scripts/build.js từ assets/tools/pdf-to-text.js và i18n/en/js/ — đừng sửa tay. */
/* PDF sang văn bản: lấy lớp chữ trong PDF bằng pdf.js, xem ngay, sao chép hoặc lưu .txt (UTF-8 có BOM để Notepad đọc đúng tiếng Việt) */
import { h, icon, lib, baseName, sampleFiles, copyText, fmtNum, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openPdf, thumbnail, Locked } from "../pdf.js";
import { itemsToText, joinLines, charCount } from "../lib/pdf-text.js";

const PREVIEW_MAX = 200000;

async function open(it, prompt) {
  try {
    const r = await openPdf(it.file, { prompt, password: it.password });
    Object.assign(it, { doc: r.doc, password: r.password, pages: r.pages, locked: false });
    it.info = r.pages + " trang";
    it.thumb = await thumbnail(r.doc, 1, 56);
  } catch (e) {
    if (!(e instanceof Locked)) throw e;
    it.locked = true; it.info = "Password-protected, click 🔒 to unlock";
  }
}

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Extract text",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  warm: () => lib("pdfjs"),
  load: (it) => open(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => it.locked ? h("button", { class: "ib sm", type: "button", title: "Enter password", "aria-label": "Enter password for " + it.name, html: icon("lock"),
    onclick: async () => { it.loading = true; ctx.render(); try { await open(it, true); } finally { it.loading = false; ctx.render(); } } }) : null,
  options(el) {
    const marks = h("input", { type: "checkbox", id: "marks", checked: true });
    const join = h("input", { type: "checkbox", id: "join" });
    el.append(
      h("label", { class: "switch" }, marks, h("span", null, "Show page numbers", h("small", { text: "Add a “— Page 3 —” line between pages." }))),
      h("label", { class: "switch" }, join, h("span", null, "Join lines broken mid-sentence", h("small", { text: "Good for pasting into Word or chat apps. Turn off to keep the PDF's line breaks exactly." }))),
      h("p", { class: "alert warn" }, h("span", { html: icon("triangle-alert"), style: { display: "contents" } }),
        h("span", { text: "A scanned PDF (photographed from paper) only contains images, with no text to extract. Use the Image to Text (OCR) tool instead." })));
    return () => ({ marks: marks.checked, join: join.checked });
  },
  ready: (items) => (items.some((i) => i.locked) ? "A file is locked: click 🔒 to enter its password or remove that file." : true),
  async run(items, o, ctx) {
    const total = items.reduce((s, i) => s + i.pages, 0);
    let doneP = 0, chars = 0;
    const outs = [];
    for (const it of items) {
      const parts = [];
      for (let n = 1; n <= it.pages; n++) {
        ctx.check();
        ctx.status(`Reading ${it.name}, page ${n}/${it.pages}…`);
        const page = await it.doc.getPage(n);
        let t = itemsToText((await page.getTextContent()).items);
        page.cleanup();
        if (o.join) t = joinLines(t);
        chars += charCount(t);
        parts.push(o.marks ? `— Page ${n} —
${t}` : t);
        ctx.progress(++doneP / total);
        if (n % 5 === 0) await nextFrame();
      }
      outs.push({ name: baseName(it.name) + ".txt", text: parts.join("\n\n") });
    }
    if (chars === 0) { ctx.status("No text found: this may be a scanned PDF (images only).", "err"); return null; }
    const all = outs.length === 1 ? outs[0].text : outs.map((x) => `===== ${x.name} =====\n\n${x.text}`).join("\n\n\n");
    const ta = h("textarea", { class: "textarea pt-out", readonly: true, rows: 14, "aria-label": "Extracted text", spellcheck: "false" });
    ta.value = all.length > PREVIEW_MAX ? all.slice(0, PREVIEW_MAX) + "\n\n… (more, download the .txt file to see everything)" : all;
    const extra = h("div", { class: "pt-box" },
      h("div", { class: "row", style: { justifyContent: "space-between", alignItems: "center", margin: "14px 0 8px" } },
        h("b", { text: `${fmtNum(chars)} characters` + (chars < 10 * total ? " · very little text, some pages may be scanned images" : "") }),
        h("button", { class: "btn soft sm", type: "button", onclick: () => copyText(all, `Copied ${fmtNum(chars)} characters`) },
          h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy all")),
      ta);
    return outs.map((x, i) => ({ blob: new Blob(["﻿" + x.text], { type: "text/plain;charset=utf-8" }), name: x.name, note: items[i].pages + " trang", extra: i === 0 ? extra : null }));
  },
  zipName: "van-ban-tu-pdf",
  doneTitle: (outs) => (outs.length > 1 ? `Extracted text from ${outs.length} files!` : "Text extracted!")
});

const css = document.createElement("style");
css.textContent = ".pt-out{width:100%;min-height:260px;font-size:15px;line-height:1.6;resize:vertical;white-space:pre-wrap}";
document.head.append(css);
