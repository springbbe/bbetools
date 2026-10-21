# Kế hoạch xây dựng BbeTools (tài liệu tạm)

File này chỉ dùng trong lúc xây dựng. Khi mọi giai đoạn đã xong: **xoá file này** và dòng trỏ tới nó trong `CLAUDE.md`. `scripts/build.js` tự bỏ qua khi không còn file này.

## Lộ trình

Hai bảng dưới đây do `scripts/build.js` sinh từ `tools.json` (trường `phase` của mỗi nhóm, `status` của từng công cụ), nên luôn khớp tiến độ thật. Đừng sửa tay giữa các dấu `<!-- … -->`.

<!-- roadmap:start -->
| Giai đoạn | Nhóm | Công cụ xong | Trạng thái | Câu lệnh gợi ý cho AI |
|---|---|---|---|---|
| 1 | Lõi, registry, trang tự sinh + 13 công cụ tiêu biểu | 13 | ✅ Xong | |
| 2 | PDF | 24/24 | ✅ Xong |  |
| 3 | Ảnh | 3/21 | ⏳ Còn 18 công cụ | `Làm giai đoạn 3 của BbeTools theo CLAUDE.md` |
| 4 | Tiện ích Việt Nam + Tính toán & đời sống | 3/27 | ⏳ Còn 24 công cụ | `Làm giai đoạn 4 của BbeTools theo CLAUDE.md` |
| 5 | Văn bản + Lập trình | 2/31 | ⏳ Còn 29 công cụ | `Làm giai đoạn 5 của BbeTools theo CLAUDE.md` |
| 6 | QR & mã vạch + Văn phòng & dữ liệu | 2/11 | ⏳ Còn 9 công cụ | `Làm giai đoạn 6 của BbeTools theo CLAUDE.md` |
| 7 | Bảo mật + Năng suất & ngẫu nhiên | 1/17 | ⏳ Còn 16 công cụ | `Làm giai đoạn 7 của BbeTools theo CLAUDE.md` |
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
35/142 công cụ đã xong (⏳ = chưa làm, đang ẩn khỏi trang web).

