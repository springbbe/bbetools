---
title: Cách nén ảnh xuống dưới 200 KB, 100 KB để nộp hồ sơ
desc: Cách giảm dung lượng ảnh JPG, PNG xuống dưới số KB mà trang nộp hồ sơ yêu cầu, giữ ảnh rõ nét, và cách chọn giữa giảm chất lượng với thu nhỏ kích thước.
tools: [compress-image, resize-image, heic-to-jpg]
updated: 2026-11-13
---

Khi trang nộp hồ sơ yêu cầu ảnh dưới 200 KB, mở [Nén ảnh](tool:compress-image), bật "Nén xuống dưới", nhập 200 rồi bấm "Nén ảnh". Công cụ tự giảm chất lượng và, nếu cần, thu nhỏ kích thước cho tới khi đạt mức bạn nhập.

## Các bước

1. Chọn, kéo thả hoặc dán một hay nhiều ảnh.
2. Bật "Nén xuống dưới" và nhập số KB cần đạt.
3. Bấm "Nén ảnh", so sánh trước và sau.
4. Tải từng ảnh hoặc cả file .zip.

Nén được nhiều ảnh trong một lần, tiện khi phải tải lên cả ảnh chân dung, căn cước, bằng cấp.

## Dung lượng ảnh phụ thuộc vào gì?

| Yếu tố | Ảnh hưởng |
|---|---|
| Kích thước (số pixel) | Lớn nhất: giảm một nửa mỗi cạnh thì dung lượng còn khoảng một phần tư |
| Mức chất lượng khi lưu JPG | Giảm từ rất cao xuống mức khá gần như không thấy khác, nhưng nhẹ đi nhiều |
| Định dạng | Ảnh chụp lưu PNG nặng gấp nhiều lần JPG |
| Nội dung ảnh | Ảnh nhiều chi tiết nặng hơn ảnh nền trơn |

Ảnh chụp bằng điện thoại thường có cạnh dài 4.000 pixel trở lên và nặng 3–8 MB, trong khi ảnh hồ sơ hiển thị trên màn hình hiếm khi cần quá 1.500 pixel.

## Giảm chất lượng hay thu nhỏ kích thước?

- **Ảnh chân dung, ảnh thẻ:** thu nhỏ kích thước trước. Ảnh thẻ 4×6 chỉ cần khoảng 472 × 709 pixel.
- **Ảnh chụp giấy tờ có chữ nhỏ:** giữ kích thước đủ lớn để chữ còn đọc được, chấp nhận chất lượng thấp hơn một chút. Sau khi nén, phóng to để kiểm tra các dòng chữ nhỏ và con dấu.

Muốn tự đặt số pixel, dùng [Đổi kích thước ảnh](tool:resize-image) rồi mới nén.

## Trang còn yêu cầu kích thước hoặc định dạng

Nhiều trang đặt đồng thời ba điều kiện: định dạng (thường là JPG), kích thước tối thiểu hoặc tối đa, và dung lượng. Thứ tự làm nên là:

1. Đổi định dạng nếu cần. Ảnh iPhone đuôi .heic chuyển bằng [HEIC sang JPG](tool:heic-to-jpg).
2. Đổi kích thước về đúng số pixel yêu cầu.
3. Nén xuống dưới số KB.

## Nén xuống quá thấp thì sao?

Mỗi ảnh có một ngưỡng mà dưới đó chất lượng xuống rõ rệt: chữ nhoè, xuất hiện ô vuông ở vùng chuyển màu. Nếu ảnh giấy tờ không thể đọc được ở mức KB yêu cầu, hãy chụp lại gần hơn, chỉ lấy phần giấy tờ và bỏ phần nền thừa; ảnh ít chi tiết thừa sẽ nén tốt hơn.

## Ảnh sau nén có còn thông tin vị trí không?

Không. Ảnh sau khi nén không còn dữ liệu EXIF, trong đó có toạ độ GPS nơi chụp; hướng xoay của ảnh đã được áp dụng sẵn nên ảnh không bị nằm ngang.

## Quyền riêng tư

Ảnh hồ sơ thường là ảnh giấy tờ tuỳ thân. Ở đây ảnh được nén ngay trong trình duyệt, không tải lên máy chủ nào.

## Câu hỏi thường gặp

**Nén xuống dưới 100 KB hoặc 50 KB được không?** Được. Nhập số KB tương ứng; với mức rất thấp, công cụ sẽ phải thu nhỏ kích thước ảnh nhiều hơn.

**Vì sao ảnh PNG nén không giảm được nhiều?** PNG hợp với ảnh chụp màn hình, hình vẽ ít màu. Với ảnh chụp từ camera, hãy xuất ra JPG thì mới nhẹ.

**KB và MB khác nhau thế nào?** 1 MB bằng 1.024 KB. Giới hạn "2 MB" rộng rãi hơn nhiều so với "200 KB"; đọc kỹ đơn vị trước khi nén.
