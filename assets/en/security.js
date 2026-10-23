/* Tự sinh bởi scripts/build.js từ assets/security.js và i18n/en/js/ — đừng sửa tay. */
/* Tiện ích dùng chung cho nhóm Bảo mật */
import { h } from "./core.js";

const TONES = ["err", "err", "warn", "ok", "ok"];
/** Thanh độ mạnh 5 nấc (level 0–4) kèm nhãn */
export function strengthMeter(level, label) {
  return h("div", { class: "pw-meter", role: "img", "aria-label": "Strength: " + label, style: { "--c": `var(--${TONES[level]})` } },
    h("div", { class: "pw-bars" }, [0, 1, 2, 3, 4].map((i) => h("span", { class: i <= level ? "on" : null }))),
    h("b", { text: label }));
}
