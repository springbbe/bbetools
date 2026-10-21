# Tài liệu phát triển BbeTools

## Cấu trúc

```
tools.json                 REGISTRY – nguồn dữ liệu duy nhất: nhóm và công cụ (id, slug, tên, nhóm, mô tả,
                           từ khoá, icon, kiểu khung, loại file nhận, trạng thái, công cụ liên quan, cách dùng, FAQ)
data/                      dữ liệu dễ lỗi thời, mỗi file có "title", "updated", "source" (ngày cập nhật hiện trên trang)
assets/
  app.css                  giao diện chung (sáng/tối)
  core.js                  lõi: header, mega-menu/ngăn kéo, bảng lệnh (/ hoặc Ctrl/⌘+K), yêu thích ★, gần đây,
                           nhận file (chọn/kéo thả/dán), chuyển file giữa công cụ, tải thư viện theo nhu cầu
  frames/file.js           khung 1: file vào → file ra
  frames/text.js           khung 2: văn bản vào → văn bản ra
  frames/form.js           khung 3: form / máy tính (trạng thái trên URL)
  frames/interactive.js    khung 4: tương tác (camera, âm thanh, hẹn giờ…)
  pdf.js, image.js, qr.js  tiện ích dùng chung cho nhóm PDF, ảnh, QR
  pdf-pages.js             "bảng trang" PDF: pageTool() dựng trên khung file, mỗi trang một thẻ (chọn, xoay, xoá, đổi chỗ)
  ai/matting.js            AI tách nền (MODNet) + nhận diện khuôn mặt (UltraFace) chạy bằng onnxruntime-web
  lib/*.js                 hàm thuần, có test: search, filetype, doc-so, am-lich, vietqr, json-tools, text-stats, page-ranges
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
scripts/make-samples.js    tạo lại file mẫu (Chrome headless + sips trên macOS)
scripts/make-brand.js      tạo ảnh OG và icon ứng dụng
tests/                     test cho hàm thuần (node --test)
CLAUDE.md                  quy ước cho AI (Claude Code) khi sửa repo
docs/ke-hoach.md           kế hoạch xây dựng (tài liệu tạm, xoá khi xong)
.claude/launch.json        cấu hình chạy thử (preview) cho Claude Code
```

## Sinh trang và deploy

`node scripts/build.js` đọc `tools.json` rồi sinh trang chủ, trang nhóm, trang từng công cụ, 404, trang giới thiệu, sitemap, `assets/registry.js`. Chỉ công cụ `"status": "done"` (hoặc `"beta"`) mới có trang; công cụ `"todo"` bị ẩn.

Kết quả được commit thẳng vào repo và GitHub Pages phục vụ nhánh `main` nguyên trạng, **không dùng GitHub Actions**: deploy không cần bước build, trang chạy ở máy giống hệt trang trên mạng, và bớt một chỗ có thể hỏng. `node scripts/check.js` (gọi `build.js --check`) báo lỗi nếu quên sinh lại trang sau khi sửa `tools.json`.

## Đường dẫn

Site nằm dưới `/bbetools/` nên mọi đường dẫn trong HTML/JS/CSS đều **tương đối** (`../assets/…`). Ngoại lệ bắt buộc: `canonical`, Open Graph, JSON-LD và `sitemap.xml` dùng URL tuyệt đối lấy từ `site.baseUrl`. Riêng `404.html` (GitHub Pages trả về ở mọi độ sâu) tự đặt `<base href>` bằng một đoạn script nhỏ, rồi tự chuyển hướng các slug phụ (`aliases`, ví dụ `/gop-pdf` → `/ghep-pdf/`) và gợi ý công cụ gần đúng.

## Thư viện (ghim phiên bản, tải khi cần)

Khai báo trong bảng `LIBS` của `assets/core.js`, gọi bằng `lib("tên")` ngay trong công cụ cần đến.

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
5. Đổi `status` thành `done`, chạy build và kiểm tra (bên dưới), thử trong trình duyệt (cả khổ điện thoại và chế độ tối), commit.

## Công cụ PDF làm việc theo từng trang

Tách, xoá, sắp xếp, xoay trang, PDF sang ảnh… dùng chung `pageTool()` trong `assets/pdf-pages.js` (khung file ở chế độ `custom`). Công cụ chỉ khai báo phần riêng:

```js
import { pageTool, firstItem } from "../pdf-pages.js";
pageTool({
  action: "Xoá trang", sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "off", rangeProp: "off",            // dấu ✕ trên thẻ, Shift + bấm để chọn cả dãy
  click(p) { p.off = !p.off; },
  summary: (B) => "…", ready: (B) => true,
  async run(B, opts, ctx) { const doc = await B.build(B.pages.filter((p) => !p.off)); … }
});
```

`B.pages` là danh sách trang `{ it, n, rot, w, h, sel, off, blank }`; `B.build(list)` chép các trang (kèm góc xoay) sang PDF mới của pdf-lib; `B.rangeField(prop, …)` tạo ô "1-3, 5, 8-" đồng bộ hai chiều với lựa chọn trên bảng; `B.changed(structural)` gọi sau khi đổi trạng thái trang. Khoảng trang xử lý bằng `assets/lib/page-ranges.js` (có test).

## Kiểm tra trước khi commit

```bash
node scripts/build.js
```

```bash
node scripts/check.js
```

```bash
node --test tests/*.test.js
```

## Ghi chú dữ liệu

- Danh sách ngân hàng VietQR (`data/ngan-hang-vietqr.json`) chụp từ danh sách công khai của VietQR; chuỗi VietQR do BbeTools tạo đã được đối chiếu khớp từng ký tự với mã của img.vietqr.io (xem `tests/vietqr.test.js`).
- Âm lịch theo thuật toán của Hồ Ngọc Đức, múi giờ UTC+7.
