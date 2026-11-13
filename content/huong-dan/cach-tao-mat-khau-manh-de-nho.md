---
title: Cách tạo mật khẩu mạnh mà vẫn dễ nhớ
desc: Thế nào là mật khẩu mạnh, vì sao độ dài quan trọng hơn ký tự đặc biệt, cách dùng cụm từ dễ nhớ và trình quản lý mật khẩu, kèm những thói quen cần bỏ.
tools: [password-generator, password-strength, totp]
updated: 2026-11-13
---

Mật khẩu mạnh là mật khẩu dài, ngẫu nhiên và không dùng lại ở nơi khác: tối thiểu 12 ký tự ngẫu nhiên, tốt hơn là từ 16 trở lên, hoặc một cụm 5–6 từ chọn ngẫu nhiên. [Tạo mật khẩu mạnh](tool:password-generator) sinh ra cả hai kiểu ngay trên máy bạn.

## Vì sao độ dài quan trọng nhất?

Kẻ tấn công không ngồi đoán tay mà dùng máy thử hàng tỷ khả năng. Mỗi ký tự thêm vào nhân số khả năng lên nhiều lần, nên mật khẩu dài khó dò hơn hẳn mật khẩu ngắn có ký tự đặc biệt.

| Mật khẩu | Nhận xét |
|---|---|
| 123456, matkhau, qwerty | Nằm trong mọi danh sách dò thử đầu tiên |
| Tuan1990, Hanoi@123 | Tên, năm sinh, địa danh kèm mẫu quen thuộc: dễ đoán |
| P@ssw0rd | Thay chữ bằng ký hiệu theo kiểu ai cũng biết: không an toàn hơn |
| 16 ký tự ngẫu nhiên | Mạnh, nhưng phải có nơi lưu |
| 5–6 từ ngẫu nhiên ghép lại | Mạnh và nhớ được |

## Cụm từ dễ nhớ

Cụm từ là vài từ quen thuộc được chọn **ngẫu nhiên** rồi ghép lại. Vì các từ không liên quan đến nhau và không liên quan đến bạn, số cách ghép là rất lớn, trong khi bạn vẫn hình dung và gõ lại được, kể cả trên điện thoại.

Điểm mấu chốt là để máy chọn từ. Câu thơ, lời bài hát, câu khẩu hiệu yêu thích đều nằm trong từ điển dò thử.

## Ba kiểu trong công cụ

1. **Ngẫu nhiên:** kéo thanh độ dài và chọn loại ký tự. Dùng cho tài khoản được lưu trong trình quản lý mật khẩu.
2. **Cụm từ dễ nhớ:** dùng cho mật khẩu bạn phải tự nhớ, như mật khẩu máy tính hoặc mật khẩu chính của trình quản lý.
3. **Mã PIN:** dùng cho nơi chỉ nhận chữ số.

Mật khẩu được tạo bằng bộ sinh số ngẫu nhiên dùng cho mật mã của trình duyệt; không được lưu và không gửi đi đâu.

## Mỗi tài khoản một mật khẩu

Khi một trang web bị lộ dữ liệu, kẻ xấu đem cặp email và mật khẩu đó thử đăng nhập ở những nơi khác. Dùng chung mật khẩu nghĩa là mất một nơi là mất tất cả.

Không ai nhớ nổi hàng chục mật khẩu ngẫu nhiên, nên cách làm thực tế là:

- Dùng một **trình quản lý mật khẩu** (có sẵn trong trình duyệt, điện thoại, hoặc ứng dụng chuyên dụng) để tạo và lưu mật khẩu riêng cho từng trang.
- Tự nhớ vài mật khẩu quan trọng nhất: mật khẩu chính của trình quản lý, email, máy tính.

## Bật xác thực hai bước

Mật khẩu mạnh vẫn có thể lộ qua trang giả mạo. Với email, ngân hàng, mạng xã hội, hãy bật xác thực hai bước để kẻ có mật khẩu vẫn chưa đăng nhập được. Muốn hiểu mã 6 số hoạt động thế nào, xem [Tạo mã 2FA (TOTP)](tool:totp).

## Kiểm tra mật khẩu đang dùng

[Kiểm tra độ mạnh mật khẩu](tool:password-strength) ước tính thời gian để mật khẩu bị dò ra và chỉ ra các mẫu dễ đoán: tên người, ngày tháng, phím liền nhau, từ phổ biến. Việc kiểm tra chạy trên trình duyệt; dù vậy, thói quen tốt là thử với một mật khẩu tương tự thay vì mật khẩu thật.

## Những thói quen nên bỏ

- Ghi mật khẩu vào ghi chú không khoá, file Excel, hoặc tự nhắn cho mình.
- Gửi mật khẩu qua tin nhắn, email mà không xoá sau đó.
- Chỉ thêm số 1 hoặc dấu ! vào cuối mật khẩu cũ khi bị yêu cầu đổi.
- Trả lời thật các câu hỏi bảo mật có thể tra được trên mạng xã hội (trường cấp một, tên thú cưng).
- Nhập mật khẩu vào đường link nhận qua tin nhắn; hãy tự gõ địa chỉ trang.

## Khi nào cần đổi mật khẩu?

Không cần đổi định kỳ nếu mật khẩu mạnh và không dùng chung. Hãy đổi ngay khi: dịch vụ thông báo bị lộ dữ liệu, bạn lỡ nhập vào trang đáng ngờ, có thông báo đăng nhập lạ, hoặc bạn đã từng chia sẻ mật khẩu đó cho người khác.
