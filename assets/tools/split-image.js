/* Chia ảnh thành lưới: 1×2, 1×3, 2×2, 3×3, 2×3 hoặc tuỳ ý; xem trước đường cắt và số thứ tự; đánh số theo thứ tự đăng Instagram */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, encode, EXT, thumbUrl, formatOptions, outType } from "../image.js";
import { gridTiles } from "../lib/image-geom.js";

const PRESETS = [["1x2", "1×2"], ["1x3", "1×3"], ["2x2", "2×2"], ["3x3", "3×3"], ["2x3", "2×3"], ["custom", "Tuỳ ý"]];
let getFmt = null, prev = null, small = null;

const dims = (o) => (o.preset === "custom" ? [o.rows, o.cols] : o.preset.split("x").map(Number));
// số thứ tự của ô (đếm từ 1); kiểu Instagram: ô dưới cùng bên phải đăng trước
const order = (t, n, insta) => (insta ? n - (t.row * t.cols + t.col) : t.row * t.cols + t.col + 1);

fileTool({
  accept: ["image", "heic"], multiple: false, noun: "ảnh",
  action: "Chia ảnh",
  sample: () => sampleFiles("anh-phong-canh.jpg"),
  async load(it, ctx) {
    it.bmp = await decodeImage(it.file);
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    it.thumb = await thumbUrl(it.bmp, 112);
    small = drawScaled(it.bmp, ...fit(it.bmp, 900));
    if (!prev) { prev = h("div", { class: "ist-preview" }, h("canvas", { "aria-label": "Xem trước các ô sẽ được cắt", role: "img" })); ctx.workMain.append(prev); }
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  options(el) {
    const num = (id, label, v) => h("label", { class: "field" }, h("span", { text: label }), h("input", { class: "input", id, type: "number", min: 1, max: 20, value: v, inputmode: "numeric" }));
    el.append(seg("preset", PRESETS, "3x3", "Số hàng × số cột"),
      h("div", { class: "two", id: "g-custom", hidden: true }, num("rows", "Số hàng", 2), num("cols", "Số cột", 4)),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "insta" }), h("span", null, "Đánh số theo thứ tự đăng Instagram", h("small", { text: "Ô dưới cùng bên phải là số 1: đăng lần lượt 1, 2, 3… thì lưới trên trang cá nhân ghép lại thành ảnh đầy đủ." }))),
      h("p", { class: "hint", id: "sp-info", "aria-live": "polite" }));
    getFmt = formatOptions(el, { q: 92 });
    const upd = () => { el.querySelector("#g-custom").hidden = radioVal(el, "preset") !== "custom"; };
    el.addEventListener("input", upd); upd();
    return () => ({ preset: radioVal(el, "preset"), rows: Math.min(20, Math.max(1, +el.querySelector("#rows").value || 1)), cols: Math.min(20, Math.max(1, +el.querySelector("#cols").value || 1)), insta: el.querySelector("#insta").checked, ...getFmt() });
  },
  onChange(ctx) {
    const it = ctx.items[0], info = document.getElementById("sp-info");
    if (!prev) return;
    prev.hidden = !it || !small;
    if (!it || !it.bmp || !small) return;
    const o = ctx.opts, [rows, cols] = dims(o);
    const c = prev.firstChild, g = c.getContext("2d");
    c.width = small.width; c.height = small.height;
    g.drawImage(small, 0, 0);
    const tiles = gridTiles(small.width, small.height, rows, cols);
    g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 2; g.setLineDash([8, 6]);
    g.beginPath();
    for (let r = 1; r < rows; r++) { const y = Math.round((r * small.height) / rows); g.moveTo(0, y); g.lineTo(small.width, y); }
    for (let k = 1; k < cols; k++) { const x = Math.round((k * small.width) / cols); g.moveTo(x, 0); g.lineTo(x, small.height); }
    g.stroke(); g.setLineDash([]);
    const fs = Math.max(12, Math.min(40, Math.min(tiles[0].w, tiles[0].h) / 3));
    g.font = `800 ${fs}px 'Be Vietnam Pro', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    for (const t of tiles) {
      const n = order({ ...t, cols }, tiles.length, o.insta), cx = t.x + t.w / 2, cy = t.y + t.h / 2;
      g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.arc(cx, cy, fs * 0.85, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.fillText(String(n), cx, cy + 1);
    }
    const full = gridTiles(it.bmp.width, it.bmp.height, rows, cols)[0];
    if (info) info.textContent = `${rows * cols} ảnh, mỗi ảnh khoảng ${full.w}×${full.h} px.`;
  },
  async run(items, o, ctx) {
    const it = items[0], [rows, cols] = dims(o), type = outType(it.file, o);
    const tiles = gridTiles(it.bmp.width, it.bmp.height, rows, cols), n = tiles.length, pad = String(n).length;
    const outs = [];
    for (let i = 0; i < n; i++) {
      ctx.check();
      const t = tiles[i], k = order({ ...t, cols }, n, o.insta);
      ctx.status(`Đang cắt ô ${i + 1}/${n}…`);
      const c = canvas(t.w, t.h), g = c.getContext("2d");
      if (type === "image/jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, t.w, t.h); }
      g.drawImage(it.bmp, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
      outs.push({ blob: await encode(c, type, o.q), name: `${baseName(it.name)}-${String(k).padStart(pad, "0")}.${EXT[type]}`, note: `hàng ${t.row + 1}, cột ${t.col + 1} · ${t.w}×${t.h}`, k });
      ctx.progress((i + 1) / n);
    }
    outs.sort((a, b) => a.k - b.k).insta = o.insta;
    return outs;
  },
  zipName: "anh-chia-luoi",
  doneTitle: (outs) => `Đã chia thành ${outs.length} ảnh!`,
  summary: (outs) => (outs.insta ? "Đăng lên Instagram theo đúng số thứ tự: 1 trước, rồi 2, 3…" : null)
});

function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }
