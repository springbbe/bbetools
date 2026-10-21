#!/usr/bin/env node
/* Sinh toàn bộ trang tĩnh từ tools.json:
     index.html, nhom/<nhóm>/index.html, <slug>/index.html, gioi-thieu/index.html, 404.html,
     sitemap.xml, robots.txt, manifest.webmanifest, assets/registry.js
   Kết quả được commit thẳng vào repo; GitHub Pages phục vụ nguyên trạng, không cần bước build khi deploy.
   Chạy:  node scripts/build.js        (hoặc npm run build) */
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { loadRegistry, validate, isLive, ROOT } from "./registry.js";
import { describeAccept } from "../assets/lib/filetype.js";

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
const live = reg.tools.filter(isLive);
const byId = Object.fromEntries(reg.tools.map((t) => [t.id, t]));
const groupOf = Object.fromEntries(reg.groups.map((g) => [g.id, g]));
const liveIn = (gid) => live.filter((t) => t.group === gid);
const liveGroups = reg.groups.filter((g) => liveIn(g.id).length);

/* ---------- helpers ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const icon = (name, root, cls = "") => `<svg class="i${cls ? " " + cls : ""}" aria-hidden="true"><use href="${root}assets/icons.svg#${name}"></use></svg>`;
const tile = (t, root, cls = "") => {
  const g = groupOf[t.group] || t;
  return `<span class="tile${cls ? " " + cls : ""}" style="--c:${g.color}">${icon(t.icon, root)}</span>`;
};
const jsonld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const toolUrl = (t) => t.slug + "/";
const metaDesc = (s) => (s.length > 155 ? s.slice(0, 152).replace(/\s+\S*$/, "") + "…" : s);
const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

const LOGO = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--brand)"/><path d="M10 7.5h7.2c3.3 0 5.4 1.8 5.4 4.5 0 1.9-1 3.2-2.6 3.8 2.1.5 3.5 2.1 3.5 4.3 0 3.1-2.4 5.1-6 5.1H10z" fill="#fff"/><path d="M14.2 11v3.6h2.6c1.3 0 2-.7 2-1.8s-.7-1.8-2-1.8zm0 6.9v4h3c1.5 0 2.3-.8 2.3-2s-.8-2-2.3-2z" fill="var(--brand)"/><circle cx="25.5" cy="7" r="2.6" fill="#FFC53D"/></svg>`;

function card(t, root, opts = {}) {
  const H = opts.h || "h3";
  return `<li class="card" data-id="${t.id}" data-group="${t.group}">
<a class="card-link" href="${root}${toolUrl(t)}">${tile(t, root)}<span class="card-txt"><${H} class="card-name">${esc(t.name)}</${H}><span class="card-desc">${esc(t.desc)}</span></span></a>
<button class="star" type="button" data-fav="${t.id}" aria-pressed="false" aria-label="Ghim ${esc(t.name)} vào Yêu thích" hidden>${icon("star", root)}</button>
</li>`;
}
const cards = (list, root, opts) => `<ul class="cards">${list.map((t) => card(t, root, opts)).join("\n")}</ul>`;

function mega(root) {
  return `<div id="mega" class="mega" hidden>
<div class="mega-in">
<div class="mega-head"><b>Tất cả công cụ</b><button class="ib" type="button" data-close-mega aria-label="Đóng menu">${icon("x", root)}</button></div>
<div class="mega-grid">
${liveGroups.map((g) => {
  const list = liveIn(g.id);
  const shown = list.slice(0, 8);
  return `<section class="mega-col"><h2><a href="${root}nhom/${g.slug}/">${tile(g, root, "sm")}${esc(g.name)}</a></h2>
<ul>${shown.map((t) => `<li><a href="${root}${toolUrl(t)}">${esc(t.name)}</a></li>`).join("")}</ul>${list.length > shown.length ? `<a class="more" href="${root}nhom/${g.slug}/">Xem cả ${list.length} công cụ ${icon("arrow-right", root)}</a>` : ""}</section>`;
}).join("\n")}
</div>
</div>
</div>`;
}

function header(root) {
  return `<a class="skip" href="#main">Bỏ qua, tới nội dung chính</a>
<header class="top">
<div class="top-in">
<a class="brand" href="${root}" aria-label="BbeTools – Trang chủ">${LOGO}<span>Bbe<b>Tools</b></span></a>
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mega">${icon("menu", root, "only-m")}<span class="nav-label">Tất cả công cụ</span>${icon("chevron-down", root, "only-d")}</button>
<button class="search-trigger" type="button" data-palette aria-label="Tìm công cụ (phím /)">${icon("search", root)}<span>Tìm công cụ…</span><kbd>/</kbd></button>
<button class="ib theme-toggle" type="button" data-theme-toggle aria-label="Đổi giao diện sáng/tối" title="Giao diện: tự động">${icon("monitor", root, "t-auto")}${icon("sun", root, "t-light")}${icon("moon", root, "t-dark")}</button>
</div>
${mega(root)}
</header>`;
}

function footer(root) {
  return `<footer class="foot">
<div class="foot-in">
<div class="foot-brand">
<a class="brand" href="${root}">${LOGO}<span>Bbe<b>Tools</b></span></a>
<p>Công cụ tiện ích miễn phí cho người Việt. Mọi xử lý chạy ngay trên trình duyệt của bạn: <b>file không bao giờ rời khỏi máy</b>.</p>
</div>
<nav aria-label="Nhóm công cụ"><h2>Nhóm công cụ</h2><ul>${liveGroups.map((g) => `<li><a href="${root}nhom/${g.slug}/">${esc(g.name)}</a></li>`).join("")}</ul></nav>
<nav aria-label="Về BbeTools"><h2>BbeTools</h2><ul>
<li><a href="${root}gioi-thieu/">Giới thiệu &amp; quyền riêng tư</a></li>
<li><a href="${site.repo}" rel="noopener">Mã nguồn trên GitHub</a></li>
<li><a href="${site.repo}/issues" rel="noopener">Góp ý, báo lỗi</a></li>
</ul></nav>
</div>
<p class="copy">© ${YEAR} BbeTools · Không quảng cáo, không tải file lên máy chủ.</p>
</footer>`;
}

/* Google Analytics (site.gaId): chỉ gửi đường dẫn trang, bỏ phần ?… và #… vì một số công cụ lưu dữ liệu người dùng nhập
   (số tài khoản, số tiền, văn bản…) trên URL. btReplaceState là bản gốc của history.replaceState, lấy trước khi gtag.js
   kịp gắn bộ theo dõi đổi URL, để các công cụ cập nhật URL mà không tạo thêm lượt xem chứa dữ liệu (xem replaceUrl trong core.js). */
