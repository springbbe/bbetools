/* Trộn thư: danh sách Excel/CSV + mẫu Word (.docx) có trường {{Tên cột}}, «Tên cột» hoặc MERGEFIELD của Word
   → mỗi dòng một file .docx (gói .zip) hoặc một file .docx gộp để in một lần; hoặc mẫu văn bản gõ tay → PDF / TXT. */
import { h, icon, lib, sampleFiles, fmtNum, extOf, baseName, toast } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { readBook, cellText, XL } from "../sheet.js";
import { fileNames } from "../lib/bang.js";
import { lookup, fillText, fillXml, xmlFields, xmlText, findFields, combineDocuments, wrapText } from "../lib/tron-thu.js";
import { embedVnFont } from "../pdf.js";

const PART = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const isDocx = (it) => extOf(it.name) === "docx";

let F = null, sig = "", rec = 0;
let modeBox, sheetField, sheetSel, tplArea, chips, fieldsBox, nameSel, prefixIn, outDocx, outText, previewBox;

/* ---------- đọc file ---------- */
async function load(it) {
  if (isDocx(it)) {
    const JSZip = await lib("jszip");
    let z;
    try { z = await JSZip.loadAsync(await it.file.arrayBuffer()); } catch (_) { const e = new Error("docx"); e.userMsg = `${it.name} không phải file Word .docx hợp lệ.`; throw e; }
    if (!z.file("word/document.xml")) { const e = new Error("docx"); e.userMsg = `${it.name} không có nội dung Word (word/document.xml). Nếu là file .doc cũ, hãy mở bằng Word và lưu lại dạng .docx.`; throw e; }
    it.parts = {};
    for (const name of Object.keys(z.files)) if (PART.test(name)) it.parts[name] = await z.file(name).async("string");
    it.fields = [...new Set(Object.values(it.parts).flatMap(xmlFields))];
    it.info = `Mẫu Word · ${it.fields.length ? it.fields.length + " trường: " + it.fields.slice(0, 4).join(", ") + (it.fields.length > 4 ? "…" : "") : "chưa có trường nào"}`;
  } else {
    it.book = await readBook(it.file);
    const s = it.book.sheets.find((x) => x.rows.length);
    it.info = `Danh sách · ${fmtNum(s ? s.rows.length - 1 : 0)} dòng${it.book.sheets.length > 1 ? ", " + it.book.sheets.length + " sheet" : ""}`;
  }
}

/* ---------- dữ liệu đang dùng ---------- */
const dataItem = () => F.items.find((i) => i.book);
const tplItem = () => F.items.find((i) => i.parts);
const mode = () => radioVal(modeBox, "src");
function table() {
  const d = dataItem();
  if (!d) return null;
  const s = d.book.sheets[+sheetSel.value] || d.book.sheets.find((x) => x.rows.length);
  if (!s || !s.rows.length) return null;
  const head = s.rows[0].map((c) => cellText(c).trim());
  const body = s.rows.slice(1).filter((r) => r.some((c) => cellText(c).trim() !== ""));
  return { head, body, getter: (r) => lookup(head, r, cellText) };
}
const tplFields = () => (mode() === "docx" ? (tplItem() ? tplItem().fields : []) : findFields(tplArea.value));

/* ---------- giao diện tuỳ chọn ---------- */
function insertField(name) {
  const t = tplArea, a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a;
  t.value = t.value.slice(0, a) + "{{" + name + "}}" + t.value.slice(b);
  t.focus(); t.selectionStart = t.selectionEnd = a + name.length + 4;
  F.refresh();
}

function rebuild() {
  const d = dataItem(), tb = table();
  // sheet
  const prevSheet = sheetSel.value;
  sheetSel.textContent = "";
  if (d) d.book.sheets.forEach((s, i) => { if (s.rows.length) sheetSel.append(h("option", { value: i, text: `${s.name} (${fmtNum(s.rows.length - 1)} dòng)` })); });
  if ([...sheetSel.options].some((x) => x.value === prevSheet)) sheetSel.value = prevSheet;
  sheetField.hidden = !d || sheetSel.options.length < 2;
  // cột đặt tên file: ưu tiên cột có chữ "tên"
  const prev = nameSel.value;
  nameSel.textContent = "";
  nameSel.append(h("option", { value: "-1", text: "Số thứ tự (1, 2, 3…)" }));
  if (tb) tb.head.forEach((x, j) => nameSel.append(h("option", { value: j, text: x || "Cột " + (j + 1) })));
  if (prev && [...nameSel.options].some((o) => o.value === prev) && prev !== "-1") nameSel.value = prev;
  else if (tb) { const j = tb.head.findIndex((x) => /t[eê]n/i.test(x) && !/đơn vị|công ty/i.test(x)); nameSel.value = String(j >= 0 ? j : 0); }
  // nút chèn trường cho mẫu gõ tay
  chips.textContent = "";
  if (tb) chips.append(h("span", { class: "hint", text: "Chèn trường:" }), ...tb.head.filter(Boolean).map((x) => h("button", { class: "chip", type: "button", onclick: () => insertField(x) }, x)));
  if (tb && mode() === "text" && !tplArea.value.trim()) {
    tplArea.value = `Kính gửi {{${tb.head[nameSel.value] || tb.head[0]}}},\n\n(Nội dung thư. Bấm tên cột ở trên để chèn trường vào chỗ con trỏ.)\n\nTrân trọng.`;
  }
}

