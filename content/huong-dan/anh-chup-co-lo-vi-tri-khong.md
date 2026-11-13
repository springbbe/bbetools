---
title: Ảnh chụp điện thoại có lộ vị trí không? Cách xoá EXIF, GPS
desc: Ảnh chụp điện thoại có thể lưu toạ độ GPS, ngày giờ và tên máy trong dữ liệu EXIF. Cách kiểm tra, xoá vị trí trước khi gửi ảnh và tắt lưu vị trí.
tools: [strip-exif, blur-image, compress-image]
updated: 2026-11-13
---

Có thể. Nếu camera được phép dùng định vị, mỗi ảnh lưu kèm toạ độ GPS nơi chụp, chính xác tới vài mét, cùng ngày giờ và tên máy. Trước khi gửi ảnh gốc cho người lạ, kiểm tra và xoá các thông tin này bằng [Xoá thông tin EXIF/GPS](tool:strip-exif).

## EXIF là gì?

EXIF là phần thông tin đi kèm trong file ảnh, không hiện trên hình nhưng phần mềm nào cũng đọc được. Thường gồm:

| Thông tin | Rủi ro khi lộ |
|---|---|
| Toạ độ GPS nơi chụp | Lộ địa chỉ nhà, nơi làm việc, trường học của con |
| Ngày giờ chụp | Lộ thói quen sinh hoạt, thời điểm vắng nhà |
| Hãng và đời máy | Ít rủi ro, nhưng cho biết bạn dùng thiết bị gì |
| Thông số chụp, hướng xoay ảnh | Không đáng kể |

## Khi nào thông tin vị trí bị gửi đi?

Điều này tuỳ cách bạn chia sẻ:

- **Thường còn nguyên:** gửi file gốc qua email, gửi ảnh dạng file trong ứng dụng nhắn tin, chia sẻ qua dịch vụ lưu trữ đám mây, chép qua USB.
- **Thường đã bị bỏ:** đăng ảnh lên phần lớn mạng xã hội, vì ảnh được xử lý lại trước khi hiển thị.

Vì cách xử lý của mỗi ứng dụng có thể thay đổi, cách chắc chắn nhất là tự xoá trước khi gửi.

## Kiểm tra và xoá

1. Mở [Xoá thông tin EXIF/GPS](tool:strip-exif), chọn một hay nhiều ảnh.
2. Xem ảnh nào có vị trí GPS; bấm biểu tượng trên từng ảnh để xem máy chụp, ngày giờ, toạ độ.
3. Chọn "Xoá tất cả" hoặc "Chỉ xoá vị trí".
4. Bấm "Xoá thông tin" rồi tải ảnh đã làm sạch.

Với ảnh JPG, PNG, WebP, công cụ chỉ bỏ phần thông tin trong file, không nén lại ảnh nên chất lượng giữ nguyên. Ảnh HEIC được lưu lại thành JPG chất lượng cao. Để bật "Giữ hướng xoay" thì ảnh dọc không bị nằm ngang sau khi xoá.

## Những trường hợp nên xoá vị trí

- Đăng tin bán đồ cũ, cho thuê nhà kèm ảnh chụp tại nhà.
- Gửi ảnh con cái cho nhóm đông người.
- Gửi ảnh cho người mới quen trên mạng.
- Nhà báo, người làm công tác xã hội gửi ảnh nguồn tin.

## Tắt lưu vị trí ngay từ camera

Nếu không cần biết ảnh chụp ở đâu, tắt hẳn để khỏi phải xoá:

- **iPhone:** Cài đặt → Quyền riêng tư & Bảo mật → Dịch vụ định vị → Camera → Không.
- **Android:** mở ứng dụng Camera → Cài đặt → tắt mục gắn thẻ vị trí. Tên mục khác nhau tuỳ hãng máy.

Đổi lại, ứng dụng ảnh sẽ không sắp xếp được ảnh theo địa điểm.

## Vị trí còn lộ qua nội dung ảnh

Xoá EXIF không che được những gì nhìn thấy trên hình. Biển số nhà, biển tên đường, bảng hiệu cửa hàng, đồng phục trường cũng cho biết nơi chụp. Che những chi tiết đó bằng [Che, làm mờ vùng nhạy cảm](tool:blur-image) trước khi đăng.

## Cách khác: nén ảnh

Ảnh qua [Nén ảnh](tool:compress-image) cũng không còn EXIF và GPS. Nếu bạn vốn định giảm dung lượng trước khi gửi, một bước đó là đủ.

## Câu hỏi thường gặp

**Ảnh chụp màn hình có GPS không?** Không. Ảnh chụp màn hình không lưu toạ độ, nhưng nội dung trên màn hình (bản đồ, địa chỉ) vẫn có thể lộ vị trí.

**Xoá EXIF rồi có khôi phục được không?** Không. Thông tin đã xoá khỏi file mới là mất hẳn; ảnh gốc trong máy bạn vẫn còn nguyên.

**Ảnh có bị tải lên máy chủ khi kiểm tra không?** Không. Việc đọc và xoá thông tin chạy ngay trong trình duyệt.
