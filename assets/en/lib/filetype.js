/* Tự sinh bởi scripts/build.js từ assets/lib/filetype.js và i18n/en/js/ — đừng sửa tay. */
/* Nhận biết loại file theo đuôi, MIME và "magic bytes" (vài byte đầu file).
   Loại (kind) dùng trong trường "accept" của registry: pdf, image, heic, svg, audio, video, excel, csv, json, docx, text, any. */

export const KIND_EXT = {
  pdf: ["pdf"],
  image: ["jpg", "jpeg", "jfif", "pjpeg", "png", "webp", "gif", "bmp", "avif", "ico"],
  heic: ["heic", "heif", "hif"],
  svg: ["svg"],
  audio: ["mp3", "wav", "m4a", "aac", "ogg", "oga", "opus", "flac", "weba", "amr", "wma"],
  video: ["mp4", "mov", "webm", "mkv", "avi", "m4v", "3gp", "mpeg", "mpg", "wmv"],
  excel: ["xlsx", "xls", "xlsm", "ods"],
  csv: ["csv", "tsv"],
  json: ["json"],
  docx: ["docx"],
  text: ["txt", "md", "markdown", "log"]
};

export const KIND_LABEL = {
  pdf: "PDF", image: "image", heic: "HEIC image", svg: "SVG image", audio: "audio", video: "video",
  excel: "Excel", csv: "CSV", json: "JSON", docx: "Word", text: "text", any: "file"
};

const MIME_KIND = [
  [/^application\/pdf$/, "pdf"],
  [/^image\/(heic|heif)(-sequence)?$/, "heic"],
  [/^image\/svg\+xml$/, "svg"],
  [/^image\//, "image"],
  [/^audio\//, "audio"],
  [/^video\//, "video"],
  [/spreadsheetml|ms-excel|opendocument\.spreadsheet/, "excel"],
  [/^text\/(csv|tab-separated-values)$/, "csv"],
  [/^application\/json$/, "json"],
  [/wordprocessingml/, "docx"],
  [/^text\/(plain|markdown)$/, "text"]
];

export function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "";
}

const ascii = (b, from, len) => String.fromCharCode(...b.subarray(from, from + len));

/** Đoán loại từ vài chục byte đầu file. Trả về kind hoặc "" nếu không biết. */
export function sniff(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (b.length < 4) return "";
  if (ascii(b, 0, 5) === "%PDF-") return "pdf";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image";            // JPEG
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return "image";
  if (ascii(b, 0, 4) === "GIF8") return "image";
  if (b[0] === 0x42 && b[1] === 0x4d && b.length > 14) return "image";            // BMP
  if (ascii(b, 0, 4) === "RIFF" && b.length >= 12) {
    const t = ascii(b, 8, 4);
    if (t === "WEBP") return "image";
    if (t === "WAVE") return "audio";
    if (t === "AVI ") return "video";
  }
  if (b.length >= 12 && ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    if (/^(heic|heix|heim|heis|hevc|hevx|mif1|msf1|hevm|hevs)$/.test(brand)) return "heic";
    if (/^(avif|avis)$/.test(brand)) return "image";
    if (/^(M4A |M4B |M4P )$/.test(brand)) return "audio";
    return "video"; // isom, mp41, mp42, qt  , 3gp…
  }
  if (ascii(b, 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return "audio"; // MP3
  if (ascii(b, 0, 4) === "OggS" || ascii(b, 0, 4) === "fLaC") return "audio";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video"; // WebM/MKV
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "excel"; // .xls (OLE)
  const head = ascii(b, 0, Math.min(b.length, 256)).replace(/^﻿|^\xEF\xBB\xBF/, "").trimStart();
  if (/^<\?xml[^>]*>\s*(<!--[\s\S]*?-->\s*)*<svg|^<svg[\s>]/i.test(head)) return "svg";
  return "";
}

/** Các loại của một file. info: { name, type } (File hoặc tương tự); head: Uint8Array vài byte đầu (tuỳ chọn). */
export function kindsOf(info, head) {
  const kinds = new Set();
  const ext = extOf(info && info.name);
  for (const [k, list] of Object.entries(KIND_EXT)) if (list.includes(ext)) kinds.add(k);
  const type = (info && info.type) || "";
  for (const [re, k] of MIME_KIND) if (re.test(type)) { kinds.add(k); break; }
  if (head) {
    const s = sniff(head);
    if (s) {
      // nội dung thật được ưu tiên: file .jpg thực chất là HEIC (hay gặp khi gửi từ iPhone)
      if (s === "heic") { kinds.delete("image"); kinds.add("heic"); }
      else if (s === "image" && kinds.has("heic")) { kinds.delete("heic"); kinds.add("image"); }
      else kinds.add(s);
      // .xlsx/.docx là file zip, phân biệt bằng đuôi ở trên
    }
  }
  if (kinds.has("heic")) kinds.delete("image");
  kinds.add("any");
  return [...kinds];
}

export function accepts(acceptList, kinds) {
  if (!acceptList || !acceptList.length) return false;
  return acceptList.some((k) => kinds.includes(k));
}

/** Chuỗi cho thuộc tính accept của <input type=file> */
export function acceptAttr(acceptList) {
  if (!acceptList || acceptList.includes("any")) return "";
  const parts = [];
  for (const k of acceptList) {
    if (k === "image") parts.push("image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif");
    else if (k === "heic") parts.push("image/heic", "image/heif");
    else if (k === "pdf") parts.push("application/pdf");
    else if (k === "audio") parts.push("audio/*");
    else if (k === "video") parts.push("video/*");
    else if (k === "svg") parts.push("image/svg+xml");
    (KIND_EXT[k] || []).forEach((e) => parts.push("." + e));
  }
  return [...new Set(parts)].join(",");
}

const ACCEPT_TEXT = { pdf: "PDF", image: "JPG, PNG, WebP, GIF, BMP, AVIF", heic: "HEIC, HEIF", svg: "SVG", audio: "MP3, WAV, M4A, OGG, FLAC", video: "MP4, MOV, WEBM, MKV", excel: "XLSX, XLS, ODS", csv: "CSV, TSV", json: "JSON", docx: "DOCX", text: "TXT, MD", any: "any file" };
export function describeAccept(acceptList) {
  return (acceptList || []).map((k) => ACCEPT_TEXT[k] || k.toUpperCase()).join(", ");
}
