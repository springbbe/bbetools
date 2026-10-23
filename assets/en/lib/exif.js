/* Tự sinh bởi scripts/build.js từ assets/lib/exif.js và i18n/en/js/ — đừng sửa tay. */
/* Siêu dữ liệu ảnh: đọc EXIF/GPS/XMP/IPTC/bình luận của JPEG, PNG, WebP, HEIC/AVIF và xoá chúng mà không mã hoá lại ảnh.
   Hàm thuần, chạy được cả trong Node (test) lẫn trình duyệt. Mọi hàm nhận/trả Uint8Array. */

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
const ascii = (b, from, len) => { let s = ""; for (let i = from; i < from + len && i < b.length; i++) s += String.fromCharCode(b[i]); return s; };
const utf8 = (b) => { try { return new TextDecoder("utf-8", { fatal: false }).decode(b); } catch (_) { return ascii(b, 0, b.length); } };
const u16be = (b, o) => (b[o] << 8) | b[o + 1];
const u32be = (b, o) => ((b[o] << 24) >>> 0) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]);
const u32le = (b, o) => ((b[o + 3] << 24) >>> 0) + ((b[o + 2] << 16) | (b[o + 1] << 8) | b[o]);
const startsWith = (b, o, s) => ascii(b, o, s.length) === s;

/** Nhận biết định dạng theo vài byte đầu */
export function imageFormat(b) {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (b[0] === 0x89 && startsWith(b, 1, "PNG")) return "png";
  if (startsWith(b, 0, "RIFF") && startsWith(b, 8, "WEBP")) return "webp";
  if (startsWith(b, 4, "ftyp")) return "heif";
  if (startsWith(b, 0, "GIF8")) return "gif";
  if (b[0] === 0x42 && b[1] === 0x4d) return "bmp";
  return "";
}

/* ---------------- TIFF (phần thân của EXIF) ---------------- */

export const TAGS = {
  ifd0: { 0x010e: "ImageDescription", 0x010f: "Make", 0x0110: "Model", 0x0112: "Orientation", 0x0131: "Software", 0x0132: "DateTime", 0x013b: "Artist", 0x8298: "Copyright", 0x8769: "ExifIFD", 0x8825: "GPSIFD", 0x9c9b: "XPTitle", 0x9c9c: "XPComment", 0x9c9d: "XPAuthor" },
  exif: { 0x829a: "ExposureTime", 0x829d: "FNumber", 0x8827: "ISO", 0x9003: "DateTimeOriginal", 0x9004: "DateTimeDigitized", 0x9010: "OffsetTime", 0x9011: "OffsetTimeOriginal", 0x9209: "Flash", 0x920a: "FocalLength", 0x927c: "MakerNote", 0x9286: "UserComment", 0xa002: "PixelXDimension", 0xa003: "PixelYDimension", 0xa405: "FocalLengthIn35mm", 0xa420: "ImageUniqueID", 0xa430: "CameraOwnerName", 0xa431: "BodySerialNumber", 0xa433: "LensMake", 0xa434: "LensModel", 0xa435: "LensSerialNumber" },
  gps: { 0x0000: "GPSVersionID", 0x0001: "GPSLatitudeRef", 0x0002: "GPSLatitude", 0x0003: "GPSLongitudeRef", 0x0004: "GPSLongitude", 0x0005: "GPSAltitudeRef", 0x0006: "GPSAltitude", 0x0007: "GPSTimeStamp", 0x000c: "GPSSpeedRef", 0x000d: "GPSSpeed", 0x0010: "GPSImgDirectionRef", 0x0011: "GPSImgDirection", 0x001d: "GPSDateStamp" }
};

