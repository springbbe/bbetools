# File mẫu

Dùng cho nút "Thử với file mẫu" trên các trang công cụ. Trừ ảnh chân dung và `logo-mau.svg` (viết tay), mọi file được tạo bởi `node scripts/make-samples.js` từ mã trong `scripts/samples/` (nội dung tự vẽ, không vướng bản quyền). Các file PDF có form, ảnh, mật khẩu được sinh bằng pdf-lib trong `scripts/samples/pdf-lib.html`; file Excel, CSV, JSON, Word sinh bằng `node scripts/samples/van-phong.js` (dữ liệu giả, hạt giống cố định).

| File | Nội dung | Dùng cho |
|---|---|---|
| `bao-cao-quy-1.pdf`, `bao-cao-quy-2.pdf` | báo cáo giả, chữ vector tiếng Việt | Ghép PDF, Ký PDF (quý 1) |
| `tai-lieu-scan.pdf` | 2 trang "scan" (ảnh JPEG lớn) | Nén PDF |
| `tai-lieu-co-anh.pdf` | 2 trang: ảnh JPEG, PNG, PNG nền trong suốt, biểu tượng 32 px, khối màu RGB và CMYK, chữ tiếng Việt nhúng font | Trích ảnh, PDF đen trắng |
| `to-khai-mau.pdf`, `to-khai-da-dien.pdf` | tờ khai giả có form (ô chữ, chọn một, danh sách, ô đánh dấu), bản trống và bản đã điền | Điền form, Làm phẳng form |
| `mau-co-mat-khau-1234.pdf` | báo cáo quý 2 khoá bằng mật khẩu `1234`, chặn in và sao chép (AES-256) | Mở khoá PDF |
| `so-tay-nhan-vien.pdf` | 8 trang có số trang to; trang 5 là bảng in nằm ngang (bị xoay) | Tách, xoá, sắp xếp, xoay trang, PDF sang ảnh, PDF sang văn bản, đánh số trang, watermark |
| `anh-phong-canh.jpg` | phong cảnh vẽ bằng thuật toán, 2400×1600 | Nén ảnh, Ảnh sang PDF |
| `anh-chup-man-hinh.png` | ảnh chụp màn hình trang chủ BbeTools | Nén ảnh, Ảnh sang PDF |
| `anh-co-gps.jpg`, `anh-iphone-co-gps.heic` | phong cảnh 1600 px gắn EXIF/GPS/XMP **giả** (Hồ Hoàn Kiếm), bản JPG và HEIC | Xoá thông tin EXIF/GPS |
| `chu-ky-chup.jpg` | chữ ký mực xanh đè con dấu đỏ trên giấy có bóng đổ (nội dung tự vẽ) | Tách chữ ký, con dấu |
| `van-ban-chup.jpg` | thông báo tiếng Việt chụp từ giấy (tự vẽ) | Ảnh sang chữ (OCR) |
| `logo-mau.svg` | logo chữ B vẽ tay bằng SVG (chỉ có viewBox) | SVG sang PNG, Tạo favicon, Ảnh sang Base64 |
| `anh-iphone.heic` | ảnh HEIC tạo bằng `sips` | HEIC sang JPG |
| `ma-qr-mau.png` | mã VietQR của một tài khoản giả | Quét mã QR, Ảnh sang PDF |
| `nhan-vien.xlsx` | 40 nhân viên giả (ngày, số tiền, số điện thoại có 0 đầu) + sheet "Phòng ban" có công thức COUNTIF/SUMIF | Xem file Excel, Excel ↔ CSV, Tách Excel theo cột |
| `ban-hang-thang-9.xlsx`, `ban-hang-thang-10.xlsx`, `ban-hang-thang-11.csv` | đơn hàng giả 3 tháng; bản CSV dùng dấu chấm phẩy, số kiểu Việt Nam, thứ tự cột khác và thêm cột "Ghi chú" | Gộp nhiều file Excel, Excel ↔ CSV |
| `san-pham.json` | danh sách sản phẩm có đối tượng lồng nhau và mảng | JSON ↔ Excel |
| `khach-moi.xlsx`, `giay-moi-mau.docx` | danh sách khách mời giả và mẫu giấy mời Word có trường `{{…}}`, `«…»` (bị cắt thành nhiều run) và một MERGEFIELD | Trộn thư |
| `bao-cao-mat-khau-1234.pdf.bbe` | `bao-cao-quy-1.pdf` mã hoá bằng mật khẩu `1234` (định dạng BbeTools, AES-256-GCM); sinh bằng `node scripts/samples/bao-mat.js` | Mã hoá/giải mã file |
| `bao-cao-quy-1.pdf.sha256` | mã SHA-256 của `bao-cao-quy-1.pdf` theo định dạng `sha256sum` | Tính checksum file |
| `chan-dung-mau.jpg` | chân dung **người không có thật** do StyleGAN tạo | Làm ảnh thẻ, Xoá phông, Che/làm mờ |

`chan-dung-mau.jpg`: [File:Woman 1.jpg](https://commons.wikimedia.org/wiki/File:Woman_1.jpg) trên Wikimedia Commons, **public domain** (ảnh do mạng nơ-ron tạo, người trong ảnh không tồn tại).
