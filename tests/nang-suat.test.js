import { test } from "node:test";
import assert from "node:assert/strict";
import { seeded, randInt, randBetween, shuffle, uniqueInts, weightedIndex, parseList, splitTeams, rollDice } from "../assets/lib/ngau-nhien.js";
import { fmtClock, parseDuration, durationText, lapRows } from "../assets/lib/bam-gio.js";
import { parseItems, toMarkdown, toPlain, move } from "../assets/lib/checklist.js";
import { offsetMin, fromZoned, fmtOffset, vsVietnam, isDst, zoned, dayLabel, CITIES, VN } from "../assets/lib/mui-gio.js";

test("số ngẫu nhiên đều, trong khoảng, không lệch", () => {
  const r = seeded(11);
  const cnt = new Array(6).fill(0);
  for (let i = 0; i < 60000; i++) cnt[randInt(6, r)]++;
  for (const c of cnt) assert.ok(Math.abs(c - 10000) < 400, String(cnt));
  for (let i = 0; i < 1000; i++) { const v = randBetween(-5, 5, r); assert.ok(v >= -5 && v <= 5); }
  const big = randInt(2 ** 40, r); assert.ok(big >= 0 && big < 2 ** 40 && Number.isInteger(big));
  assert.equal(randInt(1, r), 0);
  // bộ sinh trả toàn số lớn vẫn không lệch (bị loại rồi sinh lại)
  let k = 0; const edge = () => (k++ < 3 ? 0xffffffff : 5);
  assert.equal(randInt(10, edge), 5);
});

