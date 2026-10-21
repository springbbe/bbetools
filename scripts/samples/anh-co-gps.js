/* Tạo samples/anh-co-gps.jpg: ảnh phong cảnh mẫu (đã thu nhỏ) gắn EXIF giả – máy chụp, ngày giờ, tác giả, số sê-ri,
   toạ độ GPS (Hồ Hoàn Kiếm, Hà Nội) – kèm XMP và bình luận. Dùng cho công cụ Xoá thông tin EXIF/GPS.
   Gọi từ scripts/make-samples.js:  makeGpsJpeg(jpgVào, jpgRa) */
import { readFileSync, writeFileSync } from "node:fs";
import { buildTiff, jpegSegments } from "../../assets/lib/exif.js";

const str = (s) => new TextEncoder().encode(s);
const seg = (marker, data) => { const n = data.length + 2; const o = new Uint8Array(n + 2); o.set([0xff, marker, n >> 8, n & 255]); o.set(data, 4); return o; };
const cat = (...p) => { const o = new Uint8Array(p.reduce((s, x) => s + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };

export function makeGpsJpeg(input, output) {
  const src = new Uint8Array(readFileSync(input));
  const tiff = buildTiff({
    ifd0: [[0x010f, 2, "BbeTools"], [0x0110, 2, "May anh mau X1"], [0x0112, 3, 1], [0x0131, 2, "BbeTools 1.0"], [0x0132, 2, "2025:09:02 08:31:10"], [0x013b, 2, "Nguyen Van A"]],
    exif: [[0x9003, 2, "2025:09:02 08:30:00"], [0x9011, 2, "+07:00"], [0x829a, 5, 0.004], [0x829d, 5, 5.6], [0x8827, 3, 100], [0x920a, 5, 35], [0xa431, 2, "BBE-0012345"], [0xa434, 2, "Ong kinh mau 35mm"]],
    gps: [[0x0000, 1, [2, 3, 0, 0]], [0x0001, 2, "N"], [0x0002, 5, [21, 1, 42.6]], [0x0003, 2, "E"], [0x0004, 5, [105, 51, 7.9]], [0x0005, 1, [0]], [0x0006, 5, 12], [0x001d, 2, "2025:09:02"]]
  });
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" exif:GPSLatitude="21,1.71N" exif:GPSLongitude="105,51.1317E"><dc:creator><rdf:Seq><rdf:li>Nguyễn Văn A</rdf:li></rdf:Seq></dc:creator></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  // bỏ APP1 cũ (nếu có), chèn EXIF + XMP + bình luận ngay sau APP0
  const { list, sos } = jpegSegments(src);
  const keep = list.filter((s) => s.marker !== 0xe1 && s.marker !== 0xfe).map((s) => src.subarray(s.start, s.end));
  const app0 = list[0] && list[0].marker === 0xe0 ? [keep.shift()] : [];
  const out = cat(src.subarray(0, 2), ...app0, seg(0xe1, cat(str("Exif\0\0"), tiff)), seg(0xe1, cat(str("http://ns.adobe.com/xap/1.0/\0"), str(xmp))), seg(0xfe, str("Ảnh mẫu BbeTools – thông tin EXIF/GPS là giả")), ...keep, src.subarray(sos));
  writeFileSync(output, out);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) makeGpsJpeg(process.argv[2], process.argv[3]);
