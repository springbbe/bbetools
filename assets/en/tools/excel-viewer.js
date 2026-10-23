/* Tự sinh bởi scripts/build.js từ assets/tools/excel-viewer.js và i18n/en/js/ — đừng sửa tay. */
/* Xem file Excel/CSV: mở .xlsx, .xls, .ods, .csv ngay trên trình duyệt; chuyển sheet, tìm (không cần dấu), lọc theo cột,
   sắp xếp, xem nội dung ô, tải phần đang lọc ra CSV/Excel. Bảng chỉ vẽ từng trang 200 dòng để mở được file lớn. */
import { h, icon, debounce, sampleFiles, save, baseName, copyText, toast, fmtNum } from "../core.js";
import { fileTool } from "../frames/file.js";
import { readBook, cellText, cellValue, writeCsv, writeXlsx, XL } from "../sheet.js";
import { sortIndex, filterIndex, colName } from "../lib/bang.js";

const PAGE = 200;
let F = null, item = null, book = null, si = 0, header = true, q = "", qCol = -1, sort = null, page = 0, view = [];
let tabs, toolbar, qIn, colSel, countEl, tblWrap, pager, cellBar, banner, nameEl, infoBox, headSw;

const sheet = () => (book ? book.sheets[si] : null);
const bodyRows = () => { const s = sheet(); return s ? (header ? s.rows.slice(1) : s.rows) : []; };
const ncols = () => { const s = sheet(); return s ? s.rows.reduce((m, r) => Math.max(m, r.length), 0) : 0; };
const colLabel = (j) => { const s = sheet(); const t = header && s && s.rows[0] ? cellText(s.rows[0][j]).trim() : ""; return t || "Column " + colName(j); };

async function load(it) {
  const b = await readBook(it.file);
  if (!b.sheets.some((s) => s.rows.length)) { const e = new Error("empty"); e.userMsg = `${it.name} has no data.`; throw e; }
  it.info = b.kind === "csv" ? `CSV · ${b.encoding} · ${fmtNum(b.sheets[0].rows.length)} rows` : `${b.sheets.length} sheet`;
  item = it; book = b;
  si = Math.max(0, b.sheets.findIndex((s) => s.rows.length && !s.hidden));
  q = ""; qCol = -1; sort = null; page = 0;
  qIn.value = "";
  showSheet();
}

function showSheet() {
  const s = sheet();
  tabs.textContent = "";
  tabs.hidden = book.sheets.length < 2;
  book.sheets.forEach((x, i) => tabs.append(h("button", { class: "chip", type: "button", role: "tab", "aria-selected": String(i === si), "aria-current": i === si ? "true" : null,
    onclick: () => { si = i; sort = null; page = 0; qCol = -1; showSheet(); } }, x.name, x.hidden ? h("small", { text: " (hidden)" }) : null, h("small", { text: " " + fmtNum(Math.max(0, x.rows.length - (header ? 1 : 0))) }))));
  // mặc định coi dòng đầu là tiêu đề nếu toàn chữ
  colSel.textContent = "";
  colSel.append(h("option", { value: "-1", text: "All columns" }), Array.from({ length: ncols() }, (_, j) => h("option", { value: j, text: colLabel(j) })));
  colSel.value = String(qCol);
  nameEl.textContent = item.name;
  banner.hidden = !item.sample;
  toolbar.hidden = false;
  info();
  apply();
}

function apply() {
  const rows = bodyRows();
  view = filterIndex(rows, q, qCol, cellText);
  if (sort) { const order = sortIndex(view.map((i) => rows[i]), sort.col, sort.dir, cellValue); view = order.map((k) => view[k]); }
  page = Math.min(page, Math.max(0, Math.ceil(view.length / PAGE) - 1));
  draw();
}

