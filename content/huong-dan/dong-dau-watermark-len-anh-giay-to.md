---
title: Cách chèn watermark lên ảnh CCCD, giấy tờ khi gửi online
desc: Cách đóng dấu chữ lên ảnh căn cước, giấy tờ trước khi gửi qua mạng để hạn chế bị dùng lại: nên ghi gì, đặt ở đâu, và cách chèn watermark hàng loạt.
tools: [watermark-image, watermark-pdf, blur-image, strip-exif]
updated: 2026-11-15
---

Ảnh chụp căn cước gửi cho một bên có thể bị sao chép và dùng vào việc khác: đăng ký tài khoản, vay tiền qua ứng dụng, mở SIM. Đóng một dòng chữ ghi rõ mục đích lên ảnh khiến bản sao đó khó dùng lại ở nơi khác. Mở [Chèn watermark ảnh](tool:watermark-image), chọn ảnh, nhập dòng chữ, bật "Lặp kín ảnh" rồi tải về. Ảnh giấy tờ được xử lý ngay trên trình duyệt, không tải lên đâu.

## Nên ghi gì lên ảnh?

Dòng chữ tốt trả lời ba câu hỏi: gửi cho ai, để làm gì, khi nào.

| Tình huống | Ví dụ dòng chữ |
|---|---|
| Thuê nhà | Chỉ dùng để làm hợp đồng thuê nhà với ông Nguyễn Văn A – 15/11/2026 |
| Nộp hồ sơ xin việc | Chỉ dùng cho hồ sơ ứng tuyển tại Công ty X – 11/2026 |
| Xác minh với người bán hàng | Chỉ để xác minh giao dịch với shop Y – 15/11/2026 |
| Đăng ký dịch vụ | Chỉ dùng để đăng ký dịch vụ Z |

Ghi càng cụ thể, bản sao càng khó dùng vào việc khác.

## Các bước chèn watermark

1. Chọn, kéo thả hoặc dán một hay nhiều ảnh (mặt trước, mặt sau).
2. Nhập dòng chữ; tiếng Việt có dấu hiện đúng.
3. Chỉnh cỡ chữ, độ đậm, góc xoay.
4. Bật "Lặp kín ảnh" để chữ phủ đều cả ảnh theo đường chéo.
5. Xem trước trên ảnh đầu tiên, bấm "Chèn watermark" rồi tải từng ảnh hoặc cả file .zip.

## Đặt watermark thế nào cho hiệu quả?

- **Phủ kín, không đặt ở góc.** Watermark ở một góc bị cắt đi trong vài giây.
- **Chữ phải đè lên ảnh chân dung và dãy số.** Đó là hai phần hay bị lấy lại nhất.
- **Độ đậm vừa phải.** Người nhận vẫn phải đọc được thông tin; chữ mờ quá thì dễ bị tẩy, đậm quá thì giấy tờ không còn đọc được. Hãy xem trước và chỉnh tới khi cả hai đều rõ.
- **Màu tương phản với nền giấy tờ.** Trên thẻ căn cước nền sáng, chữ xám đậm hoặc đỏ dễ thấy hơn chữ trắng.

## Che bớt thông tin không cần thiết

Không phải bên nào cũng cần mọi thông tin trên thẻ. Nếu người nhận chỉ cần xác nhận họ tên và ảnh, bạn có thể che dãy số, mã QR hoặc địa chỉ bằng [Che, làm mờ vùng nhạy cảm](tool:blur-image) trước khi đóng watermark. Mã QR trên thẻ căn cước chứa thông tin cá nhân, đừng quên che khi không cần.

Ảnh chụp bằng điện thoại còn có thể mang toạ độ nơi chụp. Gỡ bằng [Xoá thông tin EXIF/GPS](tool:strip-exif) nếu bạn gửi ảnh dạng file gốc.

## Giấy tờ dạng PDF

Hợp đồng, sao kê, bản scan dạng PDF thì dùng [Chèn watermark PDF](tool:watermark-pdf): nhập chữ hoặc chọn logo, chọn "Lặp kín trang", áp dụng cho mọi trang hoặc một số trang.

## Watermark không phải là tất cả

Watermark làm bản sao khó dùng lại, nhưng không ngăn được việc ảnh bị phát tán. Một số thói quen nên có:

- Chỉ gửi giấy tờ khi thật sự cần và cho bên bạn biết rõ là ai.
- Hỏi xem họ có cần ảnh hai mặt không, hay chỉ cần số.
- Không đăng ảnh giấy tờ lên mạng xã hội, kể cả đã che một phần.
- Gửi xong thì xoá ảnh khỏi cuộc trò chuyện nếu ứng dụng cho phép thu hồi.

## Câu hỏi thường gặp

**Nơi nhận có chấp nhận ảnh có watermark không?** Phần lớn chấp nhận nếu thông tin vẫn đọc được. Thủ tục chính thức yêu cầu bản sao chứng thực thì ảnh chụp, dù có watermark hay không, đều không thay thế được.

**Watermark có tẩy được không?** Chữ được vẽ thẳng vào ảnh. Chữ lặp kín, đè lên vùng nhiều chi tiết rất khó tẩy sạch mà không để lại dấu vết.

**Chèn cho nhiều ảnh cùng lúc được không?** Được. Cỡ chữ tính theo phần trăm chiều rộng ảnh nên ảnh to nhỏ khác nhau vẫn có watermark cân đối.
