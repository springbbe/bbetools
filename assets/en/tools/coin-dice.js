/* Tự sinh bởi scripts/build.js từ assets/tools/coin-dice.js và i18n/en/js/ — đừng sửa tay. */
/* Tung xu & xúc xắc: đồng xu sấp/ngửa có hiệu ứng lật, gieo 1–10 xúc xắc 4–100 mặt, tổng điểm, thống kê.
   Kết quả lấy từ crypto.getRandomValues (không lệch), hiệu ứng chỉ để xem. */
import { h, icon, sleep } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { randInt, rollDice } from "../lib/ngau-nhien.js";

const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    const st = Object.assign({ tab: "coin", n: 2, sides: 6, heads: 0, tails: 0, coinHist: [], diceHist: [] }, S.get("state", {}));
    const save = () => S.set("state", st);
    let busy = false;

    /* ---- đồng xu ---- */
    const coin = h("div", { class: "cx-coin", "aria-hidden": "true" },
      h("div", { class: "cx-face front" }, h("b", { text: "HEADS" }), h("small", { text: "the side with the picture" })),
      h("div", { class: "cx-face back" }, h("b", { text: "TAILS" }), h("small", { text: "the side with the number" })));
    const coinRes = h("p", { class: "cx-res", "aria-live": "polite" });
    const coinStats = h("p", { class: "hint", style: { textAlign: "center" } });
    const coinHist = h("div", { class: "cx-hist", "aria-label": "Last 20 flips" });
    const coinPane = h("div", { class: "cx-pane" }, h("div", { class: "cx-stage" }, coin), coinRes,
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "btn big", type: "button", onclick: flip }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Flip"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => { st.heads = st.tails = 0; st.coinHist = []; save(); drawCoin(); } }, "Clear stats")),
      coinStats, coinHist);
    let rot = st.coinHist[0] === "S" ? 180 : 0;
    coin.style.transform = `rotateY(${rot}deg)`;
    async function flip() {
      if (busy) return;
      busy = true; ctx.unlockAudio();
      const heads = randInt(2) === 0;
      rot += 1440 + (heads ? (rot % 360 === 0 ? 0 : 180) : (rot % 360 === 0 ? 180 : 0));
      coin.style.transition = reduce() ? "none" : "";
      coin.style.transform = `rotateY(${rot}deg)`;
      coinRes.textContent = "…";
      await sleep(reduce() ? 50 : 1100);
      if (heads) st.heads++; else st.tails++;
      st.coinHist.unshift(heads ? "N" : "S"); st.coinHist = st.coinHist.slice(0, 20);
      save(); drawCoin(true);
      ctx.beep({ freq: 1200, ms: 60, times: 1, volume: 0.12 });
      busy = false;
    }
    function drawCoin(show) {
      const last = st.coinHist[0];
      coinRes.textContent = show && last ? (last === "N" ? "Heads!" : "Tails!") : last ? "Last time: " + (last === "N" ? "Heads" : "Tails") : "Click to flip";
      const t = st.heads + st.tails;
      coinStats.textContent = t ? `${t} ${(t) == 1 ? "flip" : "flips"} · Heads ${st.heads} (${Math.round((st.heads / t) * 100)}%) · Tails ${st.tails} (${Math.round((st.tails / t) * 100)}%)` : "";
      coinHist.textContent = "";
      st.coinHist.forEach((x) => coinHist.append(h("span", { class: x === "N" ? "n" : "s", title: x === "N" ? "Heads" : "Tails", text: x })));
    }

    /* ---- xúc xắc ---- */
    const diceBox = h("div", { class: "cx-dice", "aria-hidden": "true" });
    const diceRes = h("p", { class: "cx-res", "aria-live": "polite" });
    const nSel = h("select", { class: "select", "aria-label": "Number of dice", onchange: () => { st.n = +nSel.value; save(); drawDice(null); } }, Array.from({ length: 10 }, (_, i) => h("option", { value: i + 1, text: `${i + 1} ${(i + 1) == 1 ? "die" : "dice"}` })));
    const sSel = h("select", { class: "select", "aria-label": "Sides", onchange: () => { st.sides = +sSel.value; save(); drawDice(null); } }, [4, 6, 8, 10, 12, 20, 100].map((s) => h("option", { value: s, text: `${s} sides${s === 6 ? " (standard)" : ""}` })));
    nSel.value = st.n; sSel.value = st.sides;
    const diceHist = h("ol", { class: "cx-dhist" });
    const dicePane = h("div", { class: "cx-pane" },
      h("div", { class: "row", style: { justifyContent: "center" } }, nSel, sSel),
      h("div", { class: "cx-stage" }, diceBox), diceRes,
      h("div", { class: "row", style: { justifyContent: "center" } }, h("button", { class: "btn big", type: "button", onclick: roll }, h("span", { html: icon("dices"), style: { display: "contents" } }), "Roll")),
      diceHist);
    function die(v, sides) {
      if (sides === 6) return h("div", { class: "cx-die d6" }, Array.from({ length: 9 }, (_, i) => h("i", { class: PIPS[v].includes(i + 1) ? "on" : null })));
      return h("div", { class: "cx-die dn" }, h("b", { text: v }), h("small", { text: "d" + sides }));
    }
    async function roll() {
      if (busy) return;
      busy = true; ctx.unlockAudio();
      const res = rollDice(st.n, st.sides);
      if (!reduce()) for (let k = 0; k < 8; k++) { drawDice(rollDice(st.n, st.sides), true); await sleep(60); }
      drawDice(res);
      st.diceHist.unshift({ d: `${st.n}d${st.sides}`, r: res }); st.diceHist = st.diceHist.slice(0, 15); save();
      drawHist();
      ctx.beep({ freq: 700, ms: 50, times: 2, gap: 40, volume: 0.1 });
      busy = false;
    }
    function drawDice(res, temp) {
      diceBox.textContent = "";
      const vals = res || Array.from({ length: st.n }, () => (st.sides === 6 ? 6 : st.sides));
      vals.forEach((v) => diceBox.append(die(v, st.sides)));
      diceBox.classList.toggle("rolling", !!temp);
      diceBox.classList.toggle("idle", !res);
      if (temp) return;
      diceRes.textContent = res ? (res.length > 1 ? `Total: ${res.reduce((a, b) => a + b, 0)}  (${res.join(" + ")})` : `Rolled ${res[0]}`) : "Click Roll";
    }
    function drawHist() {
      diceHist.textContent = "";
      st.diceHist.forEach((x) => diceHist.append(h("li", null, h("small", { text: x.d + ": " }), x.r.join(", "), x.r.length > 1 ? h("b", { text: " = " + x.r.reduce((a, b) => a + b, 0) }) : "")));
    }

    /* ---- tab ---- */
    const tabs = h("div", { class: "seg", role: "radiogroup", "aria-label": "Choose" }, [["coin", "Flip a coin"], ["dice", "Roll dice"]].map(([k, l]) =>
      h("label", null, h("input", { type: "radio", name: "cx-tab", value: k, checked: st.tab === k, onchange: () => { st.tab = k; save(); show(); } }), h("span", { text: l }))));
    function show() { coinPane.hidden = st.tab !== "coin"; dicePane.hidden = st.tab !== "dice"; }
    el.append(h("div", { class: "cx" }, tabs, coinPane, dicePane, h("p", { class: "hint", style: { textAlign: "center" }, html: "Shortcut: <kbd>Space</kbd> flip / roll" })));
    document.addEventListener("keydown", (e) => {
      if (e.code !== "Space" || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) || document.querySelector("dialog[open]")) return;
      e.preventDefault(); st.tab === "coin" ? flip() : roll();
    });
    show(); drawCoin(); drawDice(st.diceHist[0] && st.diceHist[0].d === `${st.n}d${st.sides}` ? st.diceHist[0].r : null); drawHist();
  }
});

