/* Tải sticker Signal: dán link signal.art/addstickers, trình duyệt tải bộ sticker đã mã hoá từ cdn-ca.signal.org
   (máy chủ của Signal cho phép trang web gọi) rồi tự giải mã bằng pack_key trong link (Web Crypto, xem lib/signal.js).
   Khoá không rời khỏi trình duyệt: phần sau dấu # của link không gửi tới máy chủ nào. */
import { h } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseSignalLink, manifestUrl, stickerUrl, packKeys, decrypt, readManifest } from "../lib/signal.js";
import { packFileName } from "../lib/line.js";
import { packView, say, btnIcon, fetchBlob, pool, imageKind, convertImage, nameOf, userErr } from "../sticker.js";

const HOST = "máy chủ Signal (cdn-ca.signal.org)";
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
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchPack() }, btnIcon("download"), "Lấy bộ sticker");
    const status = h("div", { "aria-live": "polite" });

    const view = packView({
      id: "sg", store: S, status,
      sizes: [[512, "512 px (gốc)"], [320, "320 px"], [240, "240 px (nhẹ)"], [160, "160 px (rất nhẹ)"]], size: 320,
      hint: (o) => o.format === "orig"
        ? "Giữ nguyên file của Signal: WEBP (ảnh tĩnh hoặc động) hoặc PNG động (APNG), dùng lại được trong Signal, Telegram, WhatsApp."
        : "Sticker tĩnh thành PNG cỡ gốc; sticker động thành GIF. GIF chỉ có trong suốt hoàn toàn hoặc không, nên viền có thể hơi răng cưa: chọn nền Trắng nếu dán lên nền sáng.",
      async exportOne(it, idx, o) {
        const r = await convertImage(it.blob, it.kind, o);
        return [{ blob: r.blob, name: nameOf(idx, view.items().length, r.ext) }];
      },
      zipName: (o) => packFileName("Signal", "", current ? current.title : "") + (o.format === "orig" ? "" : "-png-gif")
    });

    el.append(
      h("div", { class: "stk-form" },
        h("div", { class: "field" }, h("label", { for: "sg-link", text: "Link bộ sticker Signal" }), linkIn,
          h("small", { text: "Trong Signal: mở bộ sticker → Chia sẻ → Sao chép link (dạng signal.art/addstickers/#pack_id=…&pack_key=…). Link phải có đủ pack_id và pack_key." })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; fetchPack(); } }, "Thử với bộ mẫu")),
        h("p", { class: "hint" }, "Tìm bộ sticker trên ", h("a", { href: "https://signalstickers.org/", target: "_blank", rel: "noopener", text: "signalstickers.org" }),
          ". Sticker thuộc bản quyền của tác giả: chỉ dùng cá nhân, hoặc khi được tác giả cho phép.")),
      status, view.el);

    async function fetchPack() {
      const p = parseSignalLink(linkIn.value);
      if (!p) { say(status, "err", "Chưa nhận ra link. Link bộ sticker Signal có dạng https://signal.art/addstickers/#pack_id=(32 ký tự)&pack_key=(64 ký tự)."); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim());
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say(status, "info", "Đang lấy và giải mã thông tin bộ…");
      try {
        const keys = await packKeys(p.key);
        const enc = await fetchBlob(manifestUrl(p.id), ac.signal, { host: HOST, notFound: "Không tìm thấy bộ sticker này trên máy chủ Signal. Hãy kiểm tra lại link." });
        let m;
        try { m = readManifest(await decrypt(await enc.arrayBuffer(), keys)); }
        catch (_) { throw userErr("Không giải mã được bộ sticker: pack_key trong link không đúng với pack_id. Hãy sao chép lại cả link."); }
        const list = m.stickers.map((st) => ({ n: st.id, label: st.emoji || "" }));
        if (!list.length) throw userErr("Bộ này không có sticker nào.");
        current = { title: m.title || "Signal " + p.id.slice(0, 8) };
        view.show(current.title, [`${list.length} sticker`, m.author && "của " + m.author].filter(Boolean).join(" · "), list);
        let done = 0;
        say(status, "info", `Đang tải và giải mã 0/${list.length}…`);
        await pool(list, 6, async (it) => {
          try {
            const b = await fetchBlob(stickerUrl(p.id, it.n), ac.signal, { host: HOST });
            const plain = await decrypt(await b.arrayBuffer(), keys);
            const blob0 = new Blob([plain]);
            it.kind = (await imageKind(blob0)) || "webp";
            it.blob = new Blob([plain], { type: TYPE[it.kind] || "image/webp" });
            it.tag = it.kind === "apng" || it.kind === "webp-anim" ? TAG[it.kind] + " động" : TAG[it.kind];
          } catch (e) { if (e.name === "AbortError") throw e; it.failed = true; }
          view.update(it);
          done++;
          if (abort === ac) say(status, "info", `Đang tải và giải mã ${done}/${list.length}…`);
        }, ac.signal);
        if (ac.signal.aborted) return;
        const failed = list.filter((x) => x.failed).length;
        say(status, failed ? "err" : "ok", failed
          ? `Đã tải ${list.length - failed}/${list.length} sticker; ${failed} sticker không tải được.`
          : `Đã tải và giải mã xong ${list.length} sticker. Chọn dạng file rồi bấm “Tải tất cả”, hoặc bấm từng sticker.`);
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }
  }
});
