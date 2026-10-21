# Kế hoạch xây dựng BbeTools (tài liệu tạm)

File này chỉ dùng trong lúc xây dựng. Khi mọi giai đoạn đã xong: **xoá file này** và dòng trỏ tới nó trong `CLAUDE.md`. `scripts/build.js` tự bỏ qua khi không còn file này.

## Lộ trình

Hai bảng dưới đây do `scripts/build.js` sinh từ `tools.json` (trường `phase` của mỗi nhóm, `status` của từng công cụ), nên luôn khớp tiến độ thật. Đừng sửa tay giữa các dấu `<!-- … -->`.

<!-- roadmap:start -->
| Giai đoạn | Nhóm | Công cụ xong | Trạng thái | Câu lệnh gợi ý cho AI |
|---|---|---|---|---|
| 1 | Lõi, registry, trang tự sinh + 13 công cụ tiêu biểu | 13 | ✅ Xong | |
| 2 | PDF | 24/24 | ✅ Xong |  |
| 3 | Ảnh | 21/21 | ✅ Xong |  |
| 4 | Tiện ích Việt Nam + Tính toán & đời sống | 27/27 | ✅ Xong |  |
| 5 | Văn bản + Lập trình | 31/31 | ✅ Xong |  |
| 6 | QR & mã vạch + Văn phòng & dữ liệu | 11/11 | ✅ Xong |  |
| 7 | Bảo mật + Năng suất & ngẫu nhiên | 17/17 | ✅ Xong |  |
| 8 | Âm thanh & video | 0/11 | ⏳ Còn 11 công cụ | `Làm giai đoạn 8 của BbeTools theo CLAUDE.md` |
<!-- roadmap:end -->

## Cách nhờ AI làm tiếp

Mở Claude Code ở repo này (trên máy hoặc cloud) rồi chép câu lệnh ở cột cuối bảng Lộ trình, ví dụ:

```
Làm giai đoạn 2 của BbeTools theo CLAUDE.md
```

Muốn làm riêng một công cụ (tên lấy ở bảng "Công cụ" bên dưới, mục có ⏳):

```
Làm công cụ Tách PDF của BbeTools theo CLAUDE.md
```

## Quy trình một giai đoạn (dành cho AI)

1. Lấy các nhóm có `"phase": N` trong `tools.json`; làm **mọi** công cụ `"todo"` của các nhóm đó. Làm lần lượt từng giai đoạn, không chạy song song (các nhóm đều sửa `tools.json` và các trang sinh ra).
2. Công cụ nào không làm được 100% trên trình duyệt thì xoá khỏi registry và báo lý do cho người dùng, không làm nửa vời. Có ý tưởng công cụ mới hợp nhóm thì đề xuất với người dùng.
3. Nhóm PDF: chép logic từ https://github.com/springbbe/PDF-tool (`assets/tools/*.js`, cùng @cantoo/pdf-lib + pdf.js), chuyển sang khung `fileTool` và `assets/pdf.js`.
4. Nhóm Tiện ích Việt Nam: tra văn bản hiện hành trước khi viết dữ liệu (thuế TNCN thay đổi năm 2026, BHXH, lương tối thiểu vùng, giá điện EVN, sáp nhập còn 34 tỉnh từ 1/7/2025).
5. Xong: build + check + test, chạy thử từng công cụ trong trình duyệt bằng file mẫu, một commit cho cả giai đoạn (message tiếng Việt), push, rồi báo lại những gì đã làm, đã thử, còn thiếu.

## Ghi chú tiến độ (cập nhật sau mỗi lần làm)

### Giai đoạn 7 – Bảo mật + Năng suất & ngẫu nhiên (xong)

- Đã xong cả 16 công cụ còn lại (6 Bảo mật, 10 Năng suất). Không bỏ công cụ nào. "Kiểm tra độ mạnh mật khẩu" đổi `kind` sang `form` (ô mật khẩu không nên nằm trong khung văn bản có "Nhớ văn bản" và `?text=`).
- `tools.json` có thêm trường tuỳ chọn `privacy` (câu "riêng tư" dưới tiêu đề trang) khi câu mặc định theo `kind` không đúng (vd. hẹn giờ không dùng "hình ảnh, âm thanh"). Khung văn bản có thêm tuỳ chọn kiểu `password`.
- Thư viện mới: `hash-wasm@4.12.0` (checksum theo luồng), `@zxcvbn-ts/*` 4.x qua `/+esm` (độ mạnh mật khẩu, khoảng 1 MB từ điển, chỉ tải trên trang đó). Mã hoá dùng Web Crypto, không cần thư viện; định dạng .bbe ghi ở `docs/phat-trien.md`.
- Hàm thuần có test (`tests/bao-mat.test.js`, `tests/nang-suat.test.js`): `ngau-nhien.js` (số nguyên đều không lệch modulo tới 2^53, Fisher–Yates, chọn không trùng kiểu Floyd, trọng số, chia đội đều có trưởng nhóm), `mat-khau.js` + `tu-mat-khau.js` (705 từ tiếng Việt cho cụm từ dễ nhớ), `ma-hoa.js`, `totp.js` (đúng vectơ RFC 6238 với SHA-1/256/512), `checksum.js`, `bam-gio.js`, `mui-gio.js` (giờ mùa hè, giờ "không tồn tại" lúc đổi giờ), `checklist.js`.
- File mẫu mới: `bao-cao-mat-khau-1234.pdf.bbe`, `bao-cao-quy-1.pdf.sha256` (sinh bằng `node scripts/samples/bao-mat.js`, cũng được gọi từ `make-samples.js`).
- Bẫy đã gặp:
  - Khung Browser của Claude Code bị ẩn → `setTimeout` giãn ra khoảng 1 giây/lần: hiệu ứng (quay số, vòng quay) chạy rất chậm và trông như lỗi. Kiểm tra kết quả sau khi hiệu ứng xong, đừng đọc giữa chừng.
  - `await audioContext.resume()` treo mãi khi không có thao tác thật của người dùng (gọi từ script) → không `await`.
  - Chrome headless trên macOS treo khi mở micro giả (`--use-fake-device-for-media-stream`); camera giả thì chạy. Kiểm tra phần micro bằng cách thay `getUserMedia` bằng luồng từ `OscillatorNode` + `MediaStreamDestination`.
  - Chữ trên nửa trái vòng quay bị lộn ngược nếu chỉ xoay theo góc: xoay thêm 180° và căn lề ngược lại.
  - `\b` trong regex JS chỉ hiểu chữ ASCII: "giờ\b" không khớp → dùng lookahead `(?=[\s\d,]|$)`.
