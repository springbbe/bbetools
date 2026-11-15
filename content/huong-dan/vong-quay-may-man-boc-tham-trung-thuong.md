---
title: Cách tạo vòng quay may mắn, bốc thăm trúng thưởng online
desc: Cách tổ chức bốc thăm công bằng cho tiệc tất niên, lớp học, minigame: vòng quay may mắn, quay số trúng thưởng, chia đội ngẫu nhiên, không cần cài đặt.
tools: [spin-wheel, random-number, team-picker, coin-dice]
updated: 2026-11-15
---

Tiệc tất niên cần bốc thăm trúng thưởng, lớp học cần gọi tên ngẫu nhiên, nhóm bạn cần quyết hôm nay ăn gì. Mở [Vòng quay may mắn](tool:spin-wheel), nhập danh sách mỗi dòng một mục rồi bấm "Quay". Danh sách chỉ lưu trong trình duyệt của bạn, không gửi đi đâu.

## Chọn công cụ theo tình huống

| Tình huống | Công cụ |
|---|---|
| Danh sách tên, món ăn, phần quà; cần hiệu ứng để cả phòng cùng xem | Vòng quay may mắn |
| Mỗi người có một số phiếu, vé; quay ra con số | Số ngẫu nhiên |
| Chia lớp, chia công ty thành các đội | Bốc thăm, chia đội |
| Chọn một trong hai, hoặc cần gieo xúc xắc | Tung xu & xúc xắc |

## Vòng quay may mắn

1. Nhập danh sách, mỗi dòng một mục, hoặc chọn một danh sách mẫu.
2. Bấm "Quay", bấm vào vòng hoặc bấm phím cách.
3. Bật "Bỏ mục trúng" khi bốc nhiều giải, để mỗi người chỉ trúng một lần.

Muốn một mục dễ trúng hơn, thêm dấu sao và một số sau tên. Ví dụ "Giải khuyến khích * 5" có cơ hội gấp năm lần mục thường, và ô trên vòng cũng to hơn tương ứng.

## Quay số trúng thưởng

Khi mỗi người tham dự cầm một vé có số, dùng [Số ngẫu nhiên](tool:random-number):

1. Nhập khoảng số, ví dụ từ 1 đến 250.
2. Nhập số lượng cần lấy cho mỗi lượt.
3. Bật "Quay số trúng thưởng" để số đã ra không ra lại ở lượt sau.
4. Nếu có số vé không phát ra, nhập vào ô "Bỏ các số" để chúng không được chọn.

## Chia đội ngẫu nhiên

Dùng [Bốc thăm, chia đội](tool:team-picker):

1. Nhập danh sách, mỗi dòng một tên.
2. Chọn chia theo số đội hoặc theo số người mỗi đội.
3. Nhập trưởng nhóm vào ô "Trưởng nhóm" nếu muốn mỗi đội có sẵn một người dẫn dắt; những người này được rải mỗi đội một người trước.
4. Bấm "Bốc lại" nếu cần, rồi sao chép hoặc tải kết quả.

Các đội chênh nhau nhiều nhất một người. Công cụ cũng bốc được thứ tự thuyết trình hoặc chọn ra vài người từ danh sách.

## Kết quả có công bằng không?

Cả bốn công cụ lấy số ngẫu nhiên từ bộ sinh số an toàn của trình duyệt (crypto.getRandomValues), loại dùng cho mật mã. Với vòng quay, kết quả được chọn **trước** khi vòng bắt đầu chạy; hiệu ứng quay chỉ để xem. Mọi mục có cơ hội như nhau, trừ khi bạn đặt trọng số.

Vì kết quả không đoán trước và không điều khiển được, người tổ chức cũng không thể "chỉnh" cho ai trúng.

## Tổ chức bốc thăm cho minh bạch

Công cụ ngẫu nhiên là điều kiện cần. Để người tham dự tin kết quả:

- **Chốt danh sách trước** và công bố số người, số vé tham gia.
- **Trình chiếu màn hình** lên tivi, máy chiếu để mọi người thấy danh sách và lượt quay.
- **Quay một lần cho mỗi giải.** Không quay lại vì "kết quả chưa đẹp".
- **Công bố luật từ đầu:** vắng mặt có được nhận giải không, một người có được trúng nhiều giải không.
- **Bốc trực tuyến** thì phát trực tiếp hoặc quay video màn hình liền mạch từ lúc nhập danh sách đến khi ra kết quả.
- **Kiểm tra tên trùng.** Hai người cùng tên cần thêm họ, phòng ban hoặc số thứ tự.

## Thứ tự bốc giải

Thông lệ là bốc từ giải nhỏ đến giải lớn, giải đặc biệt sau cùng để giữ không khí. Bật "Bỏ mục trúng" để người đã trúng giải nhỏ không còn trong danh sách; nếu muốn ai cũng còn cơ hội trúng giải đặc biệt thì tắt tuỳ chọn này trước lượt cuối.

## Ý tưởng dùng vòng quay

- **Lớp học:** gọi học sinh trả lời, chọn chủ đề thuyết trình, phân công trực nhật.
- **Gia đình, nhóm bạn:** hôm nay ăn gì, ai rửa bát, xem phim nào.
- **Cửa hàng:** vòng quay giảm giá cho khách, đặt trọng số để giải lớn hiếm hơn.
- **Họp nhóm:** chọn người ghi biên bản, thứ tự báo cáo.

## Lưu ý với chương trình khuyến mại

Doanh nghiệp tổ chức khuyến mại có yếu tố may rủi cho khách hàng phải tuân theo quy định về xúc tiến thương mại, trong đó có thủ tục thông báo hoặc đăng ký với cơ quan quản lý tuỳ quy mô. Hãy tìm hiểu quy định hiện hành trước khi triển khai rộng.

## Câu hỏi thường gặp

**Nhập được bao nhiêu mục trên vòng quay?** Vài chục mục vẫn đọc được tên trên vòng. Danh sách vài trăm người nên chuyển sang quay số để dễ nhìn hơn.

**Trình chiếu toàn màn hình được không?** Được, dùng chế độ toàn màn hình của trình duyệt (phím F11 trên Windows).

**Tắt máy rồi danh sách có mất không?** Danh sách được lưu trong trình duyệt của máy bạn nên lần sau mở lại vẫn còn.