const analytics = () => (site.gaId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>
<script>window.btReplaceState=history.replaceState.bind(history);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${site.gaId}",{page_location:location.origin+location.pathname});</script>
` : "");

function page({ root, path, title, desc, entry, ld, bodyAttrs = "", main, head = "", noindex = false }) {
  const abs = BASE + path;
  return `<!doctype html>
<html lang="vi" data-root="${root}">
<head>
<meta charset="utf-8">
${analytics()}${head}<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc(desc))}">
${noindex ? `<meta name="robots" content="noindex">` : `<link rel="canonical" href="${abs}">`}
<meta name="generator" content="bbetools-build">
<meta name="theme-color" content="#F6F7F9" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111318" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:locale" content="vi_VN">
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
<link rel="modulepreload" href="${root}assets/core.js">
<script type="module" src="${root}${entry}"></script>
${ld ? jsonld(ld) : ""}
</head>
<body${bodyAttrs ? " " + bodyAttrs : ""}>
${header(root)}
<main id="main" tabindex="-1">
${main}
</main>
${footer(root)}
</body>
</html>
`;
}

const breadcrumbLd = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: BASE + url }))
});

/* ---------- trang chủ ---------- */
function homePage() {
  const root = "./";
  const popular = live.filter((t) => t.popular);
  const main = `<section class="hero">
