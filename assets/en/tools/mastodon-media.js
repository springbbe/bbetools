/* Tự sinh bởi scripts/build.js từ assets/tools/mastodon-media.js và i18n/en/js/ — đừng sửa tay. */
/* Tải ảnh, video Mastodon: dán link bài đăng → API công khai /api/v1/statuses/<id> của chính máy chủ trong link
   (Mastodon cho trang web gọi thẳng) → tải file gốc đính kèm từ nơi máy chủ đó lưu file. Nơi lưu file (S3, CDN) do
   từng máy chủ tự cấu hình: máy chủ nào không cho trang web tải thẳng thì vẫn có link "Mở file gốc" để tự lưu. */
import { h, save, zip, fmtSize } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseStatusLink, statusUrl, mediaOf, extOfUrl, mediaFile, plainText } from "../lib/mastodon.js";
import { say, btnIcon, pool, fetchBlob, userErr } from "../sticker.js";

const SAMPLE = "https://mastodon.social/@Mastodon/116839714185151652";
const TYPE = { image: "Photo", video: "Video", gifv: "GIF (video MP4)", audio: "Audio", unknown: "File" };

const css = document.createElement("style");
css.textContent = `
.md-form{display:flex;flex-direction:column;gap:14px}
.md-form .btn{white-space:normal;text-align:center}
.md-post{margin-top:18px;display:flex;flex-direction:column;gap:14px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.md-who{display:flex;gap:12px;align-items:center;min-width:0}
.md-who img{width:44px;height:44px;border-radius:10px;flex:none;background:var(--surface-2)}
.md-who b{display:block;overflow-wrap:anywhere}
.md-who small{color:var(--muted);overflow-wrap:anywhere}
.md-text{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55}
.md-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.md-item{display:flex;flex-direction:column;gap:8px;padding:8px;border:1px solid var(--line);border-radius:14px;background:var(--bg);min-width:0}
.md-item img,.md-item video{width:100%;max-height:420px;object-fit:contain;border-radius:10px;background:var(--surface-2);display:block}
.md-item audio{width:100%}
.md-item .meta{font-size:13px;color:var(--muted)}
.md-item .alt{font-size:13px;margin:0;overflow-wrap:anywhere}
.md-item .btn{width:100%;justify-content:center}
.md-item a.open{font-size:13px;text-align:center}
`;
document.head.append(css);

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null;

    const linkIn = h("input", { id: "md-link", type: "url", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://mastodon.social/@name/123456789…", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parseStatusLink(linkIn.value)) go(); }, 0));
    const goBtn = h("button", { class: "btn big", type: "button", onclick: () => go() }, btnIcon("cloud-download"), "Get photos & videos");
    const status = h("div", { "aria-live": "polite" });
    const res = h("div");

    el.append(
      h("div", { class: "md-form" },
        h("div", { class: "field" }, h("label", { for: "md-link", text: "Mastodon post link" }), linkIn,
          h("small", { text: "Click the post's timestamp (or ··· → Copy link to post) to get its link. Works with any Mastodon server and compatible servers such as Pleroma, Akkoma and GoToSocial." })),
        h("div", { class: "row" }, goBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; go(); } }, "Try a sample post")),
        h("p", { class: "hint", text: "Photos and videos belong to the author: download them to rewatch, keep for yourself, or with the author's permission." })),
      status, res);

    async function go() {
      const p = parseStatusLink(linkIn.value);
      if (!p) { say(status, "err", "Link not recognized. Paste a post link like https://mastodon.social/@name/123456789"); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim().slice(0, 300));
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      goBtn.disabled = true; res.textContent = "";
      say(status, "info", `Getting the post from ${p.host}…`);
      try {
        let r;
        try { r = await fetch(statusUrl(p.host, p.id), { credentials: "omit", signal: ac.signal, headers: { Accept: "application/json" } }); }
        catch (e) { if (e.name === "AbortError") throw e; throw userErr(`Couldn't reach ${p.host}, or this server doesn't let other websites read posts. Check the link (it must be a link on a Mastodon server).`); }
        if (r.status === 401 || r.status === 403 || r.status === 422) throw userErr(`${p.host} requires sign-in to read posts through its API, so the tool can't fetch it. Open the post in your browser and save the photos and videos yourself.`);
        if (r.status === 404) throw userErr("Post not found: it was deleted, is followers-only, or the link is wrong.");
        if (!r.ok) throw userErr(`${p.host} returned HTTP error ${r.status}.`);
        const st = await r.json();
        const items = mediaOf(st);
        say(status, items.length ? "" : "info", items.length ? "" : "This post has no photos, videos or audio.");
        render(st.reblog || st, p, items);
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; goBtn.disabled = false; } }
    }

    const fileOf = (m) => fetchBlob(m.url, null, { host: m.url.split("/")[2] }).catch((e) => {
      throw userErr(e.status ? e.userMsg : `The file server (${m.url.split("/")[2]}) doesn't allow direct downloads from other websites. Click “Open original file” and save it from your browser.`);
    });

    function render(st, p, items) {
      const a = st.account || {}, text = plainText(st.content);
      const name = (i) => mediaFile(a.acct || a.username, st.id, i, items.length, items[i]);
      const box = h("article", { class: "md-post" });
      box.append(h("div", { class: "md-who" },
        a.avatar ? h("img", { src: a.avatar, alt: "", loading: "lazy" }) : null,
        h("div", { style: { minWidth: 0 } }, h("b", { text: a.display_name || a.username || "" }),
          h("small", null, "@" + (a.acct || "") + " · ", h("a", { href: st.url || st.uri, target: "_blank", rel: "noopener", text: "Open post" })))));
      if (st.spoiler_text) box.append(h("p", { class: "hint", text: "Content warning: " + st.spoiler_text }));
      if (text) box.append(h("p", { class: "md-text", text: text.length > 500 ? text.slice(0, 500) + "…" : text }));
      if (items.length) {
        const grid = h("div", { class: "md-grid", role: "list" });
        items.forEach((m, i) => {
          const media = m.type === "image" ? h("img", { src: m.preview || m.url, alt: m.alt, loading: "lazy" })
            : m.type === "audio" ? h("audio", { controls: true, preload: "none", src: m.url })
            : m.type === "unknown" ? null
            : h("video", { controls: true, preload: "none", playsinline: true, loop: m.type === "gifv", muted: m.type === "gifv", poster: m.preview || "", src: m.url, "aria-label": m.alt || TYPE[m.type] });
          const btn = h("button", { class: "btn sm", type: "button", onclick: async () => {
            btn.disabled = true;
            try { save(await fileOf(m), name(i)); }
            catch (e) { ctx.toast(e.userMsg || "Couldn't download this file.", { type: "err" }); if (!e.userMsg) console.error(e); }
            finally { btn.disabled = false; }
          } }, btnIcon("download"), "Download original");
          grid.append(h("div", { class: "md-item", role: "listitem" }, media,
            h("span", { class: "meta", text: [`${TYPE[m.type] || "File"} ${items.length > 1 ? i + 1 : ""}`.trim(), extOfUrl(m.url, m.type).toUpperCase(), m.w && m.h ? `${m.w}×${m.h}` : "", m.duration ? `${Math.round(m.duration)} s` : ""].filter(Boolean).join(" · ") }),
            m.alt ? h("p", { class: "alt", text: "Alt text: " + m.alt }) : null, btn,
            h("a", { class: "open", href: m.url, target: "_blank", rel: "noopener", text: "Open original file" })));
        });
        box.append(grid);
        if (items.length > 1) {
          const zs = h("div", { "aria-live": "polite" });
          const zb = h("button", { class: "btn big", type: "button", onclick: () => saveAll(zb, zs) }, btnIcon("file-archive"), `Download all ${items.length} files (.zip)`);
          box.append(h("div", { class: "row" }, zb), zs);
          async function saveAll(b, out) {
            b.disabled = true;
            try {
              const files = [];
              let done = 0;
              say(out, "info", `Downloading 0/${items.length} files…`);
              await pool(items.map((m, i) => ({ m, i })), 4, async ({ m, i }) => {
                files[i] = { name: name(i), blob: await fileOf(m) };
                say(out, "info", `Downloading ${++done}/${items.length} files…`);
              });
              const z = await zip(files);
              const zn = name(0).replace(/-1\.[a-z0-9]+$/, ".zip");
              save(z, zn);
              say(out, "ok", `Created ${zn}: ${files.length} ${(files.length) == 1 ? "file" : "files"} (${fmtSize(z.size)}).`);
            } catch (e) { say(out, "err", e.userMsg || "Couldn't create the .zip file."); if (!e.userMsg) console.error(e); }
            finally { b.disabled = false; }
          }
        }
      }
      res.append(box);
      box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
});
