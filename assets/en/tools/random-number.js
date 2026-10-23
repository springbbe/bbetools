/* Tự sinh bởi scripts/build.js từ assets/tools/random-number.js và i18n/en/js/ — đừng sửa tay. */
/* Số ngẫu nhiên: trong khoảng bất kỳ (tới ±9 triệu tỷ), nhiều số, không trùng, bỏ số, sắp xếp;
   chế độ quay số trúng thưởng: số đã ra không ra lại ở lượt sau. Dùng crypto.getRandomValues, không lệch. */
import { h, icon, copyText, sleep } from "../core.js";
import { formTool } from "../frames/form.js";
import { randBetween, uniqueInts } from "../lib/ngau-nhien.js";
import { alert } from "../calc.js";

const fmt = (n) => n.toLocaleString("en-US");
/** "7, 13, 20-25" → Set số */
function parseExclude(s) {
  const out = new Set();
  for (const part of String(s || "").split(/[,;\s]+/)) {
    const m = /^(-?\d+)(?:-(-?\d+))?$/.exec(part.trim());
    if (!m) continue;
    const a = +m[1], b = m[2] != null ? +m[2] : a;
    for (let v = Math.min(a, b); v <= Math.max(a, b) && out.size < 100000; v++) out.add(v);
  }
  return out;
}

let drawn = [], last = null, lastKey = "", rolling = false;
formTool({
  share: true,
  fields: [
    { id: "min", type: "number", label: "From", value: "1", attrs: { inputmode: "numeric" } },
    { id: "max", type: "number", label: "To", value: "100", attrs: { inputmode: "numeric" } },
    { id: "count", type: "number", label: "Count", value: "1", attrs: { min: 1, max: 10000, inputmode: "numeric" } },
    { id: "unique", type: "check", label: "No duplicates", value: true, show: (v) => +v.count > 1 },
    { id: "sort", type: "check", label: "Sort ascending", show: (v) => +v.count > 1 },
    { id: "raffle", type: "check", label: "Raffle mode", hint: "Numbers already drawn won't come up again until you click “Start over”" },
    { id: "ex", type: "text", label: "Exclude numbers (optional)", placeholder: "VD: 4, 13, 20-25" }
  ],
  compute(v, out, api) {
    out.textContent = "";
    const min = Math.ceil(+v.min), max = Math.floor(+v.max), count = Math.max(1, Math.min(10000, parseInt(v.count, 10) || 1));
    if (v.min === "" || v.max === "" || !Number.isFinite(min) || !Number.isFinite(max)) { out.append(alert("info", "Enter a range (From – To).")); return; }
    if (min > max) { out.append(alert("err", "“From” must be less than or equal to “To”.")); return; }
    if (Math.abs(min) > Number.MAX_SAFE_INTEGER || Math.abs(max) > Number.MAX_SAFE_INTEGER || max - min >= 2 ** 53) { out.append(alert("err", "The range is too large (max about ±9 quadrillion).")); return; }
    const key = [min, max, count, v.unique, v.raffle, v.ex].join("|");
    if (key !== lastKey) { last = null; drawn = []; lastKey = key; }
    const ex = parseExclude(v.ex);
    let exIn = 0;
    for (const x of ex) if (x >= min && x <= max) exIn++;
    const unique = (v.unique && count > 1) || v.raffle;
    const left = max - min + 1 - exIn - (v.raffle ? drawn.filter((d) => !ex.has(d)).length : 0);

    function draw() {
      const skip = new Set(ex);
      if (v.raffle) for (const d of drawn) skip.add(d);
      if (unique) return uniqueInts(min, max, count, { exclude: skip });
      if (left <= 0) throw new RangeError("No numbers left in the range after the exclusions above.");
      return Array.from({ length: count }, () => { let x; do x = randBetween(min, max); while (skip.has(x)); return x; });
    }
    let err = "";
    if (!last && !v.raffle) { try { last = draw(); } catch (e) { err = e.message; } }
    if (err) { out.append(alert("err", err)); return; }
    let nums = last;
    if (nums && v.sort) nums = nums.slice().sort((a, b) => a - b);

    const big = h("div", { class: "rn-big" + (count > 1 ? " many" : "") }, (nums || Array(Math.min(count, 200)).fill("?")).slice(0, 200).map((n) => h("output", { text: n === "?" ? "?" : fmt(n) })));
    const go = h("button", { class: "btn big", type: "button", onclick: async () => {
      if (rolling) return;
      let next;
      try { next = draw(); } catch (e) { api.out.querySelector(".rn-msg").replaceChildren(alert("err", v.raffle && drawn.length ? `All numbers have been drawn (${fmt(drawn.length)} drawn). Click “Start over”.` : e.message)); return; }
      rolling = true; go.disabled = true;
      // hiệu ứng quay: hiện số tạm vài lần rồi mới ra kết quả thật (đã chọn sẵn ở trên)
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches && count <= 20) {
        const outs = big.querySelectorAll("output");
        for (let k = 0; k < 12; k++) { outs.forEach((o) => { o.textContent = fmt(randBetween(min, max)); }); await sleep(45 + k * 6); }
      }
      rolling = false;
      last = next;
      if (v.raffle) drawn.push(...next);
      api.update();
    } }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), v.raffle ? "Draw" : "Draw another");
    out.append(big, h("div", { class: "rn-msg" }), h("div", { class: "row", style: { justifyContent: "center" } }, go,
      nums ? h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(nums.join(nums.length > 20 ? "\n" : ", "), "Copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy") : ""));
    if (nums && nums.length > 200) out.append(h("p", { class: "hint", text: `Showing 200/${fmt(nums.length)} numbers — click Copy to get them all.` }));
    out.append(h("p", { class: "hint", style: { textAlign: "center" }, text: `Range ${fmt(min)} – ${fmt(max)}${exIn ? `, excluding ${fmt(exIn)}` : ""} · every number is equally likely${unique && count > 1 ? ", no duplicates" : ""}.` }));
    if (v.raffle) {
      out.append(h("div", { class: "rn-drawn" }, h("p", { class: "opt-title", text: drawn.length ? `Drawn ${fmt(drawn.length)} · ${fmt(Math.max(0, left))} left` : `Click “Draw” to start · ${fmt(Math.max(0, left))} numbers in play` }),
        drawn.length ? h("p", { class: "rn-list", text: drawn.map(fmt).join(", ") }) : "", drawn.length ? resetBtn(api) : ""));
    }
  }
});
function resetBtn(api) {
  return h("button", { class: "btn ghost sm", type: "button", onclick: () => { drawn = []; last = null; api.update(); } }, h("span", { html: icon("rotate-ccw"), style: { display: "contents" } }), "Start over");
}

const css = document.createElement("style");
css.textContent = `.rn-big{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:8px 0 16px}
.rn-big output{font:800 clamp(56px,18vw,104px)/1.05 var(--mono);font-variant-numeric:tabular-nums;color:var(--brand);overflow-wrap:anywhere;text-align:center}
.rn-big.many output{font-size:clamp(20px,5vw,28px);padding:6px 12px;border-radius:10px;background:var(--brand-soft);min-width:2.5em}
.rn-drawn{margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.rn-list{font-family:var(--mono);overflow-wrap:anywhere;margin:4px 0 10px}`;
document.head.append(css);
