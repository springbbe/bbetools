# BbeTools

Bộ công cụ tiện ích tiếng Việt chạy **100% trên trình duyệt**: ghép, nén PDF, nén ảnh, HEIC sang JPG, làm ảnh thẻ, VietQR, đọc số thành chữ, lịch âm…

**Trang web:** https://springbbe.github.io/bbetools/

- **File không bao giờ rời khỏi máy người dùng.** Không có máy chủ xử lý, không API có khoá bí mật, không cơ sở dữ liệu, không quảng cáo, không thống kê.
- Web tĩnh trên GitHub Pages. Thư viện ngoài tải từ jsDelivr, ghim đúng phiên bản; thư viện nặng (pdf.js, pdf-lib, libheif, MozJPEG, onnxruntime…) chỉ tải khi mở đúng công cụ cần nó.
- Giao diện tiếng Việt, ưu tiên điện thoại, chế độ tối, dùng được bằng bàn phím.

## Danh sách công cụ

Bảng dưới đây do `scripts/build.js` sinh từ `tools.json`, đừng sửa tay.

<!-- tools:start -->
13/142 công cụ đã xong (⏳ = chưa làm, đang ẩn khỏi trang web).

| Nhóm | Xong | Công cụ |
|---|---|---|
| PDF | 2/24 | [Ghép PDF](https://springbbe.github.io/bbetools/ghep-pdf/) · Tách PDF ⏳ · Xoá trang PDF ⏳ · Sắp xếp trang PDF ⏳ · Xoay PDF ⏳ · [Nén PDF](https://springbbe.github.io/bbetools/nen-pdf/) · PDF sang ảnh ⏳ · Ảnh sang PDF ⏳ · PDF sang văn bản ⏳ · Ký PDF ⏳ · Đánh số trang PDF ⏳ · Chèn watermark PDF ⏳ · Đặt mật khẩu PDF ⏳ · Mở khoá PDF ⏳ · Trích xuất trang PDF ⏳ · Trích ảnh trong PDF ⏳ · Cắt lề PDF ⏳ · Chèn trang trắng ⏳ · PDF đen trắng ⏳ · Sửa thông tin PDF ⏳ · Điền form PDF ⏳ · Làm phẳng form PDF ⏳ · Xem PDF ⏳ · Scan tài liệu bằng camera ⏳ |
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

## Cấu trúc

```
tools.json                 REGISTRY – nguồn dữ liệu duy nhất: nhóm, công cụ (id, slug, tên, nhóm, mô tả,
                           từ khoá, icon, kiểu khung, loại file nhận, trạng thái, công cụ liên quan, cách dùng, FAQ)
data/                      dữ liệu dễ lỗi thời, mỗi file có "updated" + "source" (hiện ngày cập nhật trên trang)
assets/
  app.css                  giao diện chung (sáng/tối)
  core.js                  lõi: header, mega-menu/ngăn kéo, bảng lệnh (/ hoặc Ctrl/⌘+K), yêu thích ★, gần đây,
                           nhận file (chọn/kéo thả/dán), chuyển file giữa công cụ, tải thư viện theo nhu cầu
  frames/file.js           khung 1: file vào → file ra
  frames/text.js           khung 2: văn bản vào → văn bản ra
  frames/form.js           khung 3: form / máy tính (trạng thái trên URL)
  frames/interactive.js    khung 4: tương tác (camera, âm thanh, hẹn giờ…)
  pdf.js, image.js, qr.js  tiện ích dùng chung cho nhóm PDF, ảnh, QR
  ai/matting.js            AI tách nền (MODNet) + nhận diện khuôn mặt (UltraFace) chạy bằng onnxruntime-web
  lib/*.js                 hàm thuần, có test: search, filetype, doc-so, am-lich, vietqr, json-tools, text-stats
  tools/<id>.js            logic riêng của từng công cụ
  registry.js              (sinh tự động) bản rút gọn của tools.json cho trình duyệt
  icons.svg                sprite icon Lucide (ISC)
models/                    mô hình AI đặt trong repo (MODNet Apache-2.0, UltraFace MIT)
samples/                   file mẫu cho nút "Thử với file mẫu"
<slug>/index.html          (sinh tự động) trang từng công cụ: ghep-pdf/, nen-anh/, doc-so-thanh-chu/…
nhom/<nhóm>/index.html     (sinh tự động) trang nhóm: nhom/pdf/, nhom/anh/…
index.html, 404.html, gioi-thieu/, sitemap.xml, robots.txt, manifest.webmanifest   (sinh tự động)
scripts/build.js           sinh mọi trang từ tools.json
scripts/serve.js           server chạy thử ở máy (tắt cache, phục vụ dưới /bbetools/ giống GitHub Pages)
scripts/check.js           kiểm tra registry, đường dẫn tương đối, thẻ SEO
scripts/icons.js           tạo assets/icons.svg từ Lucide
scripts/make-samples.js    tạo lại file mẫu (Chrome headless + sips)
scripts/make-brand.js      tạo ảnh OG và icon ứng dụng
tests/                     test cho hàm thuần (node --test)
```

### Vì sao không dùng GitHub Actions để deploy

Trang được sinh sẵn ở máy rồi commit thẳng vào repo; GitHub Pages phục vụ nhánh `main` nguyên trạng. Vì vậy deploy không cần bước build nào, trang chạy ở máy giống hệt trang trên mạng, và bớt một chỗ có thể hỏng. `node scripts/check.js` (gọi `build.js --check`) báo lỗi nếu quên sinh lại trang sau khi sửa `tools.json`.

### Đường dẫn

Site nằm dưới `/bbetools/` nên mọi đường dẫn trong HTML/JS/CSS đều **tương đối** (`../assets/…`). Ngoại lệ bắt buộc: `canonical`, Open Graph, JSON-LD và `sitemap.xml` dùng URL tuyệt đối lấy từ `site.baseUrl`. Riêng `404.html` (GitHub Pages trả về ở mọi độ sâu) tự đặt `<base href>` bằng một đoạn script nhỏ, rồi tự chuyển hướng các slug phụ (`aliases`, ví dụ `/gop-pdf` → `/ghep-pdf/`) và gợi ý công cụ gần đúng.

### Thư viện (ghim phiên bản, tải khi cần)

| Thư viện | Dùng cho |
|---|---|
| `@cantoo/pdf-lib@2.11.1` | ghi, sửa PDF (có mã hoá AES) |
| `pdfjs-dist@4.10.38` (legacy) | đọc, vẽ trang PDF |
| `jszip@3.10.1` | tải nhiều file dạng .zip |
| `heic-to@1.6.5` | giải mã HEIC (libheif WebAssembly) |
| `@jsquash/jpeg@1.6.0`, `@jsquash/webp@1.5.0` | MozJPEG, WebP (khi trình duyệt không tự xuất WebP) |
| `upng-js@2.1.0` + `pako@2.1.0` | PNG giảm màu |
| `qrcode-generator@2.0.4` | tạo QR |
| `zxing-wasm@3.1.5` | đọc QR, mã vạch (dự phòng khi trình duyệt không có BarcodeDetector) |
| `onnxruntime-web@1.30.0` | chạy mô hình AI (đơn luồng, không cần COOP/COEP) |
| `@fontsource/be-vietnam-pro@5.3.0` | font chữ |

## Chạy thử ở máy

Cần Node.js 20 trở lên, không cần `npm install`.

```bash
node scripts/serve.js
```

Mở http://localhost:8080/bbetools/

```bash
node --test tests/*.test.js
```

```bash
node scripts/check.js
```

## Thêm một công cụ mới

1. Thêm một mục vào `tools.json` (để `"status": "todo"` khi chưa làm xong). Các trường chính:
   - `id` (tiếng Anh, không đổi về sau, cũng là tên file `assets/tools/<id>.js`), `slug` (URL không dấu, phẳng, ngắn)
   - `name`, `group`, `desc`, `icon` (tên icon Lucide), `kind`: `file` | `text` | `form` | `interactive`
   - `keywords`: từ đồng nghĩa, có dấu hay không dấu đều được (tìm kiếm tự bỏ dấu)
   - `accept` (với công cụ nhận file): `pdf`, `image`, `heic`, `svg`, `audio`, `video`, `excel`, `csv`, `json`, `docx`, `text`, `any`
   - `output` (loại file kết quả), `multiple`, `related`, `aliases`, `data`, `howto`, `faq`, `popular`
2. Viết `assets/tools/<id>.js` dùng một trong 4 khung, ví dụ:
   ```js
   import { textTool } from "../frames/text.js";
   textTool({ transform: (text) => text.toUpperCase() });
   ```
3. Hàm tính toán thuần đặt ở `assets/lib/` và viết test trong `tests/`. Dữ liệu dễ lỗi thời đặt ở `data/<tên>.json` với `title`, `updated`, `source`, rồi khai báo trong trường `data` của công cụ.
4. Nếu dùng icon mới: chạy `node scripts/icons.js`. Thêm file mẫu vào `samples/` nếu công cụ nhận file.
5. Đổi `status` thành `done`, chạy `node scripts/build.js` rồi `node scripts/check.js`, thử trong trình duyệt (cả khổ điện thoại và chế độ tối), commit.

## Ghi chú

- Danh sách ngân hàng VietQR (`data/ngan-hang-vietqr.json`) chụp từ danh sách công khai của VietQR; chuỗi VietQR do BbeTools tạo đã được đối chiếu khớp từng ký tự với mã của img.vietqr.io (xem `tests/vietqr.test.js`).
- Âm lịch theo thuật toán của Hồ Ngọc Đức, múi giờ UTC+7.
- Ảnh và file mẫu: xem `samples/README.md`.
