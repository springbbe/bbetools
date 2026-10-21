/* Tạo GIF từ ảnh: mỗi ảnh một khung hình, chỉnh tốc độ, cỡ, lặp, chạy xuôi–ngược; xem trước chuyển động; mã hoá bằng gifenc */
import { h, lib, baseName, sampleFiles, nextFrame } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, canvas, thumbUrl } from "../image.js";

let prev = null, timer = null, frameIdx = 0;

// kích thước GIF: theo tỉ lệ ảnh đầu, cạnh dài = o.size
function gifSize(items, o) {
  const b = items[0].bmp, k = o.size / Math.max(b.width, b.height);
  return [Math.max(1, Math.round(b.width * k)), Math.max(1, Math.round(b.height * k))];
}
function drawFrame(g, im, W, H, o) {
  g.fillStyle = o.bg; g.fillRect(0, 0, W, H);
  const k = o.fit === "cover" ? Math.max(W / im.width, H / im.height) : Math.min(W / im.width, H / im.height);
  const w = im.width * k, hh = im.height * k;
  g.imageSmoothingQuality = "high";
  g.drawImage(im, (W - w) / 2, (H - hh) / 2, w, hh);
}
const sequence = (items, o) => (o.bounce && items.length > 2 ? [...items, ...items.slice(1, -1).reverse()] : items);

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "ảnh", reorder: true,
  action: "Tạo GIF",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png", "ma-qr-mau.png"),
  warm: () => lib("gifenc"),
  async load(it, ctx) {
    it.bmp = await decodeImage(it.file);
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    it.thumb = await thumbUrl(it.bmp, 112);
    it.small = drawScaled(it.bmp, ...fit(it.bmp, 480));
    if (!prev) { prev = h("div", { class: "ist-preview" }, h("canvas", { role: "img", "aria-label": "Xem trước ảnh động" })); ctx.workMain.append(prev); }
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  options(el) {
    const delay = h("input", { type: "range", id: "delay", min: 50, max: 3000, step: 50, value: 600, "aria-label": "Thời gian mỗi khung (ms)" });
    el.append(
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Mỗi ảnh hiện trong" }), h("div", { class: "range-row" }, delay, h("output", { id: "delay-v" }))),
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Kích thước (cạnh dài)" }),
        h("select", { id: "size" }, [[320, "320 px (nhẹ nhất)"], [480, "480 px"], [640, "640 px"], [800, "800 px"], [1080, "1080 px"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === 480 }))))),
      seg("fit", [["contain", "Giữ trọn ảnh"], ["cover", "Cắt cho đầy khung"]], "contain", "Ảnh khác tỉ lệ"),
      h("label", { class: "field color-in" }, h("span", { text: "Màu nền" }), h("input", { type: "color", id: "bgc", value: "#ffffff", "aria-label": "Màu nền" })),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "loop", checked: true }), h("span", { text: "Lặp lại mãi" })),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "bounce" }), h("span", null, "Chạy xuôi rồi ngược", h("small", { text: "1 → 2 → 3 → 2 → 1…, chuyển động mượt không bị giật về đầu." }))),
      h("p", { class: "hint", id: "gif-info", "aria-live": "polite" }));
    const upd = () => { el.querySelector("#delay-v").textContent = (delay.value / 1000).toLocaleString("vi-VN") + " giây"; };
    el.addEventListener("input", upd); upd();
    return () => ({ delay: +delay.value, size: +el.querySelector("#size").value, fit: radioVal(el, "fit"), bg: el.querySelector("#bgc").value, loop: el.querySelector("#loop").checked, bounce: el.querySelector("#bounce").checked });
  },
  onChange(ctx) {
    clearInterval(timer);
    const items = ctx.items.filter((i) => i.bmp), info = document.getElementById("gif-info");
    if (!prev) return;
    prev.hidden = !items.length;
    if (!items.length) return;
    const o = ctx.opts, [W, H] = gifSize(items, o), seq = sequence(items, o);
    const c = prev.firstChild, k = Math.min(1, 480 / Math.max(W, H));
    c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext("2d");
    const tick = () => { drawFrame(g, seq[frameIdx % seq.length].small, c.width, c.height, o); frameIdx++; };
    frameIdx = 0; tick();
    if (seq.length > 1) timer = setInterval(tick, o.delay);
    if (info) info.textContent = `${seq.length} khung hình · ${W}×${H} px · dài ${((seq.length * o.delay) / 1000).toLocaleString("vi-VN")} giây.`;
  },
  ready: (items) => (items.filter((i) => i.bmp).length < 2 ? "Chọn ít nhất 2 ảnh để làm ảnh động." : true),
  async run(items, o, ctx) {
    const { GIFEncoder, quantize, applyPalette } = await lib("gifenc");
    const list = items.filter((i) => i.bmp), seq = sequence(list, o), [W, H] = gifSize(list, o);
    const gif = GIFEncoder();
    const c = canvas(W, H), g = c.getContext("2d", { willReadFrequently: true });
    for (let i = 0; i < seq.length; i++) {
      ctx.check();
      ctx.status(`Đang mã hoá khung ${i + 1}/${seq.length}…`);
      drawFrame(g, seq[i].bmp, W, H, o);
      const data = g.getImageData(0, 0, W, H).data;
      const palette = quantize(data, 256);
      gif.writeFrame(applyPalette(data, palette), W, H, { palette, delay: o.delay, repeat: o.loop ? 0 : -1 });
      ctx.progress((i + 1) / seq.length);
      await nextFrame();
    }
    gif.finish();
    const blob = new Blob([gif.bytes()], { type: "image/gif" });
    return [{ blob, name: `${baseName(list[0].name)}-anh-dong.gif`, note: `${W}×${H} · ${seq.length} khung · ${(o.delay / 1000).toLocaleString("vi-VN")} giây/khung` }];
  },
  doneTitle: () => "Ảnh động GIF đã xong!"
});

function fit(b, m) { const k = Math.min(1, m / Math.max(b.width, b.height)); return [b.width * k, b.height * k]; }
