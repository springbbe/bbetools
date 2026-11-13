---
title: Cách tạo mã QR chuyển khoản VietQR có sẵn số tiền
desc: Cách tạo mã QR nhận tiền cho mọi ngân hàng theo chuẩn VietQR, có sẵn số tiền và nội dung, để in dán quầy, gửi khách hoặc thu tiền nhóm, kèm lưu ý an toàn.
tools: [vietqr, qr-generator, split-bill]
updated: 2026-11-13
---

Để tạo mã QR chuyển khoản, mở [Tạo mã QR chuyển khoản (VietQR)](tool:vietqr), chọn ngân hàng, nhập số tài khoản, tên chủ tài khoản, số tiền và nội dung nếu cần, rồi tải ảnh mã QR về. Người chuyển quét bằng ứng dụng ngân hàng là mọi thông tin được điền sẵn.

## VietQR là gì?

VietQR là chuẩn mã QR chuyển khoản dùng chung cho các ngân hàng tại Việt Nam, do NAPAS vận hành trên nền chuẩn quốc tế EMVCo. Một mã tạo đúng chuẩn thì ứng dụng của mọi ngân hàng và ví điện tử hỗ trợ VietQR đều quét được, không phụ thuộc ngân hàng của người nhận.

Mã chứa bốn thông tin: mã ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản. Đây là những thông tin bạn vẫn gửi cho người chuyển tiền; mã không chứa mật khẩu hay số dư.

## Các bước tạo mã

1. Chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản.
2. Nhập số tiền và nội dung nếu muốn. Để trống số tiền thì người chuyển tự nhập.
3. Tải ảnh QR để in hoặc gửi, hoặc gửi đường link để người khác mở và quét.

## Nên để sẵn số tiền hay để trống?

| Tình huống | Số tiền | Nội dung |
|---|---|---|
| Dán ở quầy, nhiều món giá khác nhau | Để trống | Để trống hoặc tên cửa hàng |
| Gửi khách thanh toán một đơn hàng | Điền sẵn | Mã đơn hàng |
| Thu tiền nhóm, tiền quỹ lớp | Điền sẵn | Tên khoản thu |
| Nhận tiền ủng hộ | Để trống | Tên chương trình |

Điền sẵn số tiền và nội dung giúp người chuyển không gõ nhầm và giúp bạn đối soát nhanh hơn.

## Vì sao nội dung bị bỏ dấu?

Nhiều ngân hàng chỉ nhận nội dung không dấu và giới hạn khoảng 25 ký tự trong mã QR. Công cụ tự bỏ dấu để tránh lỗi khi quét. Hãy viết nội dung ngắn, ví dụ "DH1025" hoặc "Quy lop 12A thang 11".

## Lưu ý an toàn

- **Quét thử trước khi in.** Kiểm tra tên người nhận hiện trên ứng dụng ngân hàng đúng là tên bạn.
- **Kiểm tra mã dán ở quầy định kỳ.** Đã có trường hợp kẻ gian dán đè mã QR khác lên mã của cửa hàng. Nên để mã trong khung có nắp hoặc sau quầy.
- **Nhắc người chuyển xem tên người nhận** trước khi xác nhận. Số tài khoản trong mã là cố định, nhưng người quét vẫn nên đối chiếu tên.
- **Mã QR chỉ dùng để nhận tiền.** Không ai có thể rút tiền từ tài khoản của bạn chỉ bằng mã này. Ngược lại, không bao giờ cung cấp mã OTP hay mật khẩu cho người nói rằng cần chúng để "chuyển tiền qua mã QR".

## Mã được tạo ở đâu?

Mã được tính ngay trong trình duyệt theo chuẩn VietQR; số tài khoản không gửi qua máy chủ nào. Khi bạn dùng tính năng gửi đường link, thông tin nằm trên chính đường link đó, nên chỉ gửi cho người cần chuyển tiền.

## Công cụ liên quan

- Chia hoá đơn ăn uống, du lịch rồi thu tiền từng người: [Chia tiền nhóm](tool:split-bill).
- Tạo mã QR cho đường link, WiFi, danh thiếp: [Tạo mã QR](tool:qr-generator).

## Câu hỏi thường gặp

**Mã QR có hết hạn không?** Không. Mã chỉ là thông tin tài khoản được mã hoá thành hình, dùng được cho tới khi bạn đóng tài khoản.

**In mã cỡ nào thì dễ quét?** Mỗi cạnh từ 3 cm trở lên khi quét ở khoảng cách gần; mã dán ở quầy nên in từ 8 cm để khách đứng xa vẫn quét được. Giữ viền trắng quanh mã.
