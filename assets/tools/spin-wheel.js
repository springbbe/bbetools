/* Vòng quay may mắn: nhập danh sách (mỗi dòng một mục, "Tên * 3" = trọng số 3), quay bằng số ngẫu nhiên an toàn (crypto) —
   kết quả được chọn trước rồi vòng quay mới chạy tới đó, nên hiệu ứng không ảnh hưởng độ công bằng. */
import { h, icon, nextFrame, copyText } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseList, weightedIndex, randInt, shuffle } from "../lib/ngau-nhien.js";

const COLORS = ["#E5484D", "#F76B15", "#FFC53D", "#46A758", "#12A594", "#0090FF", "#3E63DD", "#8E4EC6", "#D6409F", "#AD7F58", "#30A46C", "#5B5BD6"];
const SAMPLES = {
  "Ăn gì hôm nay?": "Phở\nBún chả\nCơm tấm\nBánh mì\nBún bò Huế\nMì Quảng\nLẩu\nGà rán\nCơm văn phòng\nHủ tiếu",
  "Bốc thăm trúng thưởng": "Giải nhất * 1\nGiải nhì * 2\nGiải ba * 4\nChúc may mắn lần sau * 8",
  "Ai trả tiền?": "An\nBình\nChi\nDũng\nGiang\nHà"
};

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    const st = Object.assign({ text: SAMPLES["Ăn gì hôm nay?"], remove: false, sound: true, history: [] }, S.get("state", {}));
    let items = [], angle = 0, spinning = false;

    const canvas = h("canvas", { class: "wh-canvas", role: "button", tabindex: "0", "aria-label": "Vòng quay. Nhấn Enter hoặc phím cách để quay" });
    const wheelBox = h("div", { class: "wh-wheel" }, canvas, h("span", { class: "wh-pin", "aria-hidden": "true" }), h("button", { class: "wh-hub", type: "button", text: "QUAY", onclick: spin }));
    const result = h("div", { class: "wh-result", "aria-live": "assertive" });
    const ta = h("textarea", { id: "wh-list", class: "textarea", rows: 10, spellcheck: "false", value: st.text, oninput: () => { st.text = ta.value; save(); parse(); } });
    const count = h("span", { class: "hint" });
    const histEl = h("ol", { class: "wh-hist" });
    const histBox = h("details", { class: "wh-hbox" }, h("summary", null, "Lịch sử quay"), histEl,
      h("div", { class: "row" },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(st.history.map((x, i) => `${i + 1}. ${x}`).join("\n"), "Đã sao chép lịch sử") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => { st.history = []; save(); drawHist(); } }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Xoá lịch sử")));
    const side = h("div", { class: "wh-side" },
      h("div", { class: "field" }, h("label", { for: "wh-list" }, "Danh sách ", count), ta,
        h("small", { html: "Mỗi dòng một mục. Thêm <code>* 3</code> sau tên để tăng cơ hội trúng gấp 3." })),
      h("div", { class: "row", style: { gap: "6px" } },
        h("button", { class: "btn ghost sm", type: "button", onclick: () => setText(shuffle(ta.value.split("\n").filter((l) => l.trim())).join("\n")) }, h("span", { html: icon("shuffle"), style: { display: "contents" } }), "Xáo trộn"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => setText(ta.value.split("\n").filter((l) => l.trim()).sort((a, b) => a.localeCompare(b, "vi")).join("\n")) }, "A → Z"),
        h("select", { class: "select wh-sample", "aria-label": "Danh sách mẫu", onchange: (e) => { if (e.target.value) setText(SAMPLES[e.target.value]); e.target.value = ""; } },
          h("option", { value: "", text: "Danh sách mẫu…" }), Object.keys(SAMPLES).map((k) => h("option", { value: k, text: k })))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", checked: st.remove, onchange: (e) => { st.remove = e.target.checked; save(); } }), h("span", null, "Bỏ mục trúng khỏi vòng sau mỗi lượt", h("small", { text: "Hợp khi bốc thăm nhiều giải, mỗi người chỉ trúng một lần" }))),
      h("label", { class: "switch" }, h("input", { type: "checkbox", checked: st.sound, onchange: (e) => { st.sound = e.target.checked; save(); } }), h("span", { text: "Âm thanh" })),
      histBox);
    const main = h("div", { class: "wh-main" }, wheelBox, result,
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "btn big", type: "button", onclick: spin }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Quay"),
        h("button", { class: "ib", type: "button", title: "Toàn màn hình", "aria-label": "Toàn màn hình", html: icon("maximize"), onclick: () => ctx.fullscreen(main) })));
    el.append(h("div", { class: "wh" }, main, side));

    function save() { S.set("state", st); }
    function setText(t) { ta.value = t; st.text = t; save(); parse(); }
    function parse() {
      items = parseList(ta.value, { weights: true }).slice(0, 300);
      count.textContent = items.length ? `(${items.length} mục)` : "";
      draw();
    }
    function weightsSum() { return items.reduce((s, x) => s + Math.max(0, x.weight), 0); }
    // góc bắt đầu của từng mục (radian), tính theo trọng số
    function arcs() {
      const tot = weightsSum() || 1;
      let a = 0;
      return items.map((x) => { const w = (Math.max(0, x.weight) / tot) * Math.PI * 2; const r = [a, a + w]; a += w; return r; });
    }
    function draw() {
      const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1)) || 600;
      if (canvas.width !== size) canvas.width = canvas.height = size;
      const g = canvas.getContext("2d"), R = size / 2, cx = R, cy = R;
      g.clearRect(0, 0, size, size);
      if (!items.length) {
        g.fillStyle = getComputedStyle(canvas).getPropertyValue("--surface-2") || "#eee";
        g.beginPath(); g.arc(cx, cy, R - 2, 0, Math.PI * 2); g.fill();
        return;
      }
      const A = arcs(), n = items.length;
      for (let i = 0; i < n; i++) {
        const [a0, a1] = A[i];
        if (a1 - a0 <= 0) continue;
        let c = COLORS[i % COLORS.length];
        if (i === n - 1 && n > 1 && n % COLORS.length === 1) c = COLORS[5]; // tránh trùng màu với mục đầu
        g.fillStyle = c;
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 2, angle + a0 - Math.PI / 2, angle + a1 - Math.PI / 2); g.closePath(); g.fill();
        g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = Math.max(1, size / 300); g.stroke();
        // chữ
        const mid = angle + (a0 + a1) / 2 - Math.PI / 2, span = a1 - a0;
        const fs = Math.max(size / 60, Math.min(size / 18, span * R * 0.5));
        if (fs < size / 70 || n > 120) continue;
        // nửa trái vòng: xoay thêm 180° để chữ không bị lộn ngược
        const m = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), flip = m > Math.PI / 2 && m < Math.PI * 1.5;
        g.save(); g.translate(cx, cy); g.rotate(flip ? mid + Math.PI : mid);
        g.fillStyle = "#fff"; g.font = `700 ${fs}px "Be Vietnam Pro", system-ui, sans-serif`; g.textAlign = flip ? "left" : "right"; g.textBaseline = "middle";
        g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = fs / 6;
        let t = items[i].label;
        const maxW = R * 0.72;
        while (t.length > 1 && g.measureText(t).width > maxW) t = t.slice(0, -2) + "…";
        g.fillText(t, flip ? -(R - size / 28) : R - size / 28, 0);
        g.restore();
      }
    }
    let lastTick = -1;
    function tickSound() {
      if (!st.sound) return;
      // mục đang ở dưới kim (kim ở đỉnh)
      const A = arcs(), p = ((-angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const i = A.findIndex(([a0, a1]) => p >= a0 && p < a1);
      if (i !== lastTick) { lastTick = i; ctx.beep({ freq: 1400, ms: 25, times: 1, volume: 0.06 }); }
    }
    async function spin() {
      if (spinning) return;
      if (items.length < 2) { ctx.toast("Cần ít nhất 2 mục để quay."); ta.focus(); return; }
      if (!(weightsSum() > 0)) { ctx.toast("Tổng trọng số bằng 0."); return; }
      ctx.unlockAudio();
      spinning = true; result.textContent = ""; result.className = "wh-result";
      const win = weightedIndex(items.map((x) => x.weight));
      const [a0, a1] = arcs()[win];
      // điểm dừng ngẫu nhiên trong mục trúng (tránh sát mép), kim ở đỉnh: góc quay sao cho điểm đó nằm ở 0
      const target = a0 + (a1 - a0) * (0.15 + 0.7 * (randInt(1000) / 1000));
      const start = angle, turns = 5 + randInt(3);
      const end = start + ((((-target - start) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) + turns * Math.PI * 2; // quay theo chiều kim đồng hồ
      const dur = 4200 + randInt(1500), t0 = performance.now();
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      for (;;) {
        const t = Math.min(1, (performance.now() - t0) / (reduce ? 400 : dur));
        angle = start + (end - start) * (1 - Math.pow(1 - t, 4));
        draw(); tickSound();
        if (t >= 1) break;
        await nextFrame();
      }
      angle = end % (Math.PI * 2);
      draw();
      spinning = false;
      const w = items[win].label;
      if (st.sound) ctx.beep({ freq: 988, ms: 160, times: 2, gap: 80 });
      result.className = "wh-result on";
      result.textContent = "";
      result.append(h("span", { class: "hint", text: "Kết quả" }), h("b", { text: w }));
      st.history.unshift(w); st.history = st.history.slice(0, 100); save(); drawHist();
      if (st.remove) {
        const lines = ta.value.split("\n").filter((l) => l.trim());
        const next = lines.length === items.length ? lines.filter((_, i) => i !== win) : items.filter((_, i) => i !== win).map((x) => (x.weight !== 1 ? `${x.label} * ${x.weight}` : x.label));
        setTimeout(() => setText(next.join("\n")), 1200);
      }
    }
    function drawHist() {
      histEl.textContent = "";
      st.history.forEach((x) => histEl.append(h("li", { text: x })));
      histBox.hidden = !st.history.length;
    }
    canvas.addEventListener("click", spin);
    canvas.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin(); } });
    new ResizeObserver(() => draw()).observe(canvas);
    parse(); drawHist();
  }
});

