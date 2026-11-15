---
title: Cách chia tiền nhóm khi đi ăn, du lịch cho công bằng
desc: Cách chia tiền khi nhiều người cùng ứng trước trong chuyến đi, bữa ăn, có người không tham gia một số khoản, và tính ai chuyển cho ai ít lần nhất.
tools: [split-bill, vietqr, percentage]
updated: 2026-11-15
---

Sau một chuyến đi, mỗi người ứng trước vài khoản và không ai nhớ ai nợ ai bao nhiêu. Thay vì cộng trừ bằng tay, mở [Chia tiền nhóm](tool:split-bill), thêm tên từng người, thêm từng khoản chi, rồi đọc mục "Ai chuyển cho ai". Bảng chia nằm ngay trong đường link, không cần tài khoản.

## Các bước

1. Thêm tên các thành viên trong nhóm.
2. Bấm "Thêm khoản chi": ai trả, bao nhiêu, chia cho những ai. Bỏ chọn người không tham gia khoản đó.
3. Xem ai cần chuyển cho ai với số lần chuyển ít nhất.
4. Bấm "QR" để tạo mã chuyển khoản, "Sao chép link" để gửi cả nhóm.

## Ví dụ: nhóm 4 người

An, Bình, Chi, Dũng đi chơi một ngày. Dũng về sớm nên không uống cà phê.

| Khoản chi | Người trả | Số tiền | Chia cho |
|---|---|---|---|
| Ăn tối | An | 1.200.000 | Cả 4 người |
| Taxi | Bình | 300.000 | Cả 4 người |
| Cà phê | Chi | 240.000 | An, Bình, Chi |

Phần mỗi người phải chịu: ăn tối 300.000, taxi 75.000, cà phê 80.000 (chỉ ba người).

| Thành viên | Đã trả | Phần phải chịu | Chênh lệch |
|---|---|---|---|
| An | 1.200.000 | 455.000 | +745.000 |
| Bình | 300.000 | 455.000 | −155.000 |
| Chi | 240.000 | 455.000 | −215.000 |
| Dũng | 0 | 375.000 | −375.000 |

Chênh lệch dương là được nhận lại, âm là phải trả thêm. Kết quả: Dũng chuyển An 375.000, Chi chuyển An 215.000, Bình chuyển An 155.000 đồng. Ba lần chuyển là xong.

## Vì sao không chuyển theo từng khoản?

Nếu làm theo từng khoản chi, Bình phải chuyển cho An tiền ăn, An lại chuyển cho Bình tiền taxi, và cứ thế với mỗi cặp. Cách tốt hơn là tính tổng: mỗi người đã trả dư hay thiếu bao nhiêu so với phần của mình, rồi ghép người thiếu với người dư. Nhóm n người chỉ cần tối đa n − 1 lần chuyển, dù có bao nhiêu khoản chi.

## Những tình huống hay gặp

- **Có người không tham gia một khoản:** bỏ chọn người đó ở phần chia cho những ai. Ví dụ người không uống bia không chịu tiền bia.
- **Một người trả hộ cả phần của người khác:** ghi như bình thường; công cụ tự bù trừ.
- **Cặp đôi tính chung:** thêm thành một thành viên, ví dụ "Hoa và Nam", rồi chọn họ ở mọi khoản chi của cả hai. Lưu ý lúc đó họ chỉ chịu một suất, nên cách này chỉ đúng khi nhóm thống nhất chia theo gia đình.
- **Tiền lẻ:** chọn "Làm tròn số tiền chuyển" đến 1.000 hoặc 10.000 đồng để dễ chuyển khoản.
- **Chia không đều theo suất:** tách khoản đó thành nhiều khoản nhỏ, mỗi khoản chia cho đúng nhóm người dùng.

## Chia đều hay chia theo phần dùng?

Không có cách nào đúng cho mọi nhóm; điều quan trọng là thống nhất từ đầu.

| Cách chia | Hợp khi |
|---|---|
| Chia đều tất cả | Nhóm thân, chênh lệch nhỏ, muốn nhanh |
| Chia theo khoản tham gia | Có người về sớm, không uống rượu bia, không đi một chặng |
| Chia theo món đã gọi | Chênh lệch lớn giữa các món; mất công ghi chép hơn |

Mẹo: cử một người ghi các khoản chi ngay lúc trả tiền, kèm ảnh hoá đơn trong nhóm chat. Ghi cuối chuyến đi thường thiếu.

## Phí dịch vụ và thuế trên hoá đơn

Hoá đơn nhà hàng thường có phí dịch vụ 5% và thuế GTGT. Nếu chia theo món, hãy cộng các khoản này vào theo tỉ lệ thay vì chia đều. Tính nhanh phần cộng thêm bằng [Tính phần trăm](tool:percentage). Nếu nhóm chia đều thì chỉ cần nhập tổng số tiền cuối cùng trên hoá đơn.

## Chuyển khoản nhanh

Bấm "QR" cạnh mỗi dòng chuyển tiền để mở [Tạo mã QR chuyển khoản (VietQR)](tool:vietqr) với số tiền điền sẵn. Người nhận nhập ngân hàng và số tài khoản của mình, gửi mã cho người chuyển; người chuyển quét là xong, không gõ nhầm số tiền.

## Câu hỏi thường gặp

**Dữ liệu chia tiền lưu ở đâu?** Ngay trong đường link. Không có tài khoản, không có máy chủ lưu bảng chia. Ai có link đều xem được, nên chỉ gửi trong nhóm.

**Sửa một khoản thì link có đổi không?** Có. Sau khi sửa, sao chép link mới và gửi lại cho nhóm.

**Chia tiền nhà, tiền điện hằng tháng được không?** Được. Thêm các khoản tiền nhà, điện, nước, mạng và người đã trả; cách tính giống hệt.
