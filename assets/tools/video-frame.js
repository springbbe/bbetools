/* Chụp khung hình từ video: tua tới khung cần lấy (nút/phím lùi–tiến từng khung), chụp ảnh đúng độ phân giải gốc
   (giải mã bằng WebCodecs, không phải ảnh chụp màn hình trình phát), hoặc chụp tự động mỗi N giây; tải PNG/JPG/WebP. */
import { h, icon, baseName, sampleFiles, nextFrame, toast } from "../core.js";
import { fileTool } from "../frames/file.js";
import { formatOptions, encode, EXT } from "../image.js";
import { mb, probeFor, videoInfo, player, fileHeader, areaError, loadingEl } from "../media.js";
import { fmtTime, frameTimes } from "../lib/media.js";

const MAX_SHOTS = 200;
let S = null, area = null, gallery = null, F = null;

const tname = (t) => fmtTime(t, 2).replace(/[:,]/g, "-");

async function capture(times, label) {
  const M = await mb();
  const sink = new M.CanvasSink(S.p.video.track, { poolSize: 1 });
  let n = 0;
  for await (const wc of sink.canvasesAtTimestamps(times)) {
    if (!wc || S.shots.length >= MAX_SHOTS) continue;
    const blob = await new Promise((r) => wc.canvas.toBlob(r, "image/png"));
    const t = wc.timestamp;
    if (S.shots.some((s) => Math.abs(s.t - t) < 1e-4)) continue;
    S.shots.push({ t, blob, url: URL.createObjectURL(blob), w: wc.canvas.width, h: wc.canvas.height });
    n++;
    if (label) F.status(`${label} ${n}/${times.length}`);
    await nextFrame();
  }
  S.shots.sort((a, b) => a.t - b.t);
  drawGallery();
  F.refresh();
  return n;
}

function drawGallery() {
  gallery.textContent = "";
  if (!S || !S.shots.length) { gallery.append(h("p", { class: "hint", text: "Chưa chụp khung hình nào. Tua tới chỗ cần lấy rồi bấm “Chụp khung hình này”." })); return; }
  gallery.append(h("p", { class: "opt-title", text: `Đã chụp ${S.shots.length} ảnh` }),
    h("ul", { class: "vf-grid" }, S.shots.map((s, i) => h("li", { class: "vf-shot" },
      h("button", { class: "vf-img", type: "button", title: "Tua video tới khung này", "aria-label": `Tua video tới ${fmtTime(s.t, 2)}`, onclick: () => { S.pl.el.currentTime = s.t + 1e-3; } }, h("img", { src: s.url, alt: `Khung hình lúc ${fmtTime(s.t, 2)}` })),
      h("span", { class: "vf-t", text: fmtTime(s.t, 2) }),
      h("button", { class: "ib sm vf-x", type: "button", "aria-label": `Bỏ ảnh lúc ${fmtTime(s.t, 2)}`, title: "Bỏ ảnh này", html: icon("x"), onclick: () => { URL.revokeObjectURL(s.url); S.shots.splice(i, 1); drawGallery(); F.refresh(); } })))));
}

