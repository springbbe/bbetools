/* So sánh văn bản: hai ô nhập (gõ, dán, mở hoặc kéo thả file TXT/PDF/Word/Excel), so theo dòng/từ/ký tự,
   tô màu phần thêm (xanh) và bớt (đỏ), tỉ lệ giống nhau, nhảy giữa các chỗ khác, xem song song hoặc gộp,
   gấp gọn đoạn giống nhau, sao chép hoặc tải bản so sánh (.html). */
import { $, h, icon, lib, store, debounce, fmtNum, toast, copyText, save, extOf, sampleFiles } from "../core.js";
import { diffText, similarity, lineStats } from "../lib/diff.js";
import { decodeText } from "../lib/bang.js";

const app = $("#app");
app.textContent = "";
const saved = store.get("tx:text-diff", {});
const o = Object.assign({ by: "line", view: innerWidth < 700 ? "inline" : "split", ignoreCase: false, ignoreSpace: false }, saved);

const SAMPLE_A = "HỢP ĐỒNG THUÊ NHÀ\nBên A: Ông Nguyễn Văn An\nBên B: Bà Trần Thị Bình\nGiá thuê: 5.000.000 đồng/tháng\nThời hạn: 12 tháng\nTiền cọc: 1 tháng\nThanh toán vào ngày 5 hằng tháng.\nHai bên cam kết thực hiện đúng hợp đồng.";
const SAMPLE_B = "HỢP ĐỒNG THUÊ NHÀ\nBên A: Ông Nguyễn Văn An\nBên B: Bà Trần Thị Bình\nGiá thuê: 5.500.000 đồng/tháng\nThời hạn: 24 tháng\nTiền cọc: 2 tháng\nThanh toán vào ngày 5 hằng tháng.\nBên B được nuôi thú cưng.\nHai bên cam kết thực hiện đúng hợp đồng.";
const MAX_FILE = 50 * 1024 * 1024;

/* ---------- Đọc chữ từ file (mọi thứ chạy trên máy) ---------- */
const fail = (msg) => { const e = new Error(msg); e.userMsg = msg; return e; };
async function pdfText(file) {
  const { openPdf } = await import("../pdf.js");
  const { itemsToText } = await import("../lib/pdf-text.js");
  const { doc, pages } = await openPdf(file);
  const out = [];
  for (let n = 1; n <= pages; n++) {
    const page = await doc.getPage(n);
    out.push(itemsToText((await page.getTextContent()).items));
    page.cleanup();
  }
  doc.destroy();
  const text = out.join("\n\n");
  if (!text.replace(/\s/g, "")) throw fail(`${file.name} không có lớp chữ (có thể là PDF scan). Hãy dùng công cụ Ảnh sang chữ (OCR) trước.`);
  return text;
}
async function docxText(file) {
  const JSZip = await lib("jszip");
  const { xmlText } = await import("../lib/tron-thu.js");
  let z;
  try { z = await JSZip.loadAsync(await file.arrayBuffer()); } catch (_) { throw fail(`${file.name} không phải file Word .docx hợp lệ.`); }
  const doc = z.file("word/document.xml");
  if (!doc) throw fail(`${file.name} không có nội dung Word.`);
  return xmlText(await doc.async("string"));
}
async function sheetText(file) {
  const { readBook, cellText } = await import("../sheet.js");
  const book = await readBook(file);
  const sheets = book.sheets.filter((s) => !s.hidden && s.rows.length);
  return sheets.map((s) => (sheets.length > 1 ? `### ${s.name}\n` : "") + s.rows.map((r) => r.map(cellText).join("\t")).join("\n")).join("\n\n");
}
async function readText(file) {
  if (file.size > MAX_FILE) throw fail(`${file.name} quá lớn (tối đa 50 MB).`);
  const ext = extOf(file.name);
  if (ext === "pdf" || file.type === "application/pdf") return pdfText(file);
  if (ext === "docx") return docxText(file);
  if (ext === "doc") throw fail(`${file.name} là file Word cũ (.doc). Hãy mở bằng Word và lưu lại dạng .docx.`);
  if (["xlsx", "xlsm", "xls", "ods"].includes(ext)) return sheetText(file);
  const { text } = decodeText(new Uint8Array(await file.arrayBuffer()));
  const bad = (text.slice(0, 20000).match(/[\u0000\uFFFD]/g) || []).length;
  if (bad > 4) throw fail(`Không đọc được chữ trong ${file.name}. Chỉ nhận file văn bản (TXT, mã nguồn, CSV…), PDF, Word (.docx), Excel.`);
  return text.replace(/\r\n?/g, "\n");
}

