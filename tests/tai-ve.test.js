import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sniffImage, gifDelays, fitSize, extOfKind, isAnimatedKind } from "../assets/lib/anim.js";
import { parseLineLink, packKind, stickerFiles, emojiFiles, pickTitle, packFileName, stickerMetaUrl, emojiMetaUrl } from "../assets/lib/line.js";
import { parseSignalLink, readManifest, packKeys, decrypt, encrypt, hexBytes, manifestUrl, stickerUrl } from "../assets/lib/signal.js";
import { cpToChar, charToCp, readList, filterList, fileName, fileUrl } from "../assets/lib/noto-emoji.js";
import { parseYouTube, parseMany, SIZES, FRAMES, thumbUrl, letterbox, thumbName, oembedUrl } from "../assets/lib/youtube.js";
import { parseDiscord, emojiUrl, stickerUrl as dcStickerUrl, stickerGuesses, readPacks, safeName } from "../assets/lib/discord.js";
import { filterFonts, previewVariant, defaultSubsets, sortSubsets, fileUrl as gfUrl, buildCss, fontDir, licenseDirs, metadataUrl, ghFileUrl, parseMetadata, pickTtf } from "../assets/lib/gfonts.js";
import { parseGitHub, refCandidates, contentsUrl, treeUrl, rawUrl, lfsUrl, treeFiles, isLfsPointer, zipName, rateLimitMinutes } from "../assets/lib/github.js";
import { parseChannel, from7tv, fromFfz, pickScale, emoteFile, previewUrl, mergeEmotes, emoteFileName, API } from "../assets/lib/twitch.js";

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

/* ---------- thumbnail YouTube ---------- */
test("đọc link YouTube", () => {
  const id = "dQw4w9WgXcQ";
  for (const l of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42s", "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc", "https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://youtube.com/embed/dQw4w9WgXcQ?start=3",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "https://www.youtube.com/live/dQw4w9WgXcQ?feature=shared", "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RD",
    "https://www.youtube.com/attribution_link?a=x&u=/watch%3Fv%3DdQw4w9WgXcQ%26feature%3Dshare", " dQw4w9WgXcQ "
  ]) assert.equal(parseYouTube(l), id, l);
  assert.equal(parseYouTube("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseYouTube("https://www.youtube.com/@kenh"), null);
  assert.equal(parseYouTube("https://youtu.be/ngan"), null);
  assert.equal(parseYouTube(""), null);
  assert.deepEqual(parseMany("https://youtu.be/dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=jNQXAC9IVRw, dQw4w9WgXcQ rác"), ["dQw4w9WgXcQ", "jNQXAC9IVRw"]);
});

test("đường dẫn và tên file thumbnail", () => {
  assert.equal(thumbUrl("abc", SIZES[0].try[0]), "https://i.ytimg.com/vi/abc/maxresdefault.jpg");
  assert.deepEqual(SIZES.map((s) => s.w), [1280, 640, 480, 320, 120]);
  assert.deepEqual(FRAMES[1].try.map((t) => t[0]), ["maxres2", "sd2", "hq2"]);
  assert.match(oembedUrl("abc"), /oembed\?format=json&url=https%3A%2F%2Fwww\.youtube\.com%2Fwatch%3Fv%3Dabc$/);
  assert.equal(thumbName("Đi đâu đó – Vlog #1 😀", "abc", "HD", "jpg"), "Di-dau-do-Vlog-1-HD.jpg");
  assert.equal(thumbName("", "abc", "SD", "png"), "youtube-abc-SD.png");
});

test("tìm viền đen của ảnh 4:3", () => {
  const img = (w, h, fill) => { const a = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fill(x, y); a.set([v, v, v, 255], (y * w + x) * 4); } return a; };
  // 64×48 có nội dung 64×36 ở giữa (viền 6 hàng trên, 6 hàng dưới, nhiễu nhẹ)
  const lb = img(64, 48, (x, y) => (y < 6 || y >= 42 ? (x * 7 + y) % 9 : 120 + (x % 50)));
  assert.deepEqual(letterbox(lb, 64, 48), { x: 0, y: 6, w: 64, h: 36 });
  // nội dung có cột tối nhưng không phải viền
  assert.equal(letterbox(img(64, 48, (x) => (x === 10 ? 0 : 200)), 64, 48), null);
  // ảnh tối hoàn toàn: không cắt
  assert.equal(letterbox(img(64, 48, () => 0), 64, 48), null);
  // cả viền dọc (pillarbox)
  assert.deepEqual(letterbox(img(64, 48, (x, y) => (y < 6 || y >= 42 || x < 8 || x >= 56 ? 0 : 160)), 64, 48), { x: 8, y: 6, w: 48, h: 36 });
});