<div class="wrap">
<h1>Công cụ tiện ích <span class="nowrap">cho người Việt</span></h1>
<p class="lead">${live.length} công cụ miễn phí cho PDF, ảnh, văn bản, VietQR, lịch âm… Chạy ngay trên trình duyệt, <b>file không bao giờ rời khỏi máy bạn</b>.</p>
<form class="search-box" role="search" action="./" onsubmit="return false">
${icon("search", root)}
<input id="q" name="q" type="search" placeholder="Tìm: ghép pdf, nén ảnh, vietqr…" autocomplete="off" spellcheck="false" aria-label="Tìm công cụ" aria-controls="results" enterkeyhint="go">
<kbd class="only-d">/</kbd>
</form>
<p class="drop-hint">${icon("upload", root)}<span>Thả hoặc dán (Ctrl/⌘ + V) một file vào trang để được gợi ý công cụ phù hợp, hoặc <button type="button" class="linkish" data-pick-any>chọn file</button>.</span></p>
</div>
</section>
<div class="wrap">
<section id="results" class="block" hidden aria-live="polite"><h2 id="results-title">Kết quả tìm kiếm</h2><ul class="cards" id="results-list"></ul><p class="empty" id="results-empty" hidden>Chưa có công cụ khớp. Thử gõ ngắn hơn hoặc không dấu, ví dụ “pdf”, “anh”, “qr”.</p></section>
<div id="home-main">
<section id="suggest" class="block" hidden></section>
<section id="favs" class="block" hidden><h2>${icon("star", root)} Yêu thích</h2><ul class="cards"></ul></section>
<section id="recent" class="block" hidden><h2>${icon("history", root)} Dùng gần đây</h2><ul class="cards"></ul></section>
<section class="block" id="popular"><h2>${icon("sparkles", root)} Phổ biến</h2>${cards(popular, root)}</section>
<nav class="chips" aria-label="Lọc theo nhóm">
<div class="chips-in">
<a href="#tat-ca" class="chip" data-filter="all" aria-current="true">Tất cả</a>
${liveGroups.map((g) => `<a href="#nhom-${g.slug}" class="chip" data-filter="${g.id}">${esc(g.name)} <small>${liveIn(g.id).length}</small></a>`).join("\n")}
</div>
</nav>
<div id="tat-ca">
${liveGroups.map((g) => `<section class="block group-block" id="nhom-${g.slug}" data-group="${g.id}">
<h2><a href="${root}nhom/${g.slug}/">${tile(g, root, "sm")}${esc(g.name)}</a> <small>${liveIn(g.id).length} công cụ</small></h2>
${cards(liveIn(g.id), root)}
</section>`).join("\n")}
</div>
</div>
</div>`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: site.name, url: BASE, inLanguage: "vi", description: site.description,
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: BASE + "?q={search_term_string}" }, "query-input": "required name=search_term_string" } },
      { "@type": "ItemList", name: "Công cụ phổ biến", itemListElement: popular.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: BASE + toolUrl(t) })) }
    ]
  };
  return page({ root, path: "", title: `${site.name} – ${site.tagline}`, desc: site.description, entry: "assets/home.js", ld, bodyAttrs: 'class="home"', main });
}

/* ---------- trang nhóm ---------- */
function groupPage(g) {
  const root = "../../";
  const list = liveIn(g.id);
  const main = `<div class="wrap">
