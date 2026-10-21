/* Tách người khỏi nền bằng MODNet (Apache-2.0) chạy trên onnxruntime-web (WebAssembly), hoàn toàn trên máy. */
import { lib, ROOT } from "../core.js";

let session = null, faceSession = null;
export async function loadMatting(onProgress) {
  if (session) return session;
  session = (async () => {
    const ort = await lib("ort");
    const url = ROOT + "models/modnet/model_quantized.onnx";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Không tải được mô hình AI");
    const total = +res.headers.get("content-length") || 6632188;
    const reader = res.body.getReader();
    const chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (onProgress) onProgress(Math.min(1, got / total));
    }
    const buf = new Uint8Array(got); let o = 0;
    for (const c of chunks) { buf.set(c, o); o += c.length; }
    return ort.InferenceSession.create(buf, { executionProviders: ["wasm"], graphOptimizationLevel: "all", logSeverityLevel: 3 });
  })().catch((e) => { session = null; const err = new Error("Không tải được mô hình AI tách nền. Hãy kiểm tra kết nối mạng rồi thử lại."); err.userMsg = err.message; console.error(e); throw err; });
  return session;
}

/** Trả về canvas mặt nạ (kênh alpha = người) cùng kích thước với ảnh nguồn */
export async function matte(src) {
  const ort = await lib("ort");
  const s = await loadMatting();
  const W = src.width, H = src.height;
  const k = 512 / Math.min(W, H);
  let w = Math.max(32, Math.round((W * k) / 32) * 32), hh = Math.max(32, Math.round((H * k) / 32) * 32);
  // giới hạn để không quá nặng với ảnh rất dài
  const lim = 1024; if (w > lim) { hh = Math.round((hh * lim) / w / 32) * 32; w = lim; } if (hh > lim) { w = Math.round((w * lim) / hh / 32) * 32; hh = lim; }
  const c = document.createElement("canvas"); c.width = w; c.height = hh;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingQuality = "high";
  g.drawImage(src, 0, 0, w, hh);
  const px = g.getImageData(0, 0, w, hh).data;
  const n = w * hh, data = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    data[i] = px[i * 4] / 127.5 - 1;
    data[n + i] = px[i * 4 + 1] / 127.5 - 1;
    data[2 * n + i] = px[i * 4 + 2] / 127.5 - 1;
  }
  const feeds = { [s.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, hh, w]) };
  const out = await s.run(feeds);
  const a = out[s.outputNames[0]].data;
  const m = g.createImageData(w, hh);
  for (let i = 0; i < n; i++) { m.data[i * 4] = m.data[i * 4 + 1] = m.data[i * 4 + 2] = 255; m.data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round(a[i] * 255))); }
  g.putImageData(m, 0, 0);
  const full = document.createElement("canvas"); full.width = W; full.height = H;
  const fg = full.getContext("2d");
  fg.imageSmoothingQuality = "high";
  fg.drawImage(c, 0, 0, W, H);
  return full;
}

/** Ghép người lên nền màu: trả về canvas */
export function composite(src, mask, bg) {
  const W = src.width, H = src.height;
  const person = document.createElement("canvas"); person.width = W; person.height = H;
  const pg = person.getContext("2d");
  pg.drawImage(src, 0, 0, W, H);
  pg.globalCompositeOperation = "destination-in";
  pg.drawImage(mask, 0, 0);
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const g = out.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  g.drawImage(person, 0, 0);
  return out;
}