/* ---------- Discord ---------- */
test("đọc emoji, sticker Discord trong văn bản", () => {
  const t = `xem <:pepe_ok:1512891956789776404> và <a:dance:1296295864897245286>
https://cdn.discordapp.com/emojis/1068952931215011862.webp?size=48&name=cat%20jam&quality=lossless&animated=true
https://media.discordapp.net/stickers/781291131828699156.png?size=160
1234567890123456789 https://discord.com/channels/111111111111111111/222222222222222222
<:pepe_ok:1512891956789776404>`;
  const r = parseDiscord(t);
  assert.deepEqual(r.map((x) => [x.type, x.id, x.name, x.animated]), [
    ["emoji", "1512891956789776404", "pepe_ok", false],
    ["emoji", "1296295864897245286", "dance", true],
    ["emoji", "1068952931215011862", "cat jam", true],
    ["sticker", "781291131828699156", "", false],
    ["any", "1234567890123456789", "", false]
  ]);
  assert.equal(r[3].ext, "png");
  assert.deepEqual(parseDiscord("https://cdn.discordapp.com/emojis/1296295864897245286.gif")[0].animated, true);
  assert.deepEqual(parseDiscord("không có gì 12345"), []);
});

test("đường dẫn file Discord và danh sách bộ sticker", () => {
  assert.equal(emojiUrl("1", "png"), "https://cdn.discordapp.com/emojis/1.png?size=4096");
  assert.equal(emojiUrl("1", "webp", 128, true), "https://cdn.discordapp.com/emojis/1.webp?size=128&quality=lossless&animated=true");
  assert.equal(dcStickerUrl("9", "lottie"), "https://cdn.discordapp.com/stickers/9.json");
  assert.equal(dcStickerUrl("9", "apng"), "https://media.discordapp.net/stickers/9.png");
  assert.equal(dcStickerUrl("9", "gif"), "https://media.discordapp.net/stickers/9.gif");
  assert.deepEqual(stickerGuesses("json"), ["lottie", "png", "gif"]);
  assert.deepEqual(stickerGuesses(""), ["png", "lottie", "gif"]);
  const packs = readPacks({ sticker_packs: [
    { id: "796138864933863456", name: "Mallow The Rascal", description: "Mallow…", cover_sticker_id: "796140731256799242", banner_asset_id: "796139192806801428", stickers: [{ id: "796140620111544330", name: "Happy", format_type: 3 }, { id: "2", name: "B", format_type: 2 }] },
    { id: "x", name: "Rỗng", stickers: [] }] });
  assert.equal(packs.length, 1);
  assert.deepEqual(packs[0].stickers.map((s) => s.kind), ["lottie", "apng"]);
  assert.equal(packs[0].cover, "796140731256799242");
  assert.equal(packs[0].banner, "https://cdn.discordapp.com/app-assets/710982414301790216/store/796139192806801428.png?size=512");
  assert.equal(safeName(' a/b:c*"d" . '), "a_b_c_d_");
});

