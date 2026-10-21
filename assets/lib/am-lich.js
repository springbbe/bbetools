/* Âm lịch Việt Nam theo thuật toán thiên văn của Hồ Ngọc Đức (https://www.informatik.uni-leipzig.de/~duc/amlich/),
   múi giờ mặc định UTC+7. Hàm thuần, có test trong tests/am-lich.test.js. */

const PI = Math.PI;
const INT = Math.floor;
export const TZ = 7;

export const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
export const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
export const CON_GIAP = ["Chuột", "Trâu", "Hổ", "Mèo", "Rồng", "Rắn", "Ngựa", "Dê", "Khỉ", "Gà", "Chó", "Lợn"];
export const THU = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
export const TIET_KHI = [
  "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
  "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
  "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
  "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập"
];
export const THANG_AM = ["Giêng", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Mười một", "Chạp"];

/** Số ngày Julius của một ngày dương lịch */
export function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  return jd;
}

export function jdToDate(jd) {
  let b, c;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else { b = 0; c = jd + 32082; }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);
  return [day, month, year];
}

function newMoon(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - deltat;
}

/** Kinh độ mặt trời (radian) tại thời điểm jdn (giờ UTC) */
function sunLongitudeRad(jdn) {
  const T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L -= PI * 2 * INT(L / (PI * 2));
  return L;
}

/** Cung hoàng đạo (0..11, mỗi cung 30°) của mặt trời lúc 0h ngày dayNumber */
function getSunLongitude(dayNumber, tz) { return INT(sunLongitudeRad(dayNumber - 0.5 - tz / 24) / PI * 6); }
function getNewMoonDay(k, tz) { return INT(newMoon(k) + 0.5 + tz / 24); }

function getLunarMonth11(yy, tz) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, tz);
  if (getSunLongitude(nm, tz) >= 9) nm = getNewMoonDay(k - 1, tz);
  return nm;
}

function getLeapMonthOffset(a11, tz) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last, i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  do {
    last = arc; i++;
    arc = getSunLongitude(getNewMoonDay(k + i, tz), tz);
  } while (arc !== last && i < 14);
  return i - 1;
}

/** Dương → âm. Trả về { day, month, year, leap } */
export function solarToLunar(dd, mm, yy, tz = TZ) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, tz);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, tz);
  let a11 = getLunarMonth11(yy, tz), b11 = a11, lunarYear;
  if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy - 1, tz); }
  else { lunarYear = yy + 1; b11 = getLunarMonth11(yy + 1, tz); }
  const day = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let leap = false, month = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, tz);
    if (diff >= leapMonthDiff) { month = diff + 10; if (diff === leapMonthDiff) leap = true; }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) lunarYear -= 1;
  return { day, month, year: lunarYear, leap };
}

/** Tháng nhuận của năm âm lịch (1..12) hoặc 0 nếu không có */
export function leapMonthOf(lunarYear, tz = TZ) {
  const a11 = getLunarMonth11(lunarYear - 1, tz), b11 = getLunarMonth11(lunarYear, tz);
  if (b11 - a11 <= 365) return 0;
  let m = getLeapMonthOffset(a11, tz) - 2;
  if (m <= 0) m += 12;
  return m;
}

/** Âm → dương. Trả về { day, month, year } hoặc null nếu ngày âm không tồn tại (vd. tháng nhuận sai, ngày 30 tháng thiếu) */
export function lunarToSolar(lunarDay, lunarMonth, lunarYear, leap = false, tz = TZ) {
  let a11, b11;
  if (lunarMonth < 11) { a11 = getLunarMonth11(lunarYear - 1, tz); b11 = getLunarMonth11(lunarYear, tz); }
  else { a11 = getLunarMonth11(lunarYear, tz); b11 = getLunarMonth11(lunarYear + 1, tz); }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, tz);
    let leapMonth = leapOff - 2;
    if (leapMonth <= 0) leapMonth += 12;
    if (leap && lunarMonth !== leapMonth) return null;
    if (leap || off >= leapOff) off += 1;
  } else if (leap) return null;
  const monthStart = getNewMoonDay(k + off, tz);
  const nextStart = getNewMoonDay(k + off + 1, tz);
  if (lunarDay < 1 || lunarDay > nextStart - monthStart) return null;
  const [day, month, year] = jdToDate(monthStart + lunarDay - 1);
  return { day, month, year };
}

/** Độ dài (29 hoặc 30) của tháng âm chứa ngày dương dd/mm/yy */
export function lunarMonthLength(dd, mm, yy, tz = TZ) {
  const l = solarToLunar(dd, mm, yy, tz);
  const start = jdFromDate(dd, mm, yy) - l.day + 1;
  const k = INT((start - 2415021.076998695) / 29.530588853 + 0.5);
  let next = getNewMoonDay(k + 1, tz);
  if (next <= start) next = getNewMoonDay(k + 2, tz);
  return next - start;
}

