import { test } from "node:test";
import assert from "node:assert/strict";
import { fixTyping, typeWord, tonePosition } from "../assets/lib/telex.js";

test("Telex", () => {
  assert.equal(fixTyping("Vieejt Nam").text, "Việt Nam");
  assert.equal(fixTyping("Tieesng Vieejt laf ngoon nguwx cuar nguwowfi Vieejt").text, "Tiếng Việt là ngôn ngữ của người Việt");
  assert.equal(fixTyping("dduwowngf phoos Haf Nooij").text, "đường phố Hà Nội");
  assert.equal(fixTyping("tooi ddi hocj").text, "tôi đi học");
  assert.equal(fixTyping("Chaof cacs banj").text, "Chào các bạn");
  assert.equal(fixTyping("quas gif giaf khuyur").text, "quá gì già khuỷu");
  assert.equal(fixTyping("muwowfi bawts thuowr").text, "mười bắt thuở");
  assert.equal(fixTyping("VIEEJT NAM").text, "VIỆT NAM");
  assert.equal(fixTyping("hoaf thuyr").text, "hòa thủy");
  assert.equal(fixTyping("hoaf thuyr", { style: "new" }).text, "hoà thuỷ");
  assert.equal(fixTyping("xin chafo").text, "xin chào");
  assert.equal(fixTyping("toans hocj").text, "toán học");
  assert.equal(fixTyping("ngoafi khuya").text, "ngoài khuya");
  assert.equal(fixTyping("thuowng").text, "thương");
  assert.equal(fixTyping("uwf").text, "ừ");
});

test("VNI", () => {
  assert.equal(fixTyping("Vie65t Nam", { mode: "vni" }).text, "Việt Nam");
  assert.equal(fixTyping("d9u7o72ng pho61", { mode: "vni" }).text, "đường phố");
  assert.equal(fixTyping("Tie61ng Vie65t", { mode: "auto" }).text, "Tiếng Việt");
});

test("không làm hỏng từ tiếng Anh, số, mã", () => {
  assert.equal(fixTyping("class Windows H2O 2026 abc123 window").text, "class Windows H2O 2026 abc123 window");
  assert.equal(typeWord("hello"), null);
  assert.equal(fixTyping("Vieejt").changed, 1);
});

test("vị trí dấu thanh", () => {
  assert.equal(tonePosition("oa", ""), 0);
  assert.equal(tonePosition("oa", "", "new"), 1);
  assert.equal(tonePosition("oa", "n"), 1);
  assert.equal(tonePosition("ươ", "ng"), 1);
  assert.equal(tonePosition("oai", ""), 1);
  assert.equal(tonePosition("uyê", "n"), 2);
});
