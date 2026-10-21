import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { md5, hmacMd5, digest, toHex, utf8 } from "../assets/lib/hash.js";

test("MD5 khớp chuẩn", () => {
  assert.equal(toHex(md5(utf8(""))), "d41d8cd98f00b204e9800998ecf8427e");
  assert.equal(toHex(md5(utf8("The quick brown fox jumps over the lazy dog"))), "9e107d9d372bb6826bd81d3542a419d6");
  for (const n of [55, 56, 63, 64, 65, 1000]) { const s = "Việt".repeat(n); assert.equal(toHex(md5(utf8(s))), createHash("md5").update(s).digest("hex"), "len " + n); }
});

test("HMAC và SHA", async () => {
  assert.equal(toHex(hmacMd5(utf8("khoá"), utf8("dữ liệu"))), createHmac("md5", "khoá").update("dữ liệu").digest("hex"));
  assert.equal(toHex(hmacMd5(utf8("k".repeat(100)), utf8("x"))), createHmac("md5", "k".repeat(100)).update("x").digest("hex"));
  for (const a of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
    const node = a.replace("-", "").toLowerCase();
    assert.equal(toHex(await digest(a, utf8("Xin chào"))), createHash(node).update("Xin chào").digest("hex"));
    assert.equal(toHex(await digest(a, utf8("Xin chào"), utf8("bí mật"))), createHmac(node, "bí mật").update("Xin chào").digest("hex"));
  }
  assert.equal(toHex(await digest("SHA-256", utf8("a"), new Uint8Array())), createHash("sha256").update("a").digest("hex"));
});
