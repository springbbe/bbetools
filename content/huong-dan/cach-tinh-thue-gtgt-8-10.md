---
title: Cách tính thuế GTGT (VAT) 8% và 10%, xuôi và ngược
desc: Công thức tính thuế giá trị gia tăng từ giá chưa thuế và tách thuế từ giá đã gồm VAT, khi nào áp dụng 8% hay 10% trong năm 2026, kèm ví dụ ghi hoá đơn.
tools: [vat, number-to-words]
updated: 2026-11-13
---

Tiền thuế giá trị gia tăng bằng giá chưa thuế nhân với thuế suất. Muốn tách thuế từ giá đã gồm thuế, lấy giá đó chia cho (1 + thuế suất). [Tính VAT](tool:vat) làm cả hai chiều và đọc luôn số tiền bằng chữ để ghi hoá đơn.

## Hai công thức

**Tính xuôi** (biết giá chưa thuế):

- Tiền thuế = giá chưa thuế × thuế suất.
- Tổng thanh toán = giá chưa thuế + tiền thuế.

**Tính ngược** (biết giá đã gồm thuế):

- Giá chưa thuế = giá đã gồm thuế ÷ (1 + thuế suất).
- Tiền thuế = giá đã gồm thuế − giá chưa thuế.

## Ví dụ

| Bài toán | Thuế suất | Giá chưa thuế | Tiền thuế | Tổng |
|---|---|---|---|---|
| Xuôi | 8% | 1.000.000 | 80.000 | 1.080.000 |
| Xuôi | 10% | 1.000.000 | 100.000 | 1.100.000 |
| Ngược | 8% | 1.000.000 | 80.000 | 1.080.000 |
| Ngược | 10% | 2.000.000 | 200.000 | 2.200.000 |

Lỗi hay gặp khi tính ngược là lấy giá đã gồm thuế nhân thẳng với thuế suất. Với 1.080.000 đồng gồm thuế 8%, tiền thuế là 80.000 đồng chứ không phải 86.400 đồng.

## Khi nào 8%, khi nào 10%?

Luật Thuế giá trị gia tăng có các mức thuế suất 0%, 5% và 10%; mức 10% là mức phổ thông.

Theo Nghị quyết 204/2025/QH15 và Nghị định 174/2025/NĐ-CP, phần lớn hàng hoá, dịch vụ đang chịu thuế 10% được **giảm còn 8% từ 01/7/2025 đến hết 31/12/2026**.

Một số nhóm không được giảm và vẫn chịu 10%, gồm:

- Viễn thông.
- Hoạt động tài chính, ngân hàng, chứng khoán, bảo hiểm.
- Kinh doanh bất động sản.
- Sản phẩm kim loại.
- Hàng hoá, dịch vụ chịu thuế tiêu thụ đặc biệt (trừ xăng).

Danh mục chi tiết nằm trong các phụ lục của Nghị định 174/2025/NĐ-CP. Với một mặt hàng cụ thể, hãy tra phụ lục hoặc hỏi kế toán trước khi xuất hoá đơn; ghi sai thuế suất phải lập hoá đơn điều chỉnh.

Sau ngày 31/12/2026, nếu không có quy định gia hạn, các mặt hàng đang được giảm trở lại mức 10%.

## Ghi trên hoá đơn

Hoá đơn giá trị gia tăng thể hiện riêng ba dòng: giá chưa thuế, thuế suất và tiền thuế, tổng tiền thanh toán, kèm tổng tiền viết bằng chữ. Nếu một hoá đơn có hàng hoá chịu các mức thuế suất khác nhau, mỗi dòng hàng ghi thuế suất của mình.

Trong công cụ:

1. Chọn chiều tính: từ giá chưa thuế ra giá có thuế, hoặc tách thuế từ giá đã gồm VAT.
2. Nhập số tiền và chọn thuế suất (0%, 5%, 8%, 10% hoặc mức khác).
3. Xem tiền thuế, tổng thanh toán và số tiền bằng chữ.

Cần đọc riêng một số tiền thành chữ, dùng [Đọc số thành chữ](tool:number-to-words).

## Báo giá cho khách: ghi giá nào?

- Bán cho doanh nghiệp: thường báo giá chưa thuế và ghi rõ "chưa gồm thuế GTGT …%", vì bên mua được khấu trừ thuế đầu vào.
- Bán lẻ cho người tiêu dùng: giá niêm yết nên là giá đã gồm thuế để khách biết số tiền phải trả.

Dù theo cách nào, hãy ghi rõ giá đã gồm thuế hay chưa để tránh tranh cãi khi thanh toán.

## Làm tròn

Tiền Việt Nam không có đơn vị lẻ dưới đồng, nên tiền thuế được làm tròn đến đồng. Khi tính ngược từ giá đã gồm thuế, giá chưa thuế có thể ra số lẻ; phần mềm hoá đơn thường làm tròn giá chưa thuế rồi lấy tổng trừ đi để ra tiền thuế, sao cho ba con số khớp nhau.
