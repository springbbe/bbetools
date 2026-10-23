/* Tự sinh bởi scripts/build.js từ assets/tools/compress-image.js và i18n/en/js/ — đừng sửa tay. */
/* Nén ảnh: MozJPEG / WebP / PNG giảm màu, thu nhỏ cạnh dài, chế độ "nén xuống dưới X KB", so sánh trước/sau */
import { h, icon, dialog, fmtSize, baseName, sampleFiles, lib } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, encode, EXT, typeOfFile, thumbUrl } from "../image.js";

const MAXES = [["0", "Keep as is"], ["3840", "3840 px (4K)"], ["2560", "2560 px"], ["1920", "1920 px (Full HD)"], ["1280", "1280 px"], ["1024", "1024 px"], ["800", "800 px"]];

function compareDialog(beforeUrl, afterUrl, info) {
  dialog((close) => {
    const after = h("div", { class: "after" }, h("img", { src: beforeUrl, alt: "Original image" }));
    const bar = h("div", { class: "bar" });
    const range = h("input", { type: "range", min: 0, max: 100, value: 50, "aria-label": "Drag to compare before and after" });
    const set = () => { after.style.clipPath = `inset(0 ${100 - range.value}% 0 0)`; bar.style.left = range.value + "%"; };
    range.addEventListener("input", set);
    const box = h("div", { class: "compare" }, h("img", { src: afterUrl, alt: "Compressed image" }), after, bar, h("span", { class: "lbl-a", text: "Before" }), h("span", { class: "lbl-b", text: "After" }), range);
    setTimeout(set);
    return h("div", { class: "dlg-body" }, h("h2", { text: "Compare before / after" }), h("p", { text: info }), box,
      h("p", { class: "hint", text: "Drag the slider to compare. Pinch or Ctrl + scroll to zoom in on details." }),
      h("div", { class: "dlg-acts" }, h("button", { class: "btn", type: "button", text: "Close", onclick: () => close() })));
  }, { wide: true, label: "Compare images" });
}

