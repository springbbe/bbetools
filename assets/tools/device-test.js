/* Kiểm tra thiết bị trước khi họp online: camera (độ phân giải, chụp thử), micro (mức âm, ghi thử 5 giây rồi nghe lại),
   loa (trái/phải, tần số), bàn phím + chuột (phím nào đã nhận), màn hình (thông số, điểm chết, dải màu).
   Hình ảnh, âm thanh chỉ hiện trên máy, không ghi lại hay gửi đi. */
import { h, icon, save, MOD } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";

const TABS = [["cam", "Camera", "camera"], ["mic", "Micro", "mic"], ["spk", "Loa", "volume-2"], ["kbd", "Bàn phím, chuột", "keyboard"], ["scr", "Màn hình", "monitor"]];
const IS_MAC = MOD === "⌘";

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let tab = S.get("tab", "cam"), cleanup = null;
    const panes = {};
    const tabs = h("div", { class: "seg dt-tabs", role: "tablist", "aria-label": "Thiết bị cần kiểm tra" }, TABS.map(([k, l, ic]) =>
      h("label", null, h("input", { type: "radio", name: "dt-tab", value: k, checked: k === tab, onchange: () => show(k) }), h("span", { html: icon(ic) + l }))));
    const body = h("div", { class: "dt-body" });
    el.append(h("div", { class: "dt" }, tabs, body));
    function show(k) {
      if (cleanup) { cleanup(); cleanup = null; }
      tab = k; S.set("tab", k);
      body.textContent = "";
      panes[k] = panes[k] || h("div", { class: "dt-pane" });
      body.append(panes[k]);
      cleanup = ({ cam: camPane, mic: micPane, spk: spkPane, kbd: kbdPane, scr: scrPane })[k](panes[k], ctx) || null;
    }
    window.addEventListener("pagehide", () => { if (cleanup) cleanup(); });
    show(tab);
  }
});

function alertEl(kind, text) { const p = h("p", { class: "alert " + kind, html: icon(kind === "ok" ? "circle-check" : kind === "info" ? "info" : "triangle-alert") + "<span></span>" }); p.lastChild.textContent = text; return p; }
async function devices(kind) { try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === kind); } catch (_) { return []; } }
const MIC_ERR = { NotAllowedError: "Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khoá cạnh thanh địa chỉ để cho phép, rồi thử lại.", NotFoundError: "Không tìm thấy micro nào.", NotReadableError: "Micro đang bị ứng dụng khác dùng (Zoom, Teams…). Đóng ứng dụng đó rồi thử lại." };

