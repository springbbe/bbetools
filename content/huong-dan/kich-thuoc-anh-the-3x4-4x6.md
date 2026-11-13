---
title: Kích thước ảnh thẻ 3×4, 4×6 là bao nhiêu pixel?
desc: Bảng quy đổi ảnh thẻ 2×3, 3×4, 4×6 và 3,5×4,5 cm sang pixel ở 300 dpi, loại hồ sơ dùng từng cỡ và cách tự làm ảnh thẻ từ ảnh chụp bằng điện thoại.
tools: [id-photo, compress-image, remove-bg]
updated: 2026-11-13
---

Ảnh thẻ 3×4 cm in ở 300 dpi có kích thước **354 × 472 pixel**; ảnh 4×6 cm là **472 × 709 pixel**. Bạn có thể tạo đúng các cỡ này từ một ảnh chân dung bằng [Làm ảnh thẻ](tool:id-photo), không cần cài phần mềm.

## Bảng quy đổi

| Cỡ ảnh | Kích thước in | Pixel ở 300 dpi | Thường dùng cho |
|---|---|---|---|
| 2×3 cm | 20 × 30 mm | 236 × 354 | Thẻ học sinh, sinh viên |
| 3×4 cm | 30 × 40 mm | 354 × 472 | Hồ sơ xin việc, sơ yếu lý lịch, thẻ |
| 4×6 cm | 40 × 60 mm | 472 × 709 | Hộ chiếu, bằng cấp, hồ sơ |
| 3,5×4,5 cm | 35 × 45 mm | 413 × 531 | Visa một số nước |

Cách tính: số pixel = số milimét × 300 ÷ 25,4. Nơi nhận hồ sơ có thể yêu cầu khác (ví dụ số pixel tối thiểu hoặc tỉ lệ khuôn mặt), nên hãy đọc yêu cầu của nơi nộp trước khi làm.

## Nền trắng hay nền xanh?

Phần lớn hồ sơ trong nước nhận nền trắng hoặc xanh nhạt. Ảnh hộ chiếu và visa thường yêu cầu nền trắng. Nếu ảnh gốc chụp trước tường màu khác, công cụ dùng AI tách người khỏi nền rồi thay bằng màu bạn chọn; mô hình AI chạy ngay trên máy nên ảnh không bị gửi đi đâu.

## Cách chụp để ảnh đạt yêu cầu

- Chụp thẳng, mắt nhìn vào ống kính, đầu không nghiêng.
- Đủ sáng và sáng đều hai bên mặt; đứng đối diện cửa sổ là dễ nhất.
- Thấy rõ hai vai, tóc không che mắt và lông mày.
- Đứng cách tường khoảng nửa mét để không có bóng đổ sau lưng.
- Nhờ người khác chụp hoặc dùng camera sau; ảnh tự chụp ở cự ly gần làm méo khuôn mặt.

## Các bước làm ảnh thẻ

1. Mở [Làm ảnh thẻ](tool:id-photo) và chọn ảnh chân dung.
2. Chờ công cụ tách nền và tìm khuôn mặt (lần đầu cần tải khoảng 8 MB mô hình), rồi chọn màu nền và cỡ ảnh.
3. Kéo, thu phóng để đầu nằm trong khung hướng dẫn.
4. Tải ảnh lẻ để nộp trực tuyến, hoặc tải tờ in nhiều ảnh.

## In ảnh thẻ

- **In ở tiệm:** tải tờ in khổ 10×15 cm, mang ra tiệm in như một ảnh thường rồi cắt theo đường kẻ mờ.
- **In ở nhà:** chọn tờ A4 và in đúng tỉ lệ 100%. Nếu máy in tự chọn "Vừa trang", ảnh sẽ sai kích thước.

## Nộp ảnh trực tuyến bị báo quá dung lượng

Nhiều trang nộp hồ sơ giới hạn dung lượng ảnh. Dùng [Nén ảnh](tool:compress-image), bật "Nén xuống dưới" và nhập số KB mà trang yêu cầu; công cụ tự giảm chất lượng cho tới khi đạt.

Nếu chỉ cần tách nền mà không cần căn khung ảnh thẻ, dùng [Xoá phông ảnh](tool:remove-bg).
