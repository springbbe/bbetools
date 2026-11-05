/* Tải icon, ảnh chụp app App Store: dán link app (hoặc gõ tên app) → iTunes Lookup/Search API của Apple
   (itunes.apple.com, cho trang web gọi thẳng) → icon cỡ tới 1024×1024 và ảnh chụp màn hình iPhone, iPad, Apple TV
   cỡ gốc từ máy chủ ảnh của Apple (mzstatic.com, cũng cho gọi thẳng). Bo góc icon làm bằng canvas trên máy. */
import { h, save, zip, fmtSize, LANG } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseAppStore, lookupUrl, searchUrl, sizedUrl, appInfo, iconName, shotName, iosRadius } from "../lib/appstore.js";
import { say, btnIcon, pool, fetchBlob, userErr, canvasOf, toBlob } from "../sticker.js";

const SAMPLE = "https://apps.apple.com/vn/app/zalo/id579523206";
const SIZES = [1024, 512, 256, 180, 120, 64];
const COUNTRIES = [["vn", "Việt Nam"], ["us", "Mỹ"], ["jp", "Nhật Bản"], ["kr", "Hàn Quốc"], ["cn", "Trung Quốc"], ["tw", "Đài Loan"], ["sg", "Singapore"], ["gb", "Anh"], ["au", "Úc"]];
const KINDS = [["iphone", "Ảnh chụp iPhone"], ["ipad", "Ảnh chụp iPad"], ["tv", "Ảnh chụp Apple TV"]];

