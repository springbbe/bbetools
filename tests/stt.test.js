import { test } from "node:test";
import assert from "node:assert/strict";
import { energyDb, speechRegions, planWindows, joinWindow, isHallucination, stripHallucinations, collapseRepeats, wrapLines, toCues, stamp, toSrt, toVtt, toText, clock } from "../assets/lib/stt.js";

const SR = 16000;
/** Tín hiệu giả: các đoạn [từ, đến, biên độ] là tiếng (sóng sin 200 Hz), còn lại là nhiễu nhỏ */
function signal(len, parts) {
  const s = new Float32Array(Math.round(len * SR));
  let seed = 7;
  for (let i = 0; i < s.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; s[i] = ((seed / 0x7fffffff) - 0.5) * 0.002; }
  for (const [a, b, amp = 0.3] of parts) for (let i = Math.round(a * SR); i < Math.round(b * SR); i++) s[i] += amp * Math.sin((2 * Math.PI * 200 * i) / SR);
  return s;
}

test("năng lượng theo khung 20 ms và đoạn có tiếng", () => {
  const s = signal(10, [[1, 3], [3.3, 4], [6, 6.05], [7, 9]]);
  const db = energyDb(s, SR);
  assert.equal(db.length, 500);
  assert.ok(db[100] > -20 && db[20] < -50);
  const r = speechRegions(db, { duration: 10 });
  // 1–3 và 3,3–4 gộp (lặng 0,3 giây < 0,5); tiếng 0,05 giây bị bỏ; nới mỗi bên 0,25 giây
  assert.equal(r.length, 2);
  assert.ok(Math.abs(r[0].start - 0.75) < 0.03 && Math.abs(r[0].end - 4.25) < 0.03, JSON.stringify(r));
  assert.ok(Math.abs(r[1].start - 6.75) < 0.03 && Math.abs(r[1].end - 9.25) < 0.03);
  // im lặng hoàn toàn: không có đoạn nào
  assert.deepEqual(speechRegions(energyDb(new Float32Array(SR * 3), SR)), []);
});

test("chia cửa sổ ≤ 28 giây, cắt ở chỗ lặng, bỏ đoạn im lặng", () => {
  // 0–20 giây tiếng, lặng 20–21, 21–40 tiếng, lặng dài 40–70, 70–75 tiếng
  const s = signal(80, [[0, 20], [21, 40], [70, 75]]);
  const w = planWindows(s, SR);
  assert.ok(w.every((x) => x.end - x.start <= 28.001), JSON.stringify(w));
  // chỗ cắt giữa hai đoạn đầu rơi vào khoảng lặng 20–21 giây
  assert.ok(w[0].end > 19.9 && w[0].end < 21.3, JSON.stringify(w));
  // không cửa sổ nào nằm trong khoảng lặng 41–69 giây
  assert.ok(!w.some((x) => x.start > 41 && x.end < 69));
  assert.ok(Math.abs(w[w.length - 1].start - 69.75) < 0.05 && Math.abs(w[w.length - 1].end - 75.25) < 0.05);
  // một đoạn nói liền 60 giây (có chỗ ngừng nhỏ ở 25 giây và 50 giây) vẫn bị chia nhỏ
  const long = signal(60, [[0, 25, 0.3], [25, 25.3, 0.01], [25.3, 50, 0.3], [50, 50.3, 0.01], [50.3, 60, 0.3]]);
  const w2 = planWindows(long, SR);
  assert.ok(w2.length >= 3 && w2.every((x) => x.end - x.start <= 28.001), JSON.stringify(w2));
  assert.ok(Math.abs(w2[0].end - 25.15) < 0.4, JSON.stringify(w2));
  assert.equal(w2[w2.length - 1].end, 60);
});

test("câu bịa quen thuộc và lặp từ", () => {
  assert.ok(isHallucination("Hãy subscribe cho kênh Ghiền Mì Gõ Để không bỏ lỡ những video hấp dẫn"));
  assert.ok(isHallucination("Cảm ơn các bạn đã theo dõi!"));
  assert.ok(isHallucination("Thanks for watching!"));
  assert.ok(isHallucination(" ... "));
  assert.ok(isHallucination("♪♪"));
  assert.ok(!isHallucination("Cảm ơn các bạn đã đến dự buổi họp hôm nay."));
  assert.ok(isHallucination("Nhạc"));
  // cụm bịa lẫn ngay trước lời thật (kết quả thật của large-v3-turbo với bản ghi âm năm 1972)
  assert.equal(stripHallucinations(" Hãy subscribe cho kênh Ghiền Mì Gõ Để không bỏ lỡ những video hấp dẫn Các trẻ từ biện pháp quân sự,"), "Các trẻ từ biện pháp quân sự,");
  // câu bình thường chỉ bỏ khi đứng một mình
  assert.equal(stripHallucinations("Bài thuyết trình đến đây là hết, cảm ơn các bạn đã theo dõi."), "Bài thuyết trình đến đây là hết, cảm ơn các bạn đã theo dõi.");
  assert.equal(collapseRepeats("vâng vâng vâng vâng vâng vâng ạ"), "vâng ạ");
  assert.equal(collapseRepeats("cảm ơn cảm ơn cảm ơn cảm ơn cảm ơn nhé"), "cảm ơn nhé");
  assert.equal(collapseRepeats("có có có được"), "có có có được"); // lặp 3 lần là nói thật, giữ nguyên
});