/* ---------- Camera ---------- */
function camPane(p, ctx) {
  p.textContent = "";
  let stream = null, timer = null;
  const video = h("video", { class: "dt-video mirror", playsinline: true, muted: true, "aria-label": "Hình từ camera" });
  const info = h("div", { class: "dt-info" });
  const msg = h("div");
  const sel = h("select", { class: "select", "aria-label": "Chọn camera", hidden: true, onchange: () => start(sel.value) });
  const mirror = h("input", { type: "checkbox", checked: true, onchange: () => video.classList.toggle("mirror", mirror.checked) });
  const startBtn = h("button", { class: "btn big", type: "button", onclick: () => (stream ? stop() : start()) });
  const snap = h("button", { class: "btn ghost", type: "button", disabled: true, onclick: shot }, h("span", { html: icon("camera"), style: { display: "contents" } }), "Chụp thử");
  p.append(h("div", { class: "dt-stage" }, video, h("p", { class: "dt-ph hint", text: "Camera đang tắt" })), msg,
    h("div", { class: "row" }, startBtn, snap, sel),
    h("label", { class: "switch" }, mirror, h("span", { text: "Lật gương (như khi soi gương — người khác trong cuộc họp vẫn thấy hình không lật)" })), info);
  function draw() {
    startBtn.innerHTML = icon(stream ? "camera-off" : "camera") + (stream ? "Tắt camera" : "Bật camera");
    snap.disabled = !stream;
    p.querySelector(".dt-ph").hidden = !!stream;
  }
  async function start(deviceId) {
    stop(true);
    msg.textContent = "";
    try {
      stream = await ctx.camera(video, { deviceId, facing: "user", width: 1920, height: 1080 });
      const list = await devices("videoinput");
      sel.textContent = "";
      list.forEach((d, i) => sel.append(h("option", { value: d.deviceId, text: d.label || "Camera " + (i + 1) })));
      const cur = stream.getVideoTracks()[0];
      sel.value = cur.getSettings().deviceId || sel.value;
      sel.hidden = list.length < 2;
      timer = setInterval(stats, 1000);
      setTimeout(stats, 400);
      msg.append(alertEl("ok", "Camera hoạt động. Hãy xem hình có rõ, đủ sáng không."));
    } catch (e) { stream = null; msg.append(alertEl("err", e.userMsg || e.message)); }
    draw();
  }
  function stats() {
    if (!stream) return;
    const t = stream.getVideoTracks()[0], s = t.getSettings();
    const w = video.videoWidth, hh = video.videoHeight;
    const q = hh >= 2160 ? "4K" : hh >= 1080 ? "Full HD 1080p" : hh >= 720 ? "HD 720p" : hh >= 480 ? "SD 480p" : "thấp";
    info.textContent = "";
    info.append(h("dl", { class: "kv" },
      h("dt", { text: "Thiết bị" }), h("dd", { text: t.label || "Camera" }),
      h("dt", { text: "Độ phân giải" }), h("dd", { text: w ? `${w} × ${hh} (${q})` : "…" }),
      h("dt", { text: "Khung hình/giây" }), h("dd", { text: s.frameRate ? Math.round(s.frameRate) + " fps" : "–" })));
  }
  function shot() {
    const c = h("canvas", { width: video.videoWidth, height: video.videoHeight });
    const g = c.getContext("2d");
    if (mirror.checked) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(video, 0, 0);
    c.toBlob((b) => b && save(b, "anh-chup-camera.png"), "image/png");
  }
  function stop(keep) {
    clearInterval(timer);
    if (stream) { ctx.stopStream(stream); stream = null; video.srcObject = null; }
    if (!keep) { info.textContent = ""; draw(); }
  }
  draw();
  return () => stop();
}

