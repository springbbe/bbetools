/* Nén ảnh: MozJPEG / WebP / PNG giảm màu, thu nhỏ cạnh dài, chế độ "nén xuống dưới X KB", so sánh trước/sau */
import { h, icon, dialog, fmtSize, baseName, sampleFiles, lib } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, drawScaled, encode, EXT, typeOfFile, thumbUrl } from "../image.js";

const MAXES = [["0", "Giữ nguyên"], ["3840", "3840 px (4K)"], ["2560", "2560 px"], ["1920", "1920 px (Full HD)"], ["1280", "1280 px"], ["1024", "1024 px"], ["800", "800 px"]];

function compareDialog(beforeUrl, afterUrl, info) {
  dialog((close) => {
    const after = h("div", { class: "after" }, h("img", { src: beforeUrl, alt: "Ảnh gốc" }));
    const bar = h("div", { class: "bar" });
    const range = h("input", { type: "range", min: 0, max: 100, value: 50, "aria-label": "Kéo để so sánh trước và sau" });
    const set = () => { after.style.clipPath = `inset(0 ${100 - range.value}% 0 0)`; bar.style.left = range.value + "%"; };
    range.addEventListener("input", set);
    const box = h("div", { class: "compare" }, h("img", { src: afterUrl, alt: "Ảnh sau khi nén" }), after, bar, h("span", { class: "lbl-a", text: "Trước" }), h("span", { class: "lbl-b", text: "Sau" }), range);
    setTimeout(set);
    return h("div", { class: "dlg-body" }, h("h2", { text: "So sánh trước / sau" }), h("p", { text: info }), box,
      h("p", { class: "hint", text: "Kéo thanh trượt để so sánh. Phóng to bằng hai ngón tay hoặc Ctrl + lăn chuột để xem chi tiết." }),
      h("div", { class: "dlg-acts" }, h("button", { class: "btn", type: "button", text: "Đóng", onclick: () => close() })));
  }, { wide: true, label: "So sánh ảnh" });
}

fileTool({
  accept: ["image"], multiple: true, noun: "ảnh",
  action: "Nén ảnh",
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
    const q = h("input", { type: "range", min: 10, max: 95, step: 1, value: 75, id: "q", "aria-label": "Chất lượng" });
    const qv = h("output", { for: "q", text: "75" });
    const target = h("input", { class: "input", type: "number", min: 10, max: 50000, value: 200, inputmode: "numeric", id: "kb", style: { width: "120px" }, "aria-label": "Dung lượng tối đa (KB)" });
    const useTarget = h("input", { type: "checkbox", id: "useKb" });
    const maxSel = h("select", { id: "max" }, MAXES.map(([v, l]) => h("option", { value: v, text: l })));
    el.append(
      seg("fmt", [["keep", "Giữ định dạng"], ["image/jpeg", "JPG"], ["image/webp", "WebP"], ["image/png", "PNG"]], "keep", "Định dạng ảnh sau khi nén"),
      h("div", { class: "opt-group", id: "q-group" }, h("p", { class: "opt-title", text: "Chất lượng" }), h("div", { class: "range-row" }, q, qv), h("p", { class: "hint", text: "70–80 là mức cân bằng tốt: mắt thường khó thấy khác biệt." })),
      h("div", { class: "opt-group", id: "png-group" }, seg("colors", [["256", "256 màu"], ["128", "128"], ["64", "64"], ["0", "Không giảm"]], "256", "PNG: giảm số màu"), h("p", { class: "hint", text: "Giảm màu giống TinyPNG: nhẹ hơn nhiều, hợp ảnh chụp màn hình, logo. Ảnh chụp thật nên chọn JPG/WebP." })),
      h("div", { class: "opt-group" }, h("label", { class: "field" }, h("span", { text: "Thu nhỏ nếu cạnh dài hơn" }), maxSel)),
      h("div", { class: "opt-group" }, h("label", { class: "switch" }, useTarget, h("span", null, "Nén xuống dưới", h("small", { text: "Tự giảm chất lượng (và kích thước nếu cần) cho đến khi đạt" }))),
        h("div", { class: "row", id: "kb-row" }, target, h("span", { text: "KB mỗi ảnh" }))));
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
      ctx.status(`Đang nén ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
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
      if (blob.size >= it.size && type === it.type && c.width === it.bmp.width) { blob = it.file.slice(0, it.size, it.type); note = "ảnh đã tối ưu sẵn, giữ nguyên bản gốc"; }
      if (o.target && blob.size > o.target) note = "chưa xuống được dưới mức yêu cầu";
      const name = baseName(it.name) + "-nen." + EXT[blob.type || type];
      const afterUrl = URL.createObjectURL(blob), beforeUrl = URL.createObjectURL(it.file);
      outs.push({
        blob, name, before: it.size,
        note: note ? `${pct(it.size, blob.size)} · ${note}` : `${pct(it.size, blob.size)} · ${c.width}×${c.height}`,
        actions: [{ icon: "eye", label: "So sánh trước/sau", run: () => compareDialog(beforeUrl, afterUrl, `${fmtSize(it.size)} → ${fmtSize(blob.size)}`) }]
      });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "anh-da-nen",
  doneTitle: () => "Đã nén ảnh!",
  summary(outs) {
    const b = outs.reduce((s, o) => s + o.before, 0), a = outs.reduce((s, o) => s + o.blob.size, 0);
    const p = Math.round((1 - a / b) * 100);
    return p > 0 ? `Tổng cộng giảm ${p}%: ${fmtSize(b)} → ${fmtSize(a)}` : null;
  }
});
function pct(b, a) { const p = Math.round((1 - a / b) * 100); return p > 0 ? `<span class="good">−${p}%</span>` : p < 0 ? `<span class="bad">+${-p}%</span>` : "không đổi"; }