- Đã thử trên trình duyệt (Chrome trong Claude Code): cả 16 công cụ (mật khẩu 3 kiểu + nhiều mật khẩu; kiểm tra "anhyeuem123", "qwerty", tên + năm sinh, có dấu; giải mã file mẫu đúng từng byte, mã hoá 2 file gộp zip, sai mật khẩu; văn bản mã hoá ↔ giải mã, link giải mã `#m=`; checksum file mẫu đối chiếu .sha256, đủ 5 thuật toán khớp `md5`/`shasum`/zlib, file 300 MB khớp Node; TOTP khớp lib, đọc QR otpauth có dấu, 8 số; bấm giờ, hẹn giờ hết giờ có chuông; vòng quay, chia đội 4 kiểu, xu/xúc xắc, quay số không trùng tới khi hết; ghi chú, checklist nhiều danh sách; đồng hồ thế giới + đổi giờ; bàn phím, chuột, loa, màn hình). Camera thử bằng Chrome headless với camera giả (1920×1080, chụp, tắt khi chuyển phần). **Micro thật chưa thử được** (khung Browser chặn quyền; headless treo) — mới thử bằng luồng âm thanh giả. Khổ 375 px không tràn ngang, sáng và tối, console không lỗi. Chưa thử trên Safari/iPhone thật.

### Giai đoạn 6 – QR & mã vạch + Văn phòng & dữ liệu (xong)

- Đã xong cả 9 công cụ còn lại (Tạo mã vạch + 8 công cụ Văn phòng). Không bỏ công cụ nào.
- Thư viện mới: SheetJS 0.20.3 qua gói `@e965/xlsx` (bản chính thức chỉ có trên cdn.sheetjs.com; đã so SHA-256 giống hệt). Không dùng `xlsx@0.18.5` trên npm (cũ, có lỗi bảo mật). Trộn thư Word tự viết bằng JSZip, không cần docxtemplater.
- Phần dùng chung: `assets/sheet.js` (đọc Excel/CSV thành ô SheetJS `{t, v, w, z}`, hiện kiểu Việt Nam, ghi .xlsx/.csv, `previewTable`). CSV đọc bằng bộ đọc riêng: tự nhận UTF-8 / UTF-16 / Windows-1258, dấu phân cách; nhận số (giữ số 0 đầu, số > 15 chữ số), ngày dd/mm/yyyy.
- Hàm thuần có test: `lib/ma-vach.js` (EAN-13/8, UPC-A, ITF-14, Code 128 tự chọn bảng A/B/C + SHIFT, Code 39; đã đọc lại bằng ZXing trong Node, cả 14 trường hợp đúng), `bang.js` (giải mã file chữ, nhận số, tên sheet/file hợp lệ, gộp bảng theo tiêu đề, tách theo cột, sắp xếp/lọc tiếng Việt), `tron-thu.js` (trường `{{…}}`/`«…»` bị cắt nhiều run, MERGEFIELD dạng đơn và phức, gộp nhiều bản bằng ngắt trang), `hoa-don.js`, `chu-ky-email.js`; `csv.js` thêm `jsonToTable`.
- `embedVnFont(doc, bold)` có bản đậm và tắt chữ ghép (fi, fl…) vì pdf-lib ghi sai ToUnicode cho chữ ghép: sao chép từ PDF ra "Őle" thay vì "file". Ảnh hưởng tốt cả Điền form PDF, Làm phẳng form.
- File mẫu mới (dữ liệu giả): `nhan-vien.xlsx`, `ban-hang-thang-9/10.xlsx`, `ban-hang-thang-11.csv`, `san-pham.json`, `khach-moi.xlsx`, `giay-moi-mau.docx`, sinh bằng `node scripts/samples/van-phong.js` (cũng được gọi từ `make-samples.js`).
- Bẫy đã gặp:
  - SheetJS đọc với `cellDates` trả ngày dạng giờ UTC (00:00Z = ngày hiển thị trong Excel): định dạng bằng `getUTC*`, ghi lại bằng ô `{t:"d"}` hoặc `UTC: true`, nếu không sẽ lệch một ngày ở múi giờ +7.
  - `w` của SheetJS theo kiểu Mỹ (1/15/26, 15,000,000): `cellText()` tự đổi sang kiểu Việt Nam.
  - Chép ô sang bảng khác phải bỏ công thức (`plainCell`), vì địa chỉ ô đổi làm công thức sai.
  - Ngắt phần (section break) giữa các bản trộn bị Quick Look/trình xem đơn giản bỏ qua → dùng ngắt trang trong đoạn cỡ chữ 1 pt.
  - Ô ảnh trong bảng chữ ký email bị bóp khi cột hẹp: đặt `width` + `min-width` cho ô và ảnh.
  - `img.decode()` và `page.render()` của pdf.js treo khi khung Browser của Claude Code bị ẩn (tab chạy nền): kiểm tra file kết quả bằng cách gửi ra máy (POST `text/plain` tới server nhận tạm) rồi xem bằng `qlmanage`/`textutil`.
