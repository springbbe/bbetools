/* Sửa thông tin PDF: xem và sửa tiêu đề, tác giả, chủ đề, từ khoá, phần mềm tạo; hoặc xoá sạch thông tin ẩn */
import { h, lib, baseName, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, pdfBlob, LOCKED_MSG } from "../pdf.js";

const FIELDS = [["title", "Tiêu đề", "Title"], ["author", "Tác giả", "Author"], ["subject", "Chủ đề", "Subject"], ["keywords", "Từ khoá", "Keywords"], ["creator", "Phần mềm tạo", "Creator"], ["producer", "Phần mềm xuất PDF", "Producer"]];
let inputs = {}, dates = null, cur = null, wipe = null;
const p2 = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => (d && !isNaN(d) ? `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}` : "—");

async function read(it) {
  const doc = await libDoc(it.bytes, it.password);
  it.meta = {
    title: doc.getTitle() || "", author: doc.getAuthor() || "", subject: doc.getSubject() || "", keywords: doc.getKeywords() || "",
    creator: doc.getCreator() || "", producer: doc.getProducer() || "", created: doc.getCreationDate(), modified: doc.getModificationDate()
  };
  fill(it);
}
function fill(it) {
  cur = it;
  if (!it || !it.meta) return;
  for (const [k] of FIELDS) inputs[k].value = it.meta[k];
  dates.textContent = `Tạo lúc: ${fmtDate(it.meta.created)} · Sửa lúc: ${fmtDate(it.meta.modified)}`;
}

fileTool({
  accept: ["pdf"], multiple: false, noun: "file PDF",
  action: "Lưu thông tin",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  async load(it) { await openItem(it, false); if (!it.locked) await read(it); },
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx, read),
  options(el) {
    for (const [k, label] of FIELDS) inputs[k] = h(k === "subject" ? "textarea" : "input", { class: k === "subject" ? "textarea" : "input", id: "m-" + k, autocomplete: "off", rows: k === "subject" ? 2 : null });
    dates = h("p", { class: "hint" });
    wipe = h("input", { type: "checkbox", id: "wipe" });
    el.append(
      h("div", { class: "opt-group" }, FIELDS.map(([k, label]) => h("label", { class: "field" }, h("span", { text: label }), inputs[k],
        k === "keywords" ? h("small", { text: "Ngăn cách bằng dấu phẩy." }) : null))),
      dates,
      h("label", { class: "switch" }, wipe, h("span", null, "Xoá sạch thông tin ẩn", h("small", { text: "Bỏ hết các trường trên, ngày tạo/sửa và khối XMP trước khi gửi file đi." }))));
    wipe.addEventListener("change", () => { for (const [k] of FIELDS) inputs[k].disabled = wipe.checked; });
    return () => ({ wipe: wipe.checked, ...Object.fromEntries(FIELDS.map(([k]) => [k, inputs[k].value.trim()])) });
  },
  onChange(ctx) { const it = ctx.items[0]; if (it && it !== cur && it.meta) fill(it); },
  ready: (items) => (items.some((i) => i.locked) ? LOCKED_MSG : items[0] && items[0].meta ? true : "Đang đọc thông tin…"),
  async run(items, o, ctx) {
    const L = await lib("pdflib");
    const it = items[0], N = (k) => L.PDFName.of(k);
    ctx.status("Đang lưu…"); ctx.progress(-1);
    const doc = await libDoc(it.bytes, it.password);
    const info = doc.getInfoDict();
    // khối XMP có thể chứa thông tin cũ và được một số trình đọc ưu tiên → bỏ đi để thông tin mới có hiệu lực
    doc.catalog.delete(N("Metadata"));
    if (o.wipe) {
      for (const k of [...FIELDS.map((f) => f[2]), "CreationDate", "ModDate", "Trapped"]) info.delete(N(k));
    } else {
      const set = { title: "setTitle", author: "setAuthor", subject: "setSubject", creator: "setCreator", producer: "setProducer" };
      for (const [k, , key] of FIELDS) {
        if (!o[k]) { info.delete(N(key)); continue; }
        // pdf-lib setKeywords() nối bằng dấu cách, làm mất dấu phẩy → ghi thẳng chuỗi
        if (k === "keywords") info.set(N("Keywords"), L.PDFHexString.fromText(o[k].split(/\s*[,;]\s*/).filter(Boolean).join(", ")));
        else doc[set[k]](o[k]);
      }
      doc.setModificationDate(new Date());
    }
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + (o.wipe ? "-da-xoa-thong-tin" : "-da-sua-thong-tin") + ".pdf", note: o.wipe ? "đã xoá thông tin ẩn" : "đã cập nhật thông tin" }];
  },
  doneTitle: () => "Đã lưu thông tin PDF!"
});
