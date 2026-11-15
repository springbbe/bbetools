---
title: Cách tách file PDF, lấy riêng vài trang cần dùng
desc: Cách tách file PDF theo khoảng trang, mỗi trang một file hoặc chỉ lấy vài trang cần gửi, cách gõ khoảng trang, và chọn giữa tách, trích xuất hay xoá trang.
tools: [split-pdf, extract-pages-pdf, remove-pages-pdf, merge-pdf]
updated: 2026-11-15
---

Khi chỉ cần gửi vài trang trong một file PDF dài, mở [Tách PDF](tool:split-pdf), chọn file, gõ khoảng trang cần lấy, ví dụ 3-5, rồi bấm "Tách PDF". Các trang được chép nguyên vẹn sang file mới ngay trên máy bạn: chữ vẫn chọn được, ảnh giữ nguyên độ nét.

## Các bước

1. Chọn, kéo thả hoặc dán (Ctrl/⌘ + V) file PDF cần tách.
2. Chọn cách tách: theo khoảng trang, cứ mỗi N trang một file, hoặc bấm chọn từng trang.
3. Bấm "Tách PDF".
4. Tải từng file hoặc tải tất cả dạng .zip.

## Ba cách tách

| Cách | Ví dụ | Kết quả |
|---|---|---|
| Theo khoảng trang | 1-3, 4-8 | Hai file: trang 1–3 và trang 4–8 |
| Mỗi N trang | N = 10 với file 35 trang | Bốn file: 10, 10, 10 và 5 trang |
| Chọn trang | Bấm trang 2, 7, 9 | Một file gồm ba trang đó |

## Cách gõ khoảng trang

- Ngăn cách các khoảng bằng dấu phẩy: 1-3, 4-8. Mỗi khoảng thành một file.
- "8-" nghĩa là từ trang 8 đến hết.
- Một số đứng riêng là một trang: 5.
- Bật "Gộp các khoảng vào một file" nếu muốn mọi khoảng nằm chung một file.

Số trang ở đây là thứ tự trang trong file, bắt đầu từ 1. Nó có thể khác số in ở chân trang, vì bìa và mục lục thường không được đánh số.

## Mỗi trang thành một file

Chọn "Mỗi N trang" và để N = 1. Hoặc chọn "Chọn trang", bấm các trang cần lấy rồi bật "Mỗi trang đã chọn thành một file riêng". Cách này dùng khi một file scan chứa nhiều giấy tờ, mỗi tờ cần nộp riêng.

## Tách, trích xuất hay xoá trang?

Ba công cụ cho kết quả gần nhau; chọn theo việc bạn đang nghĩ tới:

- **Chia cả file thành nhiều phần:** [Tách PDF](tool:split-pdf).
- **Chỉ lấy vài trang thành một file mới:** [Trích xuất trang PDF](tool:extract-pages-pdf). Bấm vào các trang cần lấy, giữ Shift để chọn cả dãy, hoặc gõ số trang như 1, 3-5.
- **Giữ gần hết, chỉ bỏ vài trang thừa:** [Xoá trang PDF](tool:remove-pages-pdf), ví dụ bỏ trang trắng, trang quảng cáo.

## Tình huống thường gặp

- **Gửi riêng một chương của giáo trình:** tách theo khoảng trang của chương đó.
- **Chỉ gửi trang chữ ký của hợp đồng:** trích xuất trang cuối.
- **File quá lớn so với giới hạn gửi email:** tách thành các phần 20 trang rồi gửi nhiều thư.
- **Sao kê nhiều tháng trong một file:** tách theo khoảng trang của từng tháng.
- **Tách rồi cần ghép lại theo thứ tự khác:** dùng [Ghép PDF](tool:merge-pdf).

## File có mật khẩu

Nhập mật khẩu khi được hỏi. Các file tách ra không còn mật khẩu; nếu nội dung nhạy cảm, hãy đặt lại mật khẩu trước khi gửi.

## Trước khi gửi phần đã tách

Tách trang không xoá được thông tin nằm ngay trên trang giữ lại. Nếu trang đó còn số tài khoản, số căn cước mà người nhận không cần biết, hãy che trước khi gửi. Ngoài ra, mở file kết quả kiểm tra một lượt: đủ trang, đúng thứ tự, không dính trang của phần khác.

## Câu hỏi thường gặp

**Tách có làm giảm chất lượng không?** Không. Trang không bị chuyển thành ảnh hay nén lại.

**File gốc có bị thay đổi không?** Không. Công cụ tạo file mới; file gốc trên máy giữ nguyên.

**PDF vài trăm trang có tách được không?** Được. Việc tách chạy trên máy bạn nên không phụ thuộc tốc độ mạng.

**File có rời khỏi máy không?** Không. Mọi bước chạy trong trình duyệt.
