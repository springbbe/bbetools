/* Xoá thông tin EXIF/GPS: xem máy chụp, ngày giờ, vị trí… trong ảnh rồi xoá.
   JPG, PNG, WebP: xoá thẳng trong file, không nén lại (ảnh giữ nguyên chất lượng). HEIC/AVIF: lưu lại thành JPG. */
import { h, icon, dialog, copyText, baseName, extOf, fmtSize, fmtNum, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, canvas, encode, hasAlpha, thumbUrl } from "../image.js";
import { readMeta, stripMeta, hasMeta, wipeGps, setOrientation, insertJpegExif } from "../lib/exif.js";

const REMOVED = { gps: "vị trí GPS", exif: "máy chụp, ngày giờ (EXIF)", thumb: "ảnh thu nhỏ nhúng", xmp: "XMP", iptc: "IPTC", comment: "bình luận", text: "chú thích", mpf: "ảnh phụ", trailer: "dữ liệu thừa cuối file", other: "dữ liệu riêng của máy" };
const ORI = { 2: "lật ngang", 3: "xoay 180°", 4: "lật dọc", 5: "xoay trái + lật", 6: "xoay phải 90°", 7: "xoay phải + lật", 8: "xoay trái 90°" };
const MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

const gpsText = (g) => `${g.lat.toFixed(6)}, ${g.lon.toFixed(6)}`;
function exifDate(s) {
  const m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/.exec(s || "");
  return m ? `${m[4]}:${m[5]} ngày ${m[3]}/${m[2]}/${m[1]}` : s;
}

/** Danh sách [nhãn, giá trị, nhạy cảm?] để hiện cho người dùng */
function fieldsOf(m) {
  const out = [], add = (k, v, warn) => { if (v != null && v !== "" && !(v instanceof Uint8Array)) out.push([k, String(v), !!warn]); };
  if (m.gps) add("Vị trí GPS", gpsText(m.gps) + (m.gps.alt != null ? ` (độ cao ${Math.round(m.gps.alt)} m)` : ""), true);
  const e = m.exif;
  if (e) {
    const i0 = e.ifd0, ex = e.exif;
    add("Máy chụp", [i0.Make, i0.Model && i0.Make && String(i0.Model).startsWith(i0.Make) ? i0.Model.slice(i0.Make.length).trim() : i0.Model].filter(Boolean).join(" "));
    add("Ống kính", [ex.LensMake, ex.LensModel].filter(Boolean).join(" "));
    add("Số sê-ri máy", ex.BodySerialNumber, true);
    add("Số sê-ri ống kính", ex.LensSerialNumber, true);
    add("Chủ máy", ex.CameraOwnerName, true);
    add("Tác giả", i0.Artist, true);
    add("Bản quyền", i0.Copyright);
    add("Thời điểm chụp", ex.DateTimeOriginal ? exifDate(ex.DateTimeOriginal) + (ex.OffsetTimeOriginal ? ` (UTC${ex.OffsetTimeOriginal})` : "") : null, true);
    if (!ex.DateTimeOriginal) add("Ngày giờ", exifDate(i0.DateTime), true);
    if (e.gps && e.gps.GPSDateStamp) add("Ngày (theo GPS)", e.gps.GPSDateStamp.replace(/:/g, "-"), true);
    const shot = [ex.FNumber && "f/" + fmtNum(ex.FNumber, 1), ex.ExposureTime && (ex.ExposureTime < 1 ? "1/" + Math.round(1 / ex.ExposureTime) : fmtNum(ex.ExposureTime, 1)) + " giây", ex.ISO && "ISO " + ex.ISO, ex.FocalLength && fmtNum(ex.FocalLength, 1) + " mm"].filter(Boolean).join(" · ");
    add("Thông số chụp", shot);
    add("Phần mềm", i0.Software);
    add("Mô tả", i0.ImageDescription, true);
    if (m.orientation > 1) add("Hướng xoay", ORI[m.orientation] || m.orientation);
    if (e.thumb) add("Ảnh thu nhỏ nhúng", fmtSize(e.thumb.length) + " (có thể còn giữ ảnh gốc trước khi cắt)", true);
  }
  for (const [k, v] of m.text) add("Chú thích “" + k + "”", v.length > 120 ? v.slice(0, 120) + "…" : v, true);
  if (m.comment) add("Bình luận", m.comment.slice(0, 200), true);
  if (m.xmp) add("XMP", "có (thông tin chỉnh sửa, tác giả… dạng XML)");
  if (m.iptc) add("IPTC", "có (chú thích, từ khoá, tác giả…)", true);
  if (m.mpf) add("Ảnh phụ (MPF)", "có (ảnh độ sâu, ảnh xem trước…)");
  if (m.trailer) add("Dữ liệu thừa cuối file", fmtSize(m.trailer), true);
  if (m.icc) add("Hồ sơ màu (ICC)", "có · được giữ lại để màu hiển thị đúng");
  return out;
}

