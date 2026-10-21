# File mẫu

Dùng cho nút "Thử với file mẫu" trên các trang công cụ. Trừ ảnh chân dung, mọi file được tạo bởi `node scripts/make-samples.js` từ mã trong `scripts/samples/` (nội dung tự vẽ, không vướng bản quyền).

| File | Nội dung | Dùng cho |
|---|---|---|
| `bao-cao-quy-1.pdf`, `bao-cao-quy-2.pdf` | báo cáo giả, chữ vector tiếng Việt | Ghép PDF |
| `tai-lieu-scan.pdf` | 2 trang "scan" (ảnh JPEG lớn) | Nén PDF |
| `anh-phong-canh.jpg` | phong cảnh vẽ bằng thuật toán, 2400×1600 | Nén ảnh |
| `anh-chup-man-hinh.png` | ảnh chụp màn hình trang chủ BbeTools | Nén ảnh |
| `anh-iphone.heic` | ảnh HEIC tạo bằng `sips` | HEIC sang JPG |
| `ma-qr-mau.png` | mã VietQR của một tài khoản giả | Quét mã QR |
| `chan-dung-mau.jpg` | chân dung **người không có thật** do StyleGAN tạo | Làm ảnh thẻ |

`chan-dung-mau.jpg`: [File:Woman 1.jpg](https://commons.wikimedia.org/wiki/File:Woman_1.jpg) trên Wikimedia Commons, **public domain** (ảnh do mạng nơ-ron tạo, người trong ảnh không tồn tại).
