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
  action: "Mã hoá",
  async sample() {
    const f = await sampleFiles("bao-cao-mat-khau-1234.pdf.bbe");
    pw1.input.value = "1234";
    toast("Mật khẩu của file mẫu là 1234");
    return f;
  },
  async load(it) {
    it.enc = isEncrypted(new Uint8Array(await it.file.slice(0, HEADER_LEN).arrayBuffer()));
    it.info = it.enc ? "đã mã hoá — sẽ giải mã" : "";
  },
  options(el) {
    pw1 = passwordField({ id: "fe-pw1", autocomplete: "new-password", "aria-label": "Mật khẩu" });
    pw2 = passwordField({ id: "fe-pw2", autocomplete: "new-password", "aria-label": "Nhập lại mật khẩu" });
    err = h("p", { class: "field-err", hidden: true, role: "alert" });
    pack = h("input", { type: "checkbox", id: "fe-pack" });
    packRow = h("label", { class: "switch", hidden: true }, pack, h("span", null, "Gộp tất cả thành một file mã hoá", h("small", { text: "Nén các file vào .zip rồi mã hoá — người nhận chỉ cần giải mã một file" })));
    hint = h("p", { class: "alert warn" }, h("span", { text: "Hãy ghi nhớ mật khẩu. Không ai mở lại được file nếu bạn quên, kể cả BbeTools." }));
    el.append(h("div", { class: "opt-group" },
      h("div", { class: "field" }, h("label", { for: "fe-pw1", text: "Mật khẩu" }), pw1.el),
      h("div", { class: "field", id: "fe-again" }, h("label", { for: "fe-pw2", text: "Nhập lại mật khẩu" }), pw2.el), err, packRow), hint);
    return () => ({ pw: pw1.input.value, pw2: pw2.input.value, pack: pack.checked });
  },
  onChange(c) {
    const m = mode(c.items), o = c.opts, encN = c.items.filter((i) => !i.enc).length;
    document.getElementById("fe-again").hidden = m === "dec";
    hint.hidden = m === "dec";
    packRow.hidden = encN < 2;
    const e = m !== "dec" && o.pw2 && o.pw !== o.pw2 ? "Hai mật khẩu chưa khớp." : "";
    err.hidden = !e; err.textContent = e;
    c.goBtn.textContent = m === "dec" ? "Giải mã" : m === "mix" ? "Mã hoá / giải mã" : "Mã hoá";
  },
  ready(items, o) {
    if (!o.pw) return "Nhập mật khẩu.";
    if (mode(items) !== "dec") {
      if (o.pw.length < 6) return "Mật khẩu mã hoá nên có ít nhất 6 ký tự.";
      if (o.pw !== o.pw2) return "Nhập lại mật khẩu cho khớp.";
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
      const r = await job(`Đang giải mã ${it.name}…`, it.size, (p) => decryptBlob(it.file, o.pw, { onProgress: p, signal: c.signal }).catch((e) => { e.userMsg = it.name + ": " + (e.userMsg || e.message); throw e; }));
      const name = r.meta.name || (it.name.toLowerCase().endsWith(EXT) ? it.name.slice(0, -EXT.length) : baseName(it.name));
      outs.push({ blob: r.blob, name, note: "đã giải mã" });
    }
    if (o.pack && plain.length > 1) {
      c.status("Đang nén các file…");
      const z = await zip(plain.map((i) => ({ name: i.name, blob: i.file })));
      const name = "tai-lieu-" + plain.length + "-file.zip";
      const blob = await job("Đang mã hoá file gộp…", plain.reduce((s, i) => s + i.size, 0), (p) => encryptBlob(z, o.pw, { name, type: "application/zip" }, { onProgress: p, signal: c.signal }));
      outs.push({ blob, name: name + EXT, note: plain.length + " file, AES-256" });
    } else {
      for (const it of plain) {
        c.check();
        const blob = await job(`Đang mã hoá ${it.name}…`, it.size, (p) => encryptBlob(it.file, o.pw, { name: it.name, type: it.file.type }, { onProgress: p, signal: c.signal }));
        outs.push({ blob, name: it.name + EXT, note: "AES-256 · từ " + fmtSize(it.size) });
      }
    }
    return outs;
  },
  zipName: "bbetools-ma-hoa",
  doneTitle: (outs, items) => (items.every((i) => i.enc) ? "Đã giải mã!" : items.some((i) => i.enc) ? "Xong!" : outs.length > 1 ? `Đã mã hoá ${outs.length} file!` : "Đã mã hoá file!"),
  summary: (outs, items) => (items.every((i) => i.enc) ? "" : "Gửi file .bbe qua bất kỳ kênh nào; người nhận mở trang này, chọn file và nhập đúng mật khẩu để lấy lại file gốc. Nên báo mật khẩu qua một kênh khác (gọi điện, gặp trực tiếp).")
});
