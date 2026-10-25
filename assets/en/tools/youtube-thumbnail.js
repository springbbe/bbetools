/* Tự sinh bởi scripts/build.js từ assets/tools/youtube-thumbnail.js và i18n/en/js/ — đừng sửa tay. */
/* Tải ảnh thumbnail YouTube: dán link video (watch, youtu.be, Shorts, embed, live), trình duyệt tải thẳng các cỡ ảnh từ
   i.ytimg.com (máy chủ ảnh của YouTube cho phép trang web gọi), tên video lấy qua oEmbed của YouTube. Cỡ không có
   (vd. video cũ không có HD) bị bỏ qua. Ảnh 4:3 (SD, HQ) của video 16:9 có viền đen: tự tìm và cắt bỏ (lib/youtube.js).
   Không tải video: YouTube không cho trang web làm việc đó và trái điều khoản của YouTube. */
import { h, icon, toast, save, zip, copyImage, registry, sendTo, fmtSize } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseMany, SIZES, FRAMES, thumbUrl, watchUrl, oembedUrl, letterbox, thumbName } from "../lib/youtube.js";
import { say, btnIcon, pool, canvasOf, toBlob, userErr } from "../sticker.js";

const SAMPLE = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // "Me at the zoo", video đầu tiên trên YouTube
const FMT = { jpg: ["image/jpeg", "jpg"], png: ["image/png", "png"], webp: ["image/webp", "webp"] };