function report() {
  const tb = table(), fields = tplFields();
  fieldsBox.textContent = "";
  if (!tb || !fields.length) return;
  const ok = fields.filter((f) => lookup(tb.head, tb.head)(f) !== undefined);
  const bad = fields.filter((f) => !ok.includes(f));
  fieldsBox.append(h("p", { class: "opt-title", text: `Trường trong mẫu (${ok.length}/${fields.length} khớp cột)` }),
    h("ul", { class: "chip-list mm-fields" }, fields.map((f) => h("li", { class: "chip" + (ok.includes(f) ? "" : " bad"), title: ok.includes(f) ? "Có cột tương ứng" : "Không có cột nào tên như vậy: giữ nguyên trong kết quả" },
      h("span", { html: icon(ok.includes(f) ? "check" : "x"), style: { display: "contents" } }), f))));
  if (bad.length) fieldsBox.append(h("p", { class: "alert warn", html: icon("triangle-alert") + "<span></span>" }));
  if (bad.length) fieldsBox.lastChild.lastChild.textContent = `Không thấy cột: ${bad.join(", ")}. Hãy đặt tên cột trong file danh sách giống tên trường (không phân biệt hoa thường, có dấu hay không).`;
}

function preview() {
  const tb = table();
  previewBox.textContent = "";
  if (!tb || !tb.body.length) return;
  if (mode() === "docx" && !tplItem()) return;
  if (mode() === "text" && !tplArea.value.trim()) return;
  rec = Math.max(0, Math.min(rec, tb.body.length - 1));
  const get = tb.getter(tb.body[rec]);
  const text = mode() === "docx" ? xmlText(fillXml(tplItem().parts["word/document.xml"], get).xml) : fillText(tplArea.value, get).text;
  previewBox.append(h("div", { class: "row mm-nav" },
    h("p", { class: "opt-title", text: "Xem trước" }),
    h("button", { class: "ib sm", type: "button", "aria-label": "Dòng trước", html: icon("chevron-left"), disabled: rec === 0, onclick: () => { rec--; preview(); } }),
    h("span", { text: `${rec + 1} / ${tb.body.length}` }),
    h("button", { class: "ib sm", type: "button", "aria-label": "Dòng sau", html: icon("chevron-right"), disabled: rec >= tb.body.length - 1, onclick: () => { rec++; preview(); } })),
    h("div", { class: "mm-paper", tabindex: "0", text }),
    mode() === "docx" ? h("small", { class: "hint", text: "Chỉ xem phần chữ; định dạng, bảng, ảnh của mẫu Word được giữ nguyên trong file kết quả." }) : "");
}

