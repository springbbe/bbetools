/* Tự sinh bởi scripts/build.js từ assets/tools/flatten-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Làm phẳng form PDF: biến các ô form (đã điền) thành nội dung cố định của trang, không ai sửa được nữa.
   Ô thiếu hình hiển thị được vẽ lại (font tiếng Việt khi cần) trước khi làm phẳng. */
import { h, lib, baseName, sampleFiles, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, pdfBlob, embedVnFont, needsUnicodeFont, LOCKED_MSG } from "../pdf.js";

async function countFields(it) {
  try {
    const doc = await libDoc(it.bytes, it.password);
    it.fields = doc.getForm().getFields().length;
  } catch (_) { it.fields = 0; }
  it.info = it.pages + " pages · " + (it.fields ? it.fields + " form fields" : "no form fields");
}
const fieldText = (f) => {
  try {
    if (f.getText) return f.getText() || "";
    if (f.getSelected) return [].concat(f.getSelected() || []).join(" ");
  } catch (_) { /* ô lạ */ }
  return "";
};

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Flatten form",
  sample: () => sampleFiles("to-khai-da-dien.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  async load(it) { await openItem(it, false); if (!it.locked) await countFields(it); },
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx, countFields),
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Flatten form" }),
      h("p", { class: "hint", text: "The filled-in content stays on the page but is no longer editable. Good for sending filled forms and contracts so recipients can't change them." }),
      h("p", { class: "hint", text: "To fill in first and then flatten: use Fill PDF form and turn on “Flatten after filling”." })));
  },
  ready(items) {
    if (items.some((i) => i.locked)) return LOCKED_MSG;
    if (items.some((i) => i.fields == null)) return "Reading file…";
    if (items.every((i) => !i.fields)) return items.length > 1 ? "These files have no form fields." : "This file has no form fields to flatten.";
    return true;
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      if (!it.fields) continue;
      ctx.status(`Flattening ${it.name}…`);
      const doc = await libDoc(it.bytes, it.password);
      const form = doc.getForm(), fields = form.getFields();
      // vẽ lại hình hiển thị cho ô thiếu (hoặc file đánh dấu NeedAppearances); chữ tiếng Việt cần font có dấu
      const dirty = fields.filter((f) => { try { return f.needsAppearancesUpdate(); } catch (_) { return false; } });
      if (dirty.length) {
        const font = dirty.some((f) => needsUnicodeFont(fieldText(f))) ? await embedVnFont(doc) : undefined;
        try { form.updateFieldAppearances(font); } catch (e) { console.warn(e); }
      }
      form.flatten({ updateFieldAppearances: false });
      outs.push({ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + "-flattened.pdf", note: `${fields.length} ${(fields.length) == 1 ? "field" : "fields"} flattened` });
      ctx.progress((i + 1) / items.length);
      await nextFrame();
    }
    return outs;
  },
  zipName: "pdf-da-lam-phang",
  doneTitle: (outs) => (outs.length > 1 ? `Flattened ${outs.length} files!` : "Form flattened!")
});
