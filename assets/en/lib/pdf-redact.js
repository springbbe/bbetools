/* Tự sinh bởi scripts/build.js từ assets/lib/pdf-redact.js và i18n/en/js/ — đừng sửa tay. */
/* Che thông tin trong PDF: mẫu tìm nhanh (dãy số, email), khung bao chữ của một đoạn trong mảnh chữ pdf.js,
   gộp khung trên cùng dòng. Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/pdf-redact.test.js */

/** Mẫu tìm nhanh. Dãy 9–12 chữ số cho phép cách nhau bằng dấu cách, dấu chấm, gạch ngang (0912 345 678, 0987.654.321) */
export const PATTERNS = {
  number: { label: "9–12 digit numbers", hint: "ID numbers, phone numbers, account numbers", re: /(?<![\p{L}\p{N}]|\p{Nd}[ .\-])\p{Nd}(?:[ .\-]?\p{Nd}){8,11}(?![\p{L}\p{N}]|[ .\-]\p{Nd})/gu },
  longnum: { label: "13–19 digit numbers", hint: "card numbers, long account numbers", re: /(?<![\p{L}\p{N}]|\p{Nd}[ .\-])\p{Nd}(?:[ .\-]?\p{Nd}){12,18}(?![\p{L}\p{N}]|[ .\-]\p{Nd})/gu },
  email: { label: "Email", hint: "", re: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu }
};

const mul = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/**
 * Khung bao các ký tự [start, end) của một mảnh chữ pdf.js (item: { str, transform, width, height }),
 * theo toạ độ của viewport (vt = viewport.transform: toạ độ PDF → toạ độ nhìn thấy, gốc trên trái).
 * Vị trí ký tự trong mảnh: measure(chuỗi) → độ rộng tương đối (đo bằng font gần giống); không có thì chia đều theo số ký tự.
 * Chiều cao lấy dư cho dấu tiếng Việt (từ −0,3 tới 1,15 cỡ chữ).
 * → { x, y, w, h }
 */
export function textRect(item, start, end, vt, measure = null, pad = 0.12) {
  const [a, b, c, d, e, f] = item.transform;
  const len = Math.max(1, item.str.length);
  const ul = Math.hypot(a, b) || 1, size = Math.hypot(c, d) || item.height || 10;
  const ux = a / ul, uy = b / ul;
  // pháp tuyến "lên" của dòng chữ: vuông góc với hướng chữ, cùng phía với (c, d)
  let nx = -uy, ny = ux;
  if (nx * c + ny * d < 0) { nx = -nx; ny = -ny; }
  const W = item.width || ul * len * 0.5;
  const all = measure ? measure(item.str) : 0;
  const at = (k) => (all > 0 ? (W * measure(item.str.slice(0, k))) / all : (W * k) / len);
  const t0 = at(start) - pad * size, t1 = at(end) + pad * size, v0 = -0.3 * size, v1 = 1.15 * size;
  const pts = [[t0, v0], [t1, v0], [t1, v1], [t0, v1]].map(([t, v]) => mul(vt, e + ux * t + nx * v, f + uy * t + ny * v));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Gộp các khung nằm trên cùng một dòng (chồng nhau theo chiều dọc ≥ 50%) thành một khung → mảng khung */
export function mergeLine(rects) {
  const out = [];
  for (const r of rects) {
    const m = out.find((o) => {
      const ov = Math.min(o.y + o.h, r.y + r.h) - Math.max(o.y, r.y);
      return ov >= 0.5 * Math.min(o.h, r.h) && r.x <= o.x + o.w + o.h && o.x <= r.x + r.w + r.h;
    });
    if (!m) { out.push({ ...r }); continue; }
    const x = Math.min(m.x, r.x), y = Math.min(m.y, r.y);
    m.w = Math.max(m.x + m.w, r.x + r.w) - x; m.h = Math.max(m.y + m.h, r.y + r.h) - y; m.x = x; m.y = y;
  }
  return out;
}

/** Khung (đơn vị viewport) → phần của trang (0..1), cắt cho nằm trong trang */
export function toShare(r, VW, VH) {
  const x0 = Math.max(0, r.x / VW), y0 = Math.max(0, r.y / VH), x1 = Math.min(1, (r.x + r.w) / VW), y1 = Math.min(1, (r.y + r.h) / VH);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/** Hai khung (phần của trang) gần như trùng nhau – để không thêm trùng khi tìm nhiều lần */
export const sameBox = (a, b, eps = 0.002) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps && Math.abs(a.w - b.w) < eps && Math.abs(a.h - b.h) < eps;
