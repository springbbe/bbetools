/* Trang 404: chuyển hướng đường dẫn cũ / slug phụ (aliases), gợi ý công cụ gần đúng với đường dẫn đã gõ */
import { $, registry } from "./core.js";
import { fold, search } from "./lib/search.js";
import { cardEl } from "./cards.js";

const reg = await registry();
const base = document.querySelector("base") ? new URL(document.querySelector("base").href).pathname : "/";
const rest = decodeURIComponent(location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname).replace(/\/+$/, "");
const slug = rest.split("/")[0] || "";
const key = fold(slug.replace(/[-_]+/g, " ")).replace(/ /g, "-");
const hit = reg.tools.find((t) => t.slug === key || (t.aliases || []).includes(key) || t.id === key);
if (hit && rest.split("/").length === 1) location.replace(new URL(hit.slug + "/" + location.search + location.hash, document.baseURI).href);
else if (slug) {
  const found = search(reg.index, slug.replace(/[-_]+/g, " "), 6);
  if (found.length) {
    const sec = $("#nf-suggest");
    found.forEach((t) => $("ul", sec).append(cardEl(t, reg)));
    sec.hidden = false;
    $("#nf-msg").textContent = `Không có trang “/${rest}”. Có thể bạn đang tìm một trong các công cụ dưới đây.`;
  }
}
