/* Tự sinh bởi scripts/build.js từ assets/tools/compound-interest.js và i18n/en/js/ — đừng sửa tay. */
/* Lãi kép: vốn ban đầu + góp thêm hằng tháng, nhập lãi theo năm/quý/tháng/ngày; biểu đồ tăng trưởng theo năm */
import { h } from "../core.js";
import { formTool } from "../frames/form.js";
import { money, num, stat, stats, table, csvButton, alert, note } from "../calc.js";
import { compound } from "../lib/tai-chinh.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
/** 1.250.000.000 → "1,25 tỷ" */
function short(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return num(n / 1e9, 2) + " B";
  if (a >= 1e6) return num(n / 1e6, a >= 1e8 ? 0 : 1) + " M";
  if (a >= 1e3) return num(n / 1e3, 0) + " k";
  return num(n, 0);
}
function niceStep(max, ticks = 4) {
  const raw = max / ticks, p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || raw;
}

function chart(rows, width) {
  // vẽ đúng bề rộng khung để chữ trục không bị thu nhỏ trên điện thoại
  const W = Math.max(280, Math.round(width || 600)), H = 240, L = 52, R = 6, T = 10, B = 24;
  const data = rows.slice(1);
  const max = Math.max(...data.map((r) => r.value), 1);
  const step = niceStep(max), top = Math.ceil(max / step) * step;
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const bw = (W - L - R) / data.length, barW = Math.max(2, Math.min(28, bw * 0.7));
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "ci-svg", role: "img", "aria-label": "Chart of asset value by year: contributions and interest" });
  for (let v = 0; v <= top + 1e-6; v += step) {
    s.append(svg("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "ci-grid" }));
    const t = svg("text", { x: L - 6, y: y(v) + 4, class: "ci-ax", "text-anchor": "end" }); t.textContent = short(v); s.append(t);
  }
  const every = Math.ceil(data.length / Math.max(4, Math.floor((W - L) / 44)));
  const tip = h("div", { class: "ci-tip", hidden: true });
  const wrap = h("div", { class: "ci-wrap" }, tip);
  data.forEach((r, i) => {
    const cx = L + bw * i + bw / 2, x = cx - barW / 2;
    const yC = y(r.contributed), yV = y(r.value), base = y(0);
    const rad = Math.min(4, barW / 2);
    s.append(svg("rect", { x, y: yC, width: barW, height: Math.max(0, base - yC), class: "ci-a" }));
    const hI = Math.max(0, yC - 2 - yV); // khe 2px giữa hai phần
    if (hI > 0.5) s.append(svg("path", { class: "ci-b", d: `M${x},${yC - 2}V${yV + rad}Q${x},${yV} ${x + rad},${yV}H${x + barW - rad}Q${x + barW},${yV} ${x + barW},${yV + rad}V${yC - 2}Z` }));
    if (i % every === 0 || i === data.length - 1) { const t = svg("text", { x: cx, y: H - 8, class: "ci-ax", "text-anchor": "middle" }); t.textContent = r.year; s.append(t); }
    const hit = svg("rect", { x: L + bw * i, y: T, width: bw, height: H - T - B, class: "ci-hit" });
    const show = () => {
      tip.hidden = false;
      tip.innerHTML = "";
      tip.append(h("b", { text: "Year " + r.year }), h("span", { text: "Total: " + money(r.value) }), h("span", { text: "Contributions: " + money(r.contributed) }), h("span", { text: "Interest: " + money(r.interest) }));
      const box = wrap.getBoundingClientRect(), px = (cx / W) * box.width;
      tip.style.left = Math.min(Math.max(px, 80), box.width - 80) + "px";
    };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("pointerleave", () => { tip.hidden = true; });
    s.append(hit);
  });
  wrap.prepend(s);
  return h("div", null, wrap, h("ul", { class: "legend" }, h("li", { style: { "--c": "var(--ci-a)" }, text: "Contributions" }), h("li", { style: { "--c": "var(--ci-b)" }, text: "Accumulated interest" })));
}

formTool({
  fields: [
    { id: "p", type: "money", label: "Initial deposit", value: "10000", suffix: "" },
    { id: "m", type: "money", label: "Monthly contribution", value: "500", suffix: "" },
    { id: "r", type: "number", label: "Interest / return rate (%/year)", value: "8", attrs: { min: 0, max: 100, step: "any" } },
    { id: "y", type: "number", label: "Years", value: "15", attrs: { min: 1, max: 60, step: 1, inputmode: "numeric" } },
    { id: "f", type: "select", label: "Compounding", value: "12", choices: [["1", "Yearly"], ["4", "Quarterly"], ["12", "Monthly"], ["365", "Daily"]] },
    { id: "start", type: "check", label: "Contribute at the start of the month", hint: "Contributions are made at the end of the month by default." }
  ],
  compute(v, out) {
    out.textContent = "";
    const years = Math.round(+v.y || 0);
    if (!years || years > 60) { out.append(alert("info", "Enter a number of years from 1 to 60.")); return; }
    if (!(+v.p) && !(+v.m)) { out.append(alert("info", "Enter an initial deposit or a monthly contribution.")); return; }
    const c = compound({ initial: +v.p || 0, monthly: +v.m || 0, rate: +v.r || 0, years, freq: +v.f, atStart: v.start });
    out.append(stats(
      stat(`Value after ${years} ${(years) == 1 ? "year" : "years"}`, money(c.value), { hl: true }),
      stat("Total contributions", money(c.contributed)),
      stat("Interest", money(c.interest), { note: c.contributed ? "equal to " + num((c.interest / c.contributed) * 100, 1) + "% of contributions" : "" })));
    out.append(chart(c.rows, out.clientWidth - 2 * parseFloat(getComputedStyle(out).paddingLeft || "16")));
    const head = ["Year", "Contributions", "Accumulated interest", "Total value"];
    out.append(h("div", { class: "row", style: { justifyContent: "space-between" } }, h("p", { class: "opt-title", text: "Yearly table" }),
      csvButton("compound-interest.csv", head, c.rows.slice(1).map((r) => [r.year, Math.round(r.contributed), Math.round(r.interest), Math.round(r.value)]))),
      table(head, c.rows.slice(1).map((r) => [String(r.year), money(r.contributed, ""), money(r.interest, ""), money(r.value, "")]), { tall: years > 10, caption: "Value by year" }),
      note("Assumes a constant interest rate, before inflation, taxes and fees. Rule of 72: money doubles in about " + (+v.r > 0 ? num(72 / +v.r, 1) + " years" : "–") + "."));
  }
});

const st = document.createElement("style");
st.textContent = `.ci-wrap{position:relative;--ci-a:#3E5BF2;--ci-b:#E5701A}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .ci-wrap{--ci-a:#3987E5;--ci-b:#D95926}}
:root[data-theme="dark"] .ci-wrap{--ci-a:#3987E5;--ci-b:#D95926}
.legend{--ci-a:#3E5BF2;--ci-b:#E5701A}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .legend{--ci-a:#3987E5;--ci-b:#D95926}}
:root[data-theme="dark"] .legend{--ci-a:#3987E5;--ci-b:#D95926}
.ci-svg{width:100%;height:auto;display:block}.ci-grid{stroke:var(--line);stroke-width:1}.ci-ax{fill:var(--muted);font-size:12px;font-family:var(--font)}
.ci-a{fill:var(--ci-a)}.ci-b{fill:var(--ci-b)}.ci-hit{fill:transparent}.ci-hit:hover{fill:color-mix(in srgb,var(--ink) 6%,transparent)}
.ci-tip{position:absolute;top:4px;transform:translateX(-50%);background:var(--surface);border:1px solid var(--line-2);box-shadow:var(--shadow);border-radius:10px;padding:8px 10px;font-size:13px;display:flex;flex-direction:column;gap:2px;pointer-events:none;white-space:nowrap;z-index:2}
.ci-tip[hidden]{display:none}`;
document.head.append(st);
