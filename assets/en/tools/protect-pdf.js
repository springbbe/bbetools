/* Tự sinh bởi scripts/build.js từ assets/tools/protect-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Đặt mật khẩu PDF: mã hoá AES-256, tuỳ chọn hạn chế in / sao chép / chỉnh sửa với mật khẩu quản trị riêng */
import { h, lib, baseName, sampleFiles, passwordField, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openItem, lockButton, libDoc, pdfBlob, LOCKED_MSG } from "../pdf.js";

let pw1, pw2, pwo, err, chk = {};

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Lock PDF",
  sample: () => sampleFiles("bao-cao-quy-1.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => openItem(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => lockButton(it, ctx),
  options(el) {
    pw1 = passwordField({ id: "pw1", autocomplete: "new-password", placeholder: "At least 4 characters", "aria-label": "Open password" });
    pw2 = passwordField({ id: "pw2", autocomplete: "new-password", "aria-label": "Re-enter password" });
    pwo = passwordField({ id: "pwo", autocomplete: "new-password", placeholder: "Leave empty = same as the open password", "aria-label": "Owner password" });
    err = h("p", { class: "field-err", hidden: true, role: "alert" });
    const sw = (id, label) => { chk[id] = h("input", { type: "checkbox", id }); return h("label", { class: "switch" }, chk[id], h("span", { text: label })); };
    el.append(
      h("div", { class: "opt-group" },
        h("div", { class: "field" }, h("span", { text: "Open password" }), pw1.el),
        h("div", { class: "field" }, h("span", { text: "Re-enter password" }), pw2.el), err),
      h("p", { class: "alert warn" }, h("span", { text: "Remember the password. Nobody can recover it if you forget it, not even BbeTools." })),
      h("details", { class: "opt-more" }, h("summary", { text: "Restrict permissions (optional)" }),
        h("div", { class: "opt-group" }, sw("no-print", "Disallow printing"), sw("no-copy", "Disallow copying text and images"), sw("no-edit", "Disallow editing and adding/removing pages"),
          h("p", { class: "hint", text: "Anyone opening the file with the password above is still restricted. Use the owner password for full access." }),
          h("div", { class: "field" }, h("span", { text: "Owner password" }), pwo.el))));
    return () => ({ pw: pw1.input.value, pw2: pw2.input.value, owner: pwo.input.value, noPrint: chk["no-print"].checked, noCopy: chk["no-copy"].checked, noEdit: chk["no-edit"].checked });
  },
  onChange(ctx) {
    const o = ctx.opts;
    const e = o.pw && o.pw.length < 4 ? "The password should be at least 4 characters." : o.pw2 && o.pw !== o.pw2 ? "The two passwords don't match." : "";
    err.hidden = !e; err.textContent = e;
  },
  ready(items, o) {
    if (items.some((i) => i.locked)) return LOCKED_MSG;
    if (!o.pw) return "Enter a password to lock the file.";
    if (o.pw.length < 4) return "The password should be at least 4 characters.";
    if (o.pw !== o.pw2) return "Re-enter the password to confirm.";
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
      ctx.status(`Encrypting ${it.name}…`);
      const doc = await libDoc(it.bytes, it.password);
      doc.encrypt({ userPassword: o.pw, ownerPassword: owner, permissions });
      outs.push({ blob: pdfBlob(await doc.save()), name: baseName(it.name) + "-protected.pdf", note: "AES-256" });
      ctx.progress((i + 1) / items.length);
      await nextFrame();
    }
    if (limit && owner === o.pw) outs[0].warn = true;
    return outs;
  },
  zipName: "pdf-co-mat-khau",
  doneTitle: (outs) => (outs.length > 1 ? `Locked ${outs.length} PDF files!` : "PDF locked with a password!"),
  summary: (outs) => (outs[0].warn ? "Note: the owner password is the same as the open password, so the permission restrictions only work in some PDF readers." : "AES-256 encryption. Test opening the file with the password before deleting the original.")
});
