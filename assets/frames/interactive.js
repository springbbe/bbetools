/* Khung 4: công cụ tương tác (camera, micro, đồng hồ, vòng quay…). Lõi chỉ cung cấp các tiện ích chung,
   công cụ tự vẽ giao diện trong mount(el, ctx).

   interactiveTool({ mount(el, ctx) {} })
   ctx: store (lưu riêng cho công cụ), beep(), notify(), wakeLock(on), fullscreen(el), camera(video, opts), stopStream(s) */
import { $, h, store, toast, TOOL_ID } from "../core.js";

let audioCtx = null;
export function beep({ freq = 880, ms = 180, times = 3, gap = 140, volume = 0.25 } = {}) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    let t = audioCtx.currentTime + 0.02;
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + ms / 1000 + 0.02);
      t += (ms + gap) / 1000;
    }
  } catch (_) {}
}
/** Gọi trong một thao tác của người dùng để trình duyệt cho phép phát âm thanh về sau */
export function unlockAudio() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === "suspended") audioCtx.resume(); } catch (_) {}
}

export async function askNotify() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}
export function notify(title, body) {
  try { if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(title, { body, icon: "../assets/apple-touch-icon.png", tag: "bbetools-" + TOOL_ID }); } catch (_) {}
}

let lock = null;
export async function wakeLock(on) {
  try {
    if (on && "wakeLock" in navigator && !lock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => { lock = null; }); }
    if (!on && lock) { await lock.release(); lock = null; }
  } catch (_) {}
}

export function fullscreen(el) {
  if (document.fullscreenElement) return document.exitFullscreen();
  if (el.requestFullscreen) return el.requestFullscreen().catch(() => {});
}

const CAM_ERR = {
  NotAllowedError: "Bạn chưa cho phép dùng camera. Bấm vào biểu tượng ổ khoá cạnh thanh địa chỉ để cho phép, rồi thử lại.",
  NotFoundError: "Không tìm thấy camera trên thiết bị này.",
  NotReadableError: "Camera đang được ứng dụng khác dùng. Hãy đóng ứng dụng đó rồi thử lại.",
  OverconstrainedError: "Camera không hỗ trợ cấu hình yêu cầu.",
  SecurityError: "Trình duyệt chặn camera trên trang này."
};
/** Bật camera vào thẻ <video>. opts: { facing: "environment"|"user", deviceId } → MediaStream */
export async function camera(video, opts = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { const e = new Error("Trình duyệt này không hỗ trợ camera."); e.userMsg = e.message; throw e; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: opts.deviceId ? { deviceId: { exact: opts.deviceId } } : { facingMode: { ideal: opts.facing || "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = stream;
    video.setAttribute("playsinline", "");
    video.muted = true;
    await video.play().catch(() => {});
    return stream;
  } catch (e) {
    const err = new Error(CAM_ERR[e && e.name] || "Không bật được camera: " + ((e && e.message) || e));
    err.userMsg = err.message;
    throw err;
  }
}
export function stopStream(s) { if (s) s.getTracks().forEach((t) => t.stop()); }

export function interactiveTool(cfg) {
  const app = $("#app");
  app.textContent = "";
  const el = h("div", { class: "ia" });
  app.append(el);
  const key = "ia:" + TOOL_ID;
  const ctx = {
    el, app,
    store: { get: (k, d) => (store.get(key, {})[k] ?? d), set: (k, v) => { const o = store.get(key, {}); o[k] = v; store.set(key, o); } },
    beep, unlockAudio, notify, askNotify, wakeLock, fullscreen, camera, stopStream, toast
  };
  cfg.mount(el, ctx);
  return ctx;
}
