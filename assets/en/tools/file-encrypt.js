/* Tự sinh bởi scripts/build.js từ assets/tools/file-encrypt.js và i18n/en/js/ — đừng sửa tay. */
/* Mã hoá/giải mã file: AES-GCM 256 + PBKDF2-SHA256 (600.000 vòng) bằng Web Crypto, chia khối 1 MB nên file lớn vẫn chạy.
   Tự nhận file đã mã hoá (.bbe) để giải mã; file thường thì mã hoá. Định dạng: assets/lib/ma-hoa.js */
import { h, baseName, sampleFiles, passwordField, zip, fmtSize, toast } from "../core.js";
import { fileTool } from "../frames/file.js";
import { encryptBlob, decryptBlob, isEncrypted, HEADER_LEN } from "../lib/ma-hoa.js";

const EXT = ".bbe";
let pw1, pw2, err, pack, packRow, hint;
const mode = (items) => (items.length && items.every((i) => i.enc) ? "dec" : items.some((i) => i.enc) ? "mix" : "enc");

fileTool({
  accept: ["any"], multiple: true, noun: "file",
  action: "Encrypt",
  async sample() {
    const f = await sampleFiles("bao-cao-mat-khau-1234.pdf.bbe");
    pw1.input.value = "1234";
    toast("The sample file's password is 1234");
    return f;
  },
  async load(it) {
    it.enc = isEncrypted(new Uint8Array(await it.file.slice(0, HEADER_LEN).arrayBuffer()));
    it.info = it.enc ? "encrypted — will be decrypted" : "";
  },
  options(el) {
    pw1 = passwordField({ id: "fe-pw1", autocomplete: "new-password", "aria-label": "Password" });
    pw2 = passwordField({ id: "fe-pw2", autocomplete: "new-password", "aria-label": "Re-enter password" });
    err = h("p", { class: "field-err", hidden: true, role: "alert" });
    pack = h("input", { type: "checkbox", id: "fe-pack" });
    packRow = h("label", { class: "switch", hidden: true }, pack, h("span", null, "Combine everything into one encrypted file", h("small", { text: "Zip the files, then encrypt — the recipient only needs to decrypt one file" })));
    hint = h("p", { class: "alert warn" }, h("span", { text: "Remember the password. Nobody can open the file if you forget it, not even BbeTools." }));
    el.append(h("div", { class: "opt-group" },
      h("div", { class: "field" }, h("label", { for: "fe-pw1", text: "Password" }), pw1.el),
      h("div", { class: "field", id: "fe-again" }, h("label", { for: "fe-pw2", text: "Re-enter password" }), pw2.el), err, packRow), hint);
    return () => ({ pw: pw1.input.value, pw2: pw2.input.value, pack: pack.checked });
  },
  onChange(c) {
    const m = mode(c.items), o = c.opts, encN = c.items.filter((i) => !i.enc).length;
    document.getElementById("fe-again").hidden = m === "dec";
    hint.hidden = m === "dec";
    packRow.hidden = encN < 2;
    const e = m !== "dec" && o.pw2 && o.pw !== o.pw2 ? "The two passwords don't match." : "";
    err.hidden = !e; err.textContent = e;
    c.goBtn.textContent = m === "dec" ? "Decrypt" : m === "mix" ? "Encrypt / decrypt" : "Encrypt";
  },
  ready(items, o) {
    if (!o.pw) return "Enter a password.";
    if (mode(items) !== "dec") {
      if (o.pw.length < 6) return "The encryption password should be at least 6 characters.";
      if (o.pw !== o.pw2) return "Re-enter the password to confirm.";
    }
    return true;
  },
  async run(items, o, c) {
    const outs = [];
    const plain = items.filter((i) => !i.enc), encd = items.filter((i) => i.enc);
    const total = items.reduce((s, i) => s + i.size, 0) || 1;
    let done = 0;
    const job = async (label, size, fn) => {
      c.status(label);
      const r = await fn((f) => c.progress((done + f * size) / total));
      done += size;
      return r;
    };
    for (const it of encd) {
      c.check();
      const r = await job(`Decrypting ${it.name}…`, it.size, (p) => decryptBlob(it.file, o.pw, { onProgress: p, signal: c.signal }).catch((e) => { e.userMsg = it.name + ": " + (e.userMsg || e.message); throw e; }));
      const name = r.meta.name || (it.name.toLowerCase().endsWith(EXT) ? it.name.slice(0, -EXT.length) : baseName(it.name));
      outs.push({ blob: r.blob, name, note: "decrypted" });
    }
    if (o.pack && plain.length > 1) {
      c.status("Zipping the files…");
      const z = await zip(plain.map((i) => ({ name: i.name, blob: i.file })));
      const name = "documents-" + plain.length + "-file.zip";
      const blob = await job("Encrypting the combined file…", plain.reduce((s, i) => s + i.size, 0), (p) => encryptBlob(z, o.pw, { name, type: "application/zip" }, { onProgress: p, signal: c.signal }));
      outs.push({ blob, name: name + EXT, note: plain.length + " file, AES-256" });
    } else {
      for (const it of plain) {
        c.check();
        const blob = await job(`Encrypting ${it.name}…`, it.size, (p) => encryptBlob(it.file, o.pw, { name: it.name, type: it.file.type }, { onProgress: p, signal: c.signal }));
        outs.push({ blob, name: it.name + EXT, note: "AES-256 · from " + fmtSize(it.size) });
      }
    }
    return outs;
  },
  zipName: "bbetools-ma-hoa",
  doneTitle: (outs, items) => (items.every((i) => i.enc) ? "Decrypted!" : items.some((i) => i.enc) ? "Done!" : outs.length > 1 ? `Encrypted ${outs.length} files!` : "File encrypted!"),
  summary: (outs, items) => (items.every((i) => i.enc) ? "" : "Send the .bbe file through any channel; the recipient opens this page, chooses the file and enters the right password to get the original back. Share the password through a different channel (a call, in person).")
});