| Nhóm | Xong | Công cụ |
|---|---|---|
| PDF | 24/24 | [Ghép PDF](https://springbbe.github.io/bbetools/ghep-pdf/) · [Tách PDF](https://springbbe.github.io/bbetools/tach-pdf/) · [Xoá trang PDF](https://springbbe.github.io/bbetools/xoa-trang-pdf/) · [Sắp xếp trang PDF](https://springbbe.github.io/bbetools/sap-xep-trang-pdf/) · [Xoay PDF](https://springbbe.github.io/bbetools/xoay-pdf/) · [Nén PDF](https://springbbe.github.io/bbetools/nen-pdf/) · [PDF sang ảnh](https://springbbe.github.io/bbetools/pdf-sang-anh/) · [Ảnh sang PDF](https://springbbe.github.io/bbetools/anh-sang-pdf/) · [PDF sang văn bản](https://springbbe.github.io/bbetools/pdf-sang-van-ban/) · [Ký PDF](https://springbbe.github.io/bbetools/ky-pdf/) · [Đánh số trang PDF](https://springbbe.github.io/bbetools/danh-so-trang-pdf/) · [Chèn watermark PDF](https://springbbe.github.io/bbetools/watermark-pdf/) · [Đặt mật khẩu PDF](https://springbbe.github.io/bbetools/dat-mat-khau-pdf/) · [Mở khoá PDF](https://springbbe.github.io/bbetools/mo-khoa-pdf/) · [Trích xuất trang PDF](https://springbbe.github.io/bbetools/trich-xuat-trang-pdf/) · [Trích ảnh trong PDF](https://springbbe.github.io/bbetools/trich-anh-pdf/) · [Cắt lề PDF](https://springbbe.github.io/bbetools/cat-le-pdf/) · [Chèn trang trắng](https://springbbe.github.io/bbetools/chen-trang-trang-pdf/) · [PDF đen trắng](https://springbbe.github.io/bbetools/pdf-den-trang/) · [Sửa thông tin PDF](https://springbbe.github.io/bbetools/sua-thong-tin-pdf/) · [Điền form PDF](https://springbbe.github.io/bbetools/dien-form-pdf/) · [Làm phẳng form PDF](https://springbbe.github.io/bbetools/lam-phang-form-pdf/) · [Xem PDF](https://springbbe.github.io/bbetools/xem-pdf/) · [Scan tài liệu bằng camera](https://springbbe.github.io/bbetools/scan-tai-lieu/) |
| Ảnh | 3/21 | [Nén ảnh](https://springbbe.github.io/bbetools/nen-anh/) · Đổi kích thước ảnh ⏳ · Cắt ảnh ⏳ · Xoay, lật ảnh ⏳ · Đổi định dạng ảnh ⏳ · [HEIC sang JPG](https://springbbe.github.io/bbetools/heic-sang-jpg/) · [Làm ảnh thẻ](https://springbbe.github.io/bbetools/anh-the/) · Xoá phông ảnh ⏳ · Che, làm mờ vùng nhạy cảm ⏳ · Xoá thông tin EXIF/GPS ⏳ · Chèn watermark ảnh ⏳ · Chèn chữ lên ảnh ⏳ · Ghép ảnh ⏳ · Chia ảnh thành lưới ⏳ · Tạo favicon ⏳ · SVG sang PNG ⏳ · Ảnh sang Base64 ⏳ · Lấy màu từ ảnh ⏳ · Tạo GIF từ ảnh ⏳ · Ảnh sang chữ (OCR) ⏳ · Tách chữ ký, con dấu ⏳ |
| Âm thanh & video | 0/11 | Ghi âm ⏳ · Quay màn hình ⏳ · Cắt âm thanh ⏳ · Ghép âm thanh ⏳ · Đổi định dạng âm thanh ⏳ · Video sang MP3 ⏳ · Video sang GIF ⏳ · Cắt video ⏳ · Nén video ⏳ · Chụp khung hình từ video ⏳ · Đọc văn bản thành giọng nói ⏳ |
| Văn bản | 1/12 | [Đếm từ & ký tự](https://springbbe.github.io/bbetools/dem-tu/) · Đổi chữ hoa/thường ⏳ · Bỏ dấu tiếng Việt ⏳ · Tạo slug ⏳ · So sánh văn bản ⏳ · Lọc dòng trùng & sắp xếp dòng ⏳ · Tìm và thay thế ⏳ · Chuyển mã Unicode ↔ TCVN3 ↔ VNI ⏳ · Sửa chữ gõ sai bộ gõ ⏳ · Chữ kiểu nghệ thuật ⏳ · Markdown sang HTML ⏳ · Lorem ipsum tiếng Việt ⏳ |
| Tiện ích Việt Nam | 3/14 | [Đọc số thành chữ](https://springbbe.github.io/bbetools/doc-so-thanh-chu/) · [Tạo mã QR chuyển khoản (VietQR)](https://springbbe.github.io/bbetools/tao-ma-qr-chuyen-khoan/) · [Đổi lịch âm ↔ dương](https://springbbe.github.io/bbetools/doi-lich-am-duong/) · Xem tuổi, con giáp, mệnh ⏳ · Đếm ngược Tết ⏳ · Tính lương gross ↔ net ⏳ · Tính thuế TNCN ⏳ · Tính lãi vay trả góp ⏳ · Tính lãi tiết kiệm ⏳ · Tính tiền điện bậc thang ⏳ · Đổi đơn vị đất ⏳ · Tra mã tỉnh trên CCCD, biển số xe ⏳ · Tra đơn vị hành chính mới ⏳ · Tính BHXH một lần ⏳ |
| Tính toán & đời sống | 0/13 | Máy tính phần trăm ⏳ · Tính giảm giá ⏳ · Tính VAT ⏳ · Lãi kép ⏳ · Chia tiền nhóm ⏳ · Đổi đơn vị ⏳ · Tính tuổi ⏳ · Cộng trừ ngày & đếm ngày làm việc ⏳ · Tính BMI ⏳ · Calo cần mỗi ngày (TDEE) ⏳ · Tính ngày dự sinh ⏳ · Máy tính khoa học ⏳ · Đổi số La Mã ⏳ |
| QR & mã vạch | 2/3 | [Tạo mã QR](https://springbbe.github.io/bbetools/tao-ma-qr/) · [Quét mã QR](https://springbbe.github.io/bbetools/quet-ma-qr/) · Tạo mã vạch ⏳ |
| Văn phòng & dữ liệu | 0/8 | Xem file Excel/CSV ⏳ · Excel ↔ CSV ⏳ · Gộp nhiều file Excel ⏳ · Tách Excel theo cột ⏳ · JSON ↔ Excel ⏳ · Trộn thư ⏳ · Tạo chữ ký email ⏳ · Tạo hoá đơn, báo giá ⏳ |
| Lập trình | 1/19 | [Định dạng & kiểm tra JSON](https://springbbe.github.io/bbetools/dinh-dang-json/) · JSON ↔ CSV/YAML ⏳ · Mã hoá/giải mã Base64 ⏳ · Mã hoá URL ⏳ · Mã hoá HTML entity ⏳ · Giải mã JWT ⏳ · Tạo UUID ⏳ · Hash MD5/SHA ⏳ · Kiểm tra regex ⏳ · Đổi timestamp ⏳ · Giải thích cron ⏳ · Đổi mã màu ⏳ · Tạo CSS gradient, box-shadow ⏳ · Định dạng SQL ⏳ · Nén JS/CSS/HTML ⏳ · Đổi cơ số ⏳ · Tính chmod ⏳ · Phân tích User-Agent ⏳ · Tra mã trạng thái HTTP ⏳ |
| Bảo mật | 0/6 | Tạo mật khẩu mạnh ⏳ · Kiểm tra độ mạnh mật khẩu ⏳ · Mã hoá/giải mã file ⏳ · Mã hoá văn bản ⏳ · Tính checksum file ⏳ · Tạo mã 2FA (TOTP) ⏳ |
| Năng suất & ngẫu nhiên | 1/11 | [Pomodoro](https://springbbe.github.io/bbetools/pomodoro/) · Bấm giờ ⏳ · Hẹn giờ đếm ngược ⏳ · Vòng quay may mắn ⏳ · Bốc thăm, chia đội ⏳ · Tung xu & xúc xắc ⏳ · Số ngẫu nhiên ⏳ · Ghi chú nhanh ⏳ · Checklist ⏳ · Đồng hồ thế giới ⏳ · Kiểm tra camera, micro, bàn phím, màn hình ⏳ |
<!-- tools:end -->
