/* Tự sinh bởi scripts/build.js từ assets/tools/split-bill.js và i18n/en/js/ — đừng sửa tay. */
/* Chia tiền nhóm: thành viên, các khoản chi (ai trả, chia cho ai) → ai nợ ai với số lần chuyển khoản ít nhất.
   Trạng thái nằm trên URL để gửi cho cả nhóm; có nút tạo mã VietQR cho từng khoản chuyển. */
import { h, icon, ROOT, LANG } from "../core.js";
import { formTool } from "../frames/form.js";
import { money, stat, stats, table, alert, note } from "../calc.js";
import { settle } from "../lib/chia-tien.js";

const fmt = (d) => (d ? d.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "");
let people = [];
let expenses = [];
let API = null;

/* Mã hoá trên URL: người "An,Bình,Chi"; khoản chi "payer.amount.among(bitmask hex).tên" nối bằng "~" */
const encP = () => people.map((p) => p.replace(/[,~]/g, " ")).join(",");
const encE = () => expenses.map((e) => [e.payer, e.amount || 0, e.among.length === people.length ? "*" : e.among.reduce((m, i) => m | (1 << i), 0).toString(16), (e.desc || "").replace(/[~]/g, " ")].join(".")).join("~");
function decE(s) {
  return String(s || "").split("~").filter(Boolean).map((x) => {
    const [payer, amount, mask, ...d] = x.split(".");
    const among = mask === "*" || !mask ? people.map((_, i) => i) : people.map((_, i) => i).filter((i) => parseInt(mask, 16) & (1 << i));
    return { payer: Math.min(+payer || 0, people.length - 1), amount: +amount || 0, among, desc: d.join(".") };
  });
}

