---
title: Cách in CCCD 2 mặt trên một tờ A4 và gửi bản sao an toàn
desc: Cách chụp và in căn cước hai mặt lên một trang A4 đúng kích thước thật 85,6 × 54 mm, ghi mục đích lên bản sao và che thông tin trước khi gửi qua mạng.
tools: [id-card-print, redact-pdf, blur-image, watermark-image]
updated: 2026-11-13
---

Để in căn cước hai mặt trên một tờ A4, chụp mặt trước và mặt sau bằng điện thoại, đưa hai ảnh vào [In CCCD 2 mặt trên 1 trang A4](tool:id-card-print) rồi in file PDF ở tỉ lệ 100%. Công cụ tự cắt theo mép thẻ, nắn thẳng và đặt mỗi mặt đúng kích thước thật.

## Kích thước thẻ căn cước

Thẻ căn cước dùng khổ ID-1 theo tiêu chuẩn ISO/IEC 7810: **85,6 × 54 mm**. Thẻ ngân hàng, giấy phép lái xe dạng thẻ và thẻ bảo hiểm y tế dạng thẻ cũng dùng khổ này, nên có thể in theo cùng cách.

## Chụp thẻ cho rõ

- Đặt thẻ trên nền tối hơn thẻ, ví dụ mặt bàn gỗ sẫm.
- Đủ sáng, không để bóng tay hay bóng điện thoại đè lên thẻ.
- Chụp thẳng từ trên xuống; tắt đèn flash để mặt thẻ không bị loá.
- Chụp riêng từng mặt, mỗi mặt một ảnh.

## Các bước in

1. Mở [In CCCD 2 mặt trên 1 trang A4](tool:id-card-print), chọn ảnh mặt trước và mặt sau.
2. Kiểm tra ảnh đã được cắt đúng mép thẻ. Nếu lệch, bấm "Chỉnh góc" rồi kéo bốn chấm tới bốn góc thẻ; bấm "Xoay" nếu thẻ bị ngược.
3. Chọn cách xếp và số bộ trên trang, rồi bấm "Tạo PDF A4".
4. Khi in, chọn tỉ lệ **100% (Kích thước thật)**. Không chọn "Vừa trang", vì thẻ sẽ to hoặc nhỏ hơn thật.

Muốn chắc bản in đúng cỡ, bật "Thước kiểm tra 5 cm" rồi dùng thước đo lại trên giấy.

## Ghi mục đích sử dụng lên bản sao

Bản sao căn cước không ghi mục đích có thể bị dùng vào việc khác. Trong công cụ có ô thêm dòng chữ "Bản sao dùng để…", ví dụ "Bản sao dùng để làm hồ sơ vay vốn tại ngân hàng X". Chữ được in thẳng vào ảnh nên không gỡ ra khỏi file được.

Với ảnh giấy tờ khác, bạn có thể đóng dấu chữ lặp kín ảnh bằng [Chèn watermark ảnh](tool:watermark-image).

## Che thông tin trước khi gửi qua mạng

Nhiều trường hợp nơi nhận chỉ cần xác nhận họ tên và ảnh. Hãy che những phần họ không cần:

- **Ảnh chụp:** dùng [Che, làm mờ vùng nhạy cảm](tool:blur-image). Với chữ và số nên chọn kiểu **tô đen**; làm mờ nhẹ đôi khi vẫn đoán lại được.
- **File PDF:** dùng [Che thông tin trong PDF](tool:redact-pdf). Trang có vùng che được vẽ lại thành ảnh, nên chữ bên dưới bị xoá hẳn chứ không chỉ bị một hình chữ nhật đè lên.

## Vì sao không nên dùng trang web tải ảnh lên máy chủ?

Ảnh căn cước đủ để kẻ xấu mở tài khoản hoặc vay tiền trực tuyến dưới tên bạn. Các công cụ trên chạy hoàn toàn trong trình duyệt: ảnh không rời khỏi máy và không được lưu lại sau khi đóng trang.

## Câu hỏi thường gặp

**In đen trắng có được chấp nhận không?** Tuỳ nơi nhận. Bản photo đen trắng được dùng rất phổ biến, nhưng nơi yêu cầu bản sao có chứng thực thì bạn phải mang thẻ gốc đến nơi chứng thực.

**In hai mặt giấy hay cùng một mặt?** Cùng một mặt giấy: mặt trước và mặt sau thẻ nằm trên cùng một trang A4, đúng kiểu photo thông thường. Bạn chọn cách xếp và số bộ trên trang trong công cụ.