/** Đọc khối TIFF. Trả về { le, ifd0, exif, gps, ifd1, thumb, entries } – mỗi IFD là { tên hoặc 0xTAG: giá trị } */
export function parseTiff(t) {
  if (!t || t.length < 8) return null;
  const le = t[0] === 0x49 && t[1] === 0x49;
  if (!le && !(t[0] === 0x4d && t[1] === 0x4d)) return null;
  const u16 = (o) => (le ? t[o] | (t[o + 1] << 8) : u16be(t, o));
  const u32 = (o) => (le ? u32le(t, o) : u32be(t, o));
  if (u16(2) !== 42) return null;
  const out = { le, ifd0: {}, exif: {}, gps: {}, ifd1: {}, offsets: {}, thumb: null };
  const seen = new Set();
  function value(type, count, at) {
    const sz = TYPE_SIZE[type] || 1;
    if (at + sz * count > t.length) return null;
    if (type === 2) { let s = ascii(t, at, count); const z = s.indexOf("\0"); if (z >= 0) s = s.slice(0, z); return utf8(Uint8Array.from(s, (c) => c.charCodeAt(0))).trim(); }
    if (type === 7 || type === 1 || type === 6) return t.subarray(at, at + count);
    const vals = [];
    for (let i = 0; i < Math.min(count, 64); i++) {
      const o = at + i * sz;
      if (type === 3) vals.push(u16(o));
      else if (type === 8) vals.push((u16(o) << 16) >> 16);
      else if (type === 4) vals.push(u32(o));
      else if (type === 9) vals.push(u32(o) | 0);
      else if (type === 5) { const d = u32(o + 4); vals.push(d ? u32(o) / d : 0); }
      else if (type === 10) { const d = u32(o + 4) | 0; vals.push(d ? (u32(o) | 0) / d : 0); }
      else vals.push(null);
    }
    return count === 1 ? vals[0] : vals;
  }
  function ifd(off, name) {
    if (!off || off + 2 > t.length || seen.has(off)) return 0;
    seen.add(off);
    out.offsets[name] = off;
    const n = u16(off);
    const dict = out[name], names = TAGS[name === "ifd1" ? "ifd0" : name] || {};
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      if (e + 12 > t.length) break;
      const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
      const size = (TYPE_SIZE[type] || 1) * count;
      const at = size <= 4 ? e + 8 : u32(e + 8);
      const v = value(type, count, at);
      dict[names[tag] || "0x" + tag.toString(16).padStart(4, "0")] = v;
    }
    return u32(off + 2 + n * 12);
  }
  const next = ifd(u32(4), "ifd0");
  if (out.ifd0.ExifIFD) ifd(out.ifd0.ExifIFD, "exif");
  if (out.ifd0.GPSIFD) ifd(out.ifd0.GPSIFD, "gps");
  if (next) {
    ifd(next, "ifd1");
    const to = out.ifd1["0x0201"], tl = out.ifd1["0x0202"];
    if (to && tl && to + tl <= t.length) out.thumb = t.subarray(to, to + tl);
  }
  return out;
}

/** Toạ độ GPS (độ thập phân) từ IFD GPS, hoặc null */
export function gpsPosition(gps) {
  if (!gps || !Array.isArray(gps.GPSLatitude) || !Array.isArray(gps.GPSLongitude)) return null;
  const dms = (a) => a[0] + (a[1] || 0) / 60 + (a[2] || 0) / 3600;
  let lat = dms(gps.GPSLatitude), lon = dms(gps.GPSLongitude);
  if (/S/i.test(gps.GPSLatitudeRef || "")) lat = -lat;
  if (/W/i.test(gps.GPSLongitudeRef || "")) lon = -lon;
  if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) return null;
  const p = { lat, lon };
  if (typeof gps.GPSAltitude === "number") { const ref = gps.GPSAltitudeRef; p.alt = (ref && (ref[0] === 1 || ref === 1) ? -1 : 1) * gps.GPSAltitude; }
  return p;
}

/**
 * Tạo khối TIFF (little-endian) từ danh sách thẻ. ifds: { ifd0: [[tag, type, value]], exif: [...], gps: [...] }
 * value: chuỗi (ASCII), số hoặc mảng số (RATIONAL nhận số thực, đổi sang phân số mẫu 10000).
 */