test("xáo trộn, chọn không trùng, trọng số", () => {
  const r = seeded(5);
  const a = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(shuffle(a, r).sort((x, y) => x - y), a);
  const u = uniqueInts(1, 10, 10, { u32: r });
  assert.deepEqual(u.slice().sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const ex = uniqueInts(1, 5, 3, { exclude: new Set([2, 4]), u32: r });
  assert.deepEqual(ex.slice().sort(), [1, 3, 5]);
  assert.throws(() => uniqueInts(1, 5, 4, { exclude: new Set([2, 4]) }), /Chỉ có 3 số/);
  const huge = uniqueInts(1, 1e12, 50, { u32: r });
  assert.equal(new Set(huge).size, 50);
  const w = [0, 1, 3];
  const c = [0, 0, 0];
  for (let i = 0; i < 8000; i++) c[weightedIndex(w, r)]++;
  assert.equal(c[0], 0);
  assert.ok(Math.abs(c[2] / c[1] - 3) < 0.3, String(c));
  assert.throws(() => weightedIndex([0, 0]), /Tổng trọng số/);
  assert.ok(rollDice(5, 20, r).every((x) => x >= 1 && x <= 20));
});

test("đọc danh sách và trọng số", () => {
  assert.deepEqual(parseList("An\n\n Bình \nChi"), ["An", "Bình", "Chi"]);
  assert.deepEqual(parseList("An, Bình; Chi"), ["An", "Bình", "Chi"]);
  assert.deepEqual(parseList("Giải nhất * 1\nChúc may mắn x5\nGiải ba ×2,5", { weights: true }),
    [{ label: "Giải nhất", weight: 1 }, { label: "Chúc may mắn", weight: 5 }, { label: "Giải ba", weight: 2.5 }]);
  assert.deepEqual(parseList("Phòng 6x8", { weights: true }), [{ label: "Phòng 6", weight: 8 }].map(() => ({ label: "Phòng 6", weight: 8 })));
});

test("chia đội đều, có trưởng nhóm", () => {
  const r = seeded(9);
  const names = Array.from({ length: 11 }, (_, i) => "N" + i);
  const t = splitTeams(names, 3, "teams", { u32: r });
  assert.equal(t.length, 3);
  assert.deepEqual(t.map((x) => x.length).sort(), [3, 4, 4]);
  assert.deepEqual(t.flat().sort(), names.slice().sort());
  const s = splitTeams(names, 5, "size", { u32: r });
  assert.equal(s.length, 3);
  assert.ok(s.every((x) => x.length >= 3 && x.length <= 4));
  const L = splitTeams(names, 2, "teams", { u32: r, leaders: ["A", "B"] });
  assert.ok(L.every((x) => x.includes("A") !== x.includes("B")));
  assert.equal(splitTeams(["a", "b"], 5, "teams", { u32: r }).length, 2);
});

test("định dạng và đọc thời lượng", () => {
  assert.equal(fmtClock(0), "00:00.00");
  assert.equal(fmtClock(65432), "01:05.43");
  assert.equal(fmtClock(3723450), "1:02:03.45");
  assert.equal(fmtClock(61001, { cs: false, up: true }), "01:02");
  assert.equal(fmtClock(60000, { cs: false, up: true }), "01:00");
  assert.equal(fmtClock(5000, { cs: false, hours: true }), "0:00:05");
  assert.equal(parseDuration("5"), 300000);
  assert.equal(parseDuration("90", { bare: "sec" }), 90000);
  assert.equal(parseDuration("5:30"), 330000);
  assert.equal(parseDuration("1:02:03"), 3723000);
  assert.equal(parseDuration("1h20m"), 4800000);
  assert.equal(parseDuration("1 giờ 20 phút"), 4800000);
  assert.equal(parseDuration("2,5 phút"), 150000);
  assert.equal(parseDuration("45s"), 45000);
  assert.equal(parseDuration("1 tiếng 30 giây"), 3630000);
  assert.equal(parseDuration("abc"), null);
  assert.equal(parseDuration("5 phút abc"), null);
  assert.equal(durationText(3900000), "1 giờ 5 phút");
  assert.equal(durationText(45000), "45 giây");
  assert.equal(durationText(0), "0 giây");
});

test("thống kê vòng bấm giờ", () => {
  const r = lapRows([10000, 25000, 33000]);
  assert.deepEqual(r.map((x) => x.lap), [8000, 15000, 10000]);
  assert.equal(r[0].best, true); assert.equal(r[1].worst, true); assert.ok(!r[2].best && !r[2].worst);
  assert.equal(r[0].n, 3);
  assert.ok(!lapRows([1000])[0].best);
});

test("múi giờ: độ lệch, giờ mùa hè, đổi giờ", () => {
  const jan = Date.UTC(2026, 0, 15, 12), jul = Date.UTC(2026, 6, 15, 12);
  assert.equal(offsetMin(VN, jan), 420);
  assert.equal(offsetMin("America/New_York", jan), -300);
  assert.equal(offsetMin("America/New_York", jul), -240);
  assert.equal(offsetMin("Asia/Kolkata", jan), 330);
  assert.equal(offsetMin("Asia/Kathmandu", jan), 345);
  assert.ok(isDst("America/New_York", jul));
  assert.ok(!isDst("America/New_York", jan));
  assert.ok(isDst("Australia/Sydney", jan));
  assert.ok(!isDst(VN, jul));
  assert.equal(fmtOffset(420), "UTC+7");
  assert.equal(fmtOffset(330), "UTC+5:30");
  assert.equal(fmtOffset(-180), "UTC−3");
  assert.equal(vsVietnam("Asia/Tokyo", jan), "Nhanh hơn 2 giờ");
  assert.equal(vsVietnam("America/New_York", jan), "Chậm hơn 12 giờ");
  assert.equal(vsVietnam("Asia/Kolkata", jan), "Chậm hơn 1 giờ 30 phút");
  assert.equal(vsVietnam("Asia/Bangkok", jan), "Cùng giờ Việt Nam");
  // 9:00 sáng ở New York ngày 1/7/2026 = 20:00 cùng ngày ở Việt Nam
  const t = fromZoned("America/New_York", 2026, 7, 1, 9, 0);
  assert.equal(t, Date.UTC(2026, 6, 1, 13, 0));
  const p = zoned(VN, t);
  assert.deepEqual([p.d, p.h, p.mi], [1, 20, 0]);
  assert.equal(fromZoned(VN, 2026, 1, 1, 0, 0), Date.UTC(2025, 11, 31, 17));
  // giờ không tồn tại khi chuyển sang giờ mùa hè (2:30 sáng 8/3/2026 ở New York) → đẩy về sau
  const gap = fromZoned("America/New_York", 2026, 3, 8, 2, 30);
  assert.equal(zoned("America/New_York", gap).h, 3);
  assert.equal(dayLabel({ y: 2026, mo: 1, d: 2, wd: 5 }, { y: 2026, mo: 1, d: 1 }), "Ngày mai");
  assert.equal(dayLabel({ y: 2026, mo: 1, d: 5, wd: 1 }, { y: 2026, mo: 1, d: 1 }), "Thứ hai, 5/1");
  for (const c of CITIES) assert.ok(Number.isFinite(offsetMin(c.zone, jan)), c.zone);
});
test("checklist: đọc Markdown/văn bản, xuất lại, di chuyển", () => {
  const items = parseItems("- [x] Mua vé\n- [ ] Đặt phòng\n\n* Sạc dự phòng\n1. Hộ chiếu\n✓ Đổi tiền\n[X] Xin nghỉ phép\n☐ Thuốc\n- [ ]   \n");
  assert.deepEqual(items, [
    { text: "Mua vé", done: true }, { text: "Đặt phòng", done: false }, { text: "Sạc dự phòng", done: false },
    { text: "Hộ chiếu", done: false }, { text: "Đổi tiền", done: true }, { text: "Xin nghỉ phép", done: true }, { text: "Thuốc", done: false }]);
  assert.equal(toMarkdown(items.slice(0, 2), "Du lịch"), "# Du lịch\n\n- [x] Mua vé\n- [ ] Đặt phòng\n");
  assert.equal(toPlain(items.slice(0, 2)), "☑ Mua vé\n☐ Đặt phòng");
  assert.deepEqual(parseItems(toMarkdown(items)), items);
  assert.deepEqual(move([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(move([1, 2, 3], 2, 0), [3, 1, 2]);
  assert.deepEqual(move([1, 2, 3], 1, 9), [1, 3, 2]);
});
