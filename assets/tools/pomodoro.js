/* Pomodoro: tập trung 25 phút, nghỉ 5 phút, sau 4 phiên nghỉ dài. Tính theo giờ thực nên đóng/mở tab vẫn đúng. */
import { h, icon } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";

const PH = { work: { label: "Tập trung", color: "#E5484D" }, short: { label: "Nghỉ ngắn", color: "#18794E" }, long: { label: "Nghỉ dài", color: "#3E63DD" } };
const todayKey = () => new Date().toISOString().slice(0, 10);
const baseTitle = document.title;

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    const cfg = Object.assign({ work: 25, short: 5, long: 15, every: 4, auto: false, sound: true }, S.get("cfg", {}));
    let st = Object.assign({ phase: "work", left: cfg.work * 60000, endAt: 0, running: false, done: 0 }, S.get("state", {}));
    let stats = S.get("stats", { day: todayKey(), sessions: 0, minutes: 0 });
    if (stats.day !== todayKey()) stats = { day: todayKey(), sessions: 0, minutes: 0 };
    const dur = (p) => (p === "work" ? cfg.work : p === "short" ? cfg.short : cfg.long) * 60000;

    const R = 120, C = 2 * Math.PI * R;
    const ring = h("div", { class: "pomo-ring", html: `<svg viewBox="0 0 280 280" aria-hidden="true"><circle cx="140" cy="140" r="${R}" class="track"/><circle cx="140" cy="140" r="${R}" class="bar" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 140 140)"/></svg>` });
    const time = h("div", { class: "pomo-time", role: "timer", "aria-live": "off" });
    const phaseLbl = h("div", { class: "pomo-phase" });
    ring.append(h("div", { class: "pomo-center" }, phaseLbl, time));
    const tabs = h("div", { class: "seg", role: "tablist", "aria-label": "Phiên" }, Object.entries(PH).map(([k, p]) => h("label", null, h("input", { type: "radio", name: "ph", value: k, onchange: () => setPhase(k, false) }), h("span", { text: p.label }))));
    const startBtn = h("button", { class: "btn big", type: "button", onclick: toggle });
    const task = h("input", { class: "input", type: "text", placeholder: "Bạn đang tập trung vào việc gì?", "aria-label": "Việc đang làm", value: S.get("task", ""), maxlength: 80, oninput: (e) => S.set("task", e.target.value) });
    const dots = h("div", { class: "pomo-dots", "aria-label": "Tiến độ chu kỳ" });
    const statEl = h("p", { class: "hint", style: { textAlign: "center" } });
    const num = (id, label, v, max) => h("label", { class: "field" }, h("span", { text: label }), h("input", { type: "number", min: 1, max, value: v, inputmode: "numeric", onchange: (e) => { cfg[id] = Math.max(1, Math.min(max, Math.round(+e.target.value || v))); e.target.value = cfg[id]; S.set("cfg", cfg); if (!st.running) { st.left = dur(st.phase); save(); } draw(); } }));
    const settings = h("details", null, h("summary", { text: "Cài đặt" }),
      h("div", { class: "pad", style: { display: "grid", gap: "14px" } },
        h("div", { class: "grid2" }, num("work", "Tập trung (phút)", cfg.work, 180), num("short", "Nghỉ ngắn (phút)", cfg.short, 60), num("long", "Nghỉ dài (phút)", cfg.long, 120), num("every", "Nghỉ dài sau mỗi … phiên", cfg.every, 12)),
        h("label", { class: "switch" }, h("input", { type: "checkbox", checked: cfg.auto, onchange: (e) => { cfg.auto = e.target.checked; S.set("cfg", cfg); } }), h("span", { text: "Tự bắt đầu phiên tiếp theo" })),
        h("label", { class: "switch" }, h("input", { type: "checkbox", checked: cfg.sound, onchange: (e) => { cfg.sound = e.target.checked; S.set("cfg", cfg); } }), h("span", { text: "Chuông báo khi hết giờ" })),
        h("button", { class: "btn ghost sm", type: "button", onclick: async () => ctx.toast(await ctx.askNotify() ? "Đã bật thông báo khi ở tab khác" : "Trình duyệt chưa cho phép thông báo") }, h("span", { html: icon("bell"), style: { display: "contents" } }), "Bật thông báo khi ở tab khác")));
    el.append(h("div", { class: "pomo" },
      tabs, ring, dots,
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "ib", type: "button", title: "Làm lại phiên này", "aria-label": "Làm lại phiên này", html: icon("rotate-ccw"), onclick: reset }),
        startBtn,
        h("button", { class: "ib", type: "button", title: "Bỏ qua sang phiên sau", "aria-label": "Bỏ qua sang phiên sau", html: icon("skip-forward"), onclick: () => complete(true) }),
        h("button", { class: "ib", type: "button", title: "Toàn màn hình", "aria-label": "Toàn màn hình", html: icon("maximize"), onclick: () => ctx.fullscreen(el.querySelector(".pomo")) })),
      task, statEl,
      h("p", { class: "hint", style: { textAlign: "center" }, html: "Phím tắt: <kbd>Space</kbd> bắt đầu/tạm dừng" })),
      settings);

    function save() { S.set("state", st); }
    function remaining() { return st.running ? Math.max(0, st.endAt - Date.now()) : st.left; }
    const fmt = (ms) => { const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
    function draw() {
      const left = remaining(), total = dur(st.phase);
      time.textContent = fmt(left);
      phaseLbl.textContent = PH[st.phase].label;
      el.querySelector(".pomo").style.setProperty("--pc", PH[st.phase].color);
      ring.querySelector(".bar").setAttribute("stroke-dashoffset", String(C * (1 - left / total)));
      startBtn.innerHTML = icon(st.running ? "pause" : "play") + (st.running ? "Tạm dừng" : left < total ? "Tiếp tục" : "Bắt đầu");
      tabs.querySelector(`input[value="${st.phase}"]`).checked = true;
      dots.textContent = "";
      for (let i = 0; i < cfg.every; i++) dots.append(h("span", { class: i < st.done % cfg.every || (st.done && st.done % cfg.every === 0 && st.phase === "long") ? "on" : "" }));
      statEl.textContent = `Hôm nay: ${stats.sessions} phiên tập trung · ${stats.minutes} phút`;
      document.title = st.running ? `${fmt(left)} · ${PH[st.phase].label}` : baseTitle;
    }
    function toggle() {
      ctx.unlockAudio();
      if (st.running) { st.left = remaining(); st.running = false; ctx.wakeLock(false); }
      else { if (st.left <= 0) st.left = dur(st.phase); st.endAt = Date.now() + st.left; st.running = true; ctx.wakeLock(true); }
      save(); draw();
    }
    function reset() { st.running = false; st.left = dur(st.phase); ctx.wakeLock(false); save(); draw(); }
    function setPhase(p, autoRun) {
      st.phase = p; st.left = dur(p); st.running = false;
      if (autoRun) { st.endAt = Date.now() + st.left; st.running = true; }
      save(); draw();
    }
    function complete(skipped) {
      const was = st.phase;
      if (was === "work" && !skipped) {
        st.done++;
        stats.sessions++; stats.minutes += cfg.work; S.set("stats", stats);
      }
      if (!skipped) {
        if (cfg.sound) ctx.beep({ times: was === "work" ? 3 : 2, freq: was === "work" ? 880 : 660 });
        ctx.notify(was === "work" ? "Hết giờ tập trung!" : "Hết giờ nghỉ!", was === "work" ? "Nghỉ một chút nhé." : "Quay lại làm việc thôi.");
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
      const next = was === "work" ? (st.done > 0 && st.done % cfg.every === 0 && !skipped ? "long" : "short") : "work";
      setPhase(next, cfg.auto && !skipped);
      if (!skipped) ctx.toast(was === "work" ? "Xong một phiên! Đến giờ " + PH[next].label.toLowerCase() + "." : "Hết giờ nghỉ, tiếp tục tập trung nhé.");
      if (!st.running) ctx.wakeLock(false);
    }
    setInterval(() => { if (st.running && remaining() <= 0) complete(false); else if (st.running) draw(); }, 250);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && st.running) { ctx.wakeLock(true); draw(); } });
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) && !document.querySelector("dialog[open]")) { e.preventDefault(); toggle(); }
    });
    // phiên đã hết giờ trong lúc đóng tab
    if (st.running && remaining() <= 0) complete(false);
    draw();
  }
});

