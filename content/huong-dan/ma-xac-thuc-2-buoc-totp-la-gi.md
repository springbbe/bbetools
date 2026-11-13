---
title: Mã xác thực 2 bước (2FA, TOTP) là gì và dùng thế nào?
desc: Giải thích mã xác thực 6 số đổi mỗi 30 giây, vì sao an toàn hơn mã gửi qua SMS, cách bật xác thực 2 bước, sao lưu khoá bí mật và xử lý khi mã không khớp.
tools: [totp, password-generator, qr-scanner]
updated: 2026-11-13
---

Mã xác thực 2 bước kiểu TOTP là dãy 6 chữ số đổi mỗi 30 giây, được tính từ một khoá bí mật và giờ hiện tại. Khi đăng nhập, ngoài mật khẩu bạn nhập thêm mã này, nên kẻ biết mật khẩu vẫn chưa vào được tài khoản. Bạn có thể xem cách mã được tạo ra bằng [Tạo mã 2FA (TOTP)](tool:totp).

## TOTP hoạt động thế nào?

1. Khi bạn bật xác thực 2 bước, dịch vụ tạo một **khoá bí mật** và hiện nó dưới dạng mã QR.
2. Bạn quét mã QR bằng ứng dụng xác thực; từ đó cả ứng dụng và dịch vụ cùng giữ khoá này.
3. Mỗi 30 giây, hai bên dùng cùng một công thức để tính ra 6 chữ số từ khoá bí mật và thời gian hiện tại.
4. Mã bạn nhập trùng với mã dịch vụ tự tính thì được đăng nhập.

Ứng dụng xác thực không cần mạng để tạo mã; nó chỉ cần đồng hồ đúng giờ.

## So với mã gửi qua SMS

| | Mã SMS | Mã TOTP |
|---|---|---|
| Cần sóng điện thoại | Có | Không |
| Rủi ro bị chiếm SIM, chuyển hướng tin nhắn | Có | Không |
| Dùng khi ra nước ngoài | Phụ thuộc chuyển vùng | Bình thường |
| Mất điện thoại | Lấy lại SIM là dùng tiếp | Cần mã dự phòng hoặc bản sao lưu |

Cả hai đều tốt hơn nhiều so với chỉ dùng mật khẩu. Nếu dịch vụ cho chọn, ứng dụng xác thực an toàn hơn SMS.

## Bật xác thực 2 bước

1. Cài một ứng dụng xác thực trên điện thoại.
2. Vào phần bảo mật của tài khoản, chọn bật xác thực 2 bước bằng ứng dụng xác thực.
3. Quét mã QR, nhập mã 6 số để xác nhận.
4. **Lưu các mã dự phòng** mà dịch vụ cung cấp.

Nên bật trước cho những tài khoản quan trọng nhất: email (vì dùng để đặt lại mật khẩu mọi nơi khác), ngân hàng, mạng xã hội, lưu trữ đám mây.

## Sao lưu: việc hay bị bỏ quên

Mất điện thoại mà không có bản sao lưu là mất quyền đăng nhập. Hãy làm ít nhất một trong các cách:

- In hoặc chép tay các mã dự phòng, cất ở nơi an toàn.
- Lưu khoá bí mật (dãy chữ hiện bên dưới mã QR lúc cài đặt) vào trình quản lý mật khẩu.
- Bật tính năng sao lưu của ứng dụng xác thực, nếu có.

Khoá bí mật có giá trị ngang mật khẩu: ai có nó đều tạo được mã của bạn. Không chụp màn hình mã QR rồi để trong thư viện ảnh.

## Công cụ ở đây dùng để làm gì?

1. Dán khoá bí mật (dạng Base32) hoặc link otpauth://, hoặc bấm "Đọc từ ảnh QR".
2. Mã 6 số hiện ngay và tự đổi sau mỗi 30 giây.
3. Bấm "Sao chép" để dán vào ô xác thực.

Công cụ **không lưu khoá**: đóng trang là mất. Vì vậy nó hợp để kiểm tra một khoá vừa sao lưu có đúng không, lấy mã tạm khi điện thoại không ở bên cạnh, hoặc để lập trình viên thử tính năng đăng nhập 2 bước. Dùng hằng ngày thì nên cài ứng dụng xác thực trên điện thoại.

Khoá bạn dán vào được xử lý ngay trên trình duyệt, không gửi đi đâu.

## Mã không khớp thì kiểm tra gì?

- **Giờ trên máy sai.** Đây là nguyên nhân phổ biến nhất; bật tự động đặt ngày giờ.
- **Nhập mã vừa hết hạn.** Chờ mã mới rồi nhập ngay.
- **Sai cài đặt.** Phần lớn dịch vụ dùng 6 số, chu kỳ 30 giây, thuật toán SHA-1; một số dùng thông số khác.
- **Dán thiếu ký tự của khoá.**

## Cảnh giác với lừa đảo

Mã 6 số chỉ để nhập vào đúng trang bạn đang đăng nhập. Không đọc mã cho bất kỳ ai qua điện thoại hay tin nhắn, kể cả người tự xưng là nhân viên ngân hàng hoặc cơ quan chức năng. Trang giả mạo có thể xin cả mật khẩu lẫn mã rồi dùng ngay; hãy tự gõ địa chỉ trang thay vì bấm vào đường link nhận được.

## Liên quan

- Tạo mật khẩu riêng cho từng tài khoản: [Tạo mật khẩu mạnh](tool:password-generator).
- Đọc nội dung một mã QR trước khi tin vào nó: [Quét mã QR](tool:qr-scanner).
