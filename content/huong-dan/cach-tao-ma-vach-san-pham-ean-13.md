---
title: Cách tạo mã vạch sản phẩm: EAN-13, Code 128 và in tem
desc: Cách tạo mã vạch EAN-13, Code 128 cho sản phẩm và in tem ra giấy A4; chọn loại mã nào, số kiểm tra tính ra sao và khi nào phải đăng ký mã GS1 đầu 893.
tools: [barcode-generator, qr-generator, qr-scanner]
updated: 2026-11-15
---

Cửa hàng nhỏ cần dán mã để quét khi tính tiền, kho cần tem cho từng kệ, sản phẩm cần mã để lên kệ siêu thị: ba nhu cầu, ba loại mã khác nhau. Mở [Tạo mã vạch](tool:barcode-generator), chọn loại mã, nhập nội dung rồi tải ảnh PNG, SVG hoặc bấm "In tem" để có file PDF khổ A4. Mã được vẽ ngay trên trình duyệt.

## Chọn loại mã nào?

| Loại mã | Nội dung | Dùng cho |
|---|---|---|
| EAN-13 | 13 chữ số | Hàng bán lẻ ở Việt Nam và phần lớn thế giới |
| EAN-8 | 8 chữ số | Sản phẩm rất nhỏ, không đủ chỗ cho EAN-13 |
| UPC-A | 12 chữ số | Hàng bán lẻ ở Mỹ, Canada |
| ITF-14 | 14 chữ số | Thùng carton, kiện hàng |
| Code 128 | Chữ, số, ký hiệu (ASCII) | Mã nội bộ, vận đơn, tem kho |
| Code 39 | Chữ in hoa, số, vài ký hiệu | Hệ thống cũ, tem tài sản |

Quy tắc chọn nhanh: bán qua kênh bán lẻ thì EAN-13; chỉ quản lý nội bộ thì Code 128.

## Các bước tạo mã

1. Chọn loại mã.
2. Nhập nội dung. Với EAN và UPC chỉ cần nhập phần số, số kiểm tra được tự thêm.
3. Muốn tạo nhiều mã, dán cả danh sách, mỗi dòng một mã.
4. Tải PNG hoặc SVG, sao chép ảnh, hoặc bấm "In tem" để có file PDF A4 xếp sẵn các mã.

## Cấu tạo mã EAN-13

Ví dụ mã 8934602001078:

| Phần | Chữ số | Ý nghĩa |
|---|---|---|
| Mã quốc gia | 893 | Việt Nam |
| Mã doanh nghiệp và mã sản phẩm | 460200107 | Do GS1 cấp cho doanh nghiệp, doanh nghiệp tự đánh số sản phẩm |
| Số kiểm tra | 8 | Tính từ 12 chữ số đứng trước |

Mã quốc gia cho biết doanh nghiệp đăng ký mã ở đâu, không khẳng định nơi sản xuất.

## Số kiểm tra tính thế nào?

Số kiểm tra giúp máy quét phát hiện đọc sai. Cách tính với 12 chữ số đầu:

1. Cộng các chữ số ở vị trí lẻ (1, 3, 5, 7, 9, 11).
2. Cộng các chữ số ở vị trí chẵn rồi nhân 3.
3. Cộng hai kết quả.
4. Số kiểm tra là số cần thêm để tổng tròn chục.

Với 893460200107: vị trí lẻ 8 + 3 + 6 + 2 + 0 + 0 = 19; vị trí chẵn (9 + 4 + 0 + 0 + 1 + 7) × 3 = 63; tổng 82; cần thêm **8** để tròn 90.

Bạn không phải tự tính: nhập 12 số, công cụ thêm số thứ 13.

## Có cần đăng ký mã không?

- **Bán trong cửa hàng của mình, quản lý kho nội bộ:** không cần. Tự đặt mã theo quy tắc riêng và dùng Code 128, hoặc dùng các đầu số dành cho nội bộ.
- **Đưa hàng vào siêu thị, chuỗi bán lẻ, sàn thương mại điện tử yêu cầu mã GS1:** doanh nghiệp phải đăng ký mã doanh nghiệp GS1 (ở Việt Nam là đầu 893) với cơ quan quản lý mã số mã vạch quốc gia, rồi mới đánh số từng sản phẩm.

Công cụ chỉ vẽ mã vạch đúng chuẩn từ dãy số bạn nhập. Tự đặt một dãy bắt đầu bằng 893 mà không đăng ký có thể trùng với mã của doanh nghiệp khác.

## In tem sao cho quét được

- **Nền trắng, vạch đen.** Tránh in trên nền màu đậm, nền bóng phản quang.
- **Chừa khoảng trắng hai bên mã.** Máy quét cần vùng trống này để nhận điểm đầu và điểm cuối.
- **Không thu nhỏ quá mức.** Vạch mảnh nhất nên in từ 3 điểm ảnh trở lên; in bằng máy in nhiệt thì thử quét trước khi in hàng loạt.
- **Không kéo giãn một chiều.** Giảm chiều cao thì được, bóp chiều ngang làm sai tỉ lệ vạch.
- **Dùng SVG khi đưa vào thiết kế bao bì** để phóng to không vỡ.
- **Dán trên mặt phẳng.** Mã dán vòng quanh chai nhỏ nên xoay dọc kiểu "bậc thang" để vạch không bị cong.

In xong, thử quét bằng điện thoại với [Quét mã QR](tool:qr-scanner) trước khi dán hàng loạt.

## Mã vạch hay mã QR?

| | Mã vạch | Mã QR |
|---|---|---|
| Chứa được | Vài chục ký tự, không dấu | Hàng nghìn ký tự, có dấu tiếng Việt, đường link |
| Thiết bị đọc | Máy quét ở quầy thu ngân | Camera điện thoại |
| Dùng cho | Tính tiền, quản lý kho | Dẫn tới trang web, thông tin sản phẩm, thanh toán |

Nhiều sản phẩm in cả hai: mã vạch cho quầy thu ngân, mã QR cho khách tra cứu. Tạo mã QR ở [Tạo mã QR](tool:qr-generator).

## Câu hỏi thường gặp

**Code 128 có nhận tiếng Việt có dấu không?** Không. Code 128 và Code 39 chỉ mã hoá ký tự ASCII; hãy bỏ dấu hoặc dùng mã QR.

**Mã tạo ra có quét được thật không?** Mã được vẽ đúng chuẩn của từng loại. Chất lượng in mới là yếu tố quyết định, nên luôn quét thử bản in.

**Tạo vài trăm mã một lần được không?** Được. Dán danh sách rồi dùng "In tem" để xuất PDF nhiều trang.
