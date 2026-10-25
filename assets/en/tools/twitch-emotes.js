/* Tự sinh bởi scripts/build.js từ assets/tools/twitch-emotes.js và i18n/en/js/ — đừng sửa tay. */
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

    const chanIn = h("input", { id: "tw-chan", class: "input", type: "text", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "Channel name, e.g. pokimane or https://www.twitch.tv/…", value: S.get("chan", "") });
    chanIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fetchChannel(); } });
    chanIn.addEventListener("paste", () => setTimeout(() => { if (/twitch\.tv|7tv\.app/i.test(chanIn.value) && parseChannel(chanIn.value)) fetchChannel(); }, 0));
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => fetchChannel() }, btnIcon("download"), "Get emotes");
    const status = h("div", { "aria-live": "polite" });

    // lọc theo nguồn khi kênh có cả 7TV và FFZ
    const srcSeg = h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": "tw-src-l" });
    const srcField = h("div", { class: "field", hidden: true }, h("span", { id: "tw-src-l", text: "Source" }), srcSeg);

    const view = packView({
      id: "tw", store: S, status, word: "emote", bg: false, sizeAll: true, sizeLabel: "Size", search: true, parallel: 6,
      sizes: [[4, "4x (largest, 112–128 px)"], [3, "3x"], [2, "2x (56–64 px)"], [1, "1x (28–32 px)"]], size: 4,
      extra: srcField,
      hint: (o) => o.format === "orig"
        ? "7TV: WEBP (animated emotes keep moving, small, smooth edges). FFZ: PNG for still emotes, WEBP for animated ones. Discord, Telegram and browsers all open WEBP."
        : "Still emotes become PNG, animated ones GIF (made by 7TV, FFZ, so downloads are fast). GIF is larger than WEBP and edges look a bit jagged. FFZ only has 1x, 2x, 4x: choosing 3x gets 2x.",
      async exportOne(it, idx, o) {
        const f = emoteFile(it.em, o.format, o.size);
        if (!f) throw userErr("This emote has no file in the chosen format.");
        const blob = await fetchBlob(f.url, null, { host: it.em.source === "7tv" ? "7TV's server" : "FrankerFaceZ's server" });
        return [{ blob, name: emoteFileName(it.em.name, f.ext, it.em.id) }];
      },
      zipName: (o) => packFileName("emote", "", current ? current.title : "") + (o.format === "orig" ? "" : "-png-gif")
    });

    el.append(
      h("div", { class: "stk-form" },
        h("div", { class: "field" }, h("label", { for: "tw-chan", text: "Twitch channel" }), chanIn,
          h("small", { text: "Enter the channel name (the part after twitch.tv/), paste the channel link, or a 7tv.app/users/…, 7tv.app/emote-sets/… link" })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { chanIn.value = SAMPLE; fetchChannel(); } }, "Try a sample channel")),
        h("p", { class: "hint", text: "Gets the 7TV and FrankerFaceZ (FFZ) emotes the channel has added. Native Twitch emotes (subscriber emotes) and BetterTTV can't be downloaded from a browser. Emotes are copyrighted by their artists: use them personally, or with permission." })),
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
      if (!user || !user.id) throw userErr(`Twitch channel “${p.login}” not found. Check the channel name.`);
      return { id: String(user.id), ffz: null, name: user.displayName || p.login };
    }

    async function fetchChannel() {
      const p = parseChannel(chanIn.value);
      if (!p) { say(status, "err", "Channel not recognized. Enter a Twitch channel name (letters, digits, underscores) or paste a twitch.tv/… link"); chanIn.focus(); return; }
      S.set("chan", chanIn.value.trim());
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true;
      say(status, "info", "Getting the emote list…");
      try {
        let title, stv = [], ffz = [], setName = "";
        if (p.kind === "7tv-set" || p.kind === "7tv-user") {
          let setId = p.id;
          if (p.kind === "7tv-user") {
            const u = await getJson(API.stvUser(p.id), ac.signal, "7TV");
            if (!u) throw userErr("7TV user not found.");
            const conn = (u.connections || []).find((c) => c.emote_set_id && c.platform === "TWITCH") || (u.connections || []).find((c) => c.emote_set_id);
            if (!conn) throw userErr("This 7TV user has no emote set yet.");
            setId = conn.emote_set_id;
            title = u.display_name || u.username;
          }
          const set = await getJson(API.stvSet(setId), ac.signal, "7TV");
          if (!set) throw userErr("7TV emote set not found.");
          stv = from7tv(set); setName = set.name || "";
          title = title || set.name || "7TV emote set";
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
        if (!all.length) throw userErr(`Channel “${title}” hasn't added any 7TV or FFZ emotes.`);
        current = { title };
        const nAnim = all.filter((x) => x.em.animated).length;
        const info = [stv.length && `${stv.length} 7TV ${(stv.length) == 1 ? "emote" : "emotes"}${setName ? ` (set “${setName}”)` : ""}`, ffz.length && `${ffz.length} FFZ ${(ffz.length) == 1 ? "emote" : "emotes"}`, nAnim && `${nAnim} animated`].filter(Boolean).join(" · ");
        buildSrc(stv.length, ffz.length);
        show(info);
        say(status, "ok", `${all.length} ${(all.length) == 1 ? "emote" : "emotes"}. Pick a size and format, then click “Download all”, type a name to filter, or click each emote.` + (all.length > 300 ? " Large set: downloading all of it may take a few minutes." : ""));
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
      for (const [v, l] of [["all", "All"], ["7tv", `7TV (${n7})`], ["ffz", `FFZ (${nf})`]]) {
        srcSeg.append(h("label", null, h("input", { type: "radio", name: "tw-src", value: v, checked: v === "all", onchange: () => show() }), h("span", { text: l })));
      }
    }
  }
});