const css = document.createElement("style");
css.textContent = `
.yt-form{display:flex;flex-direction:column;gap:14px}
.yt-form .btn{white-space:normal;text-align:center}
.yt-opts{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));align-items:end}
.yt-res{margin-top:20px;display:flex;flex-direction:column;gap:22px}
.yt-video{display:flex;flex-direction:column;gap:12px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.yt-video h2{margin:0;font-size:18px;overflow-wrap:anywhere}
.yt-video h2 a{color:inherit}
.yt-main{display:block;width:100%;max-width:720px;aspect-ratio:16/9;object-fit:contain;border-radius:12px;background:var(--surface-2)}
.yt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:10px}
.yt-card{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font:inherit;cursor:pointer;text-align:left}
.yt-card:hover,.yt-card:focus-visible{border-color:var(--brand)}
.yt-card img{width:100%;aspect-ratio:16/9;object-fit:contain;border-radius:8px;background:var(--surface-2)}
.yt-card b{font-size:14px}
.yt-card small{color:var(--muted);font-size:12px;line-height:1.3}
.yt-sub{margin:4px 0 0;font-size:15px}
`;
document.head.append(css);

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, videos = [];

    const linkIn = h("textarea", { id: "yt-link", class: "textarea", rows: 2, autocomplete: "off", spellcheck: "false", placeholder: "https://www.youtube.com/watch?v=…" });
    linkIn.value = S.get("link", "");
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fetchAll(); } });
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parseMany(linkIn.value).length) fetchAll(); }, 0));
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchAll() }, btnIcon("image-down"), "Get thumbnails");

    const fmtSeg = h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": "yt-fmt-l" }, [["jpg", "JPG (original)"], ["png", "PNG"], ["webp", "WEBP"]].map(([v, l]) =>
      h("label", null, h("input", { type: "radio", name: "yt-fmt", value: v, checked: v === S.get("format", "jpg"), onchange: () => { S.set("format", v); refreshLabels(); } }), h("span", { text: l }))));
    const cropBox = h("input", { type: "checkbox", checked: S.get("crop", true), onchange: () => { S.set("crop", cropBox.checked); refreshLabels(); } });
    const status = h("div", { "aria-live": "polite" });
    const zipBtn = h("button", { class: "btn", type: "button", hidden: true, onclick: () => saveAllBest() }, btnIcon("file-archive"), h("span", { text: "Download the largest image of every video (.zip)" }));
    const res = h("section", { class: "yt-res", "aria-label": "Thumbnail" });

    el.append(
      h("div", { class: "yt-form" },
        h("div", { class: "field" }, h("label", { for: "yt-link", text: "YouTube video link" }), linkIn,
          h("small", { text: "Video, Shorts, live or youtu.be links all work. Paste several links (one per line) to get many videos at once." })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; fetchAll(); } }, "Try a sample video")),
        h("div", { class: "yt-opts" },
          h("div", { class: "field" }, h("span", { id: "yt-fmt-l", text: "Download as" }), fmtSeg),
          h("label", { class: "switch" }, cropBox, h("span", null, "Remove black bars", h("small", { text: "SD and HQ images are 4:3, so 16:9 videos get black bars at the top and bottom: crop them when downloading." })))),
        h("p", { class: "hint", text: "Thumbnails are copyrighted by the channel owner: use them for reference, personal material, or with the owner's permission." })),
      status, zipBtn, res);

    const opts = () => ({ format: fmtSeg.querySelector("input:checked").value, crop: cropBox.checked });

    /* --- tải ảnh --- */
    async function tryFetch(url, signal) {
      let r;
      try { r = await fetch(url, { credentials: "omit", signal }); }
      catch (e) { if (e.name === "AbortError") throw e; throw userErr("Couldn't connect to YouTube's image server (i.ytimg.com). Check your connection and try again."); }
      return r.ok ? r.blob() : null; // 404: cỡ này không có (YouTube trả ảnh xám 120×90)
    }
    /** Thử lần lượt các tên file, lấy file đầu tiên có thật → { blob, w, h, crop } */
    async function firstOf(id, names, signal) {
      for (const name of names) {
        const blob = await tryFetch(thumbUrl(id, name), signal);
        if (!blob) continue;
        const bmp = await createImageBitmap(blob).catch(() => null);
        if (!bmp) continue;
        const shot = { blob, w: bmp.width, h: bmp.height, file: name, crop: null };
        if (Math.abs(bmp.width / bmp.height - 4 / 3) < 0.02) {
          const c = canvasOf(bmp.width, bmp.height), x = c.getContext("2d", { willReadFrequently: true });
          x.drawImage(bmp, 0, 0);
          shot.crop = letterbox(x.getImageData(0, 0, bmp.width, bmp.height).data, bmp.width, bmp.height);
        }
        bmp.close && bmp.close();
        return shot;
      }
      return null;
    }
    async function title(id, signal) {
      try {
        const r = await fetch(oembedUrl(id), { credentials: "omit", signal });
        if (!r.ok) return { status: r.status };
        const j = await r.json();
        return { title: j.title || "", author: j.author_name || "" };
      } catch (e) { if (e.name === "AbortError") throw e; return {}; }
    }

    /* --- xuất file --- */
    async function exportShot(v, shot, label) {
      const o = opts();
      const crop = o.crop ? shot.crop : null;
      if (o.format === "jpg" && !crop) return { blob: shot.blob, name: thumbName(v.title, v.id, label, "jpg") };
      const bmp = await createImageBitmap(shot.blob);
      const r = crop || { x: 0, y: 0, w: bmp.width, h: bmp.height };
      const c = canvasOf(r.w, r.h);
      c.getContext("2d").drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      bmp.close && bmp.close();
      const [type, ext] = FMT[o.format];
      const blob = await toBlob(c, type, 0.92);
      // Safari cũ không xuất được WEBP: trình duyệt trả PNG
      const realExt = blob.type === type ? ext : blob.type === "image/png" ? "png" : ext;
      return { blob, name: thumbName(v.title, v.id, label, realExt) };
    }
    const outSize = (shot) => { const c = opts().crop && shot.crop; return c ? `${c.w}×${c.h}` : `${shot.w}×${shot.h}`; };

    async function saveShot(v, shot, label) {
      try { const f = await exportShot(v, shot, label); save(f.blob, f.name); }
      catch (e) { toast(e.userMsg || "Couldn't download this image.", { type: "err" }); console.error(e); }
    }
    async function saveAllBest() {
      const list = videos.filter((v) => v.best);
      if (!list.length) return;
      zipBtn.disabled = true;
      try {
        const files = [];
        for (const v of list) files.push(await exportShot(v, v.best.shot, v.best.label));
        const z = await zip(files);
        save(z, "thumbnail-youtube.zip");
        say(status, "ok", `Created a .zip with ${files.length} ${(files.length) == 1 ? "image" : "images"} (${fmtSize(z.size)}).`);
      } catch (e) { say(status, "err", e.userMsg || "Couldn't create the .zip file."); console.error(e); }
      finally { zipBtn.disabled = false; }
    }

    /* --- giao diện một video --- */
    function card(v, shot, label, sub) {
      const url = URL.createObjectURL(shot.blob);
      v.urls.push(url);
      const size = h("small");
      const b = h("button", { class: "yt-card", type: "button", "aria-label": `Download ${label} image`, onclick: () => saveShot(v, shot, label) },
        h("img", { src: url, alt: "", loading: "lazy" }), h("b", { text: label }), size);
      b._refresh = () => { size.textContent = `${outSize(shot)} · ${sub}${opts().crop && shot.crop ? " · black bars removed" : ""}`; };
      b._refresh();
      return b;
    }
    function render(v) {
      const box = h("article", { class: "yt-video" });
      const t = v.title || "Video " + v.id;
      box.append(h("div", null, h("h2", null, h("a", { href: watchUrl(v.id), target: "_blank", rel: "noopener", text: t })),
        v.author ? h("p", { class: "hint", text: v.author }) : null));
      if (!v.best) {
        box.append(h("p", { class: "alert err", html: icon("triangle-alert") + "<span></span>" }));
        box.querySelector(".alert span").textContent = "No thumbnail found: wrong video ID, or the video is private or deleted.";
        return box;
      }
      const main = URL.createObjectURL(v.best.shot.blob);
      v.urls.push(main);
      const bestLbl = h("span");
      const refreshBest = () => { bestLbl.textContent = `Download largest image (${outSize(v.best.shot)})`; };
      refreshBest();
      box.append(
        h("img", { class: "yt-main", src: main, alt: "Thumbnail of " + t }),
        h("div", { class: "row" },
          h("button", { class: "btn", type: "button", onclick: () => saveShot(v, v.best.shot, v.best.label) }, btnIcon("download"), bestLbl),
          h("button", { class: "btn ghost", type: "button", onclick: async () => { const f = await exportShot(v, v.best.shot, v.best.label); copyImage(f.blob); } }, btnIcon("copy"), "Copy image"),
          h("button", { class: "btn ghost", type: "button", onclick: () => toCrop(v) }, btnIcon("crop"), "Crop image")));
      const grid = h("div", { class: "yt-grid" });
      for (const s of v.sizes) grid.append(card(v, s.shot, s.label, s.sub));
      box.append(h("h3", { class: "yt-sub", text: "All sizes" }), grid);
      if (v.frames.length) {
        const fg = h("div", { class: "yt-grid" });
        for (const f of v.frames) fg.append(card(v, f.shot, f.label, f.sub));
        box.append(h("h3", { class: "yt-sub", text: "Frames YouTube captured from the video" }),
          h("p", { class: "hint", text: "Three frames YouTube takes automatically at about 1/4, 1/2 and 3/4 of the video (not the cover chosen by the owner)." }), fg);
      }
      v.refresh = () => { refreshBest(); box.querySelectorAll(".yt-card").forEach((c) => c._refresh()); };
      return box;
    }
    function refreshLabels() { for (const v of videos) if (v.refresh) v.refresh(); }
    async function toCrop(v) {
      const reg = await registry();
      const t = reg.tools.find((x) => x.id === "crop-image");
      const f = await exportShot(v, v.best.shot, v.best.label);
      if (t) sendTo(t, [new File([f.blob], f.name, { type: f.blob.type })]);
    }

    async function loadVideo(id, signal) {
      const v = { id, urls: [], sizes: [], frames: [] };
      const [meta, shots, frames] = await Promise.all([
        title(id, signal),
        Promise.all(SIZES.map((s) => firstOf(id, s.try, signal))),
        Promise.all(FRAMES.map((f) => firstOf(id, f.try.map((x) => x[0]), signal)))
      ]);
      Object.assign(v, meta);
      SIZES.forEach((s, i) => { if (shots[i]) v.sizes.push({ shot: shots[i], label: s.label, sub: s.key === "hd" ? "sharpest" : s.key === "default" ? "very small" : "" + (s.w / s.h > 1.5 ? "16:9" : "4:3") }); });
      FRAMES.forEach((f, i) => { if (frames[i]) v.frames.push({ shot: frames[i], label: "Frame " + f.n, sub: frames[i].file }); });
      // ảnh lớn nhất: so theo cỡ sau khi bỏ viền
      const area = (s) => { const c = s.shot.crop; return c ? c.w * c.h * 0.999 : s.shot.w * s.shot.h; };
      v.best = v.sizes.slice().sort((a, b) => area(b) - area(a))[0] || null;
      return v;
    }

    async function fetchAll() {
      const ids = parseMany(linkIn.value);
      if (!ids.length) { say(status, "err", "Link not recognized. Paste a link like https://www.youtube.com/watch?v=… or https://youtu.be/…"); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim().slice(0, 4000));
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      for (const v of videos) v.urls.forEach((u) => URL.revokeObjectURL(u));
      videos = []; res.textContent = ""; zipBtn.hidden = true;
      say(status, "info", ids.length > 1 ? `Getting thumbnails 0/${ids.length} videos…` : "Getting thumbnails…");
      try {
        const slots = ids.map(() => { const s = h("div"); res.append(s); return s; });
        let done = 0;
        await pool(ids.map((id, i) => ({ id, i })), 4, async ({ id, i }) => {
          const v = await loadVideo(id, ac.signal);
          if (ac.signal.aborted) return;
          videos[i] = v;
          slots[i].replaceWith(render(v));
          done++;
          if (ids.length > 1) say(status, "info", `Getting thumbnails ${done}/${ids.length} videos…`);
        }, ac.signal);
        if (ac.signal.aborted) return;
        videos = videos.filter(Boolean);
        const ok = videos.filter((v) => v.best).length;
        zipBtn.hidden = ok < 2;
        say(status, ok ? "ok" : "err", !ok ? "No thumbnails found." : ids.length > 1 ? `Got thumbnails for ${ok}/${ids.length} videos.` : "Click an image to download it.");
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }
  }
});
