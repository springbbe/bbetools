/* Tự sinh bởi scripts/build.js từ assets/tools/strip-exif.js và i18n/en/js/ — đừng sửa tay. */
/* Xoá thông tin EXIF/GPS: xem máy chụp, ngày giờ, vị trí… trong ảnh rồi xoá.
   JPG, PNG, WebP: xoá thẳng trong file, không nén lại (ảnh giữ nguyên chất lượng). HEIC/AVIF: lưu lại thành JPG. */
import { h, icon, dialog, copyText, baseName, extOf, fmtSize, fmtNum, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, canvas, encode, hasAlpha, thumbUrl } from "../image.js";
import { readMeta, stripMeta, hasMeta, wipeGps, setOrientation, insertJpegExif } from "../lib/exif.js";

const REMOVED = { gps: "GPS location", exif: "camera, date and time (EXIF)", thumb: "embedded thumbnail", xmp: "XMP", iptc: "IPTC", comment: "comments", text: "captions", mpf: "extra images", trailer: "extra data at end of file", other: "camera maker data" };
const ORI = { 2: "flip horizontal", 3: "rotate 180°", 4: "flip vertical", 5: "rotate left + flip", 6: "rotate right 90°", 7: "rotate right + flip", 8: "rotate left 90°" };
const MIME = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

const gpsText = (g) => `${g.lat.toFixed(6)}, ${g.lon.toFixed(6)}`;
function exifDate(s) {
  const m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/.exec(s || "");
  return m ? `${m[4]}:${m[5]}, ${m[2]}/${m[3]}/${m[1]}` : s;
}

/** Danh sách [nhãn, giá trị, nhạy cảm?] để hiện cho người dùng */
function fieldsOf(m) {
  const out = [], add = (k, v, warn) => { if (v != null && v !== "" && !(v instanceof Uint8Array)) out.push([k, String(v), !!warn]); };
  if (m.gps) add("GPS location", gpsText(m.gps) + (m.gps.alt != null ? ` (altitude ${Math.round(m.gps.alt)} m)` : ""), true);
  const e = m.exif;
  if (e) {
    const i0 = e.ifd0, ex = e.exif;
    add("Camera", [i0.Make, i0.Model && i0.Make && String(i0.Model).startsWith(i0.Make) ? i0.Model.slice(i0.Make.length).trim() : i0.Model].filter(Boolean).join(" "));
    add("Lens", [ex.LensMake, ex.LensModel].filter(Boolean).join(" "));
    add("Camera serial number", ex.BodySerialNumber, true);
    add("Lens serial number", ex.LensSerialNumber, true);
    add("Camera owner", ex.CameraOwnerName, true);
    add("Author", i0.Artist, true);
    add("Copyright", i0.Copyright);
    add("Date taken", ex.DateTimeOriginal ? exifDate(ex.DateTimeOriginal) + (ex.OffsetTimeOriginal ? ` (UTC${ex.OffsetTimeOriginal})` : "") : null, true);
    if (!ex.DateTimeOriginal) add("Date/time", exifDate(i0.DateTime), true);
    if (e.gps && e.gps.GPSDateStamp) add("Date (GPS)", e.gps.GPSDateStamp.replace(/:/g, "-"), true);
    const shot = [ex.FNumber && "f/" + fmtNum(ex.FNumber, 1), ex.ExposureTime && (ex.ExposureTime < 1 ? "1/" + Math.round(1 / ex.ExposureTime) : fmtNum(ex.ExposureTime, 1)) + " sec", ex.ISO && "ISO " + ex.ISO, ex.FocalLength && fmtNum(ex.FocalLength, 1) + " mm"].filter(Boolean).join(" · ");
    add("Shooting settings", shot);
    add("Software", i0.Software);
    add("Description", i0.ImageDescription, true);
    if (m.orientation > 1) add("Orientation", ORI[m.orientation] || m.orientation);
    if (e.thumb) add("Embedded thumbnail", fmtSize(e.thumb.length) + " (may still contain the original image before cropping)", true);
  }
  for (const [k, v] of m.text) add("Caption “" + k + "”", v.length > 120 ? v.slice(0, 120) + "…" : v, true);
  if (m.comment) add("Comment", m.comment.slice(0, 200), true);
  if (m.xmp) add("XMP", "yes (edit history, author… as XML)");
  if (m.iptc) add("IPTC", "yes (caption, keywords, author…)", true);
  if (m.mpf) add("Extra images (MPF)", "yes (depth map, preview…)");
  if (m.trailer) add("Extra data at end of file", fmtSize(m.trailer), true);
  if (m.icc) add("Color profile (ICC)", "yes · kept so colors display correctly");
  return out;
}

