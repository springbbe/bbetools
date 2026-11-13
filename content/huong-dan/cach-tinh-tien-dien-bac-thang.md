---
title: Cách tính tiền điện sinh hoạt theo 6 bậc thang
desc: Bảng giá điện sinh hoạt 6 bậc hiện hành, công thức và ví dụ tính tiền điện từng bậc có thuế GTGT, cách tính khi nhiều hộ dùng chung một công tơ.
tools: [electricity-bill]
data: [gia-dien]
updated: 2026-11-13
---

Tiền điện sinh hoạt tính luỹ tiến theo 6 bậc: càng dùng nhiều, những kWh sau càng đắt. Dùng 250 kWh trong tháng, bạn trả **636.768 đồng** đã gồm thuế GTGT 8%. Muốn tính nhanh với số điện của mình, mở [Tính tiền điện bậc thang](tool:electricity-bill).

## Bảng giá điện sinh hoạt hiện hành

Theo Quyết định 1279/QĐ-BCT của Bộ Công Thương, áp dụng từ 10/5/2025:

| Bậc | Số kWh trong tháng | Giá (đồng/kWh, chưa thuế) |
|---|---|---|
| 1 | 0 – 50 | 1.984 |
| 2 | 51 – 100 | 2.050 |
| 3 | 101 – 200 | 2.380 |
| 4 | 201 – 300 | 2.998 |
| 5 | 301 – 400 | 3.350 |
| 6 | Từ 401 trở lên | 3.460 |

Thuế giá trị gia tăng đang áp dụng mức 8% đến hết ngày 31/12/2026; sau thời điểm đó mức thông thường là 10% nếu không có quy định mới.

## Công thức

1. Chia số kWh đã dùng vào từng bậc, từ bậc 1 trở lên.
2. Nhân số kWh của mỗi bậc với giá của bậc đó rồi cộng lại.
3. Cộng thêm thuế GTGT.

Số kWh đã dùng bằng chỉ số công tơ mới trừ chỉ số cũ ghi trên hoá đơn.

## Ví dụ: dùng 250 kWh

| Bậc | Số kWh | Đơn giá | Thành tiền |
|---|---|---|---|
| 1 | 50 | 1.984 | 99.200 |
| 2 | 50 | 2.050 | 102.500 |
| 3 | 100 | 2.380 | 238.000 |
| 4 | 50 | 2.998 | 149.900 |
| Cộng | 250 | | 589.600 |

Thuế GTGT 8%: 47.168 đồng. Tổng phải trả: **636.768 đồng**.

## Nhiều hộ dùng chung một công tơ

Mỗi hộ được tính một định mức, nên số kWh của từng bậc được nhân với số hộ. Với 2 hộ, bậc 1 là 100 kWh đầu, bậc 2 là 100 kWh tiếp theo, bậc 3 là 200 kWh tiếp theo.

Cùng 250 kWh nhưng 2 hộ dùng chung:

- Bậc 1: 100 × 1.984 = 198.400 đồng.
- Bậc 2: 100 × 2.050 = 205.000 đồng.
- Bậc 3: 50 × 2.380 = 119.000 đồng.
- Cộng 522.400 đồng, thuế 8% là 41.792 đồng, tổng **564.192 đồng**.

Ít hơn 72.576 đồng so với khi tính một hộ. Trong công cụ, nhập số hộ vào ô "Số hộ dùng chung công tơ".

## Vì sao hoá đơn thực tế lệch một chút?

- Kỳ ghi chỉ số không tròn một tháng: định mức mỗi bậc được chia theo số ngày thực tế.
- Giá điện thay đổi giữa kỳ: số điện được chia theo số ngày trước và sau khi đổi giá.
- Làm tròn số trên hoá đơn.

Nếu lệch nhiều, hãy đối chiếu chỉ số công tơ với số ghi trên hoá đơn trước khi liên hệ điện lực.

## Từ số tiền suy ra số điện

Muốn biết với ngân sách 1 triệu đồng mỗi tháng thì được dùng bao nhiêu kWh, chọn chế độ "Từ tiền ra số điện" trong [Tính tiền điện bậc thang](tool:electricity-bill).

## Mẹo đọc hoá đơn

- Phần điện ở bậc 5 và bậc 6 đắt gấp khoảng 1,7 lần bậc 1. Tháng nóng dùng điều hoà nhiều thì tiền điện tăng nhanh hơn số điện.
- Người thuê trọ có hợp đồng thuê và đăng ký cư trú được tính giá theo bậc thang như hộ gia đình; hãy hỏi chủ nhà hoặc điện lực về cách đăng ký định mức.
