/* Tự sinh bởi scripts/build.js từ assets/tools/favicon.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo favicon: favicon.ico (16, 32, 48), PNG 16/32, apple-touch-icon 180, Android 192/512, site.webmanifest, favicon.svg (nếu đầu vào là SVG)
   + đoạn HTML để dán vào <head>. Tuỳ chọn lề, nền màu, bo góc. */
import { h, icon, copyText, sampleFiles } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { decodeImage, canvas, encode, thumbUrl } from "../image.js";
import { buildIco, svgSize, svgWithSize } from "../lib/image-data.js";

let src = null;     // nguồn vẽ (ảnh hoặc SVG đã nạp) – vuông hoá khi vẽ
let preview = null;
const PREV = [16, 32, 48, 180];

async function loadSource(it) {
  if (it.svgText) {
    const s = svgSize(it.svgText), k = 1024 / Math.max(s.width, s.height);
    const url = URL.createObjectURL(new Blob([svgWithSize(it.svgText, Math.round(s.width * k), Math.round(s.height * k))], { type: "image/svg+xml" }));
    try { const img = new Image(); img.src = url; await img.decode(); return img; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  return decodeImage(it.file);
}

/** Vẽ icon cỡ size: ảnh nằm giữa (giữ tỉ lệ), lề pad, nền bg (null = trong suốt), bo góc radius (0..0.5) */
function draw(size, o, forceBg) {
  const c = canvas(size, size), g = c.getContext("2d");
  const bg = o.bg || forceBg;
  if (bg) {
    const r = size * o.radius;
    g.fillStyle = bg; g.beginPath();
    if (g.roundRect) g.roundRect(0, 0, size, size, r); else g.rect(0, 0, size, size);
    g.fill();
  }
  const box = size * (1 - 2 * o.pad), w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height;
  const k = box / Math.max(w, hh), dw = w * k, dh = hh * k;
  g.imageSmoothingQuality = "high";
  // thu nhỏ nhiều lần cho icon bé để nét không răng cưa
  let cur = src, cw = w, ch = hh;
  while (cw / 2 > dw * 1.5) { const t = canvas(cw / 2, ch / 2); const tg = t.getContext("2d"); tg.imageSmoothingQuality = "high"; tg.drawImage(cur, 0, 0, t.width, t.height); cur = t; cw = t.width; ch = t.height; }
  g.drawImage(cur, (size - dw) / 2, (size - dh) / 2, dw, dh);
  return c;
}
const png = async (c) => new Uint8Array(await (await encode(c, "image/png")).arrayBuffer());

fileTool({
  accept: ["image", "svg", "heic"], multiple: false, noun: "images or logos",
  action: "Create favicon",
  sample: () => sampleFiles("logo-mau.svg"),
  async load(it, ctx) {
    if (/svg/.test(it.file.type) || /\.svg$/i.test(it.name)) it.svgText = await it.file.text();
    src = await loadSource(it);
    const w = src.naturalWidth || src.width, hh = src.naturalHeight || src.height;
    it.thumb = it.svgText ? (it.thumbUrl = URL.createObjectURL(it.file)) : await thumbUrl(src, 112);
    it.info = it.svgText ? "SVG – sharp at every size" : `${w}×${hh}` + (Math.min(w, hh) < 512 ? " · images of 512 px or more recommended" : "");
    if (!preview) { preview = h("div", { class: "fav-prev", "aria-label": "Favicon preview" }); ctx.workMain.append(preview); }
  },
  options(el) {
    const pad = h("input", { type: "range", id: "pad", min: 0, max: 30, value: 0, "aria-label": "Padding around the logo" });
    const rad = h("input", { type: "range", id: "rad", min: 0, max: 50, value: 20, "aria-label": "Corner radius" });
    const bg = h("input", { type: "color", id: "bgc", value: "#3E5BF2", "aria-label": "Background color" });
    el.append(
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Padding around the logo" }), h("div", { class: "range-row" }, pad, h("output", { id: "pad-v" }))),
      seg("bgm", [["none", "Transparent"], ["color", "Color"]], "none", "Background"),
      h("div", { class: "opt-group", id: "g-bg", hidden: true },
        h("label", { class: "field color-in" }, h("span", { text: "Background color" }), bg),
        h("p", { class: "opt-title", text: "Corner radius" }), h("div", { class: "range-row" }, rad, h("output", { id: "rad-v" }))),
      h("div", { class: "opt-group" },
        h("label", { class: "field" }, h("span", { text: "Site name (for Android)" }), h("input", { class: "input", id: "app", value: "My website", maxlength: 45 })),
        h("label", { class: "field color-in" }, h("span", { text: "Theme color" }), h("input", { type: "color", id: "theme", value: "#ffffff", "aria-label": "Theme color" }))),
      h("p", { class: "hint", text: "The iPhone icon (apple-touch-icon) always has a background: iOS fills transparent areas with black, so the tool uses the background color or white." }));
    const upd = () => {
      el.querySelector("#pad-v").textContent = pad.value + "%";
      el.querySelector("#rad-v").textContent = rad.value + "%";
      el.querySelector("#g-bg").hidden = radioVal(el, "bgm") !== "color";
    };
    el.addEventListener("input", upd); upd();
    return () => ({ pad: +pad.value / 100, radius: +rad.value / 100, bg: radioVal(el, "bgm") === "color" ? bg.value : null, app: el.querySelector("#app").value.trim() || "Trang web", theme: el.querySelector("#theme").value });
  },
  onChange(ctx) {
    if (!preview || !src || !ctx.items.length) { if (preview) preview.textContent = ""; return; }
    const o = ctx.opts;
    preview.textContent = "";
    preview.append(h("p", { class: "opt-title", text: "Preview" }), h("div", { class: "fav-row" }, PREV.map((s) => {
      const c = draw(s, o, s === 180 ? "#ffffff" : null);
      c.style.width = c.style.height = Math.min(96, Math.max(s, 32)) + "px";
      c.className = s < 64 ? "px" : "";
      return h("figure", null, c, h("figcaption", { text: s + " px" }));
    })), h("div", { class: "fav-tab" }, h("span", { class: "fav-tab-ico" }, draw(32, o)), h("span", { text: o.app }), h("span", { class: "fav-x", html: icon("x") })));
  },
  async run(items, o, ctx) {
    ctx.status("Creating the icon set…"); ctx.progress(-1);
    const it = items[0];
    const sizes = { 16: draw(16, o), 32: draw(32, o), 48: draw(48, o) };
    const pngs = await Promise.all([16, 32, 48].map(async (s) => ({ size: s, png: await png(sizes[s]) })));
    const blob = (b, type) => new Blob([b], { type });
    const outs = [
      { blob: blob(buildIco(pngs), "image/x-icon"), name: "favicon.ico", note: "16, 32, 48 px – desktop browsers" },
      { blob: blob(pngs[0].png, "image/png"), name: "favicon-16x16.png", note: "16×16" },
      { blob: blob(pngs[1].png, "image/png"), name: "favicon-32x32.png", note: "32×32" },
      { blob: await encode(draw(180, o, "#ffffff"), "image/png"), name: "apple-touch-icon.png", note: "180×180 – iPhone, iPad home screen" },
      { blob: await encode(draw(192, o), "image/png"), name: "android-chrome-192x192.png", note: "192×192 – Android" },
      { blob: await encode(draw(512, o), "image/png"), name: "android-chrome-512x512.png", note: "512×512 – Android, web apps" }
    ];
    if (it.svgText && !o.bg && !o.pad) outs.push({ blob: blob(it.svgText, "image/svg+xml"), name: "favicon.svg", note: "SVG – sharp at every size (modern browsers)" });
    const manifest = { name: o.app, short_name: o.app.slice(0, 12), icons: [{ src: "android-chrome-192x192.png", sizes: "192x192", type: "image/png" }, { src: "android-chrome-512x512.png", sizes: "512x512", type: "image/png" }], theme_color: o.theme, background_color: o.theme, display: "standalone" };
    outs.push({ blob: blob(JSON.stringify(manifest, null, 2), "application/manifest+json"), name: "site.webmanifest", note: "icon manifest for Android" });
    const html = [
      it.svgText && !o.bg && !o.pad ? '<link rel="icon" href="/favicon.svg" type="image/svg+xml">' : null,
      '<link rel="icon" href="/favicon.ico" sizes="any">',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/site.webmanifest">',
      `<meta name="theme-color" content="${o.theme}">`
    ].filter(Boolean).join("\n");
    outs[0].extra = h("div", { class: "opt-group fav-html" },
      h("div", { class: "row", style: { alignItems: "center", justifyContent: "space-between" } }, h("b", { text: "Paste into the page's <head>" }),
        h("button", { class: "btn sm", type: "button", onclick: () => copyText(html, "HTML code copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy")),
      h("textarea", { class: "textarea out-text", readonly: true, rows: 7, value: html, "aria-label": "Favicon HTML code" }),
      h("p", { class: "hint", text: "Unzip the .zip file into your site's root folder (next to index.html). If you put it elsewhere, adjust the paths in the code." }));
    return outs;
  },
  zipName: "favicon",
  doneTitle: () => "Your favicon set is ready!",
  summary: () => "Click “Download all (.zip)” to get the whole set."
});

const css = document.createElement("style");
css.textContent = `.fav-prev{margin-top:16px;display:grid;gap:12px}.fav-row{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end}
.fav-row figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}.fav-row canvas{background:repeating-conic-gradient(var(--surface-2) 0 25%,var(--surface) 0 50%) 0 0/10px 10px;border-radius:4px}
.fav-row canvas.px{image-rendering:pixelated}.fav-row figcaption{font-size:12.5px;color:var(--muted)}
.fav-tab{display:inline-flex;align-items:center;gap:8px;max-width:260px;padding:8px 12px;border-radius:10px 10px 0 0;background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line);font-size:13.5px}
.fav-tab-ico canvas{width:16px;height:16px;display:block}.fav-tab span:nth-child(2){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fav-x .i{width:14px;height:14px;color:var(--muted)}
.fav-html{margin-top:16px}`;
document.head.append(css);