/** Ước lượng vị trí đầu từ mặt nạ: { top, bottom (cằm/cổ), cx, width } theo toạ độ ảnh, hoặc null */
export function headBox(mask) {
  const W = mask.width, H = mask.height;
  const k = Math.min(1, 300 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * k)), hh = Math.max(1, Math.round(H * k));
  const c = document.createElement("canvas"); c.width = w; c.height = hh;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(mask, 0, 0, w, hh);
  const d = g.getImageData(0, 0, w, hh).data;
  const on = (x, y) => d[(y * w + x) * 4 + 3] > 128;
  const rows = [];
  let top = -1;
  for (let y = 0; y < hh; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) if (on(x, y)) { if (l < 0) l = x; r = x; }
    rows.push(l < 0 ? null : [l, r]);
    if (top < 0 && l >= 0 && r - l > w * 0.03) top = y;
  }
  if (top < 0) return null;
  // độ rộng đầu lớn nhất trước khi tới vai (vai rộng gấp ~1,6 lần đầu)
  let headW = 0, headCx = w / 2, neck = -1, minW = Infinity;
  for (let y = top; y < hh; y++) {
    const r = rows[y]; if (!r) continue;
    const width = r[1] - r[0];
    if (y - top < 4 || width <= headW * 1.12) { if (width > headW) { headW = width; headCx = (r[0] + r[1]) / 2; } }
    if (headW && y - top > headW * 0.8) {
      if (width < minW) { minW = width; neck = y; }
      if (width > headW * 1.6) break;
    }
    if (y - top > headW * 2.2 && headW) break;
  }
  if (!headW) return null;
  if (neck < 0) neck = Math.min(hh - 1, top + headW * 1.35);
  return { top: top / k, bottom: neck / k, cx: headCx / k, width: headW / k };
}

/* ---------- Nhận diện khuôn mặt (UltraFace, MIT, ~1 MB) ---------- */
async function loadFace() {
  if (!faceSession) faceSession = (async () => {
    const ort = await lib("ort");
    const buf = new Uint8Array(await (await fetch(ROOT + "models/ultraface/version-RFB-320.onnx")).arrayBuffer());
    return ort.InferenceSession.create(buf, { executionProviders: ["wasm"], logSeverityLevel: 3 });
  })().catch((e) => { faceSession = null; throw e; });
  return faceSession;
}
const iou = (a, b) => {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter);
};
/** Các khuôn mặt trong ảnh: [{ x1, y1, x2, y2, score }] theo toạ độ ảnh, mặt lớn nhất trước */
export async function detectFaces(src) {
  const ort = await lib("ort");
  const s = await loadFace();
  const W = 320, H = 240;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data, n = W * H, data = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { data[i] = (px[i * 4] - 127) / 128; data[n + i] = (px[i * 4 + 1] - 127) / 128; data[2 * n + i] = (px[i * 4 + 2] - 127) / 128; }
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", data, [1, 3, H, W]) });
  const names = s.outputNames;
  const scores = out[names.find((x) => /score/i.test(x)) || names[0]].data, boxes = out[names.find((x) => /box/i.test(x)) || names[1]].data;
  const cand = [];
  for (let i = 0; i < scores.length / 2; i++) if (scores[i * 2 + 1] > 0.7) cand.push([boxes[i * 4], boxes[i * 4 + 1], boxes[i * 4 + 2], boxes[i * 4 + 3], scores[i * 2 + 1]]);
  cand.sort((a, b) => b[4] - a[4]);
  const keep = [];
  for (const b of cand) if (keep.every((k) => iou(k, b) < 0.3)) keep.push(b);
  return keep.map((b) => ({ x1: b[0] * src.width, y1: b[1] * src.height, x2: b[2] * src.width, y2: b[3] * src.height, score: b[4] }))
    .sort((a, b) => (b.x2 - b.x1) * (b.y2 - b.y1) - (a.x2 - a.x1) * (a.y2 - a.y1));
}

/** Đỉnh đầu (theo mặt nạ, trong cột của khuôn mặt) và cằm (đáy khung mặt) → { top, bottom, cx, width } */
export function headFromFace(face, mask) {
  const fw = face.x2 - face.x1;
  let top = Math.max(0, face.y1 - fw * 0.6);
  if (mask) {
    const k = Math.min(1, 400 / Math.max(mask.width, mask.height));
    const w = Math.round(mask.width * k), hh = Math.round(mask.height * k);
    const c = document.createElement("canvas"); c.width = w; c.height = hh;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(mask, 0, 0, w, hh);
    const d = g.getImageData(0, 0, w, hh).data;
    const x1 = Math.max(0, Math.round((face.x1 + fw * 0.2) * k)), x2 = Math.min(w - 1, Math.round((face.x2 - fw * 0.2) * k));
    outer: for (let y = 0; y < Math.round(face.y1 * k); y++) for (let x = x1; x <= x2; x++) if (d[(y * w + x) * 4 + 3] > 128) { top = y / k; break outer; }
  }
  return { top, bottom: face.y2, cx: (face.x1 + face.x2) / 2, width: fw };
}
