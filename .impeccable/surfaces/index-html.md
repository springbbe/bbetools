---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["assets/app.css","scripts/build.js"]
---

# Surface brief: BbeTools (toàn site: trang chủ, trang nhóm, trang công cụ)

Scope: thay thế thế giới thị giác của toàn site. Mode: Operate (người dùng đến để làm xong một việc). Kế hoạch nhiều giai đoạn và trạng thái: `docs/giao-dien-moi.md`.

Audience/job: người Việt phổ thông (đa số từ Google, trên điện thoại) làm một việc rồi đi; dân kỹ thuật quay lại thường xuyên. Constraints: PRODUCT.md, CLAUDE.md (không backend, tiếng Việt có dấu, sáng/tối, bàn phím, 375 px).

Build path: code-led (Operate, không có công cụ tạo ảnh).

## Direction contract

THESIS: Bộ đồ nghề hằng ngày của người Việt mang sự tự tin màu sắc của tạp chí học trò (Hoa Học Trò, Mực Tím): mỗi nhóm là một "chuyên mục" có màu in riêng. Từ chối mặc định "SaaS xám + một màu chàm" và lưới thẻ vô danh.

OWN-WORLD: Giấy trắng sáng trên nền ám tím rất nhạt; mực tím học trò (#5B2EE0 sáng / #A48BFF tối) là màu thương hiệu; vàng bút dạ quang (#FFE14D) chỉ để đánh dấu cụm từ quan trọng và vòng focus trên nền tím; 12 màu in chuyên mục cho 12 nhóm. Tiêu đề Bricolage Grotesque 800 (chữ to, khít), thân Be Vietnam Pro. Nút dạng viên thuốc, icon nhóm là "nhãn dán" vuông bo tròn có viền trắng. Tối: nền mực tím đậm (#14111F), không phải xám xanh.

STORY: Vào trang, người dùng thấy ngay ô tìm và các chuyên mục; hiểu file không rời khỏi máy (dòng được tô dạ quang); chọn công cụ và làm xong.

FIRST VIEWPORT: Header sáng (logo, Tất cả công cụ, ô tìm, ngôn ngữ, giao diện). Ngay dưới là khối tím mực tràn ngang: tiêu đề trắng cỡ lớn căn trái, câu dẫn có cụm "file không bao giờ rời khỏi máy bạn" tô dạ quang, ô tìm trắng cao 60 px là hành động chính, dòng gợi ý thả file; phía dưới khối là dải 12 nhãn chuyên mục màu in (lọc nhóm). Điện thoại: cùng thứ tự, một cột.

FORM: Tạp chí học trò Việt (Hoa Học Trò / Mực Tím), vị trí 6 trong danh sách 7 hướng; seed: seed:6e51d69e84b8a55d. Nét chữ ký: nhãn chuyên mục màu in (tab màu nhóm ở tiêu đề mỗi nhóm, chip lọc, sau này là dải đầu trang công cụ). Nâng từ các hướng bị loại: lưới cố định cột không xê dịch (split-flap); màu cảnh báo chỉ dành cho trạng thái thay đổi (boarding pass); focus làm thẻ đang chọn nổi rõ (streaming wall); mọi icon cùng tỉ lệ, cùng đường chân (botanical folio).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Chưa quyết
- Có làm lại ảnh OG/icon ứng dụng theo màu mới không (giai đoạn 5).
