---
title: Cách che số CCCD, số tài khoản trong PDF cho đúng
desc: Vì sao tô đen bằng hình chữ nhật trong PDF vẫn lộ chữ bên dưới, và cách che số CCCD, số tài khoản, email để thông tin bị xoá hẳn trước khi gửi.
tools: [redact-pdf, metadata-pdf, flatten-pdf, blur-image]
updated: 2026-11-15
---

Vẽ một hình chữ nhật đen đè lên số căn cước trong PDF chưa phải là che: chữ vẫn nằm trong file, bôi đen rồi sao chép là ra. Để xoá hẳn, dùng [Che thông tin trong PDF](tool:redact-pdf): kéo khung lên chỗ cần che rồi bấm "Che và tải về". File được xử lý trên máy bạn, không tải lên máy chủ nào.

## Vì sao tô đen thông thường không an toàn?

Trang PDF gồm nhiều lớp: chữ, ảnh, hình vẽ, ghi chú. Khi bạn thêm hình chữ nhật đen bằng công cụ vẽ hoặc tô sáng màu đen, bạn chỉ thêm một lớp nằm trên. Lớp chữ bên dưới còn nguyên, nên người nhận có thể:

- Bôi đen vùng đó rồi sao chép, dán ra chỗ khác.
- Tìm kiếm trong file và thấy kết quả nằm dưới ô đen.
- Xoá hình chữ nhật bằng một phần mềm sửa PDF.

Đã có nhiều vụ lộ thông tin từ tài liệu công bố theo cách này.

## Các bước che đúng cách

1. Chọn, kéo thả hoặc dán (Ctrl/⌘ + V) file PDF cần che.
2. Kéo khung lên chỗ cần che. Trên điện thoại, bật "Vẽ khung" trước; tắt đi để cuộn trang bình thường.
3. Kiểm tra từng vùng che: kéo để dịch, kéo chấm góc để đổi cỡ, bấm × để bỏ.
4. Bấm "Che và tải về".

Trang có vùng che được vẽ lại thành ảnh rồi tô kín, nên chữ và ảnh bên dưới bị xoá hẳn. Sau khi tạo file, công cụ tự mở lại để kiểm tra trang bị che không còn chữ nào. Các trang khác giữ nguyên.

## Che tự động mọi chỗ khớp

Với file nhiều trang, tìm bằng mắt rất dễ sót. Gõ chữ cần che, hoặc bấm nút có sẵn:

| Nút | Che những gì |
|---|---|
| "Dãy 9–12 chữ số" | Số CCCD (12 số), CMND (9 số), số điện thoại, phần lớn số tài khoản |
| "Dãy 13–19 chữ số" | Số thẻ ngân hàng, số tài khoản dài |
| "Email" | Mọi địa chỉ email |

Tìm theo dãy số có thể che nhầm số tiền lớn như 150.000.000. Hãy xem lại danh sách vùng che và bỏ chỗ không cần. File PDF scan không có lớp chữ nên không tìm theo chữ được; hãy kéo khung bằng tay.

## Nên che những gì trước khi gửi?

Tuỳ người nhận cần gì, nhưng thường nên che:

- Số căn cước, số hộ chiếu khi người nhận chỉ cần xác nhận họ tên.
- Số tài khoản, số dư, các giao dịch không liên quan trong sao kê.
- Số điện thoại, địa chỉ nhà, email cá nhân.
- Chữ ký và con dấu khi gửi bản mẫu hợp đồng.
- Mã QR, mã vạch: chúng thường chứa đúng những con số bạn vừa che.

## Thông tin ẩn trong file

Ngoài phần nhìn thấy, PDF còn lưu tên tác giả, phần mềm tạo file, ngày tạo, ngày sửa. Xoá bằng [Sửa thông tin PDF](tool:metadata-pdf), bật "Xoá sạch thông tin ẩn" rồi bấm "Lưu thông tin".

Nếu file là tờ khai có ô điền được, người nhận vẫn sửa được nội dung. Dùng [Làm phẳng form PDF](tool:flatten-pdf) để biến các ô đã điền thành nội dung cố định.

## Kiểm tra lại sau khi che

Mở file kết quả và thử ba việc:

1. Kéo chuột bôi đen qua ô che: không được bôi ra chữ nào.
2. Tìm (Ctrl/⌘ + F) đúng con số đã che: không được có kết quả.
3. Phóng to xem ô che có phủ hết con số, không hở nét trên hoặc nét dưới.

## Giấy tờ là ảnh chụp

Ảnh JPG, PNG chụp căn cước, thẻ ngân hàng thì che bằng [Che, làm mờ vùng nhạy cảm](tool:blur-image). Nên tô kín thay vì làm mờ nhẹ: vùng mờ ít đôi khi vẫn đoán lại được.

## Câu hỏi thường gặp

**Vì sao trang bị che không chọn, tìm chữ được nữa?** Vì cả trang đã thành ảnh; đó là cách chắc chắn để xoá thông tin. Các trang không có vùng che vẫn giữ nguyên chữ.

**Che xong có hoàn tác được không?** Không trên file đã tạo. File gốc trên máy bạn vẫn còn nguyên, hãy giữ lại.

**File có rời khỏi máy không?** Không. Việc che chạy trong trình duyệt.