function draw() {
  const rows = bodyRows(), n = ncols();
  cellBar.hidden = true;
  const start = page * PAGE, slice = view.slice(start, start + PAGE);
  countEl.textContent = q ? `${fmtNum(view.length)} / ${fmtNum(rows.length)} matching rows` : `${fmtNum(rows.length)} rows × ${n} columns`;
  const thead = h("tr", null, h("th", { class: "rn", scope: "col", "aria-label": "Row number" }, "#"),
    Array.from({ length: n }, (_, j) => {
      const dir = sort && sort.col === j ? sort.dir : 0;
      return h("th", { scope: "col", "aria-sort": dir === 1 ? "ascending" : dir === -1 ? "descending" : "none" },
        h("button", { type: "button", class: "xv-sort", title: "Sort by this column", onclick: () => { sort = !sort || sort.col !== j ? { col: j, dir: 1 } : sort.dir === 1 ? { col: j, dir: -1 } : null; page = 0; apply(); } },
          h("span", { text: colLabel(j) }), h("span", { class: "xv-arrow", html: icon(dir === 1 ? "arrow-up" : dir === -1 ? "arrow-down" : "arrow-up-down") })));
    }));
  const tbody = h("tbody");
  for (const i of slice) {
    const r = rows[i];
    const tr = h("tr", null, h("th", { class: "rn", scope: "row", text: i + 1 + (header ? 1 : 0) }));
    for (let j = 0; j < n; j++) {
      const c = r[j], t = cellText(c);
      tr.append(h("td", { class: c && c.t === "n" ? "num" : null, "data-r": i, "data-c": j, tabindex: "-1" }, t));
    }
    tbody.append(tr);
  }
  tblWrap.textContent = "";
  tblWrap.append(h("table", { class: "tbl xl-tbl xv-tbl" }, h("thead", null, thead), tbody));
  if (!slice.length) tblWrap.append(h("p", { class: "hint", style: { padding: "12px" }, text: q ? "No matching rows." : "This sheet is empty." }));
  const pages = Math.ceil(view.length / PAGE);
  pager.textContent = "";
  pager.hidden = pages < 2;
  if (pages > 1) pager.append(
    h("button", { class: "ib sm", type: "button", "aria-label": "Previous page", html: icon("chevron-left"), disabled: page === 0, onclick: () => { page--; draw(); tblWrap.scrollTop = 0; } }),
    h("span", { text: `Rows ${fmtNum(start + 1)}–${fmtNum(Math.min(view.length, start + PAGE))} / ${fmtNum(view.length)}` }),
    h("button", { class: "ib sm", type: "button", "aria-label": "Next page", html: icon("chevron-right"), disabled: page >= pages - 1, onclick: () => { page++; draw(); tblWrap.scrollTop = 0; } }));
}

function showCell(td) {
  const i = +td.dataset.r, j = +td.dataset.c, c = bodyRows()[i][j];
  const t = cellText(c);
  cellBar.textContent = "";
  cellBar.hidden = false;
  tblWrap.querySelectorAll("td.sel").forEach((x) => x.classList.remove("sel"));
  td.classList.add("sel");
  cellBar.append(h("b", { text: colName(j) + (i + 1 + (header ? 1 : 0)) }), h("span", { class: "xv-val", text: t || "(empty)" }),
    c && c.f ? h("code", { text: "=" + c.f, title: "Formula" }) : "",
    t ? h("button", { class: "ib sm", type: "button", "aria-label": "Copy cell content", title: "Copy", html: icon("copy"), onclick: () => copyText(t) }) : "");
}

function info() {
  const s = sheet();
  infoBox.textContent = "";
  const rows = [["File", item.name], ["Type", book.kind === "csv" ? `CSV, ${book.encoding} encoding, “${book.delim === "\t" ? "Tab" : book.delim}” delimiter` : "Excel"], ["Sheets", book.sheets.length], ["This sheet", `${fmtNum(s.rows.length)} rows × ${ncols()} columns`]];
  infoBox.append(h("p", { class: "opt-title", text: "Info" }), h("dl", { class: "kv" }, rows.map(([k, v]) => [h("dt", { text: k }), h("dd", { text: String(v) })])));
}

/** Bảng đang xem (đã lọc, sắp xếp) kèm dòng tiêu đề */
function current() {
  const s = sheet(), rows = bodyRows();
  return [...(header && s.rows[0] ? [s.rows[0]] : []), ...view.map((i) => rows[i])];
}

