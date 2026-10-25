/* Tự sinh bởi scripts/build.js từ assets/tools/discord-emoji.js và i18n/en/js/ — đừng sửa tay. */
/* Tải emoji, sticker Discord: dán link hoặc mã (<:ten:id>), trình duyệt tải thẳng từ cdn.discordapp.com và
   media.discordapp.net (máy chủ của Discord cho phép trang web gọi, BbeTools không có máy chủ trung gian), cỡ lớn nhất.
   Emoji của một server chỉ liệt kê được khi đăng nhập nên chỉ nhận từng cái theo link; 14 bộ sticker chính thức của Discord
   thì lấy được cả bộ qua discord.com/api/v10/sticker-packs (không cần đăng nhập). Sticker Lottie đổi sang GIF bằng lottie-web. */
import { h } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseDiscord, emojiUrl, stickerUrl, stickerGuesses, readPacks, safeName, PACKS_URL } from "../lib/discord.js";
import { packFileName } from "../lib/line.js";
import { isAnimatedKind, fitSize } from "../lib/anim.js";
import { packView, say, btnIcon, fetchBlob, pool, imageKind, convertImage, animToGif, lottieData, lottieOn, lottieToGif, canvasOf, paint, toBlob, userErr } from "../sticker.js";

const HOST = "Discord's server";
// emoji động "idk" và hai sticker chính thức (Cheerful Choco: APNG, Wumpus Beyond: Lottie)
const SAMPLE = "<a:idk:1512891956789776404>\nhttps://media.discordapp.net/stickers/781323769960202280.png\nhttps://cdn.discordapp.com/stickers/749044136589393960.json";
const STICKER_TAG = { png: "PNG", apng: "APNG", lottie: "LOTTIE", gif: "GIF" };