export function buildTiff(ifds) {
  const lists = { ifd0: [...(ifds.ifd0 || [])], exif: [...(ifds.exif || [])], gps: [...(ifds.gps || [])] };
  if (lists.exif.length) lists.ifd0.push([0x8769, 4, 0]);
  if (lists.gps.length) lists.ifd0.push([0x8825, 4, 0]);
  const order = ["ifd0", "exif", "gps"].filter((k) => lists[k].length);
  for (const k of order) lists[k].sort((a, b) => a[0] - b[0]);
  const enc = ([tag, type, v]) => {
    let bytes = [], count;
    const w16 = (x) => bytes.push(x & 255, (x >> 8) & 255), w32 = (x) => bytes.push(x & 255, (x >> 8) & 255, (x >> 16) & 255, (x >>> 24) & 255);
    if (type === 2) { const s = new TextEncoder().encode(String(v)); bytes = [...s, 0]; count = bytes.length; }
    else if (type === 1 || type === 7) { bytes = [...v]; count = bytes.length; }
    else {
      const a = Array.isArray(v) ? v : [v]; count = a.length;
      for (const x of a) {
        if (type === 3) w16(x);
        else if (type === 4 || type === 9) w32(x);
        else if (type === 5 || type === 10) { const d = Number.isInteger(x) ? 1 : 10000; w32(Math.round(x * d)); w32(d); }
      }
    }
    return { tag, type, count, bytes };
  };
  const enc2 = Object.fromEntries(order.map((k) => [k, lists[k].map(enc)]));
  // bố cục: header 8 byte, rồi từng IFD (2 + 12n + 4) kèm vùng giá trị dài ngay sau
  const ifdOff = {};
  let pos = 8;
  for (const k of order) {
    ifdOff[k] = pos;
    pos += 2 + 12 * enc2[k].length + 4;
    for (const e of enc2[k]) if (e.bytes.length > 4) pos += e.bytes.length + (e.bytes.length & 1);
  }
  const t = new Uint8Array(pos);
  const p16 = (o, x) => { t[o] = x & 255; t[o + 1] = (x >> 8) & 255; }, p32 = (o, x) => { t[o] = x & 255; t[o + 1] = (x >> 8) & 255; t[o + 2] = (x >> 16) & 255; t[o + 3] = (x >>> 24) & 255; };
  t[0] = t[1] = 0x49; p16(2, 42); p32(4, 8);
  for (const k of order) {
    let o = ifdOff[k], data = o + 2 + 12 * enc2[k].length + 4;
    p16(o, enc2[k].length);
    enc2[k].forEach((e, i) => {
      const at = o + 2 + i * 12;
      p16(at, e.tag); p16(at + 2, e.type); p32(at + 4, e.count);
      if (k === "ifd0" && e.tag === 0x8769) p32(at + 8, ifdOff.exif);
      else if (k === "ifd0" && e.tag === 0x8825) p32(at + 8, ifdOff.gps);
      else if (e.bytes.length <= 4) t.set(e.bytes, at + 8);
      else { p32(at + 8, data); t.set(e.bytes, data); data += e.bytes.length + (e.bytes.length & 1); }
    });
    p32(o + 2 + 12 * enc2[k].length, 0);
  }
  return t;
}

/** Bản sao khối TIFF đã xoá sạch IFD GPS (giữ nguyên mọi thứ khác, không dời offset) */
export function wipeGps(tiff) {
  const t = tiff.slice();
  const p = parseTiff(t);
  if (!p || !p.offsets.gps) return t;
  const u16 = (o) => (p.le ? t[o] | (t[o + 1] << 8) : u16be(t, o));
  const u32 = (o) => (p.le ? u32le(t, o) : u32be(t, o));
  const off = p.offsets.gps, n = u16(off);
  for (let i = 0; i < n; i++) {
    const e = off + 2 + i * 12, type = u16(e + 2), count = u32(e + 4), size = (TYPE_SIZE[type] || 1) * count;
    if (size > 4) { const at = u32(e + 8); if (at + size <= t.length) t.fill(0, at, at + size); }
  }
  t.fill(0, off, Math.min(t.length, off + 2 + n * 12 + 4)); // số mục = 0, IFD kế tiếp = 0
  return t;
}

const tiffOrientation = (p) => (p && typeof p.ifd0.Orientation === "number" ? p.ifd0.Orientation : 1);
export const orientationTiff = (o) => buildTiff({ ifd0: [[0x0112, 3, o]] });

/* ---------------- đọc ---------------- */

