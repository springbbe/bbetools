/* Đi qua các đối tượng bên trong PDF (pdf-lib): luồng nội dung của trang, form XObject lồng nhau, pattern, hình hiển thị của chú thích,
   ảnh; giải nén luồng và đọc hệ màu. Dùng cho Trích ảnh trong PDF và PDF đen trắng. */
import { toRGBA, applyAlpha } from "./lib/pdf-image.js";

export const N = (L, s) => L.PDFName.of(s);

/** Bytes ↔ chuỗi "latin1" (giữ nguyên từng byte; TextDecoder "latin1" thực chất là windows-1252 nên không dùng được) */
export function bytesToLatin1(u) {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return s;
}
export const latin1ToBytes = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };

/** Danh sách tên bộ lọc của luồng */
export function filters(L, dict) {
  const f = dict.lookup(N(L, "Filter"));
  if (!f) return [];
  if (f instanceof L.PDFArray) return f.asArray().map((x) => dict.context.lookup(x).toString().slice(1));
  return [f.toString().slice(1)];
}

/** Giải nén luồng (Flate, LZW, ASCII85, ASCIIHex, RunLength). Ném lỗi nếu bộ lọc không hỗ trợ */
export function decode(L, stream) {
  if (stream instanceof L.PDFRawStream) return L.decodePDFRawStream(stream).decode();
  return stream.getContents();
}

/** Hệ màu → { model: "gray"|"rgb"|"cmyk"|"lab"|"indexed"|"other", base, palette (Uint8Array), hival } */
export function colorSpace(L, ctx, cs) {
  cs = ctx.lookup(cs);
  if (!cs) return { model: "other" };
  if (cs instanceof L.PDFName) {
    return { model: { "/DeviceGray": "gray", "/CalGray": "gray", "/DeviceRGB": "rgb", "/CalRGB": "rgb", "/DeviceCMYK": "cmyk" }[cs.toString()] || "other" };
  }
  if (cs instanceof L.PDFArray && cs.size()) {
    const kind = ctx.lookup(cs.get(0)).toString();
    if (kind === "/ICCBased") {
      const s = ctx.lookup(cs.get(1)), n = s && s.dict.lookup(N(L, "N"));
      return { model: { 1: "gray", 3: "rgb", 4: "cmyk" }[n ? n.asNumber() : 0] || "other" };
    }
    if (kind === "/CalRGB") return { model: "rgb" };
    if (kind === "/CalGray") return { model: "gray" };
    if (kind === "/Lab") return { model: "lab" };
    if (kind === "/Indexed") {
      const base = colorSpace(L, ctx, cs.get(1)), hival = ctx.lookup(cs.get(2)).asNumber();
      let look = ctx.lookup(cs.get(3)), palette;
      if (look instanceof L.PDFString || look instanceof L.PDFHexString) palette = look.asBytes();
      else if (look) palette = decode(L, look);
      return { model: "indexed", base: base.model, palette, hival };
    }
  }
  return { model: "other" };
}

/** Tên hệ màu khai báo trong Resources → model (cho grayContent) */
export function csResolver(L, ctx, resources) {
  const dict = resources && resources.lookup(N(L, "ColorSpace"));
  return (name) => {
    if (!dict || !(dict instanceof L.PDFDict)) return "other";
    const m = colorSpace(L, ctx, dict.get(N(L, name))).model;
    return m === "indexed" ? "other" : m;
  };
}

/**
 * Đi qua mọi trang và các đối tượng con. visit nhận:
 *  { kind: "page", page, index, resources }                       — trang (nội dung lấy bằng page.node.Contents())
 *  { kind: "form", ref, stream, resources, index }                 — form XObject / pattern tô / hình của chú thích
 *  { kind: "image", ref, stream, index }                           — ảnh (mỗi ảnh một lần, index = trang đầu tiên gặp)
 *  { kind: "shading", ref, dict, holder, key, index }              — dải chuyển màu (shading)
 */
