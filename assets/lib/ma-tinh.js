/* Đọc số CCCD (số định danh cá nhân 12 số) và biển số xe → tỉnh (cũ và mới). Dữ liệu: data/ma-tinh.json */

/** Dựng bảng tra từ dữ liệu */
export function buildTables(D) {
  const prov = new Map(D.provinces.map((p) => [p.code, p]));
  const cccd = new Map(), plate = new Map();
  for (const o of D.oldProvinces) {
    const rec = { old: o, now: prov.get(o.now) };
    cccd.set("0" + o.code, rec);
    for (const k of o.plates || []) plate.set(k, rec);
  }
  return { prov, cccd, plate, special: D.special || {} };
}

// chữ số thứ 4: giới tính + thế kỷ sinh
const GENDER = { 0: ["Nam", 1900], 1: ["Nữ", 1900], 2: ["Nam", 2000], 3: ["Nữ", 2000], 4: ["Nam", 2100], 5: ["Nữ", 2100], 6: ["Nam", 2200], 7: ["Nữ", 2200], 8: ["Nam", 2300], 9: ["Nữ", 2300] };

/** "001 2 03 012345" → { ok, province, gender, year, … } */
export function parseCccd(input, T) {
  const d = String(input || "").replace(/\D/g, "");
  if (d.length !== 12) return { ok: false, msg: d.length === 9 ? "Đây là số CMND 9 số (mẫu cũ); công cụ chỉ đọc số CCCD/định danh 12 số." : "Số CCCD gồm đúng 12 chữ số." };
  const code = d.slice(0, 3), g = GENDER[d[3]], yy = +d.slice(4, 6);
  const rec = T.cccd.get(code);
  return {
    ok: !!rec, code, rec, gender: g[0], year: g[1] + yy, serial: d.slice(6),
    msg: rec ? "" : `Mã ${code} không thuộc 63 tỉnh, thành (có thể là công dân đăng ký khai sinh ở nước ngoài hoặc số nhập sai).`
  };
}

// loại biển theo seri (ký hiệu chữ)
const SERIES = {
  NG: "xe của cơ quan đại diện ngoại giao (biển đỏ chữ trắng, có gạch ngang)", NN: "xe của tổ chức, cá nhân nước ngoài",
  QT: "xe của tổ chức quốc tế", CV: "xe của nhân viên hành chính kỹ thuật cơ quan ngoại giao, tổ chức quốc tế",
  LD: "xe của doanh nghiệp có vốn nước ngoài, xe thuê của nước ngoài", DA: "xe của các ban quản lý dự án do nước ngoài đầu tư",
  KT: "xe quân đội làm kinh tế", R: "rơ moóc, sơ mi rơ moóc", T: "xe đăng ký tạm thời", MK: "máy kéo", TĐ: "xe máy chuyên dùng / xe thí điểm",
  HC: "xe ô tô phạm vi hoạt động hạn chế"
};

/** "30A-123.45", "51G 12345", "29-B1 123.45", "30" → { ok, code, series, rec } */
export function parsePlate(input, T) {
  const t = String(input || "").toUpperCase().replace(/[^0-9A-ZĐ]/g, "");
  const m = /^(\d{2})([A-ZĐ]{0,2})(\d?)(\d*)$/.exec(t);
  if (!m) return { ok: false, msg: "Nhập biển số bắt đầu bằng 2 chữ số tỉnh, ví dụ 30A-123.45 hoặc 59-X1 234.56." };
  const code = m[1], series = m[2];
  const rec = T.plate.get(code);
  const special = T.special[code];
  return {
    ok: !!(rec || special), code, series, rec, special, seriesNote: SERIES[series] || "",
    msg: rec || special ? "" : `Ký hiệu ${code} hiện chưa cấp cho tỉnh, thành nào.`
  };
}

/** Nhận diện chuỗi là CCCD hay biển số */
export function detect(input) {
  const t = String(input || "").trim();
  const digits = t.replace(/\D/g, "");
  if (/^[\d\s.-]+$/.test(t) && (digits.length === 12 || digits.length === 9)) return "cccd";
  if (/^\d{3}$/.test(digits) && /^\d{3}$/.test(t)) return "cccd-code";
  return "plate";
}