/* ---------- Micro ---------- */
function micPane(p, ctx) {
  p.textContent = "";
  let stream = null, ac = null, an = null, timer = null, rec = null, peak = 0, peakAt = 0, url = null;
  const canvas = h("canvas", { class: "dt-wave", height: 120, "aria-hidden": "true" });
  const meter = h("div", { class: "dt-level", role: "meter", "aria-label": "Mức âm thanh", "aria-valuemin": "0", "aria-valuemax": "100" }, h("span"), h("i"));
  const lvlTxt = h("p", { class: "hint", "aria-live": "polite" });
  const msg = h("div");
  const sel = h("select", { class: "select", "aria-label": "Chọn micro", hidden: true, onchange: () => start(sel.value) });
  const startBtn = h("button", { class: "btn big", type: "button", onclick: () => (stream ? stop() : start()) });
  const recBtn = h("button", { class: "btn ghost", type: "button", disabled: true, onclick: record }, h("span", { html: icon("circle"), style: { display: "contents" } }), "Ghi thử 5 giây");
  const player = h("div", { class: "dt-player" });
  const info = h("div", { class: "dt-info" });
  p.append(h("div", { class: "dt-micbox" }, canvas, meter), lvlTxt, msg, h("div", { class: "row" }, startBtn, recBtn, sel), player, info,
    h("p", { class: "hint", text: "Nói thử “một, hai, ba”: thanh mức âm nên lên tới vùng xanh. Nếu đeo tai nghe, nghe lại bản ghi để biết người khác nghe giọng bạn thế nào." }));
  function draw() {
    startBtn.innerHTML = icon(stream ? "mic-off" : "mic") + (stream ? "Tắt micro" : "Bật micro");
    recBtn.disabled = !stream || !!rec || typeof MediaRecorder === "undefined";
  }
  async function start(deviceId) {
    stop(true);
    msg.textContent = "";
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("Trình duyệt này không hỗ trợ micro."), { name: "x" });
      stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true, video: false });
      ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume().catch(() => {}); // không chờ: thiếu thao tác người dùng thì promise này treo
      an = ac.createAnalyser(); an.fftSize = 2048;
      ac.createMediaStreamSource(stream).connect(an);
      const list = await devices("audioinput");
      sel.textContent = "";
      list.forEach((d, i) => sel.append(h("option", { value: d.deviceId, text: d.label || "Micro " + (i + 1) })));
      const t = stream.getAudioTracks()[0], s = t.getSettings();
      if (s.deviceId) sel.value = s.deviceId;
      sel.hidden = list.length < 2;
      info.textContent = "";
      info.append(h("dl", { class: "kv" }, h("dt", { text: "Thiết bị" }), h("dd", { text: t.label || "Micro" }),
        h("dt", { text: "Tần số lấy mẫu" }), h("dd", { text: (s.sampleRate || ac.sampleRate) + " Hz" }),
        h("dt", { text: "Khử tiếng vọng / ồn" }), h("dd", { text: [s.echoCancellation ? "khử vọng" : null, s.noiseSuppression ? "lọc ồn" : null].filter(Boolean).join(", ") || "tắt" })));
      timer = setInterval(loop, 40);
    } catch (e) { stop(true); msg.append(alertEl("err", MIC_ERR[e.name] || e.message || "Không bật được micro.")); }
    draw();
  }
  function loop() {
    if (!an) return;
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let sum = 0; for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length), db = 20 * Math.log10(rms || 1e-8);
    const lvl = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
    if (lvl > peak || Date.now() - peakAt > 1500) { peak = lvl; peakAt = Date.now(); }
    meter.firstChild.style.width = lvl + "%"; meter.lastChild.style.left = peak + "%";
    meter.setAttribute("aria-valuenow", String(Math.round(lvl)));
    lvlTxt.textContent = lvl < 8 ? "Im lặng… hãy nói thử." : lvl < 35 ? "Nhỏ — nói to hơn hoặc để micro gần hơn." : lvl < 92 ? "Tốt!" : "Quá to, có thể bị rè.";
    // dạng sóng
    const w = canvas.clientWidth * (window.devicePixelRatio || 1); if (canvas.width !== w) canvas.width = w;
    const g = canvas.getContext("2d"), H = canvas.height;
    g.clearRect(0, 0, w, H);
    g.strokeStyle = getComputedStyle(canvas).color; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i < buf.length; i += 4) { const x = (i / buf.length) * w, y = H / 2 + buf[i] * H * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  function record() {
    if (!stream || rec) return;
    const chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      if (url) URL.revokeObjectURL(url);
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      url = URL.createObjectURL(blob);
      player.textContent = "";
      player.append(h("p", { class: "opt-title", text: "Nghe lại bản ghi thử (chỉ có trên máy này)" }), h("audio", { controls: true, src: url }));
      player.querySelector("audio").play().catch(() => {});
      rec = null; draw();
      recBtn.innerHTML = icon("circle") + "Ghi thử 5 giây";
    };
    rec.start();
    let n = 5;
    recBtn.innerHTML = icon("circle") + `Đang ghi… ${n}`;
    const iv = setInterval(() => { n--; if (n > 0) recBtn.innerHTML = icon("circle") + `Đang ghi… ${n}`; else { clearInterval(iv); if (rec && rec.state === "recording") rec.stop(); } }, 1000);
    draw();
  }
  function stop(keep) {
    clearInterval(timer); timer = null;
    if (rec && rec.state === "recording") rec.stop();
    if (stream) ctx.stopStream(stream);
    stream = null; an = null;
    if (ac) { ac.close().catch(() => {}); ac = null; }
    meter.firstChild.style.width = "0"; meter.lastChild.style.left = "0";
    if (!keep) { lvlTxt.textContent = ""; draw(); }
  }
  draw();
  return () => { stop(); if (url) URL.revokeObjectURL(url); };
}

