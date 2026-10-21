import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { seeded } from "../assets/lib/ngau-nhien.js";
import { generatePassword, passwordBits, charsets, generatePassphrase, passphraseBits, wordList, generatePin, durationVi, bitsLevel, AMBIGUOUS } from "../assets/lib/mat-khau.js";
import { encryptBlob, decryptBlob, encryptText, decryptText, parseHeader, isEncrypted, looksEncrypted, toB64, fromB64, HEADER_LEN } from "../assets/lib/ma-hoa.js";
import { base32Decode, base32Encode, hotp, totp, totpRemaining, parseOtpauth, buildOtpauth, groupSecret } from "../assets/lib/totp.js";
import { normHex, guessAlgos, parseChecksumList, verify, formatGnu } from "../assets/lib/checksum.js";

test("sinh mật khẩu: đủ độ dài, đủ mỗi loại ký tự, bỏ ký tự dễ nhầm", () => {
  const r = seeded(7);
  for (let i = 0; i < 200; i++) {
    const p = generatePassword({ length: 8, lower: true, upper: true, digits: true, symbols: true, noAmbiguous: true }, r);
    assert.equal(p.length, 8);
    assert.match(p, /[a-z]/); assert.match(p, /[A-Z]/); assert.match(p, /[0-9]/); assert.match(p, /[^A-Za-z0-9]/);
    for (const c of AMBIGUOUS) assert.ok(!p.includes(c), p);
  }
  assert.equal(generatePassword({ length: 12, digits: true }, r).replace(/\d/g, ""), "");
  assert.equal(generatePassword({ length: 30, lower: true, exclude: "abcdefghijklmnopqrstuvwxy" }, r), "z".repeat(30));
  assert.throws(() => generatePassword({ length: 10 }, r), /ít nhất một loại/);
  assert.equal(charsets({ lower: true, upper: true }).join("").length, 52);
  assert.ok(Math.abs(passwordBits({ length: 16, lower: true, upper: true, digits: true }) - 16 * Math.log2(62)) < 1e-9);
  assert.match(generatePin(6, r), /^\d{6}$/);
});

test("cụm từ dễ nhớ: từ không dấu, có gợi nhớ có dấu", () => {
  const list = wordList();
  assert.ok(list.length > 600);
  assert.equal(new Set(list.map((w) => w.plain)).size, list.length);
  for (const w of list) assert.match(w.plain, /^[a-z]+$/, w.vi);
  const p = generatePassphrase({ words: 5, sep: "-", cap: true, digit: true }, seeded(3));
  assert.equal(p.text.split("-").length, 5);
  assert.equal(p.hint.length, 5);
  assert.match(p.text, /\d/);
  assert.match(p.text, /^[A-Z]/);
  assert.ok(passphraseBits({ words: 6 }) > 55);
});

test("đổi thời gian bẻ khoá ra chữ", () => {
  assert.equal(durationVi(0.2), "dưới 1 giây");
  assert.equal(durationVi(45), "khoảng 45 giây");
  assert.equal(durationVi(3 * 3600 + 100), "khoảng 3 giờ");
  assert.equal(durationVi(400 * 86400), "khoảng 1 năm");
  assert.equal(durationVi(31536000 * 100 * 5000), "khoảng 5 nghìn thế kỷ");
  assert.equal(durationVi(Infinity), "hơn 1 triệu thế kỷ");
  assert.equal(bitsLevel(20).label, "Rất yếu");
  assert.equal(bitsLevel(90).label, "Rất mạnh");
});

test("mã hoá file: giải mã đúng, sai mật khẩu báo lỗi, nhiều khối, phát hiện bị cắt/sửa", async () => {
  const data = new Uint8Array(5000).map((_, i) => (i * 31) & 255);
  const enc = await encryptBlob(new Blob([data]), "mật khẩu 123", { name: "báo cáo.pdf", type: "application/pdf" }, { iterations: 2000, chunkSize: 1024 });
  const head = new Uint8Array(await enc.slice(0, HEADER_LEN).arrayBuffer());
  assert.ok(isEncrypted(head));
  assert.equal(parseHeader(head).chunkSize, 1024);
  assert.equal(enc.size, HEADER_LEN + 5000 + 4 + JSON.stringify({ name: "báo cáo.pdf", type: "application/pdf" }).length + 2 /* 2 byte UTF-8 thừa của chữ có dấu */ + 16 * 5);
  const out = await decryptBlob(enc, "mật khẩu 123");
  assert.deepEqual(out.meta, { name: "báo cáo.pdf", type: "application/pdf" });
  assert.deepEqual(new Uint8Array(await out.blob.arrayBuffer()), data);
  await assert.rejects(decryptBlob(enc, "sai"), /Sai mật khẩu/);
  await assert.rejects(decryptBlob(enc.slice(0, enc.size - 1040), "mật khẩu 123"), /hỏng|bị cắt/);
  const bytes = new Uint8Array(await enc.arrayBuffer());
  bytes[HEADER_LEN + 2000] ^= 1;
  await assert.rejects(decryptBlob(new Blob([bytes]), "mật khẩu 123"), /hỏng|bị cắt/);
  // file rỗng vẫn mã hoá được
  const e0 = await encryptBlob(new Blob([]), "x", {}, { iterations: 1000 });
  assert.equal((await decryptBlob(e0, "x")).blob.size, 0);
  await assert.rejects(decryptBlob(new Blob([new Uint8Array(100)]), "x"), /không phải file/);
});

