/* Quét mã QR / mã vạch: từ camera (BarcodeDetector có sẵn hoặc zxing-wasm), từ ảnh, ảnh chụp màn hình, PDF.
   Nhận diện sẵn: link, WiFi, VietQR (chuyển khoản), danh thiếp, email, SMS, điện thoại. */
import { h, icon, ROOT, lib, intake, copyText, toast, fmtNum, esc, takeHandoff, fileKinds, LANG } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseVietQR } from "../lib/vietqr.js";
import { readNumber } from "../lib/doc-so.js";

let banks = null;
const bankName = async (bin) => {
  if (!banks) banks = fetch(ROOT + "data/ngan-hang-vietqr.json").then((r) => r.json()).then((d) => Object.fromEntries(d.banks.map((b) => [b.bin, b]))).catch(() => ({}));
  const b = (await banks)[bin];
  return b ? `${b.short} – ${b.name}` : "Mã ngân hàng " + bin;
};

const FORMAT_VI = { QRCode: "QR", MicroQRCode: "Micro QR", DataMatrix: "Data Matrix", Aztec: "Aztec", PDF417: "PDF417", EAN13: "EAN-13", EAN8: "EAN-8", UPCA: "UPC-A", UPCE: "UPC-E", Code128: "Code 128", Code39: "Code 39", Code93: "Code 93", ITF: "ITF", Codabar: "Codabar" };
const fmtName = (f) => FORMAT_VI[f] || FORMAT_VI[String(f).replace(/[-_ ]/g, "")] || String(f).replace(/_/g, " ").toUpperCase();

/* ---- giải mã ---- */
let detector = null;
async function nativeDetector() {
  if (detector !== null) return detector;
  detector = false;
  try {
    if ("BarcodeDetector" in window) {
      const fmts = await window.BarcodeDetector.getSupportedFormats();
      if (fmts.includes("qr_code")) detector = new window.BarcodeDetector({ formats: fmts });
    }
  } catch (_) {}
  return detector;
}
async function decode(source, w, hgt, tryHarder) {
  const nd = !tryHarder && await nativeDetector();
  if (nd) {
    try { const r = await nd.detect(source); if (r.length) return r.map((x) => ({ text: x.rawValue, format: x.format })); } catch (_) {}
    if (!tryHarder) return [];
  }
  const z = await lib("zxing");
  let input = source;
  if (!(source instanceof Blob) && !(source instanceof ImageData)) {
    const c = document.createElement("canvas"); c.width = w; c.height = hgt;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(source, 0, 0, w, hgt);
    input = g.getImageData(0, 0, w, hgt);
  }
  const res = await z.readBarcodes(input, { tryHarder: !!tryHarder, maxNumberOfSymbols: 8 });
  return res.filter((r) => r.isValid !== false && r.text).map((r) => ({ text: r.text, format: r.format }));
}

/* ---- hiển thị kết quả ---- */
async function describe(text) {
  const rows = [];
  let kind = "Văn bản", actions = [];
  const vq = parseVietQR(text);
  if (vq && vq.napas) {
    kind = "VietQR – chuyển khoản";
    rows.push(["Ngân hàng", await bankName(vq.bin)], [vq.service === "QRIBFTTC" ? "Số thẻ" : "Số tài khoản", vq.account]);
    if (vq.amount) rows.push(["Số tiền", LANG === "vi" ? fmtNum(vq.amount) + " đ (" + readNumber(String(vq.amount), { unit: "đồng" }) + ")" : fmtNum(vq.amount) + " VND"]);
    if (vq.message) rows.push(["Nội dung", vq.message]);
    rows.push(["Kiểm tra mã", vq.crcOk ? "✓ Hợp lệ (CRC đúng)" : "⚠ Sai mã kiểm tra — mã có thể đã bị sửa"]);
    actions.push(["Sao chép số tài khoản", () => copyText(vq.account)]);
  } else if (vq) {
    kind = "Mã thanh toán EMVCo";
  } else if (/^WIFI:/i.test(text)) {
    kind = "WiFi";
    const f = {}; text.slice(5).replace(/(\w):((?:\\.|[^;])*);/g, (_, k, v) => { f[k.toUpperCase()] = v.replace(/\\(.)/g, "$1"); });
    rows.push(["Tên mạng", f.S || ""], ["Bảo mật", f.T || "Không"], ["Mật khẩu", f.P || "(không có)"]);
    if (f.P) actions.push(["Sao chép mật khẩu", () => copyText(f.P)]);
  } else if (/^https?:\/\//i.test(text)) {
    kind = "Đường link";
    let host = ""; try { host = new URL(text).hostname; } catch (_) {}
    rows.push(["Trang web", host]);
    actions.push(["Mở link", () => { if (confirm("Mở " + text + " ?\n\nHãy chắc chắn bạn tin tưởng trang này.")) window.open(text, "_blank", "noopener"); }]);
  } else if (/^BEGIN:VCARD/i.test(text)) {
    kind = "Danh thiếp";
    const get = (k) => ((new RegExp("^" + k + "[^:\\n]*:(.*)$", "im").exec(text) || [])[1] || "").trim();
    [["Họ tên", get("FN")], ["Điện thoại", get("TEL")], ["Email", get("EMAIL")], ["Công ty", get("ORG")], ["Website", get("URL")]].forEach((r) => r[1] && rows.push(r));
  } else if (/^mailto:/i.test(text)) { kind = "Email"; rows.push(["Gửi tới", decodeURIComponent(text.slice(7).split("?")[0])]); }
  else if (/^tel:/i.test(text)) { kind = "Số điện thoại"; rows.push(["Số", text.slice(4)]); actions.push(["Gọi", () => { location.href = text; }]); }
  else if (/^smsto:/i.test(text)) { kind = "Tin nhắn SMS"; const [, num, ...b] = text.split(":"); rows.push(["Số", num], ["Nội dung", b.join(":")]); }
  return { kind, rows, actions };
}

