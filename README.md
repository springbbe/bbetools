# BbeTools

Bộ công cụ tiện ích miễn phí, giao diện tiếng Việt, chạy **100% trên trình duyệt**.

**Dùng ngay:** https://springbbe.github.io/bbetools/ · English: https://springbbe.github.io/bbetools/en/

## Điểm nổi bật

- **File không bao giờ rời khỏi máy bạn.** Không có máy chủ xử lý: ghép PDF, nén ảnh, tách nền ảnh thẻ… đều chạy bằng JavaScript và WebAssembly ngay trong trình duyệt.
- **Miễn phí, không quảng cáo, không theo dõi, không cần tài khoản.**
- **Dành cho người Việt:** VietQR chuyển khoản, đọc số thành chữ, lịch âm, ảnh thẻ 3×4 / 4×6, chuyển mã TCVN3/VNI…
- **Có bản tiếng Anh** cho các công cụ dùng chung (công cụ chỉ dành cho người Việt chỉ có ở bản tiếng Việt).
- **Dễ tìm công cụ:** tìm kiếm không cần gõ dấu, phím tắt `/` hoặc Ctrl/⌘ + K, thả một file vào trang chủ để được gợi ý công cụ phù hợp.
- **Dùng tốt trên điện thoại,** có chế độ tối, dùng được bằng bàn phím.

Nhóm công cụ: PDF · Ảnh · Âm thanh & video · Văn bản · Tiện ích Việt Nam · Tính toán & đời sống · QR & mã vạch · Văn phòng & dữ liệu · Lập trình · Bảo mật · Năng suất.

## Chạy ở máy

Cần [Node.js](https://nodejs.org/) 20 trở lên. Không cần cài thư viện (`npm install`).

```bash
git clone https://github.com/springbbe/bbetools.git
```

```bash
cd bbetools
```

```bash
node scripts/serve.js
```

Mở http://localhost:8080/bbetools/ trong trình duyệt.

## Đưa lên GitHub Pages

Trang đã được sinh sẵn trong repo nên không cần bước build khi deploy.

1. Đẩy repo lên GitHub.
2. Vào **Settings → Pages**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Nếu repo không tên là `bbetools` hoặc dùng tên miền riêng: sửa `site.baseUrl` trong `tools.json`, chạy `node scripts/build.js` rồi commit.

## Dành cho người phát triển

Cấu trúc mã, cách thêm công cụ và các lệnh kiểm tra: xem [docs/phat-trien.md](docs/phat-trien.md).

## Mã nguồn bên thứ ba

- Thư viện mã nguồn mở tải từ jsDelivr (ghim phiên bản): pdf-lib (@cantoo), pdf.js, JSZip, heic-to (libheif), jSquash (MozJPEG, WebP), UPNG.js, qrcode-generator, zxing-wasm, onnxruntime-web.
- Mô hình AI trong `models/`: MODNet (Apache-2.0), UltraFace (MIT).
- Icon [Lucide](https://lucide.dev) (ISC), font Be Vietnam Pro (OFL).
- Nguồn của file mẫu: [samples/README.md](samples/README.md).
