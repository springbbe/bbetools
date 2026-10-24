/* Tự sinh bởi scripts/build.js từ assets/tools/signal-stickers.js và i18n/en/js/ — đừng sửa tay. */
/* Tải sticker Signal: dán link signal.art/addstickers, trình duyệt tải bộ sticker đã mã hoá từ cdn-ca.signal.org
   (máy chủ của Signal cho phép trang web gọi) rồi tự giải mã bằng pack_key trong link (Web Crypto, xem lib/signal.js).
   Khoá không rời khỏi trình duyệt: phần sau dấu # của link không gửi tới máy chủ nào. */
import { h } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseSignalLink, manifestUrl, stickerUrl, packKeys, decrypt, readManifest } from "../lib/signal.js";
import { packFileName } from "../lib/line.js";
import { packView, say, btnIcon, fetchBlob, pool, imageKind, convertImage, nameOf, userErr } from "../sticker.js";

const HOST = "the Signal server (cdn-ca.signal.org)";
// bộ sticker chính thức "Bandit the Cat" của Signal
const SAMPLE = "https://signal.art/addstickers/#pack_id=9acc9e8aba563d26a4994e69263e3b25&pack_key=5a6dff3948c28efb9b7aaf93ecc375c69fc316e78077ed26867a14d10a0f6a12";
const TYPE = { apng: "image/apng", png: "image/png", webp: "image/webp", "webp-anim": "image/webp", gif: "image/gif" };
const TAG = { apng: "APNG", png: "PNG", webp: "WEBP", "webp-anim": "WEBP", gif: "GIF" };

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, current = null;

    const linkIn = h("input", { id: "sg-link", class: "input", type: "text", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://signal.art/addstickers/#pack_id=…&pack_key=…", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fetchPack(); } });
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parseSignalLink(linkIn.value)) fetchPack(); }, 0));
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchPack() }, btnIcon("download"), "Get sticker pack");
    const status = h("div", { "aria-live": "polite" });

    const view = packView({
      id: "sg", store: S, status,
      sizes: [[512, "512 px (original)"], [320, "320 px"], [240, "240 px (light)"], [160, "160 px (very light)"]], size: 320,
      hint: (o) => o.format === "orig"
        ? "Keeps Signal's files as is: WEBP (still or animated) or animated PNG (APNG), reusable in Signal, Telegram, WhatsApp."
        : "Still stickers become full-size PNG; animated stickers become GIF. GIF pixels are either fully transparent or not, so edges may look a bit jagged: pick a White background if you'll paste them on a light background.",
      async exportOne(it, idx, o) {
        const r = await convertImage(it.blob, it.kind, o);
        return [{ blob: r.blob, name: nameOf(idx, view.items().length, r.ext) }];
      },
      zipName: (o) => packFileName("Signal", "", current ? current.title : "") + (o.format === "orig" ? "" : "-png-gif")
    });

    el.append(
      h("div", { class: "stk-form" },
        h("div", { class: "field" }, h("label", { for: "sg-link", text: "Signal sticker pack link" }), linkIn,
          h("small", { text: "In Signal: open the sticker pack → Share → Copy link (like signal.art/addstickers/#pack_id=…&pack_key=…). The link needs both pack_id and pack_key." })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; fetchPack(); } }, "Try a sample pack")),
        h("p", { class: "hint" }, "Find sticker packs on ", h("a", { href: "https://signalstickers.org/", target: "_blank", rel: "noopener", text: "signalstickers.org" }),
          ". Stickers are copyrighted by their creators: use them personally, or with the creator's permission.")),
      status, view.el);

    async function fetchPack() {
      const p = parseSignalLink(linkIn.value);
      if (!p) { say(status, "err", "Link not recognized. A Signal sticker pack link looks like https://signal.art/addstickers/#pack_id=(32 characters)&pack_key=(64 characters)."); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim());
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say(status, "info", "Fetching and decrypting pack info…");
      try {
        const keys = await packKeys(p.key);
        const enc = await fetchBlob(manifestUrl(p.id), ac.signal, { host: HOST, notFound: "This sticker pack wasn't found on Signal's server. Check the link." });
        let m;
        try { m = readManifest(await decrypt(await enc.arrayBuffer(), keys)); }
        catch (_) { throw userErr("Couldn't decrypt the pack: the pack_key in the link doesn't match the pack_id. Copy the whole link again."); }
        const list = m.stickers.map((st) => ({ n: st.id, label: st.emoji || "" }));
        if (!list.length) throw userErr("This pack has no stickers.");
        current = { title: m.title || "Signal " + p.id.slice(0, 8) };
        view.show(current.title, [`${list.length} ${(list.length) == 1 ? "sticker" : "stickers"}`, m.author && "by " + m.author].filter(Boolean).join(" · "), list);
        let done = 0;
        say(status, "info", `Downloading and decrypting 0/${list.length}…`);
        await pool(list, 6, async (it) => {
          try {
            const b = await fetchBlob(stickerUrl(p.id, it.n), ac.signal, { host: HOST });
            const plain = await decrypt(await b.arrayBuffer(), keys);
            const blob0 = new Blob([plain]);
            it.kind = (await imageKind(blob0)) || "webp";
            it.blob = new Blob([plain], { type: TYPE[it.kind] || "image/webp" });
            it.tag = it.kind === "apng" || it.kind === "webp-anim" ? TAG[it.kind] + " animated" : TAG[it.kind];
          } catch (e) { if (e.name === "AbortError") throw e; it.failed = true; }
          view.update(it);
          done++;
          if (abort === ac) say(status, "info", `Downloading and decrypting ${done}/${list.length}…`);
        }, ac.signal);
        if (ac.signal.aborted) return;
        const failed = list.filter((x) => x.failed).length;
        say(status, failed ? "err" : "ok", failed
          ? `Downloaded ${list.length - failed}/${list.length} stickers; ${failed} ${(failed) == 1 ? "sticker" : "stickers"} couldn't be downloaded.`
          : `Downloaded and decrypted all ${list.length} stickers. Choose a format, then click “Download all”, or click individual stickers.`);
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }
  }
});