interactiveTool({
  mount(el, ctx) {
    const video = h("video", { playsinline: true, muted: true, "aria-label": "Hình camera" });
    const ph = h("div", { class: "placeholder" },
      h("span", { html: icon("scan-qr-code"), style: { display: "contents" } }),
      h("p", { text: "Bật camera và đưa mã QR vào khung, hoặc chọn ảnh có mã." }),
      h("button", { class: "btn", type: "button", onclick: () => start() }, h("span", { html: icon("camera"), style: { display: "contents" } }), "Bật camera"));
    const frame = h("div", { class: "scan-frame", hidden: true });
    const cam = h("div", { class: "cam" }, video, frame, ph);
    const stopBtn = h("button", { class: "btn ghost sm", type: "button", hidden: true, onclick: stop }, h("span", { html: icon("camera-off"), style: { display: "contents" } }), "Tắt camera");
    const switchBtn = h("button", { class: "btn ghost sm", type: "button", hidden: true, onclick: switchCam }, h("span", { html: icon("switch-camera"), style: { display: "contents" } }), "Đổi camera");
    const torchBtn = h("button", { class: "btn ghost sm", type: "button", hidden: true, onclick: torch }, h("span", { html: icon("flashlight"), style: { display: "contents" } }), "Đèn");
    const status = h("p", { class: "status", role: "status" });
    const results = h("div", { class: "scan-results", "aria-live": "polite" });
    const inp = intake({ accept: ["image", "pdf", "heic"], multiple: true, onFiles: scanFiles, label: "Thả ảnh hoặc PDF có mã QR" });
    el.append(h("div", { class: "scan" },
      h("div", null, cam, h("div", { class: "row", style: { marginTop: "10px" } }, stopBtn, switchBtn, torchBtn)),
      h("div", { class: "scan-side" },
        h("div", { class: "row" },
          h("button", { class: "btn ghost", type: "button", onclick: () => inp.pick() }, h("span", { html: icon("image"), style: { display: "contents" } }), "Chọn ảnh / PDF"),
          h("button", { class: "btn ghost", type: "button", onclick: trySample }, h("span", { html: icon("sparkles"), style: { display: "contents" } }), "Thử ảnh mẫu")),
        h("p", { class: "hint", text: "Có thể kéo thả, hoặc dán (Ctrl/⌘ + V) ảnh chụp màn hình chứa mã." }),
        status, results)));

    let stream = null, timer = 0, devices = [], devIdx = -1, paused = false, torchOn = false;
    const seen = new Set();
    async function start(deviceId) {
      stop();
      ph.hidden = true;
      status.textContent = "Đang bật camera…";
      try {
        stream = await ctx.camera(video, { facing: "environment", deviceId });
        frame.hidden = false; stopBtn.hidden = false;
        devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        switchBtn.hidden = devices.length < 2;
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        torchBtn.hidden = !caps.torch;
        status.textContent = "Đưa mã QR vào giữa khung…";
        paused = false;
        loop();
      } catch (e) {
        ph.hidden = false;
        status.textContent = e.userMsg || e.message;
        status.className = "status err";
      }
    }
    function stop() {
      clearTimeout(timer);
      ctx.stopStream(stream); stream = null;
      video.srcObject = null;
      frame.hidden = true; stopBtn.hidden = true; switchBtn.hidden = true; torchBtn.hidden = true; ph.hidden = false;
      status.className = "status";
    }
    function switchCam() {
      if (devices.length < 2) return;
      const cur = stream && stream.getVideoTracks()[0].getSettings().deviceId;
      devIdx = (devices.findIndex((d) => d.deviceId === cur) + 1) % devices.length;
      start(devices[devIdx].deviceId);
    }
    async function torch() {
      const t = stream && stream.getVideoTracks()[0];
      if (!t) return;
      torchOn = !torchOn;
      try { await t.applyConstraints({ advanced: [{ torch: torchOn }] }); } catch (_) { toast("Không bật được đèn"); }
    }
    async function loop() {
      if (!stream) return;
      if (!paused && video.readyState >= 2 && video.videoWidth) {
        const k = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        try {
          const found = await decode(video, Math.round(video.videoWidth * k), Math.round(video.videoHeight * k), false);
          if (found.length) {
            if (navigator.vibrate) navigator.vibrate(80);
            ctx.beep({ times: 1, ms: 90, freq: 1200, volume: 0.15 });
            for (const r of found) await show(r, "camera");
            paused = true;
            status.textContent = "Đã đọc được mã. ";
            status.append(h("button", { class: "linkish", type: "button", text: "Quét tiếp", onclick: () => { paused = false; status.textContent = "Đưa mã QR vào giữa khung…"; } }));
          }
        } catch (e) { console.warn(e); }
      }
      timer = setTimeout(loop, 160);
    }
    async function scanFiles(files) {
      for (const f of files) {
        status.className = "status";
        status.textContent = "Đang đọc " + f.name + "…";
        try {
          const kinds = await fileKinds(f);
          let found = [];
          if (kinds.includes("pdf")) {
            const { openPdf, renderPage } = await import("../pdf.js");
            const r = await openPdf(f);
            for (let p = 1; p <= Math.min(r.pages, 30); p++) {
              const c = await renderPage(r.doc, p, { scale: 2, maxPixels: 6e6 });
              const g = c.getContext("2d", { willReadFrequently: true });
              const res = await decode(g.getImageData(0, 0, c.width, c.height), 0, 0, true);
              res.forEach((x) => { x.where = "trang " + p; });
              found.push(...res);
            }
            r.doc.destroy();
          } else {
            let blob = f;
            if (kinds.includes("heic")) { const { heicTo } = await lib("heic"); blob = await heicTo({ blob: f, type: "image/png" }); }
            found = await decode(blob, 0, 0, true);
          }
          if (!found.length) { status.textContent = "Không tìm thấy mã nào trong " + f.name + ". Thử ảnh rõ hơn hoặc cắt sát vào mã."; status.className = "status err"; continue; }
          for (const r of found) await show(r, f.name + (r.where ? " · " + r.where : ""));
          status.textContent = `Đọc được ${found.length} mã từ ${f.name}.`;
          status.className = "status ok";
        } catch (e) { console.error(e); status.textContent = e.userMsg || "Không đọc được " + f.name + "."; status.className = "status err"; }
      }
    }
    async function trySample() {
      const r = await fetch(ROOT + "samples/ma-qr-mau.png");
      scanFiles([new File([await r.blob()], "ma-qr-mau.png", { type: "image/png" })]);
    }
    async function show(r, from) {
      const key = r.text + "|" + from;
      if (seen.has(key) && from === "camera") { /* đã có */ }
      seen.add(key);
      const d = await describe(r.text);
      const card = h("article", { class: "scan-card" },
        h("div", { class: "row" }, h("b", { text: d.kind }), h("span", { class: "chip", style: { minHeight: "26px", padding: "2px 10px", fontSize: "12.5px" }, text: fmtName(r.format) }), h("small", { class: "muted", text: from === "camera" ? "từ camera" : from })),
        d.rows.length ? h("dl", { class: "kv" }, d.rows.map(([k, v]) => [h("dt", { text: k }), h("dd", { text: v, style: { textAlign: "left", wordBreak: "break-word" } })])) : null,
        h("pre", { class: "scan-text", text: r.text }),
        h("div", { class: "row" },
          h("button", { class: "btn sm", type: "button", onclick: () => copyText(r.text) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép"),
          d.actions.map(([l, fn]) => h("button", { class: "btn ghost sm", type: "button", onclick: fn, text: l }))));
      results.prepend(card);
    }
    takeHandoff().then((fs) => fs.length && scanFiles(fs));
    document.addEventListener("visibilitychange", () => { if (document.hidden && stream) stop(); });
  }
});

const css = document.createElement("style");
css.textContent = `.scan{display:grid;gap:18px}@media(min-width:900px){.scan{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}
.cam .placeholder .i{width:42px;height:42px}.cam .placeholder p{margin:0;max-width:280px;opacity:.85}
.scan-frame{position:absolute;inset:18% 22%;border-radius:18px;box-shadow:0 0 0 9999px rgba(0,0,0,.35);border:3px solid rgba(255,255,255,.9)}
@media(max-width:600px){.scan-frame{inset:20% 12%}}
.scan-side{display:flex;flex-direction:column;gap:10px;min-width:0}.scan-results{display:flex;flex-direction:column;gap:10px}
.scan-card{border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px;background:var(--surface);animation:toast-in .2s}
.scan-text{margin:0;padding:10px 12px;background:var(--surface-2);border-radius:10px;white-space:pre-wrap;word-break:break-all;font:13.5px/1.5 var(--mono);max-height:220px;overflow:auto}`;
document.head.append(css);
