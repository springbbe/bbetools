/* Timestamp (hàm thuần): đọc Unix timestamp (giây, mili giây, micro giây, nano giây) hoặc chuỗi ngày giờ,
   định dạng theo múi giờ cố định (Việt Nam UTC+7, UTC) và mô tả khoảng cách "3 ngày trước". */

const pad = (n, w = 2) => String(n).padStart(w, "0");
export const DOW = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Đọc đầu vào → { ms, unit } hoặc { error }. offsetMin: múi giờ dùng khi chuỗi ngày không ghi múi (mặc định UTC+7) */
export function parseInput(input, offsetMin = 420) {
  const s = String(input ?? "").trim();
  if (!s) return { error: "Chưa nhập timestamp hoặc ngày giờ." };
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s), digits = s.replace(/^-/, "").split(".")[0].length;
    if (digits <= 11) return { ms: Math.round(n * 1000), unit: "s" };
    if (digits <= 14) return { ms: Math.round(n), unit: "ms" };
    if (digits <= 17) return { ms: Math.round(n / 1000), unit: "us" };
    return { ms: Number(BigInt(s.split(".")[0]) / 1000000n), unit: "ns" };
  }
  // dd/mm/yyyy [hh:mm[:ss]]
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    const [, d, mo, y, h = 0, mi = 0, se = 0] = m.map((x) => (x == null ? x : +x));
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || se > 59) return { error: "Ngày giờ không hợp lệ." };
    return { ms: Date.UTC(y, mo - 1, d, h, mi, se) - offsetMin * 60000, unit: "date" };
  }
  // yyyy-mm-dd[ hh:mm[:ss[.sss]]] không ghi múi giờ → theo múi đã chọn
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(s);
  if (m) {
    const [, y, mo, d, h = 0, mi = 0, se = 0, frac = "0"] = m;
    return { ms: Date.UTC(+y, mo - 1, +d, +h, +mi, +se, +frac.padEnd(3, "0")) - offsetMin * 60000, unit: "date" };
  }
  const t = Date.parse(s);
  if (Number.isFinite(t)) return { ms: t, unit: "date" };
  return { error: "Không đọc được. Nhập số (vd. 1767225600) hoặc ngày giờ (vd. 21/10/2026 14:30, 2026-10-21T07:30:00Z)." };
}

/** Các phần ngày giờ ở múi offsetMin */
export function partsAt(ms, offsetMin) {
  const d = new Date(ms + offsetMin * 60000);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), ms: d.getUTCMilliseconds(), dow: d.getUTCDay() };
}
export const offsetText = (offsetMin) => (offsetMin >= 0 ? "+" : "−") + pad(Math.floor(Math.abs(offsetMin) / 60)) + ":" + pad(Math.abs(offsetMin) % 60);

/** "Thứ Tư, 21/10/2026 14:30:00" */
export function formatVN(ms, offsetMin = 420, withMs = false) {
  const p = partsAt(ms, offsetMin);
  return `${DOW[p.dow]}, ${pad(p.d)}/${pad(p.mo)}/${p.y} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}${withMs && p.ms ? "." + pad(p.ms, 3) : ""}`;
}
/** ISO 8601 có múi giờ: 2026-10-21T14:30:00+07:00 */
export function isoAt(ms, offsetMin = 0) {
  const p = partsAt(ms, offsetMin);
  const frac = p.ms ? "." + pad(p.ms, 3) : "";
  return `${pad(p.y, 4)}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}${frac}${offsetMin ? offsetText(offsetMin).replace("−", "-") : "Z"}`;
}

/** "3 ngày trước", "sau 2 giờ" */
export function relative(ms, now) {
  const diff = ms - now, a = Math.abs(diff) / 1000;
  if (a < 5) return "ngay bây giờ";
  const units = [[31536000, "năm"], [2592000, "tháng"], [604800, "tuần"], [86400, "ngày"], [3600, "giờ"], [60, "phút"], [1, "giây"]];
  const [sec, name] = units.find(([u]) => a >= u);
  const n = Math.floor(a / sec);
  return diff < 0 ? `${n} ${name} trước` : `${n} ${name} nữa`;
}

/** Ngày thứ mấy trong năm, tuần ISO */
export function dayOfYear(ms, offsetMin) {
  const p = partsAt(ms, offsetMin);
  const doy = (Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(p.y, 0, 1)) / 86400000 + 1;
  const date = new Date(Date.UTC(p.y, p.mo - 1, p.d));
  const dn = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dn + 3);
  const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return { doy, week };
}
