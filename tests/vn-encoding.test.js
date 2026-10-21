import { test } from "node:test";
import assert from "node:assert/strict";
import { fromUnicode, toUnicode, detect, fixMojibake, UNI_CHARS } from "../assets/lib/vn-encoding.js";

const S = "Cộng hoà xã hội chủ nghĩa Việt Nam – Độc lập, tự do, hạnh phúc. Người đẹp ở đâu?";

test("Unicode → TCVN3, VNI đúng bảng mã", () => {
  assert.equal(fromUnicode("Cộng hoà xã hội chủ nghĩa Việt Nam", "tcvn3"), "Céng hoµ x· héi chñ nghÜa ViÖt Nam");
  assert.equal(fromUnicode("Cộng hoà xã hội chủ nghĩa Việt Nam", "vni"), "Coäng hoaø xaõ hoäi chuû nghóa Vieät Nam");
  assert.equal(fromUnicode("người đường", "tcvn3"), "ng­êi ®­êng");
  assert.equal(fromUnicode("người đường", "vni"), "ngöôøi ñöôøng");
  assert.equal(fromUnicode("ĐẠI HỌC", "vni"), "ÑAÏI HOÏC");
  assert.equal(fromUnicode("Ăn Đi", "tcvn3"), "¡n §i");
});

test("chuyển đi rồi chuyển về giữ nguyên", () => {
  assert.equal(toUnicode(fromUnicode(S, "vni"), "vni"), S);
  assert.equal(toUnicode(fromUnicode(S, "tcvn3"), "tcvn3"), S);
  assert.equal(toUnicode(fromUnicode(S, "nfd"), "nfd"), S);
  for (const c of UNI_CHARS) assert.equal(toUnicode(fromUnicode(c, "vni"), "vni"), c, c);
  for (const c of UNI_CHARS.filter((c) => c === c.toLowerCase())) assert.equal(toUnicode(fromUnicode(c, "tcvn3"), "tcvn3"), c, c);
});

test("TCVN3 chữ hoa (.VnTimeH)", () => {
  assert.equal(toUnicode("CéNG HOµ X· HéI", "tcvn3"), "CỘNG HOÀ XÃ HỘI");
  assert.equal(toUnicode("céng hoµ", "tcvn3", { upper: "upper" }), "CỘNG HOÀ");
  assert.equal(toUnicode("§éc lËp", "tcvn3"), "Độc lập");
  assert.equal(toUnicode("§éc lËp - Tù do - H¹nh phóc\nVÒ viÖc ban hµnh\nQUYÕT §ÞNH\nCéNG HOµ X· HéI", "tcvn3"), "Độc lập - Tự do - Hạnh phúc\nVề việc ban hành\nQUYẾT ĐỊNH\nCỘNG HOÀ XÃ HỘI");
});

test("sửa UTF-8 bị đọc nhầm", () => {
  const CP = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ";
  const bad = [...new TextEncoder().encode("Việt Nam đẹp lắm")].map((b) => (b >= 0x80 && b < 0xa0 ? CP[b - 0x80] : String.fromCharCode(b))).join("");
  assert.equal(bad, "Viá»‡t Nam Ä‘áº¹p láº¯m");
  assert.equal(fixMojibake(bad), "Việt Nam đẹp lắm");
  assert.equal(detect(bad), "mojibake");
  assert.equal(fixMojibake("Việt Nam"), null);
});

test("đoán bảng mã", () => {
  assert.equal(detect(S), "unicode");
  assert.equal(detect(S.normalize("NFD")), "nfd");
  assert.equal(detect(fromUnicode(S, "tcvn3")), "tcvn3");
  assert.equal(detect(fromUnicode(S, "vni")), "vni");
  assert.equal(detect("Hello world"), "unicode");
  assert.equal(detect("Tr­êng §¹i häc B¸ch khoa"), "tcvn3");
  assert.equal(detect("Tröôøng Ñaïi hoïc Baùch khoa"), "vni");
});