function peopleEditor() {
  const box = h("div", { class: "sb-people" });
  const input = h("input", { type: "text", placeholder: "Member name", "aria-label": "New member name", maxlength: 24 });
  const add = () => { const n = input.value.trim(); if (!n) return; if (people.length >= 20) return; people.push(n.replace(/[,~]/g, " ")); expenses.forEach((e) => { if (e.among.length === people.length - 1) e.among.push(people.length - 1); }); input.value = ""; changed(); input.focus(); };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  const el = h("div", { class: "field" }, h("span", { class: "lbl", text: "Members" }), box,
    h("div", { class: "sb-add" }, input, h("button", { class: "btn ghost sm", type: "button", onclick: add }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Add")));
  const draw = () => {
    box.textContent = "";
    people.forEach((p, i) => box.append(h("span", { class: "chip" }, p, h("button", { class: "ib sm", type: "button", "aria-label": "Remove " + p, title: "Remove", html: icon("x"), onclick: () => remove(i) }))));
  };
  function remove(i) {
    if (people.length <= 2) return;
    people.splice(i, 1);
    expenses = expenses.filter((e) => e.payer !== i).map((e) => ({ ...e, payer: e.payer > i ? e.payer - 1 : e.payer, among: e.among.filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)) }));
    changed();
  }
  el._draw = draw;
  return { el, get: () => encP(), set: (v) => { people = String(v || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20); if (people.length < 2) people = ["An", "Ben", "Chi"]; draw(); } };
}

function expensesEditor() {
  const list = h("div", { class: "sb-list" });
  const el = h("div", { class: "field" }, h("span", { class: "lbl", text: "Expenses" }), list,
    h("button", { class: "btn ghost sm", type: "button", style: { alignSelf: "flex-start" }, onclick: () => { expenses.push({ payer: 0, amount: 0, among: people.map((_, i) => i), desc: "" }); changed(); list.querySelector(".sb-exp:last-child .sb-amt")?.focus(); } }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Add expense"));
  const draw = () => {
    list.textContent = "";
    expenses.forEach((e, k) => {
      const payer = h("select", { "aria-label": "Payer of expense " + (k + 1), onchange: (ev) => { e.payer = +ev.target.value; changed(true); } }, people.map((p, i) => h("option", { value: i, text: p, selected: i === e.payer })));
      const amt = h("input", { class: "sb-amt", type: "text", inputmode: "numeric", placeholder: "Amount", "aria-label": "Amount of expense " + (k + 1), value: fmt(String(e.amount || "")) });
      amt.addEventListener("input", () => { const d = amt.value.replace(/\D/g, "").slice(0, 12); amt.value = fmt(d); e.amount = +d || 0; changed(true); });
      const desc = h("input", { type: "text", placeholder: "Description (dinner, taxi…)", "aria-label": "Description of expense " + (k + 1), maxlength: 40, value: e.desc || "", oninput: (ev) => { e.desc = ev.target.value; changed(true); } });
      const among = h("div", { class: "sb-among", role: "group", "aria-label": "Split between" }, people.map((p, i) => h("label", { class: "sb-tick" },
        h("input", { type: "checkbox", checked: e.among.includes(i), onchange: (ev) => { e.among = ev.target.checked ? [...e.among, i].sort((a, b) => a - b) : e.among.filter((x) => x !== i); changed(true); } }), h("span", { text: p }))));
      list.append(h("div", { class: "sb-exp" },
        h("div", { class: "sb-row" }, desc, h("button", { class: "ib sm", type: "button", title: "Remove expense", "aria-label": "Remove expense " + (k + 1), html: icon("trash-2"), onclick: () => { expenses.splice(k, 1); changed(); } })),
        h("div", { class: "sb-row" }, h("span", { class: "muted small", text: "Paid by" }), payer, amt),
        h("div", { class: "sb-row" }, h("span", { class: "muted small", text: "Split between" }), among)));
    });
    if (!expenses.length) list.append(h("p", { class: "hint", text: "No expenses yet." }));
  };
  el._draw = draw;
  return { el, get: () => encE(), set: (v) => { expenses = decE(v); draw(); } };
}

/** soft = chỉ tính lại (đang gõ trong ô, không vẽ lại danh sách để giữ con trỏ) */
function changed(soft) {
  if (!API) return;
  if (!soft) { API.ctrls.ppl.el._draw(); API.ctrls.ex.el._draw(); }
  API.update();
}

formTool({
  fields: [
    { id: "ppl", type: "custom", render: peopleEditor, value: "An,Ben,Chi,Dan" },
    { id: "ex", type: "custom", render: expensesEditor, value: "0.120.*.Dinner~1.30.*.Taxi~2.24.7.Coffee" },
    { id: "round", type: "select", label: "Round transfer amounts", value: LANG === "vi" ? "1000" : "1",
      choices: LANG === "vi" ? [["1", "No rounding"], ["1000", "To 1,000"], ["10000", "To 10,000"]] : [["1", "No rounding"], ["10", "To 10"], ["100", "To 100"]] }
  ],
  init(api) { API = api; },
  compute(v, out) {
    out.textContent = "";
    const valid = expenses.filter((e) => e.amount > 0 && e.among.length);
    if (!valid.length) { out.append(alert("info", "Add expenses: who paid, how much, and who it's split between.")); return; }
    const r = settle(people, valid, { round: +v.round || 1 });
    out.append(stats(stat("Total spent", money(r.total), { hl: true }), stat("Average per person", money(r.total / people.length)), stat("Number of transfers", String(r.transfers.length))));
    if (r.transfers.length) {
      out.append(h("p", { class: "opt-title", text: "Who pays whom" }),
        h("ul", { class: "sb-tx" }, r.transfers.map((t) => h("li", null,
          h("b", { text: people[t.from] }), h("span", { html: icon("arrow-right") }), h("b", { text: people[t.to] }), h("span", { class: "sb-money", text: money(t.amount) }),
          LANG !== "vi" ? null : h("a", { class: "btn ghost sm", href: `${ROOT}tao-ma-qr-chuyen-khoan/?amount=${t.amount}`, title: `Create a QR code for ${people[t.from]} to pay ${people[t.to]}` }, h("span", { html: icon("qr-code"), style: { display: "contents" } }), "QR")))));
    } else out.append(alert("ok", "Everyone has paid their share; nobody owes anything."));
    out.append(table(["Members", "Paid", "Share", "Balance"], people.map((p, i) => [p, money(r.paid[i], ""), money(r.share[i], ""), (r.balance[i] > 0 ? "+" : "") + money(r.balance[i], "")]), { cls: ["l"] }),
      note("A positive balance means money back, negative means paying more. Click “Copy link” to send this split to the group — the data lives in the link itself, not stored anywhere."));
  }
});

const st = document.createElement("style");
st.textContent = `.sb-people{display:flex;flex-wrap:wrap;gap:6px}.sb-people .chip{padding-right:4px}.sb-add{display:flex;gap:8px}.sb-add input{flex:1}
.sb-list{display:flex;flex-direction:column;gap:10px}.sb-exp{border-top:1px solid var(--line);padding:12px 0 2px;display:flex;flex-direction:column;gap:8px}
.sb-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sb-row>input,.sb-row>select{flex:1;min-width:120px}.sb-row>.muted{width:58px}
.sb-among{display:flex;flex-wrap:wrap;gap:6px;flex:1}.sb-tick{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:99px;padding:3px 10px;font-size:14px;cursor:pointer}
.sb-tick:has(input:checked){background:var(--brand-soft);border-color:var(--brand)}
.sb-tx{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}.sb-tx li{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.sb-tx .i{width:16px;height:16px;color:var(--muted)}.sb-money{font-weight:800;font-variant-numeric:tabular-nums;margin-left:auto}`;
document.head.append(st);