function infoDialog(it) {
  const f = fieldsOf(it.meta);
  dialog((close) => h("div", { class: "dlg-body" },
    h("h2", { text: "Thông tin ẩn trong ảnh" }),
    h("p", { class: "hint", text: it.name }),
    f.length ? h("dl", { class: "kv ex-kv" }, f.map(([k, v, warn]) => [h("dt", { text: k }), h("dd", { class: warn ? "ex-warn" : null, text: v })])) : h("p", { text: "Ảnh này không chứa EXIF, GPS hay thông tin ẩn nào." }),
    it.meta.gps ? h("p", { class: "alert ex-alert", html: icon("triangle-alert") + " Ai có ảnh này đều xem được nơi bạn chụp. Hãy xoá trước khi đăng lên mạng hoặc gửi cho người lạ." }) : null,
    h("div", { class: "dlg-acts" },
      it.meta.gps ? h("button", { class: "btn ghost", type: "button", onclick: () => copyText(gpsText(it.meta.gps), "Đã sao chép toạ độ") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép toạ độ") : null,
      h("button", { class: "btn", type: "button", text: "Đóng", onclick: () => close() }))), { label: "Thông tin EXIF" });
}

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "ảnh",
  action: "Xoá thông tin",
  sample: () => sampleFiles("anh-co-gps.jpg", "anh-iphone-co-gps.heic"),
  async load(it) {
    const bytes = new Uint8Array(await it.file.arrayBuffer());
    it.meta = readMeta(bytes);
    try { it.thumb = await thumbUrl(await decodeImage(it.file), 112); } catch (e) { if (!it.meta.format) throw e; }
    const m = it.meta, e = m.exif, cam = e && [e.ifd0.Make, e.ifd0.Model].filter(Boolean).join(" ");
    it.info = m.gps ? "Có vị trí GPS" + (cam ? " · " + cam : "") : hasMeta(m) ? "Có thông tin ẩn" + (cam ? " · " + cam : "") : "Không có thông tin ẩn";
  },
  itemActions: (it) => (it.meta ? [h("button", { class: "ib sm" + (it.meta.gps ? " ex-gps" : ""), type: "button", title: "Xem thông tin ẩn", "aria-label": "Xem thông tin ẩn trong " + it.name, html: icon(it.meta.gps ? "map-pin" : "info"), onclick: () => infoDialog(it) })] : []),
  options(el) {
    el.append(
      seg("mode", [["all", "Xoá tất cả"], ["gps", "Chỉ xoá vị trí"]], "all", "Cần xoá"),
      h("p", { class: "hint", id: "mode-hint" }),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "ori", checked: true }), h("span", null, "Giữ hướng xoay", h("small", { text: "Giữ lại đúng một thẻ cho biết ảnh dọc hay ngang, để ảnh chụp điện thoại không bị quay ngang." }))),
      h("p", { class: "hint", id: "ex-sum", "aria-live": "polite" }),
      h("p", { class: "hint", text: "JPG, PNG, WebP được xoá trực tiếp trong file, không nén lại nên chất lượng giữ nguyên. Ảnh HEIC/AVIF được lưu lại thành JPG. Hồ sơ màu được giữ để màu không đổi." }));
    const upd = () => {
      el.querySelector("#mode-hint").textContent = radioVal(el, "mode") === "gps" ? "Chỉ bỏ toạ độ, độ cao và mọi thông tin vị trí; giữ máy chụp, ngày giờ, thông số chụp." : "Bỏ vị trí GPS, máy chụp, số sê-ri, ngày giờ, tác giả, phần mềm, ảnh thu nhỏ nhúng, XMP, IPTC, bình luận.";
    };
    el.addEventListener("input", upd); upd();
    return () => ({ mode: radioVal(el, "mode"), keepOrientation: el.querySelector("#ori").checked });
  },
  onChange(ctx) {
    const s = document.getElementById("ex-sum");
    const ok = ctx.items.filter((i) => i.meta);
    if (s) s.textContent = ok.length ? `${ok.filter((i) => i.meta.gps).length}/${ok.length} ảnh có vị trí GPS · ${ok.filter((i) => hasMeta(i.meta)).length}/${ok.length} ảnh có thông tin ẩn.` : "";
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i], m = it.meta;
      ctx.status(`Đang xử lý ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      const tag = o.mode === "gps" ? "da-xoa-gps" : "da-xoa-exif";
      const bytes = new Uint8Array(await it.file.arrayBuffer());
      const res = MIME[m.format] ? stripMeta(bytes, o) : null;
      let blob, name, note;
      if (res) {
        blob = new Blob([res.bytes], { type: MIME[m.format] });
        name = `${baseName(it.name)}-${tag}.${extOf(it.name) || m.format}`;
        note = res.removed.length ? "Đã xoá: " + res.removed.map((k) => REMOVED[k] || k).join(", ") : "không có thông tin cần xoá";
      } else if (m.format === "heif" || hasMeta(m)) {
        // HEIC/AVIF: không sửa trực tiếp được → giải mã rồi lưu JPG (PNG nếu có nền trong suốt); điểm ảnh đã xoay đúng chiều
        const bmp = await decodeImage(it.file);
        const c = canvas(bmp.width, bmp.height);
        c.getContext("2d").drawImage(bmp, 0, 0);
        if (bmp.close) bmp.close();
        const png = hasAlpha(c);
        blob = await encode(c, png ? "image/png" : "image/jpeg", 0.92, { fast: true });
        if (!png && o.mode === "gps" && m.tiff) blob = new Blob([insertJpegExif(new Uint8Array(await blob.arrayBuffer()), setOrientation(wipeGps(m.tiff), 1))], { type: "image/jpeg" });
        c.width = c.height = 0;
        name = `${baseName(it.name)}-${tag}.${png ? "png" : "jpg"}`;
        note = `đã lưu lại thành ${png ? "PNG" : "JPG"}` + (m.gps ? ", đã xoá vị trí GPS" : "");
      } else {
        blob = it.file.slice(0, it.size, it.file.type);
        name = it.name;
        note = "không có thông tin cần xoá";
      }
      // kiểm tra lại kết quả
      const after = readMeta(new Uint8Array(await blob.arrayBuffer()));
      if (after.gps) throw Object.assign(new Error("Không xoá được vị trí GPS trong " + it.name), { userMsg: "Không xoá được vị trí GPS trong " + it.name + "." });
      outs.push({ blob, name, note, actions: [{ icon: "info", label: "Xem thông tin còn lại", run: () => infoDialog({ name, meta: after }) }] });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "anh-da-xoa-exif",
  doneTitle: (outs) => (outs.length > 1 ? `Đã làm sạch ${outs.length} ảnh!` : "Đã làm sạch ảnh!"),
  summary: () => "Bấm biểu tượng ⓘ để kiểm tra thông tin còn lại trong từng ảnh."
});

const css = document.createElement("style");
css.textContent = ".ex-kv dd{text-align:right;word-break:break-word}.ex-kv dd.ex-warn{color:var(--err)}.ex-alert{display:flex;gap:8px;align-items:flex-start;margin-top:12px}.ex-alert .i{flex:0 0 auto;margin-top:2px}.ib.ex-gps{color:var(--err)}";
document.head.append(css);