/* ---------- Hai ô nhập ---------- */
const box = (id, label, ph) => {
  const ta = h("textarea", { id, placeholder: ph, spellcheck: "false", autocapitalize: "off" });
  const file = h("input", { type: "file", hidden: true });
  const name = h("span", { class: "df-file", hidden: true });
  const cnt = h("span", { class: "cnt" });
  const self = { ta, name, cnt, label };
  const pane = h("div", { class: "pane df-in" },
    h("div", { class: "pane-head" }, h("label", { class: "lbl", for: id, text: label }), name, cnt,
      h("button", { class: "ib sm", type: "button", "aria-label": "Mở file cho ô " + label, title: "Mở file (TXT, PDF, Word, Excel…)", html: icon("upload"), onclick: () => file.click() }),
      h("button", { class: "ib sm", type: "button", "aria-label": "Xoá " + label, title: "Xoá", html: icon("trash-2"), onclick: () => { setText(self, ""); ta.focus(); } })),
    ta, file);
  file.addEventListener("change", () => { if (file.files[0]) load(self, file.files[0]); file.value = ""; });
  // kéo thả file vào đúng ô
  let depth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  pane.addEventListener("dragenter", (e) => { if (hasFiles(e)) { depth++; pane.classList.add("drop"); } });
  pane.addEventListener("dragleave", (e) => { if (hasFiles(e) && --depth <= 0) { depth = 0; pane.classList.remove("drop"); } });
  pane.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
  pane.addEventListener("drop", (e) => {
    depth = 0; pane.classList.remove("drop");
    if (!hasFiles(e)) return;
    e.preventDefault(); e.stopPropagation();
    const fs = [...e.dataTransfer.files];
    if (fs.length > 1 && self === A) { load(A, fs[0]); load(B, fs[1]); } else if (fs[0]) load(self, fs[0]);
  });
  self.pane = pane;
  return self;
};
const A = box("df-a", "Bản gốc", "Dán văn bản cũ, hoặc kéo thả file vào đây…");
const B = box("df-b", "Bản mới", "Dán văn bản mới, hoặc kéo thả file vào đây…");

