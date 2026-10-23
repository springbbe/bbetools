/* Tự sinh bởi scripts/build.js từ assets/lib/page-ranges.js và i18n/en/js/ — đừng sửa tay. */
/* Khoảng trang dạng "1-3, 5, 8-" dùng cho các công cụ PDF (tách, xoá, trích trang, PDF sang ảnh…).
   Hàm thuần, không phụ thuộc trình duyệt: có test ở tests/page-ranges.test.js */

/** "1-3, 5, 8-" → { pages: [1,2,3,5,8,…max] (tăng dần, không trùng), groups: [[1,2,3],[5],[8…max]], bad }
    "-4" = từ 1 đến 4, "8-" = từ 8 đến hết. Khoảng ngược "5-2" tự đảo lại. Phần vượt quá số trang bị cắt và đặt bad = true. */
export function parseRanges(str, max) {
  const groups = [];
  let bad = false;
  String(str || "").replace(/\s*([-–—])\s*/g, "$1").split(/[,;\s]+/).filter(Boolean).forEach((part) => {
    const m = /^(\d*)[-–—](\d*)$/.exec(part);
    let a, b;
    if (m && (m[1] || m[2])) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : max; }
    else if (/^\d+$/.test(part)) a = b = +part;
    else { bad = true; return; }
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > max) { bad = true; a = Math.max(1, a); b = Math.min(max, b); if (a > b) return; }
    const g = [];
    for (let i = a; i <= b; i++) g.push(i);
    groups.push(g);
  });
  const pages = [...new Set(groups.flat())].sort((x, y) => x - y);
  return { pages, groups, bad };
}

/** [1,2,3,5,8,9] → "1-3, 5, 8-9" */
export function toRanges(nums) {
  const s = [...new Set(nums)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i ? s[i] + "-" + s[j] : String(s[i]));
    i = j;
  }
  return out.join(", ");
}

/** Chia n trang thành các nhóm k trang liên tiếp: (7, 3) → [[1,2,3],[4,5,6],[7]] */
export function chunkPages(n, k) {
  k = Math.max(1, Math.floor(k) || 1);
  const out = [];
  for (let i = 1; i <= n; i += k) {
    const g = [];
    for (let j = i; j < i + k && j <= n; j++) g.push(j);
    out.push(g);
  }
  return out;
}

/** Gợi ý ban đầu cho ô khoảng trang: chia đôi file. 8 → "1-4, 5-8"; 1 → "1" */
export function halves(n) {
  if (n <= 1) return "1";
  const half = Math.ceil(n / 2);
  return (half > 1 ? "1-" + half : "1") + ", " + (half + 1 < n ? half + 1 + "-" + n : String(n));
}

/** Phần tên file cho một nhóm trang: [1,2,3,7] → "1-3_7" */
export const rangeSlug = (nums) => toRanges(nums).replace(/, /g, "_");

/** Kế hoạch chèn trang trắng vào file n trang → mảng số trang gốc theo thứ tự mới, 0 = trang trắng.
    o: { mode: "after" | "before" | "each" | "end" | "even", pages: [số trang] (cho after/before), count: số trang trắng mỗi chỗ } */
export function blankPlan(n, o) {
  const count = Math.max(1, Math.min(50, Math.floor(o.count) || 1));
  const at = new Set(o.pages || []), out = [];
  const blanks = () => { for (let k = 0; k < count; k++) out.push(0); };
  for (let i = 1; i <= n; i++) {
    if (o.mode === "before" && at.has(i)) blanks();
    out.push(i);
    if ((o.mode === "after" && at.has(i)) || o.mode === "each") blanks();
  }
  if (o.mode === "end") blanks();
  if (o.mode === "even" && out.length % 2) out.push(0);
  return out;
}
