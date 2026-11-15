---
title: Cách tính tiền điện sinh hoạt theo 5 bậc thang
desc: Bảng giá điện sinh hoạt 5 bậc áp dụng từ 01/11/2026, công thức và ví dụ tính tiền điện từng bậc có thuế GTGT, cách tính khi nhiều hộ dùng chung công tơ.
tools: [electricity-bill]
data: [gia-dien]
updated: 2026-11-15
---

Tiền điện sinh hoạt tính luỹ tiến theo 5 bậc: càng dùng nhiều, những kWh sau càng đắt. Dùng 250 kWh trong tháng, bạn trả **608.796 đồng** đã gồm thuế GTGT 8%. Muốn tính nhanh với số điện của mình, mở [Tính tiền điện bậc thang](tool:electricity-bill).

## Bảng giá điện sinh hoạt hiện hành

Theo Quyết định 2892/QĐ-BCT ngày 31/10/2026 của Bộ Công Thương, áp dụng từ 01/11/2026 (thay biểu 6 bậc của Quyết định 1279/QĐ-BCT):

| Bậc | Số kWh trong tháng | Giá (đồng/kWh, chưa thuế) |
|---|---|---|
| 1 | 0 – 100 | 1.901 |
| 2 | 101 – 200 | 2.289 |
| 3 | 201 – 400 | 2.894 |
| 4 | 401 – 700 | 3.456 |
| 5 | Từ 701 trở lên | 3.844 |

So với biểu cũ, hộ dùng ít và vừa trả ít hơn, còn phần điện từ kWh thứ 701 đắt hơn (3.844 so với 3.460 đồng/kWh). Phụ lục của quyết định mới không còn dòng giá riêng cho công tơ thẻ trả trước như biểu cũ; nếu nhà bạn dùng loại công tơ này, hãy hỏi điện lực về cách tính.

Thuế giá trị gia tăng đang áp dụng mức 8% đến hết ngày 31/12/2026; sau thời điểm đó mức thông thường là 10% nếu không có quy định mới.

## Công thức

1. Chia số kWh đã dùng vào từng bậc, từ bậc 1 trở lên.
2. Nhân số kWh của mỗi bậc với giá của bậc đó rồi cộng lại.
3. Cộng thêm thuế GTGT.

Số kWh đã dùng bằng chỉ số công tơ mới trừ chỉ số cũ ghi trên hoá đơn.

## Ví dụ: dùng 250 kWh

| Bậc | Số kWh | Đơn giá | Thành tiền |
|---|---|---|---|
| 1 | 100 | 1.901 | 190.100 |
| 2 | 100 | 2.289 | 228.900 |
| 3 | 50 | 2.894 | 144.700 |
| Cộng | 250 | | 563.700 |

Thuế GTGT 8%: 45.096 đồng. Tổng phải trả: **608.796 đồng**.

## Nhiều hộ dùng chung một công tơ

Mỗi hộ được tính một định mức, nên số kWh của từng bậc được nhân với số hộ. Với 2 hộ, bậc 1 là 200 kWh đầu, bậc 2 là 200 kWh tiếp theo, bậc 3 là 400 kWh tiếp theo.

Cùng 250 kWh nhưng 2 hộ dùng chung:

- Bậc 1: 200 × 1.901 = 380.200 đồng.
- Bậc 2: 50 × 2.289 = 114.450 đồng.
- Cộng 494.650 đồng, thuế 8% là 39.572 đồng, tổng **534.222 đồng**.

Ít hơn 74.574 đồng so với khi tính một hộ. Trong công cụ, nhập số hộ vào ô "Số hộ dùng chung công tơ".

## Vì sao hoá đơn thực tế lệch một chút?

- Kỳ ghi chỉ số không tròn một tháng: định mức mỗi bậc được chia theo số ngày thực tế.
- Giá điện thay đổi giữa kỳ: số điện được chia theo số ngày trước và sau khi đổi giá.
- Làm tròn số trên hoá đơn.

Nếu lệch nhiều, hãy đối chiếu chỉ số công tơ với số ghi trên hoá đơn trước khi liên hệ điện lực.

## Từ số tiền suy ra số điện

Muốn biết với ngân sách 1 triệu đồng mỗi tháng thì được dùng bao nhiêu kWh, chọn chế độ "Từ tiền ra số điện" trong [Tính tiền điện bậc thang](tool:electricity-bill).

## Mẹo đọc hoá đơn

- Phần điện ở bậc 5 đắt gấp khoảng 2 lần bậc 1. Tháng nóng dùng điều hoà nhiều thì tiền điện tăng nhanh hơn số điện.
- Người thuê trọ có hợp đồng thuê và đăng ký cư trú được tính giá theo bậc thang như hộ gia đình; hãy hỏi chủ nhà hoặc điện lực về cách đăng ký định mức.