function setText(side, text, fileName) {
  side.ta.value = text;
  side.name.hidden = !fileName;
  side.name.textContent = fileName || "";
  side.name.title = fileName || "";
  run();
}
async function load(side, file) {
  side.ta.disabled = true;
  const ph = side.ta.placeholder;
  side.ta.placeholder = `Đang đọc ${file.name}…`;
  const old = side.ta.value;
  side.ta.value = "";
  try { setText(side, await readText(file), file.name); }
  catch (e) { side.ta.value = old; if (!e.locked) toast(e.userMsg || `Không đọc được ${file.name}.`, { type: "err" }); run(); }
  finally { side.ta.disabled = false; side.ta.placeholder = ph; }
}
// thả file ra ngoài hai ô: lần lượt điền ô còn trống; hai file thì mỗi ô một file
document.addEventListener("dragover", (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
document.addEventListener("drop", (e) => {
  if (!e.dataTransfer || !e.dataTransfer.files.length) return;
  e.preventDefault();
  const fs = [...e.dataTransfer.files];
  if (fs.length > 1) { load(A, fs[0]); load(B, fs[1]); }
  else load(!A.ta.value ? A : B, fs[0]);
});

/* ---------- Tuỳ chọn ---------- */
const sel = (id, label, choices) => h("label", { class: "field" }, h("span", { text: label }),
  h("select", { onchange: (e) => { o[id] = e.target.value; run(); } }, choices.map(([v, l]) => h("option", { value: v, text: l, selected: o[id] === v }))));
const chk = (id, label) => h("label", { class: "switch" }, h("input", { type: "checkbox", checked: o[id], onchange: (e) => { o[id] = e.target.checked; run(); } }), h("span", { text: label }));
const viewSel = sel("view", "Cách xem", [["split", "Song song"], ["inline", "Gộp một cột"]]);
const btn = (ic, text, onclick, title) => h("button", { class: "btn ghost sm", type: "button", title, onclick }, h("span", { html: icon(ic), style: { display: "contents" } }), text);

const opts = h("div", { class: "tx-opts" },
  sel("by", "So sánh theo", [["line", "Dòng"], ["word", "Từ"], ["char", "Ký tự"]]), viewSel,
  chk("ignoreCase", "Bỏ qua hoa/thường"), chk("ignoreSpace", "Bỏ qua khoảng trắng"),
  h("button", { class: "btn ghost sm", type: "button", onclick: () => { setText(A, SAMPLE_A); setText(B, SAMPLE_B); } }, "Mẫu"),
  btn("file-text", "2 file PDF mẫu", async () => { const [a, b] = await sampleFiles("bao-cao-quy-1.pdf", "bao-cao-quy-2.pdf"); load(A, a); load(B, b); }, "So sánh bao-cao-quy-1.pdf với bao-cao-quy-2.pdf"),
  btn("arrow-left-right", "Đổi hai bên", () => {
    const [ta, tb, na, nb] = [A.ta.value, B.ta.value, A.name.textContent, B.name.textContent];
    setText(A, tb, nb); setText(B, ta, na);
  }),
  btn("eraser", "Xoá cả hai", () => { setText(A, ""); setText(B, ""); A.ta.focus(); }));

/* ---------- Kết quả ---------- */
const stat = h("p", { class: "tx-info df-stat", "aria-live": "polite" });
const result = h("div", { class: "df-out" });
const pos = h("span", { class: "cnt df-pos" });
const navPrev = h("button", { class: "ib sm", type: "button", "aria-label": "Chỗ khác trước", title: "Chỗ khác trước (Alt + ↑)", html: icon("arrow-up"), onclick: () => go(-1) });
const navNext = h("button", { class: "ib sm", type: "button", "aria-label": "Chỗ khác tiếp theo", title: "Chỗ khác tiếp theo (Alt + ↓)", html: icon("arrow-down"), onclick: () => go(1) });
const nav = h("span", { class: "df-nav", hidden: true }, pos, navPrev, navNext);
app.append(opts, h("div", { class: "tx-panes two" }, A.pane, B.pane),
  h("div", { class: "pane df-pane" }, h("div", { class: "pane-head" }, h("span", { class: "lbl", text: "Khác biệt" }), nav,
    h("button", { class: "ib sm", type: "button", "aria-label": "Sao chép bản so sánh", title: "Sao chép bản so sánh (dạng văn bản)", html: icon("copy"), onclick: copyReport }),
    h("button", { class: "ib sm", type: "button", "aria-label": "Tải bản so sánh (.html)", title: "Tải bản so sánh (.html, mở bằng trình duyệt rồi in hoặc lưu PDF)", html: icon("download"), onclick: downloadReport })),
  stat, result));

let last = null, cur = -1;
function copyReport() {
  if (!last) return toast("Chưa có gì để sao chép");
  const lines = [];
  for (const p of last.parts) {
    const text = p.items.join("");
    const mark = p.op === "=" ? "  " : p.op === "-" ? "- " : "+ ";
    if (o.by === "line") for (const l of text.replace(/\n$/, "").split("\n")) lines.push(mark + l);
    else lines.push(p.op === "=" ? text : p.op === "-" ? `[-${text}-]` : `{+${text}+}`);
  }
  copyText(o.by === "line" ? lines.join("\n") : lines.join(""));
}

const span = (cls, text) => (cls ? h(cls, null, text) : document.createTextNode(text));
const strip = (l) => l.replace(/\n$/, "");
/** Tô từ thay đổi trong một cặp dòng bị sửa */
function wordPair(oldText, newText) {
  const r = diffText(oldText, newText, { by: "word", ignoreCase: o.ignoreCase, ignoreSpace: o.ignoreSpace });
  const left = [], right = [];
  for (const p of r.parts) {
    const t = p.items.join("");
    if (p.op === "=") { left.push(span(null, t)); right.push(span(null, (p.right || p.items).join(""))); }
    else if (p.op === "-") left.push(span("del", t));
    else right.push(span("ins", t));
  }
  return [left, right];
}

/** Đánh dấu phần tử đầu của mỗi chỗ khác để nhảy tới */
const hunk = (el, n) => { el.dataset.hunk = n; return el; };

function renderInline(parts, fold) {
  const out = h("div", { class: "df-inline" + (o.by === "line" ? " lines" : "") });
  let n = 0;
  if (o.by !== "line") {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.op === "=") { out.append(span(null, p.items.join(""))); continue; }
      const first = span(p.op === "-" ? "del" : "ins", p.items.join(""));
      out.append(i > 0 && parts[i - 1].op !== "=" ? first : hunk(first, n++));
    }
    return out;
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], nx = parts[i + 1];
    if (p.op === "=") { equalBlock(out, p.items, (l) => h("div", { class: "df-l" }, h("span", { class: "df-m", text: " " }), l), fold); continue; }
    const rows = [];
    if (p.op === "-" && nx && nx.op === "+" && p.items.length === nx.items.length && p.items.length <= 50) {
      p.items.forEach((l, k) => {
        const [left, right] = wordPair(strip(l), strip(nx.items[k]));
        rows.push(h("div", { class: "df-l del" }, h("span", { class: "df-m", text: "−" }), ...left), h("div", { class: "df-l ins" }, h("span", { class: "df-m", text: "+" }), ...right));
      });
      i++;
    } else {
      const add = (q) => { for (const l of q.items) rows.push(h("div", { class: "df-l " + (q.op === "-" ? "del" : "ins") }, h("span", { class: "df-m", text: q.op === "-" ? "−" : "+" }), strip(l))); };
      add(p);
      if (p.op === "-" && nx && nx.op === "+") { add(nx); i++; }
    }
    hunk(rows[0], n++);
    out.append(...rows);
  }
  return out;
}