export function walk(L, doc, visit) {
  const ctx = doc.context, seen = new Set();
  const key = (ref, obj) => (ref ? ref.toString() : obj);
  function resources(res, index) {
    res = ctx.lookup(res);
    if (!(res instanceof L.PDFDict)) return;
    const xo = res.lookup(N(L, "XObject"));
    if (xo instanceof L.PDFDict) for (const [, ref] of xo.entries()) {
      const s = ctx.lookup(ref);
      if (!(s instanceof L.PDFStream) || seen.has(key(ref, s))) continue;
      seen.add(key(ref, s));
      const sub = s.dict.lookup(N(L, "Subtype"));
      if (sub === N(L, "Image")) visit({ kind: "image", ref, stream: s, index });
      else if (sub === N(L, "Form")) form(ref, s, index);
    }
    const pat = res.lookup(N(L, "Pattern"));
    if (pat instanceof L.PDFDict) for (const [, ref] of pat.entries()) {
      const p = ctx.lookup(ref);
      if (!p || seen.has(key(ref, p))) continue;
      seen.add(key(ref, p));
      if (p instanceof L.PDFStream) form(ref, p, index); // PatternType 1 (tô bằng hình)
      else if (p instanceof L.PDFDict && p.lookup(N(L, "Shading"))) shading(p.get(N(L, "Shading")), p, "Shading", index);
    }
    const sh = res.lookup(N(L, "Shading"));
    if (sh instanceof L.PDFDict) for (const [k, ref] of sh.entries()) shading(ref, sh, k, index);
  }
  function shading(ref, holder, k, index) {
    const d = ctx.lookup(ref);
    const dict = d instanceof L.PDFStream ? d.dict : d;
    if (!(dict instanceof L.PDFDict) || seen.has(key(ref instanceof L.PDFRef ? ref : null, dict))) return;
    seen.add(key(ref instanceof L.PDFRef ? ref : null, dict));
    visit({ kind: "shading", ref, dict, holder, key: k, index });
  }
  function form(ref, s, index) {
    const res = s.dict.lookup(N(L, "Resources"));
    visit({ kind: "form", ref, stream: s, resources: res instanceof L.PDFDict ? res : null, index });
    if (res) resources(res, index);
  }
  doc.getPages().forEach((page, index) => {
    const res = page.node.Resources();
    visit({ kind: "page", page, index, resources: res });
    resources(res, index);
    const annots = page.node.Annots();
    if (annots) for (const a of annots.asArray()) {
      const ad = ctx.lookup(a), ap = ad instanceof L.PDFDict && ad.lookup(N(L, "AP"));
      if (!(ap instanceof L.PDFDict)) continue;
      for (const [, v] of ap.entries()) {
        const o = ctx.lookup(v);
        const list = o instanceof L.PDFStream ? [[v, o]] : o instanceof L.PDFDict ? o.entries().map(([, r]) => [r, ctx.lookup(r)]) : [];
        for (const [r, s] of list) if (s instanceof L.PDFStream && !seen.has(key(r instanceof L.PDFRef ? r : null, s))) { seen.add(key(r instanceof L.PDFRef ? r : null, s)); form(r, s, index); }
      }
    }
  });
}

/** Giải mã ảnh XObject thành { rgba, width, height } (ảnh không phải JPEG / JPEG 2000) hoặc null nếu không đọc được */
export function imagePixels(L, ctx, stream) {
  const d = stream.dict, get = (k) => d.lookup(N(L, k));
  const width = get("Width").asNumber(), height = get("Height").asNumber();
  const fl = filters(L, d);
  if (fl.some((f) => /DCT|JPX|CCITT|JBIG2/.test(f))) return null;
  let data;
  try { data = decode(L, stream); } catch (_) { return null; }
  const mask = !!(get("ImageMask") && get("ImageMask").asBoolean && get("ImageMask").asBoolean());
  const parms = get("DecodeParms"), pd = parms instanceof L.PDFDict ? parms : parms instanceof L.PDFArray ? ctx.lookup(parms.get(0)) : null;
  const predictor = pd instanceof L.PDFDict && pd.lookup(N(L, "Predictor")) ? pd.lookup(N(L, "Predictor")).asNumber() : 1;
  // decodePDFRawStream của pdf-lib không xử lý Predictor → tự bỏ bộ lọc PNG; Predictor TIFF (2) rất hiếm: bỏ qua ảnh
  if (predictor === 2) return null;
  const needPred = predictor >= 10;
  const dec = get("Decode") instanceof L.PDFArray ? get("Decode").asArray().map((x) => ctx.lookup(x).asNumber()) : null;
  const bpc = get("BitsPerComponent") ? get("BitsPerComponent").asNumber() : 1;
  let rgba;
  if (mask) rgba = toRGBA({ data, width, height, mask: true, decode: dec, predictor: needPred ? predictor : 1 });
  else {
    const cs = colorSpace(L, ctx, d.get(N(L, "ColorSpace")));
    if (cs.model === "other" || cs.model === "lab") return null;
    rgba = toRGBA({ data, width, height, bpc, cs: cs.model, base: cs.base, palette: cs.palette, decode: cs.model === "indexed" ? null : dec, predictor: needPred ? predictor : 1 });
  }
  if (!rgba) return null;
  const sm = get("SMask");
  if (sm instanceof L.PDFStream) {
    try {
      const m = imagePixels(L, ctx, sm);
      if (m) applyAlpha(rgba, width, height, m.rgba, m.width, m.height);
    } catch (_) { /* bỏ qua mặt nạ lạ */ }
  }
  return { rgba, width, height };
}

/** Thay nội dung luồng (nén Flate), giữ nguyên các khoá khác của từ điển (BBox, Resources, Matrix…) */
export function replaceStream(L, ctx, ref, old, bytes, extra = {}) {
  const ns = ctx.flateStream(bytes, extra);
  for (const [k, v] of old.dict.entries()) {
    const name = k.toString();
    if (!/^\/(Filter|DecodeParms|Length|DL)$/.test(name) && !(name.slice(1) in extra)) ns.dict.set(k, v);
  }
  if (ref instanceof L.PDFRef) ctx.assign(ref, ns);
  return ns;
}
