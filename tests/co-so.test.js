import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInBase, toBase, group, twosComplement, parseMode, modeToSymbolic, modeToOctal, modeToBits } from "../assets/lib/co-so.js";

test("đổi cơ số với BigInt", () => {
  assert.equal(parseInBase("ff", 16), 255n);
  assert.equal(parseInBase("0xFF", 16), 255n);
  assert.equal(parseInBase("0b1010", 0), 10n);
  assert.equal(parseInBase("1_000 000", 10), 1000000n);
  assert.equal(parseInBase("-777", 8), -511n);
  assert.equal(toBase(255n, 2), "11111111");
  assert.equal(toBase(255n, 16, true), "FF");
  assert.equal(toBase(-10n, 2), "-1010");
  assert.equal(toBase(35n, 36), "z");
  assert.equal(toBase(parseInBase("123456789012345678901234567890", 10), 16), "18ee90ff6c373e0ee4e3f0ad2");
  assert.throws(() => parseInBase("129", 8), /Chữ số “9” không có trong hệ cơ số 8/);
  assert.throws(() => parseInBase("", 10), /Chưa nhập/);
  assert.equal(group("11010110", 4), "1101 0110");
  assert.equal(group("1234567", 3, "."), "1.234.567");
  assert.equal(twosComplement(-1n, 8), "11111111");
  assert.equal(twosComplement(-128n, 8), "10000000");
  assert.equal(twosComplement(-129n, 8), null);
  assert.equal(twosComplement(5n, 8), "00000101");
});

test("chmod", () => {
  assert.equal(modeToSymbolic(0o755), "rwxr-xr-x");
  assert.equal(modeToSymbolic(0o644), "rw-r--r--");
  assert.equal(modeToSymbolic(0o4755), "rwsr-xr-x");
  assert.equal(modeToSymbolic(0o1777), "rwxrwxrwt");
  assert.equal(modeToSymbolic(0o2644), "rw-r-Sr--");
  assert.equal(parseMode("755"), 0o755);
  assert.equal(parseMode("-rw-r--r--"), 0o644);
  assert.equal(parseMode("drwxr-xr-x"), 0o755);
  assert.equal(parseMode("rwsr-xr-x"), 0o4755);
  assert.equal(parseMode("u=rwx,g=rx,o=r"), 0o754);
  assert.equal(parseMode("a+x", 0o644), 0o755);
  assert.equal(parseMode("go-w", 0o777), 0o755);
  assert.equal(parseMode("+t", 0o777), 0o1777);
  assert.throws(() => parseMode("abc"), /Không hiểu/);
  assert.equal(modeToOctal(0o755), "755");
  assert.equal(modeToOctal(0o4755), "4755");
  assert.equal(modeToOctal(0o7), "007");
  assert.deepEqual(modeToBits(0o640).group, { r: true, w: false, x: false });
});
