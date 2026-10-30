# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Nhóm chính: người Việt phổ thông.** Dân văn phòng, sinh viên, người lớn tuổi. Họ thường đến từ Google với một việc cụ thể ("ghép pdf", "ảnh thẻ 3x4", "đọc số thành chữ", "tính lương gross net"), phần lớn dùng điện thoại, làm xong một việc rồi đi. Nhiều người không rành máy tính và không biết tên kỹ thuật của thứ mình cần.
- **Nhóm phụ nhưng quan trọng: dân kỹ thuật.** Lập trình viên, người rành máy tính. Họ quay lại thường xuyên, dùng phím tắt (`/`, Ctrl/⌘+K), yêu thích ★, "dùng gần đây", và các công cụ nhóm Lập trình / Bảo mật.
- **Người dùng bản tiếng Anh** (`/en/`) cho các công cụ dùng chung; công cụ chỉ dành cho người Việt không có bản tiếng Anh.

## Product Purpose

BbeTools là website tiếng Việt gồm khoảng 160 công cụ tiện ích miễn phí trong 12 nhóm (PDF, Ảnh, Âm thanh & video, Văn bản, Tiện ích Việt Nam, Tính toán & đời sống, QR & mã vạch, Văn phòng & dữ liệu, Lập trình, Bảo mật, Năng suất & ngẫu nhiên, Tải về). Mọi công cụ chạy 100% trong trình duyệt.

Thành công là: người dùng tìm thấy đúng công cụ (từ Google hoặc từ trang chủ), làm xong việc ngay lần đầu mà không phải đọc hướng dẫn, và tin rằng file của họ không bị gửi đi đâu.

## Positioning

- **File không bao giờ rời khỏi máy.** Không có máy chủ xử lý: PDF, ảnh, video, AI tách nền ảnh thẻ, OCR… đều chạy bằng JavaScript/WebAssembly trong tab. Ngắt mạng sau khi tải trang, công cụ vẫn chạy. Mã nguồn mở để ai cũng kiểm chứng được.
- **Làm cho người Việt:** VietQR chuyển khoản, đọc số thành chữ, lịch âm, ảnh thẻ 3×4 / 4×6, chuyển mã TCVN3/VNI, sửa lỗi gõ Telex, thuế TNCN, BHXH, giá điện, tra đơn vị hành chính mới. Tìm kiếm không cần gõ dấu.
- **Miễn phí, không quảng cáo, không cần tài khoản.**

## Operating Context

- Vào từ kết quả tìm kiếm thẳng tới trang công cụ (mỗi ý định tìm kiếm một trang riêng, vì SEO), hoặc từ trang chủ / trang nhóm / bảng lệnh.
- Bốn khung trang: file vào → file ra; văn bản vào → văn bản ra; form/máy tính (trạng thái lưu trên URL); tương tác (camera, micro, hẹn giờ…).
- Nhận file bằng chọn, kéo thả, dán; thả file vào trang chủ để được gợi ý công cụ; chuyển kết quả từ công cụ này sang công cụ khác. Mỗi công cụ nhận file có nút "Thử với file mẫu" (`samples/`).
- Mỗi trang công cụ có cách dùng, FAQ, ghi chú quyền riêng tư và công cụ liên quan, lấy từ `tools.json`.
- Tốc độ phụ thuộc máy người dùng; file rất lớn có thể chậm hoặc thiếu bộ nhớ trên điện thoại cũ.

## Capabilities and Constraints

- Site tĩnh trên GitHub Pages dưới `/bbetools/`, không backend, không cơ sở dữ liệu, không API có khoá bí mật. Công cụ nào không làm được hoàn toàn trên trình duyệt thì bỏ, không làm nửa vời.
- `tools.json` là nguồn dữ liệu duy nhất; trang HTML, sitemap, registry do `scripts/build.js` sinh ra. Chi tiết kỹ thuật ở `docs/phat-trien.md`, quy ước ở `CLAUDE.md`.
- Thư viện tải từ CDN, ghim phiên bản, chỉ tải khi mở đúng công cụ cần.
- Bắt buộc: giao diện tiếng Việt có dấu đầy đủ, ưu tiên điện thoại, có chế độ sáng và tối, dùng được bằng bàn phím.
- Dữ liệu pháp lý/giá dễ lỗi thời nằm ở `data/*.json`, có nguồn và ngày cập nhật hiện trên trang; kết quả tính toán chỉ để tham khảo.
- Google Analytics chỉ nhận đường dẫn trang, không bao giờ nhận tên file, nội dung hay số liệu người dùng nhập. "Gần đây", "Yêu thích" và cài đặt chỉ lưu trong localStorage.
- **Chưa quyết:** hướng kiếm tiền lâu dài. Hiện tại miễn phí, không quảng cáo; công việc sau này không được giả định là sẽ có hay không có quảng cáo, gói trả phí hay nút ủng hộ.

## Brand Commitments

- Tên luôn viết "BbeTools".
- Giọng văn gần gũi, ngắn gọn: xưng "bạn", câu ngắn, nói thẳng việc cần làm, không màu mè, không dùng biệt ngữ khi không cần.
- Tài sản đang có: `assets/favicon.svg`, `assets/icon-512.png`, `assets/apple-touch-icon.png`, ảnh OG `assets/og.png` (tạo bằng `scripts/make-brand.js`), font Be Vietnam Pro, icon Lucide.

## Evidence on Hand

- Bản thân sản phẩm: khoảng 160 công cụ đang chạy tại https://springbbe.github.io/bbetools/ và bản tiếng Anh tại `/en/`.
- Mã nguồn mở: https://github.com/springbbe/bbetools.
- Trang Giới thiệu & quyền riêng tư (`gioi-thieu/`) giải thích trang tải gì từ Internet.
- File mẫu thật cho từng công cụ nhận file: `samples/` (nguồn ghi ở `samples/README.md`).
- **Không có:** lời chứng thực, số liệu người dùng công khai, báo chí, khách hàng. Không được bịa ra.

## Product Principles

1. **Quyền riêng tư là cam kết, không phải khẩu hiệu.** Mọi thay đổi phải giữ được câu "file không rời khỏi máy bạn", và giao diện phải nói rõ điều đó ở nơi người dùng đưa file vào.
2. **Một trang, một việc, xong ngay.** Người đến từ Google phải thấy ngay chỗ đưa file hoặc nhập liệu và làm xong mà không cần đọc hướng dẫn; hướng dẫn và FAQ để phía dưới.
3. **Người phổ thông trước, dân kỹ thuật không bị bỏ quên.** Mặc định đơn giản, dễ hiểu cho người không rành máy tính; tiện ích cho người dùng thường xuyên (phím tắt, yêu thích, chuyển file giữa công cụ) có sẵn nhưng không chen vào đường đi chính.
4. **Đúng với người Việt.** Định dạng số, ngày, tiền, dữ liệu pháp lý theo chuẩn Việt Nam và có nguồn; dấu tiếng Việt đầy đủ ở mọi nơi.
5. **Làm trọn hoặc không làm.** Không đưa lên công cụ chạy dở, phụ thuộc máy chủ hay chỉ chạy trên một số trình duyệt mà không có phương án dự phòng.

## Accessibility & Inclusion

- Dùng được hoàn toàn bằng bàn phím, có thuộc tính truy cập cơ bản (nhãn, vai trò, trạng thái).
- Ưu tiên khổ điện thoại 375 px; chế độ sáng và tối.
- Người lớn tuổi và người không rành công nghệ là một phần nhóm người dùng chính: chữ dễ đọc, nút đủ lớn, thông báo lỗi nói bằng lời thường.
