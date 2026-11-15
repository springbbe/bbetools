---
title: Cách chuyển ảnh WebP, PNG sang JPG (và ngược lại)
desc: Cách đổi ảnh WebP, PNG, AVIF sang JPG khi phần mềm không mở được, và chuyển ngược lại; nên dùng định dạng nào cho ảnh chụp, logo, ảnh web.
tools: [convert-image, heic-to-jpg, compress-image, svg-to-png]
updated: 2026-11-15
---

Tải ảnh từ web về thường được file đuôi .webp, và không ít phần mềm cũ, biểu mẫu nộp hồ sơ hay máy in ảnh không nhận định dạng này. Mở [Đổi định dạng ảnh](tool:convert-image), chọn ảnh, chọn JPG rồi bấm "Chuyển đổi". Đổi được nhiều ảnh một lần, và ảnh không rời khỏi máy bạn.

## Các bước chuyển đổi

1. Chọn, kéo thả hoặc dán một hay nhiều ảnh (JPG, PNG, WebP, AVIF, GIF, BMP, HEIC).
2. Chọn định dạng muốn chuyển sang: JPG, PNG, WebP hoặc AVIF.
3. Chọn chất lượng. Với JPG, chọn màu nền cho vùng trong suốt.
4. Bấm "Chuyển đổi" rồi tải từng ảnh hoặc cả file .zip.

## Định dạng nào dùng vào việc gì?

| Định dạng | Ưu điểm | Hạn chế | Nên dùng cho |
|---|---|---|---|
| JPG | Mở được ở mọi nơi, nhẹ | Không có nền trong suốt; nén có mất chi tiết | Ảnh chụp, nộp hồ sơ, in ảnh |
| PNG | Giữ nguyên từng điểm ảnh, có nền trong suốt | Ảnh chụp lưu PNG rất nặng | Logo, ảnh chụp màn hình, hình có chữ |
| WebP | Nhẹ hơn JPG khoảng 25–35%, có nền trong suốt | Một số phần mềm cũ không mở được | Ảnh trên website |
| AVIF | Nhẹ nhất | Mã hoá chậm, phần mềm cũ chưa hỗ trợ | Website cần tối ưu tốc độ |

## PNG nền trong suốt sang JPG

JPG không có nền trong suốt. Khi chuyển, vùng trong suốt được tô bằng màu nền bạn chọn, mặc định là trắng. Nếu logo màu trắng, hãy chọn nền tối để không bị "biến mất".

Muốn giữ nền trong suốt, chọn PNG, WebP hoặc AVIF.

## Chuyển JPG sang PNG có nét hơn không?

Không. Chi tiết đã mất khi lưu JPG không lấy lại được; đổi sang PNG chỉ làm file nặng hơn. Chỉ nên chuyển JPG sang PNG khi nơi nhận bắt buộc PNG, hoặc bạn sắp chỉnh sửa và lưu lại nhiều lần và muốn tránh mất thêm chất lượng.

Tương tự, chuyển qua lại nhiều lần giữa các định dạng nén (JPG, WebP, AVIF) mỗi lần lại mất thêm một ít. Hãy giữ bản gốc và luôn chuyển từ bản gốc.

## Chọn chất lượng bao nhiêu?

- **85–92:** gần như không phân biệt được với bản gốc, dùng khi in hoặc lưu trữ.
- **70–80:** cân bằng giữa dung lượng và độ nét, hợp cho web và gửi qua mạng.
- **Dưới 60:** thấy rõ vệt nhoè quanh chữ và cạnh sắc.

Cần ảnh vừa một giới hạn dung lượng cụ thể, dùng [Nén ảnh](tool:compress-image) với tuỳ chọn "Nén xuống dưới" thay vì thử từng mức.

## Trường hợp riêng

- **Ảnh HEIC từ iPhone:** công cụ nhận HEIC; ngoài ra có trang riêng [HEIC sang JPG](tool:heic-to-jpg).
- **Ảnh GIF động:** chỉ khung hình đầu tiên được lấy, chuyển động không giữ được.
- **File SVG (ảnh vectơ):** dùng [SVG sang PNG](tool:svg-to-png) để chọn kích thước xuất.

## Vì sao web hay dùng WebP?

WebP nhẹ hơn JPG ở cùng độ nét nên trang tải nhanh hơn, tốn ít dữ liệu di động hơn. Mọi trình duyệt hiện nay đều hiển thị được. Vấn đề chỉ xuất hiện khi bạn lưu ảnh về và mở bằng phần mềm ngoài trình duyệt.

## Câu hỏi thường gặp

**Đổi đuôi file từ .webp thành .jpg có được không?** Không. Đổi tên không đổi dữ liệu bên trong; nhiều phần mềm sẽ báo file lỗi. Cần chuyển đổi thật sự.

**Chuyển đổi có giữ thông tin ngày chụp, vị trí không?** Ảnh được vẽ lại nên thông tin EXIF không còn trong file mới.

**Ảnh chuyển xong có đổi kích thước không?** Không, số điểm ảnh giữ nguyên; chỉ định dạng và dung lượng thay đổi.
