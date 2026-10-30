#!/usr/bin/env node
/* Sinh toàn bộ trang tĩnh từ tools.json:
     index.html, nhom/<nhóm>/index.html, <slug>/index.html, gioi-thieu/index.html, 404.html,
     sitemap.xml, robots.txt, manifest.webmanifest, assets/registry.js
   và bản ngôn ngữ khác (xem scripts/i18n.js): en/index.html, en/category/<nhóm>/, en/<id>/, en/about/,
     assets/en/registry.js, assets/en/**.js (module JS đã dịch chuỗi)
   Kết quả được commit thẳng vào repo; GitHub Pages phục vụ nguyên trạng, không cần bước build khi deploy.
   Chạy:  node scripts/build.js        (hoặc npm run build)
          node scripts/build.js --check    chỉ kiểm tra file sinh ra đã khớp chưa
          node scripts/build.js --missing  in các câu của khung trang chưa dịch (i18n/<lang>/pages.json) */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { loadRegistry, validate, isLive, ROOT } from "./registry.js";
import { LANGS, inLang, langData, langFiles, compile, lookupFor, loadJson, hasVi } from "./i18n.js";
import { describeAccept as describeAcceptVi } from "../assets/lib/filetype.js";

const reg = await loadRegistry();
const errors = validate(reg);
if (errors.length) {
  console.error("tools.json có lỗi:\n- " + errors.join("\n- "));
  process.exit(1);
}

const { site } = reg;
const BASE = site.baseUrl;                         // https://springbbe.github.io/bbetools/
const BASE_PATH = new URL(BASE).pathname;          // /bbetools/
const YEAR = new Date().getFullYear();
const CHECK = process.argv.includes("--check"); // chỉ kiểm tra file sinh ra đã khớp registry chưa, không ghi
const LANG_CODES = ["vi", ...Object.keys(LANGS)];

/* ---------- helpers ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name, root, cls = "") => `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="${root}assets/icons.svg#${name}"></use></svg>`;
const jsonld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const metaDesc = (s) => (s.length > 155 ? s.slice(0, 152).replace(/\s+\S*$/, "") + "…" : s);
const fmtDate = (iso, lang) => { const [y, m, d] = iso.split("-"); return lang === "vi" ? `${d}/${m}/${y}` : new Date(Date.UTC(+y, +m - 1, +d)).toLocaleDateString(LANGS[lang].locale, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }); };
const rootOf = (path) => "../".repeat(path.split("/").length - 1) || "./";

const LOGO = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--logo)"/><path d="M10 7.5h7.2c3.3 0 5.4 1.8 5.4 4.5 0 1.9-1 3.2-2.6 3.8 2.1.5 3.5 2.1 3.5 4.3 0 3.1-2.4 5.1-6 5.1H10z" fill="#fff"/><path d="M14.2 11v3.6h2.6c1.3 0 2-.7 2-1.8s-.7-1.8-2-1.8zm0 6.9v4h3c1.5 0 2.3-.8 2.3-2s-.8-2-2.3-2z" fill="var(--logo)"/><circle cx="25.5" cy="7" r="2.6" fill="#FFC53D"/></svg>`;

/* ---------- ngữ cảnh từng ngôn ngữ ---------- */
const missingPages = new Map(); // lang → Set(câu chưa dịch)
async function makeLang(lang) {
  const vi = lang === "vi";
  const D = vi ? null : await langData(lang);
  const dict = vi ? {} : (await loadJson(`i18n/${lang}/pages.json`)) || {};
  const miss = new Set();
  missingPages.set(lang, miss);
  /** Câu của khung trang: tr("Xem cả {0} công cụ", n) */
  const tr = (s, ...a) => {
    let v = s;
    if (!vi) { if (typeof dict[s] === "string") v = dict[s]; else miss.add(s); }
    return v.replace(/\{(\d+)\}/g, (m, i) => (a[i] != null ? a[i] : m));
  };
  const prefix = vi ? "" : lang + "/";
  const tools = [], skipped = [];
  for (const t of reg.tools.filter((x) => inLang(x, lang))) {
    if (vi) { tools.push(t); continue; }
    const x = D.tools[t.id];
    if (!x || !x.name || !x.desc) { skipped.push(t.id); continue; }
    tools.push({ ...t, ...x, slug: x.slug || t.id, aliases: [], vi: t });
  }
  const groups = reg.groups.map((g) => (vi ? g : { ...g, ...(D.groups[g.id] || {}), slug: g.id, vi: g }));
  const live = tools.filter(isLive);
  const L = {
    lang, vi, tr, prefix, locale: vi ? "vi-VN" : LANGS[lang].locale, og: vi ? "vi_VN" : LANGS[lang].og,
    site: vi ? site : { ...site, ...D.site }, D, skipped,
    live,
    byId: Object.fromEntries(tools.map((t) => [t.id, t])),
    groupOf: Object.fromEntries(groups.map((g) => [g.id, g])),
    liveIn: (gid) => live.filter((t) => t.group === gid),
    toolUrl: (t) => prefix + t.slug + "/",
    groupUrl: (g) => prefix + (vi ? "nhom/" : LANGS[lang].groups) + g.slug + "/",
    aboutUrl: prefix + (vi ? "gioi-thieu/" : LANGS[lang].about),
    homeUrl: prefix,
    js: (rel) => "assets/" + prefix + rel
  };
  L.liveGroups = groups.filter((g) => L.liveIn(g.id).length);
  L.describeAccept = vi ? describeAcceptVi : (await importCompiled(lang, "lib/filetype.js")).describeAccept;
  return L;
}
/** Nhập bản dịch của một module không có import (vd. lib/filetype.js) để dùng ngay trong build */
async function importCompiled(lang, rel) {
  const src = await readFile(ROOT + "assets/" + rel, "utf8");
  const { code } = compile(src, await lookupFor(lang, rel), rel);
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}

