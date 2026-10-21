/* Nén PDF: nén lại các ảnh bên trong (chữ và hình vector giữ nguyên nên vẫn sắc nét), lưu với object stream */
import { h, icon, lib, zip, baseName, fmtSize, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { openPdf, libDoc, thumbnail, Locked, pdfBlob } from "../pdf.js";

const LEVELS = {
  low: { max: 2400, q: 0.82, flate: false },
  mid: { max: 1600, q: 0.68, flate: true },
  high: { max: 1100, q: 0.5, flate: true }
};

async function open(it, prompt) {
  try {
    const r = await openPdf(it.file, { prompt, password: it.password });
    Object.assign(it, { bytes: r.bytes, doc: r.doc, password: r.password, pages: r.pages, locked: false });
    it.info = r.pages + " trang";
    it.thumb = await thumbnail(r.doc, 1, 56);
  } catch (e) {
    if (!(e instanceof Locked)) throw e;
    it.locked = true; it.info = "Có mật khẩu, bấm 🔒 để mở";
  }
}

const N = (L, s) => L.PDFName.of(s);
async function inflate(bytes) {
  const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(ds).arrayBuffer());
}
// bỏ bộ lọc PNG theo hàng (Predictor >= 10)
function unpng(data, w, hgt, bpp) {
  const stride = w * bpp, out = new Uint8Array(stride * hgt);
  let ip = 0;
  for (let y = 0; y < hgt; y++) {
    const ft = data[ip++], row = y * stride, prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const raw = data[ip++] || 0;
      const a = x >= bpp ? out[row + x - bpp] : 0, b = y ? out[prev + x] : 0, c = x >= bpp && y ? out[prev + x - bpp] : 0;
      let v;
      switch (ft) {
        case 1: v = raw + a; break;
        case 2: v = raw + b; break;
        case 3: v = raw + ((a + b) >> 1); break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break; }
        default: v = raw;
      }
      out[row + x] = v & 255;
    }
  }
  return out;
}
function components(L, cs) {
  if (!cs) return 0;
  if (cs instanceof L.PDFName) return { "/DeviceRGB": 3, "/DeviceGray": 1, "/CalRGB": 3, "/CalGray": 1 }[cs.toString()] || 0;
  if (cs instanceof L.PDFArray && cs.size() >= 2) {
    const kind = cs.lookup(0);
    if (kind && kind.toString() === "/ICCBased") {
      const icc = cs.lookup(1);
      const n = icc && icc.dict && icc.dict.lookup(N(L, "N"));
      return n ? n.asNumber() : 0;
    }
    if (kind && /^\/Cal(RGB|Gray)$/.test(kind.toString())) return kind.toString() === "/CalRGB" ? 3 : 1;
  }
  return 0;
}
const canvasJpeg = (c, q) => new Promise((res) => c.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), "image/jpeg", q));

async function shrinkImages(L, doc, cfg, onStep, check) {
  const ctx = doc.context;
  const imgs = ctx.enumerateIndirectObjects().filter(([, o]) => o instanceof L.PDFRawStream && o.dict.lookup(N(L, "Subtype")) === N(L, "Image"));
  let done = 0, changed = 0;
  for (const [ref, obj] of imgs) {
    check();
    done++;
    try {
      const d = obj.dict, get = (k) => d.lookup(N(L, k));
      if (get("ImageMask") || get("Decode") || get("Mask")) continue;
      let filter = get("Filter");
      if (filter instanceof L.PDFArray) filter = filter.size() === 1 ? filter.lookup(0) : null;
      if (!filter) continue;
      const fname = filter.toString();
      const W = get("Width").asNumber(), H = get("Height").asNumber();
      const bpc = get("BitsPerComponent") ? get("BitsPerComponent").asNumber() : 8;
      const nc = components(L, get("ColorSpace"));
      if (W * H < 60000 || bpc !== 8 || !(nc === 1 || nc === 3)) continue;
      const old = obj.contents;
      let source;
      if (fname === "/DCTDecode") source = await createImageBitmap(new Blob([old], { type: "image/jpeg" }));
      else if (fname === "/FlateDecode" && cfg.flate) {
        let raw = await inflate(old);
        const parms = get("DecodeParms");
        const pred = parms && parms.lookup && parms.lookup(N(L, "Predictor")) ? parms.lookup(N(L, "Predictor")).asNumber() : 1;
        if (pred >= 10) raw = unpng(raw, W, H, nc);
        else if (pred !== 1) continue;
        if (raw.length < W * H * nc) continue;
        const id = new ImageData(W, H), px = id.data;
        for (let i = 0, j = 0; i < W * H; i++, j += nc) {
          const k = i * 4;
          if (nc === 3) { px[k] = raw[j]; px[k + 1] = raw[j + 1]; px[k + 2] = raw[j + 2]; } else { px[k] = px[k + 1] = px[k + 2] = raw[j]; }
          px[k + 3] = 255;
        }
        source = await createImageBitmap(id);
      } else continue;
      const s = Math.min(1, cfg.max / Math.max(W, H));
      const cw = Math.max(1, Math.round(W * s)), ch = Math.max(1, Math.round(H * s));
      const c = document.createElement("canvas"); c.width = cw; c.height = ch;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(source, 0, 0, cw, ch);
      if (source.close) source.close();
      const jpg = await canvasJpeg(c, cfg.q);
      if (jpg.length >= old.length * 0.9) continue;
      const ns = ctx.stream(jpg, { Type: "XObject", Subtype: "Image", Width: cw, Height: ch, ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "DCTDecode" });
      const smask = d.get(N(L, "SMask"));
      if (smask) ns.dict.set(N(L, "SMask"), smask);
      ctx.assign(ref, ns);
      changed++;
    } catch (e) { /* ảnh lạ: giữ nguyên */ }
    if (onStep) await onStep(done / imgs.length);
  }
  return { total: imgs.length, changed };
}