/* ---------- tạo PDF từ mẫu gõ tay ---------- */
async function textPdf(texts, ctx) {
  const P = await lib("pdflib");
  const doc = await P.PDFDocument.create();
  const font = await embedVnFont(doc);
  const mm = 72 / 25.4, W = 210 * mm, H = 297 * mm, M = 22 * mm, size = 12, lh = size * 1.55;
  const measure = (s, fs = size) => font.widthOfTextAtSize(s, fs);
  for (let i = 0; i < texts.length; i++) {
    ctx.check();
    let page = doc.addPage([W, H]), y = H - M;
    for (const para of texts[i].replace(/\r\n?/g, "\n").split("\n")) {
      const head = /^#\s+/.test(para);
      const fs = head ? 16 : size;
      const lines = wrapText(head ? para.replace(/^#\s+/, "") : para.replace(/\t/g, "    "), W - 2 * M, (s) => measure(s, fs));
      for (const line of lines) {
        if (y - fs < M) { page = doc.addPage([W, H]); y = H - M; }
        y -= head ? fs * 1.6 : lh;
        const x = head ? (W - measure(line, fs)) / 2 : M;
        if (line) page.drawText(line, { x, y, size: fs, font, color: P.rgb(0.1, 0.1, 0.1) });
      }
      if (head) y -= 6;
    }
    if (i % 10 === 9) { ctx.progress((i + 1) / texts.length); await new Promise((r) => setTimeout(r, 0)); }
  }
  return new Blob([await doc.save()], { type: "application/pdf" });
}

fileTool({
  accept: ["excel", "csv", "docx"], multiple: true, noun: "file danh sách (Excel/CSV) và mẫu Word",
  pickLabel: "Chọn file",
  action: "Trộn thư",
  sample: () => sampleFiles("khach-moi.xlsx", "giay-moi-mau.docx"),
  warm: () => Promise.all([XL(), lib("jszip")]),
  load,
  options(el, ctx) {
    F = ctx;
    modeBox = seg("src", [["docx", "Mẫu Word (.docx)"], ["text", "Gõ mẫu văn bản"]], "docx", "Mẫu thư");
    sheetSel = h("select", { id: "mm-sheet" });
    sheetField = h("div", { class: "field", hidden: true }, h("label", { for: "mm-sheet", text: "Sheet danh sách" }), sheetSel);
    tplArea = h("textarea", { id: "mm-tpl", class: "textarea", rows: 8, spellcheck: "true", placeholder: "Kính gửi {{Họ tên}},\n\n…\n\nDòng bắt đầu bằng # là tiêu đề căn giữa." });
    chips = h("div", { class: "chip-list mm-chips" });
    fieldsBox = h("div", { class: "opt-group" });
    nameSel = h("select", { id: "mm-name" });
    prefixIn = h("input", { id: "mm-prefix", type: "text", value: "", placeholder: "Ví dụ: Giấy mời - ", autocomplete: "off" });
    outDocx = seg("outd", [["zip", "Từng file (.zip)"], ["one", "Gộp 1 file để in"]], "zip", "Kết quả");
    outText = seg("outt", [["pdf", "1 PDF gộp"], ["pdfs", "Mỗi dòng 1 PDF"], ["txt", "Mỗi dòng 1 TXT"]], "pdf", "Kết quả");
    previewBox = h("div", { class: "opt-group mm-prev" });
    el.append(modeBox, sheetField,
      h("div", { class: "opt-group", "data-mode": "text" }, h("div", { class: "field" }, h("label", { for: "mm-tpl", text: "Mẫu văn bản" }), tplArea), chips),
      h("p", { class: "hint", "data-mode": "docx", html: "Trong file Word, gõ tên cột trong ngoặc nhọn kép như <code>{{Họ tên}}</code> (hoặc dùng trường Mail Merge sẵn có của Word). Định dạng chữ đặt cho cả trường sẽ được giữ." }),
      fieldsBox,
      h("div", { class: "opt-group" }, h("div", { class: "field" }, h("label", { for: "mm-name", text: "Đặt tên file theo cột" }), nameSel),
        h("div", { class: "field" }, h("label", { for: "mm-prefix", text: "Chữ thêm vào đầu tên file" }), prefixIn)),
      h("div", { "data-mode": "docx" }, outDocx), h("div", { "data-mode": "text" }, outText),
      previewBox);
    return () => ({ src: mode(), outd: radioVal(outDocx, "outd"), outt: radioVal(outText, "outt"), nameCol: +nameSel.value, prefix: prefixIn.value });
  },
  onChange(ctx) {
    const m = mode();
    ctx.optsEl.querySelectorAll("[data-mode]").forEach((x) => { x.hidden = x.dataset.mode !== m; });
    const s = ctx.items.map((i) => i.id + (i.loading ? "l" : "")).join(",") + "|" + m + "|" + sheetSel.value;
    if (s !== sig) { sig = s; rebuild(); }
    report();
    preview();
  },
  ready(items, o) {
    const datas = items.filter((i) => i.book), tpls = items.filter((i) => i.parts);
    if (datas.length > 1) return "Chỉ dùng một file danh sách: hãy bỏ bớt.";
    if (tpls.length > 1) return "Chỉ dùng một mẫu Word: hãy bỏ bớt.";
    if (!datas.length) return "Thêm file danh sách Excel hoặc CSV (dòng đầu là tên cột).";
    const tb = table();
    if (!tb || !tb.body.length) return "File danh sách chưa có dòng dữ liệu nào.";
    if (o.src === "docx" && !tpls.length) return "Thêm file mẫu Word (.docx), hoặc chọn “Gõ mẫu văn bản”.";
    if (o.src === "text" && !tplArea.value.trim()) return "Gõ mẫu văn bản.";
    if (!tplFields().length) return "Mẫu chưa có trường nào, ví dụ {{Họ tên}}.";
    return true;
  },
  async run(items, o, ctx) {
    const tb = table();
    const n = tb.body.length;
    const keys = tb.body.map((r, i) => o.prefix + (o.nameCol >= 0 ? cellText(r[o.nameCol]).trim() || String(i + 1) : String(i + 1).padStart(String(n).length, "0")));
    const missing = new Set();
    const tick = async (i) => { ctx.check(); ctx.progress((i + 1) / n); if (i % 5 === 4) await new Promise((r) => setTimeout(r, 0)); };
    let outs;
    if (o.src === "docx") {
      const JSZip = await lib("jszip");
      const tpl = tplItem();
      const z = await JSZip.loadAsync(await tpl.file.arrayBuffer());
      const fill = (xml, r) => { const res = fillXml(xml, tb.getter(r)); res.missing.forEach((m) => missing.add(m)); return res.xml; };
      if (o.outd === "one") {
        ctx.status(`Đang trộn ${fmtNum(n)} bản…`);
        const docs = [];
        for (let i = 0; i < n; i++) { docs.push(fill(tpl.parts["word/document.xml"], tb.body[i])); await tick(i); }
        z.file("word/document.xml", combineDocuments(docs));
        // đầu trang, chân trang dùng chung: điền theo dòng đầu tiên
        for (const [name, xml] of Object.entries(tpl.parts)) if (name !== "word/document.xml") z.file(name, fill(xml, tb.body[0]));
        ctx.status("Đang nén file Word…");
        const blob = await z.generateAsync({ type: "blob", mimeType: DOCX, compression: "DEFLATE" });
        outs = [{ blob, name: baseName(tpl.name) + ` - ${n} ban.docx`, note: `${fmtNum(n)} bản, mỗi bản một trang mới` }];
      } else {
        const names = fileNames(keys, "docx");
        outs = [];
        for (let i = 0; i < n; i++) {
          ctx.status(`Đang tạo ${i + 1}/${n}: ${names[i]}`);
          for (const [name, xml] of Object.entries(tpl.parts)) z.file(name, fill(xml, tb.body[i]));
          outs.push({ blob: await z.generateAsync({ type: "blob", mimeType: DOCX, compression: "DEFLATE" }), name: names[i] });
          await tick(i);
        }
      }
    } else {
      const texts = tb.body.map((r) => { const res = fillText(tplArea.value, tb.getter(r)); res.missing.forEach((m) => missing.add(m)); return res.text; });
      if (o.outt === "txt") {
        const names = fileNames(keys, "txt");
        outs = texts.map((t, i) => ({ blob: new Blob(["\ufeff" + t.replace(/\r?\n/g, "\r\n")], { type: "text/plain;charset=utf-8" }), name: names[i] }));
      } else if (o.outt === "pdf") {
        ctx.status(`Đang tạo PDF ${fmtNum(n)} trang…`);
        outs = [{ blob: await textPdf(texts, ctx), name: `tron-thu-${n}-ban.pdf`, note: `${fmtNum(n)} bản` }];
      } else {
        const names = fileNames(keys, "pdf");
        outs = [];
        for (let i = 0; i < n; i++) { ctx.status(`Đang tạo ${i + 1}/${n}: ${names[i]}`); outs.push({ blob: await textPdf([texts[i]], ctx), name: names[i] }); await tick(i); }
      }
    }
    if (missing.size) toast(`Không có cột cho trường: ${[...missing].join(", ")} (giữ nguyên trong kết quả).`, { type: "err" });
    return outs;
  },
  zipName: "tron-thu",
  summary: (outs) => (outs.length > 1 ? `${outs.length} file, đặt tên theo cột đã chọn.` : null),
  doneTitle: (outs) => (outs.length > 1 ? `Đã tạo ${outs.length} file!` : "Đã trộn xong!")
});

const css = document.createElement("style");
css.textContent = `
.mm-chips{gap:6px;margin-top:6px;align-items:center}
.mm-chips .chip,.mm-fields .chip{font-size:13px;padding:4px 10px;min-height:0}
.mm-fields{gap:6px;margin:4px 0 0}
.mm-fields .chip .i{width:14px;height:14px;color:var(--ok)}
.mm-fields .chip.bad{border-color:var(--err);color:var(--err)}
.mm-fields .chip.bad .i{color:var(--err)}
.mm-nav{align-items:center;gap:6px}
.mm-nav .opt-title{margin:0 auto 0 0}
.mm-paper{white-space:pre-wrap;background:var(--paper);color:#222;border:1px solid var(--line);border-radius:10px;padding:14px 16px;font-family:"Times New Roman",Times,serif;font-size:15px;line-height:1.5;max-height:340px;overflow:auto;margin-top:6px}
#mm-tpl{min-height:180px}
`;
document.head.append(css);