const LS = {};
for (const code of LANG_CODES) LS[code] = await makeLang(code);
/* Trang tương ứng ở các ngôn ngữ: khoá → { lang: đường dẫn } */
const alt = (key) => {
  const out = {};
  for (const code of LANG_CODES) {
    const L = LS[code];
    if (key === "home") out[code] = L.homeUrl;
    else if (key === "about") out[code] = L.aboutUrl;
    else if (key.startsWith("group:")) { const g = L.liveGroups.find((x) => x.id === key.slice(6)); if (g) out[code] = L.groupUrl(g); }
    else if (key.startsWith("tool:")) { const t = L.live.find((x) => x.id === key.slice(5)); if (t) out[code] = L.toolUrl(t); }
  }
  return out;
};

const tile = (L, t, root, cls = "") => {
  const g = L.groupOf[t.group] || t;
  return `<span class="tile${cls ? " " + cls : ""}" style="--c:${g.color}">${icon(t.icon, root)}</span>`;
};

function card(L, t, root, opts = {}) {
  const H = opts.h || "h3";
  const gc = (L.groupOf[t.group] || {}).color;
  return `<li class="card" data-id="${t.id}" data-group="${t.group}"${gc ? ` style="--c:${gc}"` : ""}>
<a class="card-link" href="${root}${L.toolUrl(t)}">${tile(L, t, root)}<span class="card-txt"><${H} class="card-name">${esc(t.name)}</${H}><span class="card-desc">${esc(t.desc)}</span></span></a>
<button class="star" type="button" data-fav="${t.id}" aria-pressed="false" aria-label="${esc(L.tr("Ghim {0} vào Yêu thích", t.name))}" hidden>${icon("star", root)}</button>
</li>`;
}
const cards = (L, list, root, opts) => `<ul class="cards">${list.map((t) => card(L, t, root, opts)).join("\n")}</ul>`;

function mega(L, root) {
  const { tr } = L;
  return `<div id="mega" class="mega" hidden>
<div class="mega-in">
<div class="mega-head"><b>${tr("Tất cả công cụ")}</b><button class="ib" type="button" data-close-mega aria-label="${tr("Đóng menu")}">${icon("x", root)}</button></div>
<div class="mega-grid">
${L.liveGroups.map((g) => {
  const list = L.liveIn(g.id);
  const shown = list.slice(0, 8);
  return `<section class="mega-col" style="--c:${g.color}"><h2><a href="${root}${L.groupUrl(g)}">${tile(L, g, root, "sm")}${esc(g.name)}</a></h2>
<ul>${shown.map((t) => `<li><a href="${root}${L.toolUrl(t)}">${esc(t.name)}</a></li>`).join("")}</ul>${list.length > shown.length ? `<a class="more" href="${root}${L.groupUrl(g)}">${tr("Xem cả {0} công cụ", list.length)} ${icon("arrow-right", root)}</a>` : ""}</section>`;
}).join("\n")}
</div>
</div>
</div>`;
}

/** Nút đổi ngôn ngữ: tới trang tương ứng, hoặc trang chủ của ngôn ngữ kia nếu công cụ chỉ có ở một ngôn ngữ */
function langSwitch(L, root, alts) {
  return LANG_CODES.filter((c) => c !== L.lang).map((c) => {
    const href = root + (alts[c] != null ? alts[c] : LS[c].homeUrl);
    const name = c === "vi" ? "Tiếng Việt" : LANGS[c].name, short = c === "vi" ? "VI" : LANGS[c].short;
    return `<a class="lang-switch" href="${href}" hreflang="${c}" lang="${c}" title="${name}" aria-label="${name}">${icon("languages", root)}<span>${short}</span></a>`;
  }).join("");
}

function header(L, root, alts) {
  const { tr } = L;
  return `<a class="skip" href="#main">${tr("Bỏ qua, tới nội dung chính")}</a>
<header class="top">
<div class="top-in">
<a class="brand" href="${root}${L.homeUrl}" aria-label="${tr("BbeTools – Trang chủ")}">${LOGO}<span>Bbe<b>Tools</b></span></a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mega">${icon("menu", root, "only-m")}<span class="nav-label">${tr("Tất cả công cụ")}</span>${icon("chevron-down", root, "only-d")}</button>
<button class="search-trigger" type="button" data-palette aria-label="${tr("Tìm công cụ (phím /)")}">${icon("search", root)}<span>${tr("Tìm công cụ…")}</span><kbd>/</kbd></button>
${langSwitch(L, root, alts)}
<button class="ib theme-toggle" type="button" data-theme-toggle aria-label="${tr("Đổi giao diện sáng/tối")}" title="${tr("Giao diện: tự động")}">${icon("monitor", root, "t-auto")}${icon("sun", root, "t-light")}${icon("moon", root, "t-dark")}</button>
</div>
${mega(L, root)}
</header>`;
}

