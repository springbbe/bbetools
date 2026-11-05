/* Tải ảnh, video Bluesky: dán link bài đăng → API công khai của Bluesky (public.api.bsky.app) cho biết bài đăng và các file
   đính kèm → tìm máy chủ dữ liệu (PDS) của người đăng qua plc.directory → tải file gốc (ảnh đúng định dạng, video MP4
   người đăng tải lên) bằng com.atproto.sync.getBlob. Mọi nguồn đều cho trang web gọi thẳng; không cần đăng nhập. */
import { h, save, zip, fmtSize } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parsePostLink, resolveHandleUrl, postUri, getPostsUrl, didDocUrl, pdsFromDoc, blobUrl, cdnImage, cdnThumb, videoThumb, mediaFromRecord, extOfMime, mediaName } from "../lib/bluesky.js";
import { say, btnIcon, pool, fetchBlob, userErr } from "../sticker.js";

const SAMPLE = "https://bsky.app/profile/bsky.app/post/3myi3k45jh22z";

const css = document.createElement("style");
css.textContent = `
.bs-form{display:flex;flex-direction:column;gap:14px}
.bs-form .btn{white-space:normal;text-align:center}
.bs-post{margin-top:18px;display:flex;flex-direction:column;gap:14px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.bs-who{display:flex;gap:12px;align-items:center;min-width:0}
.bs-who img{width:44px;height:44px;border-radius:50%;flex:none;background:var(--surface-2)}
.bs-who b{display:block;overflow-wrap:anywhere}
.bs-who small{color:var(--muted)}
.bs-text{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55}
.bs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.bs-item{display:flex;flex-direction:column;gap:8px;padding:8px;border:1px solid var(--line);border-radius:14px;background:var(--bg);min-width:0}
.bs-item img,.bs-item video{width:100%;max-height:420px;object-fit:contain;border-radius:10px;background:var(--surface-2);display:block}
.bs-item .meta{font-size:13px;color:var(--muted)}
.bs-item .alt{font-size:13px;margin:0;overflow-wrap:anywhere}
.bs-item .btn{width:100%;justify-content:center}
`;
document.head.append(css);

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null;
    const pdsCache = new Map();

    const linkIn = h("input", { id: "bs-link", type: "url", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://bsky.app/profile/…/post/…", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parsePostLink(linkIn.value)) go(); }, 0));
    const goBtn = h("button", { class: "btn big", type: "button", onclick: () => go() }, btnIcon("cloud-download"), "Lấy ảnh, video");
    const status = h("div", { "aria-live": "polite" });
    const res = h("div");

    el.append(
      h("div", { class: "bs-form" },
        h("div", { class: "field" }, h("label", { for: "bs-link", text: "Link bài đăng Bluesky" }), linkIn,
          h("small", { text: "Trong app Bluesky: bấm nút Chia sẻ dưới bài đăng → Sao chép liên kết. Link từ trình duyệt (bsky.app/profile/…/post/…) cũng được." })),
        h("div", { class: "row" }, goBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; go(); } }, "Thử với bài đăng mẫu")),
        h("p", { class: "hint", text: "Ảnh, video thuộc bản quyền của người đăng: tải để xem lại, lưu trữ cá nhân, hoặc khi được người đăng cho phép." })),
      status, res);

    async function getJson(url, signal, host) {
      let r;
      try { r = await fetch(url, { credentials: "omit", signal }); }
      catch (e) { if (e.name === "AbortError") throw e; throw userErr(`Không kết nối được tới ${host}. Hãy kiểm tra mạng rồi thử lại.`); }
      if (r.status === 400 || r.status === 404) return null;
      if (!r.ok) throw userErr(`${host} báo lỗi HTTP ${r.status}.`);
      return r.json();
    }
    async function pdsOf(did, signal) {
      if (!pdsCache.has(did)) {
        const url = didDocUrl(did);
        const doc = url ? await getJson(url, signal, url.split("/")[2]) : null;
        pdsCache.set(did, pdsFromDoc(doc));
      }
      return pdsCache.get(did);
    }

    async function go() {
      const p = parsePostLink(linkIn.value);
      if (!p) { say(status, "err", "Chưa nhận ra link. Dán link bài đăng dạng https://bsky.app/profile/ten.bsky.social/post/3abc…"); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim().slice(0, 300));
      if (abort) abort.abort();
      const ac = abort = new AbortController(), signal = ac.signal;
      goBtn.disabled = true; res.textContent = "";
      say(status, "info", "Đang lấy bài đăng…");
      try {
        let did = p.actor;
        if (!did.startsWith("did:")) {
          const j = await getJson(resolveHandleUrl(did), signal, "Bluesky (public.api.bsky.app)");
          if (!j || !j.did) throw userErr(`Không tìm thấy tài khoản @${p.actor}. Kiểm tra lại link.`);
          did = j.did;
        }
        const j = await getJson(getPostsUrl(postUri(did, p.rkey)), signal, "Bluesky (public.api.bsky.app)");
        const post = j && j.posts && j.posts[0];
        if (!post) throw userErr("Không xem được bài đăng này: bài đã bị xoá, hoặc người đăng chỉ cho người đã đăng nhập xem.");
        const items = mediaFromRecord(post.record).map((m) => ({ ...m, did: post.author.did, handle: post.author.handle }));
        // bài được trích dẫn có kèm ảnh, video
        const ev = post.embed || {}, q = (ev.$type || "").startsWith("app.bsky.embed.recordWithMedia") ? ev.record && ev.record.record : (ev.$type || "").startsWith("app.bsky.embed.record") ? ev.record : null;
        if (q && q.value && q.author) items.push(...mediaFromRecord(q.value, true).map((m) => ({ ...m, did: q.author.did, handle: q.author.handle, rkey: (q.uri || "").split("/").pop() })));
        for (const it of items) it.pds = await pdsOf(it.did, signal);
        if (signal.aborted) return;
        say(status, items.length ? "" : "info", items.length ? "" : "Bài đăng này không có ảnh hay video đính kèm.");
        render(post, p.rkey, items);
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; goBtn.disabled = false; } }
    }

    const nameOf = (it, i, list) => {
      const same = list.filter((x) => x.quoted === it.quoted);
      return mediaName(it.handle, it.quoted ? it.rkey : list.rkey, same.indexOf(it), same.length, it.mime);
    };

    async function fileOf(it) {
      if (it.pds) {
        try { return await fetchBlob(blobUrl(it.pds, it.did, it.cid), null, { host: "máy chủ dữ liệu của người đăng" }); }
        catch (e) { if (it.kind === "video") throw e; }
      }
      if (it.kind === "image") return fetchBlob(cdnImage(it.did, it.cid), null, { host: "Bluesky (cdn.bsky.app)" });
      throw userErr("Không tìm được máy chủ lưu video của người đăng.");
    }

    function render(post, rkey, items) {
      items.rkey = rkey;
      const a = post.author, text = (post.record && post.record.text) || "";
      const box = h("article", { class: "bs-post" });
      box.append(h("div", { class: "bs-who" },
        a.avatar ? h("img", { src: a.avatar, alt: "", loading: "lazy" }) : null,
        h("div", { style: { minWidth: 0 } }, h("b", { text: a.displayName || a.handle }),
          h("small", null, "@" + a.handle + " · ", h("a", { href: `https://bsky.app/profile/${a.handle}/post/${rkey}`, target: "_blank", rel: "noopener", text: "Mở trên Bluesky" })))));
      if (text) box.append(h("p", { class: "bs-text", text: text.length > 500 ? text.slice(0, 500) + "…" : text }));
      if (items.length) {
        const grid = h("div", { class: "bs-grid", role: "list" });
        let n = 0;
        items.forEach((it, i) => {
          const label = it.kind === "video" ? (it.gif ? "GIF (video MP4)" : "Video") : `Ảnh ${++n}`;
          const media = it.kind === "video"
            ? h("video", { controls: true, preload: "none", playsinline: true, poster: videoThumb(it.did, it.cid), src: it.pds ? blobUrl(it.pds, it.did, it.cid) : "", "aria-label": it.alt || label })
            : h("img", { src: cdnThumb(it.did, it.cid), alt: it.alt || "", loading: "lazy" });
          const btn = h("button", { class: "btn sm", type: "button", onclick: async () => {
            btn.disabled = true;
            try { save(await fileOf(it), nameOf(it, i, items)); }
            catch (e) { ctx.toast(e.userMsg || "Không tải được file này.", { type: "err" }); if (!e.userMsg) console.error(e); }
            finally { btn.disabled = false; }
          } }, btnIcon("download"), it.kind === "video" ? "Tải video gốc" : "Tải ảnh gốc");
          grid.append(h("div", { class: "bs-item", role: "listitem" }, media,
            h("span", { class: "meta", text: [label, extOfMime(it.mime).toUpperCase(), it.size ? fmtSize(it.size) : "", it.w && it.h ? `${it.w}:${it.h}` : "", it.quoted ? "trong bài được trích dẫn" : ""].filter(Boolean).join(" · ") }),
            it.alt ? h("p", { class: "alt", text: "Mô tả: " + it.alt }) : null, btn));
        });
        box.append(grid);
        if (items.length > 1) {
          const zs = h("div", { "aria-live": "polite" });
          const zb = h("button", { class: "btn big", type: "button", onclick: () => saveAll(items, zb, zs) }, btnIcon("file-archive"), `Tải tất cả ${items.length} file (.zip)`);
          box.append(h("div", { class: "row" }, zb), zs);
        }
      }
      res.append(box);
      box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    async function saveAll(items, btn, box) {
      btn.disabled = true;
      try {
        const files = [];
        let done = 0;
        say(box, "info", `Đang tải 0/${items.length} file…`);
        await pool(items.map((it, i) => ({ it, i })), 4, async ({ it, i }) => {
          files[i] = { name: nameOf(it, i, items), blob: await fileOf(it) };
          say(box, "info", `Đang tải ${++done}/${items.length} file…`);
        });
        const z = await zip(files);
        const name = mediaName(items[0].handle, items.rkey, 0, 1, "application/zip").replace(/\.zip$|\.[a-z0-9]+$/, ".zip");
        save(z, name);
        say(box, "ok", `Đã tạo ${name}: ${files.length} file (${fmtSize(z.size)}).`);
      } catch (e) { say(box, "err", e.userMsg || "Không tạo được file .zip."); if (!e.userMsg) console.error(e); }
      finally { btn.disabled = false; }
    }
  }
});
