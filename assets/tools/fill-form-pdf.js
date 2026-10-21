/* Điền form PDF: hiện các ô form có sẵn (chữ, ô đánh dấu, chọn một, danh sách) ngay trên trang để điền, rồi lưu vào file
   (chữ tiếng Việt có dấu được vẽ bằng font Be Vietnam Pro nhúng vào file). Tuỳ chọn làm phẳng sau khi điền. */
import { h, icon, lib, baseName, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { openPdf, libDoc, pdfBlob, embedVnFont, needsUnicodeFont, Locked } from "../pdf.js";

const css = document.createElement("style");
css.textContent = `
.ff-pages{display:flex;flex-direction:column;align-items:center;gap:18px}
.ff-page{position:relative;width:100%;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 4px 16px rgba(0,0,0,.12);border-radius:2px;container-type:inline-size}
.ff-page>img{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.ff-page .pno{position:absolute;left:8px;top:8px;z-index:3;background:rgba(15,18,28,.72);color:#fff;font-size:12px;font-weight:700;border-radius:99px;padding:2px 9px}
.ff-f{position:absolute;z-index:2;box-sizing:border-box;margin:0;border:1px solid rgba(62,91,242,.45);background:rgba(62,91,242,.09);color:#111;font-family:'Be Vietnam Pro',Arial,sans-serif;padding:0 .3em;border-radius:2px;outline:none;min-width:0}
.ff-f:focus{border-color:#3E5BF2;background:rgba(62,91,242,.16);box-shadow:0 0 0 2px rgba(62,91,242,.35)}
textarea.ff-f{resize:none;padding:.15em .3em;line-height:1.25}
select.ff-f{padding:0 .1em;appearance:auto}
.ff-f:disabled{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.12);color:#555}
.ff-chk{position:absolute;z-index:2;display:grid;place-items:center;margin:0}
.ff-chk input{width:100%;height:100%;margin:0;accent-color:#3E5BF2;cursor:pointer}
`;
document.head.append(css);

// loại ô của pdf-lib (bản nén đổi tên lớp nên không dùng constructor.name được)
const kindOf = (L, f) => (f instanceof L.PDFTextField ? "TextField" : f instanceof L.PDFCheckBox ? "CheckBox" : f instanceof L.PDFRadioGroup ? "RadioGroup" : f instanceof L.PDFDropdown ? "Dropdown" : f instanceof L.PDFOptionList ? "OptionList" : "other");
let F = null, item = null, pages = [], fields = new Map(), wrap, countEl, banner, sumEl, flat, io;

/* ---------- mở file ---------- */
async function load(it) {
  let r;
  try { r = await openPdf(it.file, { prompt: true }); }
  catch (e) {
    if (!(e instanceof Locked)) throw e;
    const err = new Error("locked"); err.userMsg = `Chưa mở được ${it.name}: file có mật khẩu, cần nhập đúng mật khẩu.`; throw err;
  }
  Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages });
  const list = [];
  fields = new Map();
  for (let n = 1; n <= r.pages; n++) {
    const pg = await r.doc.getPage(n), vp = pg.getViewport({ scale: 1 });
    const annots = (await pg.getAnnotations({ intent: "display" })).filter((a) => a.annotationType === 20 && a.fieldName && !a.hidden && a.fieldType && !a.pushButton && a.fieldType !== "Sig");
    list.push({ n, w: vp.width, h: vp.height, vp, annots });
    for (const a of annots) if (!fields.has(a.fieldName)) fields.set(a.fieldName, { type: a.fieldType, a, value: null });
  }
  // giá trị hiện có: đọc bằng pdf-lib (đúng hơn với ô có nhiều widget)
  try {
    const L = await lib("pdflib"), form = (await libDoc(r.bytes, r.password)).getForm();
    for (const f of form.getFields()) {
      const x = fields.get(f.getName());
      if (!x) continue;
      x.kind = kindOf(L, f);
      if (x.kind === "TextField") x.value = f.getText() || "";
      else if (x.kind === "CheckBox") x.value = f.isChecked();
      else if (x.kind === "RadioGroup") {
        // tên trạng thái của từng nút (pdf.js trả về) → giá trị trong /Opt (có thể có dấu, vd. "Nữ")
        const opts = f.getOptions(), ws = f.acroField.getWidgets();
        x.map = {};
        ws.forEach((w, i) => { const on = w.getOnValue(); if (on) x.map[on.decodeText()] = opts[i] != null ? opts[i] : on.decodeText(); });
        x.value = f.getSelected() || null;
      }
      else if (x.kind === "Dropdown" || x.kind === "OptionList") x.value = f.getSelected() || [];
    }
  } catch (e) { console.warn(e); }
  it.info = r.pages + " trang · " + (fields.size ? fields.size + " ô form" : "không có ô form");
  item = it; pages = list;
  buildPages();
}

