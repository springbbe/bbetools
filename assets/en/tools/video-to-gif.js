/* Tự sinh bởi scripts/build.js từ assets/tools/video-to-gif.js và i18n/en/js/ — đừng sửa tay. */
/* Video sang GIF: chọn đoạn trên dải ảnh thu nhỏ, chọn bề rộng, số khung/giây, tốc độ, lặp; lấy khung hình bằng
   WebCodecs (Mediabunny, đúng từng khung, chạy được cả khi tab ở nền) rồi mã hoá GIF bằng gifenc. */
import { h, lib, baseName, sampleFiles, fmtSize, nextFrame } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { mb, probeFor, videoInfo, player, rangeEditor, thumbStrip, progressReporter, fileHeader, areaError, loadingEl } from "../media.js";
import { fmtTime, fmtDuration, frameTimes, scaleToWidth } from "../lib/media.js";

const MAX_FRAMES = 450;
let S = null, area = null;

function sizeOf(o) { return scaleToWidth(S.p.video.width, S.p.video.height, o.width); }
function count(o) { const { start, end } = S.rg.get(); return frameTimes(start, end, o.fps, MAX_FRAMES + 1).length; }

fileTool({
  accept: ["video"], multiple: false, noun: "video",
  action: "Create GIF",
  sample: () => sampleFiles("video-mau.mp4"),
  warm: () => Promise.all([mb(), lib("gifenc")]),
  custom: { mount(ctx) { area = h("div", { class: "md-work" }); ctx.workMain.append(area); } },
  options(el) {
    const sel = (id, label, choices, val) => h("label", { class: "field" }, h("span", { text: label }), h("select", { id }, choices.map(([v, l]) => h("option", { value: v, text: l, selected: v === val }))));
    el.append(
      sel("width", "Width", [[240, "240 px (very light)"], [320, "320 px"], [480, "480 px (recommended)"], [640, "640 px"], [800, "800 px (heavy)"]], 480),
      sel("fps", "Frames per second", [[5, "5 (choppy, very light)"], [8, "8"], [10, "10 (recommended)"], [12, "12"], [15, "15 (smooth)"], [20, "20 (very smooth, heavy)"]], 10),
      seg("speed", [["0.5", "0,5×"], ["1", "1×"], ["1.5", "1,5×"], ["2", "2×"]], "1", "Speed"),
      seg("pal", [["frame", "Best colors"], ["global", "Lighter"]], "frame", "Palette"),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "loop", checked: true }), h("span", { text: "Loop forever" })),
      h("p", { class: "hint", id: "gif-est", "aria-live": "polite" }));
    return () => ({ width: +el.querySelector("#width").value, fps: +el.querySelector("#fps").value, speed: +radioVal(el, "speed"), pal: radioVal(el, "pal"), loop: el.querySelector("#loop").checked });
  },
  async onAdd(items, ctx) {
    if (S) { S.pl.destroy(); S.rg.destroy(); S = null; }
    area.textContent = ""; area.append(loadingEl("Reading video…"));
    const it = items[0];
    try {
      const p = await probeFor(it.file, "video");
      const pl = player(it.file, true);
      pl.el.muted = true;
      const D = p.duration;
      const rg = rangeEditor({ duration: D, media: pl.el, start: 0, end: Math.min(D, 4), aspect: p.video.width / p.video.height, onChange: () => ctx.refresh() });
      area.textContent = "";
      area.append(fileHeader(it.name, videoInfo(p), ctx), pl.el, rg.el,
        h("p", { class: "hint", text: "GIFs should be short (a few seconds): each second of animation is much heavier than video. Drag the two handles to choose a segment." }));
      rg.setThumbs(thumbStrip(p));
      S = { it, p, pl, rg };
      ctx.refresh();
    } catch (e) { areaError(area, e); S = null; ctx.refresh(); }
  },
  onChange(ctx) {
    const est = document.getElementById("gif-est");
    if (!est || !S) return;
    const o = ctx.opts, n = count(o), [w, hh] = sizeOf(o), { start, end } = S.rg.get();
    // ước lượng thô: ~0,35 byte mỗi điểm ảnh mỗi khung với bảng màu từng khung
    const bytes = n * w * hh * (o.pal === "frame" ? 0.38 : 0.3);
    est.textContent = `${Math.min(n, MAX_FRAMES)} frames · ${w}×${hh} px · ${fmtDuration((end - start) / o.speed)} long · about ${fmtSize(bytes)}`;
  },
  ready(items, o) {
    if (!S) return "Reading video…";
    const { start, end } = S.rg.get();
    if (end - start < 0.2) return "The selection is too short.";
    if (count(o) > MAX_FRAMES) return `The segment is too long for a GIF (max ${MAX_FRAMES} frames). Choose a shorter segment or lower the frame rate.`;
    return true;
  },
  async run(items, o, ctx) {
    const M = await mb(), { GIFEncoder, quantize, applyPalette } = await lib("gifenc");
    const { start, end } = S.rg.get(), [W, H] = sizeOf(o);
    const times = frameTimes(start, end, o.fps, MAX_FRAMES);
    const delay = Math.max(20, Math.round(1000 / o.fps / o.speed / 10) * 10);
    const sink = new M.CanvasSink(S.p.video.track, { width: W, height: H, fit: "fill", poolSize: 2 });
    const work = document.createElement("canvas"); work.width = W; work.height = H;
    const g = work.getContext("2d", { willReadFrequently: true });
    let palette = null;
    if (o.pal === "global") {
      // bảng màu chung lấy mẫu từ 6 khung rải đều: GIF nhẹ hơn và không nhấp nháy màu
      ctx.status("Choosing the palette…"); ctx.progress(-1);
      const pick = [0, 1, 2, 3, 4, 5].map((i) => times[Math.floor((i * (times.length - 1)) / 5)]);
      const all = new Uint8ClampedArray(W * H * 4 * pick.length);
      let off = 0;
      for await (const wc of sink.canvasesAtTimestamps(pick)) { if (wc) { g.drawImage(wc.canvas, 0, 0); all.set(g.getImageData(0, 0, W, H).data, off); } off += W * H * 4; }
      palette = quantize(all, 256);
    }
    const gif = GIFEncoder();
    const rep = progressReporter(ctx, "Creating GIF…");
    let i = 0;
    for await (const wc of sink.canvasesAtTimestamps(times)) {
      ctx.check();
      if (wc) g.drawImage(wc.canvas, 0, 0);
      const data = g.getImageData(0, 0, W, H).data;
      const pal = palette || quantize(data, 256);
      gif.writeFrame(applyPalette(data, pal), W, H, { palette: pal, delay, repeat: o.loop ? 0 : -1 });
      i++;
      rep(i / times.length);
      if (i % 4 === 0) await nextFrame();
    }
    gif.finish();
    const blob = new Blob([gif.bytes()], { type: "image/gif" });
    const note = `${W}×${H} · ${times.length} frames · ${o.fps} fps${o.speed !== 1 ? ` · speed ${String(o.speed).replace(".", ",")}×` : ""} · segment ${fmtTime(start)} → ${fmtTime(end)}`;
    return [{ blob, name: `${baseName(S.it.name)}-animated.gif`, note, extra: h("div", { class: "md-out" }, h("img", { src: URL.createObjectURL(blob), alt: "The GIF you just created", style: { maxWidth: "100%", borderRadius: "12px", marginTop: "10px" } })) }];
  },
  doneTitle: () => "Your GIF is ready!"
});
