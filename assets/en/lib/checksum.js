/* Tự sinh bởi scripts/build.js từ assets/lib/checksum.js và i18n/en/js/ — đừng sửa tay. */
/* Checksum file (hàm thuần): đoán thuật toán theo độ dài mã, đọc file danh sách checksum (sha256sum, md5sum, kiểu BSD),
   đối chiếu mã tính được với mã mong đợi, xuất danh sách theo định dạng GNU. */

export const ALGOS = [
  { id: "md5", name: "MD5", hex: 32 },
  { id: "sha1", name: "SHA-1", hex: 40 },
  { id: "sha256", name: "SHA-256", hex: 64 },
  { id: "sha512", name: "SHA-512", hex: 128 },
  { id: "crc32", name: "CRC32", hex: 8 }
];
const BY_ID = Object.fromEntries(ALGOS.map((a) => [a.id, a]));
export const algoName = (id) => (BY_ID[id] ? BY_ID[id].name : id);

/** Chuẩn hoá mã hex: bỏ khoảng trắng, dấu :, chữ thường. Trả "" nếu không phải hex. */
export function normHex(s) {
  const t = String(s || "").trim().replace(/^0x/i, "").replace(/[\s:]/g, "").toLowerCase();
  return /^[0-9a-f]+$/.test(t) ? t : "";
}
/** Các thuật toán có độ dài mã khớp */
export const guessAlgos = (hex) => ALGOS.filter((a) => a.hex === normHex(hex).length).map((a) => a.id);

const BSD = /^(MD5|SHA1|SHA-1|SHA256|SHA-256|SHA512|SHA-512|CRC32)\s*\((.+)\)\s*=\s*([0-9a-fA-F]+)\s*$/;
const GNU = /^\\?([0-9a-fA-F]{8,128})\s+[ *]?(.+?)\s*$/;
/** Đọc nội dung file checksum → [{ hex, name, algo }]. Hỗ trợ "hash  tên", "hash *tên", "SHA256 (tên) = hash", và dòng chỉ có mã. */
export function parseChecksumList(text) {
  const out = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith("#") || l.startsWith(";")) continue;
    let m = BSD.exec(l);
    if (m) { out.push({ hex: m[3].toLowerCase(), name: m[2], algo: m[1].replace("-", "").toLowerCase() }); continue; }
    m = GNU.exec(l);
    if (m) { const hex = m[1].toLowerCase(); out.push({ hex, name: m[2].replace(/^\*/, ""), algo: guessAlgos(hex)[0] || null }); continue; }
    const hex = normHex(l);
    if (hex && guessAlgos(hex).length) out.push({ hex, name: "", algo: guessAlgos(hex)[0] });
  }
  return out;
}

/** Tìm mã mong đợi khớp với một file: results = { algoId: hex }. expected = [{ hex, name, algo }].
    Trả { status: "match"|"mismatch"|"none", algo, expected } — ưu tiên dòng trùng tên file, rồi dòng không có tên. */
export function verify(fileName, results, expected) {
  const base = (n) => String(n || "").split(/[\\/]/).pop().toLowerCase();
  const cands = expected.filter((e) => e.name && base(e.name) === base(fileName));
  const pool = cands.length ? cands : expected.filter((e) => !e.name);
  if (!pool.length) {
    // không có tên: chỉ đối chiếu khi mã khớp với bất kỳ mã nào đã tính
    const hit = expected.find((e) => Object.values(results).includes(e.hex));
    return hit ? { status: "match", algo: Object.keys(results).find((k) => results[k] === hit.hex), expected: hit.hex } : { status: "none" };
  }
  for (const e of pool) for (const [k, v] of Object.entries(results)) if (v === e.hex) return { status: "match", algo: k, expected: e.hex };
  const comparable = pool.find((e) => Object.keys(results).some((k) => BY_ID[k] && BY_ID[k].hex === e.hex.length));
  if (comparable) return { status: "mismatch", algo: Object.keys(results).find((k) => BY_ID[k].hex === comparable.hex.length), expected: comparable.hex };
  return { status: "none" };
}

/** Xuất danh sách kiểu GNU ("hash  tên") cho một thuật toán — dùng được với sha256sum -c */
export const formatGnu = (rows, algo) => rows.filter((r) => r.hashes[algo]).map((r) => `${r.hashes[algo]}  ${r.name}`).join("\n") + "\n";
