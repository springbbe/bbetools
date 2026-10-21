#!/usr/bin/env node
/* Tạo file mẫu cho nhóm Văn phòng & dữ liệu (dữ liệu giả, sinh ngẫu nhiên có hạt giống cố định):
   nhan-vien.xlsx, ban-hang-thang-9.xlsx, ban-hang-thang-10.xlsx, ban-hang-thang-11.csv, san-pham.json,
   khach-moi.xlsx, giay-moi-mau.docx.
   Dùng đúng phiên bản SheetJS và JSZip mà trang web tải (cần mạng).  Chạy:  node scripts/samples/van-phong.js */
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = ROOT + "samples/", TMP = ROOT + "samples/.tmp-vp/";

async function load(url, file) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Không tải được " + url);
  writeFileSync(TMP + file, await r.text());
  return createRequire(TMP + "x.cjs")(TMP + file);
}

export async function makeOfficeSamples() {
  mkdirSync(TMP, { recursive: true });
  try {
    const X = await load("https://cdn.jsdelivr.net/npm/@e965/xlsx@0.20.3/dist/xlsx.full.min.js", "xlsx.cjs");
    const JSZip = await load("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js", "jszip.cjs");
    let seed = 20261021;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
    const book = (sheets, file) => {
      const wb = X.utils.book_new();
      for (const [name, rows, fmt] of sheets) {
        const ws = X.utils.aoa_to_sheet(rows, { cellDates: true, UTC: true, dateNF: "dd/mm/yyyy" });
        for (const [col, z] of Object.entries(fmt || {})) for (let r = 2; r <= rows.length; r++) { const c = ws[col + r]; if (c && c.t === "n") c.z = z; }
        ws["!cols"] = rows[0].map((_, j) => ({ wch: Math.min(40, Math.max(8, ...rows.map((r) => String(r[j] instanceof Date ? "00/00/0000" : r[j] ?? "").length + 2))) }));
        X.utils.book_append_sheet(wb, ws, name);
      }
      return wb;
    };
    const save = (wb, file) => { writeFileSync(OUT + file, X.write(wb, { type: "buffer", bookType: "xlsx", compression: true })); console.log("✓ " + file); };

    /* --- nhân viên --- */
    const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"];
    const DEM_NAM = ["Văn", "Minh", "Quốc", "Đức", "Hữu", "Thành"], DEM_NU = ["Thị", "Ngọc", "Thu", "Thanh", "Mai", "Bảo"];
    const TEN_NAM = ["An", "Bình", "Cường", "Dũng", "Hải", "Hùng", "Khoa", "Long", "Nam", "Phúc", "Quân", "Sơn", "Tuấn", "Việt"];
    const TEN_NU = ["Anh", "Châu", "Giang", "Hà", "Hương", "Lan", "Linh", "My", "Nhung", "Oanh", "Phương", "Thảo", "Trang", "Vy"];
    const PB = ["Kế toán", "Kinh doanh", "Kỹ thuật", "Nhân sự", "Marketing"];
    const CN = ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh", "Cần Thơ"];
    const CV = ["Nhân viên", "Nhân viên", "Nhân viên", "Chuyên viên", "Chuyên viên", "Trưởng nhóm"];
    const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
    const nv = [["Mã NV", "Họ và tên", "Giới tính", "Ngày sinh", "Phòng ban", "Chi nhánh", "Chức vụ", "Ngày vào làm", "Lương cơ bản", "Điện thoại", "Email"]];
    for (let i = 1; i <= 40; i++) {
      const nu = rnd() < 0.5;
      const ho = pick(HO), dem = pick(nu ? DEM_NU : DEM_NAM), ten = pick(nu ? TEN_NU : TEN_NAM);
      const cv = i <= 5 ? "Trưởng phòng" : pick(CV);
      const pb = i <= 5 ? PB[i - 1] : pick(PB);
      const luong = Math.round((cv === "Trưởng phòng" ? 28 : cv === "Trưởng nhóm" ? 20 : cv === "Chuyên viên" ? 15 : 10) * (0.9 + rnd() * 0.4) * 10) * 100000;
      nv.push(["NV" + String(i).padStart(3, "0"), `${ho} ${dem} ${ten}`, nu ? "Nữ" : "Nam", D(1975 + Math.floor(rnd() * 27), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28)), pb, pick(CN), cv,
        D(2015 + Math.floor(rnd() * 11), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28)), luong, "09" + String(Math.floor(rnd() * 1e8)).padStart(8, "0"), `${slug(ten)}.${slug(ho)}${i}@congty-mau.vn`]);
    }
    const pbRows = [["Phòng ban", "Trưởng phòng", "Số nhân viên", "Tổng lương"]];
    PB.forEach((p, k) => pbRows.push([p, nv[k + 1][1], nv.filter((r) => r[4] === p).length, nv.filter((r) => r[4] === p).reduce((a, r) => a + r[8], 0)]));
    const wbNv = book([["Nhân viên", nv, { I: "#,##0" }], ["Phòng ban", pbRows, { D: "#,##0" }]]);
    // cột tổng lương là công thức (giữ giá trị đã tính)
    const ws2 = wbNv.Sheets["Phòng ban"];
    PB.forEach((p, k) => { ws2["C" + (k + 2)].f = `COUNTIF('Nhân viên'!E:E,A${k + 2})`; ws2["D" + (k + 2)].f = `SUMIF('Nhân viên'!E:E,A${k + 2},'Nhân viên'!I:I)`; });
    save(wbNv, "nhan-vien.xlsx");

    /* --- bán hàng 3 tháng (2 file Excel + 1 CSV khác thứ tự cột, có thêm cột) --- */
    const SP = [["Bút bi Thiên Long", 5000], ["Vở 200 trang", 18000], ["Giấy A4 Double A", 85000], ["Bìa hồ sơ", 7000], ["Máy tính Casio FX-580", 520000], ["Băng keo trong", 12000], ["Kẹp giấy (hộp)", 9000]];
    const KH = ["Trường THCS Lê Lợi", "Công ty Minh Phát", "Cửa hàng Văn phòng phẩm Hoa Mai", "Anh Tuấn", "Chị Hương", "Công ty Đông Á", "Nhà sách Phương Nam"];
    const sales = (m, n) => {
      const rows = [];
      for (let i = 1; i <= n; i++) { const [sp, gia] = pick(SP), sl = 1 + Math.floor(rnd() * (gia > 100000 ? 5 : 60)); rows.push([D(2026, m, 1 + Math.floor(rnd() * 28)), `DH${m}${String(i).padStart(3, "0")}`, pick(KH), sp, sl, gia, sl * gia]); }
      return rows.sort((a, b) => a[0] - b[0]);
    };
    const SH = ["Ngày", "Mã đơn", "Khách hàng", "Sản phẩm", "Số lượng", "Đơn giá", "Thành tiền"];
    for (const m of [9, 10]) {
      const rows = [SH, ...sales(m, 14 + m)];
      const wb = book([["Tháng " + m, rows, { F: "#,##0", G: "#,##0" }]]);
      const ws = wb.Sheets["Tháng " + m];
      for (let r = 2; r <= rows.length; r++) ws["G" + r].f = `E${r}*F${r}`;
      save(wb, `ban-hang-thang-${m}.xlsx`);
    }
    const t11 = sales(11, 12);
    const csv = [["Mã đơn", "Ngày", "Khách hàng", "Sản phẩm", "Số lượng", "Đơn giá", "Thành tiền", "Ghi chú"],
      ...t11.map((r, i) => [r[1], `${String(r[0].getUTCDate()).padStart(2, "0")}/11/2026`, r[2], r[3], r[4], r[5].toLocaleString("vi-VN"), r[6].toLocaleString("vi-VN"), i % 4 === 0 ? "Giao trong ngày; thu tiền mặt" : ""])];
    const q = (v) => (/[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
    writeFileSync(OUT + "ban-hang-thang-11.csv", "\ufeff" + csv.map((r) => r.map(q).join(";")).join("\r\n") + "\r\n");
    console.log("✓ ban-hang-thang-11.csv");

    /* --- JSON sản phẩm (có đối tượng lồng, mảng) --- */
    const json = SP.map(([ten, gia], i) => ({ ma: "SP" + String(i + 1).padStart(2, "0"), ten, donVi: gia > 100000 ? "cái" : i === 2 ? "ram" : "cái", gia: { niemYet: gia, khuyenMai: Math.round(gia * 0.9 / 100) * 100 }, tonKho: Math.floor(rnd() * 500), the: i % 2 ? ["văn phòng phẩm"] : ["học sinh", "văn phòng phẩm"], conHang: i !== 4 }));
    writeFileSync(OUT + "san-pham.json", JSON.stringify(json, null, 2) + "\n");
    console.log("✓ san-pham.json");

    /* --- danh sách khách mời + mẫu giấy mời Word --- */
    const km = [["Danh xưng", "Họ tên", "Chức vụ", "Đơn vị", "Email", "Bàn số"],
      ["Ông", "Nguyễn Văn An", "Giám đốc", "Công ty Minh Phát", "an.nguyen@minhphat-mau.vn", 1],
      ["Bà", "Trần Thị Bình", "Phó Giám đốc", "Công ty Đông Á", "binh.tran@donga-mau.vn", 1],
      ["Ông", "Lê Quốc Cường", "Trưởng phòng Kinh doanh", "Nhà sách Phương Nam", "cuong.le@phuongnam-mau.vn", 2],
      ["Bà", "Phạm Ngọc Diệp", "Kế toán trưởng", "Công ty Minh Phát", "diep.pham@minhphat-mau.vn", 2],
      ["Anh", "Hoàng Minh Đức", "Chuyên viên", "Trường THCS Lê Lợi", "duc.hoang@leloi-mau.edu.vn", 3],
      ["Chị", "Vũ Thu Hà", "Giáo viên", "Trường THCS Lê Lợi", "ha.vu@leloi-mau.edu.vn", 3],
      ["Ông", "Đặng Hữu Hùng", "Chủ tịch HĐQT", "Công ty Đông Á", "hung.dang@donga-mau.vn", 1],
      ["Bà", "Bùi Thanh Lan", "Chủ cửa hàng", "Cửa hàng Văn phòng phẩm Hoa Mai", "lan.bui@hoamai-mau.vn", 4]];
    save(book([["Khách mời", km]]), "khach-moi.xlsx");

    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const run = (t, rPr = "") => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
    const p = (runs, pPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runs}</w:p>`;
    const B = "<w:b/>";
    // trường "Bàn số" là MERGEFIELD thật của Word; "Họ tên" bị cắt thành nhiều run như Word hay làm
    const field = (name) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> MERGEFIELD "${name}" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run("«" + name + "»", B)}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
    const body = [
      p(run("CÔNG TY TNHH BBETOOLS MẪU", B), '<w:jc w:val="center"/>'),
      p(run("Số 1 đường Giả Định, phường Mẫu, Hà Nội", "<w:i/>"), '<w:jc w:val="center"/><w:spacing w:after="360"/>'),
      p(run("GIẤY MỜI", B + '<w:sz w:val="40"/><w:color w:val="C0392B"/>'), '<w:jc w:val="center"/><w:spacing w:after="240"/>'),
      p(run("Trân trọng kính mời: ") + run("{{Danh xưng}} ", B) + run("{{Họ", B) + "<w:proofErr w:type=\"spellStart\"/>" + run(" tên}}", B)),
      p(run("Chức vụ: {{Chức") + run(" vụ}}") + run(" – {{Đơn vị}}")),
      p(run("Tới dự Lễ kỷ niệm 10 năm thành lập Công ty."), '<w:spacing w:before="200"/>'),
      p(run("Thời gian: ", B) + run("18 giờ 00, thứ Sáu, ngày 20/11/2026")),
      p(run("Địa điểm: ", B) + run("Khách sạn Mẫu, số 1 đường Giả Định, Hà Nội")),
      p(run("Vị trí bàn: ", B) + run("Bàn số ") + field("Bàn số")),
      p(run("Sự hiện diện của {{Danh xưng}} là niềm vinh hạnh của chúng tôi."), '<w:spacing w:before="200" w:after="360"/>'),
      p(run("Hà Nội, ngày 01 tháng 11 năm 2026", "<w:i/>"), '<w:jc w:val="right"/>'),
      p(run("TM. BAN TỔ CHỨC", B), '<w:jc w:val="right"/>')
    ].join("");
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const z = new JSZip();
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    z.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="28"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
    z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`);
    writeFileSync(OUT + "giay-moi-mau.docx", await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
    console.log("✓ giay-moi-mau.docx");
  } finally {
    rmSync(TMP, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await makeOfficeSamples();
