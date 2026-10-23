/* Tự sinh bởi scripts/build.js từ assets/lib/ngay.js và i18n/en/js/ — đừng sửa tay. */
/* Tính ngày: khoảng cách năm/tháng/ngày, cộng trừ ngày, ngày làm việc trừ cuối tuần và lễ Tết (data/ngay-le.json).
   Ngày biểu diễn bằng { y, m, d } hoặc chuỗi "YYYY-MM-DD"; tính bằng số ngày UTC để không lệch múi giờ. */
import { lunarToSolar } from "./am-lich.js";

export const DAY = 864e5;
export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const t = Date.UTC(y, mo - 1, d);
  const x = new Date(t);
  return x.getUTCFullYear() === y && x.getUTCMonth() === mo - 1 && x.getUTCDate() === d ? { y, m: mo, d } : null;
}
export const toDays = (p) => Math.round(Date.UTC(p.y, p.m - 1, p.d) / DAY);
export function fromDays(n) { const x = new Date(n * DAY); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; }
export const iso = (p) => `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
export const dmy = (p) => `${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}/${p.y}`;
export const weekday = (p) => new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); // 0 = Chủ nhật
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export function today() { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }

/** Khoảng cách a → b theo năm, tháng, ngày (a ≤ b). Ngày cuối tháng được xử lý như cách tính tuổi thông thường. */
export function diffYMD(a, b) {
  let sign = 1;
  if (toDays(b) < toDays(a)) { [a, b] = [b, a]; sign = -1; }
  // số tháng tròn lớn nhất sao cho a + tháng ≤ b (31/1 + 1 tháng = 29/2), phần còn lại là ngày
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (toDays(addMonths(a, months)) > toDays(b)) months--;
  const days = toDays(b) - toDays(addMonths(a, months));
  return { years: Math.floor(months / 12), months: months % 12, days, sign, totalMonths: months };
}

/** Cộng tháng (giữ ngày, kẹp về cuối tháng nếu tháng đích ngắn hơn) */
export function addMonths(p, n) {
  const t = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(t / 12), m = (t % 12 + 12) % 12 + 1;
  return { y, m, d: Math.min(p.d, daysInMonth(y, m)) };
}
export const addDays = (p, n) => fromDays(toDays(p) + n);

const fromLunar = (s) => ({ y: s.year, m: s.month, d: s.day });

/** Ngày nghỉ lễ (theo luật) trong một năm dương lịch → Map(số ngày → tên). data: data/ngay-le.json; o.compensate: nghỉ bù khi lễ trùng ngày nghỉ hằng tuần */
export function holidaysOfYear(year, data, o = {}) {
  const map = new Map();
  const add = (p, name) => { if (p && p.y === year) map.set(toDays(p), name); };
  for (const h of data.solar) {
    if (h.from && year < h.from) continue;
    const [d, m] = h.date.split("/").map(Number);
    add({ y: year, m, d }, h.name);
  }
  // lễ âm lịch: xét cả năm âm hiện tại và năm trước (Tết có thể rơi vào tháng 1–2 dương lịch)
  for (const ly of [year - 1, year]) {
    for (const h of data.lunar) {
      const [d, m] = h.date.split("/");
      if (d === "last") {
        const tet = lunarToSolar(1, 1, ly + 1);
        if (tet) add(addDays(fromLunar(tet), -1), h.name);
      } else {
        const s = lunarToSolar(+d, +m, ly, false);
        if (s) add(fromLunar(s), h.name);
      }
    }
  }
  if (o.compensate && o.weekend) {
    const extra = [];
    const sorted = [...map.keys()].sort((a, b) => a - b);
    for (const k of sorted) {
      if (!o.weekend.includes(weekday(fromDays(k)))) continue;
      let n = k + 1;
      while (map.has(n) || o.weekend.includes(weekday(fromDays(n))) || extra.some((e) => e[0] === n)) n++;
      extra.push([n, "Day off in lieu: " + map.get(k)]);
    }
    for (const [n, name] of extra) if (fromDays(n).y === year) map.set(n, name);
  }
  return map;
}

/** Đếm ngày làm việc trong [a, b] (tính cả hai đầu). o: { weekend: [0, 6], holidays: data ngay-le | null, compensate } → { work, weekend, holiday, list } */
export function countWorkdays(a, b, o = {}) {
  let s = toDays(a), e = toDays(b);
  if (e < s) [s, e] = [e, s];
  const weekend = o.weekend || [0, 6];
  const cache = new Map();
  const hol = (y) => { if (!cache.has(y)) cache.set(y, o.holidays ? holidaysOfYear(y, o.holidays, { compensate: o.compensate, weekend }) : new Map()); return cache.get(y); };
  let work = 0, we = 0, hd = 0;
  const list = [];
  for (let n = s; n <= e; n++) {
    const p = fromDays(n);
    if (weekend.includes(weekday(p))) { we++; continue; }
    const name = hol(p.y).get(n);
    if (name) { hd++; list.push({ date: p, name }); continue; }
    work++;
  }
  return { work, weekend: we, holiday: hd, list };
}

/** Cộng n ngày làm việc (n có thể âm); ngày bắt đầu không tính */
export function addWorkdays(a, n, o = {}) {
  const weekend = o.weekend || [0, 6];
  const cache = new Map();
  const isOff = (k) => {
    const p = fromDays(k);
    if (weekend.includes(weekday(p))) return true;
    if (!o.holidays) return false;
    if (!cache.has(p.y)) cache.set(p.y, holidaysOfYear(p.y, o.holidays, { compensate: o.compensate, weekend }));
    return cache.get(p.y).has(k);
  };
  let k = toDays(a), left = Math.abs(n);
  const step = n < 0 ? -1 : 1;
  while (left > 0) { k += step; if (!isOff(k)) left--; }
  return fromDays(k);
}
