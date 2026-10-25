/* Tải emote Twitch (7TV, FrankerFaceZ): nhập tên kênh, trình duyệt gọi thẳng API của 7TV (7tv.io) và FrankerFaceZ
   (api.frankerfacez.com), rồi tải ảnh từ cdn.7tv.app, cdn.frankerfacez.com: cả bốn máy chủ cho phép trang web gọi, BbeTools
   không có máy chủ trung gian. Ảnh xem trước là link thẳng (không tải trước cả nghìn emote); file chỉ tải khi bấm tải.
   Hai nguồn đều có sẵn GIF, PNG, WEBP nên không cần đổi định dạng trên máy. Không làm được: emote gốc của Twitch
   (liệt kê cần khoá Twitch API), BetterTTV (máy chủ ảnh không cho trang web tải file). */
import { h } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { API, parseChannel, from7tv, fromFfz, mergeEmotes, emoteFile, previewUrl, emoteFileName } from "../lib/twitch.js";
import { packFileName } from "../lib/line.js";
import { packView, say, btnIcon, fetchBlob, userErr } from "../sticker.js";

const SAMPLE = "lirik";
const SRC_NAME = { "7tv": "7TV", ffz: "FFZ" };

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, current = null, all = [];

    const chanIn = h("input", { id: "tw-chan", class: "input", type: "text", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "Tên kênh, vd. pokimane hoặc https://www.twitch.tv/…", value: S.get("chan", "") });
    chanIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fetchChannel(); } });
    chanIn.addEventListener("paste", () => setTimeout(() => { if (/twitch\.tv|7tv\.app/i.test(chanIn.value) && parseChannel(chanIn.value)) fetchChannel(); }, 0));
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchChannel() }, btnIcon("download"), "Lấy emote");
    const status = h("div", { "aria-live": "polite" });

    // lọc theo nguồn khi kênh có cả 7TV và FFZ
    const srcSeg = h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": "tw-src-l" });
    const srcField = h("div", { class: "field", hidden: true }, h("span", { id: "tw-src-l", text: "Nguồn" }), srcSeg);

    const view = packView({
      id: "tw", store: S, status, word: "emote", bg: false, sizeAll: true, sizeLabel: "Cỡ", search: true, parallel: 6,
      sizes: [[4, "4x (lớn nhất, 112–128 px)"], [3, "3x"], [2, "2x (56–64 px)"], [1, "1x (28–32 px)"]], size: 4,
      extra: srcField,
      hint: (o) => o.format === "orig"
        ? "7TV: WEBP (emote động vẫn chạy, nhẹ, viền mịn). FFZ: PNG cho emote tĩnh, WEBP cho emote động. Discord, Telegram và trình duyệt đều mở được WEBP."
        : "Emote tĩnh thành PNG, emote động thành GIF (7TV, FFZ làm sẵn nên tải rất nhanh). GIF nặng hơn WEBP và viền hơi răng cưa. FFZ chỉ có cỡ 1x, 2x, 4x: chọn 3x sẽ lấy 2x.",
      async exportOne(it, idx, o) {
        const f = emoteFile(it.em, o.format, o.size);
        if (!f) throw userErr("Emote này không có file ở dạng đã chọn.");
        const blob = await fetchBlob(f.url, null, { host: it.em.source === "7tv" ? "máy chủ 7TV" : "máy chủ FrankerFaceZ" });
        return [{ blob, name: emoteFileName(it.em.name, f.ext, it.em.id) }];
      },
      zipName: (o) => packFileName("emote", "", current ? current.title : "") + (o.format === "orig" ? "" : "-png-gif")
    });

    el.append(
      h("div", { class: "stk-form" },
        h("div", { class: "field" }, h("label", { for: "tw-chan", text: "Kênh Twitch" }), chanIn,
          h("small", { text: "Nhập tên kênh (phần sau twitch.tv/), dán link kênh, hoặc link 7tv.app/users/…, 7tv.app/emote-sets/…" })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { chanIn.value = SAMPLE; fetchChannel(); } }, "Thử với kênh mẫu")),
        h("p", { class: "hint", text: "Lấy emote 7TV và FrankerFaceZ (FFZ) mà kênh đã thêm. Emote gốc của Twitch (emote đăng ký kênh) và BetterTTV không tải được từ trình duyệt. Emote thuộc bản quyền của người vẽ: chỉ dùng cá nhân, hoặc khi được cho phép." })),
      status, view.el);

    async function getJson(url, signal, host) {
      try {
        const b = await fetchBlob(url, signal, { host });
        return JSON.parse(await b.text());
      } catch (e) {
        if (e.name === "AbortError") throw e;
        if (e.status === 404) return null; // kênh không dùng nguồn này
        throw e;
      }
    }
    /** Tên kênh → mã số Twitch, kèm phòng FFZ nếu có */
    async function resolve(p, signal) {
      if (p.kind === "id") return { id: p.id, ffz: await getJson(API.ffzRoomId(p.id), signal, "FrankerFaceZ"), name: p.id };
      const ffz = await getJson(API.ffzRoom(p.login), signal, "FrankerFaceZ");
      if (ffz && ffz.room && ffz.room.twitch_id) return { id: String(ffz.room.twitch_id), ffz, name: ffz.room.display_name || p.login };
      // kênh không có phòng FFZ: tra mã số qua api.ivr.fi (dữ liệu công khai của Twitch)
      const u = await getJson(API.ivrUser(p.login), signal, "api.ivr.fi");
      const user = Array.isArray(u) ? u[0] : u;
      if (!user || !user.id) throw userErr(`Không tìm thấy kênh Twitch “${p.login}”. Hãy kiểm tra lại tên kênh.`);
      return { id: String(user.id), ffz: null, name: user.displayName || p.login };
    }

    async function fetchChannel() {
      const p = parseChannel(chanIn.value);
      if (!p) { say(status, "err", "Chưa nhận ra kênh. Nhập tên kênh Twitch (chữ, số, dấu gạch dưới) hoặc dán link twitch.tv/…"); chanIn.focus(); return; }
      S.set("chan", chanIn.value.trim());
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say(status, "info", "Đang lấy danh sách emote…");
      try {
        let title, stv = [], ffz = [], setName = "";
        if (p.kind === "7tv-set" || p.kind === "7tv-user") {
          let setId = p.id;
          if (p.kind === "7tv-user") {
            const u = await getJson(API.stvUser(p.id), ac.signal, "7TV");
            if (!u) throw userErr("Không tìm thấy người dùng 7TV này.");
            const conn = (u.connections || []).find((c) => c.emote_set_id && c.platform === "TWITCH") || (u.connections || []).find((c) => c.emote_set_id);
            if (!conn) throw userErr("Người dùng 7TV này chưa có bộ emote nào.");
            setId = conn.emote_set_id;
            title = u.display_name || u.username;
          }
          const set = await getJson(API.stvSet(setId), ac.signal, "7TV");
          if (!set) throw userErr("Không tìm thấy bộ emote 7TV này.");
          stv = from7tv(set); setName = set.name || "";
          title = title || set.name || "Bộ emote 7TV";
        } else {
          const r = await resolve(p, ac.signal);
          const st = await getJson(API.stvTwitch(r.id), ac.signal, "7TV");
          stv = st && st.emote_set ? from7tv(st.emote_set) : [];
          setName = st && st.emote_set ? st.emote_set.name || "" : "";
          ffz = r.ffz ? fromFfz(r.ffz) : [];
          title = (st && st.display_name) || r.name;
        }
        // nhãn nguồn chỉ cần khi có cả hai nguồn (đỡ chiếm chỗ của tên emote)
        all = mergeEmotes(stv, ffz).map((em) => ({ em, src: previewUrl(em), label: em.name, find: em.name, tag: stv.length && ffz.length ? SRC_NAME[em.source] : "" }));
        if (!all.length) throw userErr(`Kênh “${title}” chưa thêm emote 7TV hay FFZ nào.`);
        current = { title };
        const nAnim = all.filter((x) => x.em.animated).length;
        const info = [stv.length && `${stv.length} emote 7TV${setName ? ` (bộ “${setName}”)` : ""}`, ffz.length && `${ffz.length} emote FFZ`, nAnim && `${nAnim} emote động`].filter(Boolean).join(" · ");
        buildSrc(stv.length, ffz.length);
        show(info);
        say(status, "ok", `Có ${all.length} emote. Chọn cỡ, dạng file rồi bấm “Tải tất cả”, gõ tên để lọc, hoặc bấm từng emote.` + (all.length > 300 ? " Bộ lớn: tải cả bộ có thể mất vài phút." : ""));
      } catch (e) {
        if (e.name !== "AbortError") { view.hide(); say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }

    let infoText = "";
    function show(info) {
      if (info != null) infoText = info;
      const src = (srcSeg.querySelector("input:checked") || {}).value || "all";
      view.show(current.title, infoText, src === "all" ? all : all.filter((x) => x.em.source === src));
    }
    function buildSrc(n7, nf) {
      srcSeg.textContent = "";
      srcField.hidden = !(n7 && nf);
      for (const [v, l] of [["all", "Tất cả"], ["7tv", `7TV (${n7})`], ["ffz", `FFZ (${nf})`]]) {
        srcSeg.append(h("label", null, h("input", { type: "radio", name: "tw-src", value: v, checked: v === "all", onchange: () => show() }), h("span", { text: l })));
      }
    }
  }
});
