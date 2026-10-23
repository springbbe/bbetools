/* Tự sinh bởi scripts/build.js từ assets/tools/countdown-timer.js và i18n/en/js/ — đừng sửa tay. */
/* Hẹn giờ đếm ngược: chọn nhanh hoặc nhập giờ/phút/giây, chuông kêu đến khi tắt, thông báo khi ở tab khác, toàn màn hình.
   Tính theo giờ thực (mốc kết thúc) nên đóng/mở tab vẫn đúng. */
import { h, icon } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { fmtClock, durationText } from "../lib/bam-gio.js";

const PRESETS = [[60e3, "1 min"], [3 * 60e3, "3 min"], [5 * 60e3, "5 min"], [10 * 60e3, "10 min"], [15 * 60e3, "15 min"], [30 * 60e3, "30 min"], [60 * 60e3, "1 hour"]];
const baseTitle = document.title;

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    const st = Object.assign({ total: 5 * 60e3, left: 5 * 60e3, endAt: 0, running: false, label: "", sound: true }, S.get("state", {}));
    let ringing = null;
    const remaining = () => (st.running ? Math.max(0, st.endAt - Date.now()) : st.left);

    const R = 120, C = 2 * Math.PI * R;
    const ring = h("div", { class: "cd-ring", html: `<svg viewBox="0 0 280 280" aria-hidden="true"><circle cx="140" cy="140" r="${R}" class="track"/><circle cx="140" cy="140" r="${R}" class="bar" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 140 140)"/></svg>` });
    const time = h("div", { class: "cd-time", role: "timer", "aria-live": "off" });
    const sub = h("div", { class: "cd-sub" });
    ring.append(h("div", { class: "cd-center" }, time, sub));
    const num = (label, max) => h("input", { type: "number", min: 0, max, inputmode: "numeric", "aria-label": label, placeholder: "0", onchange: setFromInputs, onkeydown: (e) => { if (e.key === "Enter") { setFromInputs(); toggle(); } } });
    const inH = num("Hours", 99), inM = num("Minutes", 59), inS = num("Seconds", 59);
    const setter = h("div", { class: "cd-set" },
      h("div", { class: "cd-hms" }, h("label", null, inH, h("span", { text: "h" })), h("label", null, inM, h("span", { text: "min" })), h("label", null, inS, h("span", { text: "sec" }))),
      h("div", { class: "cd-presets", role: "group", "aria-label": "Quick pick" }, PRESETS.map(([ms, l]) => h("button", { class: "chip", type: "button", text: l, onclick: () => setTotal(ms) }))));
    const startBtn = h("button", { class: "btn big", type: "button", onclick: toggle });
    const stopRing = h("button", { class: "btn big danger cd-stop", type: "button", hidden: true, onclick: silence }, h("span", { html: icon("bell"), style: { display: "contents" } }), "Mute alarm");
    const label = h("input", { class: "input", type: "text", maxlength: 60, placeholder: "What's the timer for? (e.g. Boil eggs)", "aria-label": "Timer name", value: st.label, oninput: (e) => { st.label = e.target.value; save(); draw(); } });
    const box = h("div", { class: "cd" }, ring,
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "ib", type: "button", title: "Reset", "aria-label": "Reset", html: icon("rotate-ccw"), onclick: reset }),
        startBtn, stopRing,
        h("button", { class: "btn ghost sm", type: "button", title: "Add 1 minute", onclick: () => add(60e3) }, "+1 min"),
        h("button", { class: "ib", type: "button", title: "Full screen", "aria-label": "Full screen", html: icon("maximize"), onclick: () => ctx.fullscreen(box) })),
      setter, label,
      h("label", { class: "switch" }, h("input", { type: "checkbox", checked: st.sound, onchange: (e) => { st.sound = e.target.checked; save(); } }), h("span", { text: "Ring when time's up" })),
      h("button", { class: "btn ghost sm", type: "button", onclick: async () => ctx.toast(await ctx.askNotify() ? "Notifications enabled for other tabs" : "The browser hasn't allowed notifications") }, h("span", { html: icon("bell"), style: { display: "contents" } }), "Enable notifications when on another tab"),
      h("p", { class: "hint", style: { textAlign: "center" }, html: "Shortcuts: <kbd>Space</kbd> start/pause · <kbd>R</kbd> reset" }));
    el.append(box);

    function save() { S.set("state", st); }
    function fillInputs(ms) { const s = Math.round(ms / 1000); inH.value = Math.floor(s / 3600) || ""; inM.value = Math.floor((s % 3600) / 60) || ""; inS.value = s % 60 || ""; }
    function setFromInputs() {
      const ms = ((+inH.value || 0) * 3600 + (+inM.value || 0) * 60 + (+inS.value || 0)) * 1000;
      if (ms > 0) setTotal(ms, false);
    }
    function setTotal(ms, fill = true) {
      silence();
      st.total = st.left = Math.min(ms, 100 * 3600e3); st.running = false; ctx.wakeLock(false);
      if (fill) fillInputs(ms);
      save(); draw();
    }
    function add(ms) {
      silence();
      if (st.running) { st.endAt += ms; st.total += ms; }
      else { st.left += ms; st.total = Math.max(st.total, st.left); }
      save(); draw();
    }
    function toggle() {
      ctx.unlockAudio();
      if (ringing) { silence(); return; }
      if (st.running) { st.left = remaining(); st.running = false; ctx.wakeLock(false); }
      else { if (st.left <= 0) st.left = st.total; st.endAt = Date.now() + st.left; st.running = true; ctx.wakeLock(true); }
      save(); draw();
    }
    function reset() { silence(); st.running = false; st.left = st.total; ctx.wakeLock(false); save(); draw(); }
    function finish() {
      st.running = false; st.left = 0; save(); ctx.wakeLock(false);
      const name = st.label.trim() || "Timer";
      ctx.notify("Time's up!", name + " · " + durationText(st.total));
      if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
      box.classList.add("ringing");
      stopRing.hidden = false; startBtn.hidden = true;
      if (st.sound) {
        let n = 0;
        ctx.beep({ times: 4, freq: 880 });
        ringing = setInterval(() => { if (++n > 40) silence(); else ctx.beep({ times: 4, freq: 880 }); }, 1600);
      } else ringing = setTimeout(silence, 15000);
      stopRing.focus();
      draw();
    }
    function silence() {
      if (!ringing && !box.classList.contains("ringing")) return;
      clearInterval(ringing); clearTimeout(ringing); ringing = null;
      box.classList.remove("ringing");
      stopRing.hidden = true; startBtn.hidden = false;
      draw();
    }
    function draw() {
      const left = remaining();
      time.textContent = fmtClock(left, { cs: false, up: true });
      sub.textContent = st.label.trim() || (left <= 0 && !st.running ? "Time's up!" : durationText(st.total));
      ring.querySelector(".bar").setAttribute("stroke-dashoffset", String(C * (1 - (st.total ? left / st.total : 0))));
      startBtn.innerHTML = icon(st.running ? "pause" : "play") + (st.running ? "Pause" : left > 0 && left < st.total ? "Resume" : "Start");
      setter.classList.toggle("dim", st.running);
      document.title = st.running ? fmtClock(left, { cs: false, up: true }) + " · " + (st.label.trim() || "Timer") : ringing ? "⏰ Time's up!" : baseTitle;
    }
    setInterval(() => { if (st.running) { if (remaining() <= 0) finish(); else draw(); } }, 200);
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector("dialog[open]")) return;
      if (e.code === "Space" && e.target.tagName !== "BUTTON") { e.preventDefault(); toggle(); }
      else if (e.key === "r" || e.key === "R") reset();
      else if (e.key === "Escape") silence();
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && st.running) { ctx.wakeLock(true); draw(); } });
    fillInputs(st.total);
    if (st.running && remaining() <= 0) { st.running = false; st.left = 0; save(); ctx.toast("The timer ran out while the page was closed."); }
    draw();
  }
});