test("mã hoá văn bản: Base64, giữ dấu tiếng Việt", async () => {
  const s = await encryptText("Hẹn gặp lúc 7 giờ tối ở quán cũ 🙂", "khoá", { iterations: 1000 });
  assert.ok(s.startsWith("QkJFTkMB"));
  assert.ok(looksEncrypted(s));
  assert.ok(!looksEncrypted("xin chào"));
  assert.equal(await decryptText(s, "khoá"), "Hẹn gặp lúc 7 giờ tối ở quán cũ 🙂");
  assert.equal(await decryptText(s.replace(/(.{20})/g, "$1\n"), "khoá"), "Hẹn gặp lúc 7 giờ tối ở quán cũ 🙂");
  await assert.rejects(decryptText(s, "Khoá"), /Sai mật khẩu/);
  await assert.rejects(decryptText("abc", "k"), /Không phải bản mã/);
  for (const n of [0, 1, 2, 3, 10]) { const b = new Uint8Array(n).map((_, i) => i * 7); assert.deepEqual(fromB64(toB64(b)), b); }
  assert.equal(toB64(new TextEncoder().encode("Man")), Buffer.from("Man").toString("base64"));
});

test("Base32 và TOTP theo RFC 6238", async () => {
  assert.equal(base32Encode(new TextEncoder().encode("Hello!")), "JBSWY3DPEE");
  assert.deepEqual(base32Decode("jbsw y3dp-ee======"), new TextEncoder().encode("Hello!"));
  assert.equal(base32Decode("ABC1"), null);
  assert.equal(groupSecret("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP");
  const s1 = new TextEncoder().encode("12345678901234567890");
  const s256 = new TextEncoder().encode("12345678901234567890123456789012");
  const s512 = new TextEncoder().encode("1234567890123456789012345678901234567890123456789012345678901234");
  const V = [[59, "94287082", "46119246", "90693936"], [1111111109, "07081804", "68084774", "25091201"], [1234567890, "89005924", "91819424", "93441116"], [20000000000, "65353130", "77737706", "47863826"]];
  for (const [t, a, b, c] of V) {
    assert.equal(await totp(s1, t * 1000, { digits: 8 }), a);
    assert.equal(await totp(s256, t * 1000, { digits: 8, algo: "SHA256" }), b);
    assert.equal(await totp(s512, t * 1000, { digits: 8, algo: "SHA512" }), c);
  }
  assert.equal(await hotp(s1, 0), "755224"); // RFC 4226
  assert.equal(await hotp(s1, 9), "520489");
  assert.equal(totpRemaining(59000), 1);
  // so với HMAC của Node
  const mac = createHmac("sha1", Buffer.from(s1)).update(Buffer.from([0, 0, 0, 0, 0, 0, 0, 5])).digest();
  const off = mac[19] & 15;
  assert.equal(await hotp(s1, 5), String(((mac.readUInt32BE(off) & 0x7fffffff) % 1e6)).padStart(6, "0"));
});

test("đọc và tạo URI otpauth", () => {
  const p = parseOtpauth("otpauth://totp/ACME%20Co:john@example.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=30");
  assert.equal(p.issuer, "ACME Co"); assert.equal(p.account, "john@example.com");
  assert.equal(p.secret, "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ"); assert.equal(p.digits, 6); assert.equal(p.period, 30); assert.equal(p.type, "totp");
  const q = parseOtpauth("otpauth://totp/GitHub:me?secret=abcd&digits=8&period=60&algorithm=SHA256");
  assert.equal(q.issuer, "GitHub"); assert.equal(q.digits, 8); assert.equal(q.algo, "SHA256"); assert.equal(q.period, 60);
  assert.equal(parseOtpauth("https://x.com"), null);
  const u = buildOtpauth({ secret: "JBSWY3DPEHPK3PXP", issuer: "Công ty A", account: "an@vd.vn" });
  const r = parseOtpauth(u);
  assert.equal(r.issuer, "Công ty A"); assert.equal(r.account, "an@vd.vn"); assert.equal(r.secret, "JBSWY3DPEHPK3PXP");
});

test("checksum: đọc danh sách, đoán thuật toán, đối chiếu", () => {
  assert.equal(normHex(" AB:CD ef "), "abcdef");
  assert.equal(normHex("xyz"), "");
  assert.deepEqual(guessAlgos("d41d8cd98f00b204e9800998ecf8427e"), ["md5"]);
  assert.deepEqual(guessAlgos("a".repeat(64)), ["sha256"]);
  const list = parseChecksumList(`# danh sách
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  rong.txt
d41d8cd98f00b204e9800998ecf8427e *rong.bin
SHA256 (bao cao.pdf) = ${"b".repeat(64)}
${"c".repeat(40)}`);
  assert.equal(list.length, 4);
  assert.deepEqual(list[0], { hex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", name: "rong.txt", algo: "sha256" });
  assert.equal(list[1].name, "rong.bin"); assert.equal(list[1].algo, "md5");
  assert.equal(list[2].name, "bao cao.pdf"); assert.equal(list[2].algo, "sha256");
  assert.equal(list[3].algo, "sha1"); assert.equal(list[3].name, "");
  const res = { md5: "d41d8cd98f00b204e9800998ecf8427e", sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" };
  assert.equal(verify("thu-muc/rong.txt", res, list).status, "match");
  assert.equal(verify("bao cao.pdf", res, list).status, "mismatch");
  assert.equal(verify("khac.zip", res, [{ hex: res.md5, name: "", algo: "md5" }]).status, "match");
  assert.equal(verify("khac.zip", res, [{ hex: "1".repeat(32), name: "", algo: "md5" }]).status, "mismatch");
  assert.equal(verify("khac.zip", res, list.slice(0, 1)).status, "match"); // đổi tên file nhưng mã khớp
  assert.equal(verify("khac.zip", res, list.slice(2, 3)).status, "none");
  assert.equal(formatGnu([{ name: "a.txt", hashes: { sha256: "ab" } }], "sha256"), "ab  a.txt\n");
});
