/* Đặt mật khẩu PDF: mã hoá AES-256, tuỳ chọn hạn chế in / sao chép / chỉnh sửa với mật khẩu quản trị riêng */
import { h, lib, baseName, sampleFiles, passwordField, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, pdfBlob, LOCKED_MSG } from "../pdf.js";

let pw1, pw2, pwo, err, chk = {};

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Khoá PDF",
  sample: () => sampleFiles("bao-cao-quy-1.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => openItem(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx),
  options(el) {
    pw1 = passwordField({ id: "pw1", autocomplete: "new-password", placeholder: "Ít nhất 4 ký tự", "aria-label": "Mật khẩu mở file" });
    pw2 = passwordField({ id: "pw2", autocomplete: "new-password", "aria-label": "Nhập lại mật khẩu" });
    pwo = passwordField({ id: "pwo", autocomplete: "new-password", placeholder: "Để trống = giống mật khẩu mở file", "aria-label": "Mật khẩu quản trị" });
    err = h("p", { class: "field-err", hidden: true, role: "alert" });
    const sw = (id, label) => { chk[id] = h("input", { type: "checkbox", id }); return h("label", { class: "switch" }, chk[id], h("span", { text: label })); };
    el.append(
      h("div", { class: "opt-group" },
        h("div", { class: "field" }, h("span", { text: "Mật khẩu mở file" }), pw1.el),
        h("div", { class: "field" }, h("span", { text: "Nhập lại mật khẩu" }), pw2.el), err),
      h("p", { class: "alert warn" }, h("span", { text: "Hãy ghi nhớ mật khẩu. Không ai lấy lại được nếu bạn quên, kể cả BbeTools." })),
      h("details", { class: "opt-more" }, h("summary", { text: "Hạn chế quyền (tuỳ chọn)" }),
        h("div", { class: "opt-group" }, sw("no-print", "Không cho in"), sw("no-copy", "Không cho sao chép chữ, hình"), sw("no-edit", "Không cho chỉnh sửa, thêm bớt trang"),
          h("p", { class: "hint", text: "Người mở file bằng mật khẩu trên vẫn bị hạn chế các quyền này. Bạn dùng mật khẩu quản trị để có toàn quyền." }),
          h("div", { class: "field" }, h("span", { text: "Mật khẩu quản trị" }), pwo.el))));
    return () => ({ pw: pw1.input.value, pw2: pw2.input.value, owner: pwo.input.value, noPrint: chk["no-print"].checked, noCopy: chk["no-copy"].checked, noEdit: chk["no-edit"].checked });
  },
  onChange(ctx) {
    const o = ctx.opts;
    const e = o.pw && o.pw.length < 4 ? "Mật khẩu nên có ít nhất 4 ký tự." : o.pw2 && o.pw !== o.pw2 ? "Hai mật khẩu chưa khớp." : "";
    err.hidden = !e; err.textContent = e;
  },
  ready(items, o) {
    if (items.some((i) => i.locked)) return LOCKED_MSG;
    if (!o.pw) return "Nhập mật khẩu để khoá file.";
    if (o.pw.length < 4) return "Mật khẩu nên có ít nhất 4 ký tự.";
    if (o.pw !== o.pw2) return "Nhập lại mật khẩu cho khớp.";
    return true;
  },
  async run(items, o, ctx) {
    const limit = o.noPrint || o.noCopy || o.noEdit, owner = o.owner || o.pw;
    const permissions = { printing: o.noPrint ? false : "highResolution", copying: !o.noCopy, contentAccessibility: true,
      modifying: !o.noEdit, annotating: !o.noEdit, fillingForms: true, documentAssembly: !o.noEdit };
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      ctx.status(`Đang mã hoá ${it.name}…`);
      const doc = await libDoc(it.bytes, it.password);
      doc.encrypt({ userPassword: o.pw, ownerPassword: owner, permissions });
      outs.push({ blob: pdfBlob(await doc.save()), name: baseName(it.name) + "-co-mat-khau.pdf", note: "AES-256" });
      ctx.progress((i + 1) / items.length);
      await nextFrame();
    }
    if (limit && owner === o.pw) outs[0].warn = true;
    return outs;
  },
  zipName: "pdf-co-mat-khau",
  doneTitle: (outs) => (outs.length > 1 ? `Đã khoá ${outs.length} file PDF!` : "Đã khoá PDF bằng mật khẩu!"),
  summary: (outs) => (outs[0].warn ? "Lưu ý: mật khẩu quản trị trùng mật khẩu mở file nên hạn chế quyền chỉ có tác dụng với một số trình đọc PDF." : "Mã hoá AES-256. Mở thử file bằng mật khẩu trước khi xoá bản gốc.")
});
