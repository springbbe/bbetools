/* Tra đơn vị hành chính sau sáp nhập 2025 (data/don-vi-hanh-chinh.json): tìm xã/phường cũ → mới và ngược lại. */
import { fold } from "./search.js";

const TYPE_ABBR = { "phuong": ["p"], "xa": ["x"], "thi tran": ["tt"], "quan": ["q"], "huyen": ["h"], "thi xa": ["tx"], "thanh pho": ["tp"], "tinh": ["t"] };

/** Dựng chỉ mục từ dữ liệu JSON */
export function buildIndex(D) {
  const T = D.types;
  const prov = new Map(D.provinces.map(([code, name, type]) => [code, { code, name, type: T[type] }]));
  const ward = new Map(D.wards.map(([code, p, name, type, postal]) => [code, { code, prov: p, name, type: T[type], postal, origins: [] }]));
  const oprov = new Map(D.oldProvinces.map(([code, name, type, now]) => [code, { code, name, type: T[type], now }]));
  const odist = new Map(D.oldDistricts.map(([code, p, name, type]) => [code, { code, prov: p, name, type: T[type] }]));
  const old = D.oldWards.map(([code, dist, name, type, to]) => {
    const d = odist.get(dist), p = d && oprov.get(d.prov);
    const news = Array.isArray(to) ? to : [to];
    const o = { code, name, type: T[type], dist: d, prov: p, to: news, split: news.length > 1 };
    o.key = words(`${o.type} ${name} ${d ? d.type + " " + d.name : ""} ${p ? p.type + " " + p.name : ""}`);
    o.nameKey = words(name);
    news.forEach((c, i) => { const w = ward.get(c); if (w) w.origins.push({ old: o, main: i === 0 }); });
    return o;
  });
  for (const w of ward.values()) {
    const p = prov.get(w.prov);
    w.provObj = p;
    w.key = words(`${w.type} ${w.name} ${p.type} ${p.name}`);
    w.nameKey = words(w.name);
  }
  return { D, prov, ward, oprov, odist, old, wards: [...ward.values()] };
}
const words = (s) => fold(s).split(" ").filter(Boolean);

const ABBR = new Set(["p", "q", "h", "x", "tt", "tx", "tp", "f"]);
const PLACE = [[/\b(tp ?)?hcm\b|\bsg\b/g, "ho chi minh"], [/\bhn\b/g, "ha noi"], [/\bdn\b/g, "da nang"], [/\bhp\b/g, "hai phong"]];
/** Từ khoá truy vấn: bỏ dấu, tách "q1" → "q 1", "p.5" → "p 5", "hcm" → "ho chi minh" */
export function queryWords(q) {
  let f = fold(q).replace(/\b([a-z]+)(\d+)\b/g, (m, a, b) => (ABBR.has(a) ? a + " " + b : m));
  for (const [re, to] of PLACE) f = f.replace(re, to);
  return f.split(" ").filter(Boolean);
}

/* một từ truy vấn khớp một từ trong khoá: bằng nhau, là tiền tố (khi đủ dài), hoặc là chữ viết tắt loại đơn vị */
function wordHit(qw, key) {
  for (let i = 0; i < key.length; i++) {
    const k = key[i];
    if (k === qw) return i;
    if (/^\d+$/.test(qw)) continue;            // số phải khớp đúng (phường 1 ≠ phường 12)
    if (qw.length >= 2 && k.startsWith(qw)) return i;
  }
  for (const [full, abbr] of Object.entries(TYPE_ABBR)) {
    if (abbr.includes(qw) || (qw === "f" && full === "phuong")) {
      const fw = full.split(" ");
      for (let i = 0; i < key.length; i++) if (key.slice(i, i + fw.length).join(" ") === full) return i;
    }
  }
  return -1;
}
function score(qws, rec) {
  let s = 0;
  for (const w of qws) {
    const i = wordHit(w, rec.key);
    if (i < 0) return -1;
    if (rec.nameKey.includes(w)) s += 3;
    else if (rec.nameKey.some((k) => k.startsWith(w))) s += 2;
    else s += 1;
  }
  const name = rec.nameKey.join(" "), q = qws.join(" ");
  if (q.includes(name)) s += 4;
  if (name === q) s += 6;
  return s;
}

/** Tìm xã/phường cũ (trước 1/7/2025). o: { prov (mã tỉnh mới để lọc), limit } */
export function searchOld(I, q, o = {}) {
  const qws = queryWords(q);
  if (!qws.length) return [];
  const res = [];
  for (const r of I.old) {
    if (o.prov && r.prov && r.prov.now !== o.prov) continue;
    const s = score(qws, r);
    if (s >= 0) res.push([s, r]);
  }
  return res.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name, "vi")).slice(0, o.limit || 30).map((x) => x[1]);
}
/** Tìm xã/phường mới */
export function searchNew(I, q, o = {}) {
  const qws = queryWords(q);
  if (!qws.length) return [];
  const res = [];
  for (const r of I.wards) {
    if (o.prov && r.prov !== o.prov) continue;
    const s = score(qws, r);
    if (s >= 0) res.push([s, r]);
  }
  return res.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name, "vi")).slice(0, o.limit || 30).map((x) => x[1]);
}
