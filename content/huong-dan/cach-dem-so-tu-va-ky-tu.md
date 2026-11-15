---
title: Cách đếm số từ, số ký tự trong văn bản tiếng Việt
desc: Cách đếm từ, ký tự, câu, đoạn và thời gian đọc của văn bản; tiếng Việt đếm từ thế nào, và các giới hạn ký tự hay gặp ở tin nhắn SMS, tiêu đề, mô tả SEO.
tools: [word-counter, case-converter, find-replace, dedupe-lines]
updated: 2026-11-15
---

Bài luận yêu cầu 600 từ, mô tả sản phẩm giới hạn 500 ký tự, bài phát biểu chỉ được ba phút. Mở [Đếm từ & ký tự](tool:word-counter), dán văn bản vào ô: số từ, ký tự, câu, đoạn và thời gian đọc hiện ngay khi gõ. Văn bản không được gửi đi đâu.

## Công cụ đếm những gì?

| Chỉ số | Ý nghĩa |
|---|---|
| Từ (tiếng) | Số cụm chữ cách nhau bởi khoảng trắng |
| Ký tự | Số chữ cái, chữ số, dấu câu, khoảng trắng |
| Câu | Số câu trong văn bản |
| Đoạn | Số đoạn, tách nhau bằng dấu xuống dòng |
| Thời gian đọc | Số từ chia cho tốc độ đọc trung bình |

Phía dưới có danh sách các từ xuất hiện nhiều nhất, dùng để phát hiện lặp từ.

## Tiếng Việt đếm "từ" thế nào?

Trong ngôn ngữ học, "học sinh" là một từ gồm hai tiếng. Nhưng máy tính không biết ranh giới từ ghép, nên mọi phần mềm, kể cả Word và Google Docs, đều đếm theo khoảng trắng: "học sinh" được tính là 2.

Công cụ đếm theo cùng cách đó, nên con số khớp với Word. Khi đề bài ghi "600 từ" hay "1.000 chữ", gần như chắc chắn người ra đề cũng đang nói về con số Word hiển thị.

So với tiếng Anh: cùng một nội dung, bản tiếng Việt thường có số "từ" nhiều hơn bản tiếng Anh, vì từ tiếng Việt hay gồm hai tiếng.

## Ký tự có tính khoảng trắng không?

Tuỳ nơi yêu cầu. Giới hạn trên mạng xã hội, tin nhắn, ô nhập liệu của website tính **cả khoảng trắng**. Một số quy định về dịch thuật, báo chí tính không kể khoảng trắng. Hãy xem kỹ yêu cầu; nếu không ghi rõ, tính cả khoảng trắng là an toàn.

Lưu ý dấu xuống dòng cũng là một ký tự ở phần lớn hệ thống.

## Các giới hạn hay gặp

| Nơi dùng | Giới hạn |
|---|---|
| Tin nhắn SMS không dấu | 160 ký tự mỗi tin |
| Tin nhắn SMS có dấu tiếng Việt | 70 ký tự mỗi tin |
| Tiêu đề trang web (thẻ title) | Nên dưới khoảng 60 ký tự để không bị cắt trên Google |
| Mô tả trang web (meta description) | Nên dưới khoảng 155 ký tự |
| Bài đăng trên X (Twitter) | 280 ký tự |

Tin nhắn SMS có dấu ngắn hơn nhiều vì phải dùng bảng mã Unicode. Một tin nhắn 100 ký tự có dấu sẽ bị tính thành hai tin. Đó là lý do tin nhắn quảng cáo, mã OTP thường viết không dấu.

## Thời gian đọc và thời gian nói

Công cụ tính thời gian đọc thầm với tốc độ khoảng 230 tiếng mỗi phút. Đọc thành tiếng chậm hơn.

| Số từ | Đọc thầm | Nói, thuyết trình (ước lượng) |
|---|---|---|
| 300 | khoảng 1,5 phút | 2–2,5 phút |
| 600 | khoảng 2,5 phút | 4–5 phút |
| 1.000 | khoảng 4,5 phút | 7–8 phút |
| 2.000 | khoảng 9 phút | 14–16 phút |

Với bài phát biểu, hãy đọc thử thành tiếng và bấm giờ; con số ước lượng chỉ để soạn độ dài ban đầu.

## Dùng danh sách từ lặp

Danh sách từ xuất hiện nhiều nhất giúp bạn:

- Thấy những từ dùng quá nhiều ("rất", "thực sự", "có thể") để thay hoặc bỏ.
- Kiểm tra từ khoá chính có xuất hiện đủ trong bài viết cho web hay không, và có bị nhồi quá mức không.
- Phát hiện lỗi gõ lặp.

## Việc liên quan

- Đổi cả đoạn sang IN HOA hoặc viết hoa đầu câu: [Đổi chữ hoa/thường](tool:case-converter).
- Thay một cụm từ ở mọi chỗ: [Tìm và thay thế](tool:find-replace).
- Đếm và lọc danh sách có dòng trùng: [Lọc dòng trùng & sắp xếp dòng](tool:dedupe-lines).

## Câu hỏi thường gặp

**Kết quả có khớp với Word không?** Khớp về cách đếm từ (theo khoảng trắng). Có thể lệch vài đơn vị ở trường hợp đặc biệt như gạch nối, ký hiệu đứng riêng.

**Văn bản có bị lưu lại không?** Không gửi đi đâu. Bạn có thể bật "Nhớ văn bản" để lưu tạm trong trình duyệt của chính mình.

**Đếm được văn bản dài cỡ nào?** Cả cuốn sách vẫn đếm được; các con số cập nhật ngay khi dán.