/** Đoạn giống nhau dài: chỉ hiện 3 dòng đầu/cuối, phần giữa gấp lại (bấm để mở) */
function equalBlock(out, items, row, fold = true) {
  const lines = items.map(strip);
  if (!fold || lines.length <= 8) { lines.forEach((l) => out.append(row(l))); return; }
  lines.slice(0, 3).forEach((l) => out.append(row(l)));
  const hidden = lines.slice(3, -3);
  const b = h("button", { class: "df-fold", type: "button" }, `… ${fmtNum(hidden.length)} dòng giống nhau (bấm để xem)`);
  b.onclick = () => { const frag = document.createDocumentFragment(); hidden.forEach((l) => frag.append(row(l))); b.replaceWith(frag); };
  out.append(b);
  lines.slice(-3).forEach((l) => out.append(row(l)));
}

function renderSplit(parts, fold) {
  const grid = h("div", { class: "df-split", role: "table", "aria-label": "So sánh song song" });
  let la = 0, lb = 0, n = 0;
  const cell = (num, cls, kids) => [h("span", { class: "df-n", role: "cell", text: num == null ? "" : String(num) }), h("span", { class: "df-c " + (cls || ""), role: "cell" }, kids)];
  const mk = (l, r) => h("div", { class: "df-row", role: "row" }, ...l, ...r);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], nx = parts[i + 1];
    if (p.op === "=") { equalBlock(grid, p.items, (l) => mk(cell(++la, "", l), cell(++lb, "", l)), fold); continue; }
    const rows = [];
    if (p.op === "-" && nx && nx.op === "+") {
      const len = Math.max(p.items.length, nx.items.length);
      for (let k = 0; k < len; k++) {
        const a = p.items[k], b = nx.items[k];
        if (a != null && b != null && p.items.length <= 200) {
          const [left, right] = wordPair(strip(a), strip(b));
          rows.push(mk(cell(++la, "del", left), cell(++lb, "ins", right)));
        } else rows.push(mk(a != null ? cell(++la, "del", strip(a)) : cell(null, "empty", ""), b != null ? cell(++lb, "ins", strip(b)) : cell(null, "empty", "")));
      }
      i++;
    } else for (const l of p.items) rows.push(p.op === "-" ? mk(cell(++la, "del", strip(l)), cell(null, "empty", "")) : mk(cell(null, "empty", ""), cell(++lb, "ins", strip(l))));
    hunk(rows[0], n++);
    grid.append(...rows);
  }
  return grid;
}
const render = (parts, fold = true) => (o.by === "line" && o.view === "split" ? renderSplit(parts, fold) : renderInline(parts, fold));

