/* Tự sinh bởi scripts/build.js từ assets/lib/vietqr.js và i18n/en/js/ — đừng sửa tay. */
/* VietQR: chuỗi QR chuyển khoản theo chuẩn EMVCo Merchant-Presented QR mà NAPAS dùng cho Napas 247.
   Hàm thuần: tạo chuỗi, đọc ngược chuỗi, tính CRC-16/CCITT-FALSE. Test ở tests/vietqr.test.js. */

import { stripAccents } from "./search.js";

export const NAPAS_GUID = "A000000727";
export const SERVICE = { account: "QRIBFTTA", card: "QRIBFTTC" };

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) trên các byte UTF-8 → 4 ký tự hex in hoa */
export function crc16(str) {
  const bytes = new TextEncoder().encode(str);
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Một trường TLV: id 2 ký tự + độ dài 2 chữ số + giá trị */
export function tlv(id, value) {
  const v = String(value);
  const len = new TextEncoder().encode(v).length;
  if (len > 99) throw new Error("Field " + id + " is longer than 99 characters");
  return id + String(len).padStart(2, "0") + v;
}

/** Nội dung chuyển khoản: bỏ dấu, chỉ giữ chữ, số và khoảng trắng (ngân hàng thường từ chối ký tự khác) */
export function cleanMessage(s, max = 50) {
  return stripAccents(s || "").replace(/[^A-Za-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanAccount(s) {
  return String(s || "").replace(/[\s.-]/g, "").toUpperCase();
}

/**
 * Tạo chuỗi VietQR.
 * @param {{bin:string, account:string, amount?:number|string, message?:string, service?:"account"|"card"}} p
 */
export function buildVietQR(p) {
  const bin = String(p.bin || "").trim();
  const account = cleanAccount(p.account);
  if (!/^\d{6}$/.test(bin)) throw new Error("The bank code (BIN) must be 6 digits");
  if (!/^[A-Z0-9]{1,19}$/.test(account)) throw new Error("The account/card number may only contain letters and digits, up to 19 characters");
  const amount = p.amount == null || p.amount === "" ? 0 : Number(String(p.amount).replace(/[^\d]/g, ""));
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid amount");
  if (String(amount).length > 13) throw new Error("Amount too large");
  const message = cleanMessage(p.message);
  const service = SERVICE[p.service || "account"] || SERVICE.account;

  const beneficiary = tlv("00", bin) + tlv("01", account);
  const merchant = tlv("00", NAPAS_GUID) + tlv("01", beneficiary) + tlv("02", service);
  let s = tlv("00", "01") + tlv("01", amount > 0 ? "12" : "11") + tlv("38", merchant) + tlv("53", "704");
  if (amount > 0) s += tlv("54", String(amount));
  s += tlv("58", "VN");
  if (message) s += tlv("62", tlv("08", message));
  s += "6304";
  return s + crc16(s);
}

/** Tách chuỗi TLV thành mảng { id, value } (không đệ quy) */
export function parseTLV(str) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    if (i + 4 > str.length) throw new Error("The TLV string is truncated");
    const id = str.slice(i, i + 2), len = +str.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(str.slice(i + 2, i + 4))) throw new Error("Invalid TLV format");
    const value = str.slice(i + 4, i + 4 + len);
    if (value.length !== len) throw new Error("Length of field " + id + " doesn't match");
    out.push({ id, value });
    i += 4 + len;
  }
  return out;
}

const toMap = (list) => Object.fromEntries(list.map((x) => [x.id, x.value]));

/**
 * Đọc chuỗi EMV QR (VietQR). Trả về null nếu không phải chuỗi EMV.
 * { crcOk, napas, bin, account, service, amount, message, currency, country, fields }
 */
export function parseVietQR(str) {
  str = String(str || "").trim();
  if (!/^000201/.test(str)) return null;
  let top;
  try { top = parseTLV(str); } catch (_) { return null; }
  const f = toMap(top);
  const crcField = top.find((x) => x.id === "63");
  const crcOk = !!crcField && str.endsWith("63" + "04" + crcField.value) && crc16(str.slice(0, -4)) === crcField.value.toUpperCase();
  const res = { crcOk, napas: false, fields: f, currency: f["53"] || "", country: f["58"] || "", amount: f["54"] ? Number(f["54"]) : 0, message: "" };
  if (f["62"]) { try { res.message = toMap(parseTLV(f["62"]))["08"] || ""; } catch (_) {} }
  if (f["38"]) {
    try {
      const m = toMap(parseTLV(f["38"]));
      if (m["00"] === NAPAS_GUID) {
        res.napas = true;
        res.service = m["02"] || "";
        const b = toMap(parseTLV(m["01"] || ""));
        res.bin = b["00"] || "";
        res.account = b["01"] || "";
      }
    } catch (_) {}
  }
  return res;
}