const css = document.createElement("style");
css.textContent = `.cx{display:flex;flex-direction:column;align-items:center;gap:16px}
.cx-pane{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}
.cx-stage{min-height:200px;display:grid;place-items:center;perspective:900px;width:100%}
.cx-coin{position:relative;width:170px;height:170px;transform-style:preserve-3d;transition:transform 1.1s cubic-bezier(.2,.7,.25,1)}
.cx-face{position:absolute;inset:0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;backface-visibility:hidden;-webkit-backface-visibility:hidden;
  background:radial-gradient(circle at 35% 30%,#ffe7a3,#e0a82e 60%,#b07a12);color:#5a3a00;box-shadow:inset 0 0 0 8px rgba(255,255,255,.35),inset 0 0 0 11px rgba(120,80,0,.35),0 8px 20px rgba(0,0,0,.25)}
.cx-face b{font-size:28px;letter-spacing:.06em}.cx-face small{font-size:12px;opacity:.8}
.cx-face.back{transform:rotateY(180deg);background:radial-gradient(circle at 35% 30%,#f1f3f5,#b7bcc2 60%,#868e96);color:#343a40}
.cx-res{font-size:clamp(22px,6vw,30px);font-weight:800;margin:0;min-height:1.3em;text-align:center}
.cx-hist{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;max-width:420px}
.cx-hist span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800}
.cx-hist .n{background:#e0a82e;color:#4a3000}.cx-hist .s{background:#adb5bd;color:#212529}
.cx-dice{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;max-width:600px}
.cx-dice.idle{opacity:.35}
.cx-die{width:72px;height:72px;border-radius:14px;background:var(--surface);border:2px solid var(--line-2);box-shadow:0 4px 10px rgba(0,0,0,.12);transition:transform .06s}
.cx-die.d6{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:9px;gap:2px}
.cx-die.d6 i{border-radius:50%;margin:3px}.cx-die.d6 i.on{background:var(--ink)}
.cx-die.dn{display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--brand-soft);border-color:color-mix(in srgb,var(--brand) 40%,transparent)}
.cx-die.dn b{font-size:28px;line-height:1;color:var(--brand)}.cx-die.dn small{font-size:11px;color:var(--muted)}
.cx-dice.rolling .cx-die:nth-child(odd){transform:rotate(-14deg)}.cx-dice.rolling .cx-die:nth-child(even){transform:rotate(12deg)}
.cx-dhist{margin:0;padding-left:28px;max-width:420px;width:100%;font-size:14.5px;display:grid;gap:2px}.cx-dhist small{color:var(--muted)}
.cx select.select{width:auto}`;
document.head.append(css);
