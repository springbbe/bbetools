import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  textWidth, soVanBan, kyHieu, soKyHieu, ngayThang, vv, canCu, kinhGui, noiNhan, nguoiKy, ketThuc, inline,
  parseBody, kinhGuiLayout, docModel, docxParts, pageLayout, listItems
} from "../assets/lib/van-ban-hc.js";

const spec = JSON.parse(readFileSync(new URL("../data/the-thuc-van-ban.json", import.meta.url), "utf8"));

test("dữ liệu thể thức khớp Phụ lục I NĐ 30/2020", () => {
  assert.ok(spec.title && spec.updated && spec.source);
  assert.deepEqual(spec.margins, { top: [20, 25], bottom: [20, 25], left: [30, 35], right: [15, 20] });
  assert.equal(spec.font, "Times New Roman");
  assert.equal(spec.quocHieu, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM");
  assert.equal(spec.tieuNgu, "Độc lập - Tự do - Hạnh phúc");
  for (const s of Object.values(spec.sizes)) {
    assert.ok(s.quocHieu >= 12 && s.quocHieu <= 13 && s.tieuNgu >= 13 && s.tieuNgu <= 14);
    assert.ok(s.coQuan >= 12 && s.coQuan <= 13 && s.so === 13 && s.body >= 13 && s.body <= 14);
    assert.equal(s.noiNhanTieuDe, 12); assert.equal(s.noiNhan, 11);
    assert.equal(s.tieuNgu - s.quocHieu, 1); // tăng, giảm thống nhất
  }
  const ab = Object.fromEntries(spec.types.map((t) => [t.id, t.abbr]));
  assert.equal(ab["quyet-dinh"], "QĐ"); assert.equal(ab["to-trinh"], "TTr"); assert.equal(ab["chuong-trinh"], "CTr");
  assert.equal(ab["giay-moi"], "GM"); assert.equal(ab["de-an"], "ĐA"); assert.equal(ab["cong-van"], "");
  assert.equal(new Set(spec.types.map((t) => t.id)).size, spec.types.length);
});

test("bề rộng chữ Times New Roman", () => {
  // "Hà Nội" = H 722 + a 444 + space 250 + N 722 + o 500 + i 278 = 2916 → 14 pt
  assert.equal(textWidth("Hà Nội", 14), 2.916 * 14);
  assert.equal(textWidth("ơ", 10), 5.29);
  assert.equal(textWidth("Ư", 10, true), 7.96);
  assert.equal(textWidth("Đ", 10, true), textWidth("D", 10, true));
  // Quốc hiệu cỡ 13 đậm ≈ 96 mm: vừa cột phải rộng 100 mm
  const mm = (textWidth(spec.quocHieu, 13, true) * 25.4) / 72;
  assert.ok(mm > 94 && mm < 98, String(mm));
});

test("số, ký hiệu văn bản", () => {
  assert.equal(soVanBan("5"), "05");
  assert.equal(soVanBan(" 12 "), "12");
  assert.equal(soVanBan(""), "");
  assert.equal(kyHieu("QĐ", "UBND", ""), "QĐ-UBND");
  assert.equal(kyHieu("", "UBND", "VX"), "UBND-VX");      // công văn
  assert.equal(kyHieu("TTr", "S NV", ""), "TTr-SNV");     // không cách chữ
  assert.equal(soKyHieu("7", "QĐ-BNV"), "Số: 07/QĐ-BNV");
  assert.equal(soKyHieu("", "BNV-VP"), "Số:      /BNV-VP");
});

test("địa danh và ngày tháng", () => {
  assert.equal(ngayThang("Hà Nội", "2020-01-05"), "Hà Nội, ngày 05 tháng 01 năm 2020");
  assert.equal(ngayThang("Thành phố Hồ Chí Minh", "2019-06-29"), "Thành phố Hồ Chí Minh, ngày 29 tháng 6 năm 2019");
  assert.equal(ngayThang("Huế", "2026-02-15"), "Huế, ngày 15 tháng 02 năm 2026");
  assert.equal(ngayThang("Huế", "2026-12-01"), "Huế, ngày 01 tháng 12 năm 2026");
  assert.equal(ngayThang("An Bình", "", 2026), "An Bình, ngày     tháng     năm 2026");
  assert.equal(ngayThang("", "2026-03-10"), "……, ngày 10 tháng 3 năm 2026");
});

test("trích yếu công văn, căn cứ, kết thúc", () => {
  assert.equal(vv("nâng bậc lương năm 2019"), "V/v nâng bậc lương năm 2019");
  assert.equal(vv("V/v: nâng bậc lương"), "V/v nâng bậc lương");
  assert.equal(vv("Về việc nâng bậc lương"), "V/v nâng bậc lương");
  assert.deepEqual(canCu("Căn cứ A;\n\n Căn cứ B.  \nCăn cứ C,"), ["Căn cứ A;", "Căn cứ B;", "Căn cứ C."]);
  assert.deepEqual(canCu("Căn cứ A", "Theo đề nghị của Chánh Văn phòng."), ["Căn cứ A;", "Theo đề nghị của Chánh Văn phòng."]);
  assert.deepEqual(canCu("", "Trưởng phòng Nội vụ"), ["Theo đề nghị của Trưởng phòng Nội vụ."]);
  assert.equal(ketThuc("có hiệu lực kể từ ngày ký."), "có hiệu lực kể từ ngày ký./.");
  assert.equal(ketThuc("Trân trọng"), "Trân trọng./.");
  assert.equal(ketThuc("xong;"), "xong./.");
  assert.equal(ketThuc("đã có./."), "đã có./.");
});

test("kính gửi, nơi nhận", () => {
  assert.deepEqual(kinhGui("Bộ Nội vụ"), { single: "Bộ Nội vụ", items: [] });
  assert.deepEqual(kinhGui("- Bộ Nội vụ;\n- Bộ Tài chính\nBộ Kế hoạch và Đầu tư."),
    { single: "", items: ["- Bộ Nội vụ;", "- Bộ Tài chính;", "- Bộ Kế hoạch và Đầu tư."] });
  assert.deepEqual(listItems("• A;\n\n– B."), ["A", "B"]);
  assert.deepEqual(noiNhan("Các bộ, cơ quan ngang bộ\n- Lưu: VT", { luu: "TCCB" }), ["- Các bộ, cơ quan ngang bộ;", "- Lưu: VT, TCCB."]);
  assert.deepEqual(noiNhan("Sở Tài chính", { nhuTren: true, luu: "VT, NVĐP", nguoiSoan: "PL.(300)" }),
    ["- Như trên;", "- Sở Tài chính;", "- Lưu: VT, NVĐP, PL.(300)."]);
  assert.deepEqual(noiNhan("Như trên;", { nhuTren: true }), ["- Như trên;", "- Lưu: VT."]);
  const k = kinhGuiLayout(["- Bộ Nội vụ;", "- Bộ Tài chính."], 14, 400);
  assert.ok(k.left > 0 && k.items > k.left);
  assert.equal(kinhGuiLayout(["- " + "x".repeat(200)], 14, 400).left, 0);
});

test("quyền hạn, chức vụ người ký", () => {
  assert.deepEqual(nguoiKy("", "", "Giám đốc"), ["GIÁM ĐỐC"]);
  assert.deepEqual(nguoiKy("TM.", "Ủy ban nhân dân", "Chủ tịch"), ["TM. ỦY BAN NHÂN DÂN", "CHỦ TỊCH"]);
  assert.deepEqual(nguoiKy("KT.", "Bộ trưởng", "Thứ trưởng"), ["KT. BỘ TRƯỞNG", "THỨ TRƯỞNG"]);
  assert.deepEqual(nguoiKy("TL.", "Giám đốc", "Chánh Văn phòng"), ["TL. GIÁM ĐỐC", "CHÁNH VĂN PHÒNG"]);
  assert.deepEqual(nguoiKy("Q.", "", "Giám đốc"), ["Q. GIÁM ĐỐC"]);
});

test("đọc phần nội dung", () => {
  assert.deepEqual(inline("Chữ **đậm** và *nghiêng*"), [{ t: "Chữ " }, { t: "đậm", b: true }, { t: " và " }, { t: "nghiêng", i: true }]);
  assert.deepEqual(inline("2 * 3 = 6"), [{ t: "2 * 3 = 6" }]);
  const b = parseBody("Chương I\nQUY ĐỊNH CHUNG\nĐiều 1. Phạm vi điều chỉnh\nQuy chế này quy định\nĐiều 2. Quyết định này có hiệu lực kể từ ngày ký.\nI. KẾT QUẢ ĐẠT ĐƯỢC\na) Đối với…");
  assert.equal(b[0].align, "center"); assert.ok(b[0].runs[0].b);
  assert.equal(b[1].align, "center"); assert.equal(b[1].runs[0].t, "QUY ĐỊNH CHUNG");
  assert.deepEqual(b[2].runs, [{ t: "Điều 1. Phạm vi điều chỉnh", b: true }]);   // điều có tiêu đề: đậm cả dòng
  assert.equal(b[3].runs[0].b, undefined);
  assert.deepEqual(b[4].runs, [{ t: "Điều 2.", b: true }, { t: " Quyết định này có hiệu lực kể từ ngày ký." }]);
  assert.ok(b[5].runs[0].b && b[5].indent);
  assert.equal(b[6].runs[0].t, "a) Đối với…/.");
  assert.equal(parseBody("Kết thúc.", { end: false })[0].runs[0].t, "Kết thúc.");
  assert.deepEqual(parseBody("\n\n"), []);
});

/** Kiểm tra XML đóng mở thẻ đúng cặp (đủ để bắt lỗi dựng chuỗi) */
function wellFormed(xml) {
  const stack = [];
  const body = xml.replace(/^<\?xml[^>]*\?>\s*/, "");
  for (const m of body.matchAll(/<(\/?)([\w:]+)([^>]*?)(\/?)>/g)) {
    if (m[4]) continue;
    if (m[1]) { const top = stack.pop(); if (top !== m[2]) return `đóng ${m[2]} nhưng đang mở ${top}`; }
    else stack.push(m[2]);
  }
  if (/&(?!(amp|lt|gt|quot|apos);)/.test(body)) return "ký tự & chưa thoát";
  return stack.length ? "còn mở " + stack.join(",") : "";
}

const BASE = { chuQuan: "UBND tỉnh Bắc Ninh", coQuan: "Sở Nội vụ", cqVT: "SNV", dvVT: "VP", so: "5", diaDanh: "Bắc Ninh", ngay: "2026-02-05",
  trichYeu: "triển khai <công tác> văn thư & lưu trữ", kinhGui: "Các sở, ban, ngành\nUBND các xã, phường", noiDung: "Đề nghị thực hiện.\n**Lưu ý:** báo cáo trước 15/3",
  quyen: "KT.", dau: "Giám đốc", chucVu: "Phó Giám đốc", ten: "Nguyễn Văn An", noiNhan: "Giám đốc Sở", luu: "VP", diaChi: "Số 1 Lý Thái Tổ", size: "14" };
const OPT = { margins: { top: 20, bottom: 20, left: 30, right: 15 }, line: 1.15, indent: 12.7, title: "Thử" };

test("mô hình văn bản: công văn, quyết định", () => {
  const cv = docModel({ ...BASE, type: "cong-van" }, spec);
  assert.equal(cv.head.so, "Số: 05/SNV-VP");
  assert.equal(cv.head.vv, "V/v triển khai <công tác> văn thư & lưu trữ");
  assert.deepEqual(cv.head.chuQuan, ["UBND TỈNH BẮC NINH"]);
  assert.equal(cv.title, null);
  assert.equal(cv.body[0].kg.items.length, 2);
  assert.equal(cv.noiNhan[0], "- Như trên;");
  assert.deepEqual(cv.sign.lines, ["KT. GIÁM ĐỐC", "PHÓ GIÁM ĐỐC"]);
  assert.deepEqual(cv.diaChi, ["Số 1 Lý Thái Tổ"]);

  const qd = docModel({ ...BASE, type: "quyet-dinh", so: "", kinhGui: "", thamQuyen: "Giám đốc Sở Nội vụ", canCu: "Căn cứ Nghị định số 30/2020/NĐ-CP", deNghi: "Chánh Văn phòng" }, spec);
  assert.equal(qd.head.so, "Số:      /QĐ-SNV");
  assert.equal(qd.head.vv, "");
  assert.deepEqual(qd.title, { tenLoai: "QUYẾT ĐỊNH", trichYeu: "triển khai <công tác> văn thư & lưu trữ" });
  assert.equal(qd.body[0].runs[0].t, "GIÁM ĐỐC SỞ NỘI VỤ");
  assert.equal(qd.body[1].runs[0].t, "Căn cứ Nghị định số 30/2020/NĐ-CP;");
  assert.equal(qd.body[2].runs[0].t, "Theo đề nghị của Chánh Văn phòng.");
  assert.equal(qd.body[3].runs[0].t, "QUYẾT ĐỊNH:");
  assert.equal(qd.noiNhan[0], "- Giám đốc Sở;");      // không có "Kính gửi" → không thêm "Như trên"
  assert.deepEqual(qd.diaChi, []);

  const gt = docModel({ ...BASE, type: "giay-gioi-thieu" }, spec);
  assert.equal(gt.title.trichYeu, "");
  assert.equal(docModel({ ...BASE, type: "nghi-quyet" }, spec).body.some((b) => b.runs && b.runs[0].t === "QUYẾT NGHỊ:"), true);
  assert.equal(docModel({ ...BASE, type: "khong-co" }, spec).type.id, "cong-van");
});

test("bố cục trang", () => {
  const a = pageLayout({ left: 30, right: 15 });
  assert.ok(Math.abs(a.width - (165 * 72) / 25.4) < 1e-9);
  assert.ok(Math.abs(a.head[1] - (100 * 72) / 25.4) < 1e-9);
  const b = pageLayout({ left: 35, right: 20 });
  assert.ok(b.head[0] > 150 && b.head[1] >= textWidth(spec.quocHieu, 13, true));
});

test("các phần XML của file .docx", () => {
  for (const type of ["cong-van", "quyet-dinh", "to-trinh", "giay-gioi-thieu"]) {
    const parts = docxParts(docModel({ ...BASE, type }, spec), spec, OPT);
    for (const [name, xml] of Object.entries(parts)) assert.equal(wellFormed(xml), "", type + " " + name);
    const doc = parts["word/document.xml"];
    assert.ok(doc.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"));
    if (type !== "giay-gioi-thieu") assert.ok(doc.includes("&lt;công tác&gt; văn thư &amp; lưu trữ"));
    assert.ok(doc.includes('<w:pgSz w:w="11906" w:h="16838"/>'));                 // A4
    assert.ok(doc.includes('w:top="1134" w:right="850" w:bottom="1134" w:left="1701"')); // 20, 15, 20, 30 mm
    assert.ok(doc.includes("<w:titlePg/>"));                                     // không hiện số trang đầu
    assert.ok(doc.includes('<w:t xml:space="preserve">Lưu ý:</w:t>'));
    assert.ok(parts["word/header1.xml"].includes("PAGE"));
    assert.ok(parts["word/styles.xml"].includes('w:ascii="Times New Roman"'));
    assert.ok(parts["word/styles.xml"].includes('<w:sz w:val="28"/>'));          // 14 pt
  }
  const cv = docxParts(docModel({ ...BASE, type: "cong-van" }, spec), spec, OPT);
  assert.ok(cv["word/footer2.xml"].includes("Số 1 Lý Thái Tổ"));               // địa chỉ ở cuối trang đầu
  assert.ok(cv["word/document.xml"].includes("Kính gửi:"));
  assert.ok(cv["word/document.xml"].includes("V/v triển khai"));
  const qd13 = docxParts(docModel({ ...BASE, type: "quyet-dinh", size: "13", diaChi: "" }, spec), spec, { ...OPT, line: 1.5 });
  assert.ok(qd13["word/styles.xml"].includes('<w:sz w:val="26"/>'));
  assert.ok(qd13["word/document.xml"].includes('w:line="360" w:lineRule="auto"'));
  assert.ok(!qd13["word/footer2.xml"].includes("<w:t"));
});
