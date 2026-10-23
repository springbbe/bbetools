/* Các phần kiểm tra thiết bị dùng chung cho trang gộp "Kiểm tra camera, micro, bàn phím, màn hình" và các trang riêng
   (Test webcam, Test micro, Test loa, Test bàn phím, Test chuột, Kiểm tra màn hình). Mỗi phần: xxxPane(phần tử, ctx, opts)
   vẽ giao diện vào phần tử và trả về hàm dọn dẹp (tắt camera, micro, gỡ sự kiện). Hình, tiếng chỉ hiện trên máy. */
import { h, icon, save, MOD } from "./core.js";

const IS_MAC = MOD === "⌘";

/** Gắn một phần vào trang riêng (khung tương tác) */
export function mountPane(el, ctx, pane, opts) {
  const p = h("div", { class: "dt-pane" });
  el.append(h("div", { class: "dt" }, p));
  const cleanup = pane(p, ctx, opts) || null;
  window.addEventListener("pagehide", () => { if (cleanup) cleanup(); });
}

export function alertEl(kind, text) { const p = h("p", { class: "alert " + kind, html: icon(kind === "ok" ? "circle-check" : kind === "info" ? "info" : "triangle-alert") + "<span></span>" }); p.lastChild.textContent = text; return p; }
async function devices(kind) { try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === kind); } catch (_) { return []; } }
const MIC_ERR = { NotAllowedError: "Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khoá cạnh thanh địa chỉ để cho phép, rồi thử lại.", NotFoundError: "Không tìm thấy micro nào.", NotReadableError: "Micro đang bị ứng dụng khác dùng (Zoom, Teams…). Đóng ứng dụng đó rồi thử lại." };