<nav class="crumbs" aria-label="Đường dẫn"><ol><li><a href="${root}">Trang chủ</a></li><li><span aria-current="page">${esc(g.name)}</span></li></ol></nav>
<header class="page-head">${tile(g, root, "lg")}<div><h1>Công cụ ${esc(g.name)}</h1><p class="lead">${esc(g.desc)} ${list.length} công cụ miễn phí, chạy ngay trên trình duyệt.</p></div></header>
${cards(list, root, { h: "h2" })}
<section class="block"><h2>Nhóm khác</h2><ul class="chip-list">${liveGroups.filter((x) => x !== g).map((x) => `<li><a class="chip" href="${root}nhom/${x.slug}/">${tile(x, root, "xs")}${esc(x.name)}</a></li>`).join("")}</ul></section>
</div>`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: `Công cụ ${g.name}`, url: BASE + `nhom/${g.slug}/`, inLanguage: "vi", description: g.desc,
        mainEntity: { "@type": "ItemList", itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: BASE + toolUrl(t) })) } },
      breadcrumbLd([["Trang chủ", ""], [g.name, `nhom/${g.slug}/`]])
    ]
  };
  return page({ root, path: `nhom/${g.slug}/`, title: `Công cụ ${g.name} miễn phí – ${site.name}`, desc: `${g.desc} ${list.length} công cụ miễn phí, xử lý ngay trên trình duyệt, không tải file lên máy chủ.`, entry: "assets/core.js", ld, main });
}

/* ---------- trang công cụ ---------- */
const PRIVACY = {
  file: "File của bạn được xử lý ngay trên máy này, không bao giờ tải lên máy chủ.",
  text: "Văn bản bạn nhập chỉ được xử lý trên trình duyệt, không gửi đi đâu.",
  form: "Số liệu bạn nhập chỉ được tính trên trình duyệt, không gửi đi đâu.",
  interactive: "Mọi thứ chạy ngay trên máy bạn; hình ảnh, âm thanh không gửi đi đâu."
};

async function dataNote(t) {
  const notes = [];
  for (const d of t.data || []) {
    const p = ROOT + `data/${d}.json`;
    if (!existsSync(p)) continue;
    const j = JSON.parse(await readFile(p, "utf8"));
    notes.push(`<p class="data-note">${icon("info", "../")}<span>Dữ liệu ${esc(j.title || "")} cập nhật ngày <b>${fmtDate(j.updated)}</b>. Nguồn: ${esc(j.source)}.</span></p>`);
  }
  return notes.join("\n");
}

async function toolPage(t) {
  const root = "../";
  const g = groupOf[t.group];
  const related = (t.related || []).map((id) => byId[id]).filter((x) => x && isLive(x));
  // bù thêm công cụ cùng nhóm cho đủ 4
  for (const x of liveIn(t.group)) { if (related.length >= 4) break; if (x !== t && !related.includes(x)) related.push(x); }
  const accept = t.accept && t.kind === "file" ? `<p class="formats">Nhận: ${esc(describeAccept(t.accept))}</p>` : "";
  const main = `<div class="wrap">
<nav class="crumbs" aria-label="Đường dẫn"><ol><li><a href="${root}">Trang chủ</a></li><li><a href="${root}nhom/${g.slug}/">${esc(g.name)}</a></li><li><span aria-current="page">${esc(t.name)}</span></li></ol></nav>
<header class="tool-head">
${tile(t, root, "lg")}
<div class="tool-title"><h1>${esc(t.name)}${t.status === "beta" ? ' <span class="badge">Thử nghiệm</span>' : ""}</h1><p class="lead">${esc(t.desc)}</p></div>
<button class="fav-btn" type="button" data-fav="${t.id}" aria-pressed="false" hidden>${icon("star", root)}<span>Ghim</span></button>
</header>
<p class="privacy">${icon("shield-check", root)}<span>${esc(t.privacy || PRIVACY[t.kind])}</span></p>
<div id="app" class="app app-${t.kind}" data-kind="${t.kind}">
<noscript><p class="note">Công cụ này cần bật JavaScript để chạy ngay trên máy bạn.</p></noscript>
<div class="app-loading" aria-hidden="true"><span class="spinner"></span></div>
</div>
${accept}
${await dataNote(t)}
${t.howto && t.howto.length ? `<section class="block info"><h2>Cách dùng</h2><ol class="steps">${t.howto.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></section>` : ""}
${t.faq && t.faq.length ? `<section class="block info"><h2>Câu hỏi thường gặp</h2>${t.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n")}</section>` : ""}
${related.length ? `<section class="block"><h2>Công cụ liên quan</h2>${cards(related.slice(0, 6), root)}</section>` : ""}
</div>`;
  const graph = [
    { "@type": "WebApplication", name: t.name, url: BASE + toolUrl(t), description: t.desc, inLanguage: "vi",
      applicationCategory: "UtilitiesApplication", operatingSystem: "Mọi hệ điều hành có trình duyệt web", browserRequirements: "Cần bật JavaScript",
      isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } },
    breadcrumbLd([["Trang chủ", ""], [g.name, `nhom/${g.slug}/`], [t.name, toolUrl(t)]])
  ];
  if (t.faq && t.faq.length) graph.push({ "@type": "FAQPage", mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  if (t.howto && t.howto.length) graph.push({ "@type": "HowTo", name: "Cách dùng " + t.name, step: t.howto.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })) });
  const desc = `${t.desc} Miễn phí, chạy ngay trên trình duyệt, không tải file lên máy chủ.`;
  return page({
    root, path: toolUrl(t), title: `${t.name} – ${site.name}`, desc, entry: `assets/tools/${t.id}.js`,
    ld: { "@context": "https://schema.org", "@graph": graph }, bodyAttrs: `data-tool="${t.id}"`, main
  });
}

/* ---------- giới thiệu & quyền riêng tư ---------- */
function aboutPage() {
  const root = "../";
  const main = `<div class="wrap narrow prose">
