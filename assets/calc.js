/* Tiện ích dùng chung cho các công cụ tính toán (Tiện ích Việt Nam, Tính toán & đời sống): đọc dữ liệu, định dạng tiền,
   vẽ bảng, thẻ số, danh sách khoá–giá trị, tải bảng ra CSV. */
import { h, ROOT, fmtNum, save, icon } from "./core.js";

const cache = {};
/** Đọc data/<tên>.json (một lần) */
export function loadData(name) {
  return (cache[name] = cache[name] || fetch(ROOT + "data/" + name + ".json").then((r) => { if (!r.ok) throw new Error("Không tải được dữ liệu " + name); return r.json(); }));
}

/** 1234567 → "1.234.567 đ" */
export const money = (n, unit = "\u00a0đ") => (Number.isFinite(n) ? fmtNum(Math.round(n)) + unit : "–");
/** Số có tối đa d chữ số thập phân, dấu phẩy kiểu Việt */
export const num = (n, d = 2) => (Number.isFinite(n) ? fmtNum(n, d) : "–");
export const pct = (r, d = 2) => fmtNum(r * 100, d) + "%";
/** "dd/mm/yyyy" từ { y, m, d } hoặc Date */
export function dateVN(p) {
  if (p instanceof Date) p = { y: p.getFullYear(), m: p.getMonth() + 1, d: p.getDate() };
  return `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
}

/** Danh sách khoá–giá trị: kv([["Lương", "10.000.000 đ"], …]) */
export function kv(rows) {
  return h("dl", { class: "kv" }, rows.filter(Boolean).map(([k, v, cls]) => [h("dt", { text: k }), h("dd", { class: cls || null }, v)]));
}
/** Thẻ số: stat("Lương net", "26.215.000 đ", { hl: true, note: "…" }) */
export function stat(label, value, o = {}) {
  return h("div", { class: "stat" + (o.hl ? " hl" : "") + (o.tone ? " " + o.tone : "") }, h("b", { text: value }), h("span", { text: label }), o.note ? h("small", { text: o.note }) : null);
}
export const stats = (...items) => h("div", { class: "stats flush" }, items.filter(Boolean));

/** Bảng: table(["Cột 1", …], [[ô, …], …], { foot: [ô…], cls: ["l", …] (lớp cho từng cột), tall, hl: (row, i) => bool, caption }) */
export function table(head, rows, o = {}) {
  const cell = (tag, v, i) => h(tag, { class: (o.cls && o.cls[i]) || null }, v == null ? "" : v);
  const t = h("table", { class: "tbl" },
    o.caption ? h("caption", { class: "sr-only", text: o.caption }) : null,
    h("thead", null, h("tr", null, head.map((x, i) => h("th", { scope: "col", class: (o.cls && o.cls[i]) || null }, x)))),
    h("tbody", null, rows.map((r, k) => h("tr", { class: o.hl && o.hl(r, k) ? "hl" : null }, r.map((v, i) => cell("td", v, i))))),
    o.foot ? h("tfoot", null, h("tr", null, o.foot.map((v, i) => cell("td", v, i)))) : null);
  return h("div", { class: "tbl-wrap" + (o.tall ? " tall" : ""), tabindex: o.tall ? "0" : null, role: o.tall ? "region" : null, "aria-label": o.tall ? o.caption || "Bảng số liệu" : null }, t);
}

/** Nút tải bảng ra CSV (Excel mở được, có BOM UTF-8) */
export function csvButton(name, head, rows, label = "Tải bảng (CSV)") {
  return h("button", { class: "btn ghost sm", type: "button", onclick: () => {
    const q = (v) => { const s = String(v ?? ""); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const text = "\uFEFF" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
    save(new Blob([text], { type: "text/csv;charset=utf-8" }), name);
  } }, h("span", { html: icon("download"), style: { display: "contents" } }), label);
}

/** Đoạn ghi chú nhỏ */
export const note = (text, cls = "hint") => h("p", { class: cls, html: text });
export function alert(kind, text, ic) {
  const el = h("p", { class: "alert " + kind, html: icon(ic || (kind === "err" || kind === "warn" ? "triangle-alert" : kind === "ok" ? "circle-check" : "info")) + "<span></span>" });
  el.querySelector("span").textContent = text;
  return el;
}
