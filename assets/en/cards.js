/* Tự sinh bởi scripts/build.js từ assets/cards.js và i18n/en/js/ — đừng sửa tay. */
/* Vẽ thẻ công cụ phía trình duyệt (giống markup do scripts/build.js sinh) */
import { h, icon, toolHref, favs } from "./core.js";

export function cardEl(t, reg) {
  const g = reg.groupOf[t.group];
  const on = favs.has(t.id);
  return h("li", { class: "card", "data-id": t.id, "data-group": t.group, style: { "--c": g.color } },
    h("a", { class: "card-link", href: toolHref(t) },
      h("span", { class: "tile", style: { "--c": g.color }, html: icon(t.icon) }),
      h("span", { class: "card-txt" }, h("h3", { class: "card-name", text: t.name }), h("span", { class: "card-desc", text: t.desc }))),
    h("button", { class: "star", type: "button", "data-fav": t.id, "aria-pressed": String(on), "aria-label": (on ? "Unpin " : "Pin ") + t.name, html: icon("star") }));
}
