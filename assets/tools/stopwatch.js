/* Bấm giờ: chính xác 1/100 giây (tính theo đồng hồ hệ thống, không phụ thuộc tốc độ vẽ), ghi vòng, đánh dấu vòng nhanh/chậm nhất,
   giữ trạng thái khi tải lại trang, tải bảng vòng ra CSV. */
import { h, icon } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { fmtClock, lapRows } from "../lib/bam-gio.js";
import { csvButton } from "../calc.js";

const baseTitle = document.title;
interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    // st: start = mốc Date.now() khi chạy (đã trừ phần đã chạy trước), acc = ms đã chạy khi đang dừng
    const st = Object.assign({ running: false, start: 0, acc: 0, laps: [] }, S.get("state", {}));
    const elapsed = () => (st.running ? Date.now() - st.start : st.acc);

    const time = h("div", { class: "sw-time", role: "timer", "aria-live": "off" });
    const lapNow = h("div", { class: "sw-lap-now" });
    const startBtn = h("button", { class: "btn big", type: "button", onclick: toggle });
    const lapBtn = h("button", { class: "btn ghost big", type: "button", onclick: () => (st.running ? lap() : reset()) });
    const tbody = h("tbody");
    const table = h("div", { class: "tbl-wrap sw-laps" }, h("table", { class: "tbl" },
      h("thead", null, h("tr", null, h("th", { scope: "col", text: "Vòng" }), h("th", { scope: "col", class: "r", text: "Thời gian vòng" }), h("th", { scope: "col", class: "r", text: "Tổng" }))), tbody));
    const tools = h("div", { class: "row sw-tools" });
    const face = h("div", { class: "sw-face" }, time, lapNow);
    el.append(h("div", { class: "sw" }, face,
      h("div", { class: "row sw-btns" }, lapBtn, startBtn,
        h("button", { class: "ib", type: "button", title: "Toàn màn hình", "aria-label": "Toàn màn hình", html: icon("maximize"), onclick: () => ctx.fullscreen(el.querySelector(".sw")) })),
      h("p", { class: "hint", style: { textAlign: "center" }, html: "Phím tắt: <kbd>Space</kbd> chạy/dừng · <kbd>L</kbd> ghi vòng · <kbd>R</kbd> đặt lại" }),
      table, tools));

    function save() { S.set("state", st); }
    function toggle() {
      if (st.running) { st.acc = Date.now() - st.start; st.running = false; ctx.wakeLock(false); }
      else { st.start = Date.now() - st.acc; st.running = true; ctx.wakeLock(true); }
      save(); draw(true);
    }
    function lap() { if (!st.running) return; st.laps.push(elapsed()); save(); draw(true); }
    function reset() { if (st.running) return; st.acc = 0; st.laps = []; save(); draw(true); }
    function draw(full) {
      const t = elapsed();
      time.textContent = fmtClock(t);
      const lastLap = st.laps.length ? st.laps[st.laps.length - 1] : 0;
      lapNow.textContent = st.laps.length ? `Vòng ${st.laps.length + 1}: ${fmtClock(t - lastLap)}` : "";
      document.title = st.running ? fmtClock(t, { cs: false }) + " · Bấm giờ" : baseTitle;
      if (!full) return;
      startBtn.innerHTML = icon(st.running ? "pause" : "play") + (st.running ? "Dừng" : t ? "Chạy tiếp" : "Bắt đầu");
      lapBtn.innerHTML = st.running ? icon("flag") + "Vòng" : icon("rotate-ccw") + "Đặt lại";
      lapBtn.disabled = !st.running && !t;
      startBtn.classList.toggle("danger", st.running);
      const rows = lapRows(st.laps);
      tbody.textContent = "";
      for (const r of rows) tbody.append(h("tr", { class: r.best ? "sw-best" : r.worst ? "sw-worst" : null },
        h("td", null, "Vòng " + r.n, r.best ? h("small", { text: " · nhanh nhất" }) : r.worst ? h("small", { text: " · chậm nhất" }) : ""),
        h("td", { class: "r mono", text: fmtClock(r.lap) }), h("td", { class: "r mono", text: fmtClock(r.split) })));
      table.hidden = !rows.length;
      tools.textContent = "";
      if (rows.length) tools.append(csvButton("bam-gio.csv", ["Vòng", "Thời gian vòng (giây)", "Tổng (giây)"], rows.slice().reverse().map((r) => [r.n, (r.lap / 1000).toFixed(2), (r.split / 1000).toFixed(2)]).map((r) => r.map((x) => String(x).replace(".", ",")))));
    }
    setInterval(() => { if (st.running) draw(false); }, 31);
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector("dialog[open]")) return;
      if (e.code === "Space" && e.target.tagName !== "BUTTON") { e.preventDefault(); toggle(); }
      else if (e.key === "l" || e.key === "L") lap();
      else if (e.key === "r" || e.key === "R") reset();
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden && st.running) ctx.wakeLock(true); });
    draw(true);
  }
});

const css = document.createElement("style");
css.textContent = `.sw{display:flex;flex-direction:column;align-items:center;gap:16px;background:var(--surface);border-radius:16px;padding:8px 0}
.sw:fullscreen{justify-content:center}.sw:fullscreen .sw-time{font-size:clamp(64px,16vw,200px)}
.sw-face{text-align:center;padding:18px 0 4px}
.sw-time{font:800 clamp(52px,16vw,96px)/1 var(--mono);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.sw-lap-now{min-height:1.5em;margin-top:8px;color:var(--muted);font:600 17px var(--mono)}
.sw-btns{justify-content:center}.sw-btns .btn.big{min-width:150px}.sw-btns .btn.big .i{width:22px;height:22px}
.sw-laps{width:100%;max-width:560px;max-height:360px;overflow:auto}.sw-laps td.r,.sw-laps th.r{text-align:right}
.sw-best td{color:var(--ok);font-weight:700}.sw-worst td{color:var(--err);font-weight:700}.sw-laps small{font-weight:400}
.sw-tools{justify-content:center}`;
document.head.append(css);
