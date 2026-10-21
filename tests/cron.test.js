import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCron, describe, nextRuns } from "../assets/lib/cron.js";

const d = (e) => describe(parseCron(e));
const vn = (ms) => new Date(ms + 7 * 3600000).toISOString().slice(0, 16).replace("T", " ");
const FROM = Date.UTC(2026, 9, 21, 3, 0); // 10:00 21/10/2026 giờ VN (thứ Tư)

test("diễn giải tiếng Việt", () => {
  assert.equal(d("0 9 * * 1-5"), "Lúc 09:00, từ thứ Hai đến thứ Sáu.");
  assert.equal(d("*/5 * * * *"), "Mỗi 5 phút.");
  assert.equal(d("* * * * *"), "Mỗi phút.");
  assert.equal(d("30 2 * * *"), "Lúc 02:30, hằng ngày.");
  assert.equal(d("@daily"), "Lúc 00:00, hằng ngày.");
  assert.equal(d("0 0 1 1 *"), "Lúc 00:00, ngày 1, tháng 1.");
  assert.equal(d("0 8,12,18 * * *"), "Lúc 08:00, 12:00 và 18:00, hằng ngày.");
  assert.equal(d("15 * * * *"), "Vào phút 15 của mỗi giờ.");
  assert.equal(d("0 */2 * * *"), "Vào phút 0, mỗi 2 giờ.");
  assert.equal(d("*/10 9-17 * * MON-FRI"), "Mỗi 10 phút, từ 09:00 đến 17:59, từ thứ Hai đến thứ Sáu.");
  assert.equal(d("0 0 L * *"), "Lúc 00:00, ngày cuối tháng.");
  assert.equal(d("0 10 * * 5L"), "Lúc 10:00, thứ Sáu cuối cùng của tháng.");
  assert.equal(d("0 10 * * 1#2"), "Lúc 10:00, thứ Hai thứ 2 của tháng.");
  assert.equal(d("0 0 * * 6,0"), "Lúc 00:00, thứ Bảy và Chủ nhật.");
  assert.equal(d("*/30 * * * * *"), "Mỗi 30 giây.");
});

test("báo lỗi rõ ràng", () => {
  assert.throws(() => parseCron("* * *"), /Cần 5 trường/);
  assert.throws(() => parseCron("60 * * * *"), /phút: 60 nằm ngoài khoảng 0–59/);
  assert.throws(() => parseCron("* * * FOO *"), /tháng: “foo”/);
  assert.throws(() => parseCron("@reboot"), /khởi động/);
  assert.throws(() => parseCron("*/0 * * * *"), /bước nhảy/);
});

test("các lần chạy tới (giờ Việt Nam)", () => {
  assert.deepEqual(nextRuns(parseCron("0 9 * * 1-5"), FROM, 3).map(vn), ["2026-10-22 09:00", "2026-10-23 09:00", "2026-10-26 09:00"]);
  assert.deepEqual(nextRuns(parseCron("*/15 * * * *"), FROM, 2).map(vn), ["2026-10-21 10:15", "2026-10-21 10:30"]);
  assert.deepEqual(nextRuns(parseCron("0 0 L * *"), FROM, 2).map(vn), ["2026-10-31 00:00", "2026-11-30 00:00"]);
  assert.deepEqual(nextRuns(parseCron("0 0 29 2 *"), FROM, 1).map(vn), ["2028-02-29 00:00"]);
  assert.deepEqual(nextRuns(parseCron("0 10 * * 1#2"), FROM, 1).map(vn), ["2026-11-09 10:00"]);
  assert.deepEqual(nextRuns(parseCron("0 0 13 * 5"), FROM, 2).map(vn), ["2026-10-23 00:00", "2026-10-30 00:00"]);
  assert.deepEqual(nextRuns(parseCron("0 0 * * *"), FROM, 1, 0).map((ms) => new Date(ms).toISOString()), ["2026-10-22T00:00:00.000Z"]);
});
