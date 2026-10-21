/* Cron (hàm thuần): đọc biểu thức 5 trường (phút giờ ngày tháng thứ) hoặc 6 trường (thêm giây ở đầu),
   các bí danh @daily…, diễn giải bằng tiếng Việt và tính các lần chạy tiếp theo.
   Hỗ trợ * , - / tên tháng/thứ (JAN, MON), ? (như *), L (ngày cuối tháng), 5L (thứ Sáu cuối cùng), 1#2 (thứ Hai thứ 2 của tháng). */

const ALIASES = { "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *", "@weekly": "0 0 * * 0", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *" };
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const FIELDS = {
  second: { min: 0, max: 59, name: "giây" },
  minute: { min: 0, max: 59, name: "phút" },
  hour: { min: 0, max: 23, name: "giờ" },
  dom: { min: 1, max: 31, name: "ngày" },
  month: { min: 1, max: 12, name: "tháng", names: MONTHS },
  dow: { min: 0, max: 7, name: "thứ", names: DAYS }
};
export const DOW_VI = ["Chủ nhật", "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy"];

function err(msg) { const e = new Error(msg); e.cron = true; return e; }

function parseField(src, key) {
  const f = FIELDS[key];
  const out = { src, any: false, values: new Set(), last: false, lastDow: new Set(), nth: [] };
  if (src === "*" || src === "?") { out.any = true; for (let v = f.min; v <= f.max; v++) out.values.add(key === "dow" && v === 7 ? 0 : v); return out; }
  const val = (s) => {
    s = s.toLowerCase();
    if (f.names) { const i = f.names.indexOf(s); if (i >= 0) return key === "month" ? i + 1 : i; }
    if (!/^\d+$/.test(s)) throw err(`Trường ${f.name}: “${s}” không hợp lệ.`);
    const v = +s;
    if (v < f.min || v > f.max) throw err(`Trường ${f.name}: ${v} nằm ngoài khoảng ${f.min}–${f.max}.`);
    return v;
  };
  for (const part of src.split(",")) {
    if (!part) throw err(`Trường ${f.name}: thừa dấu phẩy.`);
    if (key === "dom" && /^l$/i.test(part)) { out.last = true; continue; }
    if (key === "dow" && /^\w+l$/i.test(part)) { out.lastDow.add(val(part.slice(0, -1)) % 7); continue; }
    if (key === "dow" && /^\w+#[1-5]$/.test(part)) { const [d, n] = part.split("#"); out.nth.push([val(d) % 7, +n]); continue; }
    const m = /^([^/]+?)(?:\/(\d+))?$/.exec(part);
    if (!m) throw err(`Trường ${f.name}: “${part}” không hợp lệ.`);
    let [, range, step] = m;
    step = step == null ? 1 : +step;
    if (!step) throw err(`Trường ${f.name}: bước nhảy phải lớn hơn 0.`);
    let a, b;
    if (range === "*" || range === "?") { a = f.min; b = key === "dow" ? 6 : f.max; }
    else if (range.includes("-")) { [a, b] = range.split("-").map(val); if (a > b) throw err(`Trường ${f.name}: khoảng ${range} bị ngược.`); }
    else { a = val(range); b = m[2] != null ? f.max : a; }
    for (let v = a; v <= b; v += step) out.values.add(key === "dow" && v === 7 ? 0 : v);
  }
  return out;
}

/** Đọc biểu thức → { fields: { second, minute, hour, dom, month, dow }, hasSeconds, expr } */
export function parseCron(expr) {
  let s = String(expr ?? "").trim().replace(/\s+/g, " ");
  if (!s) throw err("Chưa nhập biểu thức cron.");
  if (s.startsWith("@")) {
    if (s === "@reboot") throw err("@reboot chạy một lần khi máy khởi động, không có lịch cụ thể.");
    if (!ALIASES[s.toLowerCase()]) throw err(`Không biết bí danh ${s}. Dùng @yearly, @monthly, @weekly, @daily, @hourly.`);
    s = ALIASES[s.toLowerCase()];
  }
  let parts = s.split(" ");
  if (parts.length === 7) parts = parts.slice(0, 6); // Quartz có thêm năm: bỏ qua
  if (parts.length !== 5 && parts.length !== 6) throw err(`Cần 5 trường (phút giờ ngày tháng thứ) hoặc 6 trường (thêm giây ở đầu); đang có ${parts.length}.`);
  const hasSeconds = parts.length === 6;
  if (!hasSeconds) parts.unshift("0");
  const keys = ["second", "minute", "hour", "dom", "month", "dow"];
  const fields = Object.fromEntries(keys.map((k, i) => [k, parseField(parts[i], k)]));
  return { fields, hasSeconds, expr: s };
}

/* ---------- diễn giải ---------- */
const pad = (n) => String(n).padStart(2, "0");
const list = (arr) => (arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + " và " + arr[arr.length - 1]);
/** Nén dãy số liên tiếp: [1,2,3,5] → ["1–3", "5"] */
function ranges(vals, fmt = String) {
  const v = [...vals].sort((a, b) => a - b), out = [];
  for (let i = 0; i < v.length; i++) {
    let j = i;
    while (j + 1 < v.length && v[j + 1] === v[j] + 1) j++;
    if (j - i >= 2) out.push(fmt(v[i]) + "–" + fmt(v[j])); else for (let k = i; k <= j; k++) out.push(fmt(v[k]));
    i = j;
  }
  return out;
}
const stepOf = (src) => { const m = /^(\*|\d+)\/(\d+)$/.exec(src); return m ? { from: m[1] === "*" ? null : +m[1], step: +m[2] } : null; };

function describeTime(F) {
  const sec = F.second, min = F.minute, hr = F.hour;
  const single = (f) => !f.any && f.values.size === 1 && !f.src.includes("/");
  const one = (f) => [...f.values][0];
  let secTxt = "";
  if (!(single(sec) && one(sec) === 0)) {
    const st = stepOf(sec.src);
    secTxt = sec.any ? "mỗi giây" : st ? `mỗi ${st.step} giây${st.from ? ` (từ giây ${st.from})` : ""}` : `vào giây ${list(ranges(sec.values))}`;
  }
  if (single(min) && single(hr)) return (secTxt ? secTxt + ", " : "") + `lúc ${pad(one(hr))}:${pad(one(min))}` + (single(sec) && one(sec) ? `:${pad(one(sec))}` : "");
  if (single(min) && !hr.any && !hr.src.includes("/") && hr.values.size <= 6 && !secTxt) return "lúc " + list([...hr.values].sort((a, b) => a - b).map((h) => `${pad(h)}:${pad(one(min))}`));
  let minTxt;
  const st = stepOf(min.src);
  if (min.any) minTxt = secTxt ? "" : "mỗi phút";
  else if (st) minTxt = `mỗi ${st.step} phút${st.from ? ` (bắt đầu từ phút ${st.from})` : ""}`;
  else if (single(min)) minTxt = hr.any ? `vào phút ${one(min)} của mỗi giờ` : `vào phút ${one(min)}`;
  else minTxt = `vào phút ${list(ranges(min.values))}`;
  let hrTxt = "";
  if (!hr.any) {
    const sh = stepOf(hr.src);
    if (sh) hrTxt = `mỗi ${sh.step} giờ${sh.from ? ` (từ ${sh.from} giờ)` : ""}`;
    else if (/^\d+-\d+$/.test(hr.src)) { const [a, b] = hr.src.split("-").map(Number); hrTxt = `từ ${pad(a)}:00 đến ${pad(b)}:59`; }
    else hrTxt = `trong giờ ${list(ranges(hr.values, (h) => h + "h"))}`;
  }
  return [secTxt, minTxt, hrTxt].filter(Boolean).join(", ");
}

function describeDays(F) {
  const dom = F.dom, mon = F.month, dow = F.dow;
  const parts = [];
  const domAny = dom.any && !dom.last, dowAny = dow.any && !dow.lastDow.size && !dow.nth.length;
  const dowTxt = () => {
    const items = [];
    const v = [...dow.values];
    if (!dow.any && v.length) {
      if (v.length === 5 && [1, 2, 3, 4, 5].every((d) => v.includes(d))) items.push("từ thứ Hai đến thứ Sáu");
      else if (v.length === 2 && v.includes(0) && v.includes(6)) items.push("thứ Bảy và Chủ nhật");
      else items.push(...ranges(v.map((d) => (d === 0 ? 7 : d)), (d) => DOW_VI[d % 7]).map((x) => x.replace(/–/, " đến ")));
    }
    for (const d of dow.lastDow) items.push(`${DOW_VI[d]} cuối cùng của tháng`);
    for (const [d, n] of dow.nth) items.push(`${DOW_VI[d]} thứ ${n} của tháng`);
    return list(items);
  };
  const domTxt = () => {
    const items = [];
    const st = stepOf(dom.src);
    if (st) items.push(`mỗi ${st.step} ngày${st.from ? ` (từ ngày ${st.from})` : ""}`);
    else if (!dom.any && dom.values.size) items.push("ngày " + list(ranges(dom.values)));
    if (dom.last) items.push("ngày cuối tháng");
    return list(items);
  };
  if (!domAny && !dowAny) parts.push(`${domTxt()} hoặc ${dowTxt()}`);
  else if (!domAny) parts.push(domTxt());
  else if (!dowAny) parts.push(dowTxt());
  if (!mon.any) {
    const st = stepOf(mon.src);
    parts.push(st ? `mỗi ${st.step} tháng` : "tháng " + list(ranges(mon.values)));
  }
  return parts;
}

/** Câu tiếng Việt mô tả lịch */
export function describe(c) {
  const F = c.fields;
  const t = describeTime(F);
  const d = describeDays(F);
  let s = t;
  if (d.length) s += ", " + d.join(", ");
  else if (/^lúc /.test(t)) s += ", hằng ngày";
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

/* ---------- lần chạy tiếp theo ---------- */
const lastDayOf = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1–12

function dayMatches(F, y, m, d) {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const ld = lastDayOf(y, m);
  const domOk = (F.dom.any && !F.dom.last) ? null : (F.dom.values.has(d) && !F.dom.any) || (F.dom.last && d === ld);
  const dowRestricted = !F.dow.any || F.dow.lastDow.size || F.dow.nth.length;
  const dowOk = !dowRestricted ? null :
    (!F.dow.any && F.dow.values.has(dow)) || (F.dow.lastDow.has(dow) && d + 7 > ld) || F.dow.nth.some(([w, n]) => w === dow && Math.ceil(d / 7) === n);
  if (domOk === null && dowOk === null) return true;
  if (domOk === null) return dowOk;
  if (dowOk === null) return domOk;
  return domOk || dowOk; // cả hai cùng giới hạn: chạy khi khớp một trong hai (như cron chuẩn)
}

/** Các lần chạy sau thời điểm from (ms). offsetMin: lệch múi giờ cố định so với UTC (phút), null = giờ của máy. */
export function nextRuns(c, from, count = 10, offsetMin = 420) {
  const F = c.fields, out = [];
  const sorted = (s) => [...s].sort((a, b) => a - b);
  const H = sorted(F.hour.values), Mi = sorted(F.minute.values), S = sorted(F.second.values);
  // làm việc trên "giờ đồng hồ" của múi đã chọn
  const toWall = (ms) => (offsetMin == null ? (() => { const d = new Date(ms); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()); })() : ms + offsetMin * 60000);
  const fromWall = (w) => {
    if (offsetMin != null) return w - offsetMin * 60000;
    const d = new Date(w);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()).getTime();
  };
  const start = toWall(from) + 1000 - (toWall(from) % 1000);
  const s0 = new Date(start);
  let y = s0.getUTCFullYear(), m = s0.getUTCMonth() + 1, d = s0.getUTCDate();
  let first = true;
  for (let days = 0; days < 366 * 5 && out.length < count; days++) {
    if (F.month.values.has(m) && dayMatches(F, y, m, d)) {
      for (const h of H) for (const mi of Mi) for (const s of S) {
        const w = Date.UTC(y, m - 1, d, h, mi, s);
        if (first && w < start) continue;
        out.push(fromWall(w));
        if (out.length >= count) break;
      }
    }
    first = false;
    const nx = new Date(Date.UTC(y, m - 1, d + 1));
    y = nx.getUTCFullYear(); m = nx.getUTCMonth() + 1; d = nx.getUTCDate();
  }
  return out.slice(0, count);
}
