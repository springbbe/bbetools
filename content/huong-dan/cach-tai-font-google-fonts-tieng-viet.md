---
title: Cách tải và cài font Google Fonts có tiếng Việt
desc: Cách tìm font Google Fonts hỗ trợ đủ dấu tiếng Việt, tải file TTF cài vào Windows, macOS, hoặc tải WOFF2 kèm CSS để tự host trên website.
tools: [google-fonts, text-on-image, fancy-text]
updated: 2026-11-15
---

Không phải font đẹp nào cũng gõ được tiếng Việt: thiếu dấu là chữ "ở", "ữ" hiện thành ô vuông hoặc nhảy sang font khác. Mở [Tải font Google Fonts](tool:google-fonts): danh sách mặc định chỉ gồm font có đủ dấu tiếng Việt, xem trước bằng chính câu chữ của bạn rồi tải về để cài vào máy hoặc dùng cho website.

## Các bước tìm và tải font

1. Gõ tên font vào ô tìm kiếm, hoặc lọc theo kiểu: không chân, có chân, viết tay…
2. Bấm một font, đánh dấu các độ đậm và kiểu nghiêng cần dùng.
3. Sửa ô "Chữ xem trước" để thử với câu của bạn; nên thử một câu có nhiều dấu như "Những đường cong ở Huế".
4. Chọn "Cài vào máy tính" để tải file TTF, hoặc "Cho website" để tải WOFF2 kèm file CSS.

## Cài font vào máy tính

| Hệ điều hành | Cách cài |
|---|---|
| Windows | Giải nén, bấm chuột phải vào file .ttf, chọn Install (hoặc Install for all users) |
| macOS | Giải nén, bấm đúp file .ttf, bấm Install trong Font Book |
| Linux | Chép file vào thư mục ~/.local/share/fonts rồi chạy fc-cache |

Sau khi cài, **đóng và mở lại** Word, PowerPoint, Photoshop để font xuất hiện trong danh sách.

## Tải về chỉ có một hai file?

Nhiều font Google là **font biến thiên** (variable): một file chứa mọi độ đậm từ mảnh tới đậm, thêm một file cho kiểu nghiêng. Sau khi cài, bạn vẫn chọn độ đậm trong phần mềm như bình thường.

## Dùng cho website: tự host

Chọn "Cho website" để nhận các file WOFF2 và một file CSS có sẵn khai báo @font-face.

1. Chép thư mục font vào website của bạn.
2. Dán đoạn CSS vào file CSS của trang; sửa đường dẫn nếu đặt font ở thư mục khác.
3. Dùng font qua thuộc tính font-family như trong đoạn mẫu.

So với nhúng link từ Google:

| | Nhúng link Google Fonts | Tự host |
|---|---|---|
| Cài đặt | Dán một dòng | Chép file và CSS |
| Phụ thuộc máy chủ Google | Có | Không |
| Địa chỉ IP người xem gửi tới Google | Có | Không |
| Tốc độ | Phải kết nối thêm tên miền khác | Tải cùng tên miền với trang |

## Vì sao bản web có nhiều file nhỏ?

Mỗi độ đậm được chia theo bộ ký tự: tiếng Việt, Latin, Latin mở rộng… Đoạn CSS dùng unicode-range nên trình duyệt chỉ tải bộ nào trang thật sự dùng. Website tiếng Việt cần cả hai bộ "Tiếng Việt" và "Latin".

Để trang nhẹ, chỉ chọn những độ đậm bạn dùng. Phần lớn website chỉ cần 400 (thường) và 700 (đậm), thêm 500 hoặc 600 cho tiêu đề nếu muốn.

## Gợi ý font có tiếng Việt

| Kiểu | Font | Hợp với |
|---|---|---|
| Không chân | Be Vietnam Pro, Inter, Roboto, Nunito | Giao diện, văn bản dài trên màn hình |
| Có chân | Merriweather, Lora, Playfair Display, Roboto Slab | Bài báo, sách, tiêu đề trang trọng |
| Viết tay | Dancing Script, Pacifico, Great Vibes | Thiệp mời, tiêu đề ngắn |
| Đơn cách | JetBrains Mono, Roboto Mono | Mã nguồn, bảng số |

Be Vietnam Pro được thiết kế riêng cho tiếng Việt nên dấu đặt cân đối, rõ ở cỡ nhỏ.

## Kiểm tra dấu trước khi dùng

Font ghi "có tiếng Việt" vẫn có thể xử lý dấu chưa đẹp. Thử với các chữ khó:

- Chữ có hai dấu chồng: ầ, ễ, ộ, ử, ẳ.
- Chữ hoa có dấu: Ấ, Ễ, Ự; dấu dễ đụng dòng trên.
- Chữ ư, ơ: móc có bị dính vào chữ bên cạnh không.

Với font viết tay, nên dùng cho tiêu đề ngắn và tăng khoảng cách dòng để dấu không chạm nhau.

## Giấy phép

Font trên Google Fonts dùng giấy phép mở, phần lớn là SIL Open Font License, một số là Apache. Bạn được dùng miễn phí cho website, in ấn, logo, sản phẩm bán ra. Điều không được làm là bán lại chính file font. File giấy phép được tải kèm trong .zip.

## Câu hỏi thường gặp

**Không tìm thấy font mình cần?** Công cụ chỉ có font trên Google Fonts. Tắt "Chỉ font có tiếng Việt" để thấy toàn bộ gần 2.000 font, trong đó khoảng 500 font có tiếng Việt.

**Gửi file Word cho người khác, font có đi theo không?** Không, trừ khi bật nhúng font khi lưu. An toàn nhất là xuất PDF.

**Muốn thử chữ kiểu mà không cài font?** [Chữ kiểu nghệ thuật](tool:fancy-text) tạo chữ kiểu dán được vào mạng xã hội; [Chèn chữ lên ảnh](tool:text-on-image) có sẵn vài font tiếng Việt để viết lên ảnh.