<nav class="crumbs" aria-label="Đường dẫn"><ol><li><a href="${root}">Trang chủ</a></li><li><span aria-current="page">Giới thiệu</span></li></ol></nav>
<h1>Giới thiệu &amp; quyền riêng tư</h1>
<p class="lead">BbeTools là bộ công cụ tiện ích miễn phí, giao diện tiếng Việt, chạy hoàn toàn trên trình duyệt của bạn.</p>
<h2>File của bạn không rời khỏi máy</h2>
<p>BbeTools không có máy chủ xử lý. Khi bạn ghép PDF, nén ảnh hay làm ảnh thẻ, mọi phép tính diễn ra bằng JavaScript và WebAssembly ngay trong tab trình duyệt. File, văn bản, hình ảnh camera và âm thanh micro không được gửi đi đâu. Bạn có thể ngắt mạng sau khi trang và thư viện đã tải xong, công cụ vẫn chạy.</p>
<h2>Trang tải những gì từ Internet?</h2>
<ul>
<li>Chính trang web, từ GitHub Pages.</li>
<li>Font chữ và thư viện mã nguồn mở (pdf-lib, pdf.js, JSZip, bộ mã hoá ảnh, giải mã HEIC, đọc mã QR…) từ CDN jsDelivr, ghim đúng phiên bản. Thư viện nặng chỉ tải khi bạn mở công cụ cần đến nó. CDN chỉ thấy yêu cầu tải thư viện, không thấy file của bạn.</li>
<li>Mô hình AI tách nền (cho Làm ảnh thẻ) đặt ngay trong trang web này.</li>
</ul>
<h2>Thống kê lượt truy cập, không quảng cáo</h2>
<p>BbeTools dùng Google Analytics để đếm lượt xem từng trang (trang nào được dùng nhiều, người dùng đến từ đâu, dùng điện thoại hay máy tính), nhờ đó biết nên cải thiện công cụ nào. Google Analytics chỉ nhận đường dẫn trang; tên file, nội dung file, văn bản và số liệu bạn nhập vào công cụ không bao giờ được gửi đi. Bạn có thể chặn bằng trình chặn quảng cáo hoặc <a href="https://tools.google.com/dlpage/gaoptout?hl=vi" rel="noopener">tiện ích chặn Google Analytics</a>; mọi công cụ vẫn chạy bình thường.</p>
<p>Không có quảng cáo, không có cookie quảng cáo. “Dùng gần đây”, “Yêu thích” và cài đặt chỉ lưu trong bộ nhớ trình duyệt (localStorage) của chính bạn; xoá dữ liệu trang web là mất.</p>
<h2>Mã nguồn mở</h2>
<p>Toàn bộ mã nguồn ở <a href="${site.repo}" rel="noopener">${esc(site.repo.replace("https://", ""))}</a>. Bạn có thể tự kiểm tra, góp ý hoặc báo lỗi tại mục Issues.</p>
<h2>Giới hạn</h2>
<p>Vì chạy trên máy bạn nên tốc độ phụ thuộc vào máy: file rất lớn (vài trăm MB) có thể chậm hoặc thiếu bộ nhớ trên điện thoại cũ. Kết quả tính toán (thuế, lương, lãi…) chỉ để tham khảo; dữ liệu pháp lý có ghi rõ ngày cập nhật trên từng trang.</p>
</div>`;
  return page({ root, path: "gioi-thieu/", title: `Giới thiệu & quyền riêng tư – ${site.name}`, desc: "BbeTools xử lý mọi file ngay trên trình duyệt, không tải lên máy chủ, không quảng cáo. Mã nguồn mở.", entry: "assets/core.js", main });
}

/* ---------- 404 ---------- */
function notFoundPage() {
  // GitHub Pages trả 404.html cho mọi đường dẫn sai ở mọi độ sâu, nên đường dẫn tương đối không dùng được.
  // Đoạn script đầu trang đặt <base href> về thư mục gốc của site (tính từ vị trí "/bbetools/" trong URL).
  const baseScript = `<script>(function(){var b=${JSON.stringify(BASE_PATH)},p=location.pathname,i=p.toLowerCase().indexOf(b.toLowerCase());document.write('<base href="'+(i>=0?p.slice(0,i+b.length):"/")+'">')})()</script>\n`;
  const root = "";
  const main = `<div class="wrap narrow nf">