- Đã thử trên trình duyệt (Chrome trong Claude Code): cả 9 công cụ với file mẫu (mã vạch một mã/hàng loạt + PDF in tem + ZIP; Excel: xem, tìm không dấu, sắp xếp, xem công thức, tải phần đã lọc; Excel→CSV, CSV→Excel; gộp 3 file khác thứ tự cột; tách theo cột ra sheet/file; JSON ↔ Excel hai chiều; trộn thư ra DOCX từng người, DOCX gộp, PDF gộp, PDF từng người; chữ ký email có ảnh; báo giá có chiết khấu, VAT 8%, QR VietQR, xuất PDF). Khổ 375 px không tràn ngang, sáng và tối, console không lỗi. File DOCX kết quả mở được bằng `textutil` của macOS (chưa mở bằng Microsoft Word); chưa thử trên Safari/iPhone thật.

### Giai đoạn 5 – Văn bản + Lập trình (xong)

- Đã xong cả 29 công cụ (11 Văn bản, 18 Lập trình). Không bỏ công cụ nào. "Lorem ipsum tiếng Việt" đổi `kind` sang `form` (không cần ô nhập).
- Khung `textTool` mở rộng: tuỳ chọn kiểu `text` (ô nhập trên thanh tuỳ chọn, `persist: false` để không lưu), `show(opts)`, `transform` trả Promise (thư viện tải khi cần), `info` (dòng ghi chú trên kết quả), `swap` (nút "Đổi chiều"), `initial`, `inputActions`/`outputActions`, `sample(opts)` có thể đặt sẵn tuỳ chọn. API trả về thêm `setText`, `setOpt`, `result`.
- `assets/regex-run.js` + `assets/regex-worker.js`: chạy regex trong Web Worker, quá 2,5 giây thì huỷ (Kiểm tra regex, Tìm và thay thế).
- Hàm thuần có test: `lib/van-ban.js` (hoa/thường, bỏ dấu, slug, lọc dòng, tìm–thay), `vn-encoding.js` (Unicode ↔ TCVN3 ↔ VNI, sửa UTF-8 đọc nhầm), `telex.js` (gõ lại Telex/VNI, đặt dấu cũ/mới, kiểm tra âm tiết hợp lệ), `diff.js` (Myers), `encode.js` (Base64, URL, HTML entity, JWT + kiểm tra chữ ký), `hash.js` (MD5/HMAC-MD5 viết tay, SHA qua Web Crypto), `uuid.js` (v4, v7), `color.js`, `co-so.js` (cơ số BigInt, chmod), `cron.js`, `timestamp.js`, `csv.js`, `fancy-text.js`, `lorem.js`, `http-status.js`, `minify.js` (HTML, SQL một dòng), `regex.js`, `css-gen.js`.
- Thư viện mới: `marked@18.1.0` + `dompurify@3.4.16` (Markdown), `js-yaml@5.4.3`, `sql-formatter@15.9.0`, `terser@5.51.2` + `csso@5.0.5` (nén mã), `ua-parser-js@1.0.41` (bản 1.x giấy phép MIT; bản 2.x là AGPL nên không dùng).
- Màu tô JSON (`.j-k`…) chuyển từ `tools/json-formatter.js` vào `app.css` (biến `--code-*`) để JWT dùng chung.
- Bẫy đã gặp:
  - Lớp tiện ích `.two` (giai đoạn 3) đè lên `.tx-panes.two` khiến mọi trang văn bản bị chia hai cột trên điện thoại (cả Đếm từ, Định dạng JSON): đã sửa độ ưu tiên CSS.
  - `el.append(null)` chèn chữ "null": khi `out.append(...)` nhiều phần tử có điều kiện, dùng `""` thay cho `null` (hàm `h()` thì tự bỏ `null`).
  - Ô tích trong form: sự kiện `input` tới form trước `change`, `compute` vẽ lại bảng bằng giá trị cũ → bảng chmod chặn `input` rồi tự gọi `api.update()`.
  - Node `TextDecoder("windows-1252")` thực chất là Latin-1 (0x80–0x9F không ra ký tự €, ‚…): test chữ UTF-8 đọc nhầm phải tự dựng bảng CP1252.
  - TCVN3 không có chữ hoa có dấu riêng (dùng font .VnTimeH): đoán theo từ, từ chỉ có một chữ hoa đầu ("Tù", "VÒ") thì xét cả dòng.
  - macOS/Windows 11 "đóng băng" phiên bản trong User-Agent: dùng Client Hints khi phân tích chính máy đang mở.
