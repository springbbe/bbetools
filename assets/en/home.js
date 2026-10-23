/* Tự sinh bởi scripts/build.js từ assets/home.js và i18n/en/js/ — đừng sửa tay. */
/* Trang chủ: tìm kiếm mờ không dấu, Yêu thích / Dùng gần đây, lọc theo nhóm, thả/dán file để gợi ý công cụ */
import { $, $$, h, icon, registry, favs, recent, intake, toolsForFiles, sendTo, fileKinds, KIND_LABEL, fmtSize, toolHref, syncFavButtons, replaceUrl } from "./core.js";
import { search } from "./lib/search.js";
import { cardEl } from "./cards.js";

const reg = await registry();
const q = $("#q"), results = $("#results"), list = $("#results-list"), empty = $("#results-empty"), main = $("#home-main");

/* ---- tìm kiếm ---- */
let found = [];
function runSearch() {
  const v = q.value.trim();
  if (!v) { results.hidden = true; main.hidden = false; return; }
  found = search(reg.index, v, 40);
  list.textContent = "";
  found.forEach((t) => list.append(cardEl(t, reg)));
  $("#results-title").textContent = found.length ? `${found.length} ${(found.length) == 1 ? "tool matches" : "tools match"} “${v}”` : "Nothing found";
  empty.hidden = found.length > 0;
  results.hidden = false; main.hidden = true;
}
q.addEventListener("input", runSearch);
q.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && found[0]) location.href = toolHref(found[0]);
  if (e.key === "Escape") { q.value = ""; runSearch(); }
  if (e.key === "ArrowDown" && found.length) { e.preventDefault(); list.querySelector("a").focus(); }
});
const initial = new URLSearchParams(location.search).get("q");
if (initial) { q.value = initial; runSearch(); }

/* ---- yêu thích, gần đây ---- */
function personal() {
  for (const [id, ids] of [["favs", favs.list()], ["recent", recent.list()]]) {
    const sec = $("#" + id), ul = $("ul", sec);
    const tools = ids.map((x) => reg.byId[x]).filter(Boolean);
    ul.textContent = "";
    tools.slice(0, id === "recent" ? 6 : 24).forEach((t) => ul.append(cardEl(t, reg)));
    sec.hidden = !tools.length;
  }
  syncFavButtons();
}
personal();
document.addEventListener("bt:favs", personal);

/* ---- lọc theo nhóm (thanh dính khi cuộn) ---- */
const chips = $$(".chips .chip");
function filter(gid, scroll) {
  chips.forEach((c) => c.setAttribute("aria-current", String(c.dataset.filter === gid)));
  $$(".group-block").forEach((s) => { s.hidden = gid !== "all" && s.dataset.group !== gid; });
  if (scroll) $("#tat-ca").scrollIntoView({ behavior: "smooth", block: "start" });
}
chips.forEach((c) => c.addEventListener("click", (e) => {
  e.preventDefault();
  filter(c.dataset.filter, true);
  replaceUrl(c.dataset.filter === "all" ? location.pathname + location.search : c.getAttribute("href"));
}));
const fromHash = chips.find((c) => c.getAttribute("href") === location.hash && c.dataset.filter !== "all");
if (fromHash) filter(fromHash.dataset.filter, false);
const bar = $(".chips");
const sentinel = h("div", { style: { height: "1px" } });
bar.before(sentinel);
new IntersectionObserver(([en]) => bar.classList.toggle("stuck", !en.isIntersecting), { rootMargin: "-61px 0px 0px 0px" }).observe(sentinel);

/* ---- thả / dán / chọn file → gợi ý công cụ ---- */
const sug = $("#suggest");
const inp = intake({ accept: ["any"], multiple: true, label: "Drop files to see matching tools", onFiles: suggest });
$("[data-pick-any]").addEventListener("click", () => inp.pick());
async function suggest(files) {
  const tools = await toolsForFiles(files);
  const kinds = [...new Set((await Promise.all(files.map(fileKinds))).flat().filter((k) => k !== "any"))];
  const what = kinds.length ? kinds.map((k) => KIND_LABEL[k] || k).join(", ") : "file";
  sug.textContent = "";
  sug.append(h("div", { class: "suggest-box" },
    h("h2", { text: !tools.length ? "No tool for this file type yet" : files.length > 1 ? `Tools for these ${files.length} ${what} files` : `Tools for this ${what} file` }),
    h("p", { text: files.map((f) => `${f.name} (${fmtSize(f.size)})`).join(", ") + (tools.length ? " — pick a tool and the file will be opened there (still only on your device)." : "") }),
    tools.length ? h("ul", { class: "chip-list" }, tools.map((t) => h("li", null, h("a", { class: "chip", href: toolHref(t), onclick: (e) => { e.preventDefault(); sendTo(t, files); } },
      h("span", { class: "tile xs", style: { "--c": reg.groupOf[t.group].color }, html: icon(t.icon) }), t.name)))) : null,
    h("p", { style: { margin: "12px 0 0" } }, h("button", { class: "linkish", type: "button", text: "Close", onclick: () => { sug.hidden = true; } }))));
  sug.hidden = false;
  if (!results.hidden) { q.value = ""; runSearch(); }
  sug.scrollIntoView({ behavior: "smooth", block: "center" });
}
