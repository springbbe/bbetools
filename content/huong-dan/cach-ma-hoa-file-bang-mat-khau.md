---
title: Cách đặt mật khẩu cho file bất kỳ trước khi gửi đi
desc: Cách khoá file Word, Excel, ảnh, video bằng mật khẩu ngay trên trình duyệt trước khi gửi qua email, tin nhắn, và cách gửi mật khẩu cho an toàn.
tools: [file-encrypt, text-encrypt, password-generator, protect-pdf]
updated: 2026-11-15
---

Email và tin nhắn có thể bị chuyển tiếp, lộ tài khoản hoặc gửi nhầm người. Với file nhạy cảm, hãy khoá bằng mật khẩu trước khi gửi: mở [Mã hoá/giải mã file](tool:file-encrypt), chọn file, nhập mật khẩu hai lần rồi bấm "Mã hoá". Bạn nhận về file đuôi .bbe; chỉ người có đúng mật khẩu mới mở lại được. File được mã hoá ngay trên máy bạn, không tải lên máy chủ nào.

## Các bước mã hoá

1. Chọn một hoặc nhiều file: Word, Excel, ảnh, video, file nén đều được.
2. Nhập mật khẩu, rồi nhập lại cho khớp.
3. Bấm "Mã hoá" và tải file .bbe về.
4. Gửi file .bbe cho người nhận; báo mật khẩu qua một kênh khác.

Gửi nhiều file cùng lúc thì bật "Gộp tất cả thành một file mã hoá": các file được nén vào .zip rồi mã hoá, người nhận chỉ cần giải mã một file.

## Người nhận mở thế nào?

1. Mở trang [Mã hoá/giải mã file](tool:file-encrypt) trên bất kỳ trình duyệt nào, kể cả điện thoại.
2. Chọn file .bbe. Công cụ tự nhận ra đây là file cần giải mã.
3. Nhập đúng mật khẩu, bấm "Giải mã" rồi tải file gốc về.

Không cần cài phần mềm hay tạo tài khoản. Tên file gốc được lưu bên trong, đã mã hoá, nên nhìn file .bbe không ai biết nội dung là gì.

## Gửi mật khẩu thế nào cho an toàn?

Mã hoá chỉ có ý nghĩa khi mật khẩu không đi cùng đường với file.

| Cách gửi mật khẩu | Đánh giá |
|---|---|
| Cùng email, cùng tin nhắn với file | Không nên: ai có file cũng có mật khẩu |
| Gọi điện, nói trực tiếp | Tốt |
| Nhắn qua một ứng dụng khác với kênh gửi file | Chấp nhận được |
| Dùng thông tin hai bên đã biết sẵn | Tốt nếu người ngoài khó đoán |

## Chọn mật khẩu

Thuật toán mạnh đến đâu cũng không cứu được mật khẩu yếu: kẻ có file có thể thử lần lượt các mật khẩu phổ biến.

- Tránh ngày sinh, số điện thoại, tên riêng, "123456".
- Dùng mật khẩu dài: bốn, năm từ ngẫu nhiên ghép lại dễ đọc qua điện thoại mà vẫn khó đoán.
- Tạo nhanh bằng [Tạo mật khẩu mạnh](tool:password-generator).
- Mỗi lần gửi dùng một mật khẩu riêng, đừng dùng lại mật khẩu email hay ngân hàng.

## Quên mật khẩu thì sao?

Không mở lại được. Không có cửa sau, không có chức năng khôi phục, kể cả BbeTools cũng không mở được. Vì vậy:

- Giữ bản gốc chưa mã hoá ở nơi an toàn nếu bạn còn cần.
- Lưu mật khẩu trong trình quản lý mật khẩu với file cần giữ lâu.

## Mã hoá thế nào bên trong?

File được mã hoá bằng AES-GCM 256 bit qua Web Crypto có sẵn trong trình duyệt. Khoá được tạo từ mật khẩu bằng PBKDF2-SHA256 với 600.000 vòng lặp và một giá trị ngẫu nhiên riêng cho mỗi file, làm việc dò mật khẩu chậm đi rất nhiều. File được chia khối 1 MB, mỗi khối có mã xác thực: file bị sửa hay cắt bớt dù một byte cũng bị phát hiện khi giải mã.

## Khi nào dùng cách khác?

- **Chỉ có PDF và muốn người nhận mở bằng trình xem PDF thông thường:** dùng [Đặt mật khẩu PDF](tool:protect-pdf). Người nhận nhập mật khẩu ngay khi mở file, không cần giải mã trước.
- **Chỉ cần gửi một đoạn chữ** như mật khẩu WiFi, số tài khoản, ghi chú riêng: dùng [Mã hoá văn bản](tool:text-encrypt), gửi bản mã hoặc link giải mã.
- **Người nhận không quen công nghệ:** gọi điện hướng dẫn một lần; thao tác giải mã chỉ có ba bước.

## Mã hoá không thay được những gì?

- Không xoá file gốc trên máy bạn. Nếu máy dùng chung, hãy tự xoá bản gốc sau khi mã hoá.
- Không bảo vệ file sau khi người nhận đã giải mã; họ có thể chuyển tiếp bản đã mở.
- Không giấu được việc bạn đã gửi một file, chỉ giấu nội dung.

## Câu hỏi thường gặp

**File lớn có mã hoá được không?** Được. File được xử lý từng khối 1 MB; giới hạn thực tế phụ thuộc bộ nhớ của máy, thường vài GB trên máy tính.

**File mã hoá có nặng hơn không?** Chỉ nặng hơn rất ít, không đáng kể so với file gốc.

**Mật khẩu ngắn nhất là bao nhiêu?** Công cụ yêu cầu ít nhất 6 ký tự; với tài liệu quan trọng nên dùng từ 12 ký tự trở lên.