- Đã thử trên trình duyệt (Chrome trong Claude Code): cả 29 công cụ với nút "Mẫu" và vài trường hợp nhập tay (JWT sai khoá, regex lặp vô hạn bị dừng, bảng chmod, đổi chiều Base64/HTML entity); khổ 375 px (không trang nào tràn ngang); chế độ sáng và tối; console không lỗi. Chưa thử trên Safari/iPhone thật (Web Worker dạng module cần Safari 15+, Ed25519 cho JWT EdDSA cần Safari 17+).

### Giai đoạn 4 – Tiện ích Việt Nam + Tính toán & đời sống (xong)

- Đã xong cả 24 công cụ (11 Tiện ích Việt Nam, 13 Tính toán & đời sống). Không bỏ công cụ nào.
- Dữ liệu (`data/*.json`, đã tra văn bản ngày 21/10/2026):
  - `thue-tncn.json`: biểu 5 bậc Luật 109/2025/QH15, giảm trừ 15,5 tr / 6,2 tr (NQ 110/2025/UBTVQH15) từ kỳ tính thuế 2026; giữ biểu 7 bậc cũ trong `previous` để so sánh.
  - `bhxh.json`: lương cơ sở 2.530.000 đ từ 01/7/2026 (NĐ 161/2026/NĐ-CP), tỉ lệ đóng, trần 20 lần, hệ số điều chỉnh tiền lương năm 2026 (CV 340/BHXH-CSXH, chép từ bản PDF gốc).
  - `luong-toi-thieu-vung.json` (NĐ 293/2025, từ 01/01/2026), `gia-dien.json` (QĐ 1279/QĐ-BCT, VAT 8% đến 31/12/2026 theo NQ 204/2025/QH15), `ngay-le.json` (thêm 24/11 Ngày Văn hoá Việt Nam từ 2026), `don-vi-dat.json`.
  - `don-vi-hanh-chinh.json` + `ma-tinh.json` sinh bằng `node scripts/data-dvhc.js` từ bộ dữ liệu mở DiaChiMoi (MIT, ghim commit): 34 tỉnh, 3.321 xã mới, 10.035 xã cũ → mới (471 xã bị chia), cập nhật tới NQ 388/NQ-UBTVQH16. Ký hiệu biển số theo TT 79/2024 + TT 51/2025 khai báo trong script.
  - Năm sau cần xem lại: hệ số trượt giá BHXH (đầu năm), lương cơ sở/lương tối thiểu vùng (thường 1/1 hoặc 1/7), giá điện EVN, thời hạn VAT 8%, lịch nghỉ lễ.
- Phần dùng chung: `assets/calc.js` (`loadData`, `money`, `kv`, `stat`/`stats`, `table`, `csvButton`, `alert`, `note`); CSS `.tbl`, `.stats.flush`, `.meter`, `.legend` trong `app.css`.
- Hàm thuần có test: `lib/tien-luong.js`, `tai-chinh.js`, `tien-dien.js`, `bhxh.js`, `con-giap.js`, `don-vi.js`, `chia-tien.js`, `ngay.js` (khoảng cách, ngày lễ, ngày làm việc, nghỉ bù), `suc-khoe.js`, `bieu-thuc.js` (máy tính khoa học, không dùng eval), `so-la-ma.js`, `phan-tram.js`, `dvhc.js`, `ma-tinh.js`.
- Bẫy đã gặp:
  - Công cụ Write của Claude Code biến chuỗi thoát `\uXXXX` trong nội dung file thành ký tự thật (BOM, dấu kết hợp vô hình): kiểm tra lại bằng grep hoặc sửa bằng script.
  - Ô nhập dạng form tự đồng bộ lên URL: dữ liệu nhạy cảm (số CCCD) phải đặt `url: false` và `share: false`.
  - Biểu đồ SVG co theo viewBox làm chữ trục quá nhỏ trên điện thoại: vẽ theo bề rộng thật của khung (`out.clientWidth`).
  - Số tiền trong ô hẹp bị xuống dòng tách "đ": `money()` dùng khoảng trắng không ngắt.
- Đã thử trên trình duyệt (Chrome trong Claude Code): cả 24 công cụ với dữ liệu mặc định và vài trường hợp nhập tay; khổ 375 px (không trang nào tràn ngang); chế độ sáng và tối; console không lỗi. Chưa thử trên Safari/iPhone thật (ô chọn tháng `type=month` của BHXH một lần trên Safari máy tính sẽ là ô chữ, nhập dạng MM/YYYY vẫn được).

### Giai đoạn 3 – Ảnh (xong)

