/* Tự sinh bởi scripts/build.js từ assets/tools/color-picker.js và i18n/en/js/ — đừng sửa tay. */
/* Lấy màu từ ảnh: rê/chạm để xem màu qua kính lúp, bấm để lấy; tự trích bảng màu chủ đạo; sao chép HEX/RGB/HSL;
   tải bảng màu (ảnh PNG + file văn bản có mã CSS). Bàn phím: mũi tên di chuyển con trỏ, Enter để lấy màu. */
import { h, icon, copyText, baseName, sampleFiles, toast } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode } from "../image.js";
import { hex, rgbToHsl, luma, palette } from "../lib/image-data.js";

let S = null, F = null, stage, view, loupe, cursor, pickedEl, palEl;
const fmt = { hex: (c) => hex(c), rgb: (c) => `rgb(${c.join(", ")})`, hsl: (c) => { const [a, b, l] = rgbToHsl(c); return `hsl(${a}, ${b}%, ${l}%)`; } };

fileTool({
  accept: ["image", "heic"], multiple: false, noun: "images",
  action: "Download palette",
  sample: () => sampleFiles("anh-phong-canh.jpg"),
  custom: { mount },
  options(el) {
    pickedEl = h("div", { class: "cp-list", "aria-live": "polite" });
    palEl = h("div", { class: "cp-list" });
    el.append(
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Picked colors" }), pickedEl),
      seg("n", [["5", "5 colors"], ["8", "8 colors"], ["12", "12 colors"]], "8", "Dominant palette"),
      palEl,
      seg("cf", [["hex", "HEX"], ["rgb", "RGB"], ["hsl", "HSL"]], "hex", "Copy as"),
      window.EyeDropper ? h("button", { class: "btn ghost sm", type: "button", onclick: screenPick }, h("span", { html: icon("pipette"), style: { display: "contents" } }), "Pick any color on the screen") : null);
    return () => ({ n: +radioVal(el, "n"), cf: radioVal(el, "cf") });
  },
  async onAdd(items, ctx) { await start(items[0], ctx); },
  onChange(ctx) { if (S && S.palN !== ctx.opts.n) computePalette(); renderLists(); },
  ready: () => (S && S.pal ? true : "Reading image…"),
  async run(items, o, ctx) {
    const cols = [...S.picked, ...S.pal.map((p) => p.rgb)].filter((c, i, a) => a.findIndex((d) => hex(d) === hex(c)) === i);
    const sw = 160, c = canvas(sw * Math.min(cols.length, 6), Math.ceil(cols.length / 6) * (sw + 44)), g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    cols.forEach((col, i) => {
      const x = (i % 6) * sw, y = Math.floor(i / 6) * (sw + 44);
      g.fillStyle = hex(col); g.fillRect(x, y, sw, sw);
      g.fillStyle = "#222"; g.font = "600 20px 'Be Vietnam Pro', sans-serif"; g.textAlign = "center"; g.fillText(hex(col), x + sw / 2, y + sw + 28);
    });
    const text = ["Palette from " + S.it.name + " (BbeTools)", "", ...cols.map((col) => `${hex(col)}  ${fmt.rgb(col)}  ${fmt.hsl(col)}`), "", ":root {", ...cols.map((col, i) => `  --color-${i + 1}: ${hex(col)};`), "}"].join("\n");
    const base = baseName(S.it.name);
    return [
      { blob: await encode(c, "image/png"), name: `${base}-palette.png`, note: `${cols.length} colors` },
      { blob: new Blob([text], { type: "text/plain;charset=utf-8" }), name: `${base}-palette.txt`, note: "HEX, RGB, HSL codes and CSS variables" }
    ];
  },
  doneTitle: () => "Palette ready!"
});

function swatch(col, label, onRemove) {
  const o = F ? F.opts : { cf: "hex" }, txt = fmt[o.cf](col);
  return h("div", { class: "cp-item" },
    h("button", { class: "cp-sw", type: "button", style: { background: hex(col), color: luma(col) > 0.6 ? "#111" : "#fff" }, title: "Copy " + txt, "aria-label": `${label || "Color"} ${txt}, click to copy`, onclick: () => copyText(txt, "Copied " + txt), html: icon("copy") }),
    h("span", { class: "cp-txt" }, h("b", { text: hex(col) }), h("small", { text: `${fmt.rgb(col)} · ${fmt.hsl(col)}` })),
    onRemove ? h("button", { class: "ib sm", type: "button", "aria-label": "Remove color " + hex(col), html: icon("x"), onclick: onRemove }) : null);
}
function renderLists() {
  if (!pickedEl) return;
  pickedEl.textContent = "";
  if (!S || !S.picked.length) pickedEl.append(h("p", { class: "hint", text: "Click the image to pick a color." }));
  else S.picked.forEach((c, i) => pickedEl.append(swatch(c, "Picked colors", () => { S.picked.splice(i, 1); renderLists(); })));
  palEl.textContent = "";
  if (S && S.pal) S.pal.forEach((p) => palEl.append(swatch(p.rgb, `Dominant color (${Math.round(p.share * 100)}%)`)));
}

function computePalette() {
  const n = F.opts.n, g = S.small.getContext("2d", { willReadFrequently: true });
  S.pal = palette(g.getImageData(0, 0, S.small.width, S.small.height), n).slice(0, n);
  S.palN = n;
}

