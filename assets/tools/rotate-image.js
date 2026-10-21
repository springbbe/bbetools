/* Xoay, lật ảnh: xoay 90° trái/phải, 180°, lật ngang/dọc từng ảnh hoặc tất cả cùng lúc; xem trước ngay trên ảnh thu nhỏ */
import { h, icon, baseName, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode, EXT, formatOptions, outType } from "../image.js";
import { orientMatrix, normRot } from "../lib/image-geom.js";

let getFmt = null;
const ACTS = [
  ["l", "rotate-ccw", "Xoay trái 90°"],
  ["r", "rotate-cw", "Xoay phải 90°"],
  ["fh", "flip-vertical-2", "Lật ngang (soi gương)"],
  ["fv", "flip-horizontal-2", "Lật dọc"]
];

// icon: ở lucide-static 1.52, "flip-vertical-2" là hình soi gương trái–phải (lật ngang), "flip-horizontal-2" là lật trên–dưới
// trạng thái: ảnh hiển thị = lật(fh, fv) ∘ xoay(r) ∘ ảnh gốc. Thao tác áp lên ảnh đang thấy:
// xoay 90° sau khi lật = lật đổi chiều (ngang ↔ dọc) rồi xoay, nên khi xoay thì đổi chỗ fh, fv
function act(it, a) {
  if (a === "l" || a === "r") { it.r = normRot(it.r + (a === "r" ? 90 : -90)); [it.fh, it.fv] = [it.fv, it.fh]; }
  else if (a === "180") it.r = normRot(it.r + 180);
  else if (a === "fh") it.fh = !it.fh;
  else if (a === "fv") it.fv = !it.fv;
  else if (a === "reset") { it.r = 0; it.fh = it.fv = false; }
  if (it.fh && it.fv) { it.fh = it.fv = false; it.r = normRot(it.r + 180); } // lật cả hai chiều = xoay 180°
}
const changed = (it) => it.r || it.fh || it.fv;
function describe(it) {
  const p = [];
  if (it.r) p.push(it.r === 90 ? "xoay phải 90°" : it.r === 180 ? "xoay 180°" : "xoay trái 90°");
  if (it.fh) p.push("lật ngang");
  if (it.fv) p.push("lật dọc");
  return p.join(", ");
}

function thumbOf(it) {
  const o = orientMatrix(it.small.width, it.small.height, it.r, it.fh, it.fv);
  const c = canvas(o.width, o.height), g = c.getContext("2d");
  g.setTransform(...o.m);
  g.drawImage(it.small, 0, 0);
  return c.toDataURL("image/jpeg", 0.85);
}
function update(it) {
  it.thumb = thumbOf(it);
  const [w, hh] = it.r % 180 ? [it.bmp.height, it.bmp.width] : [it.bmp.width, it.bmp.height];
  it.info = `${w}×${hh}` + (changed(it) ? " · " + describe(it) : "");
}

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "ảnh",
  action: "Lưu ảnh",
  sample: () => sampleFiles("anh-phong-canh.jpg", "ma-qr-mau.png"),
  async load(it) {
    it.bmp = await decodeImage(it.file);
    it.small = drawScaled(it.bmp, ...fitThumb(it.bmp), "#fff");
    it.r = 0; it.fh = it.fv = false;
    update(it);
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  itemActions: (it, ctx) => it.bmp ? ACTS.map(([a, ic, label]) => h("button", { class: "ib sm", type: "button", title: label, "aria-label": label + " " + it.name, html: icon(ic), onclick: () => { act(it, a); update(it); ctx.render(); } })) : [],
  options(el, ctx) {
    const all = (a) => { ctx.items.filter((i) => i.bmp).forEach((i) => { act(i, a); update(i); }); ctx.render(); };
    const btn = (a, ic, label) => h("button", { class: "btn ghost sm", type: "button", onclick: () => all(a) }, h("span", { html: icon(ic), style: { display: "contents" } }), label);
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Áp dụng cho tất cả ảnh" }),
      h("div", { class: "rot-grid" }, btn("l", "rotate-ccw", "Xoay trái"), btn("r", "rotate-cw", "Xoay phải"), btn("180", "refresh-cw", "Xoay 180°"), btn("fh", "flip-vertical-2", "Lật ngang"), btn("fv", "flip-horizontal-2", "Lật dọc"), btn("reset", "x", "Về như cũ"))),
      h("p", { class: "hint", text: "Hoặc dùng các nút ↺ ↻ ⇋ trên từng ảnh. Ảnh được xoay theo hướng hiển thị (đã tính cả hướng xoay EXIF của điện thoại)." }));
    getFmt = formatOptions(el, { q: 92, avif: true });
    return () => getFmt();
  },
  ready(items) {
    if (!items.some(changed)) return "Bấm nút xoay hoặc lật trên ảnh (hoặc cho tất cả ảnh).";
    return true;
  },
  async run(items, o, ctx) {
    const todo = items.filter(changed), outs = [];
    for (let i = 0; i < todo.length; i++) {
      ctx.check();
      const it = todo[i];
      ctx.status(`Đang lưu ${it.name}${todo.length > 1 ? ` (${i + 1}/${todo.length})` : ""}…`);
      const type = outType(it.file, o);
      const m = orientMatrix(it.bmp.width, it.bmp.height, it.r, it.fh, it.fv);
      const c = canvas(m.width, m.height), g = c.getContext("2d");
      if (type === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
      g.setTransform(...m.m);
      g.drawImage(it.bmp, 0, 0);
      const blob = await encode(c, type, o.q);
      c.width = c.height = 0;
      outs.push({ blob, name: `${baseName(it.name)}-${it.r ? "xoay" : "lat"}.${EXT[type]}`, note: `${m.width}×${m.height} · ${describe(it)}` });
      ctx.progress((i + 1) / todo.length);
    }
    return outs;
  },
  summary: (outs, items) => (items.length > outs.length ? `${items.length - outs.length} ảnh không xoay/lật nên không được lưu lại.` : null),
  zipName: "anh-da-xoay",
  doneTitle: (outs) => (outs.length > 1 ? `Đã xoay, lật ${outs.length} ảnh!` : "Đã xoay, lật ảnh!")
});

function fitThumb(b) { const k = Math.min(1, 224 / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }

const css = document.createElement("style");
css.textContent = ".rot-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rot-grid .btn{justify-content:flex-start}";
document.head.append(css);