/* ---------- emote Twitch (7TV, FFZ) ---------- */
const STV = {"emotes": [{"id": "01G3WEGZN0000ET2J0MQP5YJ0G", "name": "GAMBA", "data": {"id": "01G3WEGZN0000ET2J0MQP5YJ0G", "name": "GAMBA", "animated": true, "host": {"url": "//cdn.7tv.app/emote/01G3WEGZN0000ET2J0MQP5YJ0G", "files": [{"name": "1x.webp", "width": 39, "height": 32, "format": "WEBP"}, {"name": "2x.webp", "width": 78, "height": 64, "format": "WEBP"}, {"name": "3x.webp", "width": 117, "height": 96, "format": "WEBP"}, {"name": "4x.webp", "width": 156, "height": 128, "format": "WEBP"}, {"name": "1x.gif", "width": 39, "height": 32, "format": "GIF"}, {"name": "2x.gif", "width": 78, "height": 64, "format": "GIF"}, {"name": "3x.gif", "width": 117, "height": 96, "format": "GIF"}, {"name": "4x.gif", "width": 156, "height": 128, "format": "GIF"}, {"name": "4x.avif", "width": 156, "height": 128, "format": "AVIF"}]}}}, {"id": "01EZT9WTYR0002GHH6006GD23G", "name": "Thinking", "data": {"id": "01EZT9WTYR0002GHH6006GD23G", "name": "Thinking", "animated": false, "host": {"url": "//cdn.7tv.app/emote/01EZT9WTYR0002GHH6006GD23G", "files": [{"name": "1x.webp", "width": 32, "height": 32, "format": "WEBP"}, {"name": "2x.webp", "width": 64, "height": 64, "format": "WEBP"}, {"name": "4x.webp", "width": 128, "height": 128, "format": "WEBP"}, {"name": "1x.png", "width": 32, "height": 32, "format": "PNG"}, {"name": "2x.png", "width": 64, "height": 64, "format": "PNG"}, {"name": "4x.png", "width": 128, "height": 128, "format": "PNG"}]}}}]};
const FFZ = { room: { twitch_id: 23161357, id: "lirik", set: 3 }, sets: { 3: { emoticons: [
  { id: 739826, name: "fallDamage", width: 32, height: 32, urls: { 1: "https://cdn.frankerfacez.com/emote/739826/1", 2: "https://cdn.frankerfacez.com/emote/739826/2", 4: "https://cdn.frankerfacez.com/emote/739826/4" }, animated: { 1: "https://cdn.frankerfacez.com/emote/739826/animated/1", 4: "https://cdn.frankerfacez.com/emote/739826/animated/4" } },
  { id: 246878, name: "WideHard", width: 50, height: 20, urls: { 1: "//cdn.frankerfacez.com/emote/246878/1" } }] } } };

test("đọc tên kênh, link Twitch, 7TV", () => {
  assert.deepEqual(parseChannel("https://www.twitch.tv/xQc"), { kind: "login", login: "xqc" });
  assert.deepEqual(parseChannel("m.twitch.tv/lirik/videos?filter=all"), { kind: "login", login: "lirik" });
  assert.deepEqual(parseChannel("@Forsen"), { kind: "login", login: "forsen" });
  assert.deepEqual(parseChannel("71092938"), { kind: "id", id: "71092938" });
  assert.deepEqual(parseChannel("https://7tv.app/users/01fjadw2g00005zw4qczf2jxvq"), { kind: "7tv-user", id: "01FJADW2G00005ZW4QCZF2JXVQ" });
  assert.deepEqual(parseChannel("https://7tv.app/emote-sets/01J9MMS2R800036CR40E1041ED"), { kind: "7tv-set", id: "01J9MMS2R800036CR40E1041ED" });
  assert.equal(parseChannel("https://www.twitch.tv/directory"), null);
  assert.equal(parseChannel("tên có dấu"), null);
  assert.equal(parseChannel(""), null);
  assert.equal(API.ffzRoom("xqc"), "https://api.frankerfacez.com/v1/room/xqc");
});

