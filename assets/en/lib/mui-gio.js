/* Tự sinh bởi scripts/build.js từ assets/lib/mui-gio.js và i18n/en/js/ — đừng sửa tay. */
/* Múi giờ (hàm thuần, dùng Intl có sẵn trong trình duyệt/Node): độ lệch so với UTC, đổi giờ địa phương ↔ thời điểm,
   so với giờ Việt Nam; danh sách thành phố tên tiếng Việt. Tự tính giờ mùa hè (DST) theo dữ liệu múi giờ của trình duyệt. */

export const VN = "Asia/Ho_Chi_Minh";

// [tên tiếng Việt, quốc gia, múi giờ IANA, từ khoá thêm]
export const CITIES = [
  ["Hanoi", "Vietnam", VN, "ha noi viet nam hanoi"], ["Ho Chi Minh City", "Vietnam", VN, "sai gon saigon hcm"],
  ["Bangkok", "Thailand", "Asia/Bangkok", "thai lan"], ["Vientiane", "Laos", "Asia/Vientiane", "vientiane lao"], ["Phnom Penh", "Campuchia", "Asia/Phnom_Penh", "phnom penh"],
  ["Jakarta", "Indonesia", "Asia/Jakarta", ""], ["Bali", "Indonesia", "Asia/Makassar", "denpasar"], ["Kuala Lumpur", "Malaysia", "Asia/Kuala_Lumpur", "ma lai"],
  ["Singapore", "Singapore", "Asia/Singapore", "xing ga po"], ["Manila", "Philippines", "Asia/Manila", "phi lip pin"], ["Yangon", "Myanmar", "Asia/Yangon", "rangoon"],
  ["Beijing", "China", "Asia/Shanghai", "beijing trung quoc"], ["Shanghai", "China", "Asia/Shanghai", "shanghai"], ["Guangzhou", "China", "Asia/Shanghai", "guangzhou"],
  ["Hong Kong", "China", "Asia/Hong_Kong", "hong kong"], ["Taipei", "Taiwan", "Asia/Taipei", "taipei dai loan"], ["Seoul", "South Korea", "Asia/Seoul", "han quoc xo un"],
  ["Busan", "South Korea", "Asia/Seoul", "pusan"], ["Tokyo", "Japan", "Asia/Tokyo", "nhat ban to ky o"], ["Osaka", "Japan", "Asia/Tokyo", ""],
  ["Ulaanbaatar", "Mongolia", "Asia/Ulaanbaatar", "mong co"], ["New Delhi", "India", "Asia/Kolkata", "an do delhi mumbai"], ["Kathmandu", "Nepal", "Asia/Kathmandu", ""],
  ["Dhaka", "Bangladesh", "Asia/Dhaka", ""], ["Karachi", "Pakistan", "Asia/Karachi", ""], ["Dubai", "UAE", "Asia/Dubai", "a rap"],
  ["Doha", "Qatar", "Asia/Qatar", ""], ["Riyadh", "Saudi Arabia", "Asia/Riyadh", "saudi"], ["Tehran", "Iran", "Asia/Tehran", ""],
  ["Istanbul", "Turkey", "Europe/Istanbul", "tho nhi ky"], ["Moskva", "Russia", "Europe/Moscow", "moscow nga"], ["Vladivostok", "Russia", "Asia/Vladivostok", "nga"],
  ["London", "United Kingdom", "Europe/London", "luan don anh"], ["Dublin", "Ireland", "Europe/Dublin", ""], ["Lisbon", "Portugal", "Europe/Lisbon", ""],
  ["Paris", "France", "Europe/Paris", "phap"], ["Berlin", "Germany", "Europe/Berlin", "duc"], ["Frankfurt", "Germany", "Europe/Berlin", ""],
  ["Amsterdam", "Netherlands", "Europe/Amsterdam", "ha lan"], ["Brussels", "Belgium", "Europe/Brussels", ""], ["Zürich", "Switzerland", "Europe/Zurich", "thuy si"],
  ["Rome", "Italy", "Europe/Rome", "y italia"], ["Madrid", "Spain", "Europe/Madrid", "tay ban nha"], ["Vienna", "Austria", "Europe/Vienna", ""],
  ["Praha", "Czechia", "Europe/Prague", "prague czech"], ["Warszawa", "Poland", "Europe/Warsaw", "warsaw ba lan"], ["Stockholm", "Sweden", "Europe/Stockholm", ""],
  ["Helsinki", "Finland", "Europe/Helsinki", ""], ["Athens", "Greece", "Europe/Athens", ""], ["Kyiv", "Ukraina", "Europe/Kyiv", "kiev"],
  ["Cairo", "Egypt", "Africa/Cairo", "ai cap"], ["Lagos", "Nigeria", "Africa/Lagos", ""], ["Nairobi", "Kenya", "Africa/Nairobi", ""],
  ["Johannesburg", "South Africa", "Africa/Johannesburg", "nam phi"],
  ["New York", "United States", "America/New_York", "my hoa ky mien dong washington boston"], ["Chicago", "United States", "America/Chicago", "hoa ky texas houston dallas"],
  ["Denver", "United States", "America/Denver", "hoa ky"], ["Phoenix", "United States", "America/Phoenix", "arizona"], ["Los Angeles", "United States", "America/Los_Angeles", "hoa ky cali california san francisco seattle"],
  ["Anchorage", "United States", "America/Anchorage", "alaska"], ["Honolulu", "United States", "Pacific/Honolulu", "hawaii"], ["Toronto", "Canada", "America/Toronto", "ca na da montreal ottawa"],
  ["Vancouver", "Canada", "America/Vancouver", "ca na da"], ["Mexico City", "Mexico", "America/Mexico_City", ""], ["São Paulo", "Brazil", "America/Sao_Paulo", "sao paulo"],
  ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires", ""], ["Santiago", "Chile", "America/Santiago", ""], ["Lima", "Peru", "America/Lima", ""],
  ["Sydney", "Australia", "Australia/Sydney", "uc australia"], ["Melbourne", "Australia", "Australia/Melbourne", "uc"], ["Brisbane", "Australia", "Australia/Brisbane", "uc"],
  ["Perth", "Australia", "Australia/Perth", "uc"], ["Adelaide", "Australia", "Australia/Adelaide", "uc"], ["Auckland", "New Zealand", "Pacific/Auckland", "niu di lan"],
  ["UTC", "Coordinated Universal Time", "UTC", "gmt utc"]
].map(([name, country, zone, kw], i) => ({ id: i, name, country, zone, kw }));

