import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sniffImage, gifDelays, fitSize, extOfKind, isAnimatedKind } from "../assets/lib/anim.js";
import { parseLineLink, packKind, stickerFiles, emojiFiles, pickTitle, packFileName, stickerMetaUrl, emojiMetaUrl } from "../assets/lib/line.js";
import { parseSignalLink, readManifest, packKeys, decrypt, encrypt, hexBytes, manifestUrl, stickerUrl } from "../assets/lib/signal.js";
import { cpToChar, charToCp, readList, filterList, fileName, fileUrl } from "../assets/lib/noto-emoji.js";

/* ---------- ảnh động ---------- */
const png = (chunks) => {
  const out = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (const [type, len] of chunks) { out.push(0, 0, 0, len, ...[...type].map((c) => c.charCodeAt(0)), ...new Array(len + 4).fill(0)); }
  return new Uint8Array(out);
};
const riff = (vp8x, flags) => new Uint8Array([..."RIFF"].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [..."WEBP"].map((c) => c.charCodeAt(0)), [...vp8x].map((c) => c.charCodeAt(0)), [10, 0, 0, 0, flags, 0, 0, 0, 0, 0]));

test("nhận dạng PNG, APNG, WEBP động", () => {
  assert.equal(sniffImage(png([["IHDR", 13], ["acTL", 8], ["IDAT", 4]])), "apng");
  assert.equal(sniffImage(png([["IHDR", 13], ["IDAT", 4], ["acTL", 8]])), "png");
  assert.equal(sniffImage(riff("VP8X", 0x12)), "webp-anim");
  assert.equal(sniffImage(riff("VP8X", 0x10)), "webp");
  assert.equal(sniffImage(riff("VP8 ", 0)), "webp");
  assert.equal(sniffImage(new TextEncoder().encode("GIF89a......")), "gif");
  assert.equal(sniffImage(new Uint8Array([1, 2, 3])), "");
  assert.equal(extOfKind("apng"), "png");
  assert.ok(isAnimatedKind("webp-anim") && !isAnimatedKind("png"));
});

test("thời gian khung GIF làm tròn tích luỹ", () => {
  assert.deepEqual(gifDelays([33, 33, 33]), [30, 40, 30]);
  assert.deepEqual(gifDelays([0, 5]), [20, 20]);
  assert.deepEqual(gifDelays([100, 100]), [100, 100]);
  const d = gifDelays(new Array(30).fill(1000 / 30));
  assert.equal(d.reduce((a, b) => a + b, 0), 1000);
});

test("thu nhỏ theo cạnh dài", () => {
  assert.deepEqual(fitSize(370, 320, 240), { w: 240, h: 208 });
  assert.deepEqual(fitSize(100, 80, 240), { w: 100, h: 80 });
  assert.deepEqual(fitSize(370, 320, 0), { w: 370, h: 320 });
});

/* ---------- LINE ---------- */
test("đọc link sticker, emoji LINE", () => {
  assert.deepEqual(parseLineLink("https://store.line.me/stickershop/product/13321/vi"), { type: "sticker", id: "13321" });
  assert.deepEqual(parseLineLink("https://line.me/S/sticker/6362/?lang=vi&ref=lsh_stickerDetail"), { type: "sticker", id: "6362" });
  assert.deepEqual(parseLineLink("line://shop/detail/11537"), { type: "sticker", id: "11537" });
  assert.deepEqual(parseLineLink("https://line.me/R/shop/sticker/detail/11537"), { type: "sticker", id: "11537" });
  assert.deepEqual(parseLineLink(" 789 "), { type: "sticker", id: "789" });
  assert.deepEqual(parseLineLink("https://store.line.me/emojishop/product/5AC309F0031A6752FB806D8D/en"), { type: "emoji", id: "5ac309f0031a6752fb806d8d" });
  assert.deepEqual(parseLineLink("https://line.me/S/emoji/?id=68df6dd180f1ba31c4b1c608&lang=vi"), { type: "emoji", id: "68df6dd180f1ba31c4b1c608" });
  assert.deepEqual(parseLineLink("68df6dd180f1ba31c4b1c608"), { type: "emoji", id: "68df6dd180f1ba31c4b1c608" });
  assert.equal(parseLineLink("https://store.line.me/themeshop/product/abc"), null);
  assert.equal(parseLineLink("https://example.com/stickershop/product/123"), null);
  assert.equal(parseLineLink(""), null);
  assert.match(stickerMetaUrl(13321), /stickershop\/v1\/product\/13321\/iphone\/productInfo\.meta$/);
  assert.match(emojiMetaUrl("abc"), /sticonshop\/v1\/product\/abc\/iphone\/meta\.json$/);
});

