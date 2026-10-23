/* Tự sinh bởi scripts/build.js từ assets/tools/http-status.js và i18n/en/js/ — đừng sửa tay. */
/* Tra mã trạng thái HTTP: tìm theo mã hoặc từ khoá (không cần dấu), lọc theo nhóm 1xx–5xx, giải thích tiếng Việt kèm mẹo xử lý */
import { $, h, debounce } from "../core.js";
import { STATUSES, CLASSES, searchStatus } from "../lib/http-status.js";

const app = $("#app");
app.textContent = "";
const params = new URLSearchParams(location.search);
let cls = "";
const q = h("input", { type: "search", id: "hs-q", placeholder: "Type a code (404, 5xx) or a keyword: not found, timeout…", autocomplete: "off", value: params.get("q") || "", "aria-describedby": "hs-count" });
const count = h("p", { id: "hs-count", class: "hint", "aria-live": "polite" });
const seg = h("div", { class: "seg", role: "radiogroup", "aria-label": "Code class" },
  [["", "All"], ...Object.entries(CLASSES).map(([k, v]) => [k, v[0]])].map(([v, l]) => h("label", null, h("input", { type: "radio", name: "hs-cls", value: v, checked: v === "", onchange: () => { cls = v; run(); } }), h("span", { text: l }))));
const list = h("div", { class: "hs-list" });
app.append(h("div", { class: "hs" }, h("div", { class: "hs-bar" }, h("label", { class: "sr-only", for: "hs-q", text: "Search status codes" }), q, seg), count, list));

const tone = { 1: "info", 2: "ok", 3: "info", 4: "warn", 5: "err" };
function card(s) {
  return h("article", { class: "hs-card", id: "ma-" + s.code },
    h("div", { class: "hs-top" }, h("span", { class: "hs-code " + tone[s.cls], text: String(s.code) }), h("div", null, h("h3", { text: s.vi }), h("small", { class: "mono", text: s.phrase }))),
    h("p", { text: s.desc }),
    s.tip ? h("p", { class: "hs-tip" }, h("b", { text: "How to fix: " }), s.tip) : null);
}
function run() {
  const res = searchStatus(q.value, cls);
  list.textContent = "";
  let lastCls = 0;
  for (const s of res) {
    if (s.cls !== lastCls && !q.value.trim()) { lastCls = s.cls; list.append(h("h2", { class: "hs-group" }, CLASSES[s.cls][0] + " – " + CLASSES[s.cls][1], h("small", { text: CLASSES[s.cls][2] }))); }
    list.append(card(s));
  }
  count.textContent = res.length ? `${res.length} / ${STATUSES.length} codes` : "No matching codes. Try a number (e.g. 4 or 40) or another keyword.";
}
q.addEventListener("input", debounce(run, 120));
run();
if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
