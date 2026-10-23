/* Tự sinh bởi scripts/build.js từ assets/tools/text-diff.js và i18n/en/js/ — đừng sửa tay. */
/* So sánh văn bản: hai ô nhập, so theo dòng/từ/ký tự, tô màu phần thêm (xanh) và bớt (đỏ),
   xem song song hoặc gộp, gấp gọn đoạn giống nhau. */
import { $, h, icon, store, debounce, fmtNum, toast, copyText } from "../core.js";
import { diffText } from "../lib/diff.js";

const app = $("#app");
app.textContent = "";
const saved = store.get("tx:text-diff", {});
const o = Object.assign({ by: "line", view: innerWidth < 700 ? "inline" : "split", ignoreCase: false, ignoreSpace: false }, saved);

const SAMPLE_A = "HOUSE RENTAL AGREEMENT\nParty A: Mr. John Smith\nParty B: Ms. Jane Doe\nRent: $1,500/month\nTerm: 12 months\nDeposit: 1 month\nPayment due on the 5th of each month.\nBoth parties agree to follow this agreement.";
const SAMPLE_B = "HOUSE RENTAL AGREEMENT\nParty A: Mr. John Smith\nParty B: Ms. Jane Doe\nRent: $1,650/month\nTerm: 24 months\nDeposit: 2 months\nPayment due on the 5th of each month.\nParty B may keep pets.\nBoth parties agree to follow this agreement.";

const box = (id, label, ph) => {
  const ta = h("textarea", { id, placeholder: ph, spellcheck: "false", autocapitalize: "off" });
  const pane = h("div", { class: "pane" },
    h("div", { class: "pane-head" }, h("label", { class: "lbl", for: id, text: label }),
      h("button", { class: "ib sm", type: "button", "aria-label": "Clear " + label, title: "Clear", html: icon("trash-2"), onclick: () => { ta.value = ""; run(); ta.focus(); } })),
    ta);
  return { ta, pane };
};
const A = box("df-a", "Original", "Paste the old text…");
const B = box("df-b", "Changed", "Paste the new text…");

const sel = (id, label, choices) => h("label", { class: "field" }, h("span", { text: label }),
  h("select", { onchange: (e) => { o[id] = e.target.value; run(); } }, choices.map(([v, l]) => h("option", { value: v, text: l, selected: o[id] === v }))));
const chk = (id, label) => h("label", { class: "switch" }, h("input", { type: "checkbox", checked: o[id], onchange: (e) => { o[id] = e.target.checked; run(); } }), h("span", { text: label }));
const viewSel = sel("view", "View", [["split", "Side by side"], ["inline", "Unified"]]);

const opts = h("div", { class: "tx-opts" },
  sel("by", "Compare by", [["line", "Lines"], ["word", "Words"], ["char", "Characters"]]), viewSel,
  chk("ignoreCase", "Ignore case"), chk("ignoreSpace", "Ignore whitespace"),
  h("button", { class: "btn ghost sm", type: "button", onclick: () => { A.ta.value = SAMPLE_A; B.ta.value = SAMPLE_B; run(); } }, "Sample"),
  h("button", { class: "btn ghost sm", type: "button", onclick: () => { [A.ta.value, B.ta.value] = [B.ta.value, A.ta.value]; run(); } }, h("span", { html: icon("arrow-left-right"), style: { display: "contents" } }), "Swap sides"));
