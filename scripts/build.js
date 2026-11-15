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
import { execFileSync } from "node:child_process";
import { loadRegistry, validate, isLive, ROOT } from "./registry.js";
import { LANGS, inLang, langData, langFiles, compile, lookupFor, loadJson, hasVi } from "./i18n.js";
import { describeAccept as describeAcceptVi } from "../assets/lib/filetype.js";
import { loadArticles, linkErrors, renderArticle, ARTICLE_URL } from "./articles.js";

const reg = await loadRegistry();
const errors = validate(reg);
if (errors.length) {
  console.error("tools.json có lỗi:\n- " + errors.join("\n- "));
  process.exit(1);
}

// bài hướng dẫn (chỉ tiếng Việt): liên kết tool:id phải trỏ tới công cụ có thật và đã "done"
const ARTICLES = await loadArticles();
const articleErrors = linkErrors(ARTICLES, reg);
if (articleErrors.length) {
  console.error("Bài hướng dẫn có lỗi:\n- " + articleErrors.join("\n- "));
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
/* Meta description tối đa 155 ký tự, không bao giờ cắt giữa câu: quá dài thì cắt ở ranh giới câu, rồi tới dấu phẩy */
const MAX_DESC = 155;
const len = (s) => [...s].length;
function clipDesc(s) {
  s = s.trim();
  if (len(s) <= MAX_DESC) return s;
  const head = [...s].slice(0, MAX_DESC + 1).join("");
  const stop = Math.max(...[". ", "! ", "? "].map((p) => head.lastIndexOf(p)));
  if (stop > 40) return head.slice(0, stop + 1);
  const comma = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "));
  if (comma > 40) return head.slice(0, comma) + ".";
  return head.slice(0, head.lastIndexOf(" ")) + ".";
}
/** Mô tả + câu đuôi: thử lần lượt các câu đuôi (dài → ngắn), không vừa thì bỏ câu đuôi */
function descWith(main, ...tails) {
  for (const t of tails) if (t && len(`${main} ${t}`) <= MAX_DESC) return `${main} ${t}`;
  return clipDesc(main);
}
const metaDesc = clipDesc;
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
  return `<li class="card${opts.cls ? " " + opts.cls : ""}" data-id="${t.id}" data-group="${t.group}"${gc ? ` style="--c:${gc}"` : ""}>
<a class="card-link" href="${root}${L.toolUrl(t)}">${tile(L, t, root)}<div class="card-txt"><${H} class="card-name">${esc(t.name)}</${H}><span class="card-desc">${esc(t.desc)}</span></div></a>
<button class="star" type="button" data-fav="${t.id}" aria-pressed="false" aria-label="${esc(L.tr("Ghim {0} vào Yêu thích", t.name))}" hidden>${icon("star", root)}</button>
</li>`;
}
const cards = (L, list, root, opts) => `<ul class="cards">${list.map((t) => card(L, t, root, opts)).join("\n")}</ul>`;

