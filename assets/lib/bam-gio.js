/* Thời lượng (hàm thuần) cho Bấm giờ, Hẹn giờ: định dạng mm:ss.cc, đọc thời lượng người dùng gõ, thống kê vòng. */

const pad = (n, w = 2) => String(n).padStart(w, "0");

/** Định dạng ms: "05:07.42", "1:05:07.42"; cs = false thì bỏ phần trăm giây; up = true làm tròn lên (đếm ngược) */
export function fmtClock(ms, { cs = true, up = false, hours = false } = {}) {
  ms = Math.max(0, ms);
  if (!cs) {
    const s = up ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h || hours ? h + ":" + pad(m) : pad(m)) + ":" + pad(x);
  }
  const t = Math.floor(ms / 10);
  const c = t % 100, s = Math.floor(t / 100) % 60, m = Math.floor(t / 6000) % 60, h = Math.floor(t / 360000);
  return (h || hours ? h + ":" + pad(m) : pad(m)) + ":" + pad(s) + "." + pad(c);
}

/** Đọc thời lượng: "90" (giây khi secs, ngược lại phút), "5:30", "1:02:03", "1h20m", "1 giờ 20 phút", "45s", "2,5 phút" → ms (null nếu không đọc được) */
export function parseDuration(text, { bare = "min" } = {}) {
  const s = String(text || "").trim().toLowerCase().replace(",", ".");
  if (!s) return null;
  let m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (m) return m[3] != null ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 : (+m[1] * 60 + +m[2]) * 1000;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * (bare === "sec" ? 1000 : 60000));
  const re = /(\d+(?:\.\d+)?)\s*(giờ|tiếng|h|phút|ph|p|m|giây|s|g)(?=[\s\d,]|$)/gu;
  const U = { "giờ": 3600, "tiếng": 3600, h: 3600, "phút": 60, ph: 60, p: 60, m: 60, "giây": 1, s: 1, g: 1 };
  let total = 0, any = false, rest = s;
  for (const x of s.matchAll(re)) { total += parseFloat(x[1]) * U[x[2]]; any = true; rest = rest.replace(x[0], ""); }
  if (!any || rest.replace(/[\s,và]+/gu, "")) return null;
  return Math.round(total * 1000);
}

/** Thời lượng bằng chữ: "1 giờ 5 phút", "45 giây" */
export function durationText(ms) {
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return [h && h + " giờ", m && m + " phút", (x || (!h && !m)) && x + " giây"].filter(Boolean).join(" ");
}

/** Vòng bấm giờ: laps = [mốc ms tính từ lúc bắt đầu] → [{ n, split, lap, best, worst }] (vòng mới nhất trước) */
export function lapRows(laps) {
  const rows = laps.map((t, i) => ({ n: i + 1, split: t, lap: t - (i ? laps[i - 1] : 0) }));
  if (rows.length >= 2) {
    const min = Math.min(...rows.map((r) => r.lap)), max = Math.max(...rows.map((r) => r.lap));
    if (min !== max) for (const r of rows) { r.best = r.lap === min; r.worst = r.lap === max; }
  }
  return rows.reverse();
}
