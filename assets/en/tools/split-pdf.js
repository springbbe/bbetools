/* Tự sinh bởi scripts/build.js từ assets/tools/split-pdf.js và i18n/en/js/ — đừng sửa tay. */
/* Tách PDF: theo khoảng trang, cứ mỗi N trang một file, hoặc bấm chọn trang để lấy ra */
import { h, baseName, sampleFiles, nextFrame } from "../core.js";
import { seg, radioVal } from "../frames/file.js";
import { pageTool, firstItem } from "../pdf-pages.js";
import { pdfBlob } from "../pdf.js";
import { parseRanges, chunkPages, halves, rangeSlug } from "../lib/page-ranges.js";

const COLORS = ["#E5484D", "#3E63DD", "#18794E", "#C27C0E", "#8E4EC6", "#0D74CE", "#D6409F", "#5C8A1C"];
let el = null, ranges = null, every = null, pick = null, groupOf = new Map();

// các nhóm trang (mỗi nhóm thành một file) theo cách tách đang chọn
function groupsOf(B, o) {
  const n = B.pages.length;
  if (o.mode === "range") {
    const r = parseRanges(o.ranges, n);
    return { groups: o.mergeRanges ? (r.pages.length ? [r.pages] : []) : r.groups, bad: r.bad };
  }
  if (o.mode === "every") return { groups: chunkPages(n, o.every), bad: false };
  const sel = B.pages.flatMap((p, i) => (p.sel ? [i + 1] : []));
  return { groups: o.separate ? sel.map((x) => [x]) : sel.length ? [sel] : [], bad: false };
}

pageTool({
  action: "Split PDF",
  sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: () => (el && radioVal(el, "mode") === "pick" ? "sel" : null),
  rangeProp: "sel",
  clickLabel: "Click to select or deselect a page",
  click(p) {
    if (radioVal(el, "mode") !== "pick") { el.querySelector('input[name="mode"][value="pick"]').checked = true; showMode(); }
    p.sel = !p.sel;
  },
  group(p, idx) {
    const gi = groupOf.get(idx + 1);
    return gi == null ? null : { color: COLORS[gi % COLORS.length], label: "File " + (gi + 1) };
  },
  onPages(B) { ranges.value = halves(B.pages.length); },
  options(e, ctx, B) {
    el = e;
    ranges = h("input", { class: "input", id: "ranges", inputmode: "numeric", autocomplete: "off", spellcheck: "false", placeholder: "VD: 1-3, 4-6, 9-" });
    every = h("input", { class: "input", id: "every", type: "number", min: 1, value: 1, inputmode: "numeric" });
    pick = B.rangeField("sel", "Selected pages", "Click pages or type: 1, 3, 5-7");
    e.append(
      seg("mode", [["range", "By ranges"], ["every", "Every N pages"], ["pick", "Pick pages"]], "range", "Split method"),
      h("div", { class: "opt-group", id: "g-range" },
        h("label", { class: "field" }, h("span", { text: "Page ranges (each range becomes one file)" }), ranges,
          h("p", { class: "field-err", id: "range-err", hidden: true }),
          h("small", { text: "Separate with commas. “8-” means from page 8 to the end." })),
        h("label", { class: "switch" }, h("input", { type: "checkbox", id: "merge-ranges" }), h("span", null, "Merge the ranges into one file", h("small", { text: "Use this when you only want to pull out a few sections." })))),
      h("div", { class: "opt-group", id: "g-every", hidden: true },
        h("label", { class: "field" }, h("span", { text: "How many pages per file?" }), every)),
      h("div", { class: "opt-group", id: "g-pick", hidden: true }, pick.el,
        h("p", { class: "hint", html: "Click pages to select them. Hold <kbd>Shift</kbd> and click to select a range." }),
        h("label", { class: "switch" }, h("input", { type: "checkbox", id: "separate" }), h("span", { text: "Each selected page becomes its own file" }))));
    e.addEventListener("change", (ev) => { if (ev.target.name === "mode") showMode(); });
    return () => ({
      mode: radioVal(e, "mode"), ranges: ranges.value, every: +every.value || 1,
      mergeRanges: e.querySelector("#merge-ranges").checked, separate: e.querySelector("#separate").checked
    });
  },
  onChange(B, ctx) {
    if (!B.pages.length) return;
    const o = ctx.opts, { groups, bad } = groupsOf(B, o);
    const err = el.querySelector("#range-err");
    err.hidden = !(o.mode === "range" && bad);
    err.textContent = `Something isn't right (the file has ${B.pages.length} pages). Example: 1-3, 5, 8-`;
    const next = new Map();
    if (o.mode !== "pick") groups.forEach((g, gi) => g.forEach((n) => { if (!next.has(n)) next.set(n, gi); }));
    groupOf = next;
    B.repaint();
    pick.sync();
  },
  summary(B, o) {
    const { groups } = groupsOf(B, o);
    if (!groups.length) return o.mode === "pick" ? "Click the pages you want to extract." : "No page ranges yet.";
    const used = new Set(groups.flat()).size;
    return `Will create <b>${groups.length}</b> PDF ${(groups.length) == 1 ? "file" : "files"} from <b>${used}</b>/${B.pages.length} pages${groups.length > 1 ? " (download each file or a .zip)" : ""}.`;
  },
  ready(B, o) {
    const { groups } = groupsOf(B, o);
    return groups.length ? true : o.mode === "pick" ? "Select at least one page." : "Enter the page ranges to split.";
  },
  async run(B, o, ctx) {
    const { groups } = groupsOf(B, o);
    const base = baseName(firstItem(B).name), outs = [];
    for (let i = 0; i < groups.length; i++) {
      ctx.check();
      ctx.status(`Creating file ${i + 1}/${groups.length}…`);
      const doc = await B.build(groups[i].map((n) => B.pages[n - 1]));
      outs.push({ blob: pdfBlob(await doc.save({ useObjectStreams: true })), name: `${base}-trang-${rangeSlug(groups[i])}.pdf`, note: groups[i].length + " trang" });
      ctx.progress((i + 1) / groups.length);
      await nextFrame();
    }
    return outs;
  },
  zipName: "pdf-da-tach",
  doneTitle: (outs) => (outs.length > 1 ? `Split into ${outs.length} PDF files!` : "Split complete!")
});

function showMode() {
  const m = radioVal(el, "mode");
  el.querySelector("#g-range").hidden = m !== "range";
  el.querySelector("#g-every").hidden = m !== "every";
  el.querySelector("#g-pick").hidden = m !== "pick";
}