fileTool({
  accept: ["video"], multiple: false, noun: "video",
  action: "Tải ảnh đã chụp",
  sample: () => sampleFiles("video-mau.mp4"),
  warm: () => mb(),
  custom: { mount(ctx) { F = ctx; area = h("div", { class: "md-work" }); gallery = h("div", { class: "vf-gal" }); ctx.workMain.append(area, gallery); } },
  options(el) {
    const getFmt = formatOptions(el, { q: 92 });
    el.querySelector("#fmt option[value=keep]").remove();
    el.querySelector("#fmt").value = "image/png";
    el.querySelector("#fmt").dispatchEvent(new Event("change", { bubbles: true }));
    const every = h("input", { type: "number", id: "every", min: 0.1, step: 0.5, value: 1, class: "input", inputmode: "decimal", "aria-label": "Số giây giữa hai ảnh" });
    el.append(h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Chụp tự động" }),
      h("div", { class: "row" }, h("span", { text: "Mỗi" }), every, h("span", { text: "giây" })),
      h("button", { class: "btn ghost block", type: "button", id: "auto", onclick: async (e) => {
        if (!S) return;
        const b = e.currentTarget, step = Math.max(0.1, +every.value || 1);
        const times = frameTimes(0, S.p.duration, 1 / step, MAX_SHOTS - S.shots.length);
        if (!times.length) { toast(`Đã đủ ${MAX_SHOTS} ảnh. Bỏ bớt rồi chụp tiếp.`); return; }
        b.disabled = true;
        try { await capture(times, "Đang chụp…"); F.status(""); } catch (err) { console.error(err); F.status("Không chụp được: " + err.message, "err"); }
        b.disabled = false;
      } }, h("span", { html: icon("camera"), style: { display: "contents" } }), "Chụp cả video")));
    every.style.width = "90px";
    return () => ({ ...getFmt() });
  },
  async onAdd(items, ctx) {
    if (S) { S.pl.destroy(); S.shots.forEach((s) => URL.revokeObjectURL(s.url)); S = null; }
    area.textContent = ""; area.append(loadingEl("Đang đọc video…")); drawGallery();
    const it = items[0];
    try {
      const p = await probeFor(it.file, "video");
      const pl = player(it.file, true);
      const fps = p.video.fps || 30;
      const timeEl = h("output", { class: "vf-time", "aria-live": "off" });
      const step = (d) => { pl.el.pause(); pl.el.currentTime = Math.max(0, Math.min(p.duration, pl.el.currentTime + d / fps)); };
      const shoot = async () => {
        pl.el.pause();
        const n = await capture([pl.el.currentTime + 1e-4]);
        if (n) toast(`Đã chụp khung hình lúc ${fmtTime(pl.el.currentTime, 2)}`);
      };
      const bar = h("div", { class: "row vf-bar" },
        h("button", { class: "btn ghost sm", type: "button", title: "Lùi một khung (phím ,)", "aria-label": "Lùi một khung hình", onclick: () => step(-1) }, h("span", { html: icon("chevron-left"), style: { display: "contents" } }), "Khung trước"),
        timeEl,
        h("button", { class: "btn ghost sm", type: "button", title: "Tiến một khung (phím .)", "aria-label": "Tiến một khung hình", onclick: () => step(1) }, "Khung sau", h("span", { html: icon("chevron-right"), style: { display: "contents" } })),
        h("button", { class: "btn", type: "button", onclick: shoot }, h("span", { html: icon("camera"), style: { display: "contents" } }), "Chụp khung hình này"));
      const upd = () => { timeEl.textContent = `${fmtTime(pl.el.currentTime, 2)} / ${fmtTime(p.duration, 2)}`; };
      pl.el.addEventListener("timeupdate", upd); pl.el.addEventListener("seeked", upd); pl.el.addEventListener("loadedmetadata", upd);
      // phím tắt khi đang ở vùng video: , . lùi/tiến một khung; Enter hoặc C để chụp
      const stage = h("div", { class: "vf-stage" }, pl.el, bar);
      stage.addEventListener("keydown", (e) => {
        if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.key === ",") { e.preventDefault(); step(-1); } else if (e.key === ".") { e.preventDefault(); step(1); }
        else if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey) { e.preventDefault(); shoot(); }
      });
      area.textContent = "";
      area.append(fileHeader(it.name, videoInfo(p), ctx), stage,
        h("p", { class: "hint", html: "Ảnh lấy đúng độ phân giải gốc của video (" + p.video.width + "×" + p.video.height + "). Phím tắt: <kbd>,</kbd> <kbd>.</kbd> lùi/tiến một khung, <kbd>C</kbd> chụp." }));
      S = { it, p, pl, shots: [] };
      upd(); drawGallery(); ctx.refresh();
    } catch (e) { areaError(area, e); S = null; ctx.refresh(); }
  },
  ready() {
    if (!S) return "Đang đọc video…";
    return S.shots.length ? true : "Bấm “Chụp khung hình này” hoặc “Chụp cả video” để lấy ảnh.";
  },
  async run(items, o, ctx) {
    const type = o.fmt === "keep" ? "image/png" : o.fmt, outs = [];
    for (let i = 0; i < S.shots.length; i++) {
      ctx.check();
      const s = S.shots[i];
      let blob = s.blob;
      if (type !== "image/png") {
        const bmp = await createImageBitmap(s.blob);
        const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
        c.getContext("2d").drawImage(bmp, 0, 0); bmp.close();
        blob = await encode(c, type, o.q);
        c.width = c.height = 0;
      }
      outs.push({ blob, name: `${baseName(S.it.name)}-${tname(s.t)}.${EXT[type]}`, note: `${s.w}×${s.h} · lúc ${fmtTime(s.t, 2)}` });
      ctx.progress((i + 1) / S.shots.length);
      await nextFrame();
    }
    return outs;
  },
  zipName: "khung-hinh-video",
  doneTitle: (outs) => (outs.length > 1 ? `${outs.length} ảnh đã sẵn sàng!` : "Ảnh đã sẵn sàng!")
});

const css = document.createElement("style");
css.textContent = `.vf-stage{display:grid;gap:10px}.vf-bar{gap:8px;align-items:center}.vf-time{font:600 15px var(--mono);min-width:12ch;text-align:center}
.vf-gal{margin-top:14px}.vf-grid{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.vf-shot{position:relative;display:grid;gap:4px}.vf-img{padding:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#000;cursor:pointer}
.vf-img img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}.vf-t{font:600 13px var(--mono);color:var(--muted);text-align:center}
.vf-x{position:absolute;top:4px;right:4px;background:var(--surface)}`;
document.head.append(css);
