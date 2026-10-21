/* Đánh số trang PDF: xem trước ngay trên các trang, chữ vector (Helvetica) trong file kết quả, đúng chiều cả với trang bị xoay */
import { h, lib, baseName, sampleFiles } from "../core.js";
import { seg, radioVal } from "../frames/file.js";
import { pageTool, firstItem, visDims, posGrid, colorPick } from "../pdf-pages.js";
import { libDoc, pdfBlob } from "../pdf.js";
import { geom, toUser, pageLabel, labelPos, hexRgb } from "../lib/pdf-geom.js";

const POS = [["tl", "Trên trái"], ["tc", "Trên giữa"], ["tr", "Trên phải"], ["bl", "Dưới trái"], ["bc", "Dưới giữa"], ["br", "Dưới phải"]];
const FMTS = [["{n}", "1"], ["Trang {n}", "Trang 1"], ["{n} / {N}", "1 / 10"], ["Trang {n} / {N}", "Trang 1 / 10"], ["- {n} -", "- 1 -"]];
const COLORS = [["#000000", "Đen"], ["#6B6F80", "Xám"], ["#C62828", "Đỏ"], ["#1A4FA0", "Xanh"]];
let get = null;

pageTool({
  action: "Đánh số trang",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  decorate(sheet, p, idx, B) {
    if (!get) return;
    const o = get(), t = pageLabel(o, idx, B.pages.length);
    if (t == null) return;
    const [vw, vh] = visDims(p);
    const el = h("div", { class: "deco", text: t, style: { color: o.color, fontFamily: "Helvetica, Arial, sans-serif", fontSize: `max(7px, ${(o.size / vw) * 100}cqw)` } }); // thẻ trang nhỏ: giữ cỡ tối thiểu để còn đọc được
    const mx = (o.margin / vw) * 100 + "%", my = ((o.margin - o.size * 0.2) / vh) * 100 + "%";
    if (o.pos[0] === "t") el.style.top = my; else el.style.bottom = my;
    if (o.pos[1] === "l") el.style.left = mx;
    else if (o.pos[1] === "r") el.style.right = mx;
    else { el.style.left = "50%"; el.style.transform = "translateX(-50%)"; }
    sheet.append(el);
  },
  options(el, ctx, B) {
    const fmt = h("select", { class: "select", id: "fmt" }, FMTS.map(([v, l]) => h("option", { value: v, text: l, selected: v === "{n} / {N}" })));
    const start = h("input", { class: "input", id: "start", type: "number", min: 0, value: 1, inputmode: "numeric" });
    const skip = h("input", { type: "checkbox", id: "skip" });
    el.append(
      posGrid("pos", POS, "bc", "Vị trí"),
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Kiểu số" }), fmt)),
      h("label", { class: "switch" }, skip, h("span", null, "Không đánh số trang bìa", h("small", { text: "Trang 2 sẽ mang số bắt đầu." }))),
      h("details", { class: "opt-more" }, h("summary", { text: "Tuỳ chỉnh thêm" }),
        h("div", { class: "opt-group" },
          h("label", { class: "field" }, h("span", { text: "Số bắt đầu" }), start),
          seg("size", [["9", "Nhỏ"], ["11", "Vừa"], ["14", "Lớn"], ["18", "Rất lớn"]], "11", "Cỡ chữ"),
          seg("margin", [["18", "Sát mép"], ["30", "Vừa"], ["46", "Xa mép"]], "30", "Cách mép trang"),
          colorPick("color", COLORS, "#000000", "Màu chữ"))));
    get = () => ({ pos: radioVal(el, "pos"), fmt: fmt.value, start: Math.max(0, parseInt(start.value, 10) || 0), skip: skip.checked ? 1 : 0,
      size: +radioVal(el, "size"), margin: +radioVal(el, "margin"), color: radioVal(el, "color") });
    return get;
  },
  onChange(B) { B.redecorate(); },
  summary(B, o) {
    const n = B.pages.length - o.skip;
    return n > 0 ? `Đánh số <b>${n}</b> trang, từ “${pageLabel(o, o.skip, B.pages.length)}”.` : "Không có trang nào để đánh số.";
  },
  ready: (B, o) => (B.pages.length - o.skip > 0 ? true : "File chỉ có trang bìa."),
  async run(B, o, ctx) {
    ctx.status("Đang đánh số trang…"); ctx.progress(-1);
    const L = await lib("pdflib");
    const it = firstItem(B);
    const doc = await libDoc(it.bytes, it.password);
    const font = await doc.embedFont(L.StandardFonts.Helvetica);
    const color = L.rgb(...hexRgb(o.color));
    const pages = doc.getPages();
    pages.forEach((page, idx) => {
      const t = pageLabel(o, idx, pages.length);
      if (t == null) return;
      const g = geom(page.getCropBox(), page.getRotation().angle);
      const [vx, vy] = labelPos(g.VW, g.VH, o.pos, font.widthOfTextAtSize(t, o.size), o.size, o.margin);
      const [x, y] = toUser(g, vx, vy);
      page.drawText(t, { x, y, size: o.size, font, color, rotate: L.degrees(g.r) });
    });
    return [{ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: baseName(it.name) + "-danh-so.pdf", note: pages.length + " trang" }];
  },
  doneTitle: () => "Đã đánh số trang!"
});
