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

const HOST = "máy chủ Discord";
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
    const tabs = h("div", { class: "seg full", role: "radiogroup", "aria-label": "Nguồn" },
      [["link", "Từ link, mã emoji"], ["packs", "Bộ sticker chính thức"]].map(([v, l]) => h("label", null,
        h("input", { type: "radio", name: "dc-src", value: v, checked: v === "link", onchange: () => showPane(v) }), h("span", { text: l }))));

    const textIn = h("textarea", { id: "dc-text", class: "textarea", rows: 4, autocomplete: "off", spellcheck: "false", placeholder: "<:ten_emoji:123456789012345678>\nhttps://cdn.discordapp.com/emojis/…" });
    textIn.value = S.get("text", "");
    textIn.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fetchLinks(); } });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchLinks() }, btnIcon("download"), "Lấy emoji, sticker");
    const paneLink = h("div", { class: "dc-pane" },
      h("div", { class: "field" }, h("label", { for: "dc-text", text: "Link hoặc mã emoji, sticker Discord" }), textIn,
        h("small", { text: "Dán được nhiều cái cùng lúc, mỗi cái một dòng." })),
      h("details", { class: "dc-help" }, h("summary", { text: "Cách lấy link emoji, sticker" }),
        h("ul", null,
          h("li", { text: "Discord trên máy tính hoặc trình duyệt: chuột phải vào emoji, sticker trong tin nhắn → Sao chép liên kết (Copy Link)." }),
          h("li", { html: "Hoặc gõ dấu gạch chéo ngược trước emoji rồi gửi, vd. <code>\\:ten_emoji:</code>: Discord hiện mã dạng <code>&lt;:ten_emoji:123…&gt;</code>, sao chép mã đó." }),
          h("li", { text: "Trên điện thoại: giữ vào emoji → mở trang thông tin emoji; nếu không có nút sao chép, hãy dùng Discord trên trình duyệt." }))),
      h("div", { class: "row" }, getBtn,
        h("button", { class: "btn ghost", type: "button", onclick: () => { textIn.value = SAMPLE; fetchLinks(); } }, "Thử với mẫu")));

    const packGrid = h("div", { class: "dc-packs", role: "group", "aria-label": "Các bộ sticker" });
    const panePacks = h("div", { class: "dc-pane", hidden: true },
      h("p", { class: "hint", text: "Các bộ sticker do Discord phát hành (Wumpus, Clyde, Choco…). Chọn một bộ để xem và tải cả bộ." }),
      packGrid);

    const status = h("div", { "aria-live": "polite" });
    const view = packView({
      id: "dc", store: S, status, word: "sticker", sizeAll: true, sizeLabel: "Cỡ (cạnh dài)",
      sizes: [[0, "Cỡ gốc (lớn nhất)"], [160, "160 px"], [128, "128 px"], [96, "96 px"], [48, "48 px"]], size: 0,
      hint: (o) => o.format === "orig"
        ? "Emoji tải dạng WEBP (giữ ảnh động, không mất chất lượng); sticker giữ file gốc của Discord: PNG, PNG động (APNG), GIF hoặc Lottie (.json, dành cho lập trình viên)."
        : "Emoji tĩnh, sticker tĩnh thành PNG; emoji động, sticker động (APNG, Lottie) thành GIF. GIF chỉ có trong suốt hoàn toàn hoặc không, nên viền có thể hơi răng cưa: chọn nền Trắng hoặc Đen cho khớp nơi dán.",
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
      catch (e) { if (e.name === "AbortError") throw e; throw userErr("Không tải được emoji: mã sai, emoji đã bị xoá, hoặc mạng đang lỗi."); }
      it.kind = await imageKind(blob);
      it.animated = isAnimatedKind(it.kind);
      it.type = "emoji"; it.tag = it.animated ? "EMOJI ĐỘNG" : "EMOJI";
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
      throw userErr("Không tìm thấy sticker với mã này.");
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
      say(status, "info", `Đang tải 0/${list.length}…`);
      await pool(list, 6, async (it) => {
        await load(it, ac.signal);
        done++;
        if (abort === ac) say(status, "info", `Đang tải ${done}/${list.length}…`);
      }, ac.signal);
      if (ac.signal.aborted) return;
      const failed = list.filter((x) => x.failed);
      say(status, failed.length ? "err" : "ok", failed.length
        ? (failed.length === list.length && failed[0].err ? failed[0].err + " " : "") + `Đã tải ${list.length - failed.length}/${list.length}; ${failed.length} mã không tải được (sai mã, hoặc emoji, sticker đã bị xoá).`
        : `Đã tải xong ${list.length} file. Chọn dạng file rồi bấm “Tải tất cả”, hoặc bấm từng cái.`);
    }
    function start() {
      if (abort) abort.abort();
      return (abort = new AbortController());
    }
    const finish = (ac) => { if (abort === ac) abort = null; };

    async function fetchLinks() {
      const found = parseDiscord(textIn.value);
      if (!found.length) { say(status, "err", "Chưa thấy emoji, sticker nào. Dán link dạng https://cdn.discordapp.com/emojis/… hoặc mã <:ten:123…>."); textIn.focus(); return; }
      S.set("text", textIn.value.trim().slice(0, 4000));
      const ac = start();
      getBtn.disabled = true;
      packGrid.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      current = { pack: false };
      try {
        const list = found.map((f) => ({ ...f, label: f.name || "" }));
        const ne = list.filter((x) => x.type === "emoji").length, ns = list.filter((x) => x.type === "sticker").length;
        await run(list, "Emoji, sticker Discord", [ne && `${ne} emoji`, ns && `${ns} sticker`, list.length - ne - ns && `${list.length - ne - ns} mã`].filter(Boolean).join(" · "), "", ac);
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
        if (!packs.length) throw userErr("Discord không trả về bộ sticker nào.");
        packGrid.textContent = "";
        for (const p of packs) {
          packGrid.append(h("button", { class: "dc-pack", type: "button", "aria-pressed": "false", title: p.desc, onclick: (e) => openPack(p, e.currentTarget) },
            p.banner ? h("img", { src: p.banner, alt: "", loading: "lazy" }) : null,
            h("b", { text: p.name }), h("small", { text: `${p.stickers.length} sticker` })));
        }
      } catch (e) {
        packs = null; packGrid.textContent = "";
        say(status, "err", e.userMsg || "Không lấy được danh sách bộ sticker.");
        packGrid.append(h("button", { class: "btn", type: "button", onclick: () => loadPacks() }, "Thử lại"));
      }
    }
    async function openPack(p, btn) {
      packGrid.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const ac = start();
      current = { pack: true, title: p.name };
      try {
        const list = p.stickers.map((st) => ({ type: "sticker", id: st.id, name: st.name, label: st.name, kinds: [st.kind === "apng" ? "png" : st.kind] }));
        const lot = p.stickers.filter((s) => s.kind === "lottie").length;
        await run(list, p.name, [`${list.length} sticker`, lot === list.length ? "Lottie" : lot ? "APNG, Lottie" : "PNG động (APNG)"].join(" · "), p.desc, ac);
        view.el.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) { if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); } }
      finally { finish(ac); }
    }

    // dán xong là tải luôn
    textIn.addEventListener("paste", () => setTimeout(() => { if (parseDiscord(textIn.value).length) fetchLinks(); }, 0));
  }
});