test("loại bộ sticker LINE và file cần tải", () => {
  assert.deepEqual(packKind({ stickerResourceType: "STATIC" }), { anim: "", sound: false, text: false });
  assert.deepEqual(packKind({ stickerResourceType: "ANIMATION_SOUND", hasAnimation: true, hasSound: true }), { anim: "animation", sound: true, text: false });
  assert.deepEqual(packKind({ stickerResourceType: "POPUP_SOUND", hasSound: false }), { anim: "popup", sound: true, text: false });
  assert.deepEqual(packKind({ stickerResourceType: "NAME_TEXT" }), { anim: "", sound: false, text: true });
  assert.deepEqual(packKind({ hasAnimation: true }), { anim: "animation", sound: false, text: false });
  const f = stickerFiles(320983926, packKind({ stickerResourceType: "ANIMATION_SOUND" }));
  assert.match(f.still, /sticker\/320983926\/iPhone\/sticker@2x\.png$/);
  assert.match(f.anim, /sticker_animation@2x\.png$/);
  assert.match(f.sound, /sticker_sound\.m4a$/);
  assert.match(stickerFiles(1, packKind({ stickerResourceType: "POPUP" })).anim, /sticker_popup\.png$/);
  assert.equal(stickerFiles(1, packKind({})).anim, undefined);
  assert.deepEqual(emojiFiles("p", "001", false), { still: "https://stickershop.line-scdn.net/sticonshop/v1/sticon/p/iPhone/001.png" });
  assert.match(emojiFiles("p", "007", true).anim, /\/007_animation\.png$/);
});

test("tên bộ và tên file", () => {
  assert.equal(pickTitle({ en: "Brown", ja: "ブラウン" }, "vi"), "Brown");
  assert.equal(pickTitle({ ja: "ブラウン", ko: "브라운" }, "en"), "ブラウン");
  assert.equal(pickTitle({ "zh-Hant": "熊大" }, "vi"), "熊大");
  assert.equal(packFileName("LINE", 13321, "Brown & Cony: Heart Melting!"), "LINE-13321-Brown-Cony-Heart-Melting");
  assert.equal(packFileName("LINE", 7, "ブラウン"), "LINE-7");
  assert.equal(packFileName("LINE", 7, "Đà Lạt"), "LINE-7-Da-Lat");
});

/* ---------- Signal ---------- */
// manifest.proto (đã mã hoá) của bộ sticker chính thức "Bandit the Cat", lấy từ cdn-ca.signal.org ngày 24/10/2026
const BANDIT = { id: "9acc9e8aba563d26a4994e69263e3b25", key: "5a6dff3948c28efb9b7aaf93ecc375c69fc316e78077ed26867a14d10a0f6a12" };
const BANDIT_MANIFEST = "374f22e2e174380c9ca93d1cfac2d1e5a9d34777d5c600efe0a18af875e974440cefb9c497b8ef54ce1d84a059c9ca5e1bb3b1efb78a5995bce30c5acc7ecdec814c2f75400a6e4b5480b1a3de520f888d72ef25df0f4f549c10379c1e1cd9c72ac7724434079837a019bed4e67f7c8be698f9851c35d208badb95df84be4354280caf84937483c8e25c76b0dc18d58a4569de9b0c30836ecc59862c789ad0043c9ab619bda75eb2dcfc2042885096ff861a58147dc75b72846bba2b6c2d790241159732e67ea79e0de2cf17491e8369e1a1a94d45a88cd36f7da29bd904571ab065fe082a58581490e493eed49e61ed06eb475886a4253649495fd44b5387ed33a84c3b88e0ca6223eb6658ac39d84279837c6948262df382b41aab229215937a52c6cdd6c098e8f2c346582294e68c1fa8f4c3c568e20e4baa421eec476c9cf7593247ad800ee29524c9683f263973";

