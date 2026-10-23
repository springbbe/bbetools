/* Tự sinh bởi scripts/build.js từ assets/lib/don-vi.js và i18n/en/js/ — đừng sửa tay. */
/* Bảng đổi đơn vị đo. Mỗi đơn vị có hệ số so với đơn vị gốc của nhóm; nhiệt độ dùng hàm riêng. */

export const UNITS = {
  length: { name: "Length", base: "m", units: [
    ["km", "kilometer (km)", 1000], ["m", "meter (m)", 1], ["dm", "decimeter (dm)", 0.1], ["cm", "centimeter (cm)", 0.01], ["mm", "millimeter (mm)", 0.001],
    ["um", "micrometer (µm)", 1e-6], ["nm", "nanometer (nm)", 1e-9], ["in", "inch (in)", 0.0254], ["ft", "foot (ft)", 0.3048], ["yd", "yard (yd)", 0.9144],
    ["mi", "mile (mi)", 1609.344], ["nmi", "nautical mile", 1852]] },
  mass: { name: "Mass", base: "kg", units: [
    ["t", "tonne", 1000], ["ta", "quintal (100 kg)", 100], ["yen", "10 kg (yến)", 10], ["kg", "kilogram (kg)", 1], ["lang", "lạng (100 g)", 0.1], ["g", "gam (g)", 0.001],
    ["mg", "mi-li-gam (mg)", 1e-6], ["lb", "pound (lb)", 0.45359237], ["oz", "ounce (oz)", 0.028349523125], ["ct", "carat", 0.0002], ["chi", "chỉ (Vietnamese gold, 3.75 g)", 0.00375], ["luong", "lượng / tael (Vietnamese gold, 37.5 g)", 0.0375]] },
  temp: { name: "Temperature", base: "C", units: [["C", "degrees Celsius (°C)"], ["F", "degrees Fahrenheit (°F)"], ["K", "Kelvin (K)"]] },
  area: { name: "Area", base: "m2", units: [
    ["km2", "km²", 1e6], ["ha", "hectare (ha)", 1e4], ["a", "a (are)", 100], ["m2", "m²", 1], ["dm2", "dm²", 0.01], ["cm2", "cm²", 1e-4], ["mm2", "mm²", 1e-6],
    ["acre", "acre", 4046.8564224], ["ft2", "ft²", 0.09290304], ["in2", "in²", 0.00064516]] },
  volume: { name: "Volume", base: "l", units: [
    ["m3", "cubic meter (m³)", 1000], ["l", "liter (L)", 1], ["dl", "deciliter (dL)", 0.1], ["ml", "milliliter (mL)", 0.001], ["cm3", "cm³ (cc)", 0.001],
    ["gal", "US gallon", 3.785411784], ["qt", "US quart", 0.946352946], ["cup", "US cup", 0.2365882365], ["floz", "US fl oz", 0.0295735295625],
    ["tbsp", "tablespoon (tbsp)", 0.01478676478125], ["tsp", "teaspoon (tsp)", 0.00492892159375], ["bbl", "oil barrel", 158.987294928]] },
  speed: { name: "Speed", base: "ms", units: [
    ["kmh", "km/h", 1 / 3.6], ["ms", "m/s", 1], ["mph", "mile per hour (mph)", 0.44704], ["kn", "knot (kn)", 1852 / 3600], ["fts", "ft/s", 0.3048], ["mach", "Mach (at 20 °C)", 343]] },
  time: { name: "Time", base: "s", units: [
    ["ms", "millisecond", 0.001], ["s", "second", 1], ["min", "minute", 60], ["h", "hour", 3600], ["d", "day", 86400], ["wk", "week", 604800],
    ["mo", "month (30.44 days)", 2629746], ["y", "year (365.24 days)", 31556952]] },
  data: { name: "Data", base: "B", units: [
    ["bit", "bit", 0.125], ["B", "byte (B)", 1], ["KB", "KB (1000 B)", 1e3], ["MB", "MB", 1e6], ["GB", "GB", 1e9], ["TB", "TB", 1e12],
    ["KiB", "KiB (1024 B)", 1024], ["MiB", "MiB", 1024 ** 2], ["GiB", "GiB", 1024 ** 3], ["TiB", "TiB", 1024 ** 4]] },
  pressure: { name: "Pressure", base: "Pa", units: [
    ["Pa", "pascal (Pa)", 1], ["kPa", "kPa", 1000], ["MPa", "MPa", 1e6], ["bar", "bar", 1e5], ["atm", "atm", 101325], ["psi", "psi", 6894.757293168], ["mmHg", "mmHg", 133.322387415]] },
  energy: { name: "Energy", base: "J", units: [
    ["J", "jun (J)", 1], ["kJ", "kJ", 1000], ["cal", "calo (cal)", 4.184], ["kcal", "kcal (food Calorie)", 4184], ["Wh", "Wh", 3600], ["kWh", "kWh (electricity unit)", 3.6e6], ["BTU", "BTU", 1055.05585262]] }
};