test("emote 7TV, FFZ: chọn file theo cỡ và định dạng", () => {
  const [gamba, think] = from7tv(STV);
  assert.equal(gamba.animated, true);
  assert.deepEqual([gamba.w, gamba.h], [39, 32]);
  assert.deepEqual(emoteFile(gamba, "conv"), { url: "https://cdn.7tv.app/emote/01G3WEGZN0000ET2J0MQP5YJ0G/4x.gif", ext: "gif" });
  assert.deepEqual(emoteFile(gamba, "orig", 2), { url: "https://cdn.7tv.app/emote/01G3WEGZN0000ET2J0MQP5YJ0G/2x.webp", ext: "webp" });
  assert.deepEqual(emoteFile(think, "conv", 3), { url: "https://cdn.7tv.app/emote/01EZT9WTYR0002GHH6006GD23G/2x.png", ext: "png" });
  assert.equal(previewUrl(think), "https://cdn.7tv.app/emote/01EZT9WTYR0002GHH6006GD23G/2x.webp");
  const [fall, wide] = fromFfz(FFZ);
  assert.equal(fall.animated, true);
  assert.equal(pickScale(fall, 3), 2);
  assert.deepEqual(emoteFile(fall, "conv"), { url: "https://cdn.frankerfacez.com/emote/739826/animated/4.gif", ext: "gif" });
  assert.deepEqual(emoteFile(fall, "orig"), { url: "https://cdn.frankerfacez.com/emote/739826/animated/4.webp", ext: "webp" });
  assert.deepEqual(emoteFile(fall, "orig", 2), { url: "https://cdn.frankerfacez.com/emote/739826/2", ext: "png" }); // cỡ 2 chỉ có ảnh tĩnh
  assert.deepEqual(emoteFile(wide, "conv"), { url: "https://cdn.frankerfacez.com/emote/246878/1", ext: "png" });
  assert.equal(mergeEmotes([gamba, think], [gamba, fall]).length, 3);
  assert.equal(emoteFileName(":) <3", "gif"), "_) _3.gif");
  assert.equal(emoteFileName("", "png", "x1"), "x1.png");
});

