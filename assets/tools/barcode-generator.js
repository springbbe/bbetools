/* Tạo mã vạch EAN-13, EAN-8, UPC-A, ITF-14, Code 128, Code 39: một mã hoặc hàng loạt, tải PNG/SVG, in tem ra PDF khổ A4 */
import { h, icon, save, copyImage, zip, toast, lib } from "../core.js";
import { formTool } from "../frames/form.js";
import { encode, layout, bars, toSvg, TYPES } from "../lib/ma-vach.js";

const T = (...types) => (v) => types.includes(v.type);
const MAX_BULK = 300;
const SAMPLE = { ean13: "893460400100", ean8: "8934567", upca: "03600029145", code128: "SP-2026-00125", code39: "KHO A-102", itf14: "1893460400100" };

/** Vẽ mã vạch lên canvas (cùng bố cục với SVG) */
function drawCanvas(code, o) {
  const L = layout(code, o);
  const c = document.createElement("canvas");
  c.width = L.width; c.height = L.height;
  const g = c.getContext("2d");
  if (!o.transparent) { g.fillStyle = "#fff"; g.fillRect(0, 0, L.width, L.height); }
  g.fillStyle = "#000";
  const ext = L.hasGuards ? Math.round(L.fs * 0.55) : 0;
  for (const b of bars(code)) g.fillRect((L.qL + b.x) * L.mod, L.top, b.w * L.mod, L.hgt + (b.long ? ext : 0));
  if (L.bearer) {
    const x0 = (L.qL - code.quiet[0] / 2) * L.mod, x1 = (L.qL + code.modules.length + code.quiet[1] / 2) * L.mod;
    g.fillRect(x0, L.top - L.bearer, x1 - x0, L.bearer); g.fillRect(x0, L.top + L.hgt, x1 - x0, L.bearer);
  }
  if (L.showText) {
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    const y = L.top + L.hgt + L.bearer + (L.hasGuards ? Math.round(L.fs * 0.9) : Math.round(L.fs * 1.1));
    for (const p of code.hrt) {
      g.font = `${p.small ? Math.round(L.fs * 0.8) : L.fs}px "OCR-B", Consolas, Menlo, "DejaVu Sans Mono", monospace`;
      g.fillText(p.text, (L.qL + (p.from + p.to) / 2) * L.mod, y);
    }
  }
  return c;
}
const toBlob = (c) => new Promise((r) => c.toBlob(r, "image/png"));
const fileBase = (code) => (code.text.replace(/[^\w.-]+/g, "_").slice(0, 60) || "ma-vach");
const opts = (v) => ({ module: +v.mod, height: +v.height, text: v.showText, transparent: v.transparent, fontSize: Math.max(10, Math.round(+v.mod * 9)) });

/** In tem: lưới mã vạch trên khổ A4 (pdf-lib), mỗi mã một ô */
async function labelsPdf(codes, o) {
  const P = await lib("pdflib");
  const doc = await P.PDFDocument.create();
  const mm = 72 / 25.4, W = 210 * mm, H = 297 * mm, M = 10 * mm, gap = 4 * mm;
  const cols = codes[0].modules.length > 120 ? 2 : 3;
  const cw = (W - 2 * M - gap * (cols - 1)) / cols;
  const imgs = [];
  for (const code of codes) imgs.push(await doc.embedPng(await (await toBlob(drawCanvas(code, { ...o, module: 4, fontSize: 36 }))).arrayBuffer()));
  const ch = Math.max(...imgs.map((im) => (im.height * cw) / im.width));
  const rows = Math.max(1, Math.floor((H - 2 * M + gap) / (ch + gap)));
  let page;
  imgs.forEach((im, i) => {
    const k = i % (rows * cols);
    if (k === 0) page = doc.addPage([W, H]);
    const r = Math.floor(k / cols), c = k % cols;
    const w = cw, hgt = (im.height * cw) / im.width;
    page.drawImage(im, { x: M + c * (cw + gap), y: H - M - r * (ch + gap) - hgt, width: w, height: hgt });
  });
  return new Blob([await doc.save()], { type: "application/pdf" });
}