/* ---------- Nhảy giữa các chỗ khác ---------- */
const hunks = () => [...result.querySelectorAll("[data-hunk]")];
function go(step) {
  const list = hunks();
  if (!list.length) return;
  cur = (cur + step + list.length) % list.length;
  result.querySelectorAll(".df-cur").forEach((x) => x.classList.remove("df-cur"));
  const el = list[cur];
  el.classList.add("df-cur");
  el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  pos.textContent = `${fmtNum(cur + 1)}/${fmtNum(list.length)}`;
}
document.addEventListener("keydown", (e) => {
  if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
  if (!hunks().length) return;
  e.preventDefault();
  go(e.key === "ArrowDown" ? 1 : -1);
});

/* ---------- Tải bản so sánh (.html tự chứa, in hoặc lưu PDF được) ---------- */
const REPORT_CSS = `body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d2433;background:#fff;margin:24px}
h1{font-size:20px;margin:0 0 4px}p{margin:4px 0 14px;color:#555}.files{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-weight:600}
ins{background:#b7ecc5;text-decoration:none;border-radius:3px}del{background:#f7c1c1;border-radius:3px}
.df-inline{white-space:pre-wrap;word-break:break-word}.df-inline.lines{font:13px/1.5 ui-monospace,Menlo,Consolas,monospace}
.df-l{white-space:pre-wrap;display:flex;gap:8px;min-height:1.5em}.df-l.del{background:#fdecec}.df-l.ins{background:#e8f8ec}.df-l del,.df-l ins,.df-c del,.df-c ins{text-decoration:none}
.df-m{flex:0 0 18px;text-align:center;color:#888}
.df-split{font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;border:1px solid #ddd;border-radius:8px;overflow:hidden}
.df-row{display:grid;grid-template-columns:36px minmax(0,1fr) 36px minmax(0,1fr);break-inside:avoid}.df-row+.df-row{border-top:1px solid #eee}
.df-n{text-align:right;padding:1px 6px;color:#888;background:#f5f6f8}.df-c{padding:1px 8px;white-space:pre-wrap;word-break:break-word}
.df-c.del{background:#fdecec}.df-c.ins{background:#e8f8ec}.df-c.empty{background:#f5f6f8}
@media print{body{margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
function downloadReport() {
  if (!last) return toast("Chưa có gì để tải");
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const nameA = A.name.textContent || "Bản gốc", nameB = B.name.textContent || "Bản mới";
  const html = `<!doctype html><html lang="${document.documentElement.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc("So sánh văn bản")}: ${esc(nameA)} ↔ ${esc(nameB)}</title><style>${REPORT_CSS}</style></head><body>
