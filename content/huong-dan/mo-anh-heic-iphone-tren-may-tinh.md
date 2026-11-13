---
title: Mở ảnh HEIC của iPhone trên máy tính và chuyển sang JPG
desc: Ảnh HEIC của iPhone không mở được trên Windows hay trang nộp hồ sơ? Cách chuyển HEIC sang JPG hàng loạt trên trình duyệt và để iPhone chụp thẳng ra JPG.
tools: [heic-to-jpg, image-to-pdf, compress-image, strip-exif]
updated: 2026-11-13
---

Ảnh có đuôi .heic là ảnh iPhone lưu theo định dạng HEIF. Để mở trên máy tính hoặc tải lên trang không nhận định dạng này, đưa ảnh vào [HEIC sang JPG](tool:heic-to-jpg), bấm "Chuyển đổi" rồi tải ảnh JPG về. Chuyển được nhiều ảnh cùng lúc và ảnh không rời khỏi máy.

## HEIC là gì và vì sao hay gặp lỗi?

HEIC (HEIF) là định dạng ảnh mặc định của iPhone. Ảnh nhẹ hơn JPG ở cùng chất lượng, nhưng nhiều nơi chưa đọc được:

- Máy Windows chưa cài phần mở rộng HEIF sẽ không xem được ảnh.
- Nhiều trang nộp hồ sơ, trang tuyển dụng chỉ nhận JPG hoặc PNG.
- Một số phần mềm văn phòng và ứng dụng web không chèn được ảnh HEIC.

## Chuyển HEIC sang JPG

1. Mở [HEIC sang JPG](tool:heic-to-jpg), chọn hoặc kéo thả các ảnh .heic / .heif.
2. Chọn định dạng JPG (ảnh chụp thông thường) hoặc PNG (khi cần giữ nguyên từng điểm ảnh), rồi chọn chất lượng.
3. Bấm "Chuyển đổi", tải từng ảnh hoặc cả file .zip.

Công cụ chạy trong trình duyệt nên dùng được cả trên điện thoại: bạn có thể chuyển ảnh trước khi gửi mà không cần máy tính.

## Nên chọn JPG hay PNG?

| Nhu cầu | Nên chọn |
|---|---|
| Ảnh chụp người, phong cảnh, gửi qua mạng | JPG |
| Nộp hồ sơ có giới hạn dung lượng | JPG |
| Ảnh chụp màn hình, ảnh có chữ nhỏ cần thật nét | PNG |

Ảnh PNG chuyển từ ảnh chụp thường nặng gấp nhiều lần JPG mà mắt thường khó thấy khác biệt.

## Để iPhone chụp thẳng ra JPG

Nếu thường xuyên phải gửi ảnh cho máy khác, đổi cài đặt một lần:

1. Mở **Cài đặt** → **Camera** → **Định dạng**.
2. Chọn **Tương thích nhất**.

Từ đó ảnh mới chụp sẽ là JPG. Ảnh đã chụp trước đó vẫn là HEIC và cần chuyển đổi.

Ngoài ra, trong **Cài đặt** → **Ảnh**, mục "Truyền tới máy Mac hoặc PC" đặt là **Tự động** thì iPhone tự chuyển sang định dạng tương thích khi chép ảnh qua cáp.

## Các việc hay làm tiếp theo

- **Ghép ảnh giấy tờ thành một file PDF:** [Ảnh sang PDF](tool:image-to-pdf) đọc thẳng ảnh HEIC, không cần chuyển sang JPG trước.
- **Giảm dung lượng để nộp trực tuyến:** [Nén ảnh](tool:compress-image), bật "Nén xuống dưới" và nhập số KB cần đạt.
- **Xoá vị trí chụp trước khi đăng ảnh:** ảnh iPhone thường lưu toạ độ GPS; xem và xoá bằng [Xoá thông tin EXIF/GPS](tool:strip-exif).

## Câu hỏi thường gặp

**Ảnh Live Photo thì sao?** Công cụ lấy ảnh chính trong file HEIC. Phần video của Live Photo nằm ở file riêng nên không bị ảnh hưởng.

**Chuyển sang JPG có giảm chất lượng không?** Có, nhưng rất ít ở mức chất lượng cao; khi xem trên màn hình hoặc in cỡ thông thường gần như không nhận ra.
