---
title: Cách so sánh hai file Word, PDF để tìm chỗ khác nhau
desc: Cách so sánh hai bản hợp đồng, hai file Word, PDF, Excel hoặc hai đoạn văn bản để tìm chỗ bị sửa, thêm, bớt; đọc kết quả tô màu và tỉ lệ giống nhau.
tools: [text-diff, pdf-to-text, ocr]
updated: 2026-11-15
---

Đối tác gửi lại hợp đồng "chỉ sửa vài chỗ", bạn cần biết chính xác là chỗ nào. Mở [So sánh văn bản](tool:text-diff), thả bản cũ vào ô trái, bản mới vào ô phải: phần thêm được tô xanh, phần bớt tô đỏ, kèm tỉ lệ giống nhau. Công cụ đọc trực tiếp TXT, PDF, Word .docx và Excel, và cả hai file đều không rời khỏi máy bạn.

## Các bước so sánh

1. Dán bản gốc vào ô bên trái, bản mới vào ô bên phải. Hoặc kéo thả file vào từng ô; thả hai file một lúc thì mỗi ô nhận một file.
2. Chọn so theo dòng, theo từ hoặc theo ký tự.
3. Chọn xem song song hai cột hay gộp một cột.
4. Bật bỏ qua hoa/thường, bỏ qua khoảng trắng nếu cần.
5. Bấm mũi tên lên/xuống (hoặc Alt + ↑/↓) để nhảy giữa các chỗ khác nhau.

Những đoạn giống nhau kéo dài được gấp gọn, nên với văn bản vài chục trang bạn chỉ phải đọc phần có thay đổi.

## So theo dòng, từ hay ký tự?

| Kiểu so | Hợp với | Ghi chú |
|---|---|---|
| Theo dòng | Hợp đồng, điều khoản, mã nguồn, danh sách | Trong dòng bị sửa, từ thay đổi vẫn được tô riêng |
| Theo từ | Đoạn văn liền mạch, bài viết | Không bị ảnh hưởng bởi chỗ xuống dòng khác nhau |
| Theo ký tự | Dãy số, mã, tên file | Thấy cả một ký tự bị đổi |

## Kiểm tra hợp đồng bị sửa

Với hợp đồng, hãy xem kỹ những chỗ một thay đổi nhỏ có hậu quả lớn:

- **Con số:** giá trị, lãi suất, mức phạt, số ngày. Một chữ số 0 thêm vào rất khó thấy bằng mắt.
- **Ngày tháng:** hạn thanh toán, ngày hiệu lực, thời hạn hợp đồng.
- **Từ phủ định và điều kiện:** "không", "trừ khi", "có thể" thay cho "phải".
- **Chủ thể:** "Bên A" đổi thành "Bên B" trong một nghĩa vụ.
- **Điều khoản bị xoá hẳn**, hiện thành cả đoạn tô đỏ.

So sánh tự động chỉ ra chỗ khác; việc đánh giá thay đổi đó có chấp nhận được không vẫn là của bạn hoặc người tư vấn pháp lý.

## Tránh báo khác "giả"

Hai bản chép từ nguồn khác nhau thường lệch nhau về trình bày chứ không phải nội dung. Bật các tuỳ chọn sau để lọc bớt:

- **Bỏ qua khoảng trắng:** không báo khác vì thừa dấu cách hay xuống dòng khác nhau.
- **Bỏ qua hoa/thường:** không báo khác vì "Điều 5" và "ĐIỀU 5".

Khi so một bản Word với một bản PDF của cùng tài liệu, nên so theo từ, vì PDF ngắt dòng theo trang.

## File nào so sánh được?

| Loại file | Ghi chú |
|---|---|
| Văn bản thuần (TXT, Markdown, CSV, JSON, mã nguồn) | Tự nhận bảng mã UTF-8, UTF-16, Windows-1258 |
| PDF có lớp chữ | PDF scan chỉ có ảnh cần chạy OCR trước |
| Word .docx | File .doc cũ cần mở bằng Word rồi lưu lại dạng .docx |
| Excel (.xlsx, .xls, .ods) | Mỗi ô cách nhau bằng tab |

Với PDF scan, lấy chữ bằng [Ảnh sang chữ (OCR)](tool:ocr) rồi dán vào để so. Vì OCR có thể nhận sai vài ký tự, kết quả sẽ có một số chỗ khác không thật; hãy đối chiếu lại với bản gốc ở những chỗ quan trọng.

## Tỉ lệ giống nhau nghĩa là gì?

Tỉ lệ bằng 2 × số ký tự trùng khớp chia cho tổng số ký tự của hai bản, không tính khoảng trắng. 100% là hai bản giống hệt. 98% ở một hợp đồng 20 trang vẫn có thể là vài chục chỗ sửa, nên đừng chỉ nhìn con số; hãy xem từng chỗ được tô màu.

## Lưu lại kết quả

Sao chép hoặc tải bản so sánh dạng .html để lưu hồ sơ, gửi cho đồng nghiệp, hoặc mở ra rồi in thành PDF. Bản này giữ nguyên màu tô.

## Câu hỏi thường gặp

**So sánh có giữ định dạng in đậm, màu chữ không?** Không. Công cụ so nội dung chữ; thay đổi chỉ về định dạng không được báo.

**So hai bảng Excel được không?** Được ở mức nội dung ô. Dòng bị chèn thêm ở giữa sẽ hiện là một dòng thêm, các dòng sau vẫn khớp.

**Chỉ cần lấy chữ từ PDF để tự xem?** Dùng [PDF sang văn bản](tool:pdf-to-text).
