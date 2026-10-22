import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTime, fmtTime, fmtDuration, clampRange, fadeGain, applyFade, videoBitrateForSize, suggestBitrate, fitShortSide, estimateBytes, frameTimes, scaleToWidth, peaks, levels, normalizeGain, concatOffsets, pickMime, extForMime, stampName } from "../assets/lib/media.js";
import { splitSpeech, rankVoices, speakSeconds, isLang } from "../assets/lib/tts.js";

test("đọc và viết thời gian", () => {
  assert.equal(parseTime("65"), 65);
  assert.equal(parseTime("1:05"), 65);
  assert.equal(parseTime("1:05,5"), 65.5);
  assert.equal(parseTime("1:05.25"), 65.25);
  assert.equal(parseTime("1:02:03"), 3723);
  assert.equal(parseTime("90:00"), 5400);
  assert.equal(parseTime(" 0:00.5 "), 0.5);
  assert.equal(parseTime(".5"), 0.5);
  for (const bad of ["", "abc", "1:75", "1.5:20", "1:2:3:4", "-3", "1:"]) assert.ok(Number.isNaN(parseTime(bad)), bad);
  assert.equal(fmtTime(65.25), "1:05,3");
  assert.equal(fmtTime(65.25, 2), "1:05,25");
  assert.equal(fmtTime(59.96), "1:00,0");
  assert.equal(fmtTime(3723, 0), "1:02:03");
  assert.equal(fmtTime(-1), "0:00,0");
  assert.equal(fmtTime(NaN, 0), "0:00");
  for (const s of [0, 1.5, 59.9, 61.2, 3599.9, 3723.4]) assert.equal(parseTime(fmtTime(s)), s);
  assert.equal(fmtDuration(12.46), "12,5 giây");
  assert.equal(fmtDuration(205), "3 phút 25 giây");
  assert.equal(fmtDuration(180), "3 phút");
  assert.equal(fmtDuration(3720), "1 giờ 2 phút");
});

test("đoạn cắt luôn hợp lệ", () => {
  assert.deepEqual(clampRange(2, 5, 10), { start: 2, end: 5 });
  assert.deepEqual(clampRange(5, 2, 10), { start: 2, end: 5 });
  assert.deepEqual(clampRange(-1, 20, 10), { start: 0, end: 10 });
  assert.deepEqual(clampRange(NaN, NaN, 10), { start: 0, end: 10 });
  const r = clampRange(9.98, 9.99, 10, 0.5);
  assert.ok(Math.abs(r.end - 10) < 1e-9 && Math.abs(r.start - 9.5) < 1e-9);
  assert.deepEqual(clampRange(0, 1, 0.05, 0.5), { start: 0, end: 0.05 });
});

test("tăng dần, giảm dần", () => {
  assert.equal(fadeGain(5, 10, 2, 2), 1);
  assert.equal(fadeGain(0, 10, 2, 0), 0);
  assert.ok(Math.abs(fadeGain(1, 10, 2, 0) - 0.5) < 1e-9);
  assert.equal(fadeGain(10, 10, 0, 3), 0);
  assert.ok(fadeGain(9, 10, 0, 3) < fadeGain(8, 10, 0, 3));
  assert.equal(fadeGain(3, 10, 0, 0), 1);
  // đoạn ngắn hơn tổng hai hiệu ứng: lấy giá trị nhỏ hơn
  assert.ok(fadeGain(1, 2, 2, 2) <= 0.5 + 1e-9);
  const ch = [new Float32Array(100).fill(1), new Float32Array(100).fill(-1)];
  applyFade(ch, 100, 0, 1, 0.5, 0.5);
  assert.equal(ch[0][0], 0); assert.equal(ch[1][0], -0);
  assert.ok(Math.abs(ch[0][50] - 1) < 1e-6 || ch[0][50] > 0.99);
  assert.ok(ch[0][99] < 0.01);
  assert.ok(ch[0][25] > 0.4 && ch[0][25] < 0.6);
  const same = [new Float32Array(4).fill(0.5)];
  applyFade(same, 4, 0, 1, 0, 0);
  assert.deepEqual([...same[0]], [0.5, 0.5, 0.5, 0.5]);
  // đoạn thứ hai của một luồng: dùng offset
  const tail = [new Float32Array(10).fill(1)];
  applyFade(tail, 10, 9, 10, 0, 1);
  assert.ok(tail[0][0] === 1 && tail[0][9] < 0.05);
});