function mount(ctx) {
  F = ctx;
  view = h("canvas", { role: "img", "aria-label": "Image to pick colors from" });
  loupe = h("canvas", { class: "cp-loupe", width: 110, height: 110, "aria-hidden": "true", hidden: true });
  cursor = h("div", { class: "cp-cur", "aria-hidden": "true", hidden: true });
  stage = h("div", { class: "ist-stage cp-stage", tabindex: "0", hidden: true, "aria-label": "Image. Use the arrow keys to move the cursor, Enter to pick the color." }, view, cursor, loupe);
  const live = h("p", { class: "cp-now", id: "cp-now", "aria-live": "polite" });
  const loading = h("p", { class: "ist-loading", html: "<span class=\"spinner sm\"></span> Reading image…" });
  ctx.workMain.append(h("div", { class: "ist" }, loading, stage, live,
    h("div", { class: "row" }, h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Choose another image")),
    h("p", { class: "hint", text: "Hover (or press and drag with a finger) to inspect colors through the magnifier; release or click to pick that color." })));
  ctx.loading = loading;
  const at = (e) => { const b = view.getBoundingClientRect(); return [Math.floor(((e.clientX - b.left) / b.width) * S.small.width), Math.floor(((e.clientY - b.top) / b.height) * S.small.height)]; };
  let down = false;
  stage.addEventListener("pointermove", (e) => { if (S && (e.pointerType === "mouse" || down)) { S.pos = at(e); show(); } });
  stage.addEventListener("pointerdown", (e) => { if (!S) return; down = true; stage.setPointerCapture(e.pointerId); S.pos = at(e); show(); });
  stage.addEventListener("pointerup", () => { if (!S || !down) return; down = false; pick(); });
  stage.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { loupe.hidden = cursor.hidden = true; } });
  stage.addEventListener("keydown", (e) => {
    if (!S) return;
    const st = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (d) { e.preventDefault(); S.pos = [Math.min(S.small.width - 1, Math.max(0, S.pos[0] + d[0])), Math.min(S.small.height - 1, Math.max(0, S.pos[1] + d[1]))]; show(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
  });
  stage.addEventListener("focus", () => { if (S) show(); });
}

function colorAt([x, y]) { const d = S.small.getContext("2d", { willReadFrequently: true }).getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; }
function show() {
  const [x, y] = S.pos, c = colorAt(S.pos), W = S.small.width, H = S.small.height;
  const g = loupe.getContext("2d"), n = 11, z = loupe.width / n;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, loupe.width, loupe.height);
  g.drawImage(S.small, x - 5, y - 5, n, n, 0, 0, loupe.width, loupe.height);
  g.strokeStyle = luma(c) > 0.5 ? "#000" : "#fff"; g.lineWidth = 2; g.strokeRect(5 * z, 5 * z, z, z);
  const px = (x / W) * 100, py = (y / H) * 100;
  Object.assign(cursor.style, { left: px + "%", top: py + "%" });
  Object.assign(loupe.style, { left: `calc(${px}% + ${x / W > 0.6 ? -130 : 20}px)`, top: `calc(${py}% + ${y / H > 0.6 ? -130 : 20}px)` });
  loupe.hidden = cursor.hidden = false;
  const now = document.getElementById("cp-now");
  if (now) { now.textContent = ""; now.append(h("span", { class: "cp-dot", style: { background: hex(c) } }), `${hex(c)} · ${fmt.rgb(c)}`); }
}
function pick() {
  if (!S || !S.pos) return;
  const c = colorAt(S.pos);
  S.picked = [c, ...S.picked.filter((d) => hex(d) !== hex(c))].slice(0, 12);
  renderLists();
  copyText(fmt[F.opts.cf](c), "Picked and copied " + fmt[F.opts.cf](c));
}
async function screenPick() {
  try {
    const r = await new window.EyeDropper().open();
    const m = /^#?([0-9a-f]{6})/i.exec(r.sRGBHex || ""), v = m ? m[1] : "000000";
    const c = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
    if (S) { S.picked = [c, ...S.picked].slice(0, 12); renderLists(); }
    copyText(fmt[F.opts.cf](c), "Picked and copied " + fmt[F.opts.cf](c));
  } catch (e) { if (e && e.name !== "AbortError") toast("Couldn't pick a color from the screen.", { type: "err" }); }
}

async function start(it, ctx) {
  S = null; stage.hidden = true; ctx.loading.hidden = false; ctx.refresh();
  try {
    const bmp = await decodeImage(it.file);
    const small = drawScaled(bmp, ...fit(bmp, 1200));
    if (bmp.close) bmp.close();
    S = { it, small, picked: [], pos: [Math.floor(small.width / 2), Math.floor(small.height / 2)] };
    view.width = small.width; view.height = small.height;
    view.getContext("2d").drawImage(small, 0, 0);
    computePalette();
    stage.hidden = false; ctx.loading.hidden = true;
    renderLists();
  } catch (e) { console.error(e); ctx.loading.hidden = true; ctx.status(e.userMsg || "Couldn't read this image.", "err"); }
  ctx.refresh();
}
function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }

const css = document.createElement("style");
css.textContent = `.cp-stage{cursor:crosshair}.cp-loupe{position:absolute;width:110px;height:110px;border-radius:50%;box-shadow:0 0 0 3px #fff,0 4px 16px rgba(0,0,0,.4);pointer-events:none;image-rendering:pixelated}
.cp-cur{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(0,0,0,.6);pointer-events:none}
.cp-now{display:flex;align-items:center;gap:8px;font-weight:600;font-variant-numeric:tabular-nums;min-height:1.5em;margin:0}.cp-dot{width:20px;height:20px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2)}
.cp-list{display:grid;gap:6px}.cp-item{display:flex;align-items:center;gap:10px}.cp-sw{width:40px;height:40px;border-radius:10px;border:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);display:grid;place-items:center;cursor:pointer;flex:0 0 auto}
.cp-sw .i{width:16px;height:16px;opacity:.75}.cp-txt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}.cp-txt small{color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
document.head.append(css);