function buildPages() {
  wrap.textContent = "";
  io.disconnect();
  pages.forEach((p, i) => {
    const el = h("div", { class: "ff-page", style: { aspectRatio: p.w + " / " + p.h, maxWidth: Math.round(860 * Math.min(1, (p.w / p.h) * 1.414)) + "px" } },
      h("span", { class: "pno", text: "Trang " + (i + 1) + "/" + pages.length }));
    el._load = async () => {
      try {
        const pdfjs = await lib("pdfjs");
        const pg = await item.doc.getPage(p.n);
        const scale = Math.min(1700, el.clientWidth * Math.min(2, devicePixelRatio || 1)) / p.w, vp = pg.getViewport({ scale });
        const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        // ENABLE_FORMS: không vẽ ô form vào ảnh trang (ô được thay bằng ô nhập HTML)
        await pg.render({ canvasContext: g, viewport: vp, annotationMode: pdfjs.AnnotationMode.ENABLE_FORMS }).promise;
        const b = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.9));
        c.width = c.height = 0;
        el.prepend(h("img", { src: URL.createObjectURL(b), alt: "" }));
      } catch (_) { /* tài liệu đã đóng */ }
    };
    p.annots.forEach((a) => el.append(control(a, p)));
    wrap.append(el);
    io.observe(el);
  });
  countEl.textContent = item ? pages.length + " trang · " + item.name : "";
  banner.hidden = !(item && item.sample);
  update();
}

/* ---------- ô nhập trên trang ---------- */
function control(a, p) {
  const [x1, y1, x2, y2] = p.vp.convertToViewportRectangle(a.rect);
  const box = { left: (Math.min(x1, x2) / p.w) * 100 + "%", top: (Math.min(y1, y2) / p.h) * 100 + "%", width: (Math.abs(x2 - x1) / p.w) * 100 + "%", height: (Math.abs(y2 - y1) / p.h) * 100 + "%" };
  const hpt = Math.abs(y2 - y1), fsz = Math.max(6, Math.min(hpt * 0.62, 14)), fs = (fsz / p.w) * 100 + "cqw";
  const f = fields.get(a.fieldName), name = a.alternativeText || a.fieldName.replace(/[_.]+/g, " ");
  const ro = !!a.readOnly;
  if (a.fieldType === "Btn" && (a.checkBox || a.radioButton)) {
    const ov = a.radioButton ? (f.map && f.map[a.buttonValue] != null ? f.map[a.buttonValue] : a.buttonValue) : null;
    const inp = h("input", { type: a.radioButton ? "radio" : "checkbox", name: "ff-" + a.fieldName, dataset: { f: a.fieldName }, "aria-label": name + (a.radioButton ? ": " + ov : ""), disabled: ro });
    if (a.radioButton) { inp.checked = f.value === ov; inp.addEventListener("change", () => { if (inp.checked) f.value = ov; update(); }); }
    else { inp.checked = !!f.value; inp.addEventListener("change", () => { f.value = inp.checked; syncAll(a.fieldName, inp); update(); }); }
    return h("label", { class: "ff-chk", style: box }, inp);
  }
  if (a.fieldType === "Ch") {
    const opts = (a.options || []).map((o) => [o.exportValue, o.displayValue || o.exportValue]);
    const sel = h("select", { class: "ff-f", dataset: { f: a.fieldName }, "aria-label": name, multiple: !!a.multiSelect, size: a.combo ? null : Math.max(2, Math.min(opts.length, 6)), disabled: ro, style: Object.assign({ fontSize: fs }, box) },
      a.combo ? h("option", { value: "", text: "" }) : null,
      opts.map(([v, l]) => h("option", { value: v, text: l, selected: [].concat(f.value || []).includes(v) || [].concat(f.value || []).includes(l) })));
    sel.addEventListener("change", () => { f.value = [...sel.selectedOptions].map((o) => o.value).filter((v) => v !== ""); syncAll(a.fieldName, sel); update(); });
    return sel;
  }
  const multi = !!a.multiLine;
  const inp = h(multi ? "textarea" : "input", { class: "ff-f", dataset: { f: a.fieldName }, "aria-label": name, disabled: ro, spellcheck: "false", maxlength: a.maxLen || null, style: Object.assign({ fontSize: fs, textAlign: ["left", "center", "right"][a.textAlignment || 0] }, box) });
  inp.value = f.value || "";
  inp.addEventListener("input", () => { f.value = inp.value; syncAll(a.fieldName, inp); update(); });
  return inp;
}
// một ô có thể hiện ở nhiều chỗ (nhiều widget cùng tên): đồng bộ giá trị
function syncAll(name, from) {
  const f = fields.get(name);
  for (const el of wrap.querySelectorAll("[data-f]")) {
    if (el === from || el.dataset.f !== name) continue;
    if (el.type === "checkbox") el.checked = !!f.value;
    else if (el.tagName === "SELECT") [...el.options].forEach((o) => { o.selected = [].concat(f.value || []).includes(o.value); });
    else if (el.type !== "radio") el.value = f.value || "";
  }
}

