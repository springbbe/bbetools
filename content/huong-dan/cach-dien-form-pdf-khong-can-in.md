---
title: Cách điền form PDF trên máy tính, không cần in ra
desc: Cách điền tờ khai, đơn từ dạng PDF ngay trên trình duyệt: điền vào ô form có sẵn, gõ chữ lên PDF không có ô, ký tên và khoá nội dung trước khi gửi.
tools: [fill-form-pdf, sign-pdf, flatten-pdf, compress-pdf]
updated: 2026-11-15
---

In tờ khai ra, viết tay, rồi chụp lại để gửi là cách tốn công và cho ra file xấu. Nếu file PDF có sẵn ô biểu mẫu, mở [Điền form PDF](tool:fill-form-pdf), chọn file, bấm vào các ô màu xanh để điền rồi bấm "Lưu PDF đã điền". Với file không có ô, bạn vẫn gõ chữ lên được bằng [Ký PDF](tool:sign-pdf). Cả hai đều chạy trên trình duyệt, tờ khai không bị tải lên đâu.

## PDF của bạn thuộc loại nào?

| Loại | Dấu hiệu | Dùng công cụ |
|---|---|---|
| Có ô form (AcroForm) | Mở file thấy các ô bấm vào gõ được, ô đánh dấu, danh sách chọn | Điền form PDF |
| Không có ô form | Chỉ là trang giấy có dòng chấm, ô kẻ; bấm vào không gõ được | Ký PDF |
| Bản scan, ảnh chụp | Cả trang là một tấm ảnh | Ký PDF |

Cách thử nhanh: cứ chọn file trong công cụ điền form. Nếu có ô, chúng hiện màu xanh trên trang.

## Điền PDF có sẵn ô form

1. Chọn hoặc kéo thả file PDF.
2. Bấm vào ô xanh để gõ chữ, đánh dấu ô chọn, chọn mục trong danh sách. Phím Tab chuyển sang ô kế tiếp.
3. Bật "Làm phẳng sau khi điền" nếu không muốn người nhận sửa được nội dung.
4. Bấm "Lưu PDF đã điền" rồi tải file về.

Gõ tiếng Việt có dấu không bị lỗi font: khi có chữ có dấu, công cụ nhúng font Be Vietnam Pro vào file để mọi phần mềm đọc PDF đều hiện đúng.

## Điền PDF không có ô form

Dùng [Ký PDF](tool:sign-pdf) để đặt chữ, ngày tháng, dấu tích và chữ ký vào bất kỳ chỗ nào trên trang:

1. Chọn file PDF.
2. Thêm ô chữ, gõ nội dung rồi kéo tới đúng dòng cần điền; chỉnh cỡ chữ cho khớp với mẫu.
3. Thêm dấu tích vào các ô lựa chọn.
4. Thêm chữ ký nếu mẫu yêu cầu ký tên, rồi lưu file.

## "Làm phẳng" là gì, khi nào cần?

File đã điền nhưng chưa làm phẳng vẫn là biểu mẫu: người nhận mở ra có thể sửa nội dung các ô. Làm phẳng biến những gì bạn điền thành nội dung cố định của trang, giống như đã in ra giấy.

- **Nên làm phẳng** khi nộp bản chính thức: đơn xin việc, tờ khai đã ký, biên bản.
- **Chưa nên làm phẳng** khi còn gửi qua lại để người khác điền tiếp phần của họ.

Nếu đã lưu mà quên bật tuỳ chọn, đưa file qua [Làm phẳng form PDF](tool:flatten-pdf).

## Lỗi hay gặp

- **Điền xong mở bằng phần mềm khác thấy ô trống.** Một số trình xem PDF đơn giản không hiện giá trị của ô form. Làm phẳng file trước khi gửi để chắc chắn ai cũng thấy.
- **Biểu mẫu báo cần Adobe Reader mới mở được.** Đó là biểu mẫu XFA (Adobe LiveCycle). Công cụ chỉ điền được phần form thường đi kèm; biểu mẫu chỉ có XFA cần mở bằng Adobe Acrobat.
- **Chữ dài bị tràn khỏi ô.** Viết gọn lại; với ô nhiều dòng thì xuống dòng thủ công.

## Câu hỏi thường gặp

**Chữ ký chèn vào có giá trị pháp lý không?** Đó là hình ảnh chữ ký, không phải chữ ký số. Nơi nhận có chấp nhận hay không tuỳ quy định của họ; thủ tục yêu cầu chữ ký số thì phải ký bằng chứng thư số.

**File sau khi điền quá nặng để nộp?** Đưa qua [Nén PDF](tool:compress-pdf) để giảm dung lượng.

**Điền trên điện thoại được không?** Được. Chạm vào ô để gõ; phóng to trang nếu ô nhỏ.
