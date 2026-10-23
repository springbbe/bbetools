/* Tự sinh bởi scripts/build.js từ assets/tools/watermark-image.js và i18n/en/js/ — đừng sửa tay. */
/* Chèn watermark ảnh: chữ tiếng Việt hoặc logo, độ đậm, góc xoay, 9 vị trí hoặc lặp kín ảnh; cỡ tính theo % chiều rộng nên
   ảnh to nhỏ khác nhau vẫn đều tay; xem trước ngay; áp dụng hàng loạt */
import { h, icon, toast, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { posGrid, colorPick } from "../pdf-pages.js";
import { decodeImage, drawScaled, canvas, encode, EXT, thumbUrl, formatOptions, outType } from "../image.js";
import { markLayout } from "../lib/pdf-geom.js";

const GRID = [["tl", "Top left"], ["tc", "Top center"], ["tr", "Top right"], ["ml", "Middle left"], ["mc", "Center"], ["mr", "Middle right"], ["bl", "Bottom left"], ["bc", "Bottom center"], ["br", "Bottom right"]];
const COLORS = [["#FFFFFF", "White"], ["#000000", "Black"], ["#9AA0A6", "Gray"], ["#E5484D", "Red"], ["#1A4FA0", "Blue"]];
const FONT = (px) => `800 ${px}px 'Be Vietnam Pro', sans-serif`;
let el = null, logo = null, getFmt = null, prev = null, F = null;

/** Vẽ watermark lên ảnh đã có trong g (W×H) */
function stamp(g, W, H, o) {
  let mark, w, hh;
  if (o.kind === "text") {
    if (!o.text) return;
    const px = Math.max(8, (W * o.size) / 100);
    const m = canvas(1, 1).getContext("2d"); m.font = FONT(px);
    w = m.measureText(o.text).width + px * 0.2; hh = px * 1.3;
    mark = canvas(w, hh);
    const mg = mark.getContext("2d");
    mg.font = FONT(px); mg.textBaseline = "middle"; mg.fillStyle = o.color;
    if (o.shadow) { mg.shadowColor = o.color === "#000000" ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.5)"; mg.shadowBlur = px * 0.08; mg.shadowOffsetY = px * 0.03; }
    mg.fillText(o.text, px * 0.1, hh / 2);
  } else {
    if (!logo) return;
    w = (W * o.lsize) / 100; hh = w * (logo.height / logo.width);
    mark = logo;
  }
  const margin = Math.round(Math.min(W, H) * 0.03);
  g.save();
  g.globalAlpha = o.opacity;
  for (const s of markLayout(W, H, w, hh, { angle: o.angle, tile: o.tile, pos: o.pos, margin })) {
    g.save(); g.translate(s.cx, s.cy); g.rotate((-o.angle * Math.PI) / 180);
    g.drawImage(mark, -w / 2, -hh / 2, w, hh);
    g.restore();
  }
  g.restore();
}

async function setLogo(file) {
  try {
    const bmp = await decodeImage(file);
    logo = drawScaled(bmp, ...fit(bmp, 1600));
    const box = el.querySelector("#logo-prev");
    box.textContent = "";
    box.append(h("img", { src: logo.toDataURL("image/png"), alt: "Selected logo", style: { maxHeight: "64px", maxWidth: "100%", display: "block" } }));
    el.querySelector('input[name="kind"][value="image"]').checked = true;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (e) { toast(e.userMsg || "Couldn't read this image. Try a PNG or JPG.", { type: "err" }); }
}

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "images",
  action: "Add watermark",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png"),
  async load(it, ctx) {
    it.bmp = await decodeImage(it.file);
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    it.thumb = await thumbUrl(it.bmp, 112);
    it.small = drawScaled(it.bmp, ...fit(it.bmp, 900));
    if (!prev) { prev = h("div", { class: "ist-preview" }, h("canvas", { role: "img", "aria-label": "Watermark preview on the first image" })); ctx.workMain.append(prev); }
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  options(e, ctx) {
    el = e; F = ctx;
    const rng = (id, min, max, v, label) => [h("p", { class: "opt-title", text: label }), h("div", { class: "range-row" }, h("input", { type: "range", id, min, max, value: v, "aria-label": label }), h("output", { id: id + "-v" }))];
    const logoIn = h("input", { type: "file", accept: "image/*", hidden: true, onchange: () => { if (logoIn.files[0]) setLogo(logoIn.files[0]); logoIn.value = ""; } });
    e.append(
      seg("kind", [["text", "Text"], ["image", "Logo"]], "text", "Watermark type"),
      h("div", { class: "opt-group", id: "g-text" },
        h("label", { class: "field" }, h("span", { text: "Content" }), h("input", { class: "input", id: "wm-text", value: "© Sample Shop", maxlength: 80, autocomplete: "off" })),
        colorPick("color", COLORS, COLORS[0][0], "Text color"),
        ...rng("size", 2, 20, 6, "Font size (relative to image width)"),
        h("label", { class: "switch" }, h("input", { type: "checkbox", id: "shadow", checked: true }), h("span", { text: "Drop shadow for readability" }))),
      h("div", { class: "opt-group", id: "g-image", hidden: true },
        h("div", { id: "logo-prev", class: "hint", text: "No logo yet. A PNG with a transparent background works best." }), logoIn,
        h("button", { class: "btn ghost sm", type: "button", onclick: () => logoIn.click() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Choose logo…"),
        ...rng("lsize", 5, 80, 25, "Logo width (relative to image)")),
      h("div", { class: "opt-group" }, ...rng("opacity", 10, 100, 60, "Opacity")),
      seg("angle", [["0", "Horizontal"], ["30", "Diagonal up"], ["-30", "Diagonal down"]], "0", "Angle"),
      posGrid("pos", GRID, "br", "Position"),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "tile" }), h("span", null, "Tile across the image", h("small", { text: "Harder to remove, good for product photos; ignores the position above." }))));
    getFmt = formatOptions(e, { q: 90 });
    return () => ({
      kind: radioVal(e, "kind"), text: e.querySelector("#wm-text").value.trim(), color: radioVal(e, "color"), size: +e.querySelector("#size").value,
      shadow: e.querySelector("#shadow").checked, lsize: +e.querySelector("#lsize").value, opacity: +e.querySelector("#opacity").value / 100,
      angle: +radioVal(e, "angle"), pos: radioVal(e, "pos"), tile: e.querySelector("#tile").checked, ...getFmt()
    });
  },
  onChange(ctx) {
    const o = ctx.opts, e = ctx.optsEl;
    e.querySelector("#g-text").hidden = o.kind !== "text";
    e.querySelector("#g-image").hidden = o.kind !== "image";
    e.querySelector("#size-v").textContent = o.size + "%";
    e.querySelector("#lsize-v").textContent = o.lsize + "%";
    e.querySelector("#opacity-v").textContent = Math.round(o.opacity * 100) + "%";
    e.querySelectorAll('input[name="pos"]').forEach((r) => { r.disabled = o.tile; });
    const it = ctx.items.find((i) => i.small);
    if (!prev) return;
    prev.hidden = !it;
    if (!it) return;
    const c = prev.firstChild; c.width = it.small.width; c.height = it.small.height;
    const g = c.getContext("2d");
    g.drawImage(it.small, 0, 0);
    stamp(g, c.width, c.height, o);
  },
  ready: (items, o) => (o.kind === "text" ? (o.text ? true : "Enter the watermark text.") : logo ? true : "Choose a logo for the watermark."),
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i], type = outType(it.file, o);
      ctx.status(`Adding to ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      const c = canvas(it.bmp.width, it.bmp.height), g = c.getContext("2d");
      if (type === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(it.bmp, 0, 0);
      stamp(g, c.width, c.height, o);
      outs.push({ blob: await encode(c, type, o.q), name: `${baseName(it.name)}-watermark.${EXT[type]}`, note: `${c.width}×${c.height}` });
      c.width = c.height = 0;
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "anh-watermark",
  doneTitle: (outs) => (outs.length > 1 ? `Added a watermark to ${outs.length} images!` : "Watermark added!")
});

function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }
// font đậm tải xong thì vẽ lại bản xem trước
if (document.fonts) document.fonts.load(FONT(40), "© Sample Shop").then(() => F && F.refresh()).catch(() => {});