/* ---------- Loa ---------- */
function spkPane(p) {
  p.textContent = "";
  let ac = null, osc = null, stopT = null;
  const freq = h("select", { class: "select", "aria-label": "Tần số âm thử" }, [[100, "100 Hz (trầm)"], [440, "440 Hz (nốt La)"], [1000, "1.000 Hz"], [5000, "5.000 Hz"], [12000, "12.000 Hz (cao)"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === 440 })));
  const vol = h("input", { type: "range", min: 1, max: 100, value: 30, "aria-label": "Âm lượng" });
  const now = h("p", { class: "hint", "aria-live": "polite" });
  const b = (pan, label, ic) => h("button", { class: "btn ghost big dt-spk", type: "button", onclick: () => play(pan, label) }, h("span", { html: icon(ic), style: { display: "contents" } }), label);
  p.append(h("div", { class: "dt-spk-row" }, b(-1, "Loa trái", "arrow-left"), b(0, "Cả hai", "volume-2"), b(1, "Loa phải", "arrow-right")),
    h("button", { class: "btn ghost", type: "button", onclick: sweep }, h("span", { html: icon("activity"), style: { display: "contents" } }), "Quét từ trầm đến cao (5 giây)"),
    h("div", { class: "grid2" }, h("label", { class: "field" }, h("span", { text: "Tần số" }), freq), h("label", { class: "field" }, h("span", { text: "Âm lượng" }), vol)),
    now, h("button", { class: "btn ghost sm", type: "button", onclick: stop }, "Dừng"),
    h("p", { class: "hint", text: "Bắt đầu với âm lượng nhỏ. Nếu bấm “Loa trái” mà nghe ở bên phải, dây tai nghe hoặc cài đặt âm thanh đang bị đảo." }));
  function ctxA() { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; }
  function play(pan, label, f = +freq.value, dur = 1.6, sweepTo) {
    stop();
    const a = ctxA(), t = a.currentTime;
    osc = a.createOscillator(); const g = a.createGain(), pn = a.createStereoPanner ? a.createStereoPanner() : null;
    osc.type = "sine"; osc.frequency.setValueAtTime(f, t);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const v = (+vol.value / 100) * 0.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.setValueAtTime(v, t + dur - 0.1); g.gain.linearRampToValueAtTime(0, t + dur);
    if (pn) { pn.pan.value = pan; osc.connect(g).connect(pn).connect(a.destination); } else osc.connect(g).connect(a.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
    now.textContent = "Đang phát: " + label + (pn || !pan ? "" : " (trình duyệt không hỗ trợ tách trái/phải)");
    stopT = setTimeout(() => { now.textContent = ""; }, dur * 1000);
  }
  function sweep() { play(0, "quét 50 Hz → 15.000 Hz", 50, 5, 15000); }
  function stop() { clearTimeout(stopT); if (osc) { try { osc.stop(); } catch (_) {} osc = null; } now.textContent = ""; }
  return () => { stop(); if (ac) ac.close().catch(() => {}); };
}