/** Tìm EXIF trong HEIC/AVIF (hộp meta → iinf/iloc) */
function heifExif(b) {
  const boxes = (from, to) => {
    const out = [];
    for (let o = from; o + 8 <= to;) {
      let size = u32be(b, o), hdr = 8;
      const type = ascii(b, o + 4, 4);
      if (size === 1) { size = u32be(b, o + 12) + u32be(b, o + 8) * 2 ** 32; hdr = 16; }
      else if (size === 0) size = to - o;
      if (size < hdr || o + size > to) break;
      out.push({ type, start: o + hdr, end: o + size });
      o += size;
    }
    return out;
  };
  const meta = boxes(0, b.length).find((x) => x.type === "meta");
  if (!meta) return { tiff: null, xmp: false };
  const kids = boxes(meta.start + 4, meta.end);
  const iinf = kids.find((x) => x.type === "iinf"), iloc = kids.find((x) => x.type === "iloc");
  if (!iinf || !iloc) return { tiff: null, xmp: false };
  const items = {};
  const iv = b[iinf.start];
  for (const e of boxes(iinf.start + 4 + (iv === 0 ? 2 : 4), iinf.end)) {
    if (e.type !== "infe") continue;
    const v = b[e.start];
    if (v < 2) continue;
    const id = v === 2 ? u16be(b, e.start + 4) : u32be(b, e.start + 4);
    const tp = e.start + 4 + (v === 2 ? 2 : 4) + 2;
    const type = ascii(b, tp, 4);
    items[id] = { type, mime: type === "mime" ? ascii(b, tp + 4, Math.min(64, e.end - tp - 4)).split("\0")[1] || "" : "" };
  }
  const v = b[iloc.start];
  let o = iloc.start + 4;
  const offSize = b[o] >> 4, lenSize = b[o] & 15, baseSize = b[o + 1] >> 4, idxSize = v >= 1 ? b[o + 1] & 15 : 0;
  o += 2;
  const rd = (n) => { let x = 0; for (let i = 0; i < n; i++) x = x * 256 + b[o + i]; o += n; return x; };
  const count = v < 2 ? rd(2) : rd(4);
  let tiff = null, xmp = false;
  for (let i = 0; i < count && o < iloc.end; i++) {
    const id = v < 2 ? rd(2) : rd(4);
    const method = v >= 1 ? rd(2) & 15 : 0;
    rd(2);
    const base = rd(baseSize), ext = rd(2);
    let first = null;
    for (let k = 0; k < ext; k++) { if (idxSize) rd(idxSize); const eo = rd(offSize), el = rd(lenSize); if (!first) first = [base + eo, el]; }
    const it = items[id];
    if (!it || !first || method !== 0) continue;
    if (it.type === "Exif") {
      const [s, l] = first;
      if (s + 4 <= b.length) { const skip = u32be(b, s); const ts = s + 4 + skip; tiff = b.subarray(ts, Math.min(b.length, s + l)); }
    } else if (it.type === "mime" && /xmp|rdf/i.test(it.mime)) xmp = true;
  }
  return { tiff, xmp };
}

/** Đọc mọi siêu dữ liệu. Trả về { format, tiff, exif (parseTiff), gps, orientation, xmp (chuỗi|true), iptc, comment, text: [[khoá, giá trị]], icc, trailer, mpf } */
export function readMeta(b) {
  const r = { format: imageFormat(b), tiff: null, exif: null, gps: null, orientation: 1, xmp: null, iptc: false, comment: null, text: [], icc: false, trailer: 0, mpf: false };
  if (r.format === "jpeg") {
    const segs = jpegSegments(b);
    for (const s of segs.list) {
      const d = b.subarray(s.start + 4, s.end);
      if (s.marker === 0xe1 && startsWith(d, 0, "Exif\0")) r.tiff = r.tiff || d.subarray(6);
      else if (s.marker === 0xe1 && startsWith(d, 0, "http://ns.adobe.com/x")) r.xmp = (typeof r.xmp === "string" ? r.xmp : "") + utf8(d.subarray(d.indexOf(0) + 1));
      else if (s.marker === 0xed) r.iptc = true;
      else if (s.marker === 0xfe) r.comment = utf8(d);
      else if (s.marker === 0xe2 && startsWith(d, 0, "ICC_PROFILE")) r.icc = true;
      else if (s.marker === 0xe2 && startsWith(d, 0, "MPF")) r.mpf = true;
    }
    r.trailer = segs.eoi ? b.length - segs.eoi : 0;
  } else if (r.format === "png") {
    for (const c of pngChunks(b)) {
      const d = b.subarray(c.start + 8, c.end - 4);
      if (c.type === "eXIf") r.tiff = d;
      else if (c.type === "iCCP") r.icc = true;
      else if (c.type === "tEXt" || c.type === "zTXt" || c.type === "iTXt") {
        const z = d.indexOf(0), key = ascii(d, 0, z < 0 ? d.length : z);
        let val = "";
        if (c.type === "tEXt") val = ascii(d, z + 1, d.length - z - 1);
        else if (c.type === "iTXt" && d[z + 1] === 0) { let q = z + 3; q = d.indexOf(0, q) + 1; q = d.indexOf(0, q) + 1; val = utf8(d.subarray(q)); }
        else val = "(compressed)";
        if (key === "XML:com.adobe.xmp") r.xmp = val || true; else r.text.push([key, val]);
      } else if (c.type === "tIME") r.text.push(["Modified time", `${u16be(d, 0)}-${d[2]}-${d[3]} ${d[4]}:${d[5]}`]);
    }
  } else if (r.format === "webp") {
    for (const c of webpChunks(b)) {
      const d = b.subarray(c.start + 8, c.start + 8 + c.size);
      if (c.type === "EXIF") r.tiff = startsWith(d, 0, "Exif\0") ? d.subarray(6) : d;
      else if (c.type === "XMP ") r.xmp = utf8(d);
      else if (c.type === "ICCP") r.icc = true;
    }
  } else if (r.format === "heif") {
    const x = heifExif(b);
    r.tiff = x.tiff; r.xmp = x.xmp || null;
  }
  if (r.tiff) {
    r.exif = parseTiff(r.tiff);
    r.gps = r.exif ? gpsPosition(r.exif.gps) : null;
    r.orientation = tiffOrientation(r.exif);
  }
  if (!r.gps && typeof r.xmp === "string") {
    const m = (k) => (new RegExp(`exif:${k}(?:="|>)([^"<]+)`).exec(r.xmp) || [])[1];
    const lat = xmpCoord(m("GPSLatitude")), lon = xmpCoord(m("GPSLongitude"));
    if (lat != null && lon != null) r.gps = { lat, lon };
  }
  return r;
}
function xmpCoord(s) {
  if (!s) return null;
  const m = /^(\d+),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?([NSEW])$/.exec(s.trim());
  if (!m) return null;
  const v = +m[1] + +m[2] / 60 + (m[3] ? +m[3] / 3600 : 0);
  return /[SW]/.test(m[4]) ? -v : v;
}