fileTool({
  accept: ["image"], multiple: true, noun: "images",
  action: "Compress images",
  sample: () => sampleFiles("anh-phong-canh.jpg", "anh-chup-man-hinh.png"),
  warm: () => lib("mozjpeg"),
  async load(it) {
    it.bmp = await decodeImage(it.file);
    it.type = typeOfFile(it.file) || "image/png";
    it.info = `${it.bmp.width}×${it.bmp.height}`;
    it.thumb = await thumbUrl(it.bmp, 112);
  },
  dispose: (it) => it.bmp && it.bmp.close && it.bmp.close(),
  options(el) {
    const q = h("input", { type: "range", min: 10, max: 95, step: 1, value: 75, id: "q", "aria-label": "Quality" });
    const qv = h("output", { for: "q", text: "75" });
    const target = h("input", { class: "input", type: "number", min: 10, max: 50000, value: 200, inputmode: "numeric", id: "kb", style: { width: "120px" }, "aria-label": "Maximum size (KB)" });
    const useTarget = h("input", { type: "checkbox", id: "useKb" });
    const maxSel = h("select", { id: "max" }, MAXES.map(([v, l]) => h("option", { value: v, text: l })));
    el.append(
      seg("fmt", [["keep", "Keep format"], ["image/jpeg", "JPG"], ["image/webp", "WebP"], ["image/png", "PNG"]], "keep", "Image format after compression"),
      h("div", { class: "opt-group", id: "q-group" }, h("p", { class: "opt-title", text: "Quality" }), h("div", { class: "range-row" }, q, qv), h("p", { class: "hint", text: "70–80 is a good balance: the difference is hard to see." })),
      h("div", { class: "opt-group", id: "png-group" }, seg("colors", [["256", "256 colors"], ["128", "128"], ["64", "64"], ["0", "No reduction"]], "256", "PNG: reduce colors"), h("p", { class: "hint", text: "Color reduction like TinyPNG: much lighter, great for screenshots and logos. For real photos choose JPG/WebP." })),
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Shrink if the long side exceeds" }), maxSel)),
      h("div", { class: "opt-group" }, h("label", { class: "switch" }, useTarget, h("span", null, "Compress below", h("small", { text: "Lowers quality (and size if needed) until the target is reached" }))),
        h("div", { class: "row", id: "kb-row" }, target, h("span", { text: "KB per image" }))));
    const upd = () => {
      qv.textContent = q.value;
      const f = radioVal(el, "fmt");
      const png = f === "image/png";
      el.querySelector("#png-group").hidden = !(png || f === "keep");
      el.querySelector("#q-group").hidden = png;
      el.querySelector("#kb-row").hidden = !useTarget.checked;
      q.disabled = useTarget.checked;
    };
    el.addEventListener("input", upd); upd();
    return () => ({ fmt: radioVal(el, "fmt"), q: +q.value / 100, colors: +radioVal(el, "colors"), max: +maxSel.value, target: useTarget.checked ? Math.max(5, +target.value || 200) * 1024 : 0 });
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i];
      ctx.status(`Compressing ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      let type = o.fmt === "keep" ? it.type : o.fmt;
      if (type === "image/png" && o.target) type = "image/webp"; // PNG không có thang chất lượng: chuyển WebP để đạt dung lượng
      let { width: w, height: hh } = it.bmp;
      if (o.max && Math.max(w, hh) > o.max) { const k = o.max / Math.max(w, hh); w = Math.round(w * k); hh = Math.round(hh * k); }
      const make = (sw, sh) => { const c = drawScaled(it.bmp, sw, sh, type === "image/jpeg" ? "#ffffff" : null); return c; };
      let c = make(w, hh), blob;
      if (o.target && type !== "image/png") {
        // tìm chất lượng cao nhất mà vẫn dưới mức yêu cầu; nếu chất lượng thấp nhất vẫn to → thu nhỏ ảnh
        let scale = 1;
        for (let round = 0; round < 8; round++) {
          let lo = 0.3, hi = 0.92, best = null;
          for (let k = 0; k < 6; k++) {
            ctx.check();
            const q = (lo + hi) / 2;
            const b = await encode(c, type, q);
            if (b.size <= o.target) { best = b; lo = q; } else hi = q;
          }
          if (best) { blob = await encode(c, type, lo); if (blob.size > o.target) blob = best; break; }
          scale *= 0.8;
          c = make(w * scale, hh * scale);
        }
        if (!blob) blob = await encode(c, type, 0.3);
      } else {
        blob = await encode(c, type, o.q, { colors: o.colors });
      }
      let note = "";
      if (blob.size >= it.size && type === it.type && c.width === it.bmp.width) { blob = it.file.slice(0, it.size, it.type); note = "image is already optimized, original kept"; }
      if (o.target && blob.size > o.target) note = "couldn't get below the target";
      const name = baseName(it.name) + "-compressed." + EXT[blob.type || type];
      const afterUrl = URL.createObjectURL(blob), beforeUrl = URL.createObjectURL(it.file);
      outs.push({
        blob, name, before: it.size,
        note: note ? `${pct(it.size, blob.size)} · ${note}` : `${pct(it.size, blob.size)} · ${c.width}×${c.height}`,
        actions: [{ icon: "eye", label: "Compare before/after", run: () => compareDialog(beforeUrl, afterUrl, `${fmtSize(it.size)} → ${fmtSize(blob.size)}`) }]
      });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "compressed-images",
  doneTitle: () => "Images compressed!",
  summary(outs) {
    const b = outs.reduce((s, o) => s + o.before, 0), a = outs.reduce((s, o) => s + o.blob.size, 0);
    const p = Math.round((1 - a / b) * 100);
    return p > 0 ? `Total reduction ${p}%: ${fmtSize(b)} → ${fmtSize(a)}` : null;
  }
});
function pct(b, a) { const p = Math.round((1 - a / b) * 100); return p > 0 ? `<span class="good">−${p}%</span>` : p < 0 ? `<span class="bad">+${-p}%</span>` : "unchanged"; }