/* ---------- Bàn phím, chuột ---------- */
const K = (code, label, w = 1) => ({ code, label, w });
const L = (s) => s.split(" ").map((c) => K("Key" + c, c));
const ROWS = [
  [K("Escape", "Esc"), ...Array.from({ length: 12 }, (_, i) => K("F" + (i + 1), "F" + (i + 1)))],
  [K("Backquote", "`"), ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => K("Digit" + d, String(d))), K("Minus", "-"), K("Equal", "="), K("Backspace", "⌫ Xoá", 2)],
  [K("Tab", "Tab", 1.5), ...L("Q W E R T Y U I O P"), K("BracketLeft", "["), K("BracketRight", "]"), K("Backslash", "\\", 1.5)],
  [K("CapsLock", "Caps", 1.75), ...L("A S D F G H J K L"), K("Semicolon", ";"), K("Quote", "'"), K("Enter", "Enter", 2.25)],
  [K("ShiftLeft", "Shift", 2.25), ...L("Z X C V B N M"), K("Comma", ","), K("Period", "."), K("Slash", "/"), K("ShiftRight", "Shift", 2.75)],
  [K("ControlLeft", "Ctrl", 1.25), K(IS_MAC ? "AltLeft" : "MetaLeft", IS_MAC ? "⌥" : "Win", 1.25), K(IS_MAC ? "MetaLeft" : "AltLeft", IS_MAC ? "⌘" : "Alt", 1.25), K("Space", "Dấu cách", 6.25),
    K(IS_MAC ? "MetaRight" : "AltRight", IS_MAC ? "⌘" : "Alt", 1.25), K(IS_MAC ? "AltRight" : "ContextMenu", IS_MAC ? "⌥" : "Menu", 1.25), K("ControlRight", "Ctrl", 1.25)]
];
const ARROWS = [K("ArrowUp", "↑"), K("ArrowLeft", "←"), K("ArrowDown", "↓"), K("ArrowRight", "→")];
function kbdPane(p) {
  p.textContent = "";
  const seen = new Set(), keyEls = {};
  const last = h("div", { class: "dt-lastkey", "aria-live": "polite" }, h("b", { text: "Bấm một phím bất kỳ" }));
  const others = h("div", { class: "dt-others" });
  const board = h("div", { class: "dt-kb", "aria-hidden": "true" },
    ROWS.map((r) => h("div", { class: "dt-kr" }, r.map((k) => (keyEls[k.code] = h("span", { class: "dt-k", style: { flexGrow: k.w }, text: k.label }))))),
    h("div", { class: "dt-kr dt-arrows" }, ARROWS.map((k) => (keyEls[k.code] = h("span", { class: "dt-k " + k.code, text: k.label })))));
  const count = h("span", { class: "hint" });
  const mouse = h("div", { class: "dt-mouse", tabindex: "0", role: "application", "aria-label": "Vùng thử chuột: bấm trái, phải, giữa, nhấp đúp, cuộn" },
    h("div", { class: "dt-mb" }, ["Trái", "Giữa", "Phải"].map((t, i) => h("span", { "data-b": i, text: t }))),
    h("p", { class: "dt-mlog", text: "Bấm chuột trái / phải / giữa, nhấp đúp hoặc cuộn trong khung này" }));
  p.append(last, h("div", { class: "dt-kbwrap" }, board), others,
    h("div", { class: "row", style: { justifyContent: "space-between" } }, count, h("button", { class: "btn ghost sm", type: "button", onclick: reset }, h("span", { html: icon("rotate-ccw"), style: { display: "contents" } }), "Thử lại từ đầu")),
    h("p", { class: "hint", text: "Phím đã nhận chuyển màu xanh. Một số phím (Fn, Print Screen, phím đa phương tiện, tổ hợp hệ thống) do hệ điều hành giữ nên trang web không nhận được." }),
    h("p", { class: "opt-title", text: "Chuột / bàn di chuột" }), mouse);
  function reset() { seen.clear(); Object.values(keyEls).forEach((e) => e.classList.remove("ok", "down")); others.textContent = ""; count.textContent = ""; last.innerHTML = "<b>Bấm một phím bất kỳ</b>"; }
  const down = (e) => {
    if (document.querySelector("dialog[open]") || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!(e.ctrlKey || e.metaKey) && e.code !== "Tab") e.preventDefault();
    seen.add(e.code);
    const k = keyEls[e.code];
    if (k) k.classList.add("ok", "down");
    else if (!others.querySelector(`[data-c="${CSS.escape(e.code || e.key)}"]`)) others.append(h("span", { class: "chip", "data-c": e.code || e.key, text: e.code || e.key }));
    last.textContent = "";
    last.append(h("b", { text: e.key === " " ? "Dấu cách" : e.key }), h("span", { class: "hint", text: `code: ${e.code || "–"} · keyCode: ${e.keyCode}${e.location ? " · " + ["", "bên trái", "bên phải", "bàn phím số"][e.location] : ""}${e.repeat ? " · đang giữ" : ""}` }));
    count.textContent = `Đã nhận ${seen.size} phím khác nhau`;
  };
  const up = (e) => { const k = keyEls[e.code]; if (k) k.classList.remove("down"); };
  const mlog = mouse.querySelector(".dt-mlog");
  const NAMES = ["trái", "giữa", "phải", "lùi (Back)", "tiến (Forward)"];
  const md = (e) => { e.preventDefault(); const b = mouse.querySelector(`[data-b="${e.button}"]`); if (b) b.classList.add("ok", "down"); mlog.textContent = "Bấm chuột " + (NAMES[e.button] || e.button); };
  const mu = (e) => { const b = mouse.querySelector(`[data-b="${e.button}"]`); if (b) b.classList.remove("down"); };
  mouse.addEventListener("mousedown", md);
  mouse.addEventListener("mouseup", mu);
  mouse.addEventListener("contextmenu", (e) => e.preventDefault());
  mouse.addEventListener("dblclick", () => { mlog.textContent = "Nhấp đúp ✓"; });
  mouse.addEventListener("wheel", (e) => { e.preventDefault(); mlog.textContent = `Cuộn ${e.deltaY > 0 ? "xuống" : e.deltaY < 0 ? "lên" : e.deltaX > 0 ? "sang phải" : "sang trái"} (${Math.round(e.deltaY || e.deltaX)})`; }, { passive: false });
  document.addEventListener("keydown", down);
  document.addEventListener("keyup", up);
  return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); };
}

