---
title: Cách làm báo giá, phiếu bán hàng gửi khách dạng PDF
desc: Cách lập báo giá và phiếu bán hàng có chiết khấu, thuế GTGT, số tiền bằng chữ, mã QR chuyển khoản rồi xuất PDF; báo giá cần những nội dung gì.
tools: [invoice, vat, number-to-words, vietqr]
updated: 2026-11-15
---

Một báo giá gửi qua tin nhắn bằng vài dòng chữ dễ gây hiểu lầm về giá, thuế và thời hạn. Mở [Tạo hoá đơn, báo giá](tool:invoice), nhập thông tin bên bán, khách hàng và từng dòng hàng; tổng tiền, thuế và số tiền bằng chữ tự tính, rồi bấm "Tải PDF". Dữ liệu chỉ nằm trên trình duyệt của bạn.

## Các bước lập báo giá

1. Chọn "Báo giá" hoặc "Hoá đơn bán lẻ", nhập số chứng từ.
2. Nhập thông tin bên bán và khách hàng.
3. Thêm từng dòng hàng hoá, dịch vụ: tên, đơn vị tính, số lượng, đơn giá.
4. Chọn chiết khấu, mức thuế GTGT (0%, 5%, 8%, 10%), phí vận chuyển.
5. Chọn ngân hàng để in mã QR chuyển khoản có sẵn số tiền.
6. Bấm "Tải PDF".

Thông tin bên bán được nhớ trong trình duyệt để lần sau không phải nhập lại.

## Báo giá cần có những gì?

| Nội dung | Vì sao cần |
|---|---|
| Số và ngày báo giá | Để hai bên tra cứu, đối chiếu khi có nhiều phiên bản |
| Thông tin bên bán | Tên, địa chỉ, mã số thuế, điện thoại, người liên hệ |
| Thông tin khách hàng | Xác định báo giá dành cho ai |
| Danh mục hàng hoá, dịch vụ | Tên, quy cách, đơn vị tính, số lượng, đơn giá |
| Chiết khấu, thuế, phí vận chuyển | Khách biết con số cuối cùng phải trả |
| Tổng tiền bằng số và bằng chữ | Tránh nhầm lẫn do gõ sai một chữ số |
| Thời hạn hiệu lực | Giá không bị giữ vô thời hạn |
| Điều khoản | Thanh toán, giao hàng, bảo hành |

## Cách tính tổng tiền

Thứ tự tính trong công cụ:

1. **Tiền hàng** = tổng (số lượng × đơn giá) của các dòng.
2. **Chiết khấu** trừ vào tiền hàng.
3. **Thuế GTGT** tính trên tiền hàng sau chiết khấu, làm tròn đến đồng.
4. **Phí vận chuyển** cộng sau thuế.

Ví dụ:

| Khoản | Số tiền |
|---|---|
| Tiền hàng | 20.000.000 |
| Chiết khấu 5% | −1.000.000 |
| Còn lại | 19.000.000 |
| Thuế GTGT 10% | 1.900.000 |
| Phí vận chuyển | 300.000 |
| **Tổng thanh toán** | **21.200.000** |

Bằng chữ: Hai mươi mốt triệu hai trăm nghìn đồng.

Cần tách giá chưa thuế từ giá đã gồm thuế, dùng [Tính VAT](tool:vat). Cần viết riêng một số tiền bằng chữ, dùng [Đọc số thành chữ](tool:number-to-words).

## Ghi rõ giá đã gồm thuế hay chưa

Đây là nguồn tranh cãi phổ biến nhất. Trong báo giá nên có một dòng riêng cho thuế GTGT, kể cả khi mức thuế là 0% hoặc bạn không thuộc diện tính thuế. Nếu đơn giá đã gồm thuế, ghi rõ trong phần ghi chú.

Mức thuế suất áp dụng cho từng loại hàng hoá, dịch vụ thay đổi theo quy định từng thời kỳ; hãy kiểm tra với kế toán của bạn trước khi gửi.

## Điều khoản nên ghi

- **Hiệu lực:** ví dụ báo giá có giá trị 15 ngày kể từ ngày lập.
- **Thanh toán:** đặt cọc bao nhiêu phần trăm, phần còn lại trả khi nào, bằng hình thức nào.
- **Giao hàng:** thời gian, địa điểm, bên nào chịu phí.
- **Bảo hành, đổi trả:** thời hạn và điều kiện.
- **Phạm vi công việc** với dịch vụ: gồm gì, không gồm gì, số lần chỉnh sửa.

## Mã QR chuyển khoản

Chọn ngân hàng và số tài khoản, phiếu sẽ in kèm mã QR có sẵn số tiền cần trả. Khách quét bằng ứng dụng ngân hàng là điền sẵn người nhận và số tiền, giảm chuyển nhầm, chuyển thiếu. Cần riêng một mã QR để dán ở quầy hoặc gửi qua tin nhắn, dùng [Tạo mã QR chuyển khoản (VietQR)](tool:vietqr).

## Báo giá, phiếu bán hàng và hoá đơn điện tử

| Chứng từ | Mục đích | Giá trị về thuế |
|---|---|---|
| Báo giá | Chào giá trước khi mua | Không |
| Phiếu bán hàng (hoá đơn bán lẻ) | Xác nhận đã bán, giao cho khách | Không thay hoá đơn điện tử |
| Hoá đơn điện tử | Chứng từ theo quy định về hoá đơn | Có, dùng để kê khai |

Phiếu tạo bằng công cụ là báo giá hoặc phiếu bán hàng để giao cho khách. Khi bên mua cần hoá đơn hợp lệ để kê khai thuế, người bán phải xuất hoá đơn điện tử theo Nghị định 123/2020/NĐ-CP qua phần mềm hoá đơn điện tử.

## Mẹo để báo giá dễ được duyệt

- **Đặt số theo quy tắc**, ví dụ BG-2026-045, và tăng phiên bản khi sửa (BG-2026-045-v2).
- **Mô tả cụ thể** từng dòng: thay "Thiết kế" bằng "Thiết kế logo, 3 phương án, 2 lần chỉnh sửa".
- **Tách hạng mục tuỳ chọn** ra dòng riêng để khách dễ bớt mà không phải làm lại toàn bộ.
- **Gửi PDF**, không gửi file sửa được.

## Câu hỏi thường gặp

**Dữ liệu có bị lưu lên mạng không?** Không. Phiếu được dựng và xuất PDF ngay trên trình duyệt; thông tin chỉ được nhớ trong trình duyệt trên máy bạn.

**Chiết khấu theo số tiền thay vì phần trăm được không?** Được, chọn cách tính chiết khấu trong công cụ.

**Có thêm ghi chú, điều khoản vào phiếu được không?** Được, có ô ghi chú và điều khoản in ở cuối phiếu.