function update() {
  if (!sumEl) return;
  const filled = [...fields.values()].filter((f) => (Array.isArray(f.value) ? f.value.length : f.value)).length;
  sumEl.innerHTML = !item ? "" : fields.size ? `<span>Đã điền <b>${filled}</b>/${fields.size} ô.</span>` : "<span>File này không có ô form để điền. Muốn thêm chữ, chữ ký lên trang, hãy dùng Ký PDF.</span>";
  if (F) F.refresh();
}

/* ---------- khung ---------- */
fileTool({
  accept: ["pdf"], multiple: false, noun: "file PDF",
  action: "Lưu PDF đã điền",
  sample: () => sampleFiles("to-khai-mau.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  custom: {
    mount(ctx) {
      F = ctx;
      countEl = h("span", { class: "count", "aria-live": "polite" });
      banner = h("p", { class: "alert info", hidden: true, text: "Đây là file mẫu. Chọn, kéo thả hoặc dán file PDF có form của bạn." });
      wrap = h("div", { class: "ff-pages" });
      io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); en.target._load(); } }), { rootMargin: "600px" });
      ctx.workMain.append(h("div", { class: "work-head" }, countEl, h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "File khác"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.clear() }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Bỏ hết"))),
      banner, wrap);
    }
  },
  load,
  dispose: (it) => { if (it.doc) it.doc.destroy(); if (it === item) { item = null; pages = []; fields = new Map(); if (wrap) wrap.textContent = ""; } },
  options(el) {
    flat = h("input", { type: "checkbox", id: "flatten" });
    sumEl = h("p", { class: "alert info", "aria-live": "polite" });
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Điền form PDF" }),
      h("p", { class: "hint", text: "Bấm vào các ô xanh trên trang để điền; dùng phím Tab để sang ô tiếp theo. Gõ tiếng Việt có dấu thoải mái." })),
      h("label", { class: "switch" }, flat, h("span", null, "Làm phẳng sau khi điền", h("small", { text: "Nội dung thành cố định, người nhận không sửa được." }))),
      sumEl);
    update();
    return () => ({ flatten: flat.checked });
  },
  ready: (items) => (items.some((i) => i.loading) ? "Đang đọc file…" : !fields.size ? "File không có ô form để điền." : true),
  async run(items, o, ctx) {
    ctx.status("Đang lưu…"); ctx.progress(-1);
    const doc = await libDoc(item.bytes, item.password), form = doc.getForm();
    let unicode = false;
    for (const f of form.getFields()) {
      const x = fields.get(f.getName());
      if (!x || x.value == null || (x.a && x.a.readOnly)) continue;
      try {
        if (x.kind === "TextField") { f.setText(x.value || undefined); if (needsUnicodeFont(x.value)) unicode = true; }
        else if (x.kind === "CheckBox") { if (x.value) f.check(); else f.uncheck(); }
        else if (x.kind === "RadioGroup") { if (x.value) f.select(x.value); }
        else if (x.kind === "Dropdown") { if (x.value.length) f.select(x.value[0]); else f.clear(); if (needsUnicodeFont(x.value.join(""))) unicode = true; }
        else if (x.kind === "OptionList") { if (x.value.length) f.select(x.value); else f.clear(); if (needsUnicodeFont(x.value.join(""))) unicode = true; }
      } catch (e) { console.warn("Không ghi được ô", x.a && x.a.fieldName, e); }
    }
    try { form.deleteXFA(); } catch (_) {}
    const font = unicode ? await embedVnFont(doc) : undefined;
    form.updateFieldAppearances(font);
    if (o.flatten) form.flatten({ updateFieldAppearances: false });
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(item.name) + (o.flatten ? "-da-dien-phang" : "-da-dien") + ".pdf", note: o.flatten ? "đã làm phẳng" : "vẫn sửa được" }];
  },
  doneTitle: () => "Đã lưu PDF đã điền!",
  summary: () => "Mở file bằng trình đọc PDF để kiểm tra lại trước khi gửi."
});
