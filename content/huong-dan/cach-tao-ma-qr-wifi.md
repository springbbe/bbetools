---
title: Cách tạo mã QR WiFi để khách quét là vào mạng
desc: Cách tạo mã QR WiFi cho nhà riêng, quán cà phê, văn phòng để khách quét bằng camera là kết nối, không cần đọc mật khẩu, kèm lưu ý khi in và về bảo mật.
tools: [qr-generator, qr-scanner, password-generator]
updated: 2026-11-15
---

Thay vì đọc từng ký tự mật khẩu cho khách, hãy tạo mã QR WiFi: mở [Tạo mã QR](tool:qr-generator), chọn loại nội dung WiFi, nhập tên mạng và mật khẩu rồi tải ảnh về để in. Khách mở camera điện thoại, quét mã là kết nối. Mã được tạo ngay trên máy bạn; mật khẩu không được gửi đi đâu và không nằm trong link chia sẻ.

## Các bước

1. Ở mục "Loại nội dung", chọn WiFi.
2. Nhập "Tên WiFi (SSID)" đúng từng ký tự, kể cả chữ hoa, chữ thường và dấu cách.
3. Chọn kiểu ở mục "Bảo mật" và nhập "Mật khẩu WiFi".
4. Đổi màu, thêm logo nếu muốn, rồi bấm "Tải PNG" hoặc "Tải SVG".

Mã QR cập nhật ngay khi bạn gõ.

## Điền cho đúng

| Ô | Lưu ý |
|---|---|
| Tên WiFi (SSID) | Phải khớp tuyệt đối với tên mạng. Sai một chữ hoa là không kết nối được |
| Bảo mật | Hầu hết mạng gia đình, quán xá hiện nay dùng WPA/WPA2/WPA3. Chọn "Không mật khẩu" cho mạng mở |
| Mật khẩu WiFi | Phân biệt chữ hoa, chữ thường |
| Mạng ẩn (không phát tên) | Chỉ bật khi bộ phát được đặt ẩn tên mạng |

Bộ phát có hai băng tần với hai tên khác nhau (ví dụ thêm đuôi 5G) là hai mạng riêng; hãy tạo mã cho mạng bạn muốn khách dùng.

## Khách quét thế nào?

- **iPhone:** mở ứng dụng Camera, đưa mã vào khung, chạm vào thông báo kết nối hiện ra.
- **Android:** mở Camera hoặc vào phần cài đặt WiFi và chọn biểu tượng quét mã. Tên mục khác nhau tuỳ hãng máy.
- **Máy tính có webcam hoặc máy đời cũ:** dùng [Quét mã QR](tool:qr-scanner) để đọc tên mạng và mật khẩu rồi nhập tay.

Trước khi in hàng loạt, hãy tự quét thử bằng một điện thoại chưa từng kết nối mạng đó.

## In mã cho dễ quét

- **Kích thước:** in cạnh tối thiểu khoảng 3 cm cho mã đặt trên bàn; mã dán tường quét từ xa cần lớn hơn, khoảng một phần mười khoảng cách quét.
- **Độ nét:** ở mục "Kích thước ảnh tải về" chọn "2048 px (in ấn)", hoặc tải SVG để phóng to không vỡ.
- **Màu sắc:** mã tối trên nền sáng. Màu mã sáng hơn màu nền thì nhiều ứng dụng không quét được.
- **Viền trắng:** giữ khoảng trắng quanh mã, đừng cắt sát hoặc đặt chữ đè lên.
- **Bề mặt:** tránh ép plastic bóng ở nơi có đèn chiếu thẳng, vì bị loá khi quét.
- **Mức sửa lỗi:** mã để ở nơi dễ bẩn, dễ xước thì chọn mức "Cao (H) – chịu bẩn, che tốt".

Nên in kèm tên mạng bằng chữ ở dưới mã để khách biết mình đang vào đúng mạng.

## Chèn logo quán

Chọn ảnh ở mục "Logo ở giữa (tuỳ chọn)". Khi có logo, mã tự dùng mức sửa lỗi cao nhất để vẫn quét được. Giữ logo nhỏ hơn khoảng 20% chiều rộng mã. Ảnh SVG chỉ hỗ trợ kiểu ô vuông và không có logo; cần logo thì tải PNG.

## Lưu ý bảo mật

Mã QR WiFi chứa mật khẩu ở dạng đọc được. Ai chụp được mã là có mật khẩu, dù không ở trong quán.

- **Nhà riêng:** dán mã ở nơi chỉ khách vào nhà mới thấy, đừng dán gần cửa sổ hay đăng ảnh lên mạng.
- **Quán, văn phòng:** bật mạng khách (guest network) trên bộ phát và tạo mã cho mạng đó. Thiết bị nội bộ như máy tính tiền, camera, máy in ở mạng riêng.
- **Đổi mật khẩu định kỳ:** mã QR không hết hạn, nhưng đổi mật khẩu thì mã cũ hết tác dụng và phải in mã mới. Tạo mật khẩu mới bằng [Tạo mật khẩu mạnh](tool:password-generator).

## Mã QR này có hết hạn không?

Không. Mã chứa trực tiếp tên mạng và mật khẩu, không đi qua đường link trung gian nào, nên dùng được mãi cho tới khi bạn đổi tên mạng hoặc mật khẩu. Nó cũng hoạt động khi khách chưa có kết nối mạng, vì điện thoại đọc thông tin ngay từ hình.

## Câu hỏi thường gặp

**Quét mã xong mà không kết nối được?** Thường do sai tên mạng, sai mật khẩu hoặc chọn sai kiểu bảo mật. Mở lại công cụ, kiểm tra từng ô rồi tạo mã mới.

**Tên WiFi có dấu tiếng Việt hoặc ký tự đặc biệt có được không?** Được, nhưng một số điện thoại đời cũ đọc không đúng. Tên mạng không dấu là an toàn nhất.

**Một mã dùng cho bao nhiêu người?** Không giới hạn. Số thiết bị kết nối cùng lúc phụ thuộc bộ phát WiFi.
