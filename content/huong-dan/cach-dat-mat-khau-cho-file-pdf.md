---
title: Cách đặt mật khẩu cho file PDF và gỡ khi không cần nữa
desc: Hướng dẫn khoá file PDF bằng mật khẩu, mã hoá AES-256, chặn in và sao chép, cách gửi mật khẩu an toàn và gỡ mật khẩu khỏi file sao kê, bảng lương.
tools: [protect-pdf, unlock-pdf, password-generator]
updated: 2026-11-13
---

Để khoá một file PDF, mở [Đặt mật khẩu PDF](tool:protect-pdf), nhập mật khẩu hai lần rồi bấm "Khoá PDF". File được mã hoá AES-256 ngay trên trình duyệt; ai không có mật khẩu sẽ không mở được.

## Khi nào nên đặt mật khẩu?

- Gửi hợp đồng, bảng lương, sao kê, hồ sơ y tế qua email hoặc ứng dụng nhắn tin.
- Lưu giấy tờ cá nhân lên dịch vụ lưu trữ đám mây.
- Chép tài liệu vào USB hoặc máy tính dùng chung.

## Các bước khoá file

1. Chọn hoặc kéo thả một hay nhiều file PDF.
2. Nhập mật khẩu hai lần.
3. Nếu cần, mở "Hạn chế quyền" để chặn in, sao chép, chỉnh sửa.
4. Bấm "Khoá PDF" rồi tải file đã mã hoá về.

## Hai lớp bảo vệ khác nhau

| Lớp | Tác dụng | Độ chắc chắn |
|---|---|---|
| Mật khẩu mở file | Không có mật khẩu thì không đọc được nội dung | Cao, nếu mật khẩu đủ mạnh |
| Hạn chế in, sao chép, sửa | Trình đọc PDF không cho in hoặc sao chép | Trung bình: phần mềm phổ biến tôn trọng, một số phần mềm có thể bỏ qua |

Mật khẩu mở file mới là lớp bảo vệ chính. Hạn chế quyền chỉ nên coi là rào cản bổ sung.

## Chọn mật khẩu

Mã hoá mạnh đến đâu cũng vô ích nếu mật khẩu dễ đoán. Tránh ngày sinh, số điện thoại, tên công ty. Dùng [Tạo mật khẩu mạnh](tool:password-generator) để có mật khẩu ngẫu nhiên từ 12 ký tự trở lên hoặc một cụm từ dễ nhớ.

**Quên mật khẩu thì không có cách lấy lại.** Hãy lưu mật khẩu trong trình quản lý mật khẩu và giữ bản gốc chưa khoá ở nơi an toàn.

## Gửi mật khẩu cho người nhận thế nào?

Không gửi mật khẩu cùng kênh với file. Nếu gửi file qua email thì gửi mật khẩu qua tin nhắn hoặc gọi điện, và ngược lại. Như vậy, người đọc trộm được một kênh vẫn chưa mở được file.

Với nhóm làm việc thường xuyên, thống nhất trước một quy tắc mật khẩu riêng cho từng người nhận thay vì dùng chung một mật khẩu cho mọi file.

## Gỡ mật khẩu khỏi file

Sao kê ngân hàng, bảng lương, hoá đơn điện thoại thường được gửi kèm mật khẩu. Khi cần lưu trữ lâu dài hoặc nộp cho nơi khác, bạn có thể gỡ khoá bằng [Mở khoá PDF](tool:unlock-pdf):

1. Chọn file.
2. File cần mật khẩu để mở: bấm biểu tượng ổ khoá và nhập mật khẩu. File chỉ bị chặn in, sao chép thì không cần nhập.
3. Bấm "Mở khoá PDF" rồi tải file về.

Công cụ không dò hay phá mật khẩu: bạn phải biết mật khẩu mở file. Chỉ gỡ khoá file của mình hoặc file bạn được phép sử dụng.

## Vì sao làm trên trình duyệt an toàn hơn?

Tài liệu cần khoá thường là tài liệu nhạy cảm, và mật khẩu cũng nhạy cảm không kém. Ở đây cả file lẫn mật khẩu đều được xử lý ngay trên máy bạn, không gửi lên máy chủ nào.

## Câu hỏi thường gặp

**Người nhận cần phần mềm gì để mở?** Trình đọc PDF thông thường và các trình duyệt hiện nay đều mở được file mã hoá AES-256; phần mềm quá cũ có thể không hỗ trợ.

**Khoá file rồi có nén hay ghép được không?** Cần mở khoá trước. Thứ tự nên làm: ghép, nén, ký, rồi mới đặt mật khẩu ở bước cuối.

**Đặt mật khẩu có chống được việc chụp màn hình không?** Không. Người đã mở được file luôn có thể chụp lại màn hình; mật khẩu chỉ ngăn người không được phép mở file.