- Đã xong cả 21 công cụ ảnh (đợt 1: đổi kích thước, cắt, xoay/lật, đổi định dạng, xoá EXIF; đợt 2: 13 công cụ còn lại).
- Phần dùng chung để các giai đoạn sau dùng lại:
  - `assets/image.js`: `decodeImage` (cả HEIC, SVG chỉ có viewBox), `formatOptions(el)` + `outType()` (ô "Lưu dưới dạng"), `encode()` xuất JPG/PNG/WebP/AVIF, `softBlur()` (làm mờ chạy mọi trình duyệt, không cần `ctx.filter`).
  - `assets/fonts.js`: font có dấu tiếng Việt (Be Vietnam Pro, Roboto Slab, Dancing Script, Pacifico, Great Vibes) tải bằng FontFace khi cần.
  - CSS chung trong `app.css`: `.ist` / `.ist-stage` (vùng xem trước ảnh có nền ô cờ), `.ist-preview`, `.color-in`, `.two`, `.out-text`.
  - Hàm thuần có test: `lib/image-geom.js` (đổi cỡ, xoay/lật, khung cắt, chia lưới, bố cục ghép), `lib/exif.js` (đọc/xoá EXIF, GPS), `lib/image-data.js` (ICO, kích thước SVG, hệ màu, bảng màu median cut, tách nét mực theo nền giấy + lọc màu mực), `lib/ocr-text.js` (nối dòng OCR thành đoạn).
  - Thư viện mới: `@jsquash/avif` (AVIF), `gifenc` (GIF), `tesseract.js` 7 + lõi 7 + dữ liệu `@tesseract.js-data/vie|eng` (OCR, khai báo đường dẫn trong `tools/ocr.js`).
- Bẫy đã gặp:
  - Công cụ dạng `custom` có `onChange` mà hàm vẽ lại gọi `ctx.refresh()` sẽ lặp vô hạn (refresh → onChange → vẽ → refresh): trong `onChange` chỉ vẽ, không refresh; hoặc so tuỳ chọn cũ/mới trước khi xử lý lại.
  - ở lucide-static 1.52, icon `flip-vertical-2` là soi gương trái–phải (lật ngang), `flip-horizontal-2` là lật trên–dưới.
  - SVG chỉ có viewBox không có kích thước tự nhiên → `createImageBitmap` lỗi; phải đặt width/height (`svgWithSize`) rồi vẽ qua `<img>`.
  - Vùng xem trước đặt lớp phủ (khung, tay nắm) theo % phải nằm trong `.ist` (flex, căn giữa) để khung co đúng cỡ ảnh; lớp tối dùng box-shadow lớn phải nằm trong phần tử có `overflow: hidden`.
  - Thang chất lượng AVIF (libavif) khắt khe hơn JPG: trừ 20 để cùng con số cho chất lượng tương đương.
  - Cổng 8080 trên máy có thể bị ứng dụng khác chiếm: dùng preview "bbetools-8791".
- File mẫu mới: `anh-co-gps.jpg`, `anh-iphone-co-gps.heic`, `chu-ky-chup.jpg`, `van-ban-chup.jpg` (sinh bằng `make-samples.js`), `logo-mau.svg` (viết tay).
- Đã thử trên trình duyệt (Chrome): cả 21 công cụ với file mẫu; khổ 375 px; chế độ sáng và tối; console không lỗi (trừ cảnh báo nội bộ của Tesseract "Parameter not found"). Chưa thử trên Safari/iPhone thật.

### Giai đoạn 2 – PDF (xong)

- Đã xong cả 24 công cụ PDF (3 đợt: tách/xoá/sắp xếp/xoay/PDF sang ảnh; ảnh sang PDF/văn bản/ký/đánh số/watermark; 12 công cụ còn lại).
- Phần dùng chung để các giai đoạn sau dùng lại:
  - `assets/pdf.js`: mở PDF (hỏi mật khẩu), `openItem`/`lockButton` cho danh sách file, `embedVnFont` (nhúng font tiếng Việt qua fontkit).
  - `assets/pdf-pages.js`: bảng trang `pageTool` (chọn, xoay, xoá, đổi chỗ, `decorate` xem trước), `posGrid`, `colorPick`.
  - `assets/pdf-objects.js`: đi qua nội dung trang, form XObject, pattern, ảnh; giải nén luồng, đọc hệ màu, giải mã ảnh.
  - Hàm thuần có test: `lib/page-ranges.js`, `lib/pdf-geom.js`, `lib/pdf-text.js`, `lib/pdf-content.js` (viết lại lệnh màu), `lib/pdf-image.js` (giải mã ảnh thô), `lib/scan.js` (tìm góc, nắn phối cảnh, làm trắng nền).
- Bẫy đã gặp:
  - Font chuẩn Helvetica của pdf-lib không có dấu tiếng Việt: vẽ chữ lên canvas rồi nhúng PNG, hoặc nhúng font TTF (`embedVnFont`). fontkit 1.1.1 lỗi khi `subset: true` với font Be Vietnam Pro → nhúng nguyên font.
  - `decodePDFRawStream` của pdf-lib không bỏ Predictor PNG → tự xử lý (`unPredict`).
  - `setKeywords()` của pdf-lib nối từ khoá bằng dấu cách → ghi thẳng chuỗi.
  - Bản pdf-lib nén đổi tên lớp: dùng `instanceof L.PDFTextField`, không dùng `constructor.name`.
  - Nút chọn một (radio) có giá trị có dấu: pdf-lib lưu giá trị trong `/Opt`, tên trạng thái là "0", "1"… → đối chiếu qua widget.
  - `classList.toggle(tên, undefined)` đảo lớp thay vì tắt → luôn ép kiểu boolean.
  - PDF do Chrome in hay tách một chữ có dấu thành nhiều mảnh chữ → tìm chữ phải ghép các mảnh của cả trang.
  - Tạo PDF mẫu bằng Chrome: phần tử tràn khổ giấy làm Chrome thu nhỏ cả tài liệu; dùng `writing-mode` thay cho xoay, tránh `opacity`.