fileTool({
  accept: ["pdf"], multiple: true, noun: "file PDF",
  action: "Nén PDF",
  sample: () => sampleFiles("tai-lieu-scan.pdf"),
  warm: () => Promise.all([lib("pdfjs"), lib("pdflib")]),
  load: (it) => open(it, false),
  dispose: (it) => it.doc && it.doc.destroy(),
  itemActions: (it, ctx) => it.locked ? h("button", { class: "ib sm", type: "button", title: "Nhập mật khẩu", "aria-label": "Nhập mật khẩu cho " + it.name, html: icon("lock"),
    onclick: async () => { it.loading = true; ctx.render(); try { await open(it, true); } finally { it.loading = false; ctx.render(); } } }) : null,
  options(el) {
    el.append(seg("level", [["low", "Nhẹ"], ["mid", "Vừa"], ["high", "Mạnh"]], "mid", "Mức nén"),
      h("p", { class: "hint", id: "lvl-hint" }),
      h("p", { class: "hint", text: "Chữ và hình vẽ vector giữ nguyên nên vẫn sắc nét, chọn được chữ. File chủ yếu là chữ sẽ giảm ít; PDF scan, nhiều ảnh giảm nhiều." }));
    const hints = { low: "Gần như giữ nguyên chất lượng ảnh.", mid: "Khuyên dùng: nhỏ gọn, ảnh vẫn rõ khi xem trên máy.", high: "Nhỏ nhất, ảnh mờ hơn — hợp gửi Zalo, email." };
    const upd = () => { el.querySelector("#lvl-hint").textContent = hints[radioVal(el, "level")]; };
    el.addEventListener("change", upd); upd();
    return () => ({ level: radioVal(el, "level") });
  },
  ready: (items) => items.some((i) => i.locked) ? "Có file đang khoá: bấm 🔒 để nhập mật khẩu hoặc bỏ file đó." : true,
  async run(items, opts, ctx) {
    const L = await lib("pdflib");
    const cfg = LEVELS[opts.level];
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      ctx.status("Đang nén " + it.name + (items.length > 1 ? ` (${i + 1}/${items.length})` : "") + "…");
      const doc = await libDoc(it.bytes, it.password);
      await shrinkImages(L, doc, cfg, async (f) => { ctx.progress((i + f) / items.length); await new Promise((r) => setTimeout(r, 0)); }, ctx.check);
      let data = await doc.save({ useObjectStreams: true });
      if (data.length >= it.bytes.length && !it.password) data = it.bytes; // không bao giờ trả file to hơn
      outs.push({ blob: pdfBlob(data), name: baseName(it.name) + "-da-nen.pdf", before: it.size });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "pdf-da-nen",
  doneTitle(outs) {
    const before = outs.reduce((s, o) => s + o.before, 0), after = outs.reduce((s, o) => s + o.blob.size, 0);
    return 1 - after / before >= 0.03 ? "Đã nén PDF!" : "File đã gọn sẵn, gần như không nén thêm được";
  },
  summary(outs) {
    const before = outs.reduce((s, o) => s + o.before, 0), after = outs.reduce((s, o) => s + o.blob.size, 0);
    const pct = Math.round((1 - after / before) * 100);
    return pct > 0 ? `Giảm ${pct}%: ${fmtSize(before)} → ${fmtSize(after)}` : null;
  }
});
