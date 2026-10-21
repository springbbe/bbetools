import { test } from "node:test";
import assert from "node:assert/strict";
import { sniff, kindsOf, accepts, acceptAttr } from "../assets/lib/filetype.js";

const bytes = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

test("nhận diện magic bytes", () => {
  assert.equal(sniff(bytes("%PDF-1.7\n")), "pdf");
  assert.equal(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])), "image");
  assert.equal(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])), "image");
  assert.equal(sniff(bytes("\0\0\0\x18ftypheic\0\0\0\0")), "heic");
  assert.equal(sniff(bytes("\0\0\0\x1cftypavif\0\0\0\0")), "image");
  assert.equal(sniff(bytes("\0\0\0\x20ftypisom\0\0\0\0")), "video");
  assert.equal(sniff(bytes("RIFF\0\0\0\0WEBPVP8 ")), "image");
  assert.equal(sniff(bytes("RIFF\0\0\0\0WAVEfmt ")), "audio");
  assert.equal(sniff(bytes("ID3\x04\0\0")), "audio");
  assert.equal(sniff(bytes('<?xml version="1.0"?><svg xmlns="x">')), "svg");
});

test("loại file theo tên, MIME và nội dung", () => {
  assert.deepEqual(kindsOf({ name: "a.PDF", type: "" }), ["pdf", "any"]);
  assert.ok(kindsOf({ name: "IMG_1234.HEIC", type: "" }).includes("heic"));
  // file đặt đuôi .jpg nhưng thật ra là HEIC
  const k = kindsOf({ name: "anh.jpg", type: "image/jpeg" }, bytes("\0\0\0\x18ftypheic\0\0\0\0"));
  assert.ok(k.includes("heic") && !k.includes("image"));
  assert.ok(kindsOf({ name: "bang.xlsx", type: "" }).includes("excel"));
  assert.ok(accepts(["image", "heic"], kindsOf({ name: "x.png", type: "image/png" })));
  assert.ok(!accepts(["pdf"], kindsOf({ name: "x.png", type: "image/png" })));
  assert.ok(accepts(["any"], kindsOf({ name: "x.bin", type: "" })));
});

test("thuộc tính accept", () => {
  assert.equal(acceptAttr(["pdf"]), "application/pdf,.pdf");
  assert.equal(acceptAttr(["any"]), "");
  assert.ok(acceptAttr(["heic"]).includes(".heic"));
});
