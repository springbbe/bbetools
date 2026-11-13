---
title: Cách xoá phông, tách nền ảnh chân dung không cần Photoshop
desc: Cách tách nền ảnh có người bằng AI chạy ngay trên trình duyệt, đổi nền trắng, nền màu hoặc làm mờ hậu cảnh, và cách chụp để viền tóc được tách sạch.
tools: [remove-bg, id-photo, compress-image]
updated: 2026-11-13
---

Để xoá phông một ảnh chân dung, mở [Xoá phông ảnh](tool:remove-bg), chọn ảnh, chọn nền mới rồi bấm "Xoá phông". Mô hình AI chạy ngay trên máy bạn nên ảnh không bị gửi đi đâu, và kết quả tải về không có chữ đóng dấu.

## Các bước

1. Chọn, kéo thả hoặc dán một hay nhiều ảnh có người.
2. Chọn nền mới: trong suốt (PNG), trắng, màu khác hoặc làm mờ nền gốc.
3. Bấm "Xoá phông" và chờ AI tách nền.
4. Tải ảnh về.

Lần đầu dùng, trình duyệt tải mô hình AI khoảng 6,6 MB nên hơi lâu; các lần sau dùng lại bản đã lưu.

## Chọn kiểu nền nào?

| Nền | Dùng cho |
|---|---|
| Trong suốt (PNG) | Ghép vào thiết kế, banner, slide, ảnh sản phẩm có người mẫu |
| Trắng | Ảnh hồ sơ, ảnh đại diện công việc, ảnh đăng sàn thương mại điện tử |
| Màu khác | Ảnh đại diện theo màu thương hiệu, thiệp, bìa |
| Làm mờ nền gốc | Giữ không khí của ảnh nhưng làm nổi người, giống chế độ chân dung của điện thoại |

## Chụp sao cho tách nền sạch

AI tách tốt nhất khi người và nền khác biệt rõ:

- Đứng trước nền đơn giản, màu khác màu tóc và áo. Tóc đen trước tường tối sẽ khó tách.
- Ánh sáng đều; tránh ngược sáng làm viền người bị cháy.
- Chụp đủ nét, không rung tay.
- Tóc xoã bay, tóc xoăn là phần khó nhất: buộc gọn hoặc vuốt sát nếu cần đường viền thật sắc.
- Người chiếm phần lớn khung hình cho kết quả tốt hơn người đứng xa.

## Ảnh đồ vật, thú cưng có tách được không?

Mô hình được huấn luyện để tách người, nên đạt kết quả tốt nhất với ảnh có người. Ảnh chỉ có đồ vật hoặc con vật có thể tách chưa chuẩn.

## Làm ảnh thẻ thì dùng công cụ khác

Nếu mục đích là ảnh thẻ 3×4, 4×6, dùng thẳng [Làm ảnh thẻ](tool:id-photo): công cụ đó cũng tách nền, đồng thời căn khuôn mặt vào khung chuẩn và xếp nhiều ảnh lên tờ in.

## Ảnh PNG trong suốt quá nặng?

Ảnh PNG nền trong suốt nặng hơn JPG nhiều lần. Nếu không cần nền trong suốt, chọn nền trắng hoặc nền màu rồi nén bằng [Nén ảnh](tool:compress-image). Lưu ý JPG không giữ được vùng trong suốt.

## Mẹo dùng ảnh đã tách nền

- **Ảnh bán hàng:** nền trắng đồng nhất giúp gian hàng trông gọn và chuyên nghiệp hơn.
- **Ảnh đại diện:** nền một màu làm khuôn mặt nổi bật ở kích thước nhỏ.
- **Slide thuyết trình:** ảnh nền trong suốt đặt lên nền slide trông liền mạch hơn ảnh hình chữ nhật.

## Quyền riêng tư

Ảnh chân dung là dữ liệu cá nhân. Nhiều dịch vụ xoá phông trực tuyến yêu cầu tải ảnh lên máy chủ của họ; ở đây mô hình được tải về trình duyệt và chạy trên máy bạn, ảnh không rời khỏi máy.

## Câu hỏi thường gặp

**Xoá phông nhiều ảnh cùng lúc được không?** Được, chọn nhiều ảnh trong một lần rồi tải về từng ảnh hoặc cả bộ.

**Đường viền còn sót nền thì làm sao?** Thử với ảnh gốc có nền tương phản hơn; đây là yếu tố ảnh hưởng nhiều nhất. Với ảnh đã có, chọn nền mới có màu gần với nền cũ sẽ che được phần viền sót.

**Dùng trên điện thoại được không?** Được, nhưng máy cấu hình thấp sẽ xử lý chậm hơn máy tính.
