/* Mã hoá/giải mã Base64: văn bản UTF-8 (có dấu), URL-safe, chia dòng 76 ký tự; file ↔ Base64/Data URL */
import { h, icon, save, fmtSize, toast } from "../core.js";
import { textTool } from "../frames/text.js";
import { encodeBase64, decodeBase64, bytesToBase64, base64ToBytes } from "../lib/encode.js";

// đoán loại file từ vài byte đầu để đặt đuôi khi tải về
const MAGIC = [[[0x89, 0x50, 0x4e, 0x47], "png", "image/png"], [[0xff, 0xd8, 0xff], "jpg", "image/jpeg"], [[0x47, 0x49, 0x46], "gif", "image/gif"],
  [[0x25, 0x50, 0x44, 0x46], "pdf", "application/pdf"], [[0x50, 0x4b, 0x03, 0x04], "zip", "application/zip"], [[0x52, 0x49, 0x46, 0x46], "webp", "image/webp"],
  [[0x49, 0x44, 0x33], "mp3", "audio/mpeg"], [[0x1f, 0x8b], "gz", "application/gzip"], [[0x3c, 0x73, 0x76, 0x67], "svg", "image/svg+xml"]];
const sniff = (b) => MAGIC.find(([sig]) => sig.every((x, i) => b[i] === x)) || [null, "bin", "application/octet-stream"];

const fileIn = h("input", { type: "file", hidden: true });
let tool;
const pick = h("button", { class: "btn ghost sm", type: "button", title: "Mã hoá một file sang Base64", onclick: () => fileIn.click() }, h("span", { html: icon("upload"), style: { display: "contents" } }), "File");
fileIn.onchange = async () => {
  const f = fileIn.files[0];
  fileIn.value = "";
  if (!f) return;
  if (f.size > 20 * 1048576) return toast("File lớn hơn 20 MB, chuỗi Base64 sẽ quá dài để hiện trong trang.");
  const b64 = bytesToBase64(new Uint8Array(await f.arrayBuffer()));
  const text = tool.opts.dataUrl ? `data:${f.type || "application/octet-stream"};base64,${b64}` : b64;
  tool.opts.mode = "encode";
  tool.setText("");
  // hiện kết quả của file (ô nhập để trống); nút Sao chép / Tải về lấy toàn bộ chuỗi
  tool.out.textContent = text.length > 300000 ? text.slice(0, 300000) + "…" : text;
  tool.result.text = text;
  tool.info.hidden = false;
  tool.info.textContent = `File ${f.name} (${fmtSize(f.size)}) → ${text.length.toLocaleString("vi-VN")} ký tự Base64. Bấm Sao chép để lấy toàn bộ.`;
};

const dl = h("button", { class: "btn ghost sm", type: "button", title: "Giải mã Base64 thành file và tải về", onclick: () => {
  try {
    const bytes = base64ToBytes(tool.ta.value);
    if (!bytes.length) return toast("Chưa có chuỗi Base64");
    const [, ext, type] = sniff(bytes);
    const m = /^data:([^;,]+)/.exec(tool.ta.value.trim());
    save(new Blob([bytes], { type: m ? m[1] : type }), "giai-ma." + (m ? (m[1].split("/")[1] || ext).replace("jpeg", "jpg").replace("svg+xml", "svg").replace("plain", "txt") : ext));
  } catch (e) { toast(e.message); }
} }, h("span", { html: icon("file-down"), style: { display: "contents" } }), "Lưu thành file");

tool = textTool({
  mono: true,
  inputLabel: "Đầu vào",
  outputLabel: "Kết quả",
  placeholder: "Gõ văn bản để mã hoá, hoặc dán chuỗi Base64 để giải mã…",
  sample: (o) => (o.mode === "decode" ? "WGluIGNow6BvIELhuqFuISBCYmVUb29scyBjaOG6oXkgMTAwJSB0csOqbiB0csOsbmggZHV54buHdC4=" : "Xin chào Bạn! BbeTools chạy 100% trên trình duyệt."),
  options: [
    { id: "mode", label: "Chiều", value: "encode", choices: [["encode", "Mã hoá → Base64"], ["decode", "Giải mã Base64 →"]] },
    { id: "urlSafe", type: "check", label: "URL-safe (- _ thay + /)", value: false, show: (o) => o.mode === "encode" },
    { id: "wrap", type: "check", label: "Chia dòng 76 ký tự (MIME)", value: false, show: (o) => o.mode === "encode" },
    { id: "dataUrl", type: "check", label: "File → Data URL (data:…;base64,)", value: false, show: (o) => o.mode === "encode" }
  ],
  swap: "mode",
  inputActions: [pick, fileIn],
  outputActions: [dl],
  download: { name: (o) => (o.mode === "encode" ? "base64.txt" : "giai-ma.txt") },
  transform(text, o) {
    dl.hidden = o.mode !== "decode";
    if (!text) return { text: "" };
    if (o.mode === "encode") {
      const r = encodeBase64(text, { urlSafe: o.urlSafe, wrap: o.wrap ? 76 : 0 });
      return { text: r, info: `${new TextEncoder().encode(text).length.toLocaleString("vi-VN")} byte → ${r.length.toLocaleString("vi-VN")} ký tự` };
    }
    const r = decodeBase64(text);
    if (r.binary) {
      const [, ext] = sniff(r.bytes);
      return { text: "", error: `Đây là dữ liệu nhị phân (${fmtSize(r.bytes.length)}${ext !== "bin" ? ", có vẻ là file ." + ext : ""}), không phải văn bản. Bấm “Lưu thành file” để tải về.` };
    }
    return { text: r.text, info: `${r.bytes.length.toLocaleString("vi-VN")} byte, văn bản UTF-8` };
  }
});