const css = document.createElement("style");
css.textContent = `.pomo{--pc:#E5484D;display:flex;flex-direction:column;align-items:center;gap:18px;padding:8px 0 4px;background:var(--surface);border-radius:16px}
.pomo:fullscreen{justify-content:center}.pomo .seg{max-width:100%}
.pomo-ring{position:relative;width:min(280px,78vw);aspect-ratio:1}.pomo-ring svg{width:100%;height:100%}
.pomo-ring .track{fill:none;stroke:var(--surface-2);stroke-width:14}.pomo-ring .bar{fill:none;stroke:var(--pc);stroke-width:14;stroke-linecap:round;transition:stroke-dashoffset .25s linear,stroke .3s}
.pomo-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.pomo-time{font-size:clamp(48px,14vw,68px);font-weight:800;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;line-height:1}
.pomo-phase{font-weight:700;color:color-mix(in oklab,var(--pc) 72%,var(--ink));margin-bottom:4px}
.pomo-dots{display:flex;gap:8px}.pomo-dots span{width:12px;height:12px;border-radius:50%;background:var(--line-2)}.pomo-dots span.on{background:var(--pc)}
.pomo .input{max-width:420px;text-align:center}.pomo .btn.big{min-width:190px}.pomo .btn.big .i{width:22px;height:22px}`;
document.head.append(css);
