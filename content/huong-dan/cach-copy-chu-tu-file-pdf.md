---
title: Cách copy chữ từ file PDF không bị ngắt dòng, lỗi font
desc: Cách lấy toàn bộ chữ trong PDF để dán vào Word mà không bị ngắt dòng giữa câu, không lỗi font; cách xử lý PDF scan và PDF bị chặn sao chép.
tools: [pdf-to-text, ocr, ocr-pdf, unlock-pdf]
updated: 2026-11-15
---

Bôi đen chữ trong PDF rồi dán sang Word thường cho ra một đoạn văn gãy vụn: mỗi dòng một lần xuống hàng, có khi lẫn cả số trang. Mở [PDF sang văn bản](tool:pdf-to-text), chọn file, bật nối các dòng bị ngắt giữa câu rồi bấm "Lấy văn bản". Chữ hiện ra ngay để sao chép hoặc tải về file .txt, và file PDF không rời khỏi máy bạn.

## Các bước lấy chữ từ PDF

1. Chọn hoặc kéo thả một hay nhiều file PDF.
2. Chọn có ghi số trang hay không.
3. Chọn có nối các dòng bị ngắt giữa câu hay không.
4. Bấm "Lấy văn bản", xem kết quả, sao chép toàn bộ hoặc tải file .txt.

## Vì sao dán từ PDF bị ngắt dòng?

PDF lưu chữ theo vị trí trên trang, từng dòng một, chứ không lưu "đoạn văn". Khi sao chép, mỗi dòng trên trang thành một dòng riêng dù câu chưa hết.

| Loại nội dung | "Nối dòng bị ngắt giữa câu" |
|---|---|
| Văn xuôi, báo cáo, hợp đồng | Bật: các dòng được nối lại thành đoạn hoàn chỉnh |
| Thơ, lời bài hát | Tắt: giữ đúng chỗ xuống dòng |
| Danh sách, địa chỉ, mục lục | Tắt |

## Không lấy được chữ nào?

Nếu kết quả trống, file của bạn là **PDF scan**: mỗi trang là một tấm ảnh chụp hoặc quét từ giấy, không có lớp chữ. Thử nhanh: mở file, kéo chuột bôi đen. Không bôi được từng chữ thì đó là bản scan.

Khi đó cần nhận dạng chữ (OCR):

- Muốn lấy chữ ra để sửa: dùng [Ảnh sang chữ (OCR)](tool:ocr), hỗ trợ tiếng Việt có dấu.
- Muốn giữ file PDF nhưng tìm kiếm, bôi đen được: dùng [PDF scan thành PDF tìm kiếm được](tool:ocr-pdf).

OCR có thể nhận sai vài ký tự, nhất là với bản chụp mờ; hãy đọc soát lại số liệu và tên riêng.

## PDF bị chặn sao chép

Một số file mở xem bình thường nhưng không cho bôi đen hoặc sao chép. Đó là giới hạn quyền, không phải mã hoá nội dung. Với tài liệu của bạn hoặc tài liệu bạn được phép dùng, gỡ giới hạn bằng [Mở khoá PDF](tool:unlock-pdf) rồi lấy chữ như bình thường.

## Chữ ra bị lỗi font, ký tự lạ

- **Mở file .txt bằng Notepad thấy sai dấu:** file tải về được lưu dạng UTF-8 có đánh dấu BOM nên Notepad và Word đều nhận đúng tiếng Việt. Nếu vẫn sai, hãy mở lại bằng đúng file vừa tải, không phải bản sao chép qua phần mềm khác.
- **Chữ ra toàn ký tự vô nghĩa dù trên trang hiển thị đúng:** file gốc dùng font nhúng không có bảng ánh xạ ký tự, hay gặp ở PDF tạo từ phần mềm cũ. Trường hợp này phải chạy OCR như với bản scan.

## Bảng biểu thì sao?

Công cụ chỉ lấy chữ thuần. Bảng được chuyển thành các dòng chữ, không còn cột. Nếu cần đưa số liệu vào Excel, hãy dán vào một cột rồi dùng chức năng tách cột theo khoảng trắng, hoặc nhập lại với bảng nhỏ.

## Câu hỏi thường gặp

**Lấy chữ của nhiều file một lúc được không?** Được. Chọn nhiều file, mỗi file cho một phần văn bản riêng.

**Có giữ được in đậm, cỡ chữ, màu không?** Không. Kết quả là chữ thuần, phù hợp để dán vào nơi khác rồi định dạng lại.

**Ghi số trang để làm gì?** Để biết đoạn nào nằm ở trang nào khi cần trích dẫn hoặc đối chiếu với bản gốc.