/** Có siêu dữ liệu nào đáng xoá không */
export function hasMeta(m) {
  return !!(m.tiff || m.xmp || m.iptc || m.comment || m.text.length || m.trailer || m.mpf);
}

/* ---------------- cấu trúc từng định dạng ---------------- */

/** Các segment JPEG trước dữ liệu ảnh. list: [{ marker, start, end }] (start = vị trí 0xFF, end = sau segment); sos: vị trí SOS đầu tiên; eoi: vị trí ngay sau FFD9 */
export function jpegSegments(b) {
  const list = [];
  let o = 2, sos = -1, eoi = 0;
  while (o + 2 <= b.length) {
    if (b[o] !== 0xff) break;
    let m = b[o + 1];
    if (m === 0xff) { o++; continue; }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { o += 2; continue; }
    if (m === 0xd9) { eoi = o + 2; break; }
    if (o + 4 > b.length) break;
    const end = o + 2 + u16be(b, o + 2);
    if (m === 0xda) {
      if (sos < 0) sos = o;
      // bỏ qua dữ liệu mã hoá: tìm marker tiếp theo (FF00 và RSTn nằm trong dữ liệu)
      let p = end;
      while (p + 1 < b.length && !(b[p] === 0xff && b[p + 1] !== 0 && !(b[p + 1] >= 0xd0 && b[p + 1] <= 0xd7) && b[p + 1] !== 0xff)) p++;
      o = p;
      continue;
    }
    if (sos < 0) list.push({ marker: m, start: o, end });
    o = end;
  }
  return { list, sos, eoi };
}

export function pngChunks(b) {
  const out = [];
  for (let o = 8; o + 12 <= b.length;) {
    const len = u32be(b, o), type = ascii(b, o + 4, 4);
    out.push({ type, start: o, end: o + 12 + len });
    o += 12 + len;
    if (type === "IEND") break;
  }
  return out;
}

export function webpChunks(b) {
  const out = [];
  for (let o = 12; o + 8 <= b.length;) {
    const type = ascii(b, o, 4), size = u32le(b, o + 4);
    out.push({ type, start: o, size, end: Math.min(b.length, o + 8 + size + (size & 1)) });
    o += 8 + size + (size & 1);
  }
  return out;
}

