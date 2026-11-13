---
title: Cách tính lãi vay trả góp, dư nợ giảm dần và trả đều
desc: So sánh hai cách trả nợ vay là dư nợ giảm dần và trả đều hằng tháng: công thức, ví dụ vay 500 triệu đồng trong 5 năm và cách nhận biết lãi suất phẳng.
tools: [loan-calculator, compound-interest]
updated: 2026-11-13
---

Vay 500 triệu đồng trong 5 năm, lãi suất 10%/năm: trả theo dư nợ giảm dần thì tổng lãi khoảng 127,1 triệu đồng, trả đều hằng tháng thì khoảng 137,4 triệu đồng. Nhập khoản vay của bạn vào [Tính lãi vay trả góp](tool:loan-calculator) để xem lịch trả nợ từng kỳ.

## Hai cách trả phổ biến

**Dư nợ giảm dần (gốc đều).** Tiền gốc chia đều cho các tháng. Lãi mỗi tháng tính trên số còn nợ, nên khoản trả lớn nhất ở tháng đầu rồi giảm dần.

**Trả đều hằng tháng.** Mỗi tháng trả một số tiền như nhau. Những tháng đầu phần lớn là lãi, gốc giảm chậm, nên tổng lãi cao hơn.

## Công thức

Lãi suất tháng r = lãi suất năm ÷ 12. Số tiền vay P, số tháng n.

- Dư nợ giảm dần: gốc mỗi tháng = P ÷ n; lãi tháng = dư nợ đầu tháng × r.
- Trả đều: khoản trả mỗi tháng = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1).

## Ví dụ: vay 500 triệu đồng, 60 tháng, 10%/năm

| | Dư nợ giảm dần | Trả đều |
|---|---|---|
| Trả tháng đầu | 12.500.000 đồng | 10.623.522 đồng |
| Trả tháng cuối | khoảng 8.403.000 đồng | khoảng 10.624.000 đồng |
| Tổng lãi | khoảng 127.083.000 đồng | khoảng 137.411.000 đồng |

Tháng đầu theo cách dư nợ giảm dần: gốc 8.333.333 đồng, lãi 500.000.000 × 10% ÷ 12 = 4.166.667 đồng.

## Nên chọn cách nào?

| Bạn ưu tiên | Cách phù hợp |
|---|---|
| Tổng lãi thấp nhất | Dư nợ giảm dần |
| Khoản trả cố định, dễ lập kế hoạch | Trả đều |
| Thu nhập hiện tại còn thấp, sẽ tăng dần | Trả đều |
| Có khả năng trả nhiều ngay từ đầu | Dư nợ giảm dần |

## Cẩn thận với lãi suất phẳng

Một số khoản vay tiêu dùng, trả góp mua hàng quảng cáo lãi suất tính trên **dư nợ gốc ban đầu** trong suốt kỳ hạn (thường gọi là lãi phẳng). Con số nghe thấp nhưng thực tế cao hơn nhiều.

Cùng ví dụ trên, nếu 10%/năm là lãi phẳng thì tổng lãi là 500.000.000 × 10% × 5 = 250.000.000 đồng, gần gấp đôi cách tính trên dư nợ giảm dần. Khi được tư vấn, hãy hỏi rõ:

- Lãi tính trên dư nợ gốc ban đầu hay dư nợ còn lại?
- Tổng số tiền phải trả đến hết kỳ hạn là bao nhiêu?
- Có phí bảo hiểm khoản vay, phí hồ sơ, phí thu hộ không?

So sánh các khoản vay bằng tổng số tiền phải trả, không chỉ bằng con số lãi suất.

## Lãi suất ưu đãi và thả nổi

Nhiều gói vay mua nhà có lãi suất ưu đãi trong 6 đến 24 tháng đầu, sau đó thả nổi theo công thức của ngân hàng. Trong công cụ, bật lãi suất ưu đãi, nhập số tháng và mức ưu đãi, rồi nhập lãi suất dự kiến sau ưu đãi. Hãy thử thêm một kịch bản lãi suất cao hơn 2–3 điểm phần trăm để biết mình có chịu được không.

## Trả nợ trước hạn

Trả trước giúp giảm lãi, nhưng hợp đồng thường có phí trả nợ trước hạn tính trên số tiền trả trước, cao nhất ở những năm đầu. Trước khi tất toán, so sánh phí này với số lãi tiết kiệm được.

## Vì sao kết quả lệch với ngân hàng vài nghìn đồng?

Ngân hàng thường tính lãi theo số ngày thực tế của từng tháng và có quy tắc làm tròn riêng, nên mỗi kỳ có thể lệch đôi chút so với cách tính tròn tháng. Lịch trả nợ chính thức là bản ngân hàng cung cấp kèm hợp đồng; bạn có thể tải bảng từ công cụ về dạng CSV để đối chiếu.

Muốn xem tiền nhàn rỗi sinh lời thế nào nếu gửi thay vì trả nợ trước, thử [Lãi kép](tool:compound-interest).