const css = document.createElement("style");
css.textContent = `
.dc-pane{display:flex;flex-direction:column;gap:14px;margin-top:16px}
.dc-pane .btn{white-space:normal;text-align:center}
.dc-packs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.dc-pack{display:flex;flex-direction:column;gap:6px;padding:0 0 8px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;overflow:hidden;text-align:left}
.dc-pack:hover,.dc-pack:focus-visible,.dc-pack[aria-pressed="true"]{border-color:var(--brand)}
.dc-pack[aria-pressed="true"]{box-shadow:0 0 0 1px var(--brand)}
.dc-pack img{width:100%;aspect-ratio:2/1;object-fit:cover;background:var(--surface-2)}
.dc-pack b,.dc-pack small{padding:0 10px}
.dc-pack small{color:var(--muted);font-size:12px}
.dc-help{border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:var(--surface)}
.dc-help summary{cursor:pointer;font-weight:600}
.dc-help ul{margin:8px 0 2px;padding-left:20px;display:flex;flex-direction:column;gap:4px}
`;
document.head.append(css);

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, current = null, packs = null;

    /* --- chọn nguồn --- */
    const tabs = h("div", { class: "seg full", role: "radiogroup", "aria-label": "Source" },
      [["link", "From links, emoji codes"], ["packs", "Official sticker packs"]].map(([v, l]) => h("label", null,
        h("input", { type: "radio", name: "dc-src", value: v, checked: v === "link", onchange: () => showPane(v) }), h("span", { text: l }))));

    const textIn = h("textarea", { id: "dc-text", class: "textarea", rows: 4, autocomplete: "off", spellcheck: "false", placeholder: "<:ten_emoji:123456789012345678>\nhttps://cdn.discordapp.com/emojis/…" });
    textIn.value = S.get("text", "");
    textIn.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fetchLinks(); } });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchLinks() }, btnIcon("download"), "Get emoji, stickers");
    const paneLink = h("div", { class: "dc-pane" },
      h("div", { class: "field" }, h("label", { for: "dc-text", text: "Discord emoji, sticker links or codes" }), textIn,
        h("small", { text: "You can paste several at once, one per line." })),
      h("details", { class: "dc-help" }, h("summary", { text: "How to get emoji, sticker links" }),
        h("ul", null,
          h("li", { text: "Discord on desktop or in a browser: right-click an emoji or sticker in a message → Copy Link." }),
          h("li", { html: "Or type a backslash before the emoji and send it, e.g. <code>\\:emoji_name:</code>: Discord shows a code like <code>&lt;:emoji_name:123…&gt;</code>; copy that code." }),
          h("li", { text: "On a phone: press and hold the emoji → open its info; if there is no copy button, use Discord in a browser." }))),
      h("div", { class: "row" }, getBtn,
        h("button", { class: "btn ghost", type: "button", onclick: () => { textIn.value = SAMPLE; fetchLinks(); } }, "Try a sample")));

    const packGrid = h("div", { class: "dc-packs", role: "group", "aria-label": "Sticker packs" });
    const panePacks = h("div", { class: "dc-pane", hidden: true },
      h("p", { class: "hint", text: "Sticker packs released by Discord (Wumpus, Clyde, Choco…). Pick one to view and download the whole pack." }),
      packGrid);

    const status = h("div", { "aria-live": "polite" });
    const view = packView({
      id: "dc", store: S, status, word: "sticker", sizeAll: true, sizeLabel: "Size (long side)",
      sizes: [[0, "Original size (largest)"], [160, "160 px"], [128, "128 px"], [96, "96 px"], [48, "48 px"]], size: 0,
      hint: (o) => o.format === "orig"
        ? "Emoji download as WEBP (animation kept, lossless); stickers keep Discord's original file: PNG, animated PNG (APNG), GIF or Lottie (.json, for developers)."
        : "Still emoji and stickers become PNG; animated ones (APNG, Lottie) become GIF. GIF pixels are either fully transparent or not, so edges can look jagged: pick a White or Black background to match where you paste.",
      preview: (it, pv) => {
        if (it.kind !== "lottie") return false;
        lottieStill(it, pv);
        return true;
      },
      exportOne,
      zipName: (o) => (current && current.pack ? packFileName("Discord", "", current.title) : "Discord-emoji-sticker") + (o.format === "orig" ? "" : "-png-gif")
    });

    el.append(tabs, paneLink, panePacks, status, view.el);

    function showPane(v) {
      paneLink.hidden = v !== "link"; panePacks.hidden = v !== "packs";
      if (v === "packs") loadPacks();
    }

    /** Sticker Lottie: vẽ một khung tĩnh làm ảnh xem trước (không chạy hoạt ảnh cho đỡ tốn máy) */
    async function lottieStill(it, pv) {
      try {
        const data = it.data || (it.data = await lottieData(it.blob));
        const c = canvasOf(160, 160);
        const anim = await lottieOn(c, data, false);
        anim.goToAndStop(Math.floor(anim.totalFrames / 2), true);
        anim.destroy();
        c.setAttribute("role", "img"); c.setAttribute("aria-label", it.label || "Sticker");
        pv.textContent = ""; pv.append(c);
      } catch (e) { pv.textContent = "LOTTIE"; }
    }

    /* --- tải từng phần tử --- */
    async function loadEmoji(it, signal) {
      // mã sai: Discord trả 404 không kèm CORS nên trình duyệt chỉ thấy "lỗi mạng", không phân biệt được với mất mạng
      let blob;
      try { blob = await fetchBlob(emojiUrl(it.id, "webp", 4096, true), signal, { host: HOST, retries: it.type === "any" ? 0 : 1 }); }
      catch (e) { if (e.name === "AbortError") throw e; throw userErr("Couldn't download the emoji: wrong ID, the emoji was deleted, or the network is down."); }
      it.kind = await imageKind(blob);
      it.animated = isAnimatedKind(it.kind);
      it.type = "emoji"; it.tag = it.animated ? "ANIMATED EMOJI" : "EMOJI";
      it.blob = blob;
    }
    async function loadSticker(it, signal) {
      // đang dò loại (chỉ có mã): Discord trả 404 không kèm CORS, trình duyệt báo lỗi mạng → đừng thử lại
      const guessing = !it.kinds;
      for (const kind of it.kinds || stickerGuesses(it.ext)) {
        let blob;
        try { blob = await fetchBlob(stickerUrl(it.id, kind), signal, { host: HOST, retries: guessing ? 0 : 2 }); }
        catch (e) { if (e.name === "AbortError") throw e; continue; }
        if (kind === "lottie") { it.data = await lottieData(blob); it.kind = "lottie"; }
        else { const k = await imageKind(blob); if (!k) continue; it.kind = k === "apng" ? "apng" : k === "gif" ? "gif" : "png"; }
        it.type = "sticker"; it.tag = STICKER_TAG[it.kind]; it.blob = blob;
        return;
      }
      throw userErr("No sticker found with this ID.");
    }
    async function load(it, signal) {
      try {
        if (it.type === "emoji") await loadEmoji(it, signal);
        else if (it.type === "sticker") await loadSticker(it, signal);
        else {
          try { await loadEmoji(it, signal); } catch (e) { if (e.name === "AbortError") throw e; await loadSticker(it, signal); }
        }
      } catch (e) { if (e.name === "AbortError") throw e; it.failed = true; it.err = e.userMsg; }
      view.update(it);
    }

    /* --- xuất file --- */
    function baseOf(it, idx) {
      const n = safeName(it.name);
      if (current && current.pack) return String(idx + 1).padStart(2, "0") + (n ? "-" + n : "");
      return n || (it.type === "emoji" ? "emoji-" : "sticker-") + it.id;
    }
    async function exportOne(it, idx, o) {
      const base = baseOf(it, idx);
      if (it.type === "emoji") {
        if (o.format === "orig") {
          const blob = o.size ? await fetchBlob(emojiUrl(it.id, "webp", o.size, it.animated), null, { host: HOST }) : it.blob;
          return [{ blob, name: base + ".webp" }];
        }
        // GIF, PNG do Discord làm sẵn (nhanh, chạy cả trên Safari); có nền thì tự đổi từ WEBP
        if (!o.bg) return [{ blob: await fetchBlob(emojiUrl(it.id, it.animated ? "gif" : "png", o.size || 4096), null, { host: HOST }), name: base + (it.animated ? ".gif" : ".png") }];
        const r = await convertImage(it.blob, it.kind, o);
        return [{ blob: r.blob, name: base + "." + r.ext }];
      }
      if (o.format === "orig") return [{ blob: it.blob, name: base + (it.kind === "lottie" ? ".json" : it.kind === "gif" ? ".gif" : ".png") }];
      if (it.kind === "lottie") return [{ blob: await lottieToGif(it.data, { size: o.size || (it.data.w || 320), bg: o.bg }), name: base + ".gif" }];
      if (it.kind === "apng" || (it.kind === "gif" && (o.size || o.bg))) return [{ blob: await animToGif(it.blob, o, it.kind), name: base + ".gif" }];
      if (it.kind === "gif") return [{ blob: it.blob, name: base + ".gif" }];
      return [{ blob: o.size || o.bg ? await resizedPng(it.blob, o) : it.blob, name: base + ".png" }];
    }
    /** Ảnh tĩnh → PNG thu nhỏ theo cạnh dài, nền tuỳ chọn */
    async function resizedPng(blob, o) {
      const bmp = await createImageBitmap(blob);
      const { w, h: hh } = fitSize(bmp.width, bmp.height, o.size);
      const c = canvasOf(w, hh);
      paint(c, bmp, o.bg);
      bmp.close && bmp.close();
      return toBlob(c, "image/png");
    }

    /* --- chạy --- */
    async function run(list, title, info, note, ac) {
      view.show(title, info, list, note);
      let done = 0;
      say(status, "info", `Downloading 0/${list.length}…`);
      await pool(list, 6, async (it) => {
        await load(it, ac.signal);
        done++;
        if (abort === ac) say(status, "info", `Downloading ${done}/${list.length}…`);
      }, ac.signal);
      if (ac.signal.aborted) return;
      const failed = list.filter((x) => x.failed);
      say(status, failed.length ? "err" : "ok", failed.length
        ? (failed.length === list.length && failed[0].err ? failed[0].err + " " : "") + `Downloaded ${list.length - failed.length}/${list.length}; ${failed.length} ${(failed.length) == 1 ? "ID" : "IDs"} failed (wrong ID, or the emoji or sticker was deleted).`
        : `Downloaded ${list.length} ${(list.length) == 1 ? "file" : "files"}. Pick a format and click “Download all”, or click each one.`);
    }
    function start() {
      if (abort) abort.abort();
      return (abort = new AbortController());
    }
    const finish = (ac) => { if (abort === ac) abort = null; };

    async function fetchLinks() {
      const found = parseDiscord(textIn.value);
      if (!found.length) { say(status, "err", "No emoji or stickers found. Paste a link like https://cdn.discordapp.com/emojis/… or a code like <:name:123…>."); textIn.focus(); return; }
      S.set("text", textIn.value.trim().slice(0, 4000));
      const ac = start();
      getBtn.disabled = true;
      packGrid.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      current = { pack: false };
      try {
        const list = found.map((f) => ({ ...f, label: f.name || "" }));
        const ne = list.filter((x) => x.type === "emoji").length, ns = list.filter((x) => x.type === "sticker").length;
        await run(list, "Discord emoji, stickers", [ne && `${ne} emoji`, ns && `${ns} ${(ns) == 1 ? "sticker" : "stickers"}`, list.length - ne - ns && `${list.length - ne - ns} ${(list.length - ne - ns) == 1 ? "ID" : "IDs"}`].filter(Boolean).join(" · "), "", ac);
      } catch (e) { if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); } }
      finally { getBtn.disabled = false; finish(ac); }
    }

    async function loadPacks() {
      if (packs) return;
      packs = [];
      packGrid.textContent = "";
      packGrid.append(h("span", { class: "spinner" }));
      try {
        const b = await fetchBlob(PACKS_URL, null, { host: HOST });
        packs = readPacks(JSON.parse(await b.text()));
        if (!packs.length) throw userErr("Discord returned no sticker packs.");
        packGrid.textContent = "";
        for (const p of packs) {
          packGrid.append(h("button", { class: "dc-pack", type: "button", "aria-pressed": "false", title: p.desc, onclick: (e) => openPack(p, e.currentTarget) },
            p.banner ? h("img", { src: p.banner, alt: "", loading: "lazy" }) : null,
            h("b", { text: p.name }), h("small", { text: `${p.stickers.length} ${(p.stickers.length) == 1 ? "sticker" : "stickers"}` })));
        }
      } catch (e) {
        packs = null; packGrid.textContent = "";
        say(status, "err", e.userMsg || "Couldn't get the list of sticker packs.");
        packGrid.append(h("button", { class: "btn", type: "button", onclick: () => loadPacks() }, "Try again"));
      }
    }
    async function openPack(p, btn) {
      packGrid.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const ac = start();
      current = { pack: true, title: p.name };
      try {
        const list = p.stickers.map((st) => ({ type: "sticker", id: st.id, name: st.name, label: st.name, kinds: [st.kind === "apng" ? "png" : st.kind] }));
        const lot = p.stickers.filter((s) => s.kind === "lottie").length;
        await run(list, p.name, [`${list.length} ${(list.length) == 1 ? "sticker" : "stickers"}`, lot === list.length ? "Lottie" : lot ? "APNG, Lottie" : "animated PNG (APNG)"].join(" · "), p.desc, ac);
        view.el.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) { if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); } }
      finally { finish(ac); }
    }

    // dán xong là tải luôn
    textIn.addEventListener("paste", () => setTimeout(() => { if (parseDiscord(textIn.value).length) fetchLinks(); }, 0));
  }
});
