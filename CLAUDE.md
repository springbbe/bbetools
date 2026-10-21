# BbeTools – hướng dẫn cho AI làm tiếp dự án

Website tiếng Việt gồm nhiều công cụ tiện ích, chạy 100% trên trình duyệt. Repo `springbbe/bbetools`, deploy bằng GitHub Pages (nhánh `main`, thư mục gốc) tại https://springbbe.github.io/bbetools/. Luôn trả lời người dùng bằng tiếng Việt.

## Đang làm đến đâu

- Nguồn sự thật là `tools.json`: công cụ `"status": "done"` là đã xong, `"todo"` là chưa làm. Mỗi nhóm có trường `"phase"` (số giai đoạn).
- Mục **Lộ trình** trong `README.md` (do `scripts/build.js` sinh) cho biết từng giai đoạn gồm nhóm nào, xong bao nhiêu. Bảng **Danh sách công cụ** trong README đánh dấu ⏳ các công cụ chưa làm. `git log --oneline`: mỗi giai đoạn một commit.
- Thứ tự: 1. lõi + 13 công cụ tiêu biểu (xong) → 2. PDF → 3. Ảnh → 4. Tiện ích Việt Nam + Tính toán → 5. Văn bản + Lập trình → 6. QR + Văn phòng → 7. Bảo mật + Năng suất → 8. Âm thanh & video. Làm lần lượt, không chạy song song (các nhóm đều sửa `tools.json` và trang sinh ra).

### Khi người dùng nói "Làm giai đoạn N"

1. Lấy các nhóm có `"phase": N` trong `tools.json`; làm **mọi** công cụ `"todo"` của các nhóm đó.
2. Công cụ nào không làm được 100% trên trình duyệt thì xoá khỏi registry (hoặc ghi rõ lý do trong README), không làm nửa vời. Có ý tưởng công cụ mới hợp nhóm thì đề xuất với người dùng.
3. Nhóm PDF: chép logic từ https://github.com/springbbe/PDF-tool (`assets/tools/*.js`, cùng @cantoo/pdf-lib + pdf.js), chuyển sang khung `fileTool` và `assets/pdf.js` của repo này.
4. Xong: build + check + test, chạy thử trong trình duyệt, một commit cho cả giai đoạn, push, rồi báo lại cho người dùng những gì đã làm, đã thử, còn thiếu.

### Khi chạy trên cloud

- Phiên cloud thường làm trên một nhánh riêng rồi mở pull request. GitHub Pages chỉ lấy từ `main`, nên trang web chỉ cập nhật sau khi PR được merge vào `main`.
- `scripts/make-samples.js` cần Google Chrome và `sips` (chỉ có trên macOS, dùng để tạo ảnh HEIC). Các file mẫu hiện có đã nằm trong `samples/`. Nếu môi trường không có công cụ này, hãy tạo file mẫu mới bằng cách khác hoặc ghi rõ phần chưa tạo được.
- Nếu không có trình duyệt để chạy thử thật, nói rõ với người dùng là công cụ chưa được thử trên trình duyệt; đừng báo là đã kiểm tra.

## Ràng buộc bắt buộc (từ yêu cầu gốc)

- Không backend; file người dùng không bao giờ rời khỏi máy, và giao diện phải ghi rõ điều đó. Không dùng API có khoá bí mật, không cơ sở dữ liệu. Công cụ nào không làm được 100% trên trình duyệt thì bỏ (ghi lý do), không làm nửa vời.
- Mọi đường dẫn đều tương đối (site nằm dưới `/bbetools/`). Ngoại lệ: canonical, Open Graph, JSON-LD, sitemap lấy URL tuyệt đối từ `site.baseUrl`.
- Thư viện tải từ CDN (jsDelivr/cdnjs/unpkg), ghim đúng phiên bản (phiên bản đã phát hành ít nhất 2 tuần), và chỉ tải khi mở đúng công cụ cần nó: thêm vào bảng `LIBS` trong `assets/core.js`, gọi bằng `lib("tên")`. Không có COOP/COEP → ffmpeg.wasm dùng bản đơn luồng hoặc coi-serviceworker; video ưu tiên WebCodecs.
- Giao diện tiếng Việt có dấu đầy đủ, ưu tiên điện thoại, có chế độ tối, dùng được bằng bàn phím, có thuộc tính truy cập cơ bản. Tên luôn viết "BbeTools".
- Dữ liệu dễ lỗi thời (thuế TNCN, BHXH, lương cơ sở/tối thiểu vùng, giá điện EVN, mã tỉnh, đơn vị đất…) để ở `data/<tên>.json`, có `title`, `updated`, `source`. Phải tra văn bản hiện hành trước khi viết (lưu ý thay đổi thuế TNCN năm 2026 và việc sáp nhập còn 34 tỉnh từ 1/7/2025).

## Cách thêm hoặc hoàn thành một công cụ

1. Sửa mục của công cụ trong `tools.json`: keywords (có dấu, không dấu, từ đồng nghĩa), `accept`/`output`, `related`, `aliases`, `howto`, `faq`.
2. Viết `assets/tools/<id>.js` dùng một trong các khung: `frames/file.js` (`fileTool`), `frames/text.js` (`textTool`), `frames/form.js` (`formTool`, trạng thái trên URL), `frames/interactive.js` (`interactiveTool`). Xem các công cụ đã xong để làm mẫu.
3. Hàm tính toán thuần đặt ở `assets/lib/`, viết test ở `tests/`.
4. Thêm file mẫu vào `samples/` (sửa `scripts/make-samples.js` nếu cần) để có nút "Thử với file mẫu". Icon mới: `node scripts/icons.js`.
5. Đổi status thành `done` → `node scripts/build.js`.

## Trước mỗi commit

```bash
node scripts/build.js && node scripts/check.js && node --test tests/*.test.js
```

- Chạy thử thật trong trình duyệt: `node scripts/serve.js` rồi mở http://localhost:8080/bbetools/ (hoặc preview "bbetools" trong `.claude/launch.json`). Dùng file mẫu, kiểm tra cả khổ điện thoại 375 px, chế độ sáng và tối, và xem console không có lỗi.
- Mỗi nhóm một commit, message tiếng Việt. Sau đó `git push` (đăng nhập GitHub đã lưu trong keychain); GitHub Pages tự cập nhật sau khoảng 1 phút.

## Bẫy đã gặp

- Đừng dùng `requestAnimationFrame` để chờ: tab chạy nền sẽ treo. Dùng `nextFrame()` trong core.
- Biến module dùng trong callback của khung (`mount`, `options`…) phải khai báo trước khi gọi `fileTool(...)`, nếu không sẽ lỗi TDZ.
- Trong `h()`, biến CSS (`--c`) phải truyền qua `style: { "--c": màu }` (core đã xử lý bằng `setProperty`).
- Phần tử `position: fixed` nằm trong header (có backdrop-filter) bị giới hạn trong header.