function footer(L, root) {
  const { tr } = L;
  return `<footer class="foot">
<div class="foot-in">
<div class="foot-brand">
<a class="brand" href="${root}${L.homeUrl}">${LOGO}<span>Bbe<b>Tools</b></span></a>
<p>${tr("Công cụ tiện ích miễn phí cho người Việt. Mọi xử lý chạy ngay trên trình duyệt của bạn: <b>file không bao giờ rời khỏi máy</b>.")}</p>
</div>
<nav aria-label="${tr("Nhóm công cụ")}"><h2>${tr("Nhóm công cụ")}</h2><ul>${L.liveGroups.map((g) => `<li><a href="${root}${L.groupUrl(g)}">${esc(g.name)}</a></li>`).join("")}</ul></nav>
<nav aria-label="${tr("Về BbeTools")}"><h2>BbeTools</h2><ul>
<li><a href="${root}${L.aboutUrl}">${tr("Giới thiệu &amp; quyền riêng tư")}</a></li>
<li><a href="${site.repo}" rel="noopener">${tr("Mã nguồn trên GitHub")}</a></li>
<li><a href="${site.repo}/issues" rel="noopener">${tr("Góp ý, báo lỗi")}</a></li>
</ul></nav>
</div>
<p class="copy">© ${YEAR} BbeTools · ${tr("Không quảng cáo, không tải file lên máy chủ.")}</p>
</footer>`;
}

/* Google Analytics (site.gaId): chỉ gửi đường dẫn trang, bỏ phần ?… và #… vì một số công cụ lưu dữ liệu người dùng nhập
   (số tài khoản, số tiền, văn bản…) trên URL. btReplaceState là bản gốc của history.replaceState, lấy trước khi gtag.js
   kịp gắn bộ theo dõi đổi URL, để các công cụ cập nhật URL mà không tạo thêm lượt xem chứa dữ liệu (xem replaceUrl trong core.js). */