test("bitrate, kích thước video", () => {
  // 60 giây, muốn 25 MB, âm thanh 128 kbps
  const v = videoBitrateForSize(25e6, 60, 128000);
  assert.ok(Math.abs(v - (25e6 * 8 * 0.97 / 60 - 128000)) < 1);
  assert.ok(estimateBytes(v + 128000, 60) <= 25e6 * 1.0);
  assert.equal(videoBitrateForSize(1e5, 600, 128000), 0);
  assert.equal(videoBitrateForSize(0, 60), 0);
  assert.equal(suggestBitrate(1920, 1080, 30, "medium"), 4040000);
  assert.ok(suggestBitrate(1280, 720, 30, "low") < suggestBitrate(1280, 720, 30, "high"));
  assert.equal(suggestBitrate(1280, 720, 240), suggestBitrate(1280, 720, 60));
  assert.deepEqual(fitShortSide(1920, 1080, 720), [1280, 720]);
  assert.deepEqual(fitShortSide(1080, 1920, 720), [720, 1280]);
  assert.deepEqual(fitShortSide(640, 360, 720), [640, 360]);
  assert.deepEqual(fitShortSide(1001, 563, 0), [1002, 564]);
  assert.deepEqual(fitShortSide(1440, 1080, 480), [640, 480]);
  const [w, h] = fitShortSide(1918, 1078, 480);
  assert.ok(w % 2 === 0 && h % 2 === 0 && h === 480);
});

test("khung hình cho GIF", () => {
  assert.deepEqual(frameTimes(1, 2, 4), [1, 1.25, 1.5, 1.75]);
  assert.equal(frameTimes(0, 10, 10).length, 100);
  assert.equal(frameTimes(0, 100, 30, 300).length, 300);
  assert.deepEqual(frameTimes(0, 0.3, 10), [0, 0.1, 0.2]);
  assert.deepEqual(scaleToWidth(1280, 720, 480), [480, 270]);
  assert.deepEqual(scaleToWidth(320, 240, 480), [320, 240]);
});

test("dạng sóng, âm lượng, nối file", () => {
  const a = new Float32Array([0, 0.5, -0.25, 1, 0, 0, -1, 0.125]);
  const p = peaks([a], 2);
  assert.deepEqual([...p], [-0.25, 1, -1, 0.125]);
  assert.equal(peaks([a], 16).length, 32);
  assert.equal(peaks([new Float32Array(0)], 4).every((x) => x === 0), true);
  const l = levels([new Float32Array([0.5, -0.5, 0.5, -0.5])]);
  assert.ok(Math.abs(l.rms - 0.5) < 1e-9 && l.peak === 0.5);
  const g = normalizeGain({ rms: 0.05, peak: 0.2 }, -18);
  assert.ok(Math.abs(g - 10 ** (-18 / 20) / 0.05) < 1e-9);
  assert.ok(Math.abs(normalizeGain({ rms: 0.05, peak: 0.9 }, -18) - 0.97 / 0.9) < 1e-9); // bị giới hạn bởi đỉnh
  assert.equal(normalizeGain({ rms: 0, peak: 0 }), 1);
  assert.deepEqual(concatOffsets([10, 5, 3], 1), { offsets: [0, 11, 17], total: 20 });
  assert.deepEqual(concatOffsets([4], 2), { offsets: [0], total: 4 });
});