function mega(L, root) {
  const { tr } = L;
  return `<div id="mega" class="mega" hidden>
<div class="mega-in">
<div class="mega-head"><b>${tr("Tất cả công cụ")}</b><button class="ib" type="button" data-close-mega aria-label="${tr("Đóng menu")}">${icon("x", root)}</button></div>
<button class="mega-search" type="button" data-palette>${icon("search", root)}<span>${tr("Tìm công cụ…")}</span></button>
<div class="mega-grid">
${L.liveGroups.map((g) => {
  const list = L.liveIn(g.id);
  const shown = list.slice(0, 8);
  // máy tính: tên nhóm là liên kết; điện thoại (ngăn kéo): nút gập/mở danh sách, liên kết trang nhóm nằm cuối danh sách
  return `<section class="mega-col" style="--c:${g.color}" data-group="${g.id}"><h2><a href="${root}${L.groupUrl(g)}">${tile(L, g, root, "sm")}${esc(g.name)}</a><button class="mega-tg" type="button" aria-expanded="false" aria-controls="mg-${g.id}">${tile(L, g, root, "sm")}<span>${esc(g.name)}</span>${icon("chevron-down", root)}</button></h2>
<div class="mega-list" id="mg-${g.id}"><ul>${shown.map((t) => `<li><a href="${root}${L.toolUrl(t)}">${esc(t.name)}</a></li>`).join("")}</ul><a class="more${list.length > shown.length ? "" : " only-m"}" href="${root}${L.groupUrl(g)}">${tr("Xem cả {0} công cụ", list.length)} ${icon("arrow-right", root)}</a></div></section>`;
}).join("\n")}
</div>
${L.vi ? `<a class="mega-foot" href="${root}${ARTICLE_URL}">${icon("book-open", root)}<span>Hướng dẫn</span></a>` : ""}
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
${L.vi ? `<li><a href="${root}${ARTICLE_URL}">Hướng dẫn</a></li>\n` : ""}<li><a href="${root}${L.aboutUrl}">${tr("Giới thiệu &amp; quyền riêng tư")}</a></li>
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

function page(L, { path, key, title, desc, entry, ld, bodyAttrs = "", main, head = "", noindex = false, root = rootOf(path), ogType = "website", og = null }) {
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
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="${L.og}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(metaDesc(desc))}">
<meta property="og:url" content="${abs}">
<meta property="og:image" content="${BASE}${og ? og.image : "assets/og.png"}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(og ? og.alt : `${site.name} – ${L.site.tagline}`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${root}assets/apple-touch-icon.png">
<link rel="manifest" href="${root}manifest.webmanifest">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="${root}assets/app.css">
<script>document.documentElement.classList.add("js");try{var t=localStorage.getItem("bt:theme");if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
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

/** Ảnh Open Graph theo nhóm (scripts/make-brand.js sinh assets/og/<nhóm>.png, bản tiếng Anh ở assets/og/<lang>/) */
function ogFor(L, g, alt) {
  const rel = `assets/og/${L.vi ? "" : L.lang + "/"}${g.id}.png`;
  // alt mô tả đúng nội dung ảnh (tên nhóm), không phải tiêu đề trang
  return existsSync(ROOT + rel) ? { image: rel, alt: `${L.tr("Công cụ {0}", g.name)} – ${site.name}` } : { image: "assets/og.png", alt: `${site.name} – ${L.site.tagline}` };
}

const breadcrumbLd = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: BASE + url }))
});

/* ---------- bài hướng dẫn (chỉ tiếng Việt, xem scripts/articles.js) ---------- */
const articleUrl = (a) => ARTICLE_URL + a.slug + "/";
const mainTool = (L, a) => L.byId[a.tools[0]];
/** Thẻ bài viết: cùng kiểu thẻ công cụ (ô icon của công cụ chính, tên, mô tả), thêm dòng nhóm + ngày cập nhật */
function articleCard(L, a, root, opts = {}) {
  const t = mainTool(L, a), g = L.groupOf[t.group];
  const H = opts.h || "h3";
  return `<li class="card no-star" style="--c:${g.color}">
<a class="card-link" href="${root}${articleUrl(a)}">${tile(L, t, root)}<div class="card-txt"><${H} class="card-name">${esc(a.meta.title)}</${H}><span class="card-desc">${esc(a.meta.desc)}</span>${opts.meta === false ? "" : `<span class="card-meta"><span class="card-group">${esc(g.name)}</span><span>Cập nhật <time datetime="${a.meta.updated}">${fmtDate(a.meta.updated, "vi")}</time></span></span>`}</div></a>
</li>`;
}
const articleCards = (L, list, root, opts) => `<ul class="cards">${list.map((a) => articleCard(L, a, root, opts)).join("\n")}</ul>`;
const articlesFor = (id) => ARTICLES.filter((a) => a.tools.includes(id));

/** Bài liên quan: ưu tiên bài có chung công cụ, rồi chung nhóm, rồi bài mới */
function relatedArticles(L, a, n = 4) {
  const groupsOf = (x) => new Set(x.tools.map((id) => (L.byId[id] || {}).group));
  const mine = new Set(a.tools), myGroups = groupsOf(a);
  return ARTICLES.filter((x) => x !== a)
    .map((x, i) => ({ x, i, score: x.tools.filter((id) => mine.has(id)).length * 10 + ([...groupsOf(x)].some((gid) => myGroups.has(gid)) ? 3 : 0) }))
    .sort((p, q) => q.score - p.score || p.i - q.i).slice(0, n).map((o) => o.x);
}

function articlePage(L, a) {
  const path = articleUrl(a), root = rootOf(path);
  const t = mainTool(L, a), g = L.groupOf[t.group];
  const { blocks } = renderArticle(a, (id) => root + L.toolUrl(L.byId[id]));
  const first = blocks[0] && blocks[0].startsWith("<p>") ? 1 : 0;
  const cta = `<aside class="article-cta" aria-label="Công cụ chính của bài">${`<ul class="cards">${card(L, t, root, { h: "p", cls: "tinted" })}</ul>`}</aside>`;
  const used = a.tools.map((id) => L.byId[id]).filter(Boolean);
  const more = relatedArticles(L, a);
  const main = `<div class="tool-page band-page" style="--c:${g.color}">
<div class="tool-band">
<div class="wrap narrow">
<nav class="crumbs" aria-label="Đường dẫn"><ol><li><a href="${root}${L.homeUrl}">Trang chủ</a></li><li><a href="${root}${ARTICLE_URL}">Hướng dẫn</a></li><li><span aria-current="page">${esc(a.meta.title)}</span></li></ol></nav>
<header class="tool-head plain"><div class="tool-title"><h1>${esc(a.meta.title)}</h1><p class="lead">Cập nhật <time datetime="${a.meta.updated}">${fmtDate(a.meta.updated, "vi")}</time></p></div></header>
</div>
</div>
<div class="wrap narrow">
<article class="prose article">
${[...blocks.slice(0, first), cta, ...blocks.slice(first)].join("\n")}
</article>
<section class="block"><h2>Công cụ dùng trong bài</h2>${cards(L, used, root)}</section>
${more.length ? `<section class="block"><h2>Bài hướng dẫn khác <a class="see-all" href="${root}${ARTICLE_URL}">Xem tất cả${icon("arrow-right", root)}</a></h2>${articleCards(L, more, root)}</section>` : ""}
</div>
</div>`;
  const url = BASE + path;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: a.meta.title, description: a.meta.desc, dateModified: a.meta.updated, inLanguage: "vi", url, mainEntityOfPage: url,
        image: BASE + ogFor(L, g, "").image, author: { "@type": "Organization", name: site.name, url: BASE },
        publisher: { "@type": "Organization", name: site.name, url: BASE, logo: { "@type": "ImageObject", url: BASE + "assets/icon-512.png" } } },
      breadcrumbLd([["Trang chủ", L.homeUrl], ["Hướng dẫn", ARTICLE_URL], [a.meta.title, path]])
    ]
  };
  const title = `${a.meta.title} – ${site.name}`.length <= 60 ? `${a.meta.title} – ${site.name}` : a.meta.title;
  return page(L, { path, title, desc: a.meta.desc, entry: L.js("core.js"), ld, main, ogType: "article", og: ogFor(L, g, a.meta.title), bodyAttrs: `data-group="${g.id}"`,
    head: `<meta property="article:modified_time" content="${a.meta.updated}">\n` });
}

function articlesIndexPage(L) {
  const path = ARTICLE_URL, root = rootOf(path);
  const main = `<div class="tool-page band-page" style="--c:#C8922A">
<div class="tool-band">
<div class="wrap">
<nav class="crumbs" aria-label="Đường dẫn"><ol><li><a href="${root}${L.homeUrl}">Trang chủ</a></li><li><span aria-current="page">Hướng dẫn</span></li></ol></nav>
<header class="tool-head plain"><div class="tool-title"><h1>Hướng dẫn</h1><p class="lead">${ARTICLES.length} bài hướng dẫn từng bước: nén PDF nộp hồ sơ, ảnh thẻ, tính thuế, lương, tiền điện, VietQR… kèm bảng số liệu và ví dụ cụ thể.</p></div></header>
</div>
</div>
<div class="wrap">
${articleCards(L, ARTICLES, root, { h: "h2" })}
</div>
</div>`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "Hướng dẫn", url: BASE + path, inLanguage: "vi",
        mainEntity: { "@type": "ItemList", itemListElement: ARTICLES.map((a, i) => ({ "@type": "ListItem", position: i + 1, name: a.meta.title, url: BASE + articleUrl(a) })) } },
      breadcrumbLd([["Trang chủ", L.homeUrl], ["Hướng dẫn", path]])
    ]
  };
  return page(L, { path, title: "Hướng dẫn dùng công cụ PDF, ảnh, thuế, lương – BbeTools",
    desc: "Hướng dẫn từng bước nén PDF, làm ảnh thẻ, tính thuế TNCN, lương gross net, tiền điện, tạo VietQR… kèm bảng số liệu, ví dụ. File không rời khỏi máy bạn.",
    entry: L.js("core.js"), ld, main });
}

/* ---------- trang chủ ---------- */
/** site.description có "{0}" = số công cụ thật của ngôn ngữ đó (không viết cứng "Hơn 100") */
const siteDesc = (L) => L.site.description.replace("{0}", L.live.length);
function homePage(L) {
  const { tr, live, liveGroups, liveIn } = L;
  const path = L.homeUrl, root = rootOf(path);
  const popular = live.filter((t) => t.popular);
  // "Phổ biến" chỉ hiện 8 công cụ, lấy lần lượt từ mỗi nhóm cho đa dạng; đủ 155 công cụ vẫn có ở các nhóm bên dưới
  const popularShown = [];
  const popByGroup = liveGroups.map((g) => popular.filter((t) => t.group === g.id));
  for (let i = 0; popularShown.length < 8 && popByGroup.some((l) => l[i]); i++) for (const l of popByGroup) if (l[i] && popularShown.length < 8) popularShown.push(l[i]);
  const main = `<section class="hero">
<div class="wrap hero-in">
<div class="hero-main">
<h1>${tr("<span class=\"nowrap\">Công cụ tiện ích</span> <span class=\"nowrap\">cho người Việt</span>")}</h1>
<p class="lead">${tr("{0} công cụ miễn phí cho PDF, ảnh, văn bản, VietQR, lịch âm… Chạy ngay trên trình duyệt, <b>file không bao giờ rời khỏi máy bạn</b>.", live.length)}</p>
<form class="search-box" role="search" action="./" onsubmit="return false">
${icon("search", root)}
<input id="q" name="q" type="search" placeholder="${tr("Tìm: ghép pdf, vietqr…")}" autocomplete="off" spellcheck="false" aria-label="${tr("Tìm công cụ")}" aria-controls="results" enterkeyhint="go">
<kbd class="only-d">/</kbd>
</form>
<p class="drop-hint">${icon("upload", root)}<span>${tr("Thả hoặc dán<span class=\"no-touch\"> (Ctrl/⌘ + V)</span><span class=\"touch-only\"> (chạm giữ → Dán)</span> một file vào trang để được gợi ý công cụ phù hợp, hoặc <button type=\"button\" class=\"linkish\" data-pick-any>chọn file</button>.")}</span></p>
</div>
<nav aria-label="${tr("Nhóm công cụ")}"><ul class="hero-cats">
${liveGroups.map((g) => `<li><a href="#${tr("nhom-")}${g.slug}" data-filter="${g.id}" style="--c:${g.color}">${tile(L, g, root)}<b>${esc(g.name)}</b><small>${tr("{0} công cụ", liveIn(g.id).length)}</small></a></li>`).join("\n")}
</ul></nav>
</div>
</section>
<div class="wrap">
<section id="results" class="block" hidden aria-live="polite"><h2 id="results-title">${tr("Kết quả tìm kiếm")}</h2><ul class="cards" id="results-list"></ul><p class="empty" id="results-empty" hidden>${tr("Chưa có công cụ khớp. Thử gõ ngắn hơn hoặc không dấu, ví dụ “pdf”, “anh”, “qr”.")}</p></section>
<div id="home-main">
<nav class="chips" aria-label="${tr("Lọc theo nhóm")}">
<div class="chips-in">
<a href="#tat-ca" class="chip" data-filter="all" aria-current="true">${tr("Tất cả")}</a>
${liveGroups.map((g) => `<a href="#${tr("nhom-")}${g.slug}" class="chip" data-filter="${g.id}" style="--c:${g.color}">${esc(g.name)} <small>${liveIn(g.id).length}</small></a>`).join("\n")}
</div>
</nav>
<section id="suggest" class="block" hidden></section>
<section id="favs" class="block" hidden><h2>${icon("star", root)} ${tr("Yêu thích")}</h2><ul class="cards"></ul></section>
<section id="recent" class="block" hidden><h2>${icon("history", root)} ${tr("Dùng gần đây")}</h2><ul class="cards"></ul></section>
<section class="block" id="popular"><h2>${icon("sparkles", root)} ${tr("Phổ biến")}</h2>${cards(L, popularShown, root)}</section>
<div id="tat-ca">
${liveGroups.map((g) => `<section class="block group-block" id="${tr("nhom-")}${g.slug}" data-group="${g.id}">
<h2 class="tab"><a href="${root}${L.groupUrl(g)}" style="--c:${g.color}">${icon(g.icon, root)}${esc(g.name)}</a> <small>${tr("{0} công cụ", liveIn(g.id).length)}</small></h2>
${cards(L, liveIn(g.id), root).replace('<ul class="cards">', `<ul class="cards" id="ds-${g.id}">`)}${liveIn(g.id).length > 6 ? `\n<button class="btn ghost block more-tools" type="button" aria-expanded="false" aria-controls="ds-${g.id}" data-more="${esc(tr("Xem cả {0} công cụ", liveIn(g.id).length))}"><span>${tr("Xem cả {0} công cụ", liveIn(g.id).length)}</span>${icon("chevron-down", root)}</button>` : ""}
</section>`).join("\n")}
</div>
${L.vi && ARTICLES.length ? `<section class="block" id="huong-dan"><h2>${icon("book-open", root)} Hướng dẫn <a class="see-all" href="${root}${ARTICLE_URL}">Xem tất cả ${ARTICLES.length} bài${icon("arrow-right", root)}</a></h2>${articleCards(L, ARTICLES.slice(0, 3), root)}</section>\n` : ""}</div>
</div>`;
  const url = BASE + path;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: site.name, url, inLanguage: L.lang, description: siteDesc(L),
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: url + "?q={search_term_string}" }, "query-input": "required name=search_term_string" } },
      { "@type": "ItemList", name: tr("Công cụ phổ biến"), itemListElement: popular.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: BASE + L.toolUrl(t) })) }
    ]
  };
  return page(L, { path, key: "home", title: `${site.name} – ${L.site.title}`, desc: siteDesc(L), entry: L.js("home.js"), ld, bodyAttrs: 'class="home"', main });
}

/* ---------- trang nhóm ---------- */
const faqLd = (faq) => ({ "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
const faqBlock = (L, faq) => `<section class="block info faq"><h2>${L.tr("Câu hỏi thường gặp")}</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n")}</section>`;
/** Trang nhóm: giới thiệu (intro) + FAQ dưới lưới thẻ, cùng bố cục "Cách dùng + FAQ" của trang công cụ */
function groupInfo(L, g) {
  const intro = g.intro ? `<section class="block info"><h2>${L.tr("Về nhóm {0}", esc(g.name))}</h2><p class="group-intro">${esc(g.intro)}</p></section>` : "";
  const faq = g.faq && g.faq.length ? faqBlock(L, g.faq) : "";
  return intro && faq ? `<div class="tool-info">\n${intro}\n${faq}\n</div>` : intro + faq;
}
/** Bài hướng dẫn có công cụ chính thuộc nhóm */
const groupArticles = (L, g) => ARTICLES.filter((a) => (L.byId[a.tools[0]] || {}).group === g.id);

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
${groupInfo(L, g)}
${L.vi && groupArticles(L, g).length ? `<section class="block"><h2>Bài hướng dẫn <a class="see-all" href="${root}${ARTICLE_URL}">Xem tất cả${icon("arrow-right", root)}</a></h2>${articleCards(L, groupArticles(L, g).slice(0, 6), root, { meta: false })}</section>\n` : ""}<section class="block"><h2>${tr("Nhóm khác")}</h2><ul class="chip-list">${L.liveGroups.filter((x) => x !== g).map((x) => `<li><a class="chip" href="${root}${L.groupUrl(x)}">${tile(L, x, root, "xs")}${esc(x.name)}</a></li>`).join("")}</ul></section>
</div>
</div>`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: tr("Công cụ {0}", g.name), url: BASE + path, inLanguage: L.lang, description: g.intro || g.desc, mainEntity: { "@id": BASE + path + "#cong-cu" } },
      { "@type": "ItemList", "@id": BASE + path + "#cong-cu", name: tr("Công cụ {0}", g.name), numberOfItems: list.length,
        itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: BASE + L.toolUrl(t) })) },
      breadcrumbLd([[tr("Trang chủ"), L.homeUrl], [g.name, path]])
    ]
  };
  if (g.faq && g.faq.length) ld["@graph"].push(faqLd(g.faq));
  return page(L, { path, key: "group:" + g.id, title: `${tr("Công cụ {0} online miễn phí", g.name)} – ${site.name}`,
    desc: descWith(g.desc, tr("{0} công cụ miễn phí, xử lý ngay trên trình duyệt, không tải file lên máy chủ.", list.length), tr("{0} công cụ miễn phí, không tải file lên máy chủ.", list.length)),
    entry: L.js("core.js"), ld, main, og: ogFor(L, g, tr("Công cụ {0}", g.name)), bodyAttrs: `data-group="${g.id}"` });
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
  const howto = t.howto && t.howto.length ? `<section class="block info"><h2>${tr("Cách dùng")}</h2><ol class="steps">${t.howto.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>` : "";
  const faq = t.faq && t.faq.length ? faqBlock(L, t.faq) : "";
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
${await dataNote(L, t, root)}
${howto && faq ? `<div class="tool-info">\n${howto}\n${faq}\n</div>` : howto + faq}
${L.vi && articlesFor(t.id).length ? `<section class="block"><h2>Bài hướng dẫn</h2>${articleCards(L, articlesFor(t.id), root, { meta: false })}</section>\n` : ""}${related.length ? `<section class="block"><h2>${tr("Công cụ liên quan")} <a class="see-all" href="${root}${L.groupUrl(g)}">${tr("Xem cả {0} công cụ", L.liveIn(g.id).length)}${icon("arrow-right", root)}</a></h2>${cards(L, related.slice(0, 6), root)}</section>` : ""}
</div>
</div>`;
  const graph = [
    { "@type": "WebApplication", name: t.name, url: BASE + path, description: t.desc, inLanguage: L.lang,
      applicationCategory: "UtilitiesApplication", operatingSystem: tr("Mọi hệ điều hành có trình duyệt web"), browserRequirements: tr("Cần bật JavaScript"),
      isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: L.vi ? "VND" : "USD" } },
    breadcrumbLd([[tr("Trang chủ"), L.homeUrl], [g.name, L.groupUrl(g)], [t.name, path]])
  ];
  if (t.faq && t.faq.length) graph.push(faqLd(t.faq));
  if (t.howto && t.howto.length) graph.push({ "@type": "HowTo", name: tr("Cách dùng {0}", t.name), step: t.howto.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })) });
  const desc = descWith(t.desc, tr("Miễn phí, chạy ngay trên trình duyệt, không tải file lên máy chủ."), tr("Miễn phí, không tải file lên máy chủ."));
  // Thêm "online miễn phí" cho khớp cách người dùng tìm kiếm; tên có ký hiệu (↔, /, &) dùng seoTitle viết theo cách gõ tìm.
  // Dài quá 60 ký tự thì bỏ "online miễn phí".
  const name = t.seoTitle || t.name;
  const long = `${tr("{0} online miễn phí", name)} – ${site.name}`;
  const title = len(long) <= 60 ? long : `${name} – ${site.name}`;
  return page(L, {
    path, key: "tool:" + t.id, title, desc, entry: L.js(`tools/${t.id}.js`), og: ogFor(L, g, t.name),
    ld: { "@context": "https://schema.org", "@graph": graph }, bodyAttrs: `data-tool="${t.id}" data-group="${t.group}"`, main
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
<p class="privacy">${icon("shield-check", root)}<span>${tr("File của bạn không bao giờ rời khỏi máy bạn.")}</span></p>
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
  const main = `<div class="tool-page band-page" style="--c:#C8922A">
<div class="tool-band"><div class="wrap narrow nf-head">
<p class="nf-code">404</p>
<h1 id="nf-title">Không tìm thấy trang này</h1>
<p class="lead" id="nf-msg">Đường dẫn có thể đã đổi hoặc gõ nhầm.</p>
</div></div>
<div class="wrap narrow nf">
<section id="nf-suggest" class="block" hidden><h2>Có phải bạn tìm:</h2><ul class="cards"></ul></section>
<p class="row"><a class="btn" id="nf-home" href="./">${icon("house", root)}<span>Về trang chủ</span></a><button class="btn ghost" type="button" data-palette>${icon("search", root)}<span>Tìm công cụ</span></button></p>
</div>
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
  await scan(ARTICLE_URL);
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

/* <lastmod> trong sitemap: ngày commit gần nhất của file (giờ máy), không dùng ngày build để trang không đổi ngày mỗi lần build.
   File đang sửa chưa commit thì lấy ngày hôm nay (commit trong ngày sẽ ra cùng ngày → build --check vẫn khớp).
   Không có git (vd. bản tải zip) thì bỏ <lastmod>. */
const gitDates = (() => {
  const out = new Map();
  try {
    const log = execFileSync("git", ["log", "--format=@%cd", "--date=format:%Y-%m-%d", "--name-only", "--", "assets/tools", "tools.json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] });
    let d = null;
    for (const line of log.split("\n")) {
      if (line.startsWith("@")) d = line.slice(1);
      else if (line && d && !out.has(line)) out.set(line, d);
    }
    const st = execFileSync("git", ["status", "--porcelain", "--", "assets/tools", "tools.json"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    for (const line of st.split("\n")) if (line.trim()) out.set(line.slice(3).trim(), today);
  } catch (_) { return null; }
  return out;
})();
const gitDate = (file) => (gitDates && gitDates.get(file)) || null;
const sitemapAlts = (key) => {
  if (!key) return "";
  const a = alt(key);
  if (Object.keys(a).length < 2) return "";
  return Object.entries(a).map(([c, u]) => `<xhtml:link rel="alternate" hreflang="${c}" href="${BASE}${u}"/>`).join("") + (a.vi != null ? `<xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${a.vi}"/>` : "");
};

const keep = new Set();
let changed = 0;
const urls = [];
const missingJs = {};
for (const code of LANG_CODES) {
  const L = LS[code];
  const pages = [
    [L.homeUrl, () => homePage(L), null, "home"],
    ...L.liveGroups.map((g) => [L.groupUrl(g), () => groupPage(L, g), gitDate("tools.json"), "group:" + g.id]),
    ...L.live.map((t) => [L.toolUrl(t), () => toolPage(L, t), gitDate(`assets/tools/${t.id}.js`), "tool:" + t.id]),
    [L.aboutUrl, () => aboutPage(L), null, "about"],
    // bài hướng dẫn chỉ có tiếng Việt, không có bản dịch / hreflang
    ...(L.vi && ARTICLES.length ? [
      [ARTICLE_URL, () => articlesIndexPage(L), ARTICLES.map((a) => a.meta.updated).sort().pop()],
      ...ARTICLES.map((a) => [articleUrl(a), () => articlePage(L, a), a.meta.updated])
    ] : [])
  ];
  for (const [path, make, lastmod, key] of pages) {
    keep.add(path);
    urls.push({ path, lastmod, key });
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => `  <url><loc>${BASE}${u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}${sitemapAlts(u.key)}</url>`).join("\n")}
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
  // trường dịch bắt buộc khi bản tiếng Việt có: seoTitle của công cụ, intro/faq của nhóm
  const noSeo = L.live.filter((t) => t.vi && t.vi.seoTitle && !(L.D.tools[t.id] || {}).seoTitle).map((t) => t.id);
  if (noSeo.length) report.push(`${code}: ${noSeo.length} công cụ thiếu "seoTitle" trong i18n/${code}/tools.json: ${noSeo.join(", ")}`);
  const noGroup = L.liveGroups.filter((g) => !(L.D.groups[g.id] || {}).intro || !((L.D.groups[g.id] || {}).faq || []).length).map((g) => g.id);
  if (noGroup.length) report.push(`${code}: ${noGroup.length} nhóm thiếu "intro" hoặc "faq" trong i18n/${code}/tools.json: ${noGroup.join(", ")}`);
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
