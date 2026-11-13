---
title: Cách tính lương gross sang net năm 2026
desc: Công thức đổi lương gross sang net năm 2026 theo biểu thuế 5 bậc, giảm trừ gia cảnh 15,5 triệu đồng và mức đóng bảo hiểm 10,5%, kèm ví dụ tính từng bước.
tools: [salary-gross-net, pit-calculator]
data: [thue-tncn, bhxh, luong-toi-thieu-vung]
updated: 2026-11-13
---

Lương net bằng lương gross trừ bảo hiểm bắt buộc (10,5%) và thuế thu nhập cá nhân. Với lương gross 30 triệu đồng, không có người phụ thuộc, bạn thực nhận **26.215.000 đồng** mỗi tháng. Muốn có ngay con số của mình, mở [Tính lương gross ↔ net](tool:salary-gross-net); phần dưới giải thích từng bước để bạn tự kiểm tra bảng lương.

## Bước 1: trừ bảo hiểm bắt buộc

Người lao động đóng tổng cộng 10,5% trên mức lương đóng bảo hiểm:

| Khoản | Người lao động | Doanh nghiệp |
|---|---|---|
| Bảo hiểm xã hội (BHXH) | 8% | 17,5% |
| Bảo hiểm y tế (BHYT) | 1,5% | 3% |
| Bảo hiểm thất nghiệp (BHTN) | 1% | 1% |
| Cộng | 10,5% | 21,5% |

Mức lương đóng bảo hiểm có trần:

- BHXH và BHYT: tối đa 20 lần lương cơ sở. Lương cơ sở từ 01/7/2026 là 2.530.000 đồng, nên trần là 50.600.000 đồng/tháng.
- BHTN: tối đa 20 lần lương tối thiểu vùng. Ở vùng I trần là 106.200.000 đồng/tháng.

Lương tối thiểu vùng từ 01/01/2026:

| Vùng | Mức lương tối thiểu tháng |
|---|---|
| Vùng I | 5.310.000 đồng |
| Vùng II | 4.730.000 đồng |
| Vùng III | 4.140.000 đồng |
| Vùng IV | 3.700.000 đồng |

Vùng xác định theo nơi doanh nghiệp hoạt động, không theo nơi bạn ở.

## Bước 2: trừ giảm trừ gia cảnh

Từ kỳ tính thuế năm 2026, mức giảm trừ là:

- Bản thân người nộp thuế: 15.500.000 đồng/tháng.
- Mỗi người phụ thuộc: 6.200.000 đồng/tháng.

Thu nhập tính thuế = lương gross − bảo hiểm − giảm trừ gia cảnh − các khoản không chịu thuế (nếu có). Kết quả nhỏ hơn hoặc bằng 0 thì không phải nộp thuế.

## Bước 3: tính thuế theo biểu 5 bậc

| Bậc | Thu nhập tính thuế mỗi tháng | Thuế suất |
|---|---|---|
| 1 | Đến 10 triệu đồng | 5% |
| 2 | Trên 10 đến 30 triệu đồng | 10% |
| 3 | Trên 30 đến 60 triệu đồng | 20% |
| 4 | Trên 60 đến 100 triệu đồng | 30% |
| 5 | Trên 100 triệu đồng | 35% |

Thuế tính luỹ tiến từng phần: mỗi phần thu nhập chỉ chịu thuế suất của bậc chứa nó.

## Ví dụ: lương gross 30 triệu đồng

Không có người phụ thuộc:

1. Bảo hiểm: 30.000.000 × 10,5% = 3.150.000 đồng.
2. Thu nhập trước thuế: 30.000.000 − 3.150.000 = 26.850.000 đồng.
3. Thu nhập tính thuế: 26.850.000 − 15.500.000 = 11.350.000 đồng.
4. Thuế: 10.000.000 × 5% + 1.350.000 × 10% = 500.000 + 135.000 = 635.000 đồng.
5. Lương net: 26.850.000 − 635.000 = **26.215.000 đồng**.

Có một người phụ thuộc: thu nhập tính thuế còn 5.150.000 đồng, thuế 257.500 đồng, lương net **26.592.500 đồng**.

Với mức lương này doanh nghiệp đóng thêm 21,5%, tức 6.450.000 đồng, nên tổng chi phí cho vị trí của bạn là 36.450.000 đồng/tháng.

## Những chỗ hay tính sai

- **Công ty đóng bảo hiểm trên mức lương thấp hơn lương thật.** Khi đó bảo hiểm tính trên mức đóng, còn thuế vẫn tính trên toàn bộ thu nhập. Trong công cụ, chọn "Mức khác" ở phần lương đóng bảo hiểm.
- **Lương cao vượt trần.** Lương gross 80 triệu đồng thì BHXH và BHYT chỉ tính trên 50.600.000 đồng.
- **Phụ cấp không chịu thuế.** Tiền ăn giữa ca theo mức quy định và một số phụ cấp không tính vào thu nhập chịu thuế; nhập vào ô "Khoản không tính thuế".
- **Thoả thuận lương net.** Nếu hợp đồng ghi lương net, dùng chiều "Net → Gross" để biết mức gross tương ứng.

Cần tính riêng thuế cả năm khi quyết toán, dùng [Tính thuế TNCN](tool:pit-calculator).

## Nguồn số liệu

Luật Thuế thu nhập cá nhân số 109/2025/QH15 và Nghị quyết 110/2025/UBTVQH15 (biểu thuế, giảm trừ gia cảnh từ kỳ tính thuế 2026); Luật Bảo hiểm xã hội 2024; Nghị định 161/2026/NĐ-CP (lương cơ sở); Nghị định 293/2025/NĐ-CP (lương tối thiểu vùng). Kết quả chỉ để tham khảo; bảng lương thực tế có thể khác do phụ cấp và thoả thuận riêng.
