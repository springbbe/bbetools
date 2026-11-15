---
title: Cách chuyển ảnh thành văn bản (OCR) tiếng Việt có dấu
desc: Cách lấy chữ từ ảnh chụp, ảnh scan, PDF scan thành văn bản tiếng Việt có dấu để sao chép vào Word, cách chụp để nhận dạng đúng và những chỗ cần đọc lại.
tools: [ocr, pdf-to-text, scan-document, ocr-pdf]
updated: 2026-11-15
---

Thay vì gõ lại một trang tài liệu, hãy chụp ảnh rồi mở [Ảnh sang chữ (OCR)](tool:ocr), chọn ảnh, chọn ngôn ngữ tiếng Việt và bấm "Nhận dạng chữ". Kết quả là văn bản sao chép được, dán thẳng vào Word, email hoặc tin nhắn. Ảnh được xử lý ngay trong trình duyệt.

## Các bước

1. Chọn, kéo thả hoặc dán ảnh chụp, ảnh scan hoặc file PDF scan.
2. Chọn ngôn ngữ (tiếng Việt hoặc tiếng Anh) và cách xuống dòng.
3. Bấm "Nhận dạng chữ".
4. Đọc lại kết quả, sao chép hoặc tải file .txt.

Lần đầu dùng, trình duyệt tải bộ nhận dạng khoảng 5 MB và lưu lại; những lần sau mở ngay.

## Ảnh thế nào thì nhận dạng đúng?

Dấu tiếng Việt rất nhỏ, nên chất lượng ảnh quan trọng hơn với tiếng Anh. So sánh nhanh:

| Ảnh | Kết quả thường gặp |
|---|---|
| Chụp thẳng, đủ sáng, chữ in rõ | Gần như đúng hết, sai lẻ tẻ vài dấu |
| Chụp nghiêng, có bóng tay | Sai dấu, dính chữ ở vùng tối |
| Ảnh mờ, chụp từ xa | Mất dấu, nhầm chữ giống nhau như "l" và "1" |
| Chữ viết tay | Sai nhiều, nên gõ lại |

Mẹo khi chụp:

- Đặt giấy phẳng, chụp thẳng từ trên xuống, chữ chiếm gần hết khung hình.
- Dùng ánh sáng đều, tránh đèn flash phản chiếu trên giấy bóng.
- Ảnh bị nghiêng hoặc nền xám thì nắn thẳng và làm trắng nền bằng [Scan tài liệu bằng camera](tool:scan-document) trước khi nhận dạng.

## Chọn cách xuống dòng

Ảnh chụp trang sách thường ngắt dòng giữa câu. Nếu định dán vào Word thành đoạn văn liền, ở mục "Xuống dòng" hãy chọn "Nối thành đoạn". Với danh sách, địa chỉ, hoá đơn, bảng kê, chọn "Giữ từng dòng" để các mục không bị dính vào nhau.

## PDF thì dùng công cụ nào?

Có hai loại PDF, trông giống nhau nhưng khác hẳn bên trong:

- **PDF có chữ chọn được** (xuất từ Word, Excel): dùng [PDF sang văn bản](tool:pdf-to-text), nhanh và chính xác tuyệt đối vì chữ đã có sẵn trong file.
- **PDF scan** (chụp hoặc quét từ giấy): chỉ chứa ảnh, phải nhận dạng. Chỉ cần lấy chữ thì dùng Ảnh sang chữ; muốn giữ nguyên file nhưng tìm kiếm và bôi đen sao chép được thì dùng [PDF scan thành PDF tìm kiếm được](tool:ocr-pdf).

Cách thử nhanh: mở PDF, kéo chuột bôi đen một dòng. Bôi được chữ là loại thứ nhất.

## Những chỗ cần đọc lại

Dù ảnh đẹp, hãy rà lại các chỗ dễ sai trước khi dùng:

- Dấu hỏi, dấu ngã, dấu nặng dưới chữ có nét dài.
- Con số: 0 và O, 1 và l, 5 và S.
- Số tiền, số tài khoản, số căn cước, ngày tháng.
- Bảng biểu: các cột có thể bị đọc lẫn vào nhau.

Với giấy tờ quan trọng như hợp đồng, hãy đối chiếu từng con số với bản gốc.

## Vì sao nên nhận dạng ngay trên máy?

Giấy tờ cần gõ lại thường là hợp đồng, hoá đơn, căn cước, bệnh án. Ở đây ảnh không rời khỏi máy bạn: bộ nhận dạng được tải về và chạy trong trình duyệt, không có máy chủ nào nhận ảnh.

## Câu hỏi thường gặp

**Có nhận dạng được chữ viết tay không?** Kết quả kém và không ổn định. Công cụ làm tốt nhất với chữ in.

**Ảnh chụp màn hình có dùng được không?** Được, và thường cho kết quả rất tốt vì chữ sắc nét. Có thể dán thẳng ảnh vừa chụp vào trang.

**Có giữ được định dạng in đậm, bảng biểu không?** Không. Kết quả là chữ thuần; bảng biểu thành các dòng chữ.
