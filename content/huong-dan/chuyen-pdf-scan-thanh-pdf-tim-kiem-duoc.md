---
title: Chuyển PDF scan thành PDF tìm kiếm và sao chép được chữ
desc: File PDF scan không tìm kiếm, không bôi đen được chữ? Cách nhận dạng chữ tiếng Việt (OCR) trên trình duyệt để có PDF tìm kiếm được, kèm mẹo đọc chính xác.
tools: [ocr-pdf, ocr, scan-document]
updated: 2026-11-13
---

File PDF tạo từ máy scan hoặc ảnh chụp chỉ chứa hình, nên không tìm kiếm hay sao chép chữ được. [PDF scan thành PDF tìm kiếm được](tool:ocr-pdf) nhận dạng chữ (OCR) rồi chèn một lớp chữ ẩn đúng vị trí từng từ; hình trang giữ nguyên, nhưng bạn tìm bằng Ctrl/⌘ + F và bôi đen, sao chép được.

## Làm sao biết file của mình là PDF scan?

Mở file và thử bôi đen một dòng chữ:

- Bôi đen được từng chữ: file đã có lớp chữ, không cần OCR.
- Chỉ chọn được cả trang như một bức ảnh, hoặc không chọn được gì: đó là PDF scan.

## Các bước thực hiện

1. Chọn, kéo thả hoặc dán file PDF scan.
2. Chọn ngôn ngữ trong tài liệu: tiếng Việt hoặc tiếng Anh.
3. Bấm "Nhận dạng và tạo PDF" và chờ từng trang được đọc. Có thể huỷ bất cứ lúc nào.
4. Tải PDF mới về, kèm một file .txt chứa toàn bộ chữ đã nhận dạng.

Mỗi trang mất vài giây tuỳ máy. Với file nhiều trang, hãy để tab mở cho tới khi xong. Trang nào đã có chữ sẵn được bỏ qua để không bị chữ chồng chữ.

## File kết quả khác gì bản gốc?

Hình trang giữ nguyên từng điểm ảnh: con dấu, chữ ký, bố cục không đổi. Công cụ chỉ thêm lớp chữ ẩn nằm bên dưới. Nếu OCR đọc sai một từ, hình trang vẫn đúng; chỉ việc tìm kiếm và sao chép từ đó bị ảnh hưởng.

## Để nhận dạng chính xác hơn

Chất lượng bản scan quyết định phần lớn kết quả:

- **Độ phân giải:** scan ở khoảng 300 dpi. Ảnh chụp điện thoại nên chụp gần, đủ sáng, chữ rõ nét.
- **Thẳng hàng:** trang nghiêng làm sai nhiều. Với ảnh chụp, dùng [Scan tài liệu bằng camera](tool:scan-document) để nắn thẳng và làm trắng nền trước.
- **Chọn đúng ngôn ngữ:** tài liệu tiếng Việt phải chọn tiếng Việt thì dấu mới được đọc đúng.
- **Chữ in dễ hơn chữ viết tay:** chữ viết tay, chữ quá nhỏ, bản photo nhiều lần thường bị đọc sai.

Dấu tiếng Việt là phần dễ sai nhất (hỏi thành ngã, mất dấu nặng). Khi sao chép nội dung quan trọng như số tiền, số hợp đồng, họ tên, hãy đối chiếu lại với hình trang.

## Chỉ cần lấy chữ ra, không cần PDF?

Dùng [Ảnh sang chữ (OCR)](tool:ocr): chọn ảnh chụp hoặc PDF scan, bấm "Nhận dạng chữ" rồi sao chép kết quả hoặc tải file .txt. Cách này hợp khi bạn muốn gõ lại một trang tài liệu vào Word.

## Dùng vào việc gì?

- Tìm một điều khoản trong hợp đồng scan dài hàng chục trang.
- Lưu trữ công văn, hoá đơn giấy sao cho sau này tìm lại được theo nội dung.
- Trích một đoạn văn bản giấy để đưa vào báo cáo.
- Giúp phần mềm đọc màn hình đọc được tài liệu cho người khiếm thị.

## Quyền riêng tư

Việc dựng trang, nhận dạng chữ và ghi file đều chạy trong trình duyệt bằng bộ nhận dạng Tesseract; file không rời khỏi máy. Lần đầu dùng, trình duyệt tải bộ nhận dạng khoảng 5 MB.

## Câu hỏi thường gặp

**Tài liệu có cả tiếng Việt lẫn tiếng Anh thì chọn gì?** Chọn ngôn ngữ chiếm phần lớn nội dung. Từ tiếng Anh xen trong văn bản tiếng Việt thường vẫn được đọc đúng vì dùng chung bảng chữ cái.

**Bảng biểu có giữ được cấu trúc khi sao chép không?** Chữ trong bảng được nhận dạng, nhưng khi dán ra ngoài, hàng và cột có thể không còn thẳng. Cần đưa bảng vào Excel thì nên kiểm tra và chỉnh lại bằng tay.

**File sau OCR có nặng hơn không?** Chỉ tăng nhẹ, vì lớp chữ ẩn rất nhỏ so với hình trang.