let seq = 0;
const api = formTool({
  fields: [
    { id: "type", type: "select", label: "Loại mã", value: "ean13", choices: Object.entries(TYPES).map(([k, t]) => [k, t.name + " – " + t.hint.split(".")[0]]) },
    { id: "mode", type: "seg", label: "Số lượng", value: "one", choices: [["one", "Một mã"], ["bulk", "Nhiều mã (in tem)"]] },
    { id: "text", label: "Nội dung mã", value: "", placeholder: "Ví dụ: 893460400100", attrs: { autocomplete: "off", spellcheck: "false", autocapitalize: "characters" }, show: (v) => v.mode === "one" },
    { id: "list", type: "textarea", label: "Danh sách mã (mỗi dòng một mã)", value: "", url: false, placeholder: "893460400100\n893460400101\n893460400102", attrs: { rows: 6, spellcheck: "false" }, hint: `Tối đa ${MAX_BULK} mã. Dán thẳng một cột từ Excel được.`, show: (v) => v.mode === "bulk" },
    { id: "check39", type: "check", label: "Thêm ký tự kiểm tra (mod 43)", value: false, show: T("code39") },
    { id: "showText", type: "check", label: "In chữ số dưới vạch", value: true },
    { id: "mod", type: "select", label: "Độ rộng một vạch", value: "3", choices: [["2", "2 px – xem trên màn hình"], ["3", "3 px – in tem thường"], ["4", "4 px – in rõ, máy in nhiệt"], ["6", "6 px – in khổ lớn"]] },
    { id: "height", type: "select", label: "Chiều cao vạch", value: "80", choices: [["50", "Thấp"], ["80", "Vừa"], ["120", "Cao"]] },
    { id: "transparent", type: "check", label: "Nền trong suốt (PNG, SVG)", value: false }
  ],
  compute(v, out) {
    const my = ++seq;
    out.textContent = "";
    const hint = h("p", { class: "hint", text: TYPES[v.type].hint });
    if (v.mode === "one") {
      if (!v.text.trim()) {
        out.append(h("div", { class: "alert info", html: icon("info") + "<span>Nhập nội dung để tạo mã vạch. Với EAN-13, EAN-8, UPC-A, ITF-14 chỉ cần nhập phần số, công cụ tự tính số kiểm tra cuối.</span>" }), hint,
          h("button", { class: "btn ghost sm", type: "button", onclick: () => api.set("text", SAMPLE[v.type]) }, "Điền mã mẫu"));
        return;
      }
      let code;
      try { code = encode(v.type, v.text, { check: v.check39 }); }
      catch (e) { out.append(h("p", { class: "alert err", html: icon("triangle-alert") + "<span></span>" }), hint); out.querySelector(".alert span").textContent = e.userMsg || e.message; return; }
      const o = opts(v);
      const svg = toSvg(code, { ...o, bg: o.transparent ? "transparent" : "#fff" });
      const img = h("img", { src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), alt: `Mã vạch ${TYPES[v.type].name}: ${code.text}`, class: "bc-img" });
      const name = fileBase(code);
      out.append(h("div", { class: "bc-stage" }, img),
        code.text !== v.text.trim().toUpperCase() && code.text !== v.text.trim() ? h("p", { class: "alert ok", html: icon("circle-check") + `<span>Mã đầy đủ: <b>${code.text}</b> (đã thêm ký tự kiểm tra).</span>` }) : "",
        h("div", { class: "row", style: { justifyContent: "center" } },
          h("button", { class: "btn", type: "button", onclick: async () => save(await toBlob(drawCanvas(code, o)), name + ".png") }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải PNG"),
          h("button", { class: "btn ghost", type: "button", onclick: () => save(new Blob([svg], { type: "image/svg+xml" }), name + ".svg") }, "Tải SVG"),
          h("button", { class: "btn ghost", type: "button", onclick: async () => copyImage(await toBlob(drawCanvas(code, o))) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép ảnh")),
        h("p", { class: "hint", style: { textAlign: "center" }, text: `${TYPES[v.type].name} · ${code.modules.length} ô · nên in rộng tối thiểu ${Math.round(code.modules.length * 0.33)} mm để máy quét đọc dễ` }));
      return;
    }
    // nhiều mã
    const lines = v.list.split(/\r?\n/).map((s) => s.split("\t")[0].trim()).filter(Boolean);
    if (!lines.length) { out.append(h("div", { class: "alert info", html: icon("info") + "<span>Dán danh sách mã, mỗi dòng một mã (có thể chép cả cột từ Excel). Mỗi mã sẽ được kiểm tra riêng.</span>" }), hint); return; }
    const codes = [], errs = [];
    lines.slice(0, MAX_BULK).forEach((s, i) => { try { codes.push(encode(v.type, s, { check: v.check39 })); } catch (e) { errs.push(`Dòng ${i + 1} (${s}): ${e.userMsg || e.message}`); } });
    const o = opts(v);
    out.append(h("p", { class: "summary", text: `${codes.length} mã hợp lệ` + (errs.length ? `, ${errs.length} mã lỗi` : "") + (lines.length > MAX_BULK ? ` (chỉ lấy ${MAX_BULK} dòng đầu)` : "") }));
    if (errs.length) out.append(h("details", { class: "alert err", open: errs.length < 4 }, h("summary", { text: "Mã bị bỏ qua" }), h("ul", null, errs.slice(0, 50).map((e) => h("li", { text: e })))));
    if (!codes.length) return;
    out.append(h("div", { class: "row" },
      h("button", { class: "btn", type: "button", onclick: async (e) => {
        const b = e.currentTarget; b.disabled = true;
        try { save(await labelsPdf(codes, o), "tem-ma-vach.pdf"); } catch (err) { toast(err.userMsg || "Không tạo được PDF", { type: "err" }); }
        b.disabled = false;
      } }, h("span", { html: icon("printer"), style: { display: "contents" } }), "In tem (PDF A4)"),
      h("button", { class: "btn ghost", type: "button", onclick: async (e) => {
        const b = e.currentTarget; b.disabled = true;
        try { save(await zip(await Promise.all(codes.map(async (c) => ({ name: fileBase(c) + ".png", blob: await toBlob(drawCanvas(c, o)) })))), "ma-vach-png.zip"); }
        catch (err) { toast(err.userMsg || "Không tạo được file .zip", { type: "err" }); }
        b.disabled = false;
      } }, "Tải PNG (.zip)"),
      h("button", { class: "btn ghost", type: "button", onclick: async () => save(await zip(codes.map((c) => ({ name: fileBase(c) + ".svg", blob: new Blob([toSvg(c, { ...o, bg: o.transparent ? "transparent" : "#fff" })], { type: "image/svg+xml" }) }))), "ma-vach-svg.zip") }, "Tải SVG (.zip)")));
    const grid = h("ul", { class: "bc-grid", "aria-label": "Xem trước các mã" });
    out.append(grid);
    (async () => {
      for (const c of codes.slice(0, 60)) {
        if (my !== seq) return;
        grid.append(h("li", null, h("img", { src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(toSvg(c, { ...o, module: 2 })), alt: c.text, loading: "lazy" })));
      }
      if (codes.length > 60) grid.append(h("li", { class: "hint", text: `… và ${codes.length - 60} mã nữa (có đủ trong file tải về)` }));
    })();
  }
});

const css = document.createElement("style");
css.textContent = `
.bc-stage{background:#fff;border-radius:14px;box-shadow:var(--shadow);padding:16px;display:flex;justify-content:center;overflow:auto}
.bc-img{max-width:100%;height:auto;image-rendering:pixelated}
.bc-grid{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
.bc-grid li{background:#fff;border-radius:10px;padding:8px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow)}
.bc-grid img{max-width:100%;height:auto}
.bc-grid li.hint{background:none;box-shadow:none}
`;
document.head.append(css);