/* ---------- Camera ---------- */
export function camPane(p, ctx) {
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
export function micPane(p, ctx) {
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
export function spkPane(p) {
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

/* ---------- Bàn phím ---------- */
const K = (code, label, w = 1) => ({ code, label, w });
const NA = (label, w = 1) => ({ code: "", label, w, na: true }); // phím trình duyệt không nhận được (fn)
const L = (s) => s.split(" ").map((c) => K("Key" + c, c));
const FK = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => K("F" + (a + i), "F" + (a + i)));
const ARROWS = [K("ArrowUp", "↑"), K("ArrowLeft", "←"), K("ArrowDown", "↓"), K("ArrowRight", "→")];
const ROW_W = 15; // bề rộng một hàng, tính theo số phím chữ; phím cách tự lấp phần còn lại

/** Bố cục bàn phím: mac (Mac/Windows), desk (bàn phím rời: cụm Ins/Home…, mũi tên riêng), num (có bàn phím số).
 *  Trả về { rows: hàng phím chính, nav: [phím, hàng, cột], num: [phím, hàng, cột, số hàng, số cột] } */
function kbLayout(mac, desk, num) {
  const top = [K("Escape", mac ? "esc" : "Esc"), ...FK(1, 12)];
  if (!mac && !desk) top.push(K("Delete", "Del"));
  const ctl = K("ControlLeft", mac ? "⌃ ctrl" : "Ctrl", 1.25), opt = (s) => K("Alt" + s, mac ? "⌥ opt" : "Alt", 1.25);
  const cmd = (s) => K("Meta" + s, mac ? "⌘ cmd" : "Win", mac ? 1.5 : 1.25), space = K("Space", "Dấu cách", 0);
  const bottom = mac
    ? (desk ? [ctl, opt("Left"), cmd("Left"), space, cmd("Right"), opt("Right"), K("ControlRight", "⌃ ctrl", 1.25)]
      : [NA("fn"), { ...ctl, w: 1 }, { ...opt("Left"), w: 1 }, cmd("Left"), space, cmd("Right"), { ...opt("Right"), w: 1 }, { code: "arrows", w: 3 }])
    : (desk ? [ctl, cmd("Left"), opt("Left"), space, opt("Right"), cmd("Right"), K("ContextMenu", "Menu", 1.25), K("ControlRight", "Ctrl", 1.25)]
      : [ctl, NA("Fn"), cmd("Left"), opt("Left"), space, opt("Right"), K("ControlRight", "Ctrl", 1.25), { code: "arrows", w: 3 }]);
  space.w = ROW_W - bottom.reduce((s, k) => s + k.w, 0);
  const rows = [top,
    [K("Backquote", "`"), ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => K("Digit" + d, String(d))), K("Minus", "-"), K("Equal", "="), K("Backspace", mac ? "delete" : "⌫ Xoá", 2)],
    [K("Tab", mac ? "tab" : "Tab", 1.5), ...L("Q W E R T Y U I O P"), K("BracketLeft", "["), K("BracketRight", "]"), K("Backslash", "\\", 1.5)],
    [K("CapsLock", mac ? "caps" : "Caps", 1.75), ...L("A S D F G H J K L"), K("Semicolon", ";"), K("Quote", "'"), K("Enter", mac ? "return" : "Enter", 2.25)],
    [K("ShiftLeft", mac ? "⇧ shift" : "Shift", 2.25), ...L("Z X C V B N M"), K("Comma", ","), K("Period", "."), K("Slash", "/"), K("ShiftRight", mac ? "⇧ shift" : "Shift", 2.75)],
    bottom];
  // cụm điều hướng 3 cột × 6 hàng (hàng 1 ngang hàng phím F), mũi tên ở hai hàng cuối
  const nav = !desk ? [] : [...(mac ? [[K("F13", "F13"), 1, 1], [K("F14", "F14"), 1, 2], [K("F15", "F15"), 1, 3],
    [NA("fn"), 2, 1], [K("Home", "home"), 2, 2], [K("PageUp", "pg up"), 2, 3], [K("Delete", "⌦ del"), 3, 1], [K("End", "end"), 3, 2], [K("PageDown", "pg dn"), 3, 3]]
    : [[K("PrintScreen", "PrtSc"), 1, 1], [K("ScrollLock", "ScrLk"), 1, 2], [K("Pause", "Pause"), 1, 3],
      [K("Insert", "Ins"), 2, 1], [K("Home", "Home"), 2, 2], [K("PageUp", "PgUp"), 2, 3], [K("Delete", "Del"), 3, 1], [K("End", "End"), 3, 2], [K("PageDown", "PgDn"), 3, 3]]),
    [ARROWS[0], 5, 2], [ARROWS[1], 6, 1], [ARROWS[2], 6, 2], [ARROWS[3], 6, 3]];
  // bàn phím số 4 cột × 6 hàng; Mac có thêm F16–F19 ở hàng trên cùng và phím = (clear là NumLock)
  const N = (code, label, r, c, rs = 1, cs = 1) => [K(code, label), r, c, rs, cs];
  const pad = !num ? [] : mac
    ? [...[16, 17, 18, 19].map((f, i) => N("F" + f, "F" + f, 1, i + 1)), N("NumLock", "clear", 2, 1), N("NumpadEqual", "=", 2, 2), N("NumpadDivide", "/", 2, 3), N("NumpadMultiply", "*", 2, 4),
      N("Numpad7", "7", 3, 1), N("Numpad8", "8", 3, 2), N("Numpad9", "9", 3, 3), N("NumpadSubtract", "−", 3, 4), N("Numpad4", "4", 4, 1), N("Numpad5", "5", 4, 2), N("Numpad6", "6", 4, 3), N("NumpadAdd", "+", 4, 4),
      N("Numpad1", "1", 5, 1), N("Numpad2", "2", 5, 2), N("Numpad3", "3", 5, 3), N("NumpadEnter", "enter", 5, 4, 2), N("Numpad0", "0", 6, 1, 1, 2), N("NumpadDecimal", ".", 6, 3)]
    : [N("NumLock", "Num", 2, 1), N("NumpadDivide", "/", 2, 2), N("NumpadMultiply", "*", 2, 3), N("NumpadSubtract", "−", 2, 4),
      N("Numpad7", "7", 3, 1), N("Numpad8", "8", 3, 2), N("Numpad9", "9", 3, 3), N("NumpadAdd", "+", 3, 4, 2), N("Numpad4", "4", 4, 1), N("Numpad5", "5", 4, 2), N("Numpad6", "6", 4, 3),
      N("Numpad1", "1", 5, 1), N("Numpad2", "2", 5, 2), N("Numpad3", "3", 5, 3), N("NumpadEnter", "Enter", 5, 4, 2), N("Numpad0", "0", 6, 1, 1, 2), N("NumpadDecimal", ".", 6, 3)];
  return { rows, nav, num: pad };
}

/** Thử bàn phím. opts.full: có chọn bố cục (Windows/Mac, laptop/bàn phím rời, bàn phím số), thử giữ nhiều phím, phát hiện phím dội, lịch sử phím */
export function kbdPane(p, ctx, opts = {}) {
  p.textContent = "";
  const S = ctx.store, oldFull = S.get("kbFull", false); // kbFull: lựa chọn của bản cũ (Laptop / Đầy đủ)
  let mac = opts.full ? S.get("kbOS", IS_MAC ? "mac" : "win") === "mac" : IS_MAC;
  let desk = !!opts.full && S.get("kbDesk", oldFull), num = !!opts.full && S.get("kbNum", oldFull);
  const seen = new Set(), keyEls = {}, held = new Set(), upAt = {}, chatter = new Set(), hist = [];
  let maxHeld = 0;
  const last = h("div", { class: "dt-lastkey", "aria-live": "polite" }, h("b", { text: "Bấm một phím bất kỳ" }));
  const others = h("div", { class: "dt-others" });
  const wrap = h("div", { class: "dt-kbwrap" });
  const count = h("span", { class: "hint" });
  const rollEl = h("p", { class: "dt-roll", hidden: !opts.full });
  const chatEl = h("div");
  const histEl = h("div", { class: "dt-hist", hidden: !opts.full, "aria-label": "Các phím vừa bấm" });
  const note = h("p", { class: "hint" });
  function build() {
    for (const k in keyEls) delete keyEls[k];
    const lay = kbLayout(mac, desk, num);
    const mk = (k, extra = "") => {
      const e = h("span", { class: "dt-k " + (k.na ? "na " : "") + extra, style: k.w ? { flexGrow: k.w } : null, text: k.label });
      if (!k.na) keyEls[k.code] = e;
      return e;
    };
    const at = (e, r, c, rs = 1, cs = 1) => { e.style.gridRow = `${r} / span ${rs}`; e.style.gridColumn = `${c} / span ${cs}`; return e; };
    const arrows = (k) => h("div", { class: "dt-ar", style: { flexGrow: k.w } }, ARROWS.map((a) => mk(a, a.code)));
    const main = h("div", { class: "dt-kb" }, lay.rows.map((r) => h("div", { class: "dt-kr" }, r.map((k) => (k.code === "arrows" ? arrows(k) : mk(k))))));
    const board = h("div", { class: "dt-board" + (desk ? " desk" : "") + (num ? " num" : ""), "aria-hidden": "true" }, main);
    if (lay.nav.length) board.append(h("div", { class: "dt-nav" }, lay.nav.map(([k, r, c]) => at(mk(k), r, c))));
    if (lay.num.length) board.append(h("div", { class: "dt-num" }, lay.num.map(([k, r, c, rs, cs]) => at(mk(k), r, c, rs, cs))));
    wrap.textContent = ""; wrap.append(board);
    for (const c of seen) if (keyEls[c]) keyEls[c].classList.add("ok");
    for (const c of chatter) if (keyEls[c]) keyEls[c].classList.add("bad");
    note.textContent = (mac ? "Trên Mac, hàng F1–F12 mặc định là phím độ sáng, âm lượng… nên trang web không nhận: giữ fn rồi bấm để thử. " : "")
      + "Phím viền đứt (Fn) và một số phím khác (Print Screen, phím đa phương tiện, tổ hợp hệ thống) do hệ điều hành giữ nên trang web không nhận được.";
    drawCount();
  }
  const seg = (label, name, items, cur, set) => h("div", { class: "seg", role: "radiogroup", "aria-label": label },
    items.map(([v, l]) => h("label", null, h("input", { type: "radio", name, value: v, checked: v === cur, onchange: (e) => { set(v); unfocus(e); build(); } }), h("span", { text: l }))));
  // bấm chuột chọn xong thì bỏ focus để phím bấm tiếp theo được tính; dùng bàn phím (Tab) thì giữ nguyên
  const unfocus = (e) => { if (!e.target.matches(":focus-visible")) e.target.blur(); };
  const numSw = h("input", { type: "checkbox", checked: num, onchange: (e) => { num = e.target.checked; S.set("kbNum", num); unfocus(e); build(); } });
  const controls = opts.full ? h("div", { class: "row dt-kbopt" },
    seg("Hệ điều hành", "kb-os", [["win", "Windows"], ["mac", "Mac"]], mac ? "mac" : "win", (v) => { mac = v === "mac"; S.set("kbOS", v); }),
    seg("Kiểu bàn phím", "kb-desk", [["0", "Laptop"], ["1", "Bàn phím rời"]], desk ? "1" : "0", (v) => { desk = v === "1"; S.set("kbDesk", desk); }),
    h("label", { class: "switch" }, numSw, h("span", { text: "Có bàn phím số" }))) : null;
  build();
  p.append(controls || "", last, wrap, others, rollEl, chatEl, histEl,
    h("div", { class: "row", style: { justifyContent: "space-between" } }, count, h("button", { class: "btn ghost sm", type: "button", onclick: reset }, h("span", { html: icon("rotate-ccw"), style: { display: "contents" } }), "Thử lại từ đầu")),
    note);
  function drawCount() {
    if (!seen.size) { count.textContent = ""; return; }
    const total = Object.keys(keyEls).length, onBoard = Object.keys(keyEls).filter((c) => seen.has(c)).length;
    count.textContent = `Đã nhận ${seen.size} phím khác nhau · ${onBoard}/${total} phím trên hình`;
  }
  function drawRoll() { rollEl.textContent = held.size ? `Đang giữ ${held.size} phím cùng lúc · nhiều nhất: ${maxHeld}` : maxHeld ? `Nhận được nhiều nhất ${maxHeld} phím giữ cùng lúc` : "Giữ nhiều phím cùng lúc (ví dụ A S D F J K L) để xem bàn phím nhận được bao nhiêu phím một lúc."; }
  function reset() {
    seen.clear(); held.clear(); chatter.clear(); hist.length = 0; maxHeld = 0;
    Object.values(keyEls).forEach((e) => e.classList.remove("ok", "down", "bad"));
    others.textContent = ""; count.textContent = ""; chatEl.textContent = ""; histEl.textContent = "";
    last.innerHTML = "<b>Bấm một phím bất kỳ</b>"; drawRoll();
  }
  const down = (e) => {
    if (document.querySelector("dialog[open]") || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!(e.ctrlKey || e.metaKey) && e.code !== "Tab") e.preventDefault();
    const code = e.code || e.key;
    // phím dội: nhả ra rồi tự nhận lại trong vòng 35 ms (người bấm không nhanh được như vậy)
    if (!e.repeat && upAt[code] && performance.now() - upAt[code] < 35 && !chatter.has(code)) {
      chatter.add(code);
      if (keyEls[code]) keyEls[code].classList.add("bad");
      chatEl.textContent = "";
      chatEl.append(alertEl("warn", `Phím có thể bị dội (một lần bấm nhận thành hai): ${[...chatter].join(", ")}. Hãy thử bấm lại vài lần để chắc chắn.`));
    }
    seen.add(code);
    if (!e.repeat) { held.add(code); maxHeld = Math.max(maxHeld, held.size); }
    const k = keyEls[code];
    if (k) k.classList.add("ok", "down");
    else if (!others.querySelector(`[data-c="${CSS.escape(code)}"]`)) others.append(h("span", { class: "chip", "data-c": code, text: code }));
    last.textContent = "";
    last.append(h("b", { text: e.key === " " ? "Dấu cách" : e.key }), h("span", { class: "hint", text: `code: ${e.code || "–"} · keyCode: ${e.keyCode}${e.location ? " · " + ["", "bên trái", "bên phải", "bàn phím số"][e.location] : ""}${e.repeat ? " · đang giữ" : ""}` }));
    drawCount();
    if (opts.full && !e.repeat) {
      hist.unshift(e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key);
      hist.length = Math.min(hist.length, 24);
      histEl.textContent = ""; histEl.append(h("span", { class: "hint", text: "Vừa bấm: " }), ...hist.map((x) => h("kbd", { text: x })));
    }
    drawRoll();
  };
  const blur = () => { held.clear(); Object.values(keyEls).forEach((x) => x.classList.remove("down")); drawRoll(); };
  const up = (e) => {
    const code = e.code || e.key; upAt[code] = performance.now();
    // macOS không gửi keyup cho các phím bấm trong lúc giữ ⌘, nên nhả ⌘ thì coi như nhả hết
    if (IS_MAC && /^Meta/.test(code)) return blur();
    held.delete(code); const k = keyEls[code]; if (k) k.classList.remove("down"); drawRoll();
  };
  document.addEventListener("keydown", down);
  document.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  drawRoll();
  return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
}

/* ---------- Chuột ---------- */
/** Thử chuột: các nút (cả Lùi/Tiến), nhấp đúp, phát hiện chuột tự nhấp đúp, con lăn, tần số báo (polling rate) */
export function mousePane(p) {
  p.textContent = "";
  const NAMES = ["Trái", "Giữa", "Phải", "Lùi", "Tiến"];
  const cnt = [0, 0, 0, 0, 0], lastDown = {};
  let dbl = 0, wheelUp = 0, wheelDown = 0, wheelSide = 0, minGap = Infinity, hz = 0, hzMax = 0, win = [], bad = new Set();
  const btns = NAMES.map((t, i) => h("span", { class: "dt-mbtn", "data-b": i }, h("b", { text: t }), h("small", { text: "0 lần" })));
  const area = h("div", { class: "dt-mouse", tabindex: "0", role: "application", "aria-label": "Vùng thử chuột: bấm các nút, nhấp đúp, cuộn, di chuột" },
    h("div", { class: "dt-mb" }, btns.slice(0, 3)), h("div", { class: "dt-mb side" }, btns.slice(3)),
    h("p", { class: "dt-mlog", text: "Bấm các nút chuột, nhấp đúp, cuộn hoặc di chuột trong khung này" }));
  const stats = h("dl", { class: "kv dt-mstats" });
  const warn = h("div");
  p.append(area, warn, stats, h("p", { class: "hint", text: "Nút Lùi/Tiến là hai nút bên hông của nhiều chuột. Bàn di chuột (touchpad) thường không có nút giữa. Trong khung này, các nút không làm trang chuyển đi." }));
  const mlog = area.querySelector(".dt-mlog");
  function draw() {
    btns.forEach((b, i) => { b.lastChild.textContent = `${cnt[i]} lần`; });
    stats.textContent = "";
    const row = (k, v) => [h("dt", { text: k }), h("dd", { text: v })];
    stats.append(...row("Nhấp đúp", `${dbl} lần`),
      ...row("Hai lần bấm sát nhau nhất", Number.isFinite(minGap) ? Math.round(minGap) + " ms" : "–"),
      ...row("Con lăn", `lên ${wheelUp} · xuống ${wheelDown}` + (wheelSide ? ` · ngang ${wheelSide}` : "")),
      ...row("Tần số báo (polling rate)", hzMax ? `khoảng ${hzMax} Hz` + (hz ? ` (hiện tại ${hz} Hz)` : "") : "di chuột nhanh trong khung để đo"));
  }
  const md = (e) => {
    e.preventDefault();
    const i = e.button, now = performance.now();
    if (i >= 0 && i < 5) { cnt[i]++; btns[i].classList.add("ok", "down"); }
    if (lastDown[i] != null) {
      const gap = now - lastDown[i];
      minGap = Math.min(minGap, gap);
      // người bấm hai lần liên tiếp mất ít nhất ~80 ms; nhanh hơn là công tắc chuột bị dội (tự nhấp đúp)
      if (gap < 60 && !bad.has(i)) { bad.add(i); warn.textContent = ""; warn.append(alertEl("warn", `Nút ${[...bad].map((b) => NAMES[b] || b).join(", ")} vừa nhận hai lần bấm chỉ cách nhau ${Math.round(gap)} ms: có thể chuột bị lỗi tự nhấp đúp (công tắc bị mòn). Hãy bấm từng cái chậm rãi vài lần để chắc chắn.`)); }
    }
    lastDown[i] = now;
    mlog.textContent = "Bấm nút " + (NAMES[i] || i).toLowerCase();
    draw();
  };
  const mu = (e) => { e.preventDefault(); const b = btns[e.button]; if (b) b.classList.remove("down"); };
  const wh = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) wheelUp++; else if (e.deltaY > 0) wheelDown++; else if (e.deltaX) wheelSide++;
    mlog.textContent = `Cuộn ${e.deltaY > 0 ? "xuống" : e.deltaY < 0 ? "lên" : e.deltaX > 0 ? "sang phải" : "sang trái"} (${Math.round(e.deltaY || e.deltaX)})`;
    draw();
  };
  // đếm số lần chuột báo vị trí trong 1 giây (gộp cả các sự kiện bị trình duyệt dồn lại)
  const pm = (e) => {
    const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [], evs = co.length ? co : [e];
    for (const x of evs) win.push(x.timeStamp);
    const now = e.timeStamp;
    while (win.length && now - win[0] > 1000) win.shift();
    if (win.length > 20 && now - win[0] > 500) {
      const v = Math.round((win.length - 1) * 1000 / (now - win[0]));
      hz = [125, 250, 500, 1000, 2000, 4000, 8000].find((s) => Math.abs(s - v) < s * 0.12) || v;
      hzMax = Math.max(hzMax, hz);
      draw();
    }
  };
  const leave = () => { win = []; hz = 0; draw(); };
  area.addEventListener("mousedown", md);
  area.addEventListener("mouseup", mu);
  area.addEventListener("auxclick", (e) => e.preventDefault());
  area.addEventListener("contextmenu", (e) => e.preventDefault());
  area.addEventListener("dblclick", () => { dbl++; mlog.textContent = "Nhấp đúp ✓"; draw(); });
  area.addEventListener("wheel", wh, { passive: false });
  area.addEventListener("pointermove", pm);
  area.addEventListener("pointerleave", leave);
  draw();
  return () => {};
}