<p class="nf-code">404</p>
<h1>Không tìm thấy trang này</h1>
<p class="lead" id="nf-msg">Đường dẫn có thể đã đổi hoặc gõ nhầm.</p>
<section id="nf-suggest" class="block" hidden><h2>Có phải bạn tìm:</h2><ul class="cards"></ul></section>
<p class="row"><a class="btn" href="./">${icon("house", root)}Về trang chủ</a><button class="btn ghost" type="button" data-palette>${icon("search", root)}Tìm công cụ</button></p>
</div>`;
  return page({ root, path: "404.html", title: `Không tìm thấy trang – ${site.name}`, desc: "Trang bạn tìm không tồn tại hoặc đã đổi địa chỉ. Tìm công cụ khác trên BbeTools.", entry: "assets/notfound.js", main, head: baseScript, noindex: true });
}

/* ---------- registry cho trình duyệt ---------- */
function clientRegistry() {
  const pick = (t) => {
    const o = { id: t.id, slug: t.slug, name: t.name, group: t.group, icon: t.icon, kind: t.kind, desc: t.desc, keywords: t.keywords };
    for (const k of ["accept", "output", "multiple", "popular", "aliases", "related", "status"]) if (t[k] != null) o[k] = t[k];
    return o;
  };
  const groups = liveGroups.map((g) => ({ id: g.id, slug: g.slug, name: g.name, icon: g.icon, color: g.color }));
  return `/* Tự sinh bởi scripts/build.js từ tools.json — đừng sửa tay. Chỉ gồm công cụ đã hoàn thành. */
