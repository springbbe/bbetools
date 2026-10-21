/* Văn bản mẫu tiếng Việt (hàm thuần): ghép ngẫu nhiên từ thông dụng thành câu, đoạn có dấu câu tự nhiên,
   dùng để dàn trang, thử font có dấu. Có hạt giống (seed) để tạo lại đúng đoạn cũ. */

// cụm từ thông dụng (ngăn bởi dấu phẩy), ghép ngẫu nhiên thành câu
const PHRASES = ("mặt trời, buổi sáng, con đường, làng quê, dòng sông, cánh đồng, lúa chín, bầu trời, trong xanh, tiếng chim, ngọn gió, hàng cây, " +
  "phố cũ, mái ngói, góc nhỏ, quán quen, ly cà phê, trang sách, ánh đèn, khung cửa sổ, mùa thu, chiếc lá vàng, cơn mưa, đầu hạ, hạt nắng, " +
  "câu chuyện, kỷ niệm, thành phố, nhịp sống, người dân, bữa cơm, gia đình, ngôi nhà, khu vườn, bông hoa, cỏ non, đồi thông, biển xanh, " +
  "con sóng, bãi cát, chân trời, ước mơ, niềm vui, nụ cười, ánh mắt, bàn tay, lời hứa, thời gian, khoảnh khắc, chặng đường, hành trình, " +
  "công việc, kế hoạch, dự án, ý tưởng, sản phẩm, khách hàng, trải nghiệm, thiết kế, bố cục, màu sắc, hình ảnh, nội dung, tiêu đề, đoạn văn, " +
  "giao diện, trang web, ứng dụng, tính năng, giải pháp, chất lượng, hiệu quả, đơn giản, rõ ràng, nhẹ nhàng, mềm mại, tinh tế, gọn gàng, " +
  "bình yên, chậm rãi, rộn ràng, lặng lẽ, ấm áp, dịu dàng, thân thương, quen thuộc, mới mẻ, tươi sáng, xa xăm, gần gũi, nhỏ bé, rộng lớn, " +
  "luôn luôn, đôi khi, mỗi ngày, từng bước, dần dần, bỗng nhiên, vẫn còn, đã từng, sẽ là, có thể, thật sự, hơn nữa, cùng nhau, bên nhau, " +
  "đi qua, trở về, bắt đầu, tiếp tục, dừng lại, lắng nghe, nhìn thấy, cảm nhận, ghi lại, kể về, mang theo, giữ lại, chia sẻ, tìm kiếm, " +
  "xây dựng, học hỏi, thay đổi, phát triển, hoàn thiện, sắp xếp, trình bày, chờ đợi, nhớ thương, yêu thương").split(", ");
const LINKS = ["và", "của", "với", "trong", "như", "nhưng", "để", "là", "từ", "trên", "giữa", "bên", "cho", "mà", "rồi", "vì"];

/** Bộ sinh số ngẫu nhiên có hạt giống (mulberry32) */
export function rng(seed) {
  let t = seed >>> 0;
  return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const cap = (s) => s.charAt(0).toLocaleUpperCase("vi") + s.slice(1);

export function sentence(r, min = 8, max = 18) {
  const target = min + Math.floor(r() * (max - min + 1));
  const words = [], ends = []; // ends: vị trí kết thúc mỗi cụm, chỉ đặt dấu phẩy ở đó
  while (words.length < target) {
    words.push(...pick(r, PHRASES).split(" "));
    ends.push(words.length - 1);
    if (words.length < target - 2 && r() < 0.35) { words.push(pick(r, LINKS)); ends.push(words.length - 1); }
  }
  words.length = Math.max(...ends.filter((e) => e < target), 1) + 1; // cắt đúng ranh giới cụm
  while (words.length > 2 && LINKS.includes(words[words.length - 1])) words.pop();
  const mid = ends.filter((e) => e >= 3 && e <= words.length - 4 && !LINKS.includes(words[e]));
  if (words.length > 10 && mid.length && r() < 0.7) words[pick(r, mid)] += ",";
  const end = r() < 0.08 ? "!" : r() < 0.1 ? "?" : ".";
  return cap(words.join(" ")) + end;
}
export const paragraph = (r, min = 3, max = 6) => Array.from({ length: min + Math.floor(r() * (max - min + 1)) }, () => sentence(r)).join(" ");

/** kind: "p" (đoạn) | "s" (câu) | "w" (từ). Trả về mảng đoạn (với "p") hoặc một chuỗi */
export function lorem(kind, count, seed = 1) {
  const r = rng(seed);
  count = Math.max(1, Math.min(kind === "w" ? 5000 : kind === "s" ? 500 : 100, Math.floor(count) || 1));
  if (kind === "w") {
    const words = [];
    while (words.length < count) words.push(...pick(r, PHRASES).split(" "));
    words.length = count;
    return [cap(words.join(" ")) + "."];
  }
  if (kind === "s") return [Array.from({ length: count }, () => sentence(r)).join(" ")];
  return Array.from({ length: count }, () => paragraph(r));
}