/* ---------- Màn hình ---------- */
const COLORS = [["#ff0000", "Đỏ"], ["#00ff00", "Xanh lá"], ["#0000ff", "Xanh dương"], ["#ffffff", "Trắng"], ["#000000", "Đen"], ["#808080", "Xám"], ["grad", "Dải màu (kiểm tra sọc)"]];
function scrPane(p) {
  p.textContent = "";
  const info = h("div", { class: "dt-info" });
  const full = h("div", { class: "dt-full", tabindex: "-1", hidden: true });
  let idx = 0, hz = null;
  p.append(info,
    h("div", { class: "row" },
      h("button", { class: "btn big", type: "button", onclick: () => open(0) }, h("span", { html: icon("maximize"), style: { display: "contents" } }), "Thử điểm chết (toàn màn hình)"),
      h("button", { class: "btn ghost", type: "button", onclick: () => open(COLORS.length - 1) }, "Dải màu")),
    h("p", { class: "hint", text: "Mỗi màu phủ kín màn hình: điểm chết là chấm luôn đen (hoặc luôn sáng một màu) không đổi theo nền. Bấm chuột, phím → hoặc vuốt để đổi màu; Esc để thoát." }),
    full);
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    info.textContent = "";
    info.append(h("dl", { class: "kv" },
      h("dt", { text: "Độ phân giải màn hình" }), h("dd", { text: `${screen.width} × ${screen.height} (điểm ảnh CSS)` }),
      h("dt", { text: "Điểm ảnh thật (ước tính)" }), h("dd", { text: `${Math.round(screen.width * dpr)} × ${Math.round(screen.height * dpr)} · tỉ lệ ${dpr}x` }),
      h("dt", { text: "Cửa sổ trình duyệt" }), h("dd", { text: `${innerWidth} × ${innerHeight}` }),
      h("dt", { text: "Độ sâu màu" }), h("dd", { text: screen.colorDepth + " bit" + (matchMedia("(color-gamut: p3)").matches ? " · dải màu rộng (P3)" : "") + (matchMedia("(dynamic-range: high)").matches ? " · HDR" : "") }),
      h("dt", { text: "Tần số quét" }), h("dd", { text: hz === "–" ? "không đo được (trang đang chạy nền)" : hz ? `khoảng ${hz} Hz` : "đang đo…" }),
      h("dt", { text: "Màn hình cảm ứng" }), h("dd", { text: navigator.maxTouchPoints > 0 ? `có (${navigator.maxTouchPoints} điểm chạm)` : "không" })));
  }
  // đo tần số quét bằng requestAnimationFrame trong 1 giây (chỉ để đo; tab chạy nền thì không đo được)
  function measure() {
    if (document.hidden) { hz = "–"; return; }
    let n = 0, t0 = 0;
    setTimeout(() => { if (!hz) { hz = "–"; draw(); } }, 3000);
    const f = (t) => { if (!t0) t0 = t; n++; if (t - t0 < 1000) requestAnimationFrame(f); else { const v = Math.round((n - 1) * 1000 / (t - t0)); hz = [60, 75, 90, 120, 144, 165, 240].find((x) => Math.abs(x - v) <= 3) || v; draw(); } };
    requestAnimationFrame(f);
  }
  function paint() {
    const [c] = COLORS[idx];
    full.style.background = c === "grad" ? "linear-gradient(90deg,#000,#fff),linear-gradient(90deg,red,#ff0,lime,cyan,blue,#f0f,red)" : c;
    full.style.backgroundSize = c === "grad" ? "100% 50%,100% 50%" : "";
    full.style.backgroundRepeat = "no-repeat"; full.style.backgroundPosition = "top,bottom";
    full.dataset.label = COLORS[idx][1] + " · " + (idx + 1) + "/" + COLORS.length;
    full.classList.remove("lbl"); void full.offsetWidth; full.classList.add("lbl"); // hiện lại nhãn màu
  }
  function open(i) {
    idx = i; full.hidden = false; paint();
    if (full.requestFullscreen) full.requestFullscreen().catch(() => {});
    full.focus();
  }
  function close() { full.hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  const nextC = (d) => { idx = (idx + d + COLORS.length) % COLORS.length; paint(); };
  full.addEventListener("click", () => nextC(1));
  full.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); else if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); nextC(1); } else if (e.key === "ArrowLeft") nextC(-1); });
  let tx = 0;
  full.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  full.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) nextC(dx < 0 ? 1 : -1); }, { passive: true });
  const fsc = () => { if (!document.fullscreenElement && !full.hidden) full.hidden = true; };
  document.addEventListener("fullscreenchange", fsc);
  const rs = () => draw();
  window.addEventListener("resize", rs);
  draw(); measure();
  return () => { document.removeEventListener("fullscreenchange", fsc); window.removeEventListener("resize", rs); close(); };
}