test("ghép kết quả cửa sổ thành thời gian tuyệt đối", () => {
  const win = { start: 30, end: 55 };
  const segs = joinWindow(win, { chunks: [
    { timestamp: [0, 4.2], text: " Xin chào các bạn." },
    { timestamp: [4.5, null], text: " Hôm nay trời đẹp." },
    { timestamp: [10, 12], text: " Hãy subscribe cho kênh Ghiền Mì Gõ" },
    { timestamp: [12, 40], text: "Hẹn gặp lại." }
  ] });
  assert.deepEqual(segs, [
    { start: 30, end: 34.2, text: "Xin chào các bạn." },
    { start: 34.5, end: 40, text: "Hôm nay trời đẹp." },
    { start: 42, end: 55, text: "Hẹn gặp lại." }
  ]);
  // mô hình không trả mốc thời gian: cả cửa sổ là một đoạn
  assert.deepEqual(joinWindow({ start: 3, end: 9 }, { text: " một hai ba " }), [{ start: 3, end: 9, text: "một hai ba" }]);
  // câu lặp ngay đầu cửa sổ sau bị bỏ
  assert.deepEqual(joinWindow({ start: 9, end: 12 }, { chunks: [{ timestamp: [0, 2], text: "Một hai ba." }] }, [{ start: 3, end: 9, text: "một hai ba" }]), []);
});

test("phụ đề: ngắt dòng, chia đoạn dài, SRT, VTT", () => {
  assert.deepEqual(wrapLines("Chào mừng bạn đến với trang cá nhân của Google, hãy lưu ý", 20), ["Chào mừng bạn đến", "với trang cá nhân", "của Google, hãy lưu", "ý"]);
  const long = "Hãy lưu ý rằng chỉ có một tài khoản chính thức, không có tài khoản phụ. Các tài khoản khác đều là giả mạo, xin cảm ơn mọi người đã quan tâm theo dõi.";
  const cues = toCues([{ start: 0, end: 12, text: long }, { start: 12.5, end: 13, text: "Vâng." }]);
  assert.ok(cues.length >= 3);
  for (const c of cues) {
    const lines = c.text.split("\n");
    assert.ok(lines.length <= 2 && lines.every((l) => l.length <= 42), c.text);
    assert.ok(c.end - c.start <= 7.01 && c.end > c.start);
  }
  assert.equal(cues.map((c) => c.text.replace(/\n/g, " ")).join(" "), long + " Vâng.");
  // ngắt ưu tiên sau dấu chấm
  assert.ok(cues.some((c) => /phụ\.$/.test(c.text)), JSON.stringify(cues));
  // phụ đề quá ngắn được kéo dài tới 1 giây nếu không đè phụ đề sau
  assert.equal(cues[cues.length - 1].end, 13.5);
  // ngắt ở dấu phẩy hoặc trước liên từ, không tách giữa từ ghép (kết quả thật của file mẫu)
  const split = (text, start, end) => toCues([{ start, end, text }]).map((c) => c.text.replace(/\n/g, " "));
  assert.deepEqual(split("Nếu đến thăm vùng Bắc Cực hoặc Nam Cực vào mùa đông, bạn sẽ được trải nghiệm đêm vùng cực, nghĩa là mặt trời không nhú lên khỏi chân trời.", 28, 40),
    ["Nếu đến thăm vùng Bắc Cực hoặc Nam Cực vào mùa đông,", "bạn sẽ được trải nghiệm đêm vùng cực,", "nghĩa là mặt trời không nhú lên khỏi chân trời."]);
  assert.deepEqual(split("Khả năng bay giúp chúng tránh kẻ thù dễ dàng hơn và tìm kiếm thức ăn và bạn tình hiệu quả hơn.", 19, 28),
    ["Khả năng bay giúp chúng tránh kẻ thù dễ dàng hơn", "và tìm kiếm thức ăn và bạn tình hiệu quả hơn."]);
  assert.equal(stamp(3725.5), "01:02:05,500");
  assert.equal(stamp(0.0004, "."), "00:00:00.000");
  const two = [{ start: 1, end: 2.5, text: "Một" }, { start: 3, end: 4, text: "Hai\nba" }];
  assert.equal(toSrt(two), "1\n00:00:01,000 --> 00:00:02,500\nMột\n\n2\n00:00:03,000 --> 00:00:04,000\nHai\nba\n");
  assert.equal(toVtt(two), "WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nMột\n\n00:00:03.000 --> 00:00:04.000\nHai\nba\n");
});

test("văn bản liền mạch, xuống đoạn khi lặng lâu", () => {
  const segs = [{ start: 0, end: 2, text: "Xin chào" }, { start: 2.2, end: 4, text: ", các bạn." }, { start: 8, end: 9, text: "Đoạn mới." }];
  assert.equal(toText(segs), "Xin chào, các bạn.\n\nĐoạn mới.");
  assert.equal(toText(segs, { stamps: true }), "[0:00] Xin chào, các bạn.\n\n[0:08] Đoạn mới.");
  assert.equal(clock(3725), "1:02:05");
  assert.equal(clock(65.9), "1:05");
});
