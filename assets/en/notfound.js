/* Tự sinh bởi scripts/build.js từ assets/notfound.js và i18n/en/js/ — đừng sửa tay. */
/* Trang 404: chuyển hướng đường dẫn cũ / slug phụ (aliases), gợi ý công cụ gần đúng với đường dẫn đã gõ.
   Chỉ có một 404.html (tiếng Việt); đường dẫn dưới thư mục ngôn ngữ khác (vd. en/…) nạp bản dịch của module này,
   module tự thay chữ trên trang bằng chữ đã dịch. */
import { $, registry, LANG, HOME } from "./core.js";
import { fold, search } from "./lib/search.js";
import { cardEl } from "./cards.js";

if (LANG !== "vi") {
  document.title = "Page not found – BbeTools";
  $("#nf-title").textContent = "Page not found";
  $("#nf-msg").textContent = "The link may have changed or been mistyped.";
  $("#nf-suggest h2").textContent = "Did you mean:";
  $("#nf-home span").textContent = "Back to home";
  $("#nf-home").href = HOME;
  $("[data-palette] span", $(".nf")).textContent = "Search tools";
}

const reg = await registry();
const base = document.querySelector("base") ? new URL(document.querySelector("base").href).pathname : "/";
let rest = decodeURIComponent(location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname).replace(/\/+$/, "");
if (LANG !== "vi") rest = rest.replace(new RegExp("^" + LANG + "(/|$)"), "");
const slug = rest.split("/")[0] || "";
const key = fold(slug.replace(/[-_]+/g, " ")).replace(/ /g, "-");
const hit = reg.tools.find((t) => t.slug === key || (t.aliases || []).includes(key) || t.id === key);
if (hit && rest.split("/").length === 1) location.replace(new URL(HOME + hit.slug + "/" + location.search + location.hash, document.baseURI).href);
else if (slug) {
  const found = search(reg.index, slug.replace(/[-_]+/g, " "), 6);
  if (found.length) {
    const sec = $("#nf-suggest");
    found.forEach((t) => $("ul", sec).append(cardEl(t, reg)));
    sec.hidden = false;
    $("#nf-msg").textContent = `There's no page “/${rest}”. Maybe you're looking for one of the tools below.`;
  }
}