export const canChiYear = (y) => CAN[(y + 6) % 10] + " " + CHI[(y + 8) % 12];
export const canChiMonth = (m, y) => CAN[(y * 12 + m + 3) % 10] + " " + CHI[(m + 1) % 12];
export const canChiDay = (jd) => CAN[(jd + 9) % 10] + " " + CHI[(jd + 1) % 12];
/** Can của giờ Tý (giờ đầu ngày) */
export const canHourZero = (jd) => CAN[((jd - 1) * 2) % 10];

/** Tiết khí của ngày (theo kinh độ mặt trời lúc 0h, mỗi tiết 15°) */
export function tietKhi(jd, tz = TZ) {
  const L = sunLongitudeRad(jd - 0.5 - tz / 24);
  return TIET_KHI[INT(L / PI * 12)];
}

// Giờ hoàng đạo: 6 giờ tốt trong 12 giờ, theo chi của ngày (chuỗi bit bắt đầu từ giờ Tý)
const GIO_HD = ["110100101100", "001101001011", "110011010010", "101100110100", "001011001101", "010010110011"];
const GIO_RANGE = ["23–1", "1–3", "3–5", "5–7", "7–9", "9–11", "11–13", "13–15", "15–17", "17–19", "19–21", "21–23"];
export function gioHoangDao(jd) {
  const chiDay = (jd + 1) % 12;
  const pattern = GIO_HD[chiDay % 6];
  const out = [];
  for (let i = 0; i < 12; i++) if (pattern[i] === "1") out.push({ chi: CHI[i], range: GIO_RANGE[i] });
  return out;
}

/** Thông tin đầy đủ cho một ngày dương */
export function dayInfo(dd, mm, yy, tz = TZ) {
  const jd = jdFromDate(dd, mm, yy);
  const l = solarToLunar(dd, mm, yy, tz);
  return {
    solar: { day: dd, month: mm, year: yy },
    lunar: l,
    jd,
    weekday: THU[(jd + 1) % 7],
    canChi: { day: canChiDay(jd), month: canChiMonth(l.month, l.year), year: canChiYear(l.year) },
    conGiap: CON_GIAP[(l.year + 8) % 12],
    tietKhi: tietKhi(jd, tz),
    gioHoangDao: gioHoangDao(jd),
    monthLength: lunarMonthLength(dd, mm, yy, tz),
    leapMonth: leapMonthOf(l.year, tz)
  };
}

/** Tên tháng âm: "tháng Giêng", "tháng Chạp", "tháng 6 nhuận" */
export function lunarMonthName(m, leap) {
  return "tháng " + (m === 1 || m === 12 ? THANG_AM[m - 1] : String(m)) + (leap ? " nhuận" : "");
}

export function daysInSolarMonth(m, y) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

/** Ngày lễ, ngày kỷ niệm phổ biến (âm lịch: key "a:d/m", dương lịch: "d/m") */
export const NGAY_LE = {
  "1/1": "Tết Dương lịch",
  "3/2": "Thành lập Đảng Cộng sản Việt Nam",
  "14/2": "Lễ Tình nhân",
  "27/2": "Ngày Thầy thuốc Việt Nam",
  "8/3": "Quốc tế Phụ nữ",
  "26/3": "Thành lập Đoàn TNCS Hồ Chí Minh",
  "30/4": "Ngày Giải phóng miền Nam",
  "1/5": "Quốc tế Lao động",
  "19/5": "Ngày sinh Chủ tịch Hồ Chí Minh",
  "1/6": "Quốc tế Thiếu nhi",
  "28/6": "Ngày Gia đình Việt Nam",
  "27/7": "Ngày Thương binh Liệt sĩ",
  "19/8": "Cách mạng Tháng Tám",
  "2/9": "Quốc khánh",
  "10/10": "Giải phóng Thủ đô",
  "20/10": "Ngày Phụ nữ Việt Nam",
  "20/11": "Ngày Nhà giáo Việt Nam",
  "22/12": "Thành lập Quân đội Nhân dân Việt Nam",
  "24/12": "Lễ Giáng sinh",
  "a:1/1": "Tết Nguyên Đán",
  "a:2/1": "Mùng 2 Tết",
  "a:3/1": "Mùng 3 Tết",
  "a:15/1": "Tết Nguyên Tiêu (Rằm tháng Giêng)",
  "a:3/3": "Tết Hàn thực",
  "a:10/3": "Giỗ Tổ Hùng Vương",
  "a:15/4": "Lễ Phật đản",
  "a:5/5": "Tết Đoan ngọ",
  "a:15/7": "Lễ Vu Lan",
  "a:15/8": "Tết Trung thu",
  "a:23/12": "Ông Táo chầu trời"
};