const css = document.createElement("style");
css.textContent = `.dt{display:grid;gap:16px}.dt-tabs{max-width:100%}.dt-tabs span .i{width:17px;height:17px}
.dt-pane{display:grid;gap:12px}
.dt-stage{position:relative;background:#111;border-radius:14px;overflow:hidden;aspect-ratio:16/9;display:grid;place-items:center;max-height:60vh}
.dt-video{width:100%;height:100%;object-fit:contain}.dt-video.mirror{transform:scaleX(-1)}
.dt-ph{position:absolute;color:#bbb}
.dt-micbox{display:grid;gap:8px}.dt-wave{width:100%;height:120px;border-radius:12px;background:var(--surface-2);color:var(--brand)}
.dt-level{position:relative;height:16px;border-radius:99px;background:linear-gradient(90deg,var(--surface-2) 0 13%,color-mix(in srgb,var(--ok) 25%,var(--surface-2)) 35% 90%,color-mix(in srgb,var(--err) 25%,var(--surface-2)) 92%);overflow:hidden}
.dt-level span{display:block;height:100%;width:0;background:var(--ok);transition:width .05s}.dt-level i{position:absolute;top:0;bottom:0;width:3px;background:var(--ink);left:0}
.dt-player audio{width:100%;max-width:480px}
.dt-spk-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.dt-spk{flex-direction:column;min-height:84px;white-space:normal;padding:10px}
.dt-spk .i{width:24px;height:24px}
.dt-lastkey{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:70px;justify-content:center;text-align:center}.dt-lastkey b{font-size:28px;font-family:var(--mono)}
.dt-kbwrap{overflow-x:auto;padding-bottom:4px}
.dt-kb{display:grid;gap:5px;min-width:640px;user-select:none}
.dt-kr{display:flex;gap:5px}.dt-k{flex:1 1 0;min-width:0;height:40px;display:grid;place-items:center;border:1px solid var(--line-2);border-bottom-width:3px;border-radius:8px;background:var(--surface);font:600 12.5px var(--mono);color:var(--muted);white-space:nowrap;overflow:hidden}
.dt-k.ok{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}.dt-k.down{transform:translateY(2px);border-bottom-width:1px;background:var(--ok);color:#fff}
.dt-arrows{display:grid;grid-template-columns:repeat(3,44px);grid-template-areas:". u ." "l d r";justify-content:end;gap:5px}
.dt-arrows .ArrowUp{grid-area:u}.dt-arrows .ArrowLeft{grid-area:l}.dt-arrows .ArrowDown{grid-area:d}.dt-arrows .ArrowRight{grid-area:r}
.dt-others{display:flex;flex-wrap:wrap;gap:6px}.dt-others .chip{min-height:30px;font-family:var(--mono);font-size:13px;background:var(--ok-soft);border-color:var(--ok)}
.dt-mouse{border:2px dashed var(--line-2);border-radius:14px;padding:16px;display:grid;gap:10px;justify-items:center;user-select:none}
.dt-mouse:focus-visible{outline:3px solid var(--brand)}
.dt-mb{display:flex;gap:6px}.dt-mb span{width:72px;height:56px;display:grid;place-items:center;border:1px solid var(--line-2);border-radius:12px 12px 8px 8px;font-weight:600;font-size:14px;color:var(--muted)}
.dt-mb span.ok{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}.dt-mb span.down{background:var(--ok);color:#fff}
.dt-mlog{margin:0;text-align:center;color:var(--muted);font-size:14px}
.dt-full{position:fixed;inset:0;z-index:1000;cursor:pointer}.dt-full::after{content:attr(data-label);position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.45);color:#fff;font-size:13px;opacity:0}.dt-full.lbl::after{animation:dt-fade 2.5s forwards}
@keyframes dt-fade{0%,70%{opacity:1}to{opacity:0}}`;
document.head.append(css);