<h1>${esc("So sánh văn bản")}</h1><p>${esc(stat.textContent)} · ${esc(new Date().toLocaleString(document.documentElement.lang === "vi" ? "vi-VN" : undefined))} · BbeTools</p>
<div class="files"><div>− ${esc(nameA)}</div><div>+ ${esc(nameB)}</div></div>
${render(last.parts, false).outerHTML}</body></html>`;
  save(new Blob([html], { type: "text/html;charset=utf-8" }), "so-sanh-van-ban.html");
}

/* ---------- Chạy so sánh ---------- */
const count = (s) => (s ? `${fmtNum(s.split("\n").length - (s.endsWith("\n") ? 1 : 0))} dòng · ${fmtNum([...s].length)} ký tự` : "");
const persist = debounce(() => store.set("tx:text-diff", o), 300);
function run() {
  persist();
  viewSel.hidden = o.by !== "line";
  result.textContent = "";
  stat.textContent = "";
  cur = -1;
  const a = A.ta.value, b = B.ta.value;
  A.cnt.textContent = count(a); B.cnt.textContent = count(b);
  if (!a && !b) { stat.textContent = "Dán hai bản văn bản vào hai ô (hoặc mở, kéo thả file TXT, PDF, Word, Excel) để so sánh."; last = null; nav.hidden = true; return; }
  const t0 = performance.now();
  const r = diffText(a, b, o);
  last = r;
  // tỉ lệ giống nhau tính theo từ (so theo dòng thì một chữ khác cũng làm cả dòng "khác")
  const sim = o.by !== "line" ? similarity(r.parts) : a.length + b.length < 300000 ? similarity(diffText(a, b, { by: "word", ignoreCase: o.ignoreCase, ignoreSpace: o.ignoreSpace }).parts) : similarity(r.parts);
  const pct = sim === 1 || sim === 0 ? fmtNum(sim * 100) : fmtNum(Math.min(99.9, Math.max(0.1, sim * 100)), 1);
  if (!r.added && !r.removed) {
    stat.append(h("b", { text: "Hai văn bản giống hệt nhau" }), o.ignoreCase || o.ignoreSpace ? " (theo tuỳ chọn bỏ qua đang bật)." : ".");
  } else {
    stat.append(h("b", { class: "df-sim", text: `Giống ${pct}%` }), " · ");
    if (o.by === "line") {
      const s = lineStats(r.parts);
      stat.append(`${fmtNum(s.hunks)} chỗ khác: `, h("span", { class: "df-chg", text: `${fmtNum(s.changed)} dòng sửa` }), ", ",
        h("span", { class: "df-plus", text: `+${fmtNum(s.added)} thêm` }), ", ", h("span", { class: "df-minus", text: `−${fmtNum(s.removed)} bớt` }));
    } else {
      const unit = o.by === "word" ? "từ" : "ký tự";
      stat.append(h("span", { class: "df-plus", text: `+${fmtNum(r.added)}` }), " ", h("span", { class: "df-minus", text: `−${fmtNum(r.removed)}` }), ` ${unit}`);
    }
    stat.append(` · ${fmtNum(Math.round(performance.now() - t0))} ms`);
  }
  result.append(render(r.parts));
  const n = hunks().length;
  nav.hidden = !n;
  pos.textContent = n ? `${fmtNum(n)} chỗ` : "";
}
const runSoon = debounce(run, 250);
A.ta.addEventListener("input", runSoon);
B.ta.addEventListener("input", runSoon);
run();
