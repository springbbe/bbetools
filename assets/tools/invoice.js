/* Tạo báo giá, phiếu bán hàng (hoá đơn bán lẻ): bảng hàng hoá, chiết khấu, thuế GTGT, phí vận chuyển, số tiền bằng chữ,
   mã QR chuyển khoản VietQR; xem trước như trang giấy và xuất PDF khổ A4 (pdf-lib, font Be Vietnam Pro).
   Thông tin người bán được nhớ trong trình duyệt để lần sau không phải gõ lại. */
import { h, icon, lib, ROOT, save, store, toast, fmtNum, debounce } from "../core.js";
import { formTool } from "../frames/form.js";
import { totals, parseVN, nextNumber } from "../lib/hoa-don.js";
import { readNumber } from "../lib/doc-so.js";
import { buildVietQR, cleanAccount, cleanMessage } from "../lib/vietqr.js";
import { wrapText } from "../lib/tron-thu.js";
import { embedVnFont } from "../pdf.js";
import { qrMatrix, drawQR, canvasBlob } from "../qr.js";

const KEY = "invoice:form";
const banks = await fetch(ROOT + "data/ngan-hang-vietqr.json").then((r) => r.json()).then((d) => d.banks).catch(() => []);
const byBin = Object.fromEntries(banks.map((b) => [b.bin, b]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const vnDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); if (isNaN(d)) return ""; d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const money = (n) => fmtNum(Math.round(n));
const qtyText = (q) => { const n = parseVN(q); return Number.isFinite(n) ? fmtNum(n, 3) : String(q); };
const EMPTY = { n: "", u: "", q: "1", p: "" };

/* ---------- bảng hàng hoá (trường tuỳ biến của form) ---------- */
function itemsField(api) {
  let items = [{ ...EMPTY }];
  const list = h("div", { class: "iv-items", role: "list" });
  const add = h("button", { class: "btn ghost sm", type: "button", onclick: () => { items.push({ ...EMPTY }); draw(); list.lastElementChild.querySelector("input").focus(); api.update(); } }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Thêm dòng");
  function draw() {
    list.textContent = "";
    items.forEach((it, i) => {
      const total = h("output", { class: "iv-total", "aria-label": "Thành tiền dòng " + (i + 1) });
      const upd = () => { const q = parseVN(it.q), p = parseVN(it.p); total.textContent = Number.isFinite(q) && Number.isFinite(p) && (it.p || it.q) ? money(q * p) + " đ" : ""; };
      const inp = (k, label, attrs = {}) => h("input", Object.assign({ type: "text", value: it[k], "aria-label": label + " dòng " + (i + 1), placeholder: label, autocomplete: "off", class: "iv-" + k,
        oninput: (e) => { it[k] = e.target.value; upd(); } }, attrs));
      list.append(h("div", { class: "iv-row", role: "listitem" },
        h("span", { class: "iv-no", text: i + 1 }),
        inp("n", "Tên hàng hoá, dịch vụ"),
        inp("u", "ĐVT"),
        inp("q", "SL", { inputmode: "decimal", onblur: (e) => { const n = parseVN(e.target.value); if (Number.isFinite(n) && e.target.value) { e.target.value = it.q = fmtNum(n, 3); } } }),
        inp("p", "Đơn giá", { inputmode: "numeric", onblur: (e) => { const n = parseVN(e.target.value); if (Number.isFinite(n) && e.target.value) { e.target.value = it.p = fmtNum(n, 2); } } }),
        total,
        h("button", { class: "ib sm", type: "button", "aria-label": "Xoá dòng " + (i + 1), title: "Xoá dòng", html: icon("x"), onclick: () => { items.splice(i, 1); if (!items.length) items.push({ ...EMPTY }); draw(); api.update(); } })));
      upd();
    });
  }
  draw();
  const el = h("div", { class: "field" }, h("span", { text: "Hàng hoá, dịch vụ" }),
    h("div", { class: "iv-head", "aria-hidden": "true" }, h("span", { text: "#" }), h("span", { text: "Tên hàng" }), h("span", { text: "ĐVT" }), h("span", { text: "SL" }), h("span", { text: "Đơn giá" }), h("span", { text: "Thành tiền" }), h("span")),
    list, h("div", { class: "row" }, add));
  return {
    el,
    get: () => JSON.stringify(items.filter((x) => x.n || x.p).map((x) => [x.n, x.u, x.q, x.p])),
    set: (v) => {
      let arr = [];
      try { arr = JSON.parse(v || "[]"); } catch (_) { /* link hỏng */ }
      items = Array.isArray(arr) && arr.length ? arr.map((x) => ({ n: String(x[0] ?? ""), u: String(x[1] ?? ""), q: String(x[2] ?? "1"), p: String(x[3] ?? "") })) : [{ ...EMPTY }];
      draw();
    }
  };
}

/* ---------- chọn ngân hàng nhận (tuỳ chọn) ---------- */
function bankField() {
  const s = h("select", { id: "iv-bank" }, h("option", { value: "", text: "— Không in mã QR —" }),
    banks.slice().sort((a, b) => a.short.localeCompare(b.short, "vi")).map((b) => h("option", { value: b.bin, text: `${b.short} (${b.code})` })));
  return { el: h("div", { class: "field" }, h("label", { for: "iv-bank", text: "Ngân hàng nhận tiền" }), s, h("small", { text: "Chọn để in mã QR chuyển khoản (VietQR) có sẵn số tiền và nội dung." })), get: () => s.value, set: (v) => { s.value = byBin[v] ? v : ""; } };
}

const sec = (title) => ({ id: "_" + title, type: "custom", url: false, render: () => ({ el: h("p", { class: "opt-title iv-sec", text: title }), get: () => "", set: () => {} }) });
const isQuote = (v) => v.doc === "quote";
const titleOf = (v) => (v.title || "").trim() || (isQuote(v) ? "BẢNG BÁO GIÁ" : "PHIẾU BÁN HÀNG");

/* ---------- dữ liệu cho xem trước và PDF ---------- */
function model(v) {
  let raw = [];
  try { raw = JSON.parse(v.items || "[]"); } catch (_) { /* bỏ qua */ }
  const items = raw.map((x) => ({ n: x[0], u: x[1], q: x[2], p: x[3] }));
  const t = totals(items.map((x) => ({ qty: x.q, price: x.p })), { discount: v.disc, discountType: v.discType, vat: v.vat === "" ? null : v.vat, shipping: v.ship });
  const words = t.total > 0 ? readNumber(String(t.total), { unit: "đồng", capitalize: true }) : "";
  let qr = null;
  const bank = byBin[v.bank];
  if (bank && cleanAccount(v.acc) && t.total > 0) {
    try { qr = { bank, acc: cleanAccount(v.acc), name: v.accName, payload: buildVietQR({ bin: bank.bin, account: v.acc, amount: t.total, message: cleanMessage(v.no ? `TT ${v.no}` : "Thanh toan") }) }; } catch (_) { qr = null; }
  }
  return { items, t, words, qr };
}

/** Xem trước dạng trang giấy */
function paper(v, m, qrUrl) {
  const line = (label, val, strong) => (val ? h("p", null, label ? h("span", { class: "iv-l", text: label + ": " }) : null, strong ? h("b", { text: val }) : val) : null);
  const t = m.t;
  const sumRow = (label, val, cls) => h("tr", { class: cls || null }, h("td", { text: label }), h("td", { text: val }));
  return h("div", { class: "iv-paper" },
    h("div", { class: "iv-seller" }, v.sname ? h("p", { class: "iv-sname", text: v.sname }) : null, line("Địa chỉ", v.saddr), line("Điện thoại", [v.sphone, v.semail].filter(Boolean).join(" · ")), line("MST", v.stax)),
    h("h3", { class: "iv-title", text: titleOf(v) }),
    h("p", { class: "iv-meta", text: [v.no ? "Số: " + v.no : "", v.date ? "Ngày " + vnDate(v.date) : "", isQuote(v) && v.valid > 0 && v.date ? "Hiệu lực đến " + vnDate(addDays(v.date, +v.valid)) : ""].filter(Boolean).join(" · ") }),
    h("div", { class: "iv-buyer" }, line(isQuote(v) ? "Kính gửi" : "Khách hàng", v.bname, true), line("Địa chỉ", v.baddr), line("Điện thoại", v.bphone), line("MST", v.btax)),
    h("div", { class: "iv-twrap" }, h("table", { class: "iv-t" },
      h("thead", null, h("tr", null, ["STT", "Tên hàng hoá, dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền"].map((x) => h("th", { text: x })))),
      h("tbody", null, m.items.length ? m.items.map((x, i) => h("tr", null, h("td", { text: i + 1 }), h("td", { class: "l", text: x.n }), h("td", { text: x.u }), h("td", { class: "r", text: qtyText(x.q) }), h("td", { class: "r", text: x.p ? money(parseVN(x.p)) : "" }), h("td", { class: "r", text: money(t.lines[i]) })))
        : h("tr", null, h("td", { colspan: 6, class: "iv-empty", text: "Chưa có hàng hoá: nhập ở bên trái." }))))),
    h("table", { class: "iv-sum" }, h("tbody", null,
      sumRow("Cộng tiền hàng", money(t.subtotal)),
      t.discount ? sumRow("Chiết khấu" + (v.discType === "pct" ? ` (${fmtNum(parseVN(v.disc), 2)}%)` : ""), "−" + money(t.discount)) : null,
      t.rate != null ? sumRow(`Thuế GTGT (${fmtNum(t.rate, 2)}%)`, money(t.vat)) : null,
      t.shipping ? sumRow("Phí vận chuyển", money(t.shipping)) : null,
      sumRow("Tổng cộng", money(t.total) + " đ", "iv-grand"))),
    m.words ? h("p", { class: "iv-words" }, h("span", { class: "iv-l", text: "Số tiền bằng chữ: " }), h("i", { text: m.words + "." })) : null,
    v.notes ? h("p", { class: "iv-notes" }, h("span", { class: "iv-l", text: "Ghi chú: " }), v.notes) : null,
    h("div", { class: "iv-foot" },
      qrUrl ? h("figure", { class: "iv-qr" }, h("img", { src: qrUrl, alt: "Mã QR chuyển khoản" }), h("figcaption", { text: `${m.qr.bank.short} · ${m.qr.acc}${m.qr.name ? " · " + m.qr.name : ""}` })) : h("span"),
      h("div", { class: "iv-signs" },
        h("div", null, h("b", { text: isQuote(v) ? "Khách hàng" : "Người mua hàng" }), h("small", { text: "(Ký, ghi rõ họ tên)" })),
        h("div", null, h("b", { text: isQuote(v) ? "Người báo giá" : "Người bán hàng" }), h("small", { text: "(Ký, ghi rõ họ tên)" }), v.sign ? h("p", { class: "iv-signname", text: v.sign }) : null))));
}

/* ---------- PDF khổ A4 ---------- */
async function buildPdf(v, m) {
  const P = await lib("pdflib");
  const doc = await P.PDFDocument.create();
  const [R, B] = await Promise.all([embedVnFont(doc), embedVnFont(doc, true)]);
  doc.setTitle(titleOf(v) + (v.no ? " " + v.no : ""));
  doc.setCreator("BbeTools");
  const W = 595.28, H = 841.89, M = 42, CW = W - 2 * M;
  const ink = P.rgb(0.12, 0.12, 0.12), mute = P.rgb(0.38, 0.4, 0.45), lineC = P.rgb(0.75, 0.77, 0.8), fill = P.rgb(0.94, 0.95, 0.97);
  let page = doc.addPage([W, H]), y = H - M;
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const ensure = (need) => { if (y - need < M) newPage(); };
  const text = (s, x, yy, o = {}) => page.drawText(String(s), { x, y: yy, size: o.size || 10, font: o.bold ? B : R, color: o.color || ink });
  const width = (s, size = 10, bold) => (bold ? B : R).widthOfTextAtSize(String(s), size);
  const para = (s, o = {}) => {
    const size = o.size || 10, lh = size * 1.45, x = o.x ?? M, w = o.w ?? CW;
    for (const ln of String(s).split("\n").flatMap((p) => wrapText(p, w - (o.indent || 0), (q) => width(q, size, o.bold)))) {
      ensure(lh); y -= lh;
      const dx = o.align === "center" ? (w - width(ln, size, o.bold)) / 2 : o.align === "right" ? w - width(ln, size, o.bold) : 0;
      text(ln, x + dx, y + size * 0.3, o);
    }
  };
  const labeled = (label, val, o = {}) => {
    if (!val) return;
    const size = o.size || 10, lw = width(label + ": ", size);
    const lines = wrapText(String(val), CW - lw, (q) => width(q, size, o.bold));
    lines.forEach((ln, i) => { ensure(size * 1.45); y -= size * 1.45; if (i === 0) text(label + ": ", M, y + size * 0.3, { size, color: mute }); text(ln, M + lw, y + size * 0.3, { size, bold: o.bold }); });
  };

  // người bán
  if (v.sname) para(v.sname, { bold: true, size: 13 });
  labeled("Địa chỉ", v.saddr, { size: 9.5 });
  labeled("Điện thoại", [v.sphone, v.semail].filter(Boolean).join(" · "), { size: 9.5 });
  labeled("MST", v.stax, { size: 9.5 });
  y -= 18;
  para(titleOf(v), { bold: true, size: 18, align: "center" });
  y -= 2;
  const meta = [v.no ? "Số: " + v.no : "", v.date ? "Ngày " + vnDate(v.date) : "", isQuote(v) && v.valid > 0 && v.date ? "Hiệu lực đến " + vnDate(addDays(v.date, +v.valid)) : ""].filter(Boolean).join("   ·   ");
  if (meta) para(meta, { size: 10, align: "center", color: mute });
  y -= 12;
  labeled(isQuote(v) ? "Kính gửi" : "Khách hàng", v.bname, { bold: true });
  labeled("Địa chỉ", v.baddr);
  labeled("Điện thoại", v.bphone);
  labeled("MST", v.btax);
  y -= 10;

  // bảng hàng hoá
  const cols = [32, 0, 44, 44, 80, 90];
  cols[1] = CW - cols.reduce((a, b) => a + b, 0);
  const xs = cols.reduce((a, w, i) => (a.push(i ? a[i - 1] + cols[i - 1] : M), a), []);
  const FS = 9.5, LH = FS * 1.4, PAD = 5;
  const head = ["STT", "Tên hàng hoá, dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền"];
  const align = ["c", "l", "c", "r", "r", "r"];
  const drawRow = (cells, o = {}) => {
    const wrapped = cells.map((c, i) => wrapText(String(c ?? ""), cols[i] - 2 * PAD, (q) => width(q, FS, o.bold)));
    const rh = Math.max(...wrapped.map((l) => l.length)) * LH + 2 * PAD - 2;
    if (y - rh < M) { newPage(); if (!o.head) drawRow(head, { bold: true, head: true, fill: true }); }
    if (o.fill) page.drawRectangle({ x: M, y: y - rh, width: CW, height: rh, color: fill });
    wrapped.forEach((lines, i) => lines.forEach((ln, k) => {
      const w = width(ln, FS, o.bold), a = o.head ? "c" : align[i];
      const x = a === "l" ? xs[i] + PAD : a === "r" ? xs[i] + cols[i] - PAD - w : xs[i] + (cols[i] - w) / 2;
      text(ln, x, y - PAD - (k + 1) * LH + LH * 0.32, { size: FS, bold: o.bold });
    }));
    page.drawRectangle({ x: M, y: y - rh, width: CW, height: rh, borderColor: lineC, borderWidth: 0.6 });
    xs.slice(1).forEach((x) => page.drawLine({ start: { x, y }, end: { x, y: y - rh }, color: lineC, thickness: 0.6 }));
    y -= rh;
  };
  drawRow(head, { bold: true, head: true, fill: true });
  m.items.forEach((x, i) => drawRow([i + 1, x.n, x.u, qtyText(x.q), x.p ? money(parseVN(x.p)) : "", money(m.t.lines[i])]));
  y -= 8;

  // tổng
  const t = m.t;
  const sums = [["Cộng tiền hàng", money(t.subtotal)]];
  if (t.discount) sums.push(["Chiết khấu" + (v.discType === "pct" ? ` (${fmtNum(parseVN(v.disc), 2)}%)` : ""), "−" + money(t.discount)]);
  if (t.rate != null) sums.push([`Thuế GTGT (${fmtNum(t.rate, 2)}%)`, money(t.vat)]);
  if (t.shipping) sums.push(["Phí vận chuyển", money(t.shipping)]);
  sums.push(["Tổng cộng", money(t.total) + " đ"]);
  sums.forEach(([l, val], i) => {
    const last = i === sums.length - 1, size = last ? 11.5 : 10;
    ensure(size * 1.6); y -= size * 1.6;
    text(l, W - M - 250, y, { size, bold: last, color: last ? ink : mute });
    text(val, W - M - width(val, size, last), y, { size, bold: last });
  });
  y -= 8;
  if (m.words) { const lw = width("Số tiền bằng chữ: ", 10); const lines = wrapText(m.words + ".", CW - lw, (q) => width(q, 10)); lines.forEach((ln, i) => { ensure(15); y -= 15; if (!i) text("Số tiền bằng chữ: ", M, y, { color: mute }); text(ln, M + lw, y); }); }
  if (v.notes) { y -= 6; labeled("Ghi chú", v.notes); }
  y -= 16;

  // QR và chữ ký
  const qrS = 92;
  ensure(Math.max(qrS + 26, 110));
  const top = y;
  if (m.qr) {
    const png = await canvasBlob(drawQR(document.createElement("canvas"), await qrMatrix(m.qr.payload, "M"), { px: 400, margin: 2 }));
    const img = await doc.embedPng(await png.arrayBuffer());
    page.drawImage(img, { x: M, y: top - qrS, width: qrS, height: qrS });
    const cap = `${m.qr.bank.short} · ${m.qr.acc}`;
    text("Quét mã để chuyển khoản", M, top - qrS - 12, { size: 8.5, color: mute });
    text(cap, M, top - qrS - 23, { size: 8.5 });
    if (m.qr.name) text(m.qr.name.toUpperCase(), M, top - qrS - 34, { size: 8.5 });
  }
  const sx = m.qr ? M + 150 : M, sw = (W - M - sx) / 2;
  [[isQuote(v) ? "Khách hàng" : "Người mua hàng", ""], [isQuote(v) ? "Người báo giá" : "Người bán hàng", v.sign]].forEach(([title, name], i) => {
    const cx = sx + sw * i + sw / 2;
    text(title, cx - width(title, 10.5, true) / 2, top - 4, { size: 10.5, bold: true });
    const hint = "(Ký, ghi rõ họ tên)";
    text(hint, cx - width(hint, 8.5) / 2, top - 17, { size: 8.5, color: mute });
    if (name) text(name, cx - width(name, 10.5, true) / 2, top - 92, { size: 10.5, bold: true });
  });
  return new Blob([await doc.save()], { type: "application/pdf" });
}

/* ---------- form ---------- */
let qrUrl = "", qrKey = "", seq = 0;
// nhớ thông tin trên máy này (ngày lập luôn lấy ngày hôm nay khi mở lại); khai báo trước formTool vì compute chạy ngay
const saveLocal = debounce((v) => store.set(KEY, v), 400);
const api = formTool({
  fields: [
    { id: "doc", type: "seg", label: "Loại chứng từ", value: "quote", choices: [["quote", "Báo giá"], ["sale", "Hoá đơn bán lẻ"]] },
    { id: "title", label: "Tiêu đề (tuỳ chọn)", value: "", placeholder: "Mặc định: BẢNG BÁO GIÁ / PHIẾU BÁN HÀNG" },
    { id: "no", label: "Số", value: "BG-001", attrs: { autocomplete: "off" } },
    { id: "date", type: "date", label: "Ngày lập", value: today(), url: false },
    { id: "valid", type: "number", label: "Báo giá có hiệu lực (ngày)", value: "15", attrs: { min: 0, max: 365 }, show: isQuote },
    sec("Bên bán"),
    { id: "sname", label: "Tên cửa hàng / công ty", value: "", placeholder: "Cửa hàng Văn phòng phẩm Hoa Mai" },
    { id: "saddr", label: "Địa chỉ", value: "" },
    { id: "sphone", label: "Điện thoại", value: "", attrs: { type: "tel", inputmode: "tel" } },
    { id: "semail", label: "Email", value: "", attrs: { type: "email", inputmode: "email" } },
    { id: "stax", label: "Mã số thuế (tuỳ chọn)", value: "", attrs: { inputmode: "numeric" } },
    sec("Khách hàng"),
    { id: "bname", label: "Tên khách hàng", value: "" },
    { id: "baddr", label: "Địa chỉ", value: "" },
    { id: "bphone", label: "Điện thoại", value: "", attrs: { type: "tel", inputmode: "tel" } },
    { id: "btax", label: "Mã số thuế (tuỳ chọn)", value: "", attrs: { inputmode: "numeric" } },
    sec("Hàng hoá"),
    { id: "items", type: "custom", value: "[]", render: itemsField },
    { id: "disc", label: "Chiết khấu", value: "", placeholder: "0", attrs: { inputmode: "decimal" } },
    { id: "discType", type: "seg", label: "Chiết khấu tính theo", value: "pct", choices: [["pct", "%"], ["amount", "Số tiền (đ)"]] },
    { id: "vat", type: "select", label: "Thuế GTGT", value: "", choices: [["", "Không ghi thuế"], ["0", "0%"], ["5", "5%"], ["8", "8%"], ["10", "10%"]], hint: "Thuế suất 8% áp dụng cho nhiều hàng hoá, dịch vụ đến hết 31/12/2026 (Nghị quyết 204/2025/QH15)." },
    { id: "ship", type: "money", label: "Phí vận chuyển", value: "", suffix: "đ" },
    { id: "notes", type: "textarea", label: "Ghi chú, điều khoản", value: "", placeholder: "Ví dụ: Giao hàng trong 3 ngày. Thanh toán 50% khi đặt hàng." },
    sec("Thanh toán, chữ ký"),
    { id: "bank", type: "custom", value: "", render: bankField },
    { id: "acc", label: "Số tài khoản", value: "", attrs: { inputmode: "text", spellcheck: "false" }, show: (v) => !!v.bank },
    { id: "accName", label: "Tên chủ tài khoản", value: "", attrs: { autocapitalize: "characters" }, show: (v) => !!v.bank },
    { id: "sign", label: "Họ tên người lập (in dưới chữ ký)", value: "" }
  ],
  init(api) {
    if (!location.search) { const s = store.get(KEY, null); if (s) for (const [k, v] of Object.entries(s)) if (api.ctrls[k] && k !== "date") api.ctrls[k].set(v); }
  },
  async compute(v, out) {
    const my = ++seq;
    saveLocal(v);
    const m = model(v);
    if (m.qr && qrKey !== m.qr.payload) {
      const c = drawQR(document.createElement("canvas"), await qrMatrix(m.qr.payload, "M"), { px: 360, margin: 2 });
      if (my !== seq) return;
      qrUrl = c.toDataURL("image/png"); qrKey = m.qr.payload;
    }
    if (my !== seq) return;
    out.textContent = "";
    out.append(
      h("div", { class: "row iv-acts" },
        h("button", { class: "btn", type: "button", disabled: !m.items.length, onclick: async (e) => {
          const b = e.currentTarget; b.disabled = true;
          try { save(await buildPdf(api.values(), model(api.values())), `${(isQuote(v) ? "bao-gia" : "phieu-ban-hang")}${v.no ? "-" + v.no.replace(/[^\w-]+/g, "-") : ""}.pdf`); }
          catch (err) { console.error(err); toast(err.userMsg || "Không tạo được PDF. Hãy kiểm tra kết nối mạng (cần tải font) rồi thử lại.", { type: "err" }); }
          b.disabled = false;
        } }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải PDF"),
        h("button", { class: "btn ghost", type: "button", title: "Tăng số chứng từ để lập phiếu mới", onclick: () => { api.set("no", nextNumber(api.get("no"))); toast("Số mới: " + api.get("no")); } }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Số tiếp theo")),
      paper(v, m, m.qr ? qrUrl : ""),
      !isQuote(v) ? h("p", { class: "hint", text: "Phiếu bán hàng (hoá đơn bán lẻ) này dùng để giao cho khách, không thay thế hoá đơn điện tử theo Nghị định 123/2020/NĐ-CP khi bên mua cần hoá đơn hợp lệ để kê khai." }) : "",
      bankWarn(v));
  }
});
function bankWarn(v) {
  const b = byBin[v.bank];
  if (!b) return "";
  if (!cleanAccount(v.acc)) return h("p", { class: "alert info", text: "Nhập số tài khoản để in mã QR chuyển khoản." });
  return b.napas247 ? "" : h("p", { class: "alert warn", text: "Ngân hàng này có thể chưa hỗ trợ nhận tiền qua mã VietQR." });
}

const css = document.createElement("style");
css.textContent = `
.iv-sec{margin:14px 0 -4px;padding-top:10px;border-top:1px solid var(--line)}
.iv-head,.iv-row{display:grid;grid-template-columns:22px minmax(0,1fr) 56px 56px 96px 100px 32px;gap:6px;align-items:center}
.iv-head{font-size:12px;color:var(--muted);padding:0 2px}
.iv-items{display:flex;flex-direction:column;gap:6px;margin:4px 0 8px}
.iv-row input{width:100%;min-width:0;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:14px}
.iv-row input:focus{outline:2px solid var(--brand);outline-offset:-1px}
.iv-no{font-size:12px;color:var(--muted);text-align:center}
.iv-total{font-size:13px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.iv-q,.iv-p{text-align:right}
@media (max-width:720px){
  .iv-head{display:none}
  .iv-row{grid-template-columns:22px 1fr 1fr 32px;grid-template-areas:"no n n x" ". u q ." ". p t t";border:1px solid var(--line);border-radius:10px;padding:8px}
  .iv-no{grid-area:no}.iv-n{grid-area:n}.iv-u{grid-area:u}.iv-q{grid-area:q}.iv-p{grid-area:p}.iv-total{grid-area:t;align-self:center}.iv-row .ib{grid-area:x}
}
.iv-acts{margin-bottom:12px}
.iv-paper{background:#fff;color:#1f1f1f;border-radius:6px;box-shadow:var(--shadow);padding:22px 20px;font-size:13px;line-height:1.5}
.iv-paper p{margin:0}
.iv-sname{font-weight:700;font-size:15px}
.iv-l{color:#5b6271}
.iv-title{text-align:center;font-size:20px;margin:18px 0 2px;letter-spacing:.5px;color:#1f1f1f}
.iv-meta{text-align:center;color:#5b6271;margin-bottom:12px!important}
.iv-buyer{margin-bottom:10px}
.iv-twrap{overflow-x:auto}
.iv-t{width:100%;border-collapse:collapse;font-size:12.5px;min-width:440px}
.iv-t th,.iv-t td{border:1px solid #c5c9d0;padding:5px 6px;text-align:center;vertical-align:top}
.iv-t th{background:#eff1f5;font-weight:600}
.iv-t td.l{text-align:left}.iv-t td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.iv-empty{color:#888;font-style:italic}
.iv-sum{margin:10px 0 6px auto;border-collapse:collapse;font-size:13px}
.iv-sum td{padding:2px 0 2px 18px;text-align:right;font-variant-numeric:tabular-nums}
.iv-sum td:first-child{color:#5b6271}
.iv-sum .iv-grand td{font-weight:700;font-size:15px;color:#1f1f1f;border-top:1px solid #c5c9d0;padding-top:4px}
.iv-words,.iv-notes{margin-top:6px!important;white-space:pre-wrap}
.iv-foot{display:flex;gap:16px;align-items:flex-start;margin-top:18px;flex-wrap:wrap}
.iv-qr{margin:0;width:120px;font-size:11px;color:#5b6271}
.iv-qr img{width:120px;height:120px;display:block}
.iv-signs{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:center;min-width:220px}
.iv-signs small{display:block;color:#5b6271;font-size:11px}
.iv-signname{margin-top:64px!important;font-weight:700}
`;
document.head.append(css);
