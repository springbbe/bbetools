---
title: Cách quét mã QR từ ảnh chụp màn hình trên máy tính
desc: Cách đọc mã QR từ ảnh, ảnh chụp màn hình hoặc file PDF trên máy tính và điện thoại mà không cần máy thứ hai, kèm cách kiểm tra link trước khi mở.
tools: [qr-scanner, qr-generator, vietqr]
updated: 2026-11-15
---

Mã QR nằm ngay trên màn hình máy tính, hoặc trong tấm ảnh bạn vừa nhận trên chính chiếc điện thoại đang cầm: không có máy thứ hai để giơ lên quét. Mở [Quét mã QR](tool:qr-scanner), dán ảnh chụp màn hình hoặc chọn file ảnh, PDF có mã; nội dung hiện ngay. Ảnh được giải mã trên trình duyệt, không gửi đi đâu.

## Quét mã đang hiện trên màn hình máy tính

1. Chụp vùng màn hình có mã QR. Trên Windows bấm Win + Shift + S; trên macOS bấm ⌘ + Shift + 4 (thêm phím Control để chép thẳng vào bộ nhớ tạm).
2. Mở trang quét mã và bấm Ctrl + V (hoặc ⌘ + V) để dán ảnh.
3. Đọc kết quả, sao chép hoặc mở link.

## Quét mã trong ảnh trên điện thoại

1. Lưu ảnh có mã về máy, hoặc chụp màn hình.
2. Mở trang quét mã, chọn ảnh từ thư viện.
3. Kết quả hiện ngay bên dưới.

Cách này dùng được khi ai đó gửi mã QR qua tin nhắn và ứng dụng nhắn tin không có sẵn nút quét.

## Quét bằng camera

Bấm "Bật camera", cho phép trình duyệt dùng camera rồi đưa mã vào khung. Máy tính có webcam cũng quét được mã in trên giấy theo cách này. Hình ảnh camera chỉ được xử lý trên máy bạn.

## Quét mã trong file PDF

Hoá đơn điện tử, vé, giấy mời dạng PDF thường có mã QR. Chọn thẳng file PDF trong công cụ, không cần chụp màn hình.

## Kết quả hiện những gì?

| Loại mã | Thông tin được tách sẵn |
|---|---|
| Đường link | Địa chỉ đầy đủ để xem trước khi mở |
| WiFi | Tên mạng, mật khẩu, kiểu bảo mật |
| VietQR chuyển khoản | Ngân hàng, số tài khoản, số tiền, nội dung |
| Danh thiếp | Tên, số điện thoại, email |
| Văn bản thường | Nguyên văn nội dung |

Ngoài QR, công cụ đọc được Micro QR, Data Matrix, Aztec, PDF417 và các mã vạch phổ biến như EAN-13, Code 128, Code 39, UPC.

## Kiểm tra trước khi mở link

Mã QR chỉ là một dãy ký tự được vẽ thành hình; mắt thường không biết nó dẫn đi đâu. Kẻ gian lợi dụng điều đó bằng cách dán mã giả đè lên mã thật ở quầy thanh toán, bãi gửi xe, hoặc gửi mã qua tin nhắn mạo danh ngân hàng.

Trước khi mở, đọc kỹ địa chỉ:

- **Tên miền có đúng không?** Phần quyết định là phần ngay trước dấu gạch chéo đầu tiên. Địa chỉ "nganhang.vn.xyz-abc.com/dangnhap" thuộc về xyz-abc.com, không phải nganhang.vn.
- **Có ký tự thay thế không?** Số 0 thay chữ o, chữ l thay chữ i, thêm dấu gạch nối.
- **Link rút gọn** che mất đích đến. Thận trọng nếu không rõ ai gửi.
- **Trang mở ra đòi đăng nhập ngân hàng, mã OTP, cài ứng dụng:** dừng lại. Ngân hàng không yêu cầu những việc đó qua mã QR do người lạ gửi.

Với mã chuyển khoản, đối chiếu **tên người nhận** mà ứng dụng ngân hàng hiển thị với người bạn định trả tiền trước khi xác nhận.

## Không quét được?

| Hiện tượng | Cách xử lý |
|---|---|
| Ảnh có nhiều thứ khác quanh mã | Cắt sát vào mã rồi thử lại |
| Ảnh mờ, bị nén nhiều lần | Xin ảnh gốc, hoặc chụp lại rõ hơn |
| Mã quá nhỏ trong ảnh | Phóng to màn hình trước khi chụp |
| Quét bằng camera ở chỗ tối | Bật đèn flash nếu điện thoại và trình duyệt hỗ trợ |
| Mã bị chói, phản quang | Nghiêng máy hoặc đổi góc |
| Mã có logo che quá lớn ở giữa | Mã có thể đã hỏng; hỏi lại người tạo |

## Việc liên quan

- Tạo mã QR cho link, WiFi, danh thiếp: [Tạo mã QR](tool:qr-generator).
- Tạo mã nhận chuyển khoản có sẵn số tiền và nội dung: [Tạo mã QR chuyển khoản (VietQR)](tool:vietqr).

## Câu hỏi thường gặp

**Có cần cài ứng dụng không?** Không. Trang chạy trên trình duyệt của máy tính và điện thoại.

**Quét nhiều mã trong một ảnh được không?** Nên cắt riêng từng mã để chắc chắn đọc đúng mã bạn cần.

**Mã QR có hết hạn không?** Bản thân mã không hết hạn. Nội dung nó trỏ tới thì có thể: link bị gỡ, mã thanh toán một lần đã dùng, vé đã qua ngày.