/* ---------- Màn hình ---------- */
const COLORS = [["#ff0000", "Đỏ"], ["#00ff00", "Xanh lá"], ["#0000ff", "Xanh dương"], ["#ffffff", "Trắng"], ["#000000", "Đen (xem hở sáng ở viền)"], ["#404040", "Xám tối"], ["#808080", "Xám"], ["#c0c0c0", "Xám sáng (xem vết ố, loang màu)"], ["grad", "Dải màu (kiểm tra sọc)"], ["checker", "Ô cờ 1 điểm ảnh (độ nét, nhấp nháy)"]];
export function scrPane(p) {
  p.textContent = "";
  const info = h("div", { class: "dt-info" });
  const full = h("div", { class: "dt-full", tabindex: "-1", hidden: true });
  let idx = 0, hz = null;
  p.append(info,
    h("div", { class: "row" },
      h("button", { class: "btn big", type: "button", onclick: () => open(0) }, h("span", { html: icon("maximize"), style: { display: "contents" } }), "Thử điểm chết (toàn màn hình)"),
      h("button", { class: "btn ghost", type: "button", onclick: () => open(COLORS.findIndex((x) => x[0] === "grad")) }, "Dải màu"),
      h("button", { class: "btn ghost", type: "button", onclick: () => open(COLORS.length - 1) }, "Ô cờ (độ nét)")),
    h("p", { class: "hint", text: "Mỗi màu phủ kín màn hình: điểm chết là chấm luôn đen (hoặc luôn sáng một màu) không đổi theo nền. Nền đen giúp thấy hở sáng ở viền; nền xám thấy vết loang màu; ô cờ phải mịn, không nhấp nháy. Bấm chuột, phím → hoặc vuốt để đổi màu; Esc để thoát." }),
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
    const px = 1 / (window.devicePixelRatio || 1); // đúng 1 điểm ảnh thật
    full.style.background = c === "grad" ? "linear-gradient(90deg,#000,#fff),linear-gradient(90deg,red,#ff0,lime,cyan,blue,#f0f,red)"
      : c === "checker" ? `repeating-conic-gradient(#000 0 25%,#fff 0 50%) 0 0/${2 * px}px ${2 * px}px` : c;
    full.style.backgroundSize = c === "grad" ? "100% 50%,100% 50%" : c === "checker" ? `${2 * px}px ${2 * px}px` : "";
    full.style.backgroundRepeat = c === "checker" ? "repeat" : "no-repeat"; full.style.backgroundPosition = c === "checker" ? "0 0" : "top,bottom";
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
.dt-kbopt{gap:10px 14px;align-items:center}.dt-kbopt .switch{align-items:center}
.dt-board{display:flex;gap:14px;align-items:flex-start;min-width:640px;user-select:none}.dt-board.desk{min-width:800px}.dt-board.num{min-width:850px}.dt-board.desk.num{min-width:1020px}
.dt-kb{display:grid;gap:5px;flex:1 1 620px}
.dt-nav,.dt-num{display:grid;gap:5px;grid-template-rows:repeat(6,40px)}.dt-nav{flex:0 0 150px;grid-template-columns:repeat(3,1fr)}
.dt-num{flex:0 0 200px;grid-template-columns:repeat(4,1fr)}
.dt-num .dt-k,.dt-nav .dt-k{height:auto}
.dt-k.na{border-style:dashed;border-bottom-width:1px;opacity:.6}
.dt-k.ok.bad,.dt-k.bad{background:var(--warn-soft);border-color:var(--warn);color:var(--warn)}
.dt-roll{margin:0;font-weight:600}
.dt-hist{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.dt-hist kbd{font:600 12.5px var(--mono);padding:2px 7px;border:1px solid var(--line-2);border-radius:6px;background:var(--surface)}
.dt-more{margin:0}
.dt-pane .btn{white-space:normal;max-width:100%}
.dt-kr{display:flex;gap:5px}.dt-k{flex:1 1 0;min-width:0;height:40px;display:grid;place-items:center;border:1px solid var(--line-2);border-bottom-width:3px;border-radius:8px;background:var(--surface);font:600 12.5px var(--mono);color:var(--muted);white-space:nowrap;overflow:hidden}
.dt-k.ok{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}.dt-k.down{transform:translateY(2px);border-bottom-width:1px;background:var(--ok);color:#fff}
.dt-ar{flex:1 1 0;min-width:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;grid-template-areas:". u ." "l d r";gap:2px;height:40px}
.dt-ar .dt-k{height:auto;border-bottom-width:2px;border-radius:6px;font-size:11px}.dt-ar .dt-k.down{border-bottom-width:1px;transform:translateY(1px)}
.dt-ar .ArrowUp{grid-area:u}.dt-ar .ArrowLeft{grid-area:l}.dt-ar .ArrowDown{grid-area:d}.dt-ar .ArrowRight{grid-area:r}
.dt-others{display:flex;flex-wrap:wrap;gap:6px}.dt-others .chip{min-height:30px;font-family:var(--mono);font-size:13px;background:var(--ok-soft);border-color:var(--ok)}
.dt-mouse{border:2px dashed var(--line-2);border-radius:14px;padding:16px;display:grid;gap:10px;justify-items:center;user-select:none}
.dt-mouse:focus-visible{outline:3px solid var(--brand)}
.dt-mb{display:flex;gap:6px}.dt-mbtn{width:76px;height:60px;display:grid;place-items:center;align-content:center;border:1px solid var(--line-2);border-radius:12px 12px 8px 8px;font-size:14px;color:var(--muted)}
.dt-mb.side .dt-mbtn{height:44px;border-radius:10px}.dt-mbtn small{font-size:12px}
.dt-mbtn.ok{background:var(--ok-soft);border-color:var(--ok);color:var(--ok)}.dt-mbtn.down{background:var(--ok);color:#fff}
.dt-mouse{min-height:220px;align-content:center}.dt-mstats{margin:0}
.dt-mlog{margin:0;text-align:center;color:var(--muted);font-size:14px}
.dt-full{position:fixed;inset:0;z-index:1000;cursor:pointer}.dt-full::after{content:attr(data-label);position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:4px 10px;border-radius:8px;background:rgba(0,0,0,.45);color:#fff;font-size:13px;opacity:0}.dt-full.lbl::after{animation:dt-fade 2.5s forwards}
@keyframes dt-fade{0%,70%{opacity:1}to{opacity:0}}`;
document.head.append(css);
