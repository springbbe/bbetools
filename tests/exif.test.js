import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { imageFormat, buildTiff, parseTiff, gpsPosition, wipeGps, readMeta, stripMeta, hasMeta, jpegSegments, pngChunks, webpChunks, crc32, setOrientation, insertJpegExif } from "../assets/lib/exif.js";

const cat = (...parts) => { const n = parts.reduce((s, p) => s + p.length, 0), o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
const str = (s) => new TextEncoder().encode(s);
const seg = (marker, data) => cat(Uint8Array.of(0xff, marker, (data.length + 2) >> 8, (data.length + 2) & 255), data);

const TIFF = buildTiff({
  ifd0: [[0x010f, 2, "BbeTools"], [0x0110, 2, "Máy ảnh mẫu X1"], [0x0112, 3, 6], [0x013b, 2, "Nguyễn Văn A"]],
  exif: [[0x9003, 2, "2025:09:02 08:30:00"], [0x829a, 5, 0.008], [0x8827, 3, 200], [0xa431, 2, "SN123456"]],
  gps: [[0x0001, 2, "N"], [0x0002, 5, [21, 1, 42.6]], [0x0003, 2, "E"], [0x0004, 5, [105, 51, 15.1]], [0x0005, 1, [0]], [0x0006, 5, 12.5]]
});
const XMP = '<x:xmpmeta><rdf:Description exif:GPSLatitude="21,1.71N" exif:GPSLongitude="105,51.25E"/></x:xmpmeta>';

// JPEG giả: đủ cấu trúc segment (không giải mã được thành ảnh, nhưng hàm chỉ đọc cấu trúc)
function fakeJpeg() {
  return cat(Uint8Array.of(0xff, 0xd8),
    seg(0xe0, cat(str("JFIF\0"), Uint8Array.of(1, 1, 0, 0, 1, 0, 1, 0, 0))),
    seg(0xe1, cat(str("Exif\0\0"), TIFF)),
    seg(0xe1, cat(str("http://ns.adobe.com/xap/1.0/\0"), str(XMP))),
    seg(0xe2, cat(str("ICC_PROFILE\0"), Uint8Array.of(1, 1, 9, 9))),
    seg(0xed, str("Photoshop 3.0\0IPTC")),
    seg(0xfe, str("bình luận")),
    seg(0xdb, new Uint8Array(65)),
    seg(0xc0, Uint8Array.of(8, 0, 16, 0, 16, 1, 1, 0x11, 0)),
    seg(0xda, Uint8Array.of(1, 1, 0, 0, 63, 0)),
    Uint8Array.of(0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56),   // dữ liệu ảnh có FF00 và RST0
    Uint8Array.of(0xff, 0xd9),
    str("TRAILER-SAMSUNG"));
}

test("nhận biết định dạng", () => {
  assert.equal(imageFormat(fakeJpeg()), "jpeg");
  assert.equal(imageFormat(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10)), "png");
  assert.equal(imageFormat(cat(str("RIFF"), new Uint8Array(4), str("WEBP"))), "webp");
  assert.equal(imageFormat(cat(new Uint8Array(4), str("ftypheic"))), "heif");
});

test("tạo và đọc lại khối TIFF", () => {
  const p = parseTiff(TIFF);
  assert.equal(p.ifd0.Make, "BbeTools");
  assert.equal(p.ifd0.Model, "Máy ảnh mẫu X1");
  assert.equal(p.ifd0.Artist, "Nguyễn Văn A");
  assert.equal(p.ifd0.Orientation, 6);
  assert.equal(p.exif.DateTimeOriginal, "2025:09:02 08:30:00");
  assert.equal(p.exif.ISO, 200);
  assert.ok(Math.abs(p.exif.ExposureTime - 0.008) < 1e-9);
  const g = gpsPosition(p.gps);
  assert.ok(Math.abs(g.lat - (21 + 1 / 60 + 42.6 / 3600)) < 1e-6);
  assert.ok(Math.abs(g.lon - (105 + 51 / 60 + 15.1 / 3600)) < 1e-6);
  assert.equal(g.alt, 12.5);
  assert.equal(gpsPosition({ GPSLatitude: [10, 0, 0], GPSLatitudeRef: "S", GPSLongitude: [20, 30, 0], GPSLongitudeRef: "W" }).lon, -20.5);
});