const css = document.createElement("style");
css.textContent = `.wh{display:grid;gap:20px}@media(min-width:880px){.wh{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start}}
.wh-main{display:flex;flex-direction:column;align-items:center;gap:14px;background:var(--surface);border-radius:16px;padding:8px 0}
.wh-main:fullscreen{justify-content:center}.wh-main:fullscreen .wh-wheel{width:min(80vh,90vw)}
.wh-wheel{position:relative;width:min(100%,460px);aspect-ratio:1}
.wh-canvas{width:100%;height:100%;display:block;border-radius:50%;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.15)}
.wh-canvas:focus-visible{outline:3px solid var(--brand);outline-offset:4px}
.wh-pin{position:absolute;left:50%;top:-6px;width:0;height:0;margin-left:-16px;border-left:16px solid transparent;border-right:16px solid transparent;border-top:30px solid var(--ink);filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}
.wh-hub{position:absolute;left:50%;top:50%;width:18%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:4px solid #fff;background:var(--ink);color:var(--bg);font-weight:800;font-size:clamp(11px,3vw,15px);box-shadow:0 2px 8px rgba(0,0,0,.3)}
.wh-result{min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 12px}
.wh-result b{font-size:clamp(24px,6vw,34px);line-height:1.2;overflow-wrap:anywhere}.wh-result.on b{animation:wh-pop .4s ease-out}
@keyframes wh-pop{from{transform:scale(.6);opacity:0}}
.wh-side{display:grid;gap:14px}.wh-sample{width:auto;min-height:36px;padding-top:4px;padding-bottom:4px;font-size:14px}
.wh-hist{margin:8px 0;padding-left:28px;max-height:220px;overflow:auto;display:grid;gap:2px}`;
document.head.append(css);
