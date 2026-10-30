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

THESIS: Bộ đồ nghề hằng ngày của người Việt mang sự tự tin màu sắc của tạp chí học trò, khoác màu vàng đất ấm: mỗi nhóm là một "chuyên mục" có màu in riêng, bày trong lưới gọn gàng. Từ chối mặc định "SaaS xám + một màu chàm" và lưới thẻ vô danh.

OWN-WORLD: (Người dùng chốt: vàng đất thay cho tím; bố cục gọn, không nghiêng/xoay.) Khối đầu trang vàng đất #D6A23A chữ nâu #2B1E08 (tối: #3A2A0E, chữ kem #FFF3D6); màu thương hiệu vàng đất đậm #8A5A06 (tối #E6B655); chân trang nâu đất #2A1E0A; tô nổi nền vàng nhạt #FFF4CC; 12 màu chuyên mục cho 12 nhóm. Tiêu đề Bricolage Grotesque 800, thân Be Vietnam Pro. Nút viên thuốc, icon nhóm ô bo tròn viền trắng, lưới thẳng hàng.

STORY: Vào trang, người dùng thấy ngay ô tìm và các chuyên mục; hiểu file không rời khỏi máy (dòng được tô dạ quang); chọn công cụ và làm xong.

FIRST VIEWPORT: Header sáng (logo, Tất cả công cụ, ô tìm, ngôn ngữ, giao diện). Ngay dưới là khối vàng đất tràn ngang: trái là tiêu đề nâu đất cỡ lớn, câu dẫn có cụm "file không bao giờ rời khỏi máy bạn" tô nổi, ô tìm trắng cao 60 px là hành động chính, dòng gợi ý thả file; phải (máy tính) là lưới 2 cột 12 nhãn nhóm cùng chiều cao. Bên dưới là dải chip lọc nhóm. Điện thoại: một cột, ẩn lưới nhãn.

FORM: Tạp chí học trò Việt (Hoa Học Trò / Mực Tím), vị trí 6 trong danh sách 7 hướng; seed: seed:6e51d69e84b8a55d. Nét chữ ký: nhãn chuyên mục màu in (tab màu nhóm ở tiêu đề mỗi nhóm, chip lọc, sau này là dải đầu trang công cụ). Nâng từ các hướng bị loại: lưới cố định cột không xê dịch (split-flap); màu cảnh báo chỉ dành cho trạng thái thay đổi (boarding pass); focus làm thẻ đang chọn nổi rõ (streaming wall); mọi icon cùng tỉ lệ, cùng đường chân (botanical folio).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Chưa quyết
- Có làm lại ảnh OG/icon ứng dụng theo màu mới không (giai đoạn 5).
