/* Ảnh sang Base64: data URI, chỉ chuỗi Base64, CSS background, thẻ <img>, Markdown; SVG có thể mã hoá URL (gọn hơn) */
import { h, icon, copyText, baseName, fmtSize, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { thumbUrl, decodeImage } from "../image.js";

const FORMATS = [["uri", "Data URI"], ["b64", "Chỉ Base64"], ["css", "CSS"], ["html", "HTML"], ["md", "Markdown"]];
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon", svg: "image/svg+xml" };

const mimeOf = (f) => f.type || MIME[(/\.(\w+)$/.exec(f.name) || [])[1]?.toLowerCase()] || "application/octet-stream";
function b64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
// SVG mã hoá URL: chỉ thoát các ký tự bắt buộc, giữ chữ dễ đọc (gọn hơn Base64 ~30%)
const svgUri = (t) => "data:image/svg+xml," + t.replace(/\s+/g, " ").trim().replace(/"/g, "'").replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent);

function wrap(fmt, uri, raw, it) {
  const alt = baseName(it.name).replace(/[-_]+/g, " ");
  if (fmt === "b64") return raw;
  if (fmt === "css") return `background-image: url("${uri}");`;
  if (fmt === "html") return `<img src="${uri}" alt="${alt}"${it.w ? ` width="${it.w}" height="${it.h}"` : ""}>`;
  if (fmt === "md") return `![${alt}](${uri})`;
  return uri;
}

fileTool({
  accept: ["image", "svg"], multiple: true, noun: "ảnh",
  action: "Chuyển sang Base64",
  sample: () => sampleFiles("logo-mau.svg", "ma-qr-mau.png"),
  async load(it) {
    it.mime = mimeOf(it.file);
    if (it.mime === "image/svg+xml") { it.thumbUrl = URL.createObjectURL(it.file); it.thumb = it.thumbUrl; it.info = "SVG"; return; }
    const bmp = await decodeImage(it.file);
    it.w = bmp.width; it.h = bmp.height;
    it.thumb = await thumbUrl(bmp, 112);
    it.info = `${it.w}×${it.h}`;
  },
  options(el) {
    el.append(seg("fmt", FORMATS, "uri", "Dạng kết quả"),
      h("p", { class: "hint", id: "fmt-hint" }),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "svgurl", checked: true }), h("span", null, "SVG: mã hoá URL thay cho Base64", h("small", { text: "Chuỗi ngắn hơn khoảng 30% và vẫn đọc được; chỉ áp dụng cho file SVG." }))),
      h("p", { class: "hint", text: "Base64 nặng hơn ảnh gốc khoảng 33%. Chỉ nên nhúng ảnh nhỏ (icon, logo dưới ~10 KB); ảnh lớn hãy nén trước bằng công cụ Nén ảnh." }));
    const HINTS = { uri: "Dán vào src của <img>, url() trong CSS, hoặc mở thẳng trên thanh địa chỉ.", b64: "Chuỗi thuần, không có tiền tố data:… – dùng cho API, JSON.", css: "Dán vào khối CSS của phần tử cần nền.", html: "Thẻ <img> hoàn chỉnh, dán vào HTML hoặc email.", md: "Cú pháp ảnh Markdown (một số nơi như GitHub không hiện ảnh data URI)." };
    const upd = () => { el.querySelector("#fmt-hint").textContent = HINTS[radioVal(el, "fmt")]; };
    el.addEventListener("input", upd); upd();
    return () => ({ fmt: radioVal(el, "fmt"), svgUrl: el.querySelector("#svgurl").checked });
  },
  async run(items, o, ctx) {
    const outs = [], blocks = [];
    for (const it of items) {
      ctx.check();
      const bytes = new Uint8Array(await it.file.arrayBuffer());
      const raw = b64(bytes);
      const isSvg = it.mime === "image/svg+xml";
      const uri = isSvg && o.svgUrl && o.fmt !== "b64" ? svgUri(new TextDecoder().decode(bytes)) : `data:${it.mime};base64,${raw}`;
      const text = wrap(o.fmt, uri, raw, it);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      outs.push({ blob, name: baseName(it.name) + "-base64.txt", note: `${text.length.toLocaleString("vi-VN")} ký tự · ảnh gốc ${fmtSize(it.size)}` });
      const ta = h("textarea", { class: "textarea out-text", readonly: true, rows: 5, "aria-label": "Kết quả của " + it.name, value: text });
      blocks.push(h("div", { class: "opt-group b64-block" },
        h("div", { class: "row b64-head" }, h("b", { text: it.name }), h("span", { class: "hint", text: `${text.length.toLocaleString("vi-VN")} ký tự` }),
          h("button", { class: "btn sm", type: "button", onclick: () => copyText(text) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép")),
        ta,
        it.mime.startsWith("image/") ? h("p", { class: "hint b64-prev" }, "Xem thử: ", h("img", { src: uri, alt: "", style: { maxHeight: "48px", verticalAlign: "middle" } })) : null));
    }
    if (outs.length) outs[0].extra = h("div", { class: "b64-out" }, blocks);
    return outs;
  },
  zipName: "anh-base64",
  doneTitle: (outs) => (outs.length > 1 ? `Đã chuyển ${outs.length} ảnh sang Base64!` : "Đã chuyển sang Base64!")
});

const css = document.createElement("style");
css.textContent = ".b64-out{margin-top:16px;display:grid;gap:18px}.b64-head{align-items:center;gap:10px}.b64-head b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.b64-prev{display:flex;align-items:center;gap:8px}";
document.head.append(css);