const toC = { C: (v) => v, F: (v) => ((v - 32) * 5) / 9, K: (v) => v - 273.15 };
const fromC = { C: (v) => v, F: (v) => (v * 9) / 5 + 32, K: (v) => v + 273.15 };

/** Đổi value từ đơn vị `from` sang `to` trong nhóm `cat` */
export function convert(cat, value, from, to) {
  const v = +value;
  if (!Number.isFinite(v)) return NaN;
  if (cat === "temp") return fromC[to](toC[from](v));
  const g = UNITS[cat], f = g.units.find((u) => u[0] === from), t = g.units.find((u) => u[0] === to);
  if (!f || !t) return NaN;
  return (v * f[2]) / t[2];
}

/** Dấu thập phân và dấu nhóm nghìn: kiểu Việt Nam (1.234,5); trang ngôn ngữ khác (html lang ≠ vi) dùng kiểu Anh (1,234.5) */
const LANG = typeof document !== "undefined" ? document.documentElement.lang || "vi" : "vi";
export const NUM = LANG === "vi" ? { dec: ",", group: "." } : { dec: ".", group: "," };

/** Hiển thị số gọn: tối đa 10 chữ số có nghĩa, bỏ số 0 thừa, dùng dấu thập phân theo NUM */
export function fmtUnit(n) {
  if (!Number.isFinite(n)) return "–";
  if (n === 0) return "0";
  const a = Math.abs(n);
  if (a >= 1e15 || a < 1e-9) return n.toExponential(6).replace(/\.?0+e/, "e").replace(".", NUM.dec);
  const p = Number(n.toPrecision(10));
  const [i, d] = String(Math.abs(p).toFixed(Math.max(0, Math.min(12, 9 - Math.floor(Math.log10(a)))))).replace(/\.?0+$/, "").split(".");
  return (p < 0 ? "-" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, NUM.group) + (d ? NUM.dec + d : "");
}

/** Đọc số kiểu Việt ("1.234,5", "12,5") hoặc kiểu Anh ("1,234.5", "12.5").
    Chỉ có một dấu chấm và đúng 3 chữ số sau nó ("1.500") được hiểu là phân cách hàng nghìn như cách viết Việt Nam
    (trang tiếng Anh: một dấu phẩy và đúng 3 chữ số sau nó, "1,500"). */
export function parseNum(s) {
  let t = String(s == null ? "" : s).trim().replace(/\s/g, "").replace(/^\+/, "").replace(/[−–]/g, "-");
  if (!t) return NaN;
  const dots = (t.match(/\./g) || []).length, commas = (t.match(/,/g) || []).length;
  if (dots && commas) t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (commas) t = commas > 1 || (NUM.dec === "." && /^-?[1-9]\d{0,2},\d{3}$/.test(t)) ? t.replace(/,/g, "") : t.replace(",", ".");
  else if (dots > 1 || (NUM.dec === "," && /^-?[1-9]\d{0,2}\.\d{3}$/.test(t))) t = t.replace(/\./g, "");
  return /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? +t : NaN;
}