test("đọc link signal.art", () => {
  assert.deepEqual(parseSignalLink("https://signal.art/addstickers/#pack_id=" + BANDIT.id + "&pack_key=" + BANDIT.key), BANDIT);
  assert.deepEqual(parseSignalLink("sgnl://addstickers/?pack_key=" + BANDIT.key.toUpperCase() + "&pack_id=" + BANDIT.id), BANDIT);
  assert.equal(parseSignalLink("https://signal.art/addstickers/#pack_id=" + BANDIT.id), null);
  assert.equal(parseSignalLink("pack_id=abc&pack_key=def"), null);
  assert.equal(manifestUrl("x"), "https://cdn-ca.signal.org/stickers/x/manifest.proto");
  assert.equal(stickerUrl("x", 3), "https://cdn-ca.signal.org/stickers/x/full/3");
});

test("giải mã và đọc manifest thật của Signal", async () => {
  const keys = await packKeys(BANDIT.key);
  const m = readManifest(await decrypt(hexBytes(BANDIT_MANIFEST), keys));
  assert.equal(m.title, "Bandit the Cat");
  assert.equal(m.author, "Agnes Lee");
  assert.equal(m.cover.id, 24);
  assert.equal(m.stickers.length, 24);
  assert.deepEqual(m.stickers.map((s) => s.id), Array.from({ length: 24 }, (_, i) => i));
  assert.ok(m.stickers.every((s) => s.emoji));
});

test("mã hoá rồi giải mã, phát hiện sai khoá hoặc file hỏng", async () => {
  const keys = await packKeys(BANDIT.key);
  const plain = new TextEncoder().encode("xin chào Signal");
  const enc = await encrypt(plain, keys);
  assert.deepEqual(await decrypt(enc, keys), plain);
  enc[20] ^= 1;
  await assert.rejects(decrypt(enc, keys), /MAC/);
  const other = await packKeys("00".repeat(32));
  await assert.rejects(decrypt(hexBytes(BANDIT_MANIFEST), other), /MAC/);
  await assert.rejects(decrypt(new Uint8Array(10), keys), /ngắn/);
});

/* ---------- emoji Noto ---------- */
test("đổi mã ↔ emoji", () => {
  assert.equal(cpToChar("1f600"), "😀");
  assert.equal(charToCp("👋🏻"), "1f44b_1f3fb");
  assert.equal(cpToChar(charToCp("❤️‍🔥")), "❤️‍🔥");
  assert.equal(fileUrl("1f600", "gif"), "https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.gif");
  assert.equal(fileUrl("1f600", "lottie"), "https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/lottie.json");
});

test("danh sách và tìm emoji (bỏ dấu, theo nhóm, dán emoji)", () => {
  const data = JSON.parse(readFileSync(new URL("../data/noto-emoji.json", import.meta.url), "utf8"));
  assert.ok(data.title && data.updated && data.source);
  const list = readList(data);
  assert.ok(list.length > 800);
  assert.equal(list[0].ch, "😀");
  const tim = filterList(list, "trai tim do");
  assert.ok(tim.some((e) => e.cp === "2764_fe0f"));
  assert.ok(filterList(list, "cười").length > 10);
  assert.ok(filterList(list, "smile").some((e) => e.cp === "1f600"));
  assert.deepEqual(filterList(list, "❤").map((e) => e.cp), ["2764_fe0f"]);
  assert.deepEqual(filterList(list, "😀").map((e) => e.cp), ["1f600"]);
  const g = data.groups.indexOf("Animals and nature");
  assert.ok(filterList(list, "", g).every((e) => e.group === g));
  assert.equal(fileName(list[0], "gif", "mặt cười toe toét"), "1f600-mat-cuoi-toe-toet.gif");
  assert.equal(fileName(list[0], "lottie", ""), "1f600-smile.json");
});