test("xoá GPS trong TIFF, giữ thẻ khác", () => {
  const w = wipeGps(TIFF);
  assert.equal(w.length, TIFF.length);
  const p = parseTiff(w);
  assert.equal(p.ifd0.Make, "BbeTools");
  assert.equal(p.exif.ISO, 200);
  assert.deepEqual(p.gps, {});
  assert.equal(gpsPosition(p.gps), null);
  assert.equal(new TextDecoder().decode(w).includes("105"), false);
});

test("đọc siêu dữ liệu JPEG", () => {
  const m = readMeta(fakeJpeg());
  assert.equal(m.format, "jpeg");
  assert.equal(m.orientation, 6);
  assert.ok(m.gps && m.gps.lat > 21);
  assert.ok(m.xmp.includes("GPSLatitude"));
  assert.equal(m.iptc, true);
  assert.equal(m.comment, "bình luận");
  assert.equal(m.icc, true);
  assert.equal(m.trailer, 15);
  assert.ok(hasMeta(m));
  const s = jpegSegments(fakeJpeg());
  assert.ok(s.sos > 0 && s.eoi === fakeJpeg().length - 15);
});

test("xoá hết siêu dữ liệu JPEG, giữ ICC và dữ liệu ảnh, giữ hướng xoay", () => {
  const src = fakeJpeg();
  const { bytes, removed } = stripMeta(src);
  const m = readMeta(bytes);
  assert.equal(m.gps, null);
  assert.equal(m.xmp, null);
  assert.equal(m.iptc, false);
  assert.equal(m.comment, null);
  assert.equal(m.trailer, 0);
  assert.equal(m.icc, true);
  assert.equal(m.orientation, 6);                       // chỉ còn thẻ hướng xoay
  assert.deepEqual(Object.keys(m.exif.ifd0), ["Orientation"]);
  for (const k of ["exif", "gps", "xmp", "iptc", "comment", "trailer"]) assert.ok(removed.includes(k), k);
  // phần ảnh (từ SOS đến EOI) giữ nguyên từng byte
  const a = jpegSegments(src), b = jpegSegments(bytes);
  assert.deepEqual(bytes.subarray(b.sos, b.eoi), src.subarray(a.sos, a.eoi));
  // không giữ hướng xoay: không còn EXIF nào
  const none = readMeta(stripMeta(src, { keepOrientation: false }).bytes);
  assert.equal(none.tiff, null);
  assert.equal(hasMeta(none), false);
});

test("chỉ xoá vị trí JPEG", () => {
  const { bytes, removed } = stripMeta(fakeJpeg(), { mode: "gps" });
  const m = readMeta(bytes);
  assert.equal(m.gps, null);
  assert.equal(m.exif.ifd0.Model, "Máy ảnh mẫu X1");
  assert.equal(m.exif.exif.DateTimeOriginal, "2025:09:02 08:30:00");
  assert.equal(m.xmp, null);                            // XMP có toạ độ cũng bị bỏ
  assert.equal(m.comment, "bình luận");
  assert.ok(removed.includes("gps") && !removed.includes("exif"));
});

test("file JPEG thật: xoá rồi vẫn là JPEG hợp lệ", () => {
  const real = new Uint8Array(readFileSync(new URL("../samples/anh-co-gps.jpg", import.meta.url)));
  const m = readMeta(real);
  assert.ok(m.gps, "file mẫu phải có GPS");
  const { bytes } = stripMeta(real);
  assert.equal(readMeta(bytes).gps, null);
  assert.equal(hasMeta(readMeta(bytes)), false);
  assert.ok(bytes.length < real.length);
  assert.deepEqual([...bytes.subarray(-2)], [0xff, 0xd9]);
});

function fakePng(chunks) {
  const ch = (type, data) => { const c = new Uint8Array(12 + data.length); new DataView(c.buffer).setUint32(0, data.length); c.set(str(type), 4); c.set(data, 8); new DataView(c.buffer).setUint32(8 + data.length, crc32(c, 4, 8 + data.length)); return c; };
  return cat(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10), ...chunks.map(([t, d]) => ch(t, d)));
}