function infoDialog(it) {
  const f = fieldsOf(it.meta);
  dialog((close) => h("div", { class: "dlg-body" },
    h("h2", { text: "Hidden info in the image" }),
    h("p", { class: "hint", text: it.name }),
    f.length ? h("dl", { class: "kv ex-kv" }, f.map(([k, v, warn]) => [h("dt", { text: k }), h("dd", { class: warn ? "ex-warn" : null, text: v })])) : h("p", { text: "This image has no EXIF, GPS or hidden info." }),
    it.meta.gps ? h("p", { class: "alert ex-alert", html: icon("triangle-alert") + " Anyone who has this image can see where you took it. Remove it before posting online or sending to strangers." }) : null,
    h("div", { class: "dlg-acts" },
      it.meta.gps ? h("button", { class: "btn ghost", type: "button", onclick: () => copyText(gpsText(it.meta.gps), "Coordinates copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy coordinates") : null,
      h("button", { class: "btn", type: "button", text: "Close", onclick: () => close() }))), { label: "EXIF info" });
}

fileTool({
  accept: ["image", "heic"], multiple: true, noun: "images",
  action: "Remove info",
  sample: () => sampleFiles("anh-co-gps.jpg", "anh-iphone-co-gps.heic"),
  async load(it) {
    const bytes = new Uint8Array(await it.file.arrayBuffer());
    it.meta = readMeta(bytes);
    try { it.thumb = await thumbUrl(await decodeImage(it.file), 112); } catch (e) { if (!it.meta.format) throw e; }
    const m = it.meta, e = m.exif, cam = e && [e.ifd0.Make, e.ifd0.Model].filter(Boolean).join(" ");
    it.info = m.gps ? "Has GPS location" + (cam ? " · " + cam : "") : hasMeta(m) ? "Has hidden info" + (cam ? " · " + cam : "") : "No hidden info";
  },
  itemActions: (it) => (it.meta ? [h("button", { class: "ib sm" + (it.meta.gps ? " ex-gps" : ""), type: "button", title: "View hidden info", "aria-label": "View hidden info in " + it.name, html: icon(it.meta.gps ? "map-pin" : "info"), onclick: () => infoDialog(it) })] : []),
  options(el) {
    el.append(
      seg("mode", [["all", "Remove all"], ["gps", "Remove location only"]], "all", "To remove"),
      h("p", { class: "hint", id: "mode-hint" }),
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "ori", checked: true }), h("span", null, "Keep orientation", h("small", { text: "Keeps only the one tag saying whether the photo is portrait or landscape, so phone photos don't turn sideways." }))),
      h("p", { class: "hint", id: "ex-sum", "aria-live": "polite" }),
      h("p", { class: "hint", text: "JPG, PNG and WebP are cleaned directly in the file without recompression, so quality is unchanged. HEIC/AVIF images are saved as JPG. The color profile is kept so colors don't change." }));
    const upd = () => {
      el.querySelector("#mode-hint").textContent = radioVal(el, "mode") === "gps" ? "Removes only coordinates, altitude and all location info; keeps camera, date/time and shooting settings." : "Removes GPS location, camera, serial numbers, date/time, author, software, embedded thumbnail, XMP, IPTC and comments.";
    };
    el.addEventListener("input", upd); upd();
    return () => ({ mode: radioVal(el, "mode"), keepOrientation: el.querySelector("#ori").checked });
  },
  onChange(ctx) {
    const s = document.getElementById("ex-sum");
    const ok = ctx.items.filter((i) => i.meta);
    if (s) s.textContent = ok.length ? `${ok.filter((i) => i.meta.gps).length}/${ok.length} images have GPS location · ${ok.filter((i) => hasMeta(i.meta)).length}/${ok.length} images have hidden info.` : "";
  },
  async run(items, o, ctx) {
    const outs = [];
    for (let i = 0; i < items.length; i++) {
      ctx.check();
      const it = items[i], m = it.meta;
      ctx.status(`Processing ${it.name}${items.length > 1 ? ` (${i + 1}/${items.length})` : ""}…`);
      const tag = o.mode === "gps" ? "no-gps" : "no-exif";
      const bytes = new Uint8Array(await it.file.arrayBuffer());
      const res = MIME[m.format] ? stripMeta(bytes, o) : null;
      let blob, name, note;
      if (res) {
        blob = new Blob([res.bytes], { type: MIME[m.format] });
        name = `${baseName(it.name)}-${tag}.${extOf(it.name) || m.format}`;
        note = res.removed.length ? "Removed: " + res.removed.map((k) => REMOVED[k] || k).join(", ") : "nothing to remove";
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
        note = `saved as ${png ? "PNG" : "JPG"}` + (m.gps ? ", GPS location removed" : "");
      } else {
        blob = it.file.slice(0, it.size, it.file.type);
        name = it.name;
        note = "nothing to remove";
      }
      // kiểm tra lại kết quả
      const after = readMeta(new Uint8Array(await blob.arrayBuffer()));
      if (after.gps) throw Object.assign(new Error("Couldn't remove the GPS location in " + it.name), { userMsg: "Couldn't remove the GPS location in " + it.name + "." });
      outs.push({ blob, name, note, actions: [{ icon: "info", label: "View remaining info", run: () => infoDialog({ name, meta: after }) }] });
      ctx.progress((i + 1) / items.length);
    }
    return outs;
  },
  zipName: "anh-da-xoa-exif",
  doneTitle: (outs) => (outs.length > 1 ? `Cleaned ${outs.length} images!` : "Image cleaned!"),
  summary: () => "Click the ⓘ icon to check the info remaining in each image."
});

const css = document.createElement("style");
css.textContent = ".ex-kv dd{text-align:right;word-break:break-word}.ex-kv dd.ex-warn{color:var(--err)}.ex-alert{display:flex;gap:8px;align-items:flex-start;margin-top:12px}.ex-alert .i{flex:0 0 auto;margin-top:2px}.ib.ex-gps{color:var(--err)}";
document.head.append(css);