- File mẫu PDF có form, ảnh, mật khẩu và ảnh chụp giấy tờ sinh bằng `scripts/samples/pdf-lib.html`, `giay-chup.html` (chạy qua `scripts/make-samples.js`).

## Khi chạy trên cloud

- Phiên cloud thường làm trên nhánh riêng rồi mở pull request. GitHub Pages chỉ lấy từ `main`, nên trang web chỉ cập nhật sau khi PR được merge.
- `scripts/make-samples.js` cần Google Chrome và `sips` (chỉ có trên macOS, để tạo ảnh HEIC). Các file mẫu hiện có đã nằm trong `samples/`; nếu môi trường thiếu công cụ thì tạo file mẫu mới bằng cách khác hoặc ghi rõ phần chưa tạo được.
- Nếu không có trình duyệt để chạy thử thật, phải nói rõ là chưa thử trên trình duyệt, không báo là đã kiểm tra.
- Môi trường cloud có Chromium + Playwright (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, module ở `/opt/node22/lib/node_modules/playwright`). Thư viện CDN đi qua proxy: truyền `args: ["--proxy-server=" + process.env.HTTPS_PROXY]` khi `chromium.launch` (đừng dùng tuỳ chọn `proxy` của Playwright vì nó ép cả `localhost` qua proxy). Chạy `node scripts/serve.js 8791` rồi mở `http://localhost:8791/bbetools/<slug>/`, bấm "Thử với file mẫu", đọc file kết quả qua `fetch(blob:)` để kiểm tra bằng `pdfinfo`/`pdftotext`.

## Công cụ

<!-- tools:start -->
131/142 công cụ đã xong (⏳ = chưa làm, đang ẩn khỏi trang web).