test("PNG: đọc và xoá eXIf, tEXt, XMP", () => {
  const png = fakePng([["IHDR", new Uint8Array(13)], ["tEXt", str("Author\0Nguyen Van A")], ["iTXt", cat(str("XML:com.adobe.xmp\0\0\0\0\0"), str(XMP))], ["eXIf", TIFF], ["IDAT", Uint8Array.of(1, 2, 3)], ["IEND", new Uint8Array(0)]]);
  const m = readMeta(png);
  assert.equal(m.format, "png");
  assert.ok(m.gps);
  assert.deepEqual(m.text, [["Author", "Nguyen Van A"]]);
  assert.ok(String(m.xmp).includes("GPS"));
  const out = stripMeta(png).bytes;
  const types = pngChunks(out).map((c) => c.type);
  assert.deepEqual(types, ["IHDR", "eXIf", "IDAT", "IEND"]);   // eXIf chỉ còn hướng xoay
  assert.equal(readMeta(out).orientation, 6);
  assert.equal(readMeta(out).gps, null);
  // CRC của chunk mới đúng
  for (const c of pngChunks(out)) assert.equal(crc32(out, c.start + 4, c.end - 4), new DataView(out.buffer, out.byteOffset).getUint32(c.end - 4));
  const g = readMeta(stripMeta(png, { mode: "gps" }).bytes);
  assert.equal(g.gps, null);
  assert.equal(g.exif.ifd0.Make, "BbeTools");
  assert.deepEqual(g.text, [["Author", "Nguyen Van A"]]);
});

function fakeWebp(withExif) {
  const ch = (t, d) => { const c = new Uint8Array(8 + d.length + (d.length & 1)); c.set(str(t)); new DataView(c.buffer).setUint32(4, d.length, true); c.set(d, 8); return c; };
  const vp8x = new Uint8Array(10); vp8x[0] = withExif ? 0x0c : 0;
  const body = cat(ch("VP8X", vp8x), ch("VP8 ", Uint8Array.of(1, 2, 3)), ...(withExif ? [ch("EXIF", TIFF), ch("XMP ", str(XMP))] : []));
  const head = cat(str("RIFF"), new Uint8Array(4), str("WEBP"));
  new DataView(head.buffer).setUint32(4, body.length + 4, true);
  return cat(head, body);
}

test("WebP: đọc, xoá EXIF/XMP, sửa cờ VP8X và kích thước RIFF", () => {
  const w = fakeWebp(true);
  const m = readMeta(w);
  assert.ok(m.gps && m.orientation === 6 && m.xmp);
  const out = stripMeta(w, { keepOrientation: false }).bytes;
  assert.deepEqual(out, fakeWebp(false));
  const kept = stripMeta(w).bytes;
  assert.deepEqual(webpChunks(kept).map((c) => c.type), ["VP8X", "VP8 ", "EXIF"]);
  assert.equal(kept[12 + 8] & 0x0c, 0x08);
  assert.equal(new DataView(kept.buffer).getUint32(4, true), kept.length - 8);
});

test("HEIC thật (sips): đọc được EXIF và GPS", () => {
  const heic = new Uint8Array(readFileSync(new URL("../samples/anh-iphone-co-gps.heic", import.meta.url)));
  const m = readMeta(heic);
  assert.equal(m.format, "heif");
  assert.equal(m.exif.ifd0.Model, "May anh mau X1");
  assert.ok(Math.abs(m.gps.lat - 21.0285) < 1e-3 && Math.abs(m.gps.lon - 105.8522) < 1e-3);
  assert.equal(readMeta(new Uint8Array(readFileSync(new URL("../samples/anh-iphone.heic", import.meta.url)))).gps, null);
  assert.equal(stripMeta(heic), null);                 // không xoá trực tiếp được, công cụ sẽ chuyển sang JPG
});

test("đặt lại hướng xoay và chèn EXIF vào JPEG", () => {
  const t = setOrientation(TIFF, 1);
  assert.equal(parseTiff(t).ifd0.Orientation, 1);
  assert.equal(parseTiff(t).ifd0.Make, "BbeTools");
  const bare = stripMeta(fakeJpeg(), { keepOrientation: false }).bytes;
  const withExif = insertJpegExif(bare, wipeGps(t));
  const m = readMeta(withExif);
  assert.equal(m.exif.ifd0.Model, "Máy ảnh mẫu X1");
  assert.equal(m.gps, null);
  assert.equal(m.orientation, 1);
  assert.equal(jpegSegments(withExif).list[0].marker, 0xe0);   // EXIF nằm sau APP0
  assert.equal(jpegSegments(withExif).list[1].marker, 0xe1);
});
