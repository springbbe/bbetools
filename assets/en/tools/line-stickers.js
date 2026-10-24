/* Tự sinh bởi scripts/build.js từ assets/tools/line-stickers.js và i18n/en/js/ — đừng sửa tay. */
/* Tải sticker LINE: dán link cửa hàng LINE, trình duyệt tải thẳng từ stickershop.line-scdn.net (máy chủ của LINE
   cho phép trang web gọi, BbeTools không có máy chủ trung gian). Nhận bộ sticker (tĩnh, động APNG, popup, có âm thanh)
   và bộ emoji. Xuất nguyên bản (PNG/APNG + M4A) hoặc PNG + GIF. */
import { h, LANG } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseLineLink, packKind, stickerFiles, emojiFiles, pickTitle, packFileName, stickerMetaUrl, emojiMetaUrl } from "../lib/line.js";
import { packView, say, btnIcon, fetchBlob, pool, imageKind, convertImage, nameOf } from "../sticker.js";

const HOST = "the LINE server";
const SAMPLE = "https://store.line.me/stickershop/product/11537/vi"; // bộ miễn phí chính thức (động)

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, current = null;

    const linkIn = h("input", { id: "ln-link", class: "input", type: "text", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://store.line.me/stickershop/product/…", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fetchPack(); } });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchPack() }, btnIcon("download"), "Get sticker set");
    const status = h("div", { "aria-live": "polite" });
    const soundBox = h("input", { type: "checkbox", checked: S.get("sound", true), onchange: () => S.set("sound", soundBox.checked) });
    const soundField = h("label", { class: "switch", hidden: true }, soundBox, h("span", null, "Include sound (.m4a)", h("small", { text: "GIF can't hold sound, so the audio is a separate file." })));

    const view = packView({
      id: "ln", store: S, status,
      sizes: [[0, "Original size"], [240, "240 px"], [160, "160 px (light)"], [96, "96 px (very light)"]], size: 0,
      extra: soundField,
      hint: (o) => o.format === "orig"
        ? "Animated and pop-up stickers are animated PNG (APNG) files that open in browsers, Telegram, Discord and graphics apps; still stickers are PNG."
        : "Still stickers become PNG; animated and pop-up stickers become GIF. GIF pixels are either fully transparent or not, so edges may look a bit jagged: pick a White background if you'll paste them on a light background.",
      async exportOne(it, idx, o) {
        const total = view.items().length;
        const r = await convertImage(it.blob, it.kind, o);
        const out = [{ blob: r.blob, name: nameOf(idx, total, r.ext) }];
        if (it.sound && soundBox.checked && !soundField.hidden) out.push({ blob: it.sound, name: nameOf(idx, total, "m4a") });
        return out;
      },
      zipName: (o) => packFileName("LINE", current ? current.id : "", current ? current.title : "") + (o.format === "orig" ? "" : "-png-gif")
    });

    el.append(
      h("div", { class: "stk-form" },
        h("div", { class: "field" }, h("label", { for: "ln-link", text: "LINE sticker or emoji set link" }), linkIn,
          h("small", { text: "Open the set on store.line.me and copy the page address, or in the LINE app: sticker set page → Share → Copy link. The set's number works too." })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; fetchPack(); } }, "Try a sample set")),
        h("p", { class: "hint" }, "Find sets in the ", h("a", { href: "https://store.line.me/stickershop/home/general/en", target: "_blank", rel: "noopener", text: "LINE Store" }),
          ". Stickers are copyrighted by their creators: use them personally, or with the creator's permission.")),
      status, view.el);

    async function getJson(url, signal, notFound) {
      const b = await fetchBlob(url, signal, { host: HOST, notFound });
      try { return JSON.parse(await b.text()); } catch (_) { const e = new Error(notFound); e.userMsg = notFound; throw e; }
    }

    /** Tải các file của một phần tử; ảnh động lỗi thì lùi về ảnh tĩnh */
    async function load(it, signal) {
      try {
        let blob = null;
        if (it.files.anim) blob = await fetchBlob(it.files.anim, signal, { host: HOST }).catch((e) => { if (e.name === "AbortError") throw e; return null; });
        if (!blob) blob = await fetchBlob(it.files.still, signal, { host: HOST });
        it.kind = await imageKind(blob);
        if (it.files.sound) it.sound = await fetchBlob(it.files.sound, signal, { host: HOST }).catch((e) => { if (e.name === "AbortError") throw e; return null; });
        it.tag = it.kind === "apng" ? (it.popup ? "POPUP" : "APNG") : "PNG";
        it.blob = blob;
      } catch (e) { if (e.name === "AbortError") throw e; it.failed = true; }
      view.update(it);
    }

    async function fetchPack() {
      const p = parseLineLink(linkIn.value);
      if (!p) { say(status, "err", "Link not recognized. Paste a link like https://store.line.me/stickershop/product/12345 (stickers) or …/emojishop/product/… (emoji)."); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim());
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say(status, "info", "Getting set info…");
      try {
        let title, info, list, note = "";
        if (p.type === "sticker") {
          const meta = await getJson(stickerMetaUrl(p.id), ac.signal, "Sticker set not found. Check the link or set number (sets no longer on sale may have no files).");
          const kind = packKind(meta);
          title = pickTitle(meta.title, LANG) || "LINE sticker set " + p.id;
          list = (meta.stickers || []).map((st) => ({ files: stickerFiles(st.id, kind), popup: kind.anim === "popup", label: "" }));
          info = [`${list.length} ${(list.length) == 1 ? "sticker" : "stickers"}`, kind.anim === "popup" ? "animated pop-up" : kind.anim ? "animated" : "still", kind.sound && "with sound", pickTitle(meta.author, LANG) && "by " + pickTitle(meta.author, LANG)].filter(Boolean).join(" · ");
          soundField.hidden = !kind.sound;
          if (kind.text) note = "Custom text stickers: downloads are the base images, without the text you type in LINE.";
          if (kind.anim === "popup") note = "Pop-up stickers: downloads are the full-screen animation shown when sent in LINE.";
        } else {
          const meta = await getJson(emojiMetaUrl(p.id), ac.signal, "Emoji set not found. Check the link (like store.line.me/emojishop/product/…).");
          const animated = String(meta.sticonResourceType || "").toUpperCase() === "ANIMATION";
          const alt = meta.altTexts || {};
          title = "LINE emoji set";
          list = (meta.orders || []).map((o) => ({ files: emojiFiles(p.id, o, animated), label: alt[o] || "" }));
          info = [`${list.length} emoji`, animated ? "animated" : "still"].join(" · ");
          soundField.hidden = true;
        }
        if (!list.length) throw Object.assign(new Error(), { userMsg: "This set has no stickers to download." });
        current = { id: p.id, title, type: p.type };
        view.show(title, info, list, note);
        let done = 0;
        say(status, "info", `Downloading 0/${list.length}…`);
        await pool(list, 6, async (it) => {
          await load(it, ac.signal);
          done++;
          if (abort === ac) say(status, "info", `Downloading ${done}/${list.length}…`);
        }, ac.signal);
        if (ac.signal.aborted) return;
        const failed = list.filter((x) => x.failed).length;
        say(status, failed ? "err" : "ok", failed
          ? `Downloaded ${list.length - failed}/${list.length}; ${failed} ${(failed) == 1 ? "file" : "files"} couldn't be downloaded.`
          : `Downloaded all ${list.length}. Choose a format, then click “Download all”, or click individual ones.`);
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }

    // dán link xong là tải luôn
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parseLineLink(linkIn.value)) fetchPack(); }, 0));
  }
});