| Nhóm | Xong | Công cụ |
|---|---|---|
| PDF | 24/24 | [Ghép PDF](https://springbbe.github.io/bbetools/ghep-pdf/) · [Tách PDF](https://springbbe.github.io/bbetools/tach-pdf/) · [Xoá trang PDF](https://springbbe.github.io/bbetools/xoa-trang-pdf/) · [Sắp xếp trang PDF](https://springbbe.github.io/bbetools/sap-xep-trang-pdf/) · [Xoay PDF](https://springbbe.github.io/bbetools/xoay-pdf/) · [Nén PDF](https://springbbe.github.io/bbetools/nen-pdf/) · [PDF sang ảnh](https://springbbe.github.io/bbetools/pdf-sang-anh/) · [Ảnh sang PDF](https://springbbe.github.io/bbetools/anh-sang-pdf/) · [PDF sang văn bản](https://springbbe.github.io/bbetools/pdf-sang-van-ban/) · [Ký PDF](https://springbbe.github.io/bbetools/ky-pdf/) · [Đánh số trang PDF](https://springbbe.github.io/bbetools/danh-so-trang-pdf/) · [Chèn watermark PDF](https://springbbe.github.io/bbetools/watermark-pdf/) · [Đặt mật khẩu PDF](https://springbbe.github.io/bbetools/dat-mat-khau-pdf/) · [Mở khoá PDF](https://springbbe.github.io/bbetools/mo-khoa-pdf/) · [Trích xuất trang PDF](https://springbbe.github.io/bbetools/trich-xuat-trang-pdf/) · [Trích ảnh trong PDF](https://springbbe.github.io/bbetools/trich-anh-pdf/) · [Cắt lề PDF](https://springbbe.github.io/bbetools/cat-le-pdf/) · [Chèn trang trắng](https://springbbe.github.io/bbetools/chen-trang-trang-pdf/) · [PDF đen trắng](https://springbbe.github.io/bbetools/pdf-den-trang/) · [Sửa thông tin PDF](https://springbbe.github.io/bbetools/sua-thong-tin-pdf/) · [Điền form PDF](https://springbbe.github.io/bbetools/dien-form-pdf/) · [Làm phẳng form PDF](https://springbbe.github.io/bbetools/lam-phang-form-pdf/) · [Xem PDF](https://springbbe.github.io/bbetools/xem-pdf/) · [Scan tài liệu bằng camera](https://springbbe.github.io/bbetools/scan-tai-lieu/) |
| Ảnh | 21/21 | [Nén ảnh](https://springbbe.github.io/bbetools/nen-anh/) · [Đổi kích thước ảnh](https://springbbe.github.io/bbetools/doi-kich-thuoc-anh/) · [Cắt ảnh](https://springbbe.github.io/bbetools/cat-anh/) · [Xoay, lật ảnh](https://springbbe.github.io/bbetools/xoay-anh/) · [Đổi định dạng ảnh](https://springbbe.github.io/bbetools/doi-dinh-dang-anh/) · [HEIC sang JPG](https://springbbe.github.io/bbetools/heic-sang-jpg/) · [Làm ảnh thẻ](https://springbbe.github.io/bbetools/anh-the/) · [Xoá phông ảnh](https://springbbe.github.io/bbetools/xoa-phong-anh/) · [Che, làm mờ vùng nhạy cảm](https://springbbe.github.io/bbetools/che-mo-anh/) · [Xoá thông tin EXIF/GPS](https://springbbe.github.io/bbetools/xoa-exif-anh/) · [Chèn watermark ảnh](https://springbbe.github.io/bbetools/watermark-anh/) · [Chèn chữ lên ảnh](https://springbbe.github.io/bbetools/chen-chu-len-anh/) · [Ghép ảnh](https://springbbe.github.io/bbetools/ghep-anh/) · [Chia ảnh thành lưới](https://springbbe.github.io/bbetools/chia-anh/) · [Tạo favicon](https://springbbe.github.io/bbetools/tao-favicon/) · [SVG sang PNG](https://springbbe.github.io/bbetools/svg-sang-png/) · [Ảnh sang Base64](https://springbbe.github.io/bbetools/anh-sang-base64/) · [Lấy màu từ ảnh](https://springbbe.github.io/bbetools/lay-mau-tu-anh/) · [Tạo GIF từ ảnh](https://springbbe.github.io/bbetools/tao-gif/) · [Ảnh sang chữ (OCR)](https://springbbe.github.io/bbetools/anh-sang-chu/) · [Tách chữ ký, con dấu](https://springbbe.github.io/bbetools/tach-chu-ky/) |
| Âm thanh & video | 0/11 | Ghi âm ⏳ · Quay màn hình ⏳ · Cắt âm thanh ⏳ · Ghép âm thanh ⏳ · Đổi định dạng âm thanh ⏳ · Video sang MP3 ⏳ · Video sang GIF ⏳ · Cắt video ⏳ · Nén video ⏳ · Chụp khung hình từ video ⏳ · Đọc văn bản thành giọng nói ⏳ |
| Văn bản | 12/12 | [Đếm từ & ký tự](https://springbbe.github.io/bbetools/dem-tu/) · [Đổi chữ hoa/thường](https://springbbe.github.io/bbetools/doi-chu-hoa-thuong/) · [Bỏ dấu tiếng Việt](https://springbbe.github.io/bbetools/bo-dau-tieng-viet/) · [Tạo slug](https://springbbe.github.io/bbetools/tao-slug/) · [So sánh văn bản](https://springbbe.github.io/bbetools/so-sanh-van-ban/) · [Lọc dòng trùng & sắp xếp dòng](https://springbbe.github.io/bbetools/loc-dong-trung/) · [Tìm và thay thế](https://springbbe.github.io/bbetools/tim-va-thay-the/) · [Chuyển mã Unicode ↔ TCVN3 ↔ VNI](https://springbbe.github.io/bbetools/chuyen-ma-tcvn3-vni/) · [Sửa chữ gõ sai bộ gõ](https://springbbe.github.io/bbetools/sua-loi-go-telex/) · [Chữ kiểu nghệ thuật](https://springbbe.github.io/bbetools/chu-kieu-nghe-thuat/) · [Markdown sang HTML](https://springbbe.github.io/bbetools/markdown-sang-html/) · [Lorem ipsum tiếng Việt](https://springbbe.github.io/bbetools/lorem-ipsum-tieng-viet/) |
| Tiện ích Việt Nam | 14/14 | [Đọc số thành chữ](https://springbbe.github.io/bbetools/doc-so-thanh-chu/) · [Tạo mã QR chuyển khoản (VietQR)](https://springbbe.github.io/bbetools/tao-ma-qr-chuyen-khoan/) · [Đổi lịch âm ↔ dương](https://springbbe.github.io/bbetools/doi-lich-am-duong/) · [Xem tuổi, con giáp, mệnh](https://springbbe.github.io/bbetools/xem-tuoi-con-giap/) · [Đếm ngược Tết](https://springbbe.github.io/bbetools/dem-nguoc-tet/) · [Tính lương gross ↔ net](https://springbbe.github.io/bbetools/tinh-luong-gross-net/) · [Tính thuế TNCN](https://springbbe.github.io/bbetools/tinh-thue-tncn/) · [Tính lãi vay trả góp](https://springbbe.github.io/bbetools/tinh-lai-vay-tra-gop/) · [Tính lãi tiết kiệm](https://springbbe.github.io/bbetools/tinh-lai-tiet-kiem/) · [Tính tiền điện bậc thang](https://springbbe.github.io/bbetools/tinh-tien-dien/) · [Đổi đơn vị đất](https://springbbe.github.io/bbetools/doi-don-vi-dat/) · [Tra mã tỉnh trên CCCD, biển số xe](https://springbbe.github.io/bbetools/tra-ma-tinh-cccd-bien-so/) · [Tra đơn vị hành chính mới](https://springbbe.github.io/bbetools/tra-don-vi-hanh-chinh-moi/) · [Tính BHXH một lần](https://springbbe.github.io/bbetools/tinh-bhxh-mot-lan/) |
| Tính toán & đời sống | 13/13 | [Máy tính phần trăm](https://springbbe.github.io/bbetools/tinh-phan-tram/) · [Tính giảm giá](https://springbbe.github.io/bbetools/tinh-giam-gia/) · [Tính VAT](https://springbbe.github.io/bbetools/tinh-vat/) · [Lãi kép](https://springbbe.github.io/bbetools/tinh-lai-kep/) · [Chia tiền nhóm](https://springbbe.github.io/bbetools/chia-tien-nhom/) · [Đổi đơn vị](https://springbbe.github.io/bbetools/doi-don-vi/) · [Tính tuổi](https://springbbe.github.io/bbetools/tinh-tuoi/) · [Cộng trừ ngày & đếm ngày làm việc](https://springbbe.github.io/bbetools/cong-tru-ngay/) · [Tính BMI](https://springbbe.github.io/bbetools/tinh-bmi/) · [Calo cần mỗi ngày (TDEE)](https://springbbe.github.io/bbetools/tinh-calo-tdee/) · [Tính ngày dự sinh](https://springbbe.github.io/bbetools/tinh-ngay-du-sinh/) · [Máy tính khoa học](https://springbbe.github.io/bbetools/may-tinh-khoa-hoc/) · [Đổi số La Mã](https://springbbe.github.io/bbetools/so-la-ma/) |
| QR & mã vạch | 3/3 | [Tạo mã QR](https://springbbe.github.io/bbetools/tao-ma-qr/) · [Quét mã QR](https://springbbe.github.io/bbetools/quet-ma-qr/) · [Tạo mã vạch](https://springbbe.github.io/bbetools/tao-ma-vach/) |
| Văn phòng & dữ liệu | 8/8 | [Xem file Excel/CSV](https://springbbe.github.io/bbetools/xem-file-excel/) · [Excel ↔ CSV](https://springbbe.github.io/bbetools/excel-sang-csv/) · [Gộp nhiều file Excel](https://springbbe.github.io/bbetools/gop-file-excel/) · [Tách Excel theo cột](https://springbbe.github.io/bbetools/tach-excel-theo-cot/) · [JSON ↔ Excel](https://springbbe.github.io/bbetools/json-sang-excel/) · [Trộn thư](https://springbbe.github.io/bbetools/tron-thu/) · [Tạo chữ ký email](https://springbbe.github.io/bbetools/tao-chu-ky-email/) · [Tạo hoá đơn, báo giá](https://springbbe.github.io/bbetools/tao-hoa-don-bao-gia/) |
| Lập trình | 19/19 | [Định dạng & kiểm tra JSON](https://springbbe.github.io/bbetools/dinh-dang-json/) · [JSON ↔ CSV/YAML](https://springbbe.github.io/bbetools/json-sang-csv-yaml/) · [Mã hoá/giải mã Base64](https://springbbe.github.io/bbetools/ma-hoa-base64/) · [Mã hoá URL](https://springbbe.github.io/bbetools/ma-hoa-url/) · [Mã hoá HTML entity](https://springbbe.github.io/bbetools/html-entity/) · [Giải mã JWT](https://springbbe.github.io/bbetools/giai-ma-jwt/) · [Tạo UUID](https://springbbe.github.io/bbetools/tao-uuid/) · [Hash MD5/SHA](https://springbbe.github.io/bbetools/tao-ma-hash/) · [Kiểm tra regex](https://springbbe.github.io/bbetools/kiem-tra-regex/) · [Đổi timestamp](https://springbbe.github.io/bbetools/doi-timestamp/) · [Giải thích cron](https://springbbe.github.io/bbetools/giai-thich-cron/) · [Đổi mã màu](https://springbbe.github.io/bbetools/doi-ma-mau/) · [Tạo CSS gradient, box-shadow](https://springbbe.github.io/bbetools/tao-css-gradient-shadow/) · [Định dạng SQL](https://springbbe.github.io/bbetools/dinh-dang-sql/) · [Nén JS/CSS/HTML](https://springbbe.github.io/bbetools/nen-js-css-html/) · [Đổi cơ số](https://springbbe.github.io/bbetools/doi-co-so/) · [Tính chmod](https://springbbe.github.io/bbetools/tinh-chmod/) · [Phân tích User-Agent](https://springbbe.github.io/bbetools/phan-tich-user-agent/) · [Tra mã trạng thái HTTP](https://springbbe.github.io/bbetools/ma-trang-thai-http/) |
| Bảo mật | 6/6 | [Tạo mật khẩu mạnh](https://springbbe.github.io/bbetools/tao-mat-khau/) · [Kiểm tra độ mạnh mật khẩu](https://springbbe.github.io/bbetools/kiem-tra-mat-khau/) · [Mã hoá/giải mã file](https://springbbe.github.io/bbetools/ma-hoa-file/) · [Mã hoá văn bản](https://springbbe.github.io/bbetools/ma-hoa-van-ban/) · [Tính checksum file](https://springbbe.github.io/bbetools/tinh-checksum-file/) · [Tạo mã 2FA (TOTP)](https://springbbe.github.io/bbetools/tao-ma-2fa/) |
| Năng suất & ngẫu nhiên | 11/11 | [Pomodoro](https://springbbe.github.io/bbetools/pomodoro/) · [Bấm giờ](https://springbbe.github.io/bbetools/bam-gio/) · [Hẹn giờ đếm ngược](https://springbbe.github.io/bbetools/hen-gio/) · [Vòng quay may mắn](https://springbbe.github.io/bbetools/vong-quay-may-man/) · [Bốc thăm, chia đội](https://springbbe.github.io/bbetools/boc-tham-chia-doi/) · [Tung xu & xúc xắc](https://springbbe.github.io/bbetools/tung-xu-xuc-xac/) · [Số ngẫu nhiên](https://springbbe.github.io/bbetools/so-ngau-nhien/) · [Ghi chú nhanh](https://springbbe.github.io/bbetools/ghi-chu-nhanh/) · [Checklist](https://springbbe.github.io/bbetools/checklist/) · [Đồng hồ thế giới](https://springbbe.github.io/bbetools/dong-ho-the-gioi/) · [Kiểm tra camera, micro, bàn phím, màn hình](https://springbbe.github.io/bbetools/kiem-tra-thiet-bi/) |
<!-- tools:end -->