const fmts = new Map();
function partsOf(zone, ms) {
  let f = fmts.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" });
    fmts.set(zone, f);
  }
  const o = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(o.weekday) };
}
/** Giờ địa phương tại zone ở thời điểm ms: { y, mo, d, h, mi, s, wd (0 = CN) } */
export const zoned = partsOf;

/** Độ lệch so với UTC (phút) của zone tại thời điểm ms */
export function offsetMin(zone, ms = Date.now()) {
  const p = partsOf(zone, ms);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** Thời điểm (ms) ứng với giờ địa phương y-mo-d h:mi tại zone. Giờ không tồn tại (lúc chuyển sang giờ mùa hè) được đẩy lên sau. */
export function fromZoned(zone, y, mo, d, h, mi = 0) {
  const base = Date.UTC(y, mo - 1, d, h, mi);
  const t1 = base - offsetMin(zone, base) * 60000;
  const t2 = base - offsetMin(zone, t1) * 60000;
  const ok = (t) => { const p = partsOf(zone, t); return p.h === h && p.mi === mi && p.d === d; };
  if (ok(t2)) return t2;
  if (ok(t1)) return t1;
  return Math.max(t1, t2); // rơi vào khoảng trống khi chỉnh đồng hồ
}

/** "UTC+7", "UTC+5:30", "UTC−3" */
export function fmtOffset(min) {
  const s = min < 0 ? "−" : "+", a = Math.abs(min);
  return "UTC" + s + Math.floor(a / 60) + (a % 60 ? ":" + String(a % 60).padStart(2, "0") : "");
}

/** So với giờ Việt Nam: "Cùng giờ Việt Nam", "Nhanh hơn 2 giờ", "Chậm hơn 11 giờ 30 phút" */
export function vsVietnam(zone, ms = Date.now()) {
  const d = offsetMin(zone, ms) - offsetMin(VN, ms);
  if (!d) return "Same time as Vietnam";
  const a = Math.abs(d), hh = Math.floor(a / 60), mm = a % 60;
  return (d > 0 ? "Ahead by " : "Behind by ") + (hh ? hh + " h" : "") + (hh && mm ? " " : "") + (mm ? mm + " min" : "");
}

/** Có đang giờ mùa hè không (độ lệch hiện tại lớn hơn độ lệch nhỏ nhất trong năm) */
export function isDst(zone, ms = Date.now()) {
  const y = partsOf(zone, ms).y;
  const jan = offsetMin(zone, Date.UTC(y, 0, 1)), jul = offsetMin(zone, Date.UTC(y, 6, 1));
  return jan !== jul && offsetMin(zone, ms) === Math.max(jan, jul);
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Nhãn ngày so với một ngày tham chiếu: "Hôm nay", "Hôm qua", "Ngày mai" hoặc "Thứ hai, 3/11" */
export function dayLabel(p, ref) {
  const a = Date.UTC(p.y, p.mo - 1, p.d), b = Date.UTC(ref.y, ref.mo - 1, ref.d), diff = Math.round((a - b) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return `${WEEKDAYS[p.wd]}, ${p.mo}/${p.d}`;
}
