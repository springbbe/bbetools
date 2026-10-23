import { test } from "node:test";
import assert from "node:assert/strict";
import { packName, isToken, stickerKind, kindOfName, itemName, frameSchedule } from "../assets/lib/telegram.js";

test("đọc tên bộ sticker từ link hoặc tên", () => {
  assert.equal(packName("https://t.me/addstickers/HotCherry"), "HotCherry");
  assert.equal(packName("t.me/addstickers/Animals_by_bot?x=1"), "Animals_by_bot");
  assert.equal(packName("https://telegram.me/addemoji/EmojiPack"), "EmojiPack");
  assert.equal(packName("tg://addstickers?set=My_Pack"), "My_Pack");
  assert.equal(packName("  @Cats2026 "), "Cats2026");
  assert.equal(packName("Cats2026"), "Cats2026");
  assert.equal(packName("https://example.com/addstickers/X"), null);
  assert.equal(packName("tên có dấu"), null);
  assert.equal(packName(""), null);
});

test("kiểm tra dạng token bot", () => {
  assert.ok(isToken("123456789:AAHfiqksKZ8WmR2zSjiQ7_v4TMAKdiHm9T0"));
  assert.ok(!isToken("123456789"));
  assert.ok(!isToken("abc:AAHfiqksKZ8WmR2zSjiQ7_v4TMAKdiHm9T0"));
});

test("loại sticker và tên file", () => {
  assert.equal(stickerKind({ is_animated: true }), "tgs");
  assert.equal(stickerKind({ is_video: true }), "webm");
  assert.equal(stickerKind({}), "webp");
  assert.equal(kindOfName("a.TGS"), "tgs");
  assert.equal(kindOfName("a.txt"), "");
  assert.equal(itemName(6, 120, "webp"), "007.webp");
  assert.equal(itemName(0, 5, "gif"), "01.gif");
});

test("lịch khung hình GIF: thời gian bội số 10 ms, tổng đúng độ dài", () => {
  const s = frameSchedule(3, 30);
  assert.equal(s.length, 90);
  assert.ok(s.every((x) => x.delay % 10 === 0 && x.delay >= 20));
  assert.equal(s.reduce((a, x) => a + x.delay, 0), 3000);
  assert.equal(frameSchedule(2, 60, 50).length, 50);
  assert.equal(frameSchedule(0, 30).length, 1);
});
