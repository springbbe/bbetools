---
title: Cách đổi kích thước ảnh theo pixel mà không bị méo, vỡ
desc: Cách thu nhỏ, đổi kích thước ảnh theo pixel, phần trăm hoặc cạnh dài nhất mà không méo hình; kích thước ảnh nên dùng cho web, email, mạng xã hội.
tools: [resize-image, crop-image, compress-image]
updated: 2026-11-15
---

Ảnh chụp từ điện thoại thường rộng 4000 px trở lên, quá lớn để chèn vào web, gửi email hay tải lên biểu mẫu trực tuyến. Mở [Đổi kích thước ảnh](tool:resize-image), chọn một hay nhiều ảnh, nhập kích thước mới rồi bấm "Đổi kích thước". Ảnh được xử lý ngay trên trình duyệt, không tải lên đâu.

## Ba cách đổi cỡ

| Cách | Nhập gì | Hợp khi |
|---|---|---|
| Theo pixel | Chiều rộng và/hoặc chiều cao | Nơi nhận yêu cầu số pixel cụ thể |
| Theo phần trăm | Ví dụ 50% | Chỉ cần ảnh nhỏ đi một nửa |
| Theo cạnh dài nhất | Ví dụ 1920 px | Xử lý lẫn ảnh dọc và ảnh ngang cùng lúc |

Khi đổi theo pixel, **bỏ trống một ô** để công cụ tự tính ô còn lại theo tỉ lệ gốc. Ví dụ ảnh 4000 × 3000, nhập rộng 1200 và bỏ trống chiều cao sẽ ra 1200 × 900.

## Các bước thực hiện

1. Chọn, kéo thả hoặc dán một hay nhiều ảnh (JPG, PNG, WebP, HEIC…).
2. Chọn cách đổi cỡ và nhập số.
3. Giữ bật "Không phóng to ảnh nhỏ" để ảnh vốn đã nhỏ không bị kéo lên cho nhoè.
4. Bấm "Đổi kích thước" rồi tải từng ảnh hoặc cả file .zip.

## Vì sao ảnh bị méo?

Ảnh méo khi tỉ lệ rộng : cao mới khác tỉ lệ gốc. Ảnh 4:3 ép vào khung vuông 800 × 800 sẽ bị bóp ngang.

Muốn có đúng 800 × 800 mà không méo, làm hai bước:

1. Cắt ảnh về tỉ lệ 1:1 bằng [Cắt ảnh](tool:crop-image), chọn vùng muốn giữ.
2. Đổi kích thước ảnh đã cắt về 800 × 800.

Chỉ tắt "Giữ tỉ lệ" khi bạn chấp nhận ảnh bị kéo giãn.

## Thu nhỏ thì nét, phóng to thì mờ

Thu nhỏ là bỏ bớt điểm ảnh nên ảnh vẫn nét. Công cụ thu nhỏ dần từng nửa với bộ lọc chất lượng cao để chi tiết mịn, không răng cưa.

Phóng to thì ngược lại: phần mềm phải "đoán" thêm điểm ảnh, kết quả luôn mờ hơn. Ảnh 600 px kéo lên 2000 px sẽ nhoè. Nếu cần ảnh lớn, hãy tìm bản gốc có độ phân giải cao hơn.

## Kích thước nên dùng

| Mục đích | Kích thước gợi ý |
|---|---|
| Ảnh trong bài viết trên web | Cạnh dài 1200–1600 px |
| Ảnh nền toàn màn hình | Rộng 1920 px |
| Gửi email, tin nhắn | Cạnh dài 1280–1600 px |
| Ảnh sản phẩm sàn thương mại điện tử | Vuông, từ 1000 × 1000 px |
| Ảnh đại diện | Vuông, 400–800 px |
| In ảnh 10 × 15 cm ở 300 DPI | Khoảng 1200 × 1800 px |

Mỗi nền tảng có quy định riêng và thay đổi theo thời gian; hãy xem hướng dẫn của nơi bạn đăng nếu cần chính xác.

## Đổi kích thước khác nén ảnh thế nào?

- **Đổi kích thước** giảm số điểm ảnh (ảnh nhỏ đi trên màn hình).
- **Nén** giữ nguyên số điểm ảnh nhưng lưu với chất lượng thấp hơn để file nhẹ đi.

Hai việc bổ sung cho nhau. Cần ảnh dưới một dung lượng cụ thể, ví dụ 200 KB cho hồ sơ trực tuyến, hãy đổi kích thước về mức vừa đủ rồi dùng [Nén ảnh](tool:compress-image) với tuỳ chọn "Nén xuống dưới".

## Câu hỏi thường gặp

**Đổi kích thước theo cm được không?** Số cm khi in phụ thuộc DPI. Ở 300 DPI, 1 cm tương ứng khoảng 118 px; nhân lên để ra số pixel cần nhập.

**Đổi nhiều ảnh một lúc được không?** Được. Với ảnh lẫn dọc và ngang, chọn cách "cạnh dài nhất" để mọi ảnh cùng cỡ mà không méo.

**Ảnh HEIC của iPhone có dùng được không?** Được, công cụ nhận cả HEIC.