let crcTable = null;
export function crc32(b, from = 0, to = b.length) {
  if (!crcTable) { crcTable = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = from; i < to; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const c = new Uint8Array(12 + data.length);
  const len = data.length;
  c[0] = len >>> 24; c[1] = (len >> 16) & 255; c[2] = (len >> 8) & 255; c[3] = len & 255;
  for (let i = 0; i < 4; i++) c[4 + i] = type.charCodeAt(i);
  c.set(data, 8);
  const crc = crc32(c, 4, 8 + len);
  c[8 + len] = crc >>> 24; c[9 + len] = (crc >> 16) & 255; c[10 + len] = (crc >> 8) & 255; c[11 + len] = crc & 255;
  return c;
}
function webpChunk(type, data) {
  const c = new Uint8Array(8 + data.length + (data.length & 1));
  for (let i = 0; i < 4; i++) c[i] = type.charCodeAt(i);
  const n = data.length; c[4] = n & 255; c[5] = (n >> 8) & 255; c[6] = (n >> 16) & 255; c[7] = n >>> 24;
  c.set(data, 8);
  return c;
}
function concat(parts) {
  const n = parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const jpegApp1 = (tiff) => { const n = tiff.length + 8; return concat([Uint8Array.of(0xff, 0xe1, n >> 8, n & 255, 0x45, 0x78, 0x69, 0x66, 0, 0), tiff]); };
const hasGpsText = (s) => typeof s === "string" && /GPS(Latitude|Longitude)|exif:GPS|<photoshop:City|LocationShown|LocationCreated/i.test(s);

/**
 * Xoá siêu dữ liệu, không mã hoá lại ảnh.
 * opts.mode: "all" (mặc định) – xoá EXIF, GPS, XMP, IPTC, bình luận, ảnh thu nhỏ, dữ liệu thừa sau ảnh;
 *            "gps" – chỉ xoá vị trí (IFD GPS, XMP có toạ độ), giữ máy chụp, ngày giờ…
 * opts.keepOrientation (mặc định true): giữ thẻ hướng xoay để ảnh không bị quay ngang.
 * Giữ hồ sơ màu ICC và các segment cần để hiển thị đúng màu (JFIF, Adobe).
 * Trả về { bytes, removed: [nhãn…] } hoặc null nếu định dạng không hỗ trợ.
 */
export function stripMeta(b, opts = {}) {
  const mode = opts.mode || "all", keepOri = opts.keepOrientation !== false;
  const meta = readMeta(b);
  const removed = new Set();
  const ori = meta.orientation;
  const newTiff = () => {
    if (mode === "gps") { if (meta.exif && meta.exif.offsets.gps) removed.add("gps"); return meta.tiff ? wipeGps(meta.tiff) : null; }
    if (meta.tiff) { removed.add("exif"); if (meta.gps) removed.add("gps"); if (meta.exif && meta.exif.thumb) removed.add("thumb"); }
    return keepOri && ori > 1 && ori <= 8 ? orientationTiff(ori) : null;
  };
  const dropXmp = (x) => x && (mode === "all" || hasGpsText(x));

  if (meta.format === "jpeg") {
    const segs = jpegSegments(b);
    if (segs.sos < 0) return null;
    const parts = [b.subarray(0, 2)];
    let wroteExif = false;
    const tiff = newTiff();
    const put = () => { if (!wroteExif && tiff) { parts.push(jpegApp1(tiff)); wroteExif = true; } };
    for (const s of segs.list) {
      const d = b.subarray(s.start + 4, s.end), seg = b.subarray(s.start, s.end);
      const isExif = s.marker === 0xe1 && startsWith(d, 0, "Exif\0");
      const isXmp = s.marker === 0xe1 && startsWith(d, 0, "http://ns.adobe.com/x");
      if (s.marker === 0xe0) { parts.push(seg); continue; }
      if (isExif) { put(); continue; }
      if (isXmp) { if (dropXmp(utf8(d))) removed.add("xmp"); else parts.push(seg); continue; }
      if (s.marker === 0xe2 && startsWith(d, 0, "MPF")) { removed.add("mpf"); continue; }
      if (mode === "all" && (s.marker === 0xed || s.marker === 0xfe || (s.marker >= 0xe1 && s.marker <= 0xef && s.marker !== 0xe2 && s.marker !== 0xee))) {
        removed.add(s.marker === 0xed ? "iptc" : s.marker === 0xfe ? "comment" : "other");
        continue;
      }
      put();
      parts.push(seg);
    }
    put();
    const end = segs.eoi || b.length;
    parts.push(b.subarray(segs.sos, end));
    if (end < b.length) removed.add("trailer");
    return { bytes: concat(parts), removed: [...removed] };
  }

  if (meta.format === "png") {
    const parts = [b.subarray(0, 8)];
    const tiff = newTiff();
    let wrote = false;
    for (const c of pngChunks(b)) {
      const d = b.subarray(c.start + 8, c.end - 4);
      if (c.type === "eXIf") continue;
      if (c.type === "IDAT" && tiff && !wrote) { parts.push(pngChunk("eXIf", tiff)); wrote = true; }
      if (c.type === "tEXt" || c.type === "zTXt" || c.type === "iTXt") {
        const z = d.indexOf(0), key = ascii(d, 0, z < 0 ? d.length : z);
        const isXmp = key === "XML:com.adobe.xmp";
        if (isXmp ? dropXmp(meta.xmp === true ? "GPS" : String(meta.xmp)) : mode === "all") { removed.add(isXmp ? "xmp" : "text"); continue; }
      }
      if (c.type === "tIME" && mode === "all") { removed.add("text"); continue; }
      parts.push(b.subarray(c.start, c.end));
    }
    return { bytes: concat(parts), removed: [...removed] };
  }

  if (meta.format === "webp") {
    // WebP có EXIF/XMP luôn có chunk VP8X; thứ tự chuẩn: VP8X, ICCP, ANIM, ảnh, EXIF, XMP
    const tiff = newTiff();
    const parts = [];
    for (const c of webpChunks(b)) {
      const d = b.subarray(c.start + 8, c.start + 8 + c.size);
      if (c.type === "EXIF") continue;
      if (c.type === "XMP " && dropXmp(utf8(d))) { removed.add("xmp"); continue; }
      parts.push({ type: c.type, raw: b.slice(c.start, c.end) });
    }
    const vp8x = parts.find((p) => p.type === "VP8X");
    if (tiff && vp8x) {
      const x = parts.findIndex((p) => p.type === "XMP ");
      parts.splice(x < 0 ? parts.length : x, 0, { type: "EXIF", raw: webpChunk("EXIF", tiff) });
    }
    if (vp8x) {
      const keepX = parts.some((p) => p.type === "XMP "), keepE = parts.some((p) => p.type === "EXIF");
      vp8x.raw[8] = (vp8x.raw[8] & ~0x0c) | (keepE ? 0x08 : 0) | (keepX ? 0x04 : 0);
    }
    const body = concat(parts.map((p) => p.raw));
    const head = b.slice(0, 12), n = body.length + 4;
    head[4] = n & 255; head[5] = (n >> 8) & 255; head[6] = (n >> 16) & 255; head[7] = n >>> 24;
    return { bytes: concat([head, body]), removed: [...removed] };
  }
  return null;
}

/** Bản sao khối TIFF với thẻ hướng xoay đặt về value (dùng khi điểm ảnh đã được xoay sẵn) */
export function setOrientation(tiff, value = 1) {
  const t = tiff.slice(), p = parseTiff(t);
  if (!p || !p.offsets.ifd0) return t;
  const u16 = (o) => (p.le ? t[o] | (t[o + 1] << 8) : u16be(t, o));
  const off = p.offsets.ifd0, n = u16(off);
  for (let i = 0; i < n; i++) {
    const e = off + 2 + i * 12;
    if (u16(e) === 0x0112 && u16(e + 2) === 3) { if (p.le) { t[e + 8] = value; t[e + 9] = 0; } else { t[e + 8] = 0; t[e + 9] = value; } }
  }
  return t;
}

/** Chèn khối TIFF (EXIF) vào file JPEG (thay EXIF cũ nếu có), ngay sau SOI/APP0 */
export function insertJpegExif(jpeg, tiff) {
  const segs = jpegSegments(jpeg);
  const parts = [jpeg.subarray(0, 2)];
  let done = false;
  for (const s of segs.list) {
    const d = jpeg.subarray(s.start + 4, s.end);
    if (s.marker === 0xe1 && startsWith(d, 0, "Exif\0")) continue;
    if (!done && s.marker !== 0xe0) { parts.push(jpegApp1(tiff)); done = true; }
    parts.push(jpeg.subarray(s.start, s.end));
  }
  if (!done) parts.push(jpegApp1(tiff));
  parts.push(jpeg.subarray(segs.sos < 0 ? jpeg.length : segs.sos));
  return concat(parts);
}
