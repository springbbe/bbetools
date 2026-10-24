/* Tải sticker LINE: dán link cửa hàng LINE, trình duyệt tải thẳng từ stickershop.line-scdn.net (máy chủ của LINE
   cho phép trang web gọi, BbeTools không có máy chủ trung gian). Nhận bộ sticker (tĩnh, động APNG, popup, có âm thanh)
   và bộ emoji. Xuất nguyên bản (PNG/APNG + M4A) hoặc PNG + GIF. */
import { h, LANG } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseLineLink, packKind, stickerFiles, emojiFiles, pickTitle, packFileName, stickerMetaUrl, emojiMetaUrl } from "../lib/line.js";
import { packView, say, btnIcon, fetchBlob, pool, imageKind, convertImage, nameOf } from "../sticker.js";

const HOST = "máy chủ LINE";
const SAMPLE = "https://store.line.me/stickershop/product/11537/vi"; // bộ miễn phí chính thức (động)

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, current = null;

    const linkIn = h("input", { id: "ln-link", class: "input", type: "text", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://store.line.me/stickershop/product/…", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fetchPack(); } });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchPack() }, btnIcon("download"), "Lấy bộ sticker");
    const status = h("div", { "aria-live": "polite" });
    const soundBox = h("input", { type: "checkbox", checked: S.get("sound", true), onchange: () => S.set("sound", soundBox.checked) });
    const soundField = h("label", { class: "switch", hidden: true }, soundBox, h("span", null, "Kèm âm thanh (.m4a)", h("small", { text: "GIF không chứa được tiếng nên âm thanh là file riêng." })));

    const view = packView({
      id: "ln", store: S, status,
      sizes: [[0, "Cỡ gốc"], [240, "240 px"], [160, "160 px (nhẹ)"], [96, "96 px (rất nhẹ)"]], size: 0,
      extra: soundField,
      hint: (o) => o.format === "orig"
        ? "Sticker động, popup là file PNG động (APNG): mở được bằng trình duyệt, Telegram, Discord và phần mềm đồ hoạ; sticker tĩnh là PNG."
        : "Sticker tĩnh thành PNG; sticker động, popup thành GIF. GIF chỉ có trong suốt hoàn toàn hoặc không, nên viền có thể hơi răng cưa: chọn nền Trắng nếu dán lên nền sáng.",
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
        h("div", { class: "field" }, h("label", { for: "ln-link", text: "Link bộ sticker hoặc emoji LINE" }), linkIn,
          h("small", { text: "Mở bộ trên store.line.me rồi sao chép địa chỉ trang, hoặc trong app LINE: trang bộ sticker → Chia sẻ → Sao chép link. Dán mã số của bộ cũng được." })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; fetchPack(); } }, "Thử với bộ mẫu")),
        h("p", { class: "hint" }, "Tìm bộ trên ", h("a", { href: "https://store.line.me/stickershop/home/general/vi", target: "_blank", rel: "noopener", text: "cửa hàng LINE" }),
          ". Sticker thuộc bản quyền của tác giả: chỉ dùng cá nhân, hoặc khi được tác giả cho phép.")),
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
      if (!p) { say(status, "err", "Chưa nhận ra link. Dán link dạng https://store.line.me/stickershop/product/12345 (sticker) hoặc …/emojishop/product/… (emoji)."); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim());
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say(status, "info", "Đang lấy thông tin bộ…");
      try {
        let title, info, list, note = "";
        if (p.type === "sticker") {
          const meta = await getJson(stickerMetaUrl(p.id), ac.signal, "Không tìm thấy bộ sticker này. Hãy kiểm tra lại link hoặc mã bộ (bộ đã ngừng bán có thể không còn file).");
          const kind = packKind(meta);
          title = pickTitle(meta.title, LANG) || "Bộ sticker LINE " + p.id;
          list = (meta.stickers || []).map((st) => ({ files: stickerFiles(st.id, kind), popup: kind.anim === "popup", label: "" }));
          info = [`${list.length} sticker`, kind.anim === "popup" ? "popup động" : kind.anim ? "động" : "tĩnh", kind.sound && "có âm thanh", pickTitle(meta.author, LANG) && "của " + pickTitle(meta.author, LANG)].filter(Boolean).join(" · ");
          soundField.hidden = !kind.sound;
          if (kind.text) note = "Bộ sticker tuỳ chỉnh chữ: file tải về là hình gốc, không có chữ bạn tự nhập trong LINE.";
          if (kind.anim === "popup") note = "Sticker popup: file tải về là hiệu ứng động phóng to khi gửi trong LINE.";
        } else {
          const meta = await getJson(emojiMetaUrl(p.id), ac.signal, "Không tìm thấy bộ emoji này. Hãy kiểm tra lại link (dạng store.line.me/emojishop/product/…).");
          const animated = String(meta.sticonResourceType || "").toUpperCase() === "ANIMATION";
          const alt = meta.altTexts || {};
          title = "Bộ emoji LINE";
          list = (meta.orders || []).map((o) => ({ files: emojiFiles(p.id, o, animated), label: alt[o] || "" }));
          info = [`${list.length} emoji`, animated ? "động" : "tĩnh"].join(" · ");
          soundField.hidden = true;
        }
        if (!list.length) throw Object.assign(new Error(), { userMsg: "Bộ này không có sticker nào để tải." });
        current = { id: p.id, title, type: p.type };
        view.show(title, info, list, note);
        let done = 0;
        say(status, "info", `Đang tải 0/${list.length}…`);
        await pool(list, 6, async (it) => {
          await load(it, ac.signal);
          done++;
          if (abort === ac) say(status, "info", `Đang tải ${done}/${list.length}…`);
        }, ac.signal);
        if (ac.signal.aborted) return;
        const failed = list.filter((x) => x.failed).length;
        say(status, failed ? "err" : "ok", failed
          ? `Đã tải ${list.length - failed}/${list.length}; ${failed} file không tải được.`
          : `Đã tải xong ${list.length} ${p.type === "emoji" ? "emoji" : "sticker"}. Chọn dạng file rồi bấm “Tải tất cả”, hoặc bấm từng cái.`);
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }

    // dán link xong là tải luôn
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parseLineLink(linkIn.value)) fetchPack(); }, 0));
  }
});
