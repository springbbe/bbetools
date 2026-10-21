/* Tính checksum file: MD5, SHA-1, SHA-256, SHA-512, CRC32 bằng hash-wasm, đọc file theo luồng (file vài GB vẫn chạy, không đọc hết vào bộ nhớ).
   Đối chiếu với mã dán vào hoặc với file danh sách (.sha256, .md5, SHA256SUMS…) thả cùng lúc. */
import { h, icon, lib, copyText, fmtSize, sampleFiles, nextFrame } from "../core.js";
import { fileTool } from "../frames/file.js";
import { ALGOS, algoName, parseChecksumList, verify, formatGnu, normHex, guessAlgos } from "../lib/checksum.js";

const LIST_NAME = /(\.(md5|sha1|sha256|sha512|sfv|crc32)|sums?(\.txt)?|checksums?(\.txt)?)$/i;
const MAKERS = { md5: "createMD5", sha1: "createSHA1", sha256: "createSHA256", sha512: "createSHA512", crc32: "createCRC32" };
let checks = {}, expect;

fileTool({
  accept: ["any"], multiple: true, noun: "file",
  action: "Tính checksum",
  sample: () => sampleFiles("bao-cao-quy-1.pdf", "bao-cao-quy-1.pdf.sha256"),
  warm: () => lib("hashwasm"),
  async load(it) {
    if (LIST_NAME.test(it.name) && it.size < 1 << 20) {
      const list = parseChecksumList(await it.file.text());
      if (list.length) { it.list = list; it.info = `danh sách ${list.length} mã — dùng để đối chiếu`; }
    }
  },
  options(el) {
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Thuật toán" }),
      ALGOS.map((a) => { checks[a.id] = h("input", { type: "checkbox", checked: a.id === "sha256" || a.id === "md5" }); return h("label", { class: "switch" }, checks[a.id], h("span", { text: a.name })); })));
    expect = h("textarea", { id: "ck-exp", class: "mono", rows: 3, placeholder: "Dán mã từ trang tải về (vd. SHA-256) hoặc nội dung file SHA256SUMS", spellcheck: "false" });
    el.append(h("div", { class: "field" }, h("label", { for: "ck-exp", text: "Mã cần đối chiếu (tuỳ chọn)" }), expect,
      h("small", { text: "Hoặc thả file .sha256, .md5, SHA256SUMS… cùng với file cần kiểm tra." })));
    return () => ({ algos: ALGOS.filter((a) => checks[a.id].checked).map((a) => a.id), expect: expect.value });
  },
  ready(items, o) {
    if (!items.some((i) => !i.list)) return "Thêm file cần tính checksum (file danh sách mã chỉ dùng để đối chiếu).";
    if (!o.algos.length) return "Chọn ít nhất một thuật toán.";
    return true;
  },
  async run(items, o, ctx) {
    const hw = await lib("hashwasm");
    const files = items.filter((i) => !i.list);
    const expected = [...items.filter((i) => i.list).flatMap((i) => i.list), ...parseChecksumList(o.expect)];
    // mã dán vào có độ dài lạ (không khớp thuật toán nào)
    const odd = o.expect.trim() && !parseChecksumList(o.expect).length && normHex(o.expect) && !guessAlgos(o.expect).length;
    const total = files.reduce((s, i) => s + i.size, 0) || 1;
    let done = 0;
    const rows = [];
    for (const it of files) {
      ctx.check();
      ctx.status(`Đang đọc ${it.name}…`);
      const hs = await Promise.all(o.algos.map(async (a) => { const x = await hw[MAKERS[a]](); x.init(); return [a, x]; }));
      const reader = it.file.stream().getReader();
      let read = 0, last = 0;
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        for (const [, x] of hs) x.update(value);
        read += value.length;
        if (read - last > 8 << 20) { last = read; ctx.progress((done + read) / total); await nextFrame(); if (ctx.signal.aborted) { reader.cancel(); ctx.check(); } }
      }
      done += it.size;
      ctx.progress(done / total);
      const hashes = Object.fromEntries(hs.map(([a, x]) => [a, x.digest("hex")]));
      rows.push({ name: it.name, size: it.size, hashes, check: expected.length ? verify(it.name, hashes, expected) : null });
    }
    const outs = o.algos.filter((a) => a !== "crc32").map((a) => ({
      blob: new Blob([formatGnu(rows, a)], { type: "text/plain" }),
      name: (rows.length === 1 ? rows[0].name : "checksums") + "." + a,
      note: algoName(a) + " · dùng được với lệnh " + a + "sum -c"
    }));
    if (!outs.length) outs.push({ blob: new Blob([rows.map((r) => `${r.hashes.crc32}  ${r.name}`).join("\n") + "\n"], { type: "text/plain" }), name: (rows.length === 1 ? rows[0].name : "checksums") + ".crc32", note: "CRC32" });
    outs[0].extra = report(rows, o.algos, odd);
    return outs;
  },
  doneTitle: (outs, items) => { const n = items.filter((i) => !i.list).length; return n > 1 ? `Đã tính checksum ${n} file` : "Đã tính checksum"; },
  summary: () => ""
});

