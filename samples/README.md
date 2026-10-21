# File mẫu

Dùng cho nút "Thử với file mẫu" trên các trang công cụ. Trừ ảnh chân dung, mọi file được tạo bởi `node scripts/make-samples.js` từ mã trong `scripts/samples/` (nội dung tự vẽ, không vướng bản quyền). Các file PDF có form, ảnh, mật khẩu được sinh bằng pdf-lib trong `scripts/samples/pdf-lib.html`.

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
| `anh-iphone.heic` | ảnh HEIC tạo bằng `sips` | HEIC sang JPG |
| `ma-qr-mau.png` | mã VietQR của một tài khoản giả | Quét mã QR, Ảnh sang PDF |
| `chan-dung-mau.jpg` | chân dung **người không có thật** do StyleGAN tạo | Làm ảnh thẻ |

`chan-dung-mau.jpg`: [File:Woman 1.jpg](https://commons.wikimedia.org/wiki/File:Woman_1.jpg) trên Wikimedia Commons, **public domain** (ảnh do mạng nơ-ron tạo, người trong ảnh không tồn tại).
