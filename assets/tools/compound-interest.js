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
  if (a >= 1e9) return num(n / 1e9, 2) + " tỷ";
  if (a >= 1e6) return num(n / 1e6, a >= 1e8 ? 0 : 1) + " tr";
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
  const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "ci-svg", role: "img", "aria-label": "Biểu đồ giá trị tài sản theo năm: phần vốn góp và phần lãi" });
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
      tip.append(h("b", { text: "Năm " + r.year }), h("span", { text: "Tổng: " + money(r.value) }), h("span", { text: "Vốn góp: " + money(r.contributed) }), h("span", { text: "Lãi: " + money(r.interest) }));
      const box = wrap.getBoundingClientRect(), px = (cx / W) * box.width;
      tip.style.left = Math.min(Math.max(px, 80), box.width - 80) + "px";
    };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("pointerleave", () => { tip.hidden = true; });
    s.append(hit);
  });
  wrap.prepend(s);
  return h("div", null, wrap, h("ul", { class: "legend" }, h("li", { style: { "--c": "var(--ci-a)" }, text: "Vốn đã góp" }), h("li", { style: { "--c": "var(--ci-b)" }, text: "Tiền lãi tích luỹ" })));
}

formTool({
  fields: [
    { id: "p", type: "money", label: "Vốn ban đầu", value: "100000000", suffix: "đ" },
    { id: "m", type: "money", label: "Góp thêm mỗi tháng", value: "5000000", suffix: "đ" },
    { id: "r", type: "number", label: "Lãi suất / lợi nhuận (%/năm)", value: "8", attrs: { min: 0, max: 100, step: "any" } },
    { id: "y", type: "number", label: "Số năm", value: "15", attrs: { min: 1, max: 60, step: 1, inputmode: "numeric" } },
    { id: "f", type: "select", label: "Nhập lãi", value: "12", choices: [["1", "Mỗi năm"], ["4", "Mỗi quý"], ["12", "Mỗi tháng"], ["365", "Mỗi ngày"]] },
    { id: "start", type: "check", label: "Góp vào đầu tháng", hint: "Mặc định góp cuối tháng." }
  ],
  compute(v, out) {
    out.textContent = "";
    const years = Math.round(+v.y || 0);
    if (!years || years > 60) { out.append(alert("info", "Nhập số năm từ 1 đến 60.")); return; }
    if (!(+v.p) && !(+v.m)) { out.append(alert("info", "Nhập vốn ban đầu hoặc số tiền góp hằng tháng.")); return; }
    const c = compound({ initial: +v.p || 0, monthly: +v.m || 0, rate: +v.r || 0, years, freq: +v.f, atStart: v.start });
    out.append(stats(
      stat(`Giá trị sau ${years} năm`, money(c.value), { hl: true }),
      stat("Tổng vốn đã góp", money(c.contributed)),
      stat("Tiền lãi", money(c.interest), { note: c.contributed ? "bằng " + num((c.interest / c.contributed) * 100, 1) + "% số vốn" : "" })));
    out.append(chart(c.rows, out.clientWidth - 2 * parseFloat(getComputedStyle(out).paddingLeft || "16")));
    const head = ["Năm", "Vốn đã góp", "Lãi tích luỹ", "Tổng giá trị"];
    out.append(h("div", { class: "row", style: { justifyContent: "space-between" } }, h("p", { class: "opt-title", text: "Bảng theo năm" }),
      csvButton("lai-kep.csv", head, c.rows.slice(1).map((r) => [r.year, Math.round(r.contributed), Math.round(r.interest), Math.round(r.value)]))),
      table(head, c.rows.slice(1).map((r) => [String(r.year), money(r.contributed, ""), money(r.interest, ""), money(r.value, "")]), { tall: years > 10, caption: "Giá trị theo năm" }),
      note("Đơn vị: đồng. Giả định lãi suất không đổi, chưa trừ lạm phát, thuế và phí. Quy tắc 72: tiền tăng gấp đôi sau khoảng " + (+v.r > 0 ? num(72 / +v.r, 1) + " năm" : "–") + "."));
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
