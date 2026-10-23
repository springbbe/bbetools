/* Trang 404: chuyển hướng đường dẫn cũ / slug phụ (aliases), gợi ý công cụ gần đúng với đường dẫn đã gõ.
   Chỉ có một 404.html (tiếng Việt); đường dẫn dưới thư mục ngôn ngữ khác (vd. en/…) nạp bản dịch của module này,
   module tự thay chữ trên trang bằng chữ đã dịch. */
import { $, registry, LANG, HOME } from "./core.js";
import { fold, search } from "./lib/search.js";
import { cardEl } from "./cards.js";

if (LANG !== "vi") {
  document.title = "Không tìm thấy trang – BbeTools";
  $("#nf-title").textContent = "Không tìm thấy trang này";
  $("#nf-msg").textContent = "Đường dẫn có thể đã đổi hoặc gõ nhầm.";
  $("#nf-suggest h2").textContent = "Có phải bạn tìm:";
  $("#nf-home span").textContent = "Về trang chủ";
  $("#nf-home").href = HOME;
  $("[data-palette] span", $(".nf")).textContent = "Tìm công cụ";
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
    $("#nf-msg").textContent = `Không có trang “/${rest}”. Có thể bạn đang tìm một trong các công cụ dưới đây.`;
  }
}
