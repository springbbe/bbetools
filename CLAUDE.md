# BbeTools – quy ước cho AI

Website tiếng Việt gồm nhiều công cụ tiện ích, chạy 100% trên trình duyệt. Repo `springbbe/bbetools`, deploy bằng GitHub Pages (nhánh `main`, thư mục gốc) tại https://springbbe.github.io/bbetools/. Luôn trả lời người dùng bằng tiếng Việt.

Dự án đang trong giai đoạn xây dựng: đọc `docs/ke-hoach.md` để biết tiến độ và cách làm tiếp một giai đoạn. (Xoá dòng này cùng file kế hoạch khi xây xong.)

Tài liệu kỹ thuật (cấu trúc, registry, 4 khung trang, thư viện, cách thêm công cụ): `docs/phat-trien.md`.

## Ràng buộc bắt buộc

- Không backend; file người dùng không bao giờ rời khỏi máy, và giao diện phải ghi rõ điều đó. Không dùng API có khoá bí mật, không cơ sở dữ liệu. Công cụ nào không làm được 100% trên trình duyệt thì bỏ, không làm nửa vời.
- `tools.json` là nguồn dữ liệu duy nhất; trang HTML, `sitemap.xml`, `assets/registry.js` đều do `scripts/build.js` sinh ra, đừng sửa tay.
- Mọi đường dẫn đều tương đối (site nằm dưới `/bbetools/`). Ngoại lệ: canonical, Open Graph, JSON-LD, sitemap lấy URL tuyệt đối từ `site.baseUrl`.
- Thư viện tải từ CDN (jsDelivr/cdnjs/unpkg), ghim đúng phiên bản (đã phát hành ít nhất 2 tuần), chỉ tải khi mở đúng công cụ cần nó: thêm vào bảng `LIBS` trong `assets/core.js`, gọi bằng `lib("tên")`. GitHub Pages không có COOP/COEP → ffmpeg.wasm dùng bản đơn luồng hoặc coi-serviceworker; video ưu tiên WebCodecs.
- Giao diện tiếng Việt có dấu đầy đủ, ưu tiên điện thoại, có chế độ tối, dùng được bằng bàn phím, có thuộc tính truy cập cơ bản. Tên luôn viết "BbeTools".
- Dữ liệu dễ lỗi thời (thuế, bảo hiểm, giá điện, mã tỉnh, đơn vị đất…) để ở `data/<tên>.json`, có `title`, `updated`, `source`; phải tra văn bản hiện hành trước khi viết.
- Hàm tính toán thuần đặt ở `assets/lib/` và có test trong `tests/`. Công cụ nhận file phải có file mẫu trong `samples/`.

## Trước mỗi commit

```bash
node scripts/build.js && node scripts/check.js && node --test tests/*.test.js
```

- Chạy thử thật trong trình duyệt: `node scripts/serve.js` rồi mở http://localhost:8080/bbetools/ (hoặc preview "bbetools" trong `.claude/launch.json`). Dùng file mẫu, kiểm tra khổ điện thoại 375 px, chế độ sáng và tối, console không có lỗi. Nếu không có trình duyệt để thử, nói rõ là chưa thử.
- Message commit tiếng Việt. Sau đó `git push`; GitHub Pages tự cập nhật sau khoảng 1 phút.

## Bẫy đã gặp

- Đừng dùng `requestAnimationFrame` để chờ: tab chạy nền sẽ treo. Dùng `nextFrame()` trong core.
- Biến module dùng trong callback của khung (`mount`, `options`…) phải khai báo trước khi gọi `fileTool(...)`, nếu không sẽ lỗi TDZ.
- Trong `h()`, biến CSS (`--c`) truyền qua `style: { "--c": màu }` (core xử lý bằng `setProperty`).
- Phần tử `position: fixed` nằm trong header (có backdrop-filter) bị giới hạn trong header.