const css = document.createElement("style");
css.textContent = `.cd{display:flex;flex-direction:column;align-items:center;gap:16px;padding:8px 0 4px;background:var(--surface);border-radius:16px}
.cd:fullscreen{justify-content:center}.cd:fullscreen .cd-ring{width:min(70vh,80vw)}
.cd-ring{position:relative;width:min(280px,78vw);aspect-ratio:1}.cd-ring svg{width:100%;height:100%}
.cd-ring .track{fill:none;stroke:var(--surface-2);stroke-width:14}.cd-ring .bar{fill:none;stroke:var(--brand);stroke-width:14;stroke-linecap:round;transition:stroke-dashoffset .2s linear}
.cd-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 30px;text-align:center}
.cd-time{font-size:clamp(44px,13vw,64px);font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1}
.cd:fullscreen .cd-time{font-size:min(14vh,15vw)}
.cd-sub{color:var(--muted);font-weight:600;margin-top:6px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cd.ringing .cd-ring{animation:cd-pulse 1s ease-in-out infinite}.cd.ringing .bar{stroke:var(--err)}.cd.ringing .cd-time{color:var(--err)}
@keyframes cd-pulse{50%{transform:scale(1.04)}}@media (prefers-reduced-motion:reduce){.cd.ringing .cd-ring{animation:none}}
.cd .btn.big{min-width:180px}.cd .btn.big .i{width:22px;height:22px}
.cd-set{display:flex;flex-direction:column;align-items:center;gap:12px;transition:opacity .2s}.cd-set.dim{opacity:.55}
.cd-hms{display:flex;gap:8px}.cd-hms label{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:13px;color:var(--muted)}
.cd-hms input{width:78px;text-align:center;font:700 22px var(--mono);padding:8px;border:1px solid var(--line-2);border-radius:12px;background:var(--surface);color:var(--ink)}
.cd-hms input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 25%,transparent)}
.cd-presets{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.cd .input{max-width:420px;text-align:center}`;
document.head.append(css);
