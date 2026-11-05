/* Tải font Google Fonts: tìm font (lọc font có tiếng Việt), xem trước bằng chữ của bạn, chọn độ đậm, kiểu, bộ ký tự rồi tải
   - Cho website: file WOFF2 (tuỳ chọn thêm WOFF) chia theo bộ ký tự như Google Fonts + đoạn CSS @font-face để tự host.
     Danh sách và file lấy từ Fontsource (api.fontsource.org, cdn.jsdelivr.net), nơi đóng gói lại đúng font của Google Fonts.
   - Cài vào máy: file TTF gốc trong kho github.com/google/fonts (raw.githubusercontent.com), kèm file giấy phép.
   Mọi nguồn đều cho trang web gọi thẳng; không qua máy chủ nào của BbeTools. */
import { h, save, zip, copyText, fmtSize, debounce, LANG } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { API, RANGES, filterFonts, previewVariant, defaultSubsets, sortSubsets, buildCss, weightName, licenseDirs, metadataUrl, ghFileUrl, parseMetadata, pickTtf, LICENSE_FILE, fileName } from "../lib/gfonts.js";
import { say, btnIcon, pool, fetchBlob, userErr } from "../sticker.js";

const PAGE = 24;
const SAMPLE = "Tiếng Việt có dấu: Ăn quả nhớ kẻ trồng cây";
const CATS = [["all", "Tất cả"], ["sans-serif", "Không chân"], ["serif", "Có chân"], ["display", "Trang trí"], ["handwriting", "Viết tay"], ["monospace", "Đơn cách"]];
const CAT_NAME = Object.fromEntries(CATS);
const SUBSET_NAME = { vietnamese: "Tiếng Việt", latin: "Latin (chữ cái, số, dấu câu cơ bản)", "latin-ext": "Latin mở rộng (tiếng Pháp, Đức, Ba Lan…)" };

const css = document.createElement("style");
css.textContent = `
.gf-form{display:flex;flex-direction:column;gap:14px}
.gf-row{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));align-items:end}
.gf-cats{display:flex;flex-wrap:wrap;gap:6px}
.gf-cats .chip{cursor:pointer;font:inherit;font-weight:600;font-size:14px}
.gf-cats .chip[aria-pressed=true]{background:color-mix(in oklab,var(--brand) 80%,#000);color:#fff;border-color:transparent}
.gf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:14px}
.gf-card{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;text-align:left;cursor:pointer;min-width:0}
.gf-card:hover,.gf-card:focus-visible{border-color:var(--brand)}
.gf-card[aria-current=true]{border-color:var(--brand);box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 30%,transparent)}
.gf-card b{font-size:14px}
.gf-card .s{font-size:23px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:30px;transition:opacity .2s}
.gf-card .s.wait{opacity:.35}
.gf-card small{color:var(--muted);font-size:12.5px}
.gf-more{margin-top:12px}
.gf-detail{margin-top:18px;display:flex;flex-direction:column;gap:16px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.gf-detail h2{margin:0;font-size:21px}
.gf-ws{display:flex;flex-direction:column;gap:2px}
.gf-w{display:grid;grid-template-columns:auto 118px minmax(0,1fr);gap:10px;align-items:center;padding:6px 4px;border-radius:8px;cursor:pointer}
.gf-w:hover{background:var(--surface-2)}
.gf-w span{font-size:13px;color:var(--muted)}
.gf-w .s{font-size:22px;line-height:1.3;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gf-checks{display:flex;flex-wrap:wrap;gap:8px 18px}
.gf-checks label{display:flex;gap:8px;align-items:center;cursor:pointer}
.gf-css{margin:0;max-height:300px;overflow:auto;white-space:pre;background:var(--surface-2);padding:12px;border-radius:10px;font-size:12.5px;line-height:1.5}
@media (max-width:560px){.gf-w{grid-template-columns:auto minmax(0,1fr)}.gf-w .s{grid-column:1/-1}}
`;
document.head.append(css);

