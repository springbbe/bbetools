---
title: Cách tách chữ ký, con dấu thành ảnh PNG nền trong suốt
desc: Cách chụp chữ ký hoặc con dấu trên giấy rồi tách thành ảnh PNG nền trong suốt để chèn vào PDF, Word; cách chụp cho nét và tách riêng chữ ký đè lên dấu.
tools: [signature-extract, sign-pdf, remove-bg]
updated: 2026-11-15
---

Chèn ảnh chụp chữ ký vào văn bản thường kèm cả một mảng giấy xám che mất chữ bên dưới. Cần một ảnh chỉ có nét mực, nền trong suốt. Mở [Tách chữ ký, con dấu](tool:signature-extract), chọn ảnh chụp chữ ký trên giấy trắng, chỉnh độ nhạy rồi bấm "Tải PNG trong suốt". Ảnh chữ ký được xử lý ngay trên trình duyệt, không gửi đi đâu.

## Chụp chữ ký thế nào cho dễ tách?

- **Ký trên giấy trắng trơn**, không dòng kẻ, không chữ in bên dưới.
- **Dùng bút mực đậm.** Bút bi xanh hoặc bút ký nét vừa cho kết quả tốt; bút chì và mực nhạt dễ mất nét.
- **Ký to hơn bình thường một chút** để ảnh có nhiều điểm ảnh, phóng lên không vỡ.
- **Chụp thẳng từ trên xuống**, đủ sáng, tránh bóng tay và bóng điện thoại đổ lên giấy.
- **Chụp gần** cho chữ ký chiếm phần lớn khung hình.

## Các bước tách

1. Chọn ảnh vừa chụp.
2. Chọn lấy nét màu nào: xanh cho chữ ký, đỏ cho con dấu, hoặc tất cả.
3. Chỉnh độ nhạy tới khi nét mực hiện đủ mà nền sạch.
4. Nếu trong ảnh còn chữ in xung quanh, kéo trên ảnh để khoanh đúng vùng chữ ký hay con dấu.
5. Chọn màu mực khi xuất nếu muốn đổi, rồi bấm "Tải PNG trong suốt".

## Chỉnh độ nhạy

| Hiện tượng | Cách sửa |
|---|---|
| Nét bị đứt, mất phần mực nhạt | Tăng độ nhạy |
| Còn vết bẩn, bóng giấy lốm đốm | Giảm độ nhạy |
| Không thấy nét nào | Tăng độ nhạy, hoặc chọn lấy "Tất cả" màu mực |
| Lẫn chữ in bên cạnh | Khoanh vùng lại cho sát chữ ký |

Công cụ ước lượng màu giấy theo từng vùng nhỏ nên vẫn tách được khi ánh sáng không đều hoặc giấy ngả vàng.

## Chữ ký đè lên con dấu

Nếu chữ ký mực xanh và con dấu mực đỏ, hai thứ tách riêng được:

- Chọn "Xanh" để lấy riêng chữ ký.
- Chọn "Đỏ" để lấy riêng con dấu.

Chữ ký mực đen đè lên dấu đỏ cũng tách được phần dấu. Hai thứ cùng màu mực thì không tách rời nhau được.

## Dùng ảnh đã tách ở đâu?

- **File PDF:** mở [Ký PDF](tool:sign-pdf), thêm chữ ký từ ảnh PNG vừa tải, kéo tới đúng chỗ ký và chỉnh cỡ.
- **Word, Google Docs:** chèn ảnh, đặt kiểu bố trí "Trước văn bản" để di chuyển tự do; nền trong suốt nên không che chữ bên dưới.
- **Canva, PowerPoint:** chèn như một ảnh thông thường.

## Khác gì với xoá phông?

[Xoá phông ảnh](tool:remove-bg) tách chủ thể như người, đồ vật khỏi nền. Chữ ký là những nét mảnh trên giấy, nên dùng công cụ tách theo màu mực sẽ cho nét sắc và viền sạch hơn.

## Lưu ý về pháp lý và an toàn

- **Ảnh chữ ký không phải chữ ký số.** Nó chỉ là hình ảnh. Giao dịch yêu cầu chữ ký số phải ký bằng chứng thư số do tổ chức được cấp phép cung cấp.
- **Chỉ dùng chữ ký, con dấu của chính bạn hoặc khi được uỷ quyền.** Dùng chữ ký, con dấu của người khác hay của tổ chức khi không được phép là hành vi vi phạm pháp luật.
- **Giữ file PNG cẩn thận.** Ai có file này cũng chèn được chữ ký của bạn vào văn bản. Đừng để trong thư mục chia sẻ chung hay gửi qua nhóm trò chuyện.

## Câu hỏi thường gặp

**Ảnh tách ra có bị vỡ khi phóng to không?** Tuỳ ảnh gốc. Chụp gần và ký to để có nhiều điểm ảnh; khi chèn vào văn bản thường chỉ cần thu nhỏ.

**Đổi chữ ký mực xanh thành mực đen được không?** Được, chọn màu mực khi xuất.

**Tách từ bản scan được không?** Được, và thường tốt hơn ảnh chụp vì ánh sáng đều. Cắt lấy vùng có chữ ký rồi đưa vào công cụ.