/* ---------- Google Fonts ---------- */
const FONTS = [
  { id: "roboto", family: "Roboto", subsets: ["cyrillic", "latin", "latin-ext", "vietnamese"], weights: [100, 400, 700], styles: ["italic", "normal"], defSubset: "latin", category: "sans-serif", type: "google" },
  { id: "be-vietnam-pro", family: "Be Vietnam Pro", subsets: ["latin", "latin-ext", "vietnamese"], weights: [100, 300, 500], styles: ["normal"], defSubset: "latin", category: "sans-serif", type: "google" },
  { id: "lato", family: "Lato", subsets: ["latin", "latin-ext"], weights: [300, 700], styles: ["normal"], defSubset: "latin", category: "sans-serif", type: "google" },
  { id: "abel", family: "Abel", subsets: ["vietnamese", "latin"], weights: [400], styles: ["normal"], defSubset: "latin", category: "serif", type: "google" },
  { id: "khac", family: "Khác", subsets: ["vietnamese"], weights: [400], styles: ["normal"], defSubset: "latin", category: "serif", type: "other" }
];
test("lọc và xếp danh sách Google Fonts", () => {
  assert.deepEqual(filterFonts(FONTS).map((f) => f.id), ["be-vietnam-pro", "roboto", "abel"]);
  assert.deepEqual(filterFonts(FONTS, { vn: false }).map((f) => f.id), ["be-vietnam-pro", "roboto", "abel", "lato"]);
  assert.deepEqual(filterFonts(FONTS, { q: "viet nam" }).map((f) => f.id), ["be-vietnam-pro"]);
  assert.deepEqual(filterFonts(FONTS, { q: "RO" }).map((f) => f.id), ["roboto", "be-vietnam-pro"]);
  assert.deepEqual(filterFonts(FONTS, { category: "serif" }).map((f) => f.id), ["abel"]);
  assert.deepEqual(previewVariant(FONTS[1]), { weight: 300, style: "normal" });
  assert.deepEqual(previewVariant(FONTS[0]), { weight: 400, style: "normal" });
  assert.deepEqual(defaultSubsets(FONTS[0]), ["vietnamese", "latin"]);
  assert.deepEqual(defaultSubsets(FONTS[2]), ["latin"]);
  assert.deepEqual(sortSubsets(["latin", "vietnamese", "cyrillic", "latin-ext"]), ["cyrillic", "vietnamese", "latin-ext", "latin"]);
});
test("đường dẫn file và CSS @font-face", () => {
  assert.equal(gfUrl("roboto", "5.2.8", "vietnamese", 400, "normal", "woff2"), "https://cdn.jsdelivr.net/fontsource/fonts/roboto@5.2.8/vietnamese-400-normal.woff2");
  const css = buildCss({ family: "Be Vietnam Pro", id: "be-vietnam-pro", license: "OFL-1.1", category: "sans-serif", variants: [{ weight: 700, style: "italic" }, { weight: 400, style: "normal" }],
    subsets: ["latin", "vietnamese"], unicodeRange: { vietnamese: "U+0102-0103", latin: "U+0000-00FF" }, formats: ["woff2", "woff"], dir: "assets/fonts" });
  const faces = css.match(/@font-face/g);
  assert.equal(faces.length, 4);
  assert.ok(css.indexOf("font-weight: 400") < css.indexOf("font-weight: 700"));
  assert.ok(css.indexOf("/* vietnamese */") < css.indexOf("/* latin */"));
  assert.match(css, /src: url\("assets\/fonts\/be-vietnam-pro-vietnamese-400-normal\.woff2"\) format\("woff2"\),\n\s+url\("assets\/fonts\/be-vietnam-pro-vietnamese-400-normal\.woff"\) format\("woff"\);/);
  assert.match(css, /unicode-range: U\+0102-0103;/);
  assert.match(css, /font-family: "Be Vietnam Pro", sans-serif;/);
  assert.match(buildCss({ family: "A", id: "a", variants: [{ weight: 400, style: "normal" }], subsets: ["latin"], formats: ["woff2"], dir: "" }), /url\("a-latin-400-normal\.woff2"\)/);
});
test("TTF gốc trong kho google/fonts", () => {
  assert.equal(fontDir("Be Vietnam Pro"), "bevietnampro");
  assert.equal(fontDir("M PLUS 1p"), "mplus1p");
  assert.deepEqual(licenseDirs("Apache-2.0"), ["apache", "ofl", "ufl"]);
  assert.deepEqual(licenseDirs("OFL-1.1"), ["ofl", "apache", "ufl"]);
  assert.equal(metadataUrl("ofl", "Be Vietnam Pro"), "https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/METADATA.pb");
  assert.equal(ghFileUrl("ofl", "Roboto", "Roboto[wdth,wght].ttf"), "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf");
  const stat = parseMetadata(`name: "Be Vietnam Pro"
designer: "Lâm Bảo"
license: "OFL"
fonts {
  name: "Be Vietnam Pro"
  style: "normal"
  weight: 100
  filename: "BeVietnamPro-Thin.ttf"
}
fonts {
  name: "Be Vietnam Pro"
  style: "italic"
  weight: 100
  filename: "BeVietnamPro-ThinItalic.ttf"
}
fonts {
  name: "Be Vietnam Pro"
  style: "normal"
  weight: 400
  filename: "BeVietnamPro-Regular.ttf"
}
subsets: "vietnamese"
source {
  repository_url: "https://github.com/bettergui/BeVietnamPro"
}
`);
  assert.equal(stat.name, "Be Vietnam Pro");
  assert.equal(stat.license, "OFL");
  assert.equal(stat.variable, false);
  assert.deepEqual(stat.fonts.map((f) => f.weight + f.style), ["100normal", "100italic", "400normal"]);
  assert.deepEqual(pickTtf(stat, [400], ["normal"]), ["BeVietnamPro-Regular.ttf"]);
  assert.deepEqual(pickTtf(stat, [100, 400], ["normal", "italic"]), ["BeVietnamPro-Thin.ttf", "BeVietnamPro-ThinItalic.ttf", "BeVietnamPro-Regular.ttf"]);
  const vf = parseMetadata(`name: "Roboto"
license: "OFL"
fonts {
  name: "Roboto"
  style: "normal"
  weight: 400
  filename: "Roboto[wdth,wght].ttf"
}
fonts {
  name: "Roboto"
  style: "italic"
  weight: 400
  filename: "Roboto-Italic[wdth,wght].ttf"
}
axes {
  tag: "wght"
  min_value: 100.0
}
`);
  assert.equal(vf.variable, true);
  assert.deepEqual(pickTtf(vf, [700], ["normal"]), ["Roboto[wdth,wght].ttf"]);
});