const stat = h("p", { class: "tx-info" });
const result = h("div", { class: "df-out", "aria-live": "polite" });
app.append(opts, h("div", { class: "tx-panes two" }, A.pane, B.pane),
  h("div", { class: "pane df-pane" }, h("div", { class: "pane-head" }, h("span", { class: "lbl", text: "Differences" }),
    h("button", { class: "btn ghost sm", type: "button", onclick: copyReport }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy the comparison")), stat, result));

let lastParts = [];
function copyReport() {
  if (!lastParts.length) return toast("Nothing to copy yet");
  const lines = [];
  for (const p of lastParts) {
    const text = p.items.join("");
    const mark = p.op === "=" ? "  " : p.op === "-" ? "- " : "+ ";
    if (o.by === "line") for (const l of text.replace(/\n$/, "").split("\n")) lines.push(mark + l);
    else lines.push(p.op === "=" ? text : p.op === "-" ? `[-${text}-]` : `{+${text}+}`);
  }
  copyText(o.by === "line" ? lines.join("\n") : lines.join(""));
}

const span = (cls, text) => (cls ? h(cls, null, text) : document.createTextNode(text));
/** Tô từ thay đổi trong một cặp dòng bị sửa */
function wordPair(oldText, newText) {
  const r = diffText(oldText, newText, { by: "word", ignoreCase: o.ignoreCase, ignoreSpace: o.ignoreSpace });
  const left = [], right = [];
  for (const p of r.parts) {
    const t = p.items.join("");
    if (p.op === "=") { left.push(span(null, t)); right.push(span(null, (p.right || p.items).join(""))); }
    else if (p.op === "-") left.push(span("del", t));
    else right.push(span("ins", t));
  }
  return [left, right];
}

function renderInline(parts) {
  const out = h("div", { class: "df-inline" + (o.by === "line" ? " lines" : "") });
  if (o.by !== "line") {
    for (const p of parts) out.append(span(p.op === "-" ? "del" : p.op === "+" ? "ins" : null, p.items.join("")));
    return out;
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], nx = parts[i + 1];
    if (p.op === "=") { equalBlock(out, p.items, (l) => h("div", { class: "df-l" }, h("span", { class: "df-m", text: " " }), l)); continue; }
    if (p.op === "-" && nx && nx.op === "+" && p.items.length === nx.items.length && p.items.length <= 50) {
      p.items.forEach((l, k) => {
        const [left, right] = wordPair(l.replace(/\n$/, ""), nx.items[k].replace(/\n$/, ""));
        out.append(h("div", { class: "df-l del" }, h("span", { class: "df-m", text: "−" }), ...left), h("div", { class: "df-l ins" }, h("span", { class: "df-m", text: "+" }), ...right));
      });
      i++; continue;
    }
    for (const l of p.items) out.append(h("div", { class: "df-l " + (p.op === "-" ? "del" : "ins") }, h("span", { class: "df-m", text: p.op === "-" ? "−" : "+" }), l.replace(/\n$/, "")));
  }
  return out;
}

/** Đoạn giống nhau dài: chỉ hiện 3 dòng đầu/cuối, phần giữa gấp lại (bấm để mở) */
function equalBlock(out, items, row) {
  const lines = items.map((l) => l.replace(/\n$/, ""));
  if (lines.length <= 8) { lines.forEach((l) => out.append(row(l))); return; }
  lines.slice(0, 3).forEach((l) => out.append(row(l)));
  const hidden = lines.slice(3, -3);
  const btn = h("button", { class: "df-fold", type: "button" }, `… ${fmtNum(hidden.length)} identical ${(fmtNum(hidden.length)) == 1 ? "line" : "lines"} (click to show)`);
  btn.onclick = () => { const frag = document.createDocumentFragment(); hidden.forEach((l) => frag.append(row(l))); btn.replaceWith(frag); };
  out.append(btn);
  lines.slice(-3).forEach((l) => out.append(row(l)));
}

function renderSplit(parts) {
  const grid = h("div", { class: "df-split", role: "table", "aria-label": "Side-by-side comparison" });
  let la = 0, lb = 0;
  const cell = (n, cls, kids) => [h("span", { class: "df-n", text: n == null ? "" : String(n) }), h("span", { class: "df-c " + (cls || "") }, kids)];
  const row = (l, r) => grid.append(h("div", { class: "df-row", role: "row" }, ...l, ...r));
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i], nx = parts[i + 1];
    if (p.op === "=") {
      equalBlock(grid, p.items, (l) => h("div", { class: "df-row", role: "row" }, ...cell(++la, "", l), ...cell(++lb, "", l)));
      continue;
    }
    if (p.op === "-" && nx && nx.op === "+") {
      const n = Math.max(p.items.length, nx.items.length);
      for (let k = 0; k < n; k++) {
        const a = p.items[k], b = nx.items[k];
        if (a != null && b != null && p.items.length <= 200) {
          const [left, right] = wordPair(a.replace(/\n$/, ""), b.replace(/\n$/, ""));
          row(cell(++la, "del", left), cell(++lb, "ins", right));
        } else row(a != null ? cell(++la, "del", a.replace(/\n$/, "")) : cell(null, "empty", ""), b != null ? cell(++lb, "ins", b.replace(/\n$/, "")) : cell(null, "empty", ""));
      }
      i++; continue;
    }
    for (const l of p.items) {
      if (p.op === "-") row(cell(++la, "del", l.replace(/\n$/, "")), cell(null, "empty", ""));
      else row(cell(null, "empty", ""), cell(++lb, "ins", l.replace(/\n$/, "")));
    }
  }
  return grid;
}

const persist = debounce(() => store.set("tx:text-diff", o), 300);
function run() {
  persist();
  viewSel.hidden = o.by !== "line";
  result.textContent = "";
  const a = A.ta.value, b = B.ta.value;
  if (!a && !b) { stat.textContent = "Paste two versions of the text into the two boxes to compare."; lastParts = []; return; }
  const t0 = performance.now();
  const r = diffText(a, b, o);
  lastParts = r.parts;
  const unit = o.by === "line" ? "lines" : o.by === "word" ? "words" : "characters";
  if (!r.added && !r.removed) { stat.textContent = ""; stat.append(h("b", { text: "The two texts are identical" }), o.ignoreCase || o.ignoreSpace ? " (with the current ignore options)." : "."); }
  else { stat.textContent = ""; stat.append(h("span", { class: "df-plus", text: `+${fmtNum(r.added)}` }), " ", h("span", { class: "df-minus", text: `−${fmtNum(r.removed)}` }), ` ${unit} · ${Math.round(performance.now() - t0)} ms`); }
  result.append(o.by === "line" && o.view === "split" ? renderSplit(r.parts) : renderInline(r.parts));
}
const runSoon = debounce(run, 250);
A.ta.addEventListener("input", runSoon);
B.ta.addEventListener("input", runSoon);
run();
