#!/usr/bin/env node
/* Tạo lại data/don-vi-hanh-chinh.json và data/ma-tinh.json.
   Nguồn: bộ dữ liệu mở DiaChiMoi (MIT, https://github.com/mahiepit/DiaChiMoi), gộp từ
   thanglequoc/vietnamese-provinces-database (danh mục hành chính của Cục Thống kê, 34 tỉnh / 3.321 xã)
   và tranngocminhhieu/vietnamadminunits (bảng chuyển 10.035 xã cũ → mới). Ghim theo commit.
   Chạy:  node scripts/data-dvhc.js  (cần mạng) */
import { writeFile } from "node:fs/promises";
import { ROOT } from "./registry.js";

const COMMIT = "be037ebc23910f50cd44a67bbbdd794ae4581dec";
const URL_ = `https://raw.githubusercontent.com/mahiepit/DiaChiMoi/${COMMIT}/data/diachimoi.json`;
const UPDATED = "2026-10-21";
const src = await (await fetch(URL_)).json();
const c = src.meta.counts;
if (src.np.length !== 34 || src.op.length !== 63) throw new Error("Dữ liệu nguồn không như mong đợi");

/* ---------- đơn vị hành chính ---------- */
const dvhc = {
  title: "đơn vị hành chính (34 tỉnh, " + src.nw.length.toLocaleString("vi-VN") + " xã/phường)",
  updated: UPDATED,
  source: `Danh mục hành chính của Cục Thống kê, cập nhật tới Nghị quyết ${src.meta.current.latestDecree}; bảng chuyển xã cũ → mới tổng hợp từ danhmuchanhchinh.gso.gov.vn và sapnhap.bando.com.vn (bộ dữ liệu mở DiaChiMoi, giấy phép MIT)`,
  license: "MIT – © Thang Le Quoc (vietnamese-provinces-database), © Tran Ngoc Minh Hieu (vietnamadminunits), © DiaChiMoi",
  note: "Xã/phường cũ bị chia cho nhiều xã mới: newCode là mảng, xã mới đầu tiên là nơi chứa trung tâm xã cũ. Địa chỉ cụ thể phụ thuộc vị trí số nhà.",
  counts: { provinces: src.np.length, wards: src.nw.length, oldProvinces: src.op.length, oldDistricts: src.od.length, oldWards: src.ow.length, splitOldWards: c.splitOldWards },
  types: src.types,
  provinces: src.np.map(([code, name, type]) => [code, name, type]),          // [mã, tên, loại]
  wards: src.nw.map(([code, prov, name, type, postal]) => [code, prov, name, type, postal || ""]), // [mã, mã tỉnh, tên, loại, mã bưu chính]
  oldProvinces: src.op,                                                         // [mã, tên, loại, mã tỉnh mới]
  oldDistricts: src.od,                                                         // [mã, mã tỉnh cũ, tên, loại]
  oldWards: src.ow                                                              // [mã, mã huyện cũ, tên, loại, mã xã mới | [mã…]]
};
await writeFile(ROOT + "data/don-vi-hanh-chinh.json", JSON.stringify(dvhc).replace(/\],\[/g, "],\n["));

/* ---------- mã tỉnh trên CCCD và biển số xe ---------- */
// Ký hiệu biển số theo tỉnh cũ (Phụ lục Thông tư 79/2024/TT-BCA); sau sáp nhập mỗi tỉnh mới dùng chung
// các ký hiệu của những tỉnh hợp thành (Thông tư 51/2025/TT-BCA, hiệu lực 01/7/2025).
const PLATES = {
  "01": ["29", "30", "31", "32", "33", "40"], "02": ["23"], "04": ["11"], "06": ["97"], "08": ["22"], "10": ["24"], "11": ["27"],
  "12": ["25"], "14": ["26"], "15": ["21"], "17": ["28"], "19": ["20"], "20": ["12"], "22": ["14"], "24": ["98"], "25": ["19"],
  "26": ["88"], "27": ["99"], "30": ["34"], "31": ["15", "16"], "33": ["89"], "34": ["17"], "35": ["90"], "36": ["18"], "37": ["35"],
  "38": ["36"], "40": ["37"], "42": ["38"], "44": ["73"], "45": ["74"], "46": ["75"], "48": ["43"], "49": ["92"], "51": ["76"],
  "52": ["77"], "54": ["78"], "56": ["79"], "58": ["85"], "60": ["86"], "62": ["82"], "64": ["81"], "66": ["47"], "67": ["48"],
  "68": ["49"], "70": ["93"], "72": ["70"], "74": ["61"], "75": ["39", "60"], "77": ["72"], "79": ["41", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59"],
  "80": ["62"], "82": ["63"], "83": ["71"], "84": ["84"], "86": ["64"], "87": ["66"], "89": ["67"], "91": ["68"], "92": ["65"],
  "93": ["95"], "94": ["83"], "95": ["94"], "96": ["69"]
};
const seen = new Set();
for (const [p, list] of Object.entries(PLATES)) for (const k of list) { if (seen.has(k)) throw new Error("trùng biển " + k); seen.add(k); if (!src.op.find((o) => o[0] === p)) throw new Error("không có tỉnh " + p); }
const maTinh = {
  title: "mã tỉnh trên CCCD và ký hiệu biển số xe",
  updated: UPDATED,
  source: "Cấu trúc số định danh cá nhân 12 số của Bộ Công an (mã tỉnh nơi đăng ký khai sinh 001–096 theo danh mục 63 tỉnh; mã 34 tỉnh mới theo Quyết định 19/2025/QĐ-TTg); ký hiệu biển số theo Thông tư 79/2024/TT-BCA, sửa đổi bởi Thông tư 51/2025/TT-BCA",
  note: "Số CCCD giữ nguyên mã tỉnh nơi đăng ký khai sinh, kể cả khi tỉnh đó đã sáp nhập. Biển số cũ vẫn dùng bình thường, không bắt buộc đổi.",
  provinces: src.np.map(([code, name, type]) => ({ code, name: (type ? "Thành phố " : "Tỉnh ") + name })),
  oldProvinces: src.op.map(([code, name, type, now]) => ({ code, name: (type ? "Thành phố " : "Tỉnh ") + name, now, plates: PLATES[code] })),
  special: { "80": "Cục Cảnh sát giao thông (xe của các cơ quan trung ương, xe có yếu tố nước ngoài)" }
};
await writeFile(ROOT + "data/ma-tinh.json", JSON.stringify(maTinh, null, 1));
console.log(`✓ ${dvhc.provinces.length} tỉnh, ${dvhc.wards.length} xã mới, ${dvhc.oldWards.length} xã cũ; ${seen.size} ký hiệu biển số`);