const css = document.createElement("style");
css.textContent = `
.as-form{display:flex;flex-direction:column;gap:14px}
.as-form .btn{white-space:normal;text-align:center}
.as-row{display:grid;gap:12px;grid-template-columns:minmax(0,1fr) 170px;align-items:end}
@media (max-width:520px){.as-row{grid-template-columns:1fr}}
.as-res{margin-top:18px;display:flex;flex-direction:column;gap:18px}
.as-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.as-pick{display:flex;gap:12px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;text-align:left;cursor:pointer;min-width:0}
.as-pick:hover,.as-pick:focus-visible{border-color:var(--brand)}
.as-pick img{width:52px;height:52px;border-radius:12px;flex:none;background:var(--surface-2)}
.as-pick span{display:flex;flex-direction:column;min-width:0}
.as-pick b,.as-pick small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.as-pick small{color:var(--muted);font-size:12.5px}
.as-app{display:flex;flex-direction:column;gap:16px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.as-head{display:flex;gap:16px;align-items:center}
.as-head h2{margin:0;font-size:20px;overflow-wrap:anywhere}
.as-icon{width:128px;height:128px;flex:none;background:repeating-conic-gradient(var(--surface-2) 0 25%,transparent 0 50%) 0 0/16px 16px;border-radius:12px;object-fit:contain}
.as-icon.round{border-radius:22.37%}
.as-sizes{display:flex;flex-wrap:wrap;gap:8px}
.as-shots{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity}
.as-shot{flex:none;display:flex;flex-direction:column;gap:4px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font:inherit;cursor:pointer;scroll-snap-align:start}
.as-shot:hover,.as-shot:focus-visible{border-color:var(--brand)}
.as-shot img{display:block;height:260px;width:auto;max-width:520px;border-radius:8px;background:var(--surface-2)}
.as-shot small{color:var(--muted);font-size:12px}
.as-sub{margin:0;font-size:16px}
`;
document.head.append(css);

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, app = null;

    const linkIn = h("input", { id: "as-link", type: "text", autocomplete: "off", spellcheck: "false", placeholder: "https://apps.apple.com/vn/app/… hoặc tên app", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    linkIn.addEventListener("paste", () => setTimeout(() => { const p = parseAppStore(linkIn.value); if (p && p.id) go(); }, 0));
    const country = h("select", { id: "as-country", class: "select" }, COUNTRIES.map(([v, l]) => h("option", { value: v, text: l })));
    country.value = S.get("country", LANG === "vi" ? "vn" : "us");
    country.addEventListener("change", () => S.set("country", country.value));
    const goBtn = h("button", { class: "btn big", type: "button", onclick: () => go() }, btnIcon("image-down"), "Lấy icon và ảnh chụp");
    const roundBox = h("input", { type: "checkbox", checked: S.get("round", false), onchange: () => { S.set("round", roundBox.checked); el.querySelectorAll(".as-icon").forEach((i) => i.classList.toggle("round", roundBox.checked)); } });
    const status = h("div", { "aria-live": "polite" });
    const res = h("section", { class: "as-res", "aria-label": "Kết quả" });

    el.append(
      h("div", { class: "as-form" },
        h("div", { class: "as-row" },
          h("div", { class: "field" }, h("label", { for: "as-link", text: "Link app trên App Store, hoặc tên app" }), linkIn),
          h("div", { class: "field" }, h("label", { for: "as-country", text: "App Store quốc gia" }), country)),
        h("small", { class: "hint", text: "Trên iPhone: mở app trong App Store → nút Chia sẻ → Sao chép liên kết. Trên máy tính: tìm app trên apps.apple.com rồi sao chép link." }),
        h("div", { class: "row" }, goBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; go(); } }, "Thử với app mẫu")),
        h("label", { class: "switch" }, roundBox, h("span", null, "Bo góc icon như trên iPhone", h("small", { text: "Apple lưu icon hình vuông; bật để tải PNG đã bo góc, nền trong suốt." }))),
        h("p", { class: "hint", text: "Icon và ảnh chụp thuộc bản quyền của nhà phát triển app: dùng để tham khảo, viết bài giới thiệu, làm tư liệu cá nhân, hoặc khi được cho phép." })),
      status, res);

    async function getJson(url, signal) {
      let r;
      try { r = await fetch(url, { credentials: "omit", signal }); }
      catch (e) { if (e.name === "AbortError") throw e; throw userErr("Không kết nối được tới Apple (itunes.apple.com). Hãy kiểm tra mạng rồi thử lại."); }
      if (r.status === 403 || r.status === 429) throw userErr("Apple đang tạm chặn tìm kiếm từ mạng của bạn. Hãy dán link app thay vì tên, hoặc thử lại sau ít phút.");
      if (!r.ok) throw userErr(`Apple báo lỗi HTTP ${r.status}.`);
      return r.json();
    }

    async function go() {
      const p = parseAppStore(linkIn.value);
      if (!p) { say(status, "err", "Chưa nhận ra link. Dán link dạng https://apps.apple.com/vn/app/ten-app/id123456789, hoặc gõ tên app."); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim().slice(0, 300));
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      goBtn.disabled = true; res.textContent = ""; app = null;
      say(status, "info", p.id ? "Đang lấy thông tin app…" : `Đang tìm “${p.term}”…`);
      try {
        if (p.id) {
          // app có thể không bán ở quốc gia đã chọn: thử thêm Mỹ và Việt Nam
          const tries = [...new Set([p.country || country.value, "us", "vn"])];
          let r = null;
          for (const c of tries) {
            const j = await getJson(lookupUrl(p.id, c), ac.signal);
            if (j.results && j.results.length) { r = j.results[0]; break; }
          }
          if (!r) throw userErr("Không tìm thấy app này. App có thể đã bị gỡ khỏi App Store hoặc mã app sai.");
          say(status, "", "");
          showApp(appInfo(r));
        } else {
          const j = await getJson(searchUrl(p.term, country.value), ac.signal);
          const list = (j.results || []).map(appInfo);
          if (!list.length) throw userErr(`Không tìm thấy app nào tên “${p.term}” trên App Store ${COUNTRIES.find((c) => c[0] === country.value)[1]}. Thử đổi quốc gia hoặc dán link app.`);
          say(status, "info", "Chọn app cần lấy ảnh:");
          res.append(h("div", { class: "as-list", role: "list" }, list.map((a) => h("button", { class: "as-pick", type: "button", role: "listitem", onclick: () => { say(status, "", ""); res.textContent = ""; showApp(a); } },
            h("img", { src: sizedUrl(a.icon, 120, "jpg"), alt: "", loading: "lazy" }), h("span", null, h("b", { text: a.name }), h("small", { text: `${a.dev} · ${a.genre}` }))))));
        }
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; goBtn.disabled = false; } }
    }

    /* --- một app --- */
    function showApp(a) {
      app = a;
      const box = h("article", { class: "as-app" });
      const round = roundBox.checked;
      box.append(h("div", { class: "as-head" },
        h("img", { class: "as-icon" + (round ? " round" : ""), src: sizedUrl(a.icon, 256), alt: "Icon " + a.name, width: 128, height: 128 }),
        h("div", null, h("h2", { text: a.name }), h("p", { class: "hint", style: { margin: "4px 0 0" } }, `${a.dev}${a.genre ? " · " + a.genre : ""} · `,
          h("a", { href: a.url, target: "_blank", rel: "noopener", text: "Mở trên App Store" })))));
      box.append(h("h3", { class: "as-sub", text: "Icon" }),
        h("div", { class: "as-sizes" }, SIZES.map((s) => h("button", { class: "btn ghost sm", type: "button", onclick: (e) => saveIcon(s, e.currentTarget) }, btnIcon("download"), `${s}×${s}`))));
      let total = 0;
      for (const [k, label] of KINDS) {
        const shots = a[k];
        if (!shots.length) continue;
        total += shots.length;
        box.append(h("h3", { class: "as-sub", text: `${label} (${shots.length})` }),
          h("div", { class: "as-shots", role: "list" }, shots.map((u, i) => h("button", { class: "as-shot", type: "button", role: "listitem", "aria-label": `${label} ${i + 1}: tải cỡ gốc`, onclick: (e) => saveShot(k, u, i, e.currentTarget) },
            h("img", { src: u, alt: "", loading: "lazy" }), h("small", { text: `${i + 1} · tải cỡ gốc` })))));
      }
      if (!total) box.append(h("p", { class: "hint", text: "App này không có ảnh chụp màn hình công khai trên App Store (thường gặp với app chỉ có trên Mac hoặc app mới gỡ ảnh)." }));
      const zipStatus = h("div", { "aria-live": "polite" });
      const zipBtn = h("button", { class: "btn big", type: "button", onclick: () => saveAll(zipBtn, zipStatus) }, btnIcon("file-archive"), `Tải icon + ${total} ảnh chụp (.zip)`);
      box.append(h("div", { class: "row" }, zipBtn), zipStatus);
      res.append(box);
      box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    async function iconBlob(size, signal) {
      const blob = await fetchBlob(sizedUrl(app.icon, size, "png"), signal, { host: "máy chủ ảnh của Apple (mzstatic.com)" });
      if (!roundBox.checked) return blob;
      const bmp = await createImageBitmap(blob);
      const c = canvasOf(bmp.width, bmp.height), g = c.getContext("2d"), r = iosRadius(bmp.width);
      g.beginPath();
      if (g.roundRect) g.roundRect(0, 0, bmp.width, bmp.height, r); else g.rect(0, 0, bmp.width, bmp.height);
      g.clip();
      g.drawImage(bmp, 0, 0);
      bmp.close && bmp.close();
      return toBlob(c, "image/png");
    }
    async function busyRun(btn, fn) {
      btn.disabled = true;
      try { await fn(); }
      catch (e) { if (e.name !== "AbortError") ctx.toast(e.userMsg || "Không tải được ảnh này.", { type: "err" }); if (!e.userMsg) console.error(e); }
      finally { btn.disabled = false; }
    }
    const saveIcon = (size, btn) => busyRun(btn, async () => save(await iconBlob(size), iconName(app.name, size, "png")));
    const saveShot = (kind, url, i, btn) => busyRun(btn, async () => save(await fetchBlob(sizedUrl(url, "max"), null, { host: "máy chủ ảnh của Apple (mzstatic.com)" }), shotName(app.name, kind, i, "png")));

    async function saveAll(btn, box) {
      btn.disabled = true;
      const a = app, jobs = [];
      for (const [k] of KINDS) a[k].forEach((u, i) => jobs.push({ url: sizedUrl(u, "max"), name: shotName(a.name, k, i, "png") }));
      try {
        const files = [{ name: iconName(a.name, 1024, "png"), blob: await iconBlob(1024) }];
        let done = 0;
        say(box, "info", `Đang tải 1/${jobs.length + 1} ảnh…`);
        await pool(jobs, 4, async (j) => {
          files.push({ name: j.name, blob: await fetchBlob(j.url, null, { host: "máy chủ ảnh của Apple (mzstatic.com)" }) });
          say(box, "info", `Đang tải ${++done + 1}/${jobs.length + 1} ảnh…`);
        });
        files.sort((x, y) => x.name.localeCompare(y.name));
        const z = await zip(files);
        const name = iconName(a.name, 0, "zip").replace("-icon-0", "-app-store");
        save(z, name);
        say(box, "ok", `Đã tạo ${name}: ${files.length} ảnh (${fmtSize(z.size)}).`);
      } catch (e) { say(box, "err", e.userMsg || "Không tạo được file .zip."); if (!e.userMsg) console.error(e); }
      finally { btn.disabled = false; }
    }
  }
});
