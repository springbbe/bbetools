/* Cắt lề PDF: tự tìm và bỏ lề trắng, hoặc nhập lề cần cắt (mm); xem trước vùng bị cắt ngay trên các trang.
   Đặt lại CropBox/MediaBox của trang: nội dung không bị xoá, chỉ phần nằm ngoài khung bị ẩn. */
import { h, lib, baseName, sampleFiles, nextFrame } from "../core.js";
import { seg, radioVal } from "../frames/file.js";
import { pageTool, firstItem, visDims } from "../pdf-pages.js";
import { libDoc, pdfBlob, renderPage } from "../pdf.js";
import { MM, geom, cropBoxFor, inkBounds, autoMargins } from "../lib/pdf-geom.js";

const SIDES = [["top", "Trên"], ["bottom", "Dưới"], ["left", "Trái"], ["right", "Phải"]];
let get = null, board = null, scanning = false, scanned = 0;

// tìm vùng có nội dung của từng trang (vẽ nhỏ rồi dò điểm khác trắng)
async function scan(B) {
  if (scanning) return;
  scanning = true;
  const todo = B.pages.filter((p) => !p.blank && !p.ink);
  scanned = B.pages.length - todo.length;
  for (const p of todo) {
    try {
      const c = await renderPage(p.it.doc, p.n, { width: 320, rotation: p.rot });
      const g = c.getContext("2d", { willReadFrequently: true });
      const b = inkBounds(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
      p.ink = { b, px: c.width, py: c.height, k: c.width / visDims(p)[0] };
      c.width = c.height = 0;
    } catch (_) { p.ink = { b: null, px: 1, py: 1, k: 1 }; }
    scanned++;
    if (scanned % 3 === 0 || scanned === B.pages.length) { B.redecorate(); B.ctx.refresh(); await nextFrame(); }
  }
  scanning = false;
  B.redecorate(); B.ctx.refresh();
}

// lề (pt, theo chiều nhìn thấy) của trang p
function marginsOf(p, o, B) {
  if (o.mode === "manual") return Object.fromEntries(SIDES.map(([k]) => [k, o[k] * MM]));
  const one = (q) => (q.ink ? autoMargins(q.ink.b, q.ink.px, q.ink.py, q.ink.k, o.pad * MM) : { top: 0, right: 0, bottom: 0, left: 0 });
  if (!o.same) return one(p);
  // cắt đều: lấy lề nhỏ nhất của mọi trang cùng khổ để các trang giữ cùng kích thước
  const [w, hh] = visDims(p), same = B.pages.filter((q) => !q.blank && Math.abs(visDims(q)[0] - w) < 2 && Math.abs(visDims(q)[1] - hh) < 2 && q.ink && q.ink.b);
  if (!same.length) return one(p);
  const ms = same.map(one);
  return Object.fromEntries(SIDES.map(([k]) => [k, Math.min(...ms.map((m) => m[k]))]));
}

pageTool({
  action: "Cắt lề",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  decorate(sheet, p, idx, B) {
    if (!get) return;
    const o = get(), m = marginsOf(p, o, B), [vw, vh] = visDims(p);
    const pct = (v, d) => Math.min(100, (v / d) * 100) + "%";
    const box = h("div", { class: "deco crop-keep", style: { left: pct(m.left, vw), right: pct(m.right, vw), top: pct(m.top, vh), bottom: pct(m.bottom, vh) } });
    sheet.append(box);
  },
  options(el, ctx, B) {
    board = B;
    const num = (id, label) => h("label", { class: "field" }, h("span", { text: label }), h("input", { class: "input", id, type: "number", min: 0, max: 200, step: 1, value: 10, inputmode: "decimal" }));
    const pad = h("input", { class: "input", id: "pad", type: "number", min: 0, max: 50, step: 1, value: 4, inputmode: "decimal" });
    const same = h("input", { type: "checkbox", id: "same", checked: true });
    el.append(
      seg("mode", [["auto", "Tự bỏ lề trắng"], ["manual", "Nhập lề (mm)"]], "auto", "Cách cắt"),
      h("div", { class: "opt-group", id: "g-auto" },
        h("label", { class: "field" }, h("span", { text: "Chừa lại quanh nội dung (mm)" }), pad),
        h("label", { class: "switch" }, same, h("span", null, "Cắt đều các trang", h("small", { text: "Giữ cùng kích thước cho các trang cùng khổ, hợp với sách, tài liệu scan." })))),
      h("div", { class: "opt-group", id: "g-manual", hidden: true }, h("div", { class: "crop-grid" }, SIDES.map(([k, l]) => num("m-" + k, l)))),
      h("p", { class: "hint", text: "Khung xanh trên trang là phần được giữ lại. Nội dung ngoài khung chỉ bị ẩn đi, không bị xoá khỏi file." }));
    get = () => ({ mode: radioVal(el, "mode"), pad: Math.max(0, +pad.value || 0), same: same.checked, ...Object.fromEntries(SIDES.map(([k]) => [k, Math.max(0, +el.querySelector("#m-" + k).value || 0)])) });
    return get;
  },
  onChange(B, ctx) {
    const o = get(), e = ctx.optsEl;
    e.querySelector("#g-auto").hidden = o.mode !== "auto";
    e.querySelector("#g-manual").hidden = o.mode !== "manual";
    if (o.mode === "auto" && B.pages.some((p) => !p.blank && !p.ink)) scan(B);
    B.redecorate();
  },
  summary(B, o) {
    if (o.mode === "auto" && scanning) return `Đang tìm lề trắng… ${scanned}/${B.pages.length} trang`;
    const bad = B.pages.filter((p) => { const m = marginsOf(p, o, B), [w, hh] = visDims(p); return m.left + m.right >= w - 1 || m.top + m.bottom >= hh - 1; }).length;
    if (bad) return `Lề quá lớn: ${bad} trang sẽ bị cắt hết. Hãy giảm lề.`;
    const p = B.pages[0], m = marginsOf(p, o, B), [w, hh] = visDims(p);
    return `Trang 1 còn <b>${Math.round((w - m.left - m.right) / MM)} × ${Math.round((hh - m.top - m.bottom) / MM)} mm</b> (gốc ${Math.round(w / MM)} × ${Math.round(hh / MM)} mm).`;
  },
  ready(B, o) {
    if (o.mode === "auto" && scanning) return "Đang tìm lề trắng…";
    if (B.pages.some((p) => { const m = marginsOf(p, o, B), [w, hh] = visDims(p); return m.left + m.right >= w - 1 || m.top + m.bottom >= hh - 1; })) return "Lề quá lớn so với trang.";
    if (B.pages.every((p) => { const m = marginsOf(p, o, B); return m.top + m.bottom + m.left + m.right < 0.5; })) return o.mode === "auto" ? "Không tìm thấy lề trắng nào để cắt." : "Nhập lề cần cắt.";
    return true;
  },
  async run(B, o, ctx) {
    ctx.status("Đang cắt lề…"); ctx.progress(-1);
    const it = firstItem(B), doc = await libDoc(it.bytes, it.password);
    const pages = doc.getPages();
    B.pages.forEach((p) => {
      const page = pages[p.n - 1], g = geom(page.getCropBox(), page.getRotation().angle), r = cropBoxFor(g, marginsOf(p, o, B));
      if (!r) return;
      page.setMediaBox(r.x, r.y, r.width, r.height);
      page.setCropBox(r.x, r.y, r.width, r.height);
      for (const k of ["TrimBox", "BleedBox", "ArtBox"]) page.node.delete(page.node.context.obj(k));
    });
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + "-da-cat-le.pdf", note: pages.length + " trang" }];
  },
  doneTitle: () => "Đã cắt lề PDF!"
});

const css = document.createElement("style");
css.textContent = ".crop-keep{position:absolute;box-shadow:0 0 0 999px rgba(15,18,28,.45);outline:2px solid #12A594;z-index:1}.crop-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}";
document.head.append(css);