fileTool({
  accept: ["excel", "csv"], multiple: false, noun: "Excel or CSV files",
  action: "View",
  sample: () => sampleFiles("nhan-vien.xlsx"),
  warm: () => XL(),
  custom: {
    mount(ctx) {
      F = ctx;
      ctx.goBtn.closest(".act").hidden = true; // chỉ xem, không có bước xử lý
      nameEl = h("span", { class: "count" });
      banner = h("p", { class: "alert info", hidden: true, text: "This is a sample file (fake data). Choose, drag and drop or paste your Excel/CSV file to view it." });
      tabs = h("div", { class: "chip-list xv-tabs", role: "tablist", "aria-label": "Sheets" });
      qIn = h("input", { class: "input", type: "search", placeholder: "Search (accents optional)", "aria-label": "Search the table", autocomplete: "off",
        oninput: debounce(() => { q = qIn.value; page = 0; apply(); }, 200) });
      colSel = h("select", { class: "select", "aria-label": "Search in column", onchange: () => { qCol = +colSel.value; page = 0; apply(); } });
      countEl = h("span", { class: "hint", "aria-live": "polite" });
      toolbar = h("div", { class: "xv-bar", hidden: true }, qIn, colSel, countEl);
      cellBar = h("div", { class: "xv-cell", hidden: true, "aria-live": "polite" });
      tblWrap = h("div", { class: "tbl-wrap xl-wrap xv-wrap", tabindex: "0", role: "region", "aria-label": "Data table" });
      tblWrap.addEventListener("click", (e) => { const td = e.target.closest("td[data-r]"); if (td) showCell(td); });
      pager = h("div", { class: "row xv-pager", hidden: true });
      ctx.workMain.append(h("div", { class: "work-head" }, nameEl, h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Other file"))),
      banner, tabs, toolbar, cellBar, tblWrap, pager);
      document.addEventListener("keydown", (e) => {
        if (!book || F.state.step !== "work") return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); qIn.focus(); qIn.select(); }
      });
    }
  },
  load,
  dispose: (it) => { if (it === item) { item = null; book = null; if (tblWrap) tblWrap.textContent = ""; } },
  options(el) {
    headSw = h("input", { type: "checkbox", checked: true, onchange: () => { header = headSw.checked; sort = null; page = 0; if (book) showSheet(); } });
    infoBox = h("div", { class: "opt-group" });
    const exp = (label, ico, fn) => h("button", { class: "btn ghost block", type: "button", onclick: async () => {
      if (!book) return;
      try { await fn(); } catch (e) { console.error(e); toast(e.userMsg || "Couldn't export the file", { type: "err" }); }
    } }, h("span", { html: icon(ico), style: { display: "contents" } }), label);
    el.append(
      h("label", { class: "switch" }, headSw, h("span", null, "First row is the header", h("small", { text: "Used as column names, not sorted with the data." }))),
      infoBox,
      h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: "Download current view" }),
        h("small", { class: "hint", text: "With the current filter and sort order." }),
        h("div", { class: "xv-exp" },
          exp("Download Excel (.xlsx)", "file-spreadsheet", async () => { const X = await XL(); save(writeXlsx(X, [{ name: sheet().name, rows: current() }], { filter: header }), baseName(item.name) + (q ? "-filtered" : "") + ".xlsx"); }),
          exp("Download CSV (UTF-8)", "file-text", async () => save(writeCsv(current()), baseName(item.name) + (book.sheets.length > 1 ? " - " + sheet().name : "") + (q ? "-filtered" : "") + ".csv")))),
      h("p", { class: "hint", html: "Tip: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>F</kbd> to search, click a column header to sort, click a cell to see its full content." }));
  },
  ready: () => "Viewing",
  run: async () => null
});

const css = document.createElement("style");
css.textContent = `
.xv-tabs{margin:0 0 10px}
.xv-tabs .chip small{opacity:.7}
.xv-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
.xv-bar .input{flex:1 1 180px;min-width:0}
.xv-bar .select{flex:0 1 200px;min-width:0}
.xv-cell{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 12px;margin-bottom:8px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:14px}
.xv-cell .xv-val{flex:1 1 200px;white-space:pre-wrap;word-break:break-word}
.xv-cell code{font-size:12.5px;color:var(--muted)}
.xv-wrap{max-height:70vh}
.xv-tbl td{cursor:default}
.xv-tbl td.sel{outline:2px solid var(--brand);outline-offset:-2px}
.xv-tbl .rn{position:sticky;left:0;z-index:2;background:var(--surface-2);color:var(--muted);font-weight:500;font-size:12px;text-align:right;min-width:3em}
.xv-tbl thead .rn{z-index:3}
.xv-sort{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-weight:600}
.xv-sort:focus-visible{outline:2px solid var(--brand);border-radius:4px}
.xv-arrow{flex:none;display:inline-flex}
.xv-arrow .i{width:14px;height:14px;flex:none;opacity:.55}
th[aria-sort="ascending"] .xv-arrow .i,th[aria-sort="descending"] .xv-arrow .i{opacity:1;color:var(--brand)}
.xv-exp{display:grid;gap:8px;margin-top:8px;align-content:start}
.xv-exp .btn{margin:0}
.xv-pager{justify-content:center;align-items:center;margin-top:10px;font-size:14px}
`;
document.head.append(css);