export const site = ${JSON.stringify({ name: site.name, baseUrl: site.baseUrl })};
export const groups = ${JSON.stringify(groups)};
export const tools = [
${live.map((t) => JSON.stringify(pick(t))).join(",\n")}
];
`;
}

/* ---------- ghi file ---------- */
const CHECK = process.argv.includes("--check"); // chỉ kiểm tra file sinh ra đã khớp registry chưa, không ghi
const stale = [];
async function write(rel, content) {
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
  for (const e of await readdir(ROOT, { withFileTypes: true })) if (e.isDirectory() && !e.name.startsWith(".")) await check(ROOT + e.name + "/", e.name + "/");
  if (existsSync(ROOT + "nhom")) for (const e of await readdir(ROOT + "nhom", { withFileTypes: true })) if (e.isDirectory()) await check(ROOT + "nhom/" + e.name + "/", "nhom/" + e.name + "/");
  return removed;
}

const keep = new Set(["gioi-thieu/", ...live.map(toolUrl), ...liveGroups.map((g) => `nhom/${g.slug}/`)]);
let changed = 0;
changed += await write("index.html", homePage());
for (const g of liveGroups) changed += await write(`nhom/${g.slug}/index.html`, groupPage(g));
for (const t of live) changed += await write(`${t.slug}/index.html`, await toolPage(t));
changed += await write("gioi-thieu/index.html", aboutPage());
changed += await write("404.html", notFoundPage());
changed += await write("assets/registry.js", clientRegistry());
const urls = ["", ...liveGroups.map((g) => `nhom/${g.slug}/`), ...live.map(toolUrl), "gioi-thieu/"];
changed += await write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${BASE}${u}</loc></url>`).join("\n")}
</urlset>
`);
changed += await write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);
changed += await write("manifest.webmanifest", JSON.stringify({
  name: site.name, short_name: site.name, description: site.tagline, lang: "vi", start_url: "./", scope: "./", display: "standalone",
  background_color: "#F6F7F9", theme_color: "#3E5BF2",
  icons: [{ src: "assets/favicon.svg", sizes: "any", type: "image/svg+xml" }, { src: "assets/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "assets/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
}, null, 2) + "\n");
/* Kế hoạch xây dựng (tài liệu tạm, docs/ke-hoach.md): bảng Lộ trình và bảng Công cụ.
   File này sẽ bị xoá khi xây xong; khi đó phần dưới tự bỏ qua. */
{
  const PLAN = "docs/ke-hoach.md";
  let plan = await readFile(ROOT + PLAN, "utf8").catch(() => null);
  const fill = (text, key, body) => text.replace(new RegExp(`<!-- ${key}:start -->[\\s\\S]*<!-- ${key}:end -->`), `<!-- ${key}:start -->${body}<!-- ${key}:end -->`);
  if (plan) {
    const phases = [...new Set(reg.groups.map((g) => g.phase))].sort((a, b) => a - b);
    const roadmap = phases.map((n) => {
      const groups = reg.groups.filter((g) => g.phase === n);
      const list = reg.tools.filter((t) => groups.some((g) => g.id === t.group));
      const done = list.filter(isLive).length;
      const st = done === list.length ? "✅ Xong" : `⏳ Còn ${list.length - done} công cụ`;
      const cmd = done === list.length ? "" : `\`Làm giai đoạn ${n} của BbeTools theo CLAUDE.md\``; // giai đoạn xong: không cần câu lệnh
      return `| ${n} | ${groups.map((g) => g.name).join(" + ")} | ${done}/${list.length} | ${st} | ${cmd} |`;
    });
    plan = fill(plan, "roadmap", `\n| Giai đoạn | Nhóm | Công cụ xong | Trạng thái | Câu lệnh gợi ý cho AI |\n|---|---|---|---|---|\n| 1 | Lõi, registry, trang tự sinh + 13 công cụ tiêu biểu | 13 | ✅ Xong | |\n${roadmap.join("\n")}\n`);
    const rows = reg.groups.map((g) => {
      const list = reg.tools.filter((t) => t.group === g.id);
      return `| ${g.name} | ${list.filter(isLive).length}/${list.length} | ${list.map((t) => (isLive(t) ? `[${t.name}](${BASE}${toolUrl(t)})` : t.name + " ⏳")).join(" · ")} |`;
    });
    plan = fill(plan, "tools", `\n${live.length}/${reg.tools.length} công cụ đã xong (⏳ = chưa làm, đang ẩn khỏi trang web).\n\n| Nhóm | Xong | Công cụ |\n|---|---|---|\n${rows.join("\n")}\n`);
    changed += await write(PLAN, plan);
  }
}
if (CHECK) {
  if (stale.length) { console.error("Trang sinh ra chưa khớp tools.json, hãy chạy: node scripts/build.js\n- " + stale.join("\n- ")); process.exit(1); }
  console.log("Các trang đã khớp tools.json."); process.exit(0);
}
const removed = await cleanStale(keep);
const todo = reg.tools.filter((t) => t.status === "todo").length;
console.log(`BbeTools: ${live.length} công cụ đã xong, ${todo} chưa làm · ${liveGroups.length} nhóm · ${changed} file thay đổi${removed ? ", " + removed + " trang cũ đã xoá" : ""}`);
