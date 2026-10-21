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
  it.info = it.pages + " trang · " + (it.fields ? it.fields + " ô form" : "không có ô form");
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
  action: "Làm phẳng form",
  sample: () => sampleFiles("to-khai-da-dien.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  async load(it) { await openItem(it, false); if (!it.locked) await countFields(it); },
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx, countFields),
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Làm phẳng form" }),
      h("p", { class: "hint", text: "Nội dung đã điền được giữ nguyên trên trang nhưng không còn là ô để sửa. Hợp khi gửi tờ khai, hợp đồng đã điền để người nhận không chỉnh được." }),
      h("p", { class: "hint", text: "Muốn điền trước rồi làm phẳng: dùng công cụ Điền form PDF và bật “Làm phẳng sau khi điền”." })));
  },
  ready(items) {
    if (items.some((i) => i.locked)) return LOCKED_MSG;
    if (items.some((i) => i.fields == null)) return "Đang đọc file…";
    if (items.every((i) => !i.fields)) return items.length > 1 ? "Các file này không có ô form nào." : "File này không có ô form nào để làm phẳng.";
    return true;
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      if (!it.fields) continue;
      ctx.status(`Đang làm phẳng ${it.name}…`);
      const doc = await libDoc(it.bytes, it.password);
      const form = doc.getForm(), fields = form.getFields();
      // vẽ lại hình hiển thị cho ô thiếu (hoặc file đánh dấu NeedAppearances); chữ tiếng Việt cần font có dấu
      const dirty = fields.filter((f) => { try { return f.needsAppearancesUpdate(); } catch (_) { return false; } });
      if (dirty.length) {
        const font = dirty.some((f) => needsUnicodeFont(fieldText(f))) ? await embedVnFont(doc) : undefined;
        try { form.updateFieldAppearances(font); } catch (e) { console.warn(e); }
      }
      form.flatten({ updateFieldAppearances: false });
      outs.push({ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + "-da-lam-phang.pdf", note: `${fields.length} ô đã làm phẳng` });
      ctx.progress((i + 1) / items.length);
      await nextFrame();
    }
    return outs;
  },
  zipName: "pdf-da-lam-phang",
  doneTitle: (outs) => (outs.length > 1 ? `Đã làm phẳng ${outs.length} file!` : "Đã làm phẳng form!")
});
