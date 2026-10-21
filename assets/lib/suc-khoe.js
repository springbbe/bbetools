/* BMI (ngưỡng cho người châu Á), BMR/TDEE (Mifflin–St Jeor), ngày dự sinh (quy tắc Naegele). */

/** BMI = cân nặng (kg) / chiều cao (m)² */
export const bmi = (kg, cm) => (kg > 0 && cm > 0 ? kg / Math.pow(cm / 100, 2) : NaN);

/** Phân loại theo khuyến nghị của WHO cho người châu Á – Thái Bình Dương (2000), Bộ Y tế Việt Nam đang dùng */
export const BMI_ASIA = [
  { max: 18.5, label: "Thiếu cân", tone: "warn" },
  { max: 23, label: "Bình thường", tone: "ok" },
  { max: 25, label: "Thừa cân", tone: "warn" },
  { max: 30, label: "Béo phì độ I", tone: "err" },
  { max: Infinity, label: "Béo phì độ II", tone: "err" }
];
export const BMI_WHO = [
  { max: 18.5, label: "Thiếu cân", tone: "warn" },
  { max: 25, label: "Bình thường", tone: "ok" },
  { max: 30, label: "Thừa cân", tone: "warn" },
  { max: 35, label: "Béo phì độ I", tone: "err" },
  { max: 40, label: "Béo phì độ II", tone: "err" },
  { max: Infinity, label: "Béo phì độ III", tone: "err" }
];
export const bmiClass = (v, table = BMI_ASIA) => table.find((c) => v < c.max);
/** Khoảng cân nặng ứng với BMI bình thường ở chiều cao cho trước */
export function healthyRange(cm, table = BMI_ASIA) {
  const i = table.findIndex((c) => c.label === "Bình thường");
  const m2 = Math.pow(cm / 100, 2);
  return { min: table[i - 1].max * m2, max: table[i].max * m2 };
}

export const ACTIVITY = [
  [1.2, "Ít vận động (ngồi nhiều, không tập)"],
  [1.375, "Vận động nhẹ (tập 1–3 buổi/tuần)"],
  [1.55, "Vận động vừa (tập 3–5 buổi/tuần)"],
  [1.725, "Vận động nhiều (tập 6–7 buổi/tuần)"],
  [1.9, "Rất nhiều (lao động nặng, tập 2 lần/ngày)"]
];
/** BMR theo Mifflin–St Jeor (kcal/ngày) */
export function bmr(sex, kg, cm, age) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === "f" ? -161 : 5);
}
/** TDEE và mức calo theo mục tiêu; 1 kg mỡ ≈ 7700 kcal */
export function tdee(sex, kg, cm, age, factor) {
  const b = bmr(sex, kg, cm, age), t = b * factor;
  const floor = sex === "f" ? 1200 : 1500; // không khuyến nghị ăn dưới mức này nếu không có bác sĩ theo dõi
  const goal = (kgPerWeek) => Math.max(floor, t + (kgPerWeek * 7700) / 7);
  return { bmr: b, tdee: t, floor, goals: [[-1, goal(-1)], [-0.5, goal(-0.5)], [-0.25, goal(-0.25)], [0, t], [0.25, goal(0.25)], [0.5, goal(0.5)]] };
}

/** Ngày dự sinh từ ngày đầu kỳ kinh cuối (LMP, số ngày kể từ mốc) và độ dài chu kỳ: LMP + 280 ngày + (chu kỳ − 28) */
export function dueFromLmp(lmpDays, cycle = 28) { return lmpDays + 280 + (cycle - 28); }
/** Tuổi thai (tuần + ngày) tại ngày `atDays`, tính từ "LMP hiệu chỉnh" = ngày dự sinh − 280 */
export function gestation(dueDays, atDays) {
  const d = atDays - (dueDays - 280);
  return { totalDays: d, weeks: Math.floor(d / 7), days: ((d % 7) + 7) % 7, trimester: d < 14 * 7 ? 1 : d < 28 * 7 ? 2 : 3 };
}