function report(rows, algos, odd) {
  const box = h("div", { class: "ck-report" });
  const matched = rows.filter((r) => r.check && r.check.status === "match").length, bad = rows.filter((r) => r.check && r.check.status === "mismatch").length;
  if (bad) box.append(h("p", { class: "alert err", html: icon("triangle-alert") + `<span>${bad} file KHÔNG khớp mã mong đợi: file có thể bị hỏng khi tải, hoặc đã bị thay đổi. Đừng mở/cài đặt file này.</span>` }));
  else if (matched) box.append(h("p", { class: "alert ok", html: icon("circle-check") + `<span>${matched === rows.length ? (rows.length > 1 ? "Tất cả file" : "File") : matched + " file"} khớp mã mong đợi — nguyên vẹn.</span>` }));
  if (odd) box.append(h("p", { class: "alert warn", html: icon("triangle-alert") + "<span>Mã đã dán có độ dài không khớp thuật toán nào (MD5 = 32, SHA-1 = 40, SHA-256 = 64, SHA-512 = 128 ký tự hex). Kiểm tra lại có bị thiếu ký tự không.</span>" }));
  for (const r of rows) {
    const st = r.check && r.check.status;
    box.append(h("div", { class: "ck-file" + (st === "match" ? " ok" : st === "mismatch" ? " bad" : "") },
      h("div", { class: "ck-head" }, h("b", { text: r.name }), h("span", { class: "hint", text: fmtSize(r.size) }),
        st === "match" ? h("span", { class: "ck-badge ok", text: "Khớp " + algoName(r.check.algo) }) : st === "mismatch" ? h("span", { class: "ck-badge bad", text: "Không khớp " + algoName(r.check.algo) }) : null),
      algos.map((a) => h("div", { class: "hash-row" + (r.check && r.check.algo === a && st === "match" ? " match" : "") },
        h("span", { class: "hash-a", text: algoName(a) }), h("code", { class: "hash-v", text: r.hashes[a] }),
        h("button", { class: "ib sm", type: "button", "aria-label": "Sao chép " + algoName(a) + " của " + r.name, title: "Sao chép", html: icon("copy"), onclick: () => copyText(r.hashes[a], "Đã sao chép " + algoName(a)) }))),
      st === "mismatch" ? h("p", { class: "hint" }, "Mong đợi: ", h("code", { text: r.check.expected })) : null));
  }
  box.append(h("p", { class: "hint", text: "MD5, SHA-1 và CRC32 chỉ đủ để phát hiện lỗi tải về; để chắc chắn file không bị cố tình sửa, hãy so SHA-256 với mã do nhà phát hành công bố." }));
  return box;
}

const css = document.createElement("style");
css.textContent = `.ck-report{display:grid;gap:12px;margin-top:14px}
.ck-file{border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;gap:6px}
.ck-file.ok{border-color:color-mix(in srgb,var(--ok) 50%,var(--line))}.ck-file.bad{border-color:var(--err)}
.ck-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}.ck-head b{overflow-wrap:anywhere}
.ck-badge{font-size:12.5px;font-weight:700;padding:2px 8px;border-radius:99px}.ck-badge.ok{background:var(--ok-soft);color:var(--ok)}.ck-badge.bad{background:var(--err-soft);color:var(--err)}
.ck-file code{overflow-wrap:anywhere}`;
document.head.append(css);