/* ---------- nạp font để xem trước (FontFace, chỉ bộ latin + tiếng Việt) ---------- */
const loaded = new Map();
function loadFace(f, ver, weight, style, variants) {
  const key = `${f.id}|${weight}|${style}`;
  if (loaded.has(key)) return loaded.get(key);
  const subs = ["latin", "vietnamese"].filter((s) => f.subsets.includes(s));
  if (!subs.length) subs.push(f.defSubset || f.subsets[0]);
  const p = Promise.all(subs.map((s) => {
    const url = variants ? variants?.[weight]?.[style]?.[s]?.url?.woff2 : `https://cdn.jsdelivr.net/fontsource/fonts/${f.id}@${ver || "latest"}/${s}-${weight}-${style}.woff2`;
    if (!url) return null;
    const face = new FontFace("gf-" + f.id, `url("${url}") format("woff2")`, { weight: String(weight), style, display: "swap", ...(RANGES[s] ? { unicodeRange: RANGES[s] } : {}) });
    document.fonts.add(face);
    return face.load().catch(() => null);
  }));
  loaded.set(key, p);
  return p;
}
const fontStack = (f) => `"gf-${f.id}", system-ui, sans-serif`;

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let all = null, shown = [], limit = PAGE, cur = null, busy = null, cat = S.get("cat", "all");

    const qIn = h("input", { id: "gf-q", type: "search", autocomplete: "off", spellcheck: "false", placeholder: "Roboto, Be Vietnam Pro, Montserrat…", value: S.get("q", "") });
    const sampleIn = h("input", { id: "gf-sample", type: "text", value: S.get("sample", SAMPLE), maxlength: 120 });
    const vnBox = h("input", { type: "checkbox", checked: S.get("vn", LANG === "vi") });
    const catBtns = h("div", { class: "gf-cats", role: "group", "aria-label": "Kiểu font" }, CATS.map(([v, l]) =>
      h("button", { class: "chip", type: "button", "aria-pressed": String(v === cat), "data-v": v, text: l, onclick: () => { cat = v; S.set("cat", v); catBtns.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v))); refilter(); } })));
    const status = h("div", { "aria-live": "polite" });
    const grid = h("div", { class: "gf-grid", role: "list", "aria-label": "Danh sách font" });
    const more = h("button", { class: "btn ghost gf-more", type: "button", hidden: true, onclick: () => { limit += PAGE; renderGrid(); } });
    const detail = h("section", { class: "gf-detail", hidden: true, "aria-label": "Tải font" });

    el.append(
      h("div", { class: "gf-form" },
        h("div", { class: "gf-row" },
          h("div", { class: "field" }, h("label", { for: "gf-q", text: "Tìm font" }), qIn),
          h("div", { class: "field" }, h("label", { for: "gf-sample", text: "Chữ xem trước" }), sampleIn)),
        catBtns,
        h("label", { class: "switch" }, vnBox, h("span", null, "Chỉ font có tiếng Việt", h("small", { text: "Font có đủ dấu tiếng Việt (ă, ơ, ư, đ, ạ, ỹ…), không bị lỗi chữ." }))),
        h("p", { class: "hint", text: "Font trên Google Fonts dùng miễn phí, kể cả cho mục đích thương mại, theo giấy phép mở đi kèm (thường là SIL Open Font License)." })),
      status, detail, grid, more);

    qIn.addEventListener("input", debounce(() => { S.set("q", qIn.value.slice(0, 80)); refilter(); }, 150));
    vnBox.addEventListener("change", () => { S.set("vn", vnBox.checked); refilter(); });
    sampleIn.addEventListener("input", () => {
      S.set("sample", sampleIn.value);
      el.querySelectorAll(".gf-card .s, .gf-w .s").forEach((s) => { s.textContent = sampleText(); });
    });
    const sampleText = () => sampleIn.value.trim() || SAMPLE;

    /* --- danh sách --- */
    const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target._load(); } }), { rootMargin: "200px" }) : null;
    function refilter() {
      if (!all) return;
      shown = filterFonts(all, { q: qIn.value, vn: vnBox.checked, category: cat });
      limit = PAGE;
      renderGrid();
      say(status, shown.length ? "" : "info", shown.length ? "" : "Không có font nào khớp. Thử bỏ dấu, đổi kiểu font hoặc tắt “Chỉ font có tiếng Việt”.");
    }
    function renderGrid() {
      grid.textContent = "";
      for (const f of shown.slice(0, limit)) {
        const s = h("span", { class: "s wait", text: sampleText(), style: { fontFamily: fontStack(f) } });
        const pv = previewVariant(f);
        s.style.fontWeight = pv.weight; s.style.fontStyle = pv.style;
        const b = h("button", { class: "gf-card", type: "button", role: "listitem", "aria-current": String(!!cur && cur.f.id === f.id), "data-id": f.id, "aria-label": "Chọn font " + f.family, onclick: () => openFont(f) },
          h("b", { text: f.family }), s,
          h("small", { text: `${CAT_NAME[f.category] || f.category} · ${f.weights.length} độ đậm${f.styles.includes("italic") ? " · có nghiêng" : ""}` }));
        b._load = () => loadFace(f, null, pv.weight, pv.style).then(() => s.classList.remove("wait"));
        grid.append(b);
        if (io) io.observe(b); else b._load();
      }
      const left = shown.length - limit;
      more.hidden = left <= 0;
      more.textContent = `Xem thêm ${Math.min(PAGE, left)} font (còn ${left})`;
    }

    /* --- một font --- */
    async function openFont(f) {
      grid.querySelectorAll(".gf-card").forEach((c) => c.setAttribute("aria-current", String(c.dataset.id === f.id)));
      detail.hidden = false;
      detail.textContent = "";
      detail.append(h("p", { class: "hint", html: '<span class="spinner sm"></span> ' }));
      detail.querySelector("p").append("Đang lấy thông tin font " + f.family + "…");
      detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
      let d;
      try {
        const r = await fetch(`${API}/${encodeURIComponent(f.id)}`, { credentials: "omit" });
        if (!r.ok) throw userErr(`Fontsource báo lỗi HTTP ${r.status}.`);
        d = await r.json();
      } catch (e) {
        detail.textContent = "";
        say(detail, "err", e.userMsg || "Không kết nối được tới api.fontsource.org. Hãy kiểm tra mạng rồi thử lại.");
        return;
      }
      cur = { f, d, weights: new Set([previewVariant(d).weight]), styles: new Set(["normal"].filter((x) => d.styles.includes(x)).concat(d.styles.includes("normal") ? [] : [d.styles[0]])), subsets: new Set(defaultSubsets(d)) };
      renderDetail();
    }

    function renderDetail() {
      const { f, d } = cur;
      const mode = S.get("mode", "web");
      detail.textContent = "";
      const spec = "https://fonts.google.com/specimen/" + d.family.replace(/ /g, "+");
      detail.append(h("div", null,
        h("h2", { text: d.family }),
        h("p", { class: "hint", style: { margin: "4px 0 0" } }, `${CAT_NAME[d.category] || d.category} · ${d.weights.length} độ đậm · giấy phép ${d.license} · `,
          h("a", { href: spec, target: "_blank", rel: "noopener", text: "Xem trên Google Fonts" }))));

      // độ đậm, mỗi dòng xem trước bằng đúng độ đậm đó
      const style = cur.styles.has("normal") ? "normal" : d.styles[0];
      const ws = h("div", { class: "gf-ws", role: "group", "aria-label": "Độ đậm" });
      for (const w of d.weights) {
        const s = h("span", { class: "s", text: sampleText(), style: { fontFamily: fontStack(f), fontWeight: w, fontStyle: style } });
        loadFace(f, d.npmVersion, w, style, d.variants);
        const cb = h("input", { type: "checkbox", checked: cur.weights.has(w), onchange: () => { cb.checked ? cur.weights.add(w) : cur.weights.delete(w); update(); } });
        ws.append(h("label", { class: "gf-w" }, cb, h("span", { text: `${w} · ${weightName(w)}` }), s));
      }
      const allW = h("button", { class: "btn ghost sm", type: "button", text: "Chọn tất cả độ đậm", onclick: () => { d.weights.forEach((w) => cur.weights.add(w)); renderDetail(); } });
      detail.append(h("div", { class: "field" }, h("span", { text: "Độ đậm" }), ws, h("div", null, allW)));

      if (d.styles.length > 1) detail.append(h("div", { class: "field" }, h("span", { text: "Kiểu chữ" }),
        h("div", { class: "gf-checks" }, d.styles.slice().sort().reverse().map((st) => h("label", null,
          h("input", { type: "checkbox", checked: cur.styles.has(st), onchange: (e) => { e.target.checked ? cur.styles.add(st) : cur.styles.delete(st); renderDetail(); } }),
          st === "normal" ? "Thường" : "Nghiêng")))));

      const modeSeg = h("div", { class: "seg full", role: "radiogroup", "aria-label": "Dùng font để" }, [["web", "Cho website (WOFF2 + CSS)"], ["ttf", "Cài vào máy tính (TTF)"]].map(([v, l]) =>
        h("label", null, h("input", { type: "radio", name: "gf-mode", value: v, checked: v === mode, onchange: () => { S.set("mode", v); renderDetail(); } }), h("span", { text: l }))));
      detail.append(h("div", { class: "field" }, h("span", { text: "Dùng font để" }), modeSeg));

      let cssPre = null, woffBox = null, dirIn = null;
      if (mode === "web") {
        detail.append(h("div", { class: "field" }, h("span", { text: "Bộ ký tự" }),
          h("div", { class: "gf-checks" }, sortSubsets(d.subsets).reverse().map((s) => h("label", null,
            h("input", { type: "checkbox", checked: cur.subsets.has(s), onchange: (e) => { e.target.checked ? cur.subsets.add(s) : cur.subsets.delete(s); update(); } }),
            SUBSET_NAME[s] || s))),
          h("small", { text: "Viết tiếng Việt cần cả “Tiếng Việt” và “Latin”. Trình duyệt chỉ tải bộ nào trang thật sự dùng tới (unicode-range), như Google Fonts." })));
        woffBox = h("input", { type: "checkbox", checked: S.get("woff", false), onchange: () => { S.set("woff", woffBox.checked); update(); } });
        dirIn = h("input", { id: "gf-dir", type: "text", value: S.get("dir", "fonts/"), spellcheck: "false", autocomplete: "off" });
        dirIn.addEventListener("input", () => { S.set("dir", dirIn.value.slice(0, 120)); update(); });
        cssPre = h("pre", { class: "gf-css mono", tabindex: "0", "aria-label": "Đoạn CSS" });
        detail.append(
          h("div", { class: "gf-row" },
            h("div", { class: "field" }, h("label", { for: "gf-dir", text: "Thư mục chứa font (đường dẫn trong CSS)" }), dirIn),
            h("label", { class: "switch" }, woffBox, h("span", null, "Kèm file WOFF", h("small", { text: "Chỉ cần cho trình duyệt rất cũ (trước 2016)." })))),
          h("div", { class: "field" }, h("span", { text: "Đoạn CSS" }), cssPre,
            h("div", null, h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(cssPre.textContent, "Đã sao chép CSS") }, btnIcon("copy"), "Sao chép CSS"))));
      } else {
        detail.append(h("p", { class: "hint", text: "File TTF gốc trong kho của Google Fonts trên GitHub, đủ mọi bộ ký tự, dùng được trong Word, PowerPoint, Photoshop, Figma, Canva… Mở file .ttf rồi bấm “Cài đặt” (Install)." }));
      }

      const dlBtn = h("button", { class: "btn big", type: "button", onclick: () => (mode === "web" ? downloadWeb() : downloadTtf()) }, btnIcon("download"), h("span"));
      const dlStatus = h("div", { "aria-live": "polite" });
      detail.append(h("div", { class: "row" }, dlBtn), dlStatus);

      function update() {
        const variants = selVariants();
        const n = mode === "web" ? variants.length * cur.subsets.size * (woffBox.checked ? 2 : 1) : 0;
        dlBtn.querySelector("span:last-child").textContent = mode === "web" ? `Tải ${n} file font + CSS (.zip)` : "Tải file TTF (.zip)";
        dlBtn.disabled = !variants.length || (mode === "web" && !cur.subsets.size);
        if (cssPre) cssPre.textContent = variants.length && cur.subsets.size ? webCss() : "/* Chọn ít nhất một độ đậm và một bộ ký tự */";
      }
      cur.update = update; cur.dlStatus = dlStatus; cur.dlBtn = dlBtn; cur.woff = () => woffBox && woffBox.checked; cur.dir = () => (dirIn ? dirIn.value.trim() : "fonts/");
      update();
    }

    const selVariants = () => {
      const { d } = cur, out = [];
      for (const st of d.styles) if (cur.styles.has(st)) for (const w of d.weights) if (cur.weights.has(w) && d.variants?.[w]?.[st]) out.push({ weight: w, style: st });
      return out;
    };
    const formats = () => (cur.woff() ? ["woff2", "woff"] : ["woff2"]);
    const webCss = () => buildCss({ family: cur.d.family, id: cur.d.id, license: cur.d.license, category: cur.d.category, variants: selVariants(),
      subsets: [...cur.subsets], unicodeRange: cur.d.unicodeRange, formats: formats(), dir: cur.dir() });

    async function run(fn) {
      if (busy) return;
      busy = new AbortController();
      cur.dlBtn.disabled = true;
      try { await fn(busy.signal); }
      catch (e) { if (e.name !== "AbortError") { say(cur.dlStatus, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); } }
      finally { busy = null; cur.update(); }
    }

    function downloadWeb() {
      return run(async (signal) => {
        const { d } = cur, jobs = [];
        const dir = cur.dir().replace(/^\.?\//, "").replace(/^(\.\.\/)+/, "");
        const folder = dir && !dir.endsWith("/") ? dir + "/" : dir;
        for (const v of selVariants()) for (const s of cur.subsets) for (const ext of formats()) {
          const url = d.variants[v.weight][v.style]?.[s]?.url?.[ext];
          if (url) jobs.push({ url, name: folder + fileName(d.id, s, v.weight, v.style, ext) });
        }
        let done = 0;
        const files = [];
        say(cur.dlStatus, "info", `Đang tải 0/${jobs.length} file…`);
        await pool(jobs, 6, async (j) => {
          files.push({ name: j.name, blob: await fetchBlob(j.url, signal, { host: "jsDelivr (cdn.jsdelivr.net)" }) });
          say(cur.dlStatus, "info", `Đang tải ${++done}/${jobs.length} file…`);
        }, signal);
        files.sort((a, b) => a.name.localeCompare(b.name));
        files.push({ name: d.id + ".css", blob: new Blob([webCss()], { type: "text/css" }) });
        const lic = await licenseText(d, signal);
        if (lic) files.push(lic);
        const z = await zip(files);
        save(z, `${d.id}-webfont.zip`);
        say(cur.dlStatus, "ok", `Đã tạo ${d.id}-webfont.zip: ${jobs.length} file font, file ${d.id}.css (${fmtSize(z.size)}). Giải nén vào website rồi nhúng file CSS.`);
      });
    }

    async function findMeta(d, signal) {
      for (const dir of licenseDirs(d.license)) {
        let r;
        try { r = await fetch(metadataUrl(dir, d.family), { credentials: "omit", signal }); }
        catch (e) { if (e.name === "AbortError") throw e; throw userErr("Không kết nối được tới GitHub (raw.githubusercontent.com). Hãy kiểm tra mạng rồi thử lại."); }
        if (r.ok) return { dir, meta: parseMetadata(await r.text()) };
      }
      return null;
    }
    async function licenseText(d, signal) {
      try {
        const m = await findMeta(d, signal);
        if (!m) return null;
        const r = await fetch(ghFileUrl(m.dir, d.family, LICENSE_FILE[m.dir]), { credentials: "omit", signal });
        return r.ok ? { name: LICENSE_FILE[m.dir], blob: await r.blob() } : null;
      } catch (e) { if (e.name === "AbortError") throw e; return null; }
    }

    function downloadTtf() {
      return run(async (signal) => {
        const { d } = cur;
        say(cur.dlStatus, "info", "Đang tìm file TTF gốc trong kho google/fonts…");
        const m = await findMeta(d, signal);
        if (!m) throw userErr("Không tìm thấy font này trong kho google/fonts trên GitHub. Hãy chọn “Cho website” để tải bản WOFF2, hoặc tải từ trang Google Fonts.");
        const names = pickTtf(m.meta, [...cur.weights], [...cur.styles]);
        if (!names.length) throw userErr("Kho google/fonts không có file cho độ đậm, kiểu đã chọn. Hãy chọn thêm độ đậm khác.");
        const files = [];
        let done = 0;
        await pool(names, 4, async (n) => {
          files.push({ name: `${d.family}/${n}`, blob: await fetchBlob(ghFileUrl(m.dir, d.family, n), signal, { host: "GitHub (raw.githubusercontent.com)" }) });
          say(cur.dlStatus, "info", `Đang tải ${++done}/${names.length} file TTF…`);
        }, signal);
        files.sort((a, b) => a.name.localeCompare(b.name));
        try { files.push({ name: `${d.family}/${LICENSE_FILE[m.dir]}`, blob: await fetchBlob(ghFileUrl(m.dir, d.family, LICENSE_FILE[m.dir]), signal, { retries: 0 }) }); }
        catch (e) { if (e.name === "AbortError") throw e; }
        const z = await zip(files);
        save(z, `${d.id}-ttf.zip`);
        say(cur.dlStatus, "ok", `Đã tạo ${d.id}-ttf.zip: ${names.length} file TTF (${fmtSize(z.size)}).` +
          (m.meta.variable ? " Đây là font biến thiên (variable): một file chứa mọi độ đậm, chọn độ đậm trong phần mềm." : ""));
      });
    }

    /* --- tải danh sách --- */
    (async () => {
      say(status, "info", "Đang tải danh sách font…");
      try {
        const r = await fetch(API, { credentials: "omit" });
        if (!r.ok) throw userErr(`Fontsource báo lỗi HTTP ${r.status}.`);
        all = await r.json();
        say(status, "", "");
        refilter();
      } catch (e) {
        say(status, "err", e.userMsg || "Không tải được danh sách font từ api.fontsource.org. Hãy kiểm tra mạng rồi tải lại trang.");
      }
    })();
  }
});
