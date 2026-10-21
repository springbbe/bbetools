/* Can chi, con giáp, ngũ hành nạp âm (lục thập hoa giáp), tam hợp, tứ hành xung. */
import { CAN, CHI, CON_GIAP, solarToLunar } from "./am-lich.js";

// 30 cặp nạp âm theo thứ tự 60 năm bắt đầu từ Giáp Tý
const NAP_AM = [
  ["Hải Trung Kim", "Vàng trong biển"], ["Lư Trung Hỏa", "Lửa trong lò"], ["Đại Lâm Mộc", "Gỗ rừng già"], ["Lộ Bàng Thổ", "Đất ven đường"],
  ["Kiếm Phong Kim", "Vàng mũi kiếm"], ["Sơn Đầu Hỏa", "Lửa trên núi"], ["Giản Hạ Thủy", "Nước dưới khe"], ["Thành Đầu Thổ", "Đất trên thành"],
  ["Bạch Lạp Kim", "Vàng trong nến"], ["Dương Liễu Mộc", "Gỗ cây dương liễu"], ["Tuyền Trung Thủy", "Nước trong suối"], ["Ốc Thượng Thổ", "Đất trên mái nhà"],
  ["Tích Lịch Hỏa", "Lửa sấm sét"], ["Tùng Bách Mộc", "Gỗ tùng bách"], ["Trường Lưu Thủy", "Nước chảy dài"], ["Sa Trung Kim", "Vàng trong cát"],
  ["Sơn Hạ Hỏa", "Lửa dưới núi"], ["Bình Địa Mộc", "Gỗ đồng bằng"], ["Bích Thượng Thổ", "Đất trên vách"], ["Kim Bạch Kim", "Vàng pha bạch kim"],
  ["Phú Đăng Hỏa", "Lửa ngọn đèn"], ["Thiên Hà Thủy", "Nước trên trời"], ["Đại Trạch Thổ", "Đất nền nhà lớn"], ["Thoa Xuyến Kim", "Vàng trang sức"],
  ["Tang Đố Mộc", "Gỗ cây dâu"], ["Đại Khê Thủy", "Nước khe lớn"], ["Sa Trung Thổ", "Đất pha cát"], ["Thiên Thượng Hỏa", "Lửa trên trời"],
  ["Thạch Lựu Mộc", "Gỗ cây thạch lựu"], ["Đại Hải Thủy", "Nước biển lớn"]
];
export const HANH = ["Kim", "Thủy", "Mộc", "Hỏa", "Thổ"]; // theo vòng tương sinh: Kim sinh Thủy, Thủy sinh Mộc…
const TAM_HOP = [[8, 0, 4], [2, 6, 10], [11, 3, 7], [5, 9, 1]];   // Thân Tý Thìn, Dần Ngọ Tuất, Hợi Mão Mùi, Tỵ Dậu Sửu
const TU_XUNG = [[0, 6, 3, 9], [2, 8, 5, 11], [4, 10, 1, 7]];     // Tý Ngọ Mão Dậu, Dần Thân Tỵ Hợi, Thìn Tuất Sửu Mùi

/** Thông tin năm âm lịch */
export function yearInfo(lunarYear) {
  const can = (lunarYear + 6) % 10, chi = (lunarYear + 8) % 12;
  const cycle = (((lunarYear - 4) % 60) + 60) % 60;
  const [napAm, meaning] = NAP_AM[Math.floor(cycle / 2)];
  const hanh = napAm.split(" ").pop();
  const hi = HANH.indexOf(hanh);
  return {
    year: lunarYear, can: CAN[can], chi: CHI[chi], canChi: CAN[can] + " " + CHI[chi], conGiap: CON_GIAP[chi], chiIndex: chi, cycle,
    napAm, meaning, hanh,
    sinhRa: HANH[(hi + 1) % 5], duocSinh: HANH[(hi + 4) % 5], khac: HANH[(hi + 2) % 5], biKhac: HANH[(hi + 3) % 5],
    tamHop: TAM_HOP.find((g) => g.includes(chi)).filter((x) => x !== chi).map((x) => CHI[x]),
    tuXung: TU_XUNG.find((g) => g.includes(chi)).filter((x) => x !== chi).map((x) => CHI[x])
  };
}

/** Năm âm lịch của một ngày dương (người sinh trước Tết thuộc năm âm trước) */
export function lunarYearOf(d, m, y) { return solarToLunar(d, m, y).year; }

/** Tuổi mụ (tuổi âm): năm âm hiện tại − năm âm sinh + 1 */
export const tuoiMu = (birthLunarYear, nowLunarYear) => nowLunarYear - birthLunarYear + 1;

/** Các năm dương lịch (gần nhất) cùng con giáp, trong khoảng [from, to] */
export function sameChiYears(chiIndex, from, to) {
  const out = [];
  for (let y = from; y <= to; y++) if ((y + 8) % 12 === chiIndex) out.push(y);
  return out;
}