/* ---------- Thư mục GitHub ---------- */
test("đọc link GitHub", () => {
  assert.deepEqual(parseGitHub("https://github.com/google/fonts/tree/main/ofl/roboto"), { owner: "google", repo: "fonts", kind: "tree", segs: ["main", "ofl", "roboto"] });
  assert.deepEqual(parseGitHub("github.com/o/r/blob/feature/x/src/a b.js?plain=1#L3"), { owner: "o", repo: "r", kind: "blob", segs: ["feature", "x", "src", "a b.js"] });
  assert.deepEqual(parseGitHub("https://github.com/o/r.git"), { owner: "o", repo: "r", kind: "root", segs: [] });
  assert.deepEqual(parseGitHub("o/r"), { owner: "o", repo: "r", kind: "root", segs: [] });
  assert.deepEqual(parseGitHub("https://raw.githubusercontent.com/o/r/refs/heads/main/a/b.txt"), { owner: "o", repo: "r", kind: "blob", segs: ["main", "a", "b.txt"] });
  assert.deepEqual(parseGitHub("https://github.com/o/r/tree/v1.0"), { owner: "o", repo: "r", kind: "tree", segs: ["v1.0"] });
  for (const bad of ["", "github.com/o", "https://gitlab.com/o/r", "https://github.com/o/r/issues/1", "https://github.com/o/r/tree/", "xin chào"]) assert.equal(parseGitHub(bad), null, bad);
});
test("cách tách nhánh và đường dẫn, URL API", () => {
  assert.deepEqual(refCandidates({ kind: "root", segs: [] }), [{ ref: "HEAD", path: "" }]);
  assert.deepEqual(refCandidates({ kind: "tree", segs: ["feat", "x", "src"] }), [{ ref: "feat", path: "x/src" }, { ref: "feat/x", path: "src" }, { ref: "feat/x/src", path: "" }]);
  assert.deepEqual(refCandidates({ kind: "blob", segs: ["feat", "x", "a.js"] }), [{ ref: "feat", path: "x/a.js" }, { ref: "feat/x", path: "a.js" }]);
  assert.equal(contentsUrl("o", "r", "a b/c", "feat/x"), "https://api.github.com/repos/o/r/contents/a%20b/c?ref=feat%2Fx");
  assert.equal(contentsUrl("o", "r", "", "main"), "https://api.github.com/repos/o/r/contents/?ref=main");
  assert.equal(treeUrl("o", "r", "HEAD"), "https://api.github.com/repos/o/r/git/trees/HEAD?recursive=1");
  assert.equal(rawUrl("o", "r", "feat/x", "a#b.js"), "https://raw.githubusercontent.com/o/r/feat/x/a%23b.js");
  assert.equal(lfsUrl("o", "r", "main", "big.psd"), "https://media.githubusercontent.com/media/o/r/main/big.psd");
});
test("lọc cây file, LFS, tên zip", () => {
  const t = treeFiles({ truncated: false, tree: [
    { path: "src", type: "tree", mode: "040000" }, { path: "src/b.js", type: "blob", mode: "100644", size: 20, sha: "2" },
    { path: "a.md", type: "blob", mode: "100644", size: 10, sha: "1" }, { path: "lib", type: "commit", mode: "160000" }, { path: "ln", type: "blob", mode: "120000", size: 3 }] });
  assert.deepEqual(t.files.map((f) => f.path), ["a.md", "src/b.js"]);
  assert.equal(t.skipped, 2);
  assert.equal(t.truncated, false);
  assert.ok(isLfsPointer(new TextEncoder().encode("version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 123\n")));
  assert.ok(!isLfsPointer(new TextEncoder().encode("hello")));
  assert.equal(zipName("google", "fonts", "ofl/roboto"), "fonts-roboto.zip");
  assert.equal(zipName("o", "r", ""), "r.zip");
  assert.equal(rateLimitMinutes(1000, 1000 * 1000 - 61000), 2);
});