const analytics = () => (site.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>
<script>window.btReplaceState=history.replaceState.bind(history);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${site.gaId}",{page_location:location.origin+location.pathname});</script>
` : "");

function page(L, { path, key, title, desc, entry, ld, bodyAttrs = "", main, head = "", noindex = false, root = rootOf(path) }) {
  const abs = BASE + path;
  const alts = key ? alt(key) : {};
  const hreflang = !noindex && Object.keys(alts).length > 1
    ? Object.entries(alts).map(([c, u]) => `<link rel="alternate" hreflang="${c}" href="${BASE}${u}">`).join("\n") + (alts.vi != null ? `\n<link rel="alternate" hreflang="x-default" href="${BASE}${alts.vi}">` : "") + "\n"
    : "";
  return `<!doctype html>
<html lang="${L.lang}" data-root="${root}">
<head>
<meta charset="utf-8">
${analytics()}${head}<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc(desc))}">
${noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${abs}">`}
${hreflang}<meta name="generator" content="bbetools-build">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1F1B13" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="${L.og}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(metaDesc(desc))}">
<meta property="og:url" content="${abs}">
<meta property="og:image" content="${BASE}assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">
<link rel="manifest" href="${root}manifest.webmanifest">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="${root}assets/app.css">
<script>try{var t=localStorage.getItem("bt:theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="modulepreload" href="${root}${L.js("core.js")}">
<script type="module" src="${root}${entry}"></script>
${ld ? jsonld(ld) : ""}
</head>
<body${bodyAttrs ? " " + bodyAttrs : ""}>
${header(L, root, alts)}
<main id="main" tabindex="-1">
${main}
</main>
${footer(L, root)}
</body>
</html>
`;
}

const breadcrumbLd = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: BASE + url }))
});

/* ---------- trang chủ ---------- */
function homePage(L) {
  const { tr, live, liveGroups, liveIn } = L;
  const path = L.homeUrl, root = rootOf(path);
  const popular = live.filter((t) => t.popular);
  const main = `<section class="hero">
<div class="wrap hero-in">
<div class="hero-main">
<h1>${tr("Công cụ tiện ích <span class=\"nowrap\">cho người Việt</span>")}</h1>
<p class="lead">${tr("{0} công cụ miễn phí cho PDF, ảnh, văn bản, VietQR, lịch âm… Chạy ngay trên trình duyệt, <b>file không bao giờ rời khỏi máy bạn</b>.", live.length)}</p>
<form class="search-box" role="search" action="./" onsubmit="return false">
${icon("search", root)}
<input id="q" name="q" type="search" placeholder="${tr("Tìm: ghép pdf, nén ảnh, vietqr…")}" autocomplete="off" spellcheck="false" aria-label="${tr("Tìm công cụ")}" aria-controls="results" enterkeyhint="go">
<kbd class="only-d">/</kbd>
</form>
<p class="drop-hint">${icon("upload", root)}<span>${tr("Thả hoặc dán (Ctrl/⌘ + V) một file vào trang để được gợi ý công cụ phù hợp, hoặc <button type=\"button\" class=\"linkish\" data-pick-any>chọn file</button>.")}</span></p>
</div>
<nav aria-label="${tr("Nhóm công cụ")}"><ul class="hero-cats">
${liveGroups.map((g) => `<li><a href="#${tr("nhom-")}${g.slug}" data-filter="${g.id}" style="--c:${g.color}">${tile(L, g, root)}<b>${esc(g.name)}</b><small>${tr("{0} công cụ", liveIn(g.id).length)}</small></a></li>`).join("\n")}
</ul></nav>
</div>
</section>
<div class="wrap">
<section id="results" class="block" hidden aria-live="polite"><h2 id="results-title">${tr("Kết quả tìm kiếm")}</h2><ul class="cards" id="results-list"></ul><p class="empty" id="results-empty" hidden>${tr("Chưa có công cụ khớp. Thử gõ ngắn hơn hoặc không dấu, ví dụ “pdf”, “anh”, “qr”.")}</p></section>
<div id="home-main">
<section id="suggest" class="block" hidden></section>
<section id="favs" class="block" hidden><h2>${icon("star", root)} ${tr("Yêu thích")}</h2><ul class="cards"></ul></section>
<section id="recent" class="block" hidden><h2>${icon("history", root)} ${tr("Dùng gần đây")}</h2><ul class="cards"></ul></section>
<section class="block" id="popular"><h2>${icon("sparkles", root)} ${tr("Phổ biến")}</h2>${cards(L, popular, root)}</section>
<nav class="chips" aria-label="${tr("Lọc theo nhóm")}">
<div class="chips-in">
<a href="#tat-ca" class="chip" data-filter="all" aria-current="true">${tr("Tất cả")}</a>
${liveGroups.map((g) => `<a href="#${tr("nhom-")}${g.slug}" class="chip" data-filter="${g.id}" style="--c:${g.color}">${esc(g.name)} <small>${liveIn(g.id).length}</small></a>`).join("\n")}
</div>
</nav>
<div id="tat-ca">
${liveGroups.map((g) => `<section class="block group-block" id="${tr("nhom-")}${g.slug}" data-group="${g.id}">
<h2 class="tab"><a href="${root}${L.groupUrl(g)}" style="--c:${g.color}">${icon(g.icon, root)}${esc(g.name)}</a> <small>${tr("{0} công cụ", liveIn(g.id).length)}</small></h2>
${cards(L, liveIn(g.id), root)}
</section>`).join("\n")}
</div>
</div>
</div>`;
  const url = BASE + path;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: site.name, url, inLanguage: L.lang, description: L.site.description,
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: url + "?q={search_term_string}" }, "query-input": "required name=search_term_string" } },
      { "@type": "ItemList", name: tr("Công cụ phổ biến"), itemListElement: popular.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: BASE + L.toolUrl(t) })) }
    ]
  };
  return page(L, { path, key: "home", title: `${site.name} – ${L.site.tagline}`, desc: L.site.description, entry: L.js("home.js"), ld, bodyAttrs: 'class="home"', main });
}

/* ---------- trang nhóm ---------- */
function groupPage(L, g) {
  const { tr } = L;
  const path = L.groupUrl(g), root = rootOf(path);
  const list = L.liveIn(g.id);
  const main = `<div class="tool-page band-page" style="--c:${g.color}">
<div class="tool-band">
<div class="wrap">
<nav class="crumbs" aria-label="${tr("Đường dẫn")}"><ol><li><a href="${root}${L.homeUrl}">${tr("Trang chủ")}</a></li><li><span aria-current="page">${esc(g.name)}</span></li></ol></nav>
<header class="tool-head">${tile(L, g, root, "lg")}<div class="tool-title"><h1>${esc(tr("Công cụ {0}", g.name))}</h1><p class="lead">${esc(g.desc)} ${tr("{0} công cụ miễn phí, chạy ngay trên trình duyệt.", list.length)}</p></div></header>
</div>
</div>
<div class="wrap">
${cards(L, list, root, { h: "h2" })}
<section class="block"><h2>${tr("Nhóm khác")}</h2><ul class="chip-list">${L.liveGroups.filter((x) => x !== g).map((x) => `<li><a class="chip" href="${root}${L.groupUrl(x)}">${tile(L, x, root, "xs")}${esc(x.name)}</a></li>`).join("")}</ul></section>
</div>
</div>`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: tr("Công cụ {0}", g.name), url: BASE + path, inLanguage: L.lang, description: g.desc,
        mainEntity: { "@type": "ItemList", itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: BASE + L.toolUrl(t) })) } },
      breadcrumbLd([[tr("Trang chủ"), L.homeUrl], [g.name, path]])
    ]
  };
  return page(L, { path, key: "group:" + g.id, title: `${tr("Công cụ {0} miễn phí", g.name)} – ${site.name}`, desc: `${g.desc} ${tr("{0} công cụ miễn phí, xử lý ngay trên trình duyệt, không tải file lên máy chủ.", list.length)}`, entry: L.js("core.js"), ld, main });
}

/* ---------- trang công cụ ---------- */
const PRIVACY = {
  file: "File của bạn được xử lý ngay trên máy này, không bao giờ tải lên máy chủ.",
  text: "Văn bản bạn nhập chỉ được xử lý trên trình duyệt, không gửi đi đâu.",
  form: "Số liệu bạn nhập chỉ được tính trên trình duyệt, không gửi đi đâu.",
  interactive: "Mọi thứ chạy ngay trên máy bạn; hình ảnh, âm thanh không gửi đi đâu."
};

async function dataNote(L, t, root) {
  const notes = [];
  for (const d of t.data || []) {
    const p = ROOT + `data/${d}.json`;
    if (!existsSync(p)) continue;
    const j = { ...JSON.parse(await readFile(p, "utf8")), ...((L.D && L.D.data[d]) || {}) };
    notes.push(`<p class="data-note">${icon("info", root)}<span>${L.tr("Dữ liệu {0} cập nhật ngày {1}. Nguồn: {2}.", esc(j.title || ""), `<b>${fmtDate(j.updated, L.lang)}</b>`, esc(j.source))}</span></p>`);
  }
  return notes.join("\n");
}

async function toolPage(L, t) {
  const { tr } = L;
  const path = L.toolUrl(t), root = rootOf(path);
  const g = L.groupOf[t.group];
  const related = (t.related || []).map((id) => L.byId[id]).filter((x) => x && isLive(x));
  // bù thêm công cụ cùng nhóm cho đủ 4
  for (const x of L.liveIn(t.group)) { if (related.length >= 4) break; if (x !== t && !related.includes(x)) related.push(x); }
  const accept = t.accept && t.kind === "file" ? `<p class="formats">${tr("Nhận: {0}", esc(L.describeAccept(t.accept)))}</p>` : "";
  const howto = t.howto && t.howto.length ? `<section class="block info"><h2>${tr("Cách dùng")}</h2><ol class="steps">${t.howto.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>` : "";
  const faq = t.faq && t.faq.length ? `<section class="block info faq"><h2>${tr("Câu hỏi thường gặp")}</h2>${t.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n")}</section>` : "";
  // dải đầu trang mang màu chuyên mục (nhóm); khung ứng dụng đè lên mép dưới của dải
  const main = `<div class="tool-page" style="--c:${g.color}">
<div class="tool-band">
<div class="wrap">
<nav class="crumbs" aria-label="${tr("Đường dẫn")}"><ol><li><a href="${root}${L.homeUrl}">${tr("Trang chủ")}</a></li><li><a class="crumb-tab" href="${root}${L.groupUrl(g)}">${esc(g.name)}</a></li><li><span aria-current="page">${esc(t.name)}</span></li></ol></nav>
<header class="tool-head">
${tile(L, t, root, "lg")}
<div class="tool-title"><h1>${esc(t.name)}${t.status === "beta" ? ` <span class="badge">${tr("Thử nghiệm")}</span>` : ""}</h1><p class="lead">${esc(t.desc)}</p></div>
<button class="fav-btn" type="button" data-fav="${t.id}" aria-pressed="false" hidden>${icon("star", root)}<span>${tr("Ghim")}</span></button>
</header>
<p class="privacy">${icon("shield-check", root)}<span>${esc(t.privacy || tr(PRIVACY[t.kind]))}</span></p>
</div>
</div>
<div class="wrap">
<div id="app" class="app app-${t.kind}" data-kind="${t.kind}">
<noscript><p class="note">${tr("Công cụ này cần bật JavaScript để chạy ngay trên máy bạn.")}</p></noscript>
<div class="app-loading" aria-hidden="true"><span class="spinner"></span></div>
</div>
${accept}
${await dataNote(L, t, root)}
${howto && faq ? `<div class="tool-info">\n${howto}\n${faq}\n</div>` : howto + faq}
${related.length ? `<section class="block"><h2>${tr("Công cụ liên quan")} <a class="see-all" href="${root}${L.groupUrl(g)}">${tr("Xem cả {0} công cụ", L.liveIn(g.id).length)}${icon("arrow-right", root)}</a></h2>${cards(L, related.slice(0, 6), root)}</section>` : ""}
</div>
</div>`;
  const graph = [
    { "@type": "WebApplication", name: t.name, url: BASE + path, description: t.desc, inLanguage: L.lang,
      applicationCategory: "UtilitiesApplication", operatingSystem: tr("Mọi hệ điều hành có trình duyệt web"), browserRequirements: tr("Cần bật JavaScript"),
      isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: L.vi ? "VND" : "USD" } },
    breadcrumbLd([[tr("Trang chủ"), L.homeUrl], [g.name, L.groupUrl(g)], [t.name, path]])
  ];
  if (t.faq && t.faq.length) graph.push({ "@type": "FAQPage", mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  if (t.howto && t.howto.length) graph.push({ "@type": "HowTo", name: tr("Cách dùng {0}", t.name), step: t.howto.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })) });
  const desc = `${t.desc} ${tr("Miễn phí, chạy ngay trên trình duyệt, không tải file lên máy chủ.")}`;
  // Thêm "online miễn phí" cho khớp cách người dùng tìm kiếm; tên dài quá 60 ký tự thì giữ tên gọn.
  const seoTitle = `${tr("{0} online miễn phí", t.name)} – ${site.name}`;
  const title = seoTitle.length <= 60 ? seoTitle : `${t.name} – ${site.name}`;
  return page(L, {
    path, key: "tool:" + t.id, title, desc, entry: L.js(`tools/${t.id}.js`),
    ld: { "@context": "https://schema.org", "@graph": graph }, bodyAttrs: `data-tool="${t.id}"`, main
  });
}

/* ---------- giới thiệu & quyền riêng tư ---------- */
function aboutPage(L) {
  const { tr } = L;
  const path = L.aboutUrl, root = rootOf(path);
  const main = `<div class="tool-page band-page" style="--c:#C8922A">
<div class="tool-band">
<div class="wrap narrow">
<nav class="crumbs" aria-label="${tr("Đường dẫn")}"><ol><li><a href="${root}${L.homeUrl}">${tr("Trang chủ")}</a></li><li><span aria-current="page">${tr("Giới thiệu")}</span></li></ol></nav>
<header class="tool-head plain"><div class="tool-title"><h1>${tr("Giới thiệu &amp; quyền riêng tư")}</h1>
<p class="lead">${tr("BbeTools là bộ công cụ tiện ích miễn phí, giao diện tiếng Việt, chạy hoàn toàn trên trình duyệt của bạn.")}</p></div></header>
</div>
</div>
<div class="wrap narrow prose">
<h2>${tr("File của bạn không rời khỏi máy")}</h2>
<p>${tr("BbeTools không có máy chủ xử lý. Khi bạn ghép PDF, nén ảnh hay làm ảnh thẻ, mọi phép tính diễn ra bằng JavaScript và WebAssembly ngay trong tab trình duyệt. File, văn bản, hình ảnh camera và âm thanh micro không được gửi đi đâu. Bạn có thể ngắt mạng sau khi trang và thư viện đã tải xong, công cụ vẫn chạy.")}</p>
<h2>${tr("Trang tải những gì từ Internet?")}</h2>
<ul>
<li>${tr("Chính trang web, từ GitHub Pages.")}</li>
<li>${tr("Font chữ và thư viện mã nguồn mở (pdf-lib, pdf.js, JSZip, bộ mã hoá ảnh, giải mã HEIC, đọc mã QR…) từ CDN jsDelivr, ghim đúng phiên bản. Thư viện nặng chỉ tải khi bạn mở công cụ cần đến nó. CDN chỉ thấy yêu cầu tải thư viện, không thấy file của bạn.")}</li>
<li>${tr("Mô hình AI tách nền (cho Làm ảnh thẻ) đặt ngay trong trang web này.")}</li>
<li>${tr("Riêng công cụ Tải sticker Telegram: trình duyệt của bạn gọi thẳng máy chủ Telegram (api.telegram.org) bằng token bot của chính bạn để lấy bộ sticker. BbeTools không có máy chủ trung gian và không nhận token.")}</li>
</ul>
<h2>${tr("Thống kê lượt truy cập, không quảng cáo")}</h2>
<p>${tr("BbeTools dùng Google Analytics để đếm lượt xem từng trang (trang nào được dùng nhiều, người dùng đến từ đâu, dùng điện thoại hay máy tính), nhờ đó biết nên cải thiện công cụ nào. Google Analytics chỉ nhận đường dẫn trang; tên file, nội dung file, văn bản và số liệu bạn nhập vào công cụ không bao giờ được gửi đi. Bạn có thể chặn bằng trình chặn quảng cáo hoặc <a href=\"https://tools.google.com/dlpage/gaoptout?hl=vi\" rel=\"noopener\">tiện ích chặn Google Analytics</a>; mọi công cụ vẫn chạy bình thường.")}</p>
<p>${tr("Không có quảng cáo, không có cookie quảng cáo. “Dùng gần đây”, “Yêu thích” và cài đặt chỉ lưu trong bộ nhớ trình duyệt (localStorage) của chính bạn; xoá dữ liệu trang web là mất.")}</p>
<h2>${tr("Mã nguồn mở")}</h2>
<p>${tr("Toàn bộ mã nguồn ở {0}. Bạn có thể tự kiểm tra, góp ý hoặc báo lỗi tại mục Issues.", `<a href="${site.repo}" rel="noopener">${esc(site.repo.replace("https://", ""))}</a>`)}</p>
<h2>${tr("Giới hạn")}</h2>
<p>${tr("Vì chạy trên máy bạn nên tốc độ phụ thuộc vào máy: file rất lớn (vài trăm MB) có thể chậm hoặc thiếu bộ nhớ trên điện thoại cũ. Kết quả tính toán (thuế, lương, lãi…) chỉ để tham khảo; dữ liệu pháp lý có ghi rõ ngày cập nhật trên từng trang.")}</p>
</div>
</div>`;
  return page(L, { path, key: "about", title: `${tr("Giới thiệu & quyền riêng tư")} – ${site.name}`, desc: tr("BbeTools xử lý mọi file ngay trên trình duyệt, không tải lên máy chủ, không quảng cáo. Mã nguồn mở."), entry: L.js("core.js"), main });
}

/* ---------- 404 ---------- */
function notFoundPage(L) {
  // GitHub Pages trả 404.html cho mọi đường dẫn sai ở mọi độ sâu, nên đường dẫn tương đối không dùng được.
  // Đoạn script đầu trang đặt <base href> về thư mục gốc của site (tính từ vị trí "/bbetools/" trong URL).
  // Đường dẫn nằm dưới thư mục của ngôn ngữ khác (vd. /bbetools/en/…) thì nạp bản dịch của notfound.js; module đó tự đổi chữ trên trang.
  const langs = Object.keys(LANGS);
  const baseScript = `<script>(function(){var b=${JSON.stringify(BASE_PATH)},p=location.pathname,i=p.toLowerCase().indexOf(b.toLowerCase()),r=i>=0?p.slice(0,i+b.length):"/",l=(i>=0?p.slice(i+b.length):"").split("/")[0];document.write('<base href="'+r+'">');if(${JSON.stringify(langs)}.indexOf(l)>=0){document.documentElement.lang=l;window.btLang=l}})()</script>\n`;
  const root = "";
  const main = `<div class="wrap narrow nf">
<p class="nf-code">404</p>
<h1 id="nf-title">Không tìm thấy trang này</h1>
<p class="lead" id="nf-msg">Đường dẫn có thể đã đổi hoặc gõ nhầm.</p>
<section id="nf-suggest" class="block" hidden><h2>Có phải bạn tìm:</h2><ul class="cards"></ul></section>
<p class="row"><a class="btn" id="nf-home" href="./">${icon("house", root)}<span>Về trang chủ</span></a><button class="btn ghost" type="button" data-palette>${icon("search", root)}<span>Tìm công cụ</span></button></p>
</div>`;
  // nạp module theo ngôn ngữ (window.btLang do đoạn script đầu trang đặt)
  const loader = `<script>(function(){var s=document.createElement("script");s.type="module";s.src="assets/"+(window.btLang?window.btLang+"/":"")+"notfound.js";document.head.appendChild(s)})()</script>\n`;
  return page(L, { path: "404.html", root, title: `Không tìm thấy trang – ${site.name}`, desc: "Trang bạn tìm không tồn tại hoặc đã đổi địa chỉ. Tìm công cụ khác trên BbeTools.", entry: "assets/notfound.js", main, head: baseScript, noindex: true })
    .replace(`<script type="module" src="assets/notfound.js"></script>\n`, loader)
    .replace(`<link rel="modulepreload" href="assets/core.js">\n`, "");
}

/* ---------- registry cho trình duyệt ---------- */
function clientRegistry(L) {
  const pick = (t) => {
    const o = { id: t.id, slug: t.slug, name: t.name, group: t.group, icon: t.icon, kind: t.kind, desc: t.desc, keywords: t.keywords };
    for (const k of ["accept", "output", "multiple", "popular", "aliases", "related", "status"]) if (t[k] != null && !(Array.isArray(t[k]) && !t[k].length)) o[k] = t[k];
    if (o.related) o.related = o.related.filter((id) => L.byId[id]);
    return o;
  };
  const groups = L.liveGroups.map((g) => ({ id: g.id, slug: g.slug, name: g.name, icon: g.icon, color: g.color }));
  return `/* Tự sinh bởi scripts/build.js từ tools.json${L.vi ? "" : ` và i18n/${L.lang}/tools.json`} — đừng sửa tay. Chỉ gồm công cụ đã hoàn thành. */
export const site = ${JSON.stringify({ name: site.name, baseUrl: site.baseUrl })};
export const groups = ${JSON.stringify(groups)};
export const tools = [
${L.live.map((t) => JSON.stringify(pick(t))).join(",\n")}
];
`;
}

/* ---------- ghi file ---------- */
const stale = [];
const written = new Set();
async function write(rel, content) {
  written.add(rel);
  const p = ROOT + rel;
  let old = null;
  try { old = await readFile(p, "utf8"); } catch (_) {}
  if (old === content) return 0;
  if (CHECK) { stale.push(rel); return 1; }
  await mkdir(p.replace(/[^/]+$/, ""), { recursive: true });
  await writeFile(p, content);
  return 1;
}

// Xoá trang cũ do script sinh (thư mục có <meta name="generator" content="bbetools-build">) nhưng nay không còn
async function cleanStale(keep) {
  let removed = 0;
  const check = async (dir, rel) => {
    const f = dir + "index.html";
    if (!existsSync(f)) return;
    const html = await readFile(f, "utf8");
    if (html.includes('content="bbetools-build"') && !keep.has(rel)) { await rm(dir, { recursive: true }); removed++; console.log("  đã xoá trang cũ:", rel); }
  };
  const scan = async (rel) => {
    if (!existsSync(ROOT + rel)) return;
    for (const e of await readdir(ROOT + rel, { withFileTypes: true })) if (e.isDirectory() && !e.name.startsWith(".")) await check(ROOT + rel + e.name + "/", rel + e.name + "/");
  };
  await scan("");
  await scan("nhom/");
  for (const code of Object.keys(LANGS)) { await scan(code + "/"); await scan(code + "/" + LANGS[code].groups); }
  // module JS đã dịch nhưng nay không còn dùng
  for (const code of Object.keys(LANGS)) {
    const walk = async (rel) => {
      if (!existsSync(ROOT + rel)) return;
      for (const e of await readdir(ROOT + rel, { withFileTypes: true })) {
        const r = rel + e.name;
        if (e.isDirectory()) await walk(r + "/");
        else if (r.endsWith(".js") && !written.has(r)) { await rm(ROOT + r); removed++; console.log("  đã xoá module cũ:", r); }
      }
    };
    await walk(`assets/${code}/`);
  }
  return removed;
}

const keep = new Set();
let changed = 0;
const urls = [];
const missingJs = {};
for (const code of LANG_CODES) {
  const L = LS[code];
  const pages = [
    [L.homeUrl, () => homePage(L)],
    ...L.liveGroups.map((g) => [L.groupUrl(g), () => groupPage(L, g)]),
    ...L.live.map((t) => [L.toolUrl(t), () => toolPage(L, t)]),
    [L.aboutUrl, () => aboutPage(L)]
  ];
  for (const [path, make] of pages) {
    keep.add(path);
    urls.push(path);
    changed += await write(path + "index.html", await make());
  }
  if (L.vi) {
    changed += await write("404.html", notFoundPage(L));
    changed += await write("assets/registry.js", clientRegistry(L));
    continue;
  }
  // module JS đã dịch
  changed += await write(`assets/${code}/registry.js`, clientRegistry(L));
  const miss = [];
  for (const rel of await langFiles(code, reg)) {
    const src = await readFile(ROOT + "assets/" + rel, "utf8");
    const dict = (await loadJson(`i18n/${code}/js/${rel.replace(/\.js$/, "")}.json`)) || {};
    const r = compile(src, await lookupFor(code, rel), rel);
    if (!dict["@keep"]) miss.push(...r.missing.map((k) => [rel, k]));
    changed += await write(`assets/${code}/${rel}`, `/* Tự sinh bởi scripts/build.js từ assets/${rel} và i18n/${code}/js/ — đừng sửa tay. */\n` + r.code);
  }
  missingJs[code] = miss;
}
changed += await write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join("\n")}
</urlset>
`);
changed += await write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);
changed += await write("manifest.webmanifest", JSON.stringify({
  name: site.name, short_name: site.name, description: site.tagline, lang: "vi", start_url: "./", scope: "./", display: "standalone",
  background_color: "#F6F4EF", theme_color: "#8A5A06",
  icons: [{ src: "assets/favicon.svg", sizes: "any", type: "image/svg+xml" }, { src: "assets/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
}, null, 2) + "\n");

/* ---------- báo phần chưa dịch ---------- */
const report = [];
for (const code of Object.keys(LANGS)) {
  const L = LS[code], mp = [...missingPages.get(code)], mj = missingJs[code];
  if (L.skipped.length) report.push(`${code}: ${L.skipped.length} công cụ chưa có bản dịch trong i18n/${code}/tools.json (chưa có trang): ${L.skipped.join(", ")}`);
  if (mp.length) report.push(`${code}: ${mp.length} câu của khung trang chưa dịch trong i18n/${code}/pages.json (chạy build --missing để xem)`);
  if (mj.length) report.push(`${code}: ${mj.length} chuỗi JS chưa dịch (chạy node scripts/i18n.js extract rồi điền giá trị null trong i18n/${code}/js/), vd. ${mj.slice(0, 3).map(([f, k]) => `${f}: ${JSON.stringify(k).slice(0, 60)}`).join(" · ")}`);
  if (process.argv.includes("--missing")) console.log(JSON.stringify(Object.fromEntries(mp.map((k) => [k, null])), null, 1));
}
if (CHECK) {
  if (stale.length) { console.error("Trang sinh ra chưa khớp tools.json, hãy chạy: node scripts/build.js\n- " + stale.join("\n- ")); process.exit(1); }
  if (report.length) { console.error("Còn phần chưa dịch:\n- " + report.join("\n- ")); process.exit(1); }
  console.log("Các trang đã khớp tools.json."); process.exit(0);
}
const removed = await cleanStale(keep);
const todo = reg.tools.filter((t) => t.status === "todo").length;
console.log(`BbeTools: ${LS.vi.live.length} công cụ đã xong, ${todo} chưa làm · ${LS.vi.liveGroups.length} nhóm · ${Object.keys(LANGS).map((c) => `${c}: ${LS[c].live.length} công cụ`).join(" · ")} · ${changed} file thay đổi${removed ? ", " + removed + " file cũ đã xoá" : ""}`);
if (report.length) console.warn("⚠ " + report.join("\n⚠ "));
