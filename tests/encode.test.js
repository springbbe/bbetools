import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeBase64, decodeBase64, base64ToBytes, bytesToBase64, urlEncode, urlDecode, parseUrl, encodeEntities, decodeEntities, decodeJwt, jwtTimes } from "../assets/lib/encode.js";

test("Base64 UTF-8", () => {
  assert.equal(encodeBase64("Việt Nam"), Buffer.from("Việt Nam").toString("base64"));
  assert.equal(decodeBase64("Vmnhu4d0IE5hbQ==").text, "Việt Nam");
  assert.equal(decodeBase64("Vmnhu4d0IE5hbQ").text, "Việt Nam");
  assert.equal(encodeBase64("??>", { urlSafe: true }), "Pz8-");
  assert.equal(decodeBase64("Pz8-").text, "??>");
  assert.equal(decodeBase64("data:text/plain;base64,SGk=").text, "Hi");
  assert.equal(decodeBase64(" SG\nk= ").text, "Hi");
  assert.equal(decodeBase64("/w==").binary, true);
  assert.throws(() => base64ToBytes("ab$c"), /Ký tự “\$”/);
  assert.throws(() => base64ToBytes("abcde"), /độ dài/);
  for (let n = 0; n < 20; n++) { const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 255); assert.deepEqual([...base64ToBytes(bytesToBase64(b))], [...b]); assert.equal(bytesToBase64(b), Buffer.from(b).toString("base64")); }
  assert.equal(bytesToBase64(new Uint8Array(60), { wrap: 76 }).split("\n").length, 2);
});

test("URL", () => {
  assert.equal(urlEncode("a b&c=đ"), "a%20b%26c%3D%C4%91");
  assert.equal(urlEncode("a b", "form"), "a+b");
  assert.equal(urlEncode("https://vi.wikipedia.org/wiki/Hà Nội?q=1", "uri"), "https://vi.wikipedia.org/wiki/H%C3%A0%20N%E1%BB%99i?q=1");
  assert.equal(urlEncode("(it's)"), "%28it%27s%29");
  assert.equal(urlDecode("a+b%20%C4%91"), "a b đ");
  assert.equal(urlDecode("a+b", { plus: false }), "a+b");
  assert.equal(urlDecode("100% %E1"), "100% %E1");
  const u = parseUrl("https://user@shop.vn:8080/san-pham/áo?mau=%C4%91%E1%BB%8F&size=M&size=L#mo-ta");
  assert.equal(u.host, "shop.vn"); assert.equal(u.port, "8080"); assert.equal(u.path, "/san-pham/áo");
  assert.deepEqual(u.params, [["mau", "đỏ"], ["size", "M"], ["size", "L"]]);
  assert.equal(parseUrl("example.com/a?b=1").host, "example.com");
  assert.equal(parseUrl("không phải url"), null);
});

test("HTML entity", () => {
  assert.equal(encodeEntities(`<a href="x">Tôi & bạn's</a>`), "&lt;a href=&quot;x&quot;&gt;Tôi &amp; bạn&#39;s&lt;/a&gt;");
  assert.equal(encodeEntities("é ơ 😀", { mode: "nonascii" }), "&eacute; &#417; &#128512;");
  assert.equal(encodeEntities("é", { mode: "nonascii", style: "hex" }), "&#xE9;");
  assert.equal(decodeEntities("&lt;b&gt; &amp;amp; &#417; &#x1F600; &copy; &unknown; &amp"), "<b> &amp; ơ 😀 © &unknown; &amp");
  assert.equal(decodeEntities("&hearts;", (m) => (m === "&hearts;" ? "♥" : null)), "♥");
});

test("JWT", () => {
  const tok = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const j = decodeJwt("Bearer " + tok);
  assert.equal(j.header.alg, "HS256"); assert.equal(j.payload.name, "John Doe"); assert.equal(j.signature.length, 32);
  assert.equal(jwtTimes(j.payload).iat.toISOString(), "2018-01-18T01:30:22.000Z");
  assert.equal(jwtTimes({ exp: 100 }, 200000).expired, true);
  assert.throws(() => decodeJwt("abc"), /3 phần/);
  assert.throws(() => decodeJwt("a.b.c.d.e"), /JWE/);
  assert.throws(() => decodeJwt("e30.bm90IGpzb24.x"), /payload không phải JSON/);
});

test("JWT: kiểm tra chữ ký HMAC, RSA, ECDSA", async () => {
  const { verifyJwt } = await import("../assets/lib/encode.js");
  const { generateKeyPairSync, createSign, sign } = await import("node:crypto");
  const tok = decodeJwt("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
  assert.equal(await verifyJwt(tok, "your-256-bit-secret"), true);
  assert.equal(await verifyJwt(tok, "sai"), false);
  await assert.rejects(verifyJwt(tok, ""), /Nhập khoá/);
  const b64u = (x) => Buffer.from(x).toString("base64url");
  const make = (alg, signer) => { const si = b64u(JSON.stringify({ alg, typ: "JWT" })) + "." + b64u(JSON.stringify({ sub: "an" })); return decodeJwt(si + "." + b64u(signer(si))); };
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = rsa.publicKey.export({ type: "spki", format: "pem" });
  const rs = make("RS256", (si) => createSign("SHA256").update(si).sign(rsa.privateKey));
  assert.equal(await verifyJwt(rs, pem), true);
  assert.equal(await verifyJwt(rs, JSON.stringify(rsa.publicKey.export({ format: "jwk" }))), true);
  assert.equal(await verifyJwt(rs, pem.replace(/\n/g, " ")), true);
  await assert.rejects(verifyJwt(rs, rsa.privateKey.export({ type: "pkcs8", format: "pem" })), /khoá bí mật/);
  const ec = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const es = make("ES256", (si) => sign("SHA256", Buffer.from(si), { key: ec.privateKey, dsaEncoding: "ieee-p1363" }));
  assert.equal(await verifyJwt(es, ec.publicKey.export({ type: "spki", format: "pem" })), true);
  await assert.rejects(verifyJwt(es, pem), /không khớp thuật toán ES256/);
});