test("định dạng ghi âm, tên file", () => {
  const ok = (m) => ["audio/mp4", "audio/webm;codecs=opus"].includes(m);
  assert.equal(pickMime(ok, ["audio/ogg;codecs=opus", "audio/mp4", "audio/webm;codecs=opus"]), "audio/mp4");
  assert.equal(pickMime(() => false, ["a"]), "");
  assert.equal(pickMime(() => { throw new Error("x"); }, ["a"]), "");
  assert.equal(extForMime("audio/mp4;codecs=mp4a.40.2"), "m4a");
  assert.equal(extForMime("video/mp4;codecs=avc1", true), "mp4");
  assert.equal(extForMime("audio/webm;codecs=opus"), "webm");
  assert.equal(extForMime("audio/ogg;codecs=opus"), "ogg");
  assert.equal(stampName("ghi-am", new Date(2026, 9, 2, 9, 5, 7), "m4a"), "ghi-am-2026-10-02-09h0507.m4a");
});

test("chia câu cho giọng đọc", () => {
  const t = "Xin chào các bạn! Hôm nay trời đẹp. Bạn có khoẻ không?\nCảm ơn…";
  const s = splitSpeech(t);
  assert.deepEqual(s.map((x) => x.text), ["Xin chào các bạn!", "Hôm nay trời đẹp.", "Bạn có khoẻ không?", "Cảm ơn…"]);
  for (const x of s) assert.equal(t.slice(x.start, x.end), x.text);
  // số thập phân và viết tắt có dấu chấm không bị cắt khi không có khoảng trắng sau
  assert.deepEqual(splitSpeech("Giá 1.500.000 đồng, tăng 2.5% so với tháng trước.").map((x) => x.text), ["Giá 1.500.000 đồng, tăng 2.5% so với tháng trước."]);
  // câu dài: cắt ở dấu phẩy, rồi khoảng trắng; không đoạn nào quá max
  const long = Array.from({ length: 30 }, (_, i) => "đoạn số " + i).join(", ") + ".";
  const parts = splitSpeech(long, 60);
  assert.ok(parts.length > 3);
  for (const x of parts) { assert.ok(x.text.length <= 60, x.text); assert.equal(long.slice(x.start, x.end), x.text); }
  const words = Array.from({ length: 50 }, () => "chữ").join(" ");
  for (const x of splitSpeech(words, 40)) assert.ok(x.text.length <= 40);
  const noSpace = "a".repeat(130);
  assert.deepEqual(splitSpeech(noSpace, 50).map((x) => x.text.length), [50, 50, 30]);
  assert.deepEqual(splitSpeech("  ...  \n\n !!! "), []);
  assert.deepEqual(splitSpeech(""), []);
  assert.equal(splitSpeech("Một câu không có dấu chấm").length, 1);
  assert.deepEqual(splitSpeech("Anh nói: “Đi thôi!” Rồi đi.").map((x) => x.text), ["Anh nói:", "“Đi thôi!”", "Rồi đi."]);
});

test("xếp hạng giọng đọc, thời gian đọc", () => {
  const v = [{ name: "Samantha", lang: "en-US", localService: true }, { name: "Linh", lang: "vi-VN", localService: true }, { name: "Microsoft HoaiMy Online (Natural) - Vietnamese", lang: "vi-VN" }, { name: "Google Tiếng Việt", lang: "vi_VN" }];
  const r = rankVoices(v).map((x) => x.name);
  assert.equal(r[r.length - 1], "Samantha");
  assert.equal(r[0], "Linh"); // giọng trên máy trước giọng trực tuyến
  assert.equal(r[1], "Microsoft HoaiMy Online (Natural) - Vietnamese");
  assert.ok(isLang(v[3]) && isLang(v[1]) && !isLang(v[0]));
  assert.equal(Math.round(speakSeconds("một hai ba bốn năm", 1)), 2);
  assert.equal(speakSeconds("một hai ba bốn năm", 2), 1);
});
