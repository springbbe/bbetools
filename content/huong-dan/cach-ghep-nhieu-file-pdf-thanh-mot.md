---
title: Cách ghép nhiều file PDF thành một file
desc: Hướng dẫn nối nhiều file PDF thành một file ngay trên trình duyệt, sắp thứ tự, xoay file bị ngược, ghép cả ảnh chụp và xử lý khi file sau ghép quá nặng.
tools: [merge-pdf, organize-pdf, image-to-pdf, compress-pdf]
updated: 2026-11-13
---

Để ghép nhiều file PDF thành một, mở [Ghép PDF](tool:merge-pdf), chọn các file, sắp đúng thứ tự rồi bấm "Ghép PDF". Mọi việc diễn ra trong trình duyệt nên file không rời khỏi máy, và không có giới hạn cố định về số file.

## Các bước ghép

1. Chọn, kéo thả hoặc dán (Ctrl/⌘ + V) các file PDF cần ghép.
2. Kéo thả hoặc dùng nút ↑ ↓ để sắp thứ tự. File nào bị ngược thì bấm nút xoay ↻.
3. Bấm "Ghép PDF" rồi tải file kết quả.

Các trang được chép nguyên vẹn sang file mới: chữ vẫn chọn và tìm kiếm được, ảnh giữ nguyên độ nét.

## Ghép cả ảnh chụp vào hồ sơ

Hồ sơ thường gồm cả file PDF lẫn ảnh chụp giấy tờ. Làm theo hai bước:

1. Chuyển ảnh thành PDF bằng [Ảnh sang PDF](tool:image-to-pdf). Với ảnh chụp bằng điện thoại, chọn "Làm đẹp ảnh chụp giấy tờ" để cắt theo mép giấy và làm trắng nền.
2. Ghép file vừa tạo với các file PDF còn lại.

## Chỉ lấy vài trang của mỗi file

Khi không cần ghép trọn file, dùng [Sắp xếp trang PDF](tool:organize-pdf): chọn nhiều file cùng lúc, trang của mọi file hiện thành lưới, bạn kéo thả để đổi thứ tự, xoá trang thừa rồi bấm "Lưu PDF". Cách này tiện khi cần chèn một trang ký tên vào giữa hợp đồng.

## Sắp thứ tự hồ sơ sao cho dễ duyệt

Người nhận thường đọc theo một trình tự quen thuộc. Một cách xếp phổ biến:

1. Đơn hoặc tờ khai.
2. Giấy tờ tuỳ thân.
3. Giấy tờ chứng minh (hợp đồng, bằng cấp, sao kê…).
4. Phụ lục, tài liệu bổ sung.

Nếu nơi nhận có danh mục hồ sơ, xếp đúng theo danh mục đó và đặt tên file rõ ràng, ví dụ "HoSo_NguyenVanA.pdf".

## File có mật khẩu

Ghép được nếu bạn biết mật khẩu: trang sẽ hỏi mật khẩu khi mở file. File kết quả không còn mật khẩu, nên nếu nội dung nhạy cảm hãy đặt lại mật khẩu sau khi ghép.

## File sau khi ghép quá nặng

Dung lượng file ghép xấp xỉ tổng dung lượng các file thành phần. Nếu vượt giới hạn của nơi nhận:

- Nén bằng [Nén PDF](tool:compress-pdf); file scan và file nhiều ảnh giảm mạnh nhất.
- Tạo lại phần ảnh chụp ở chất lượng thấp hơn trước khi ghép.

## Ghép trên điện thoại

Công cụ chạy được trên trình duyệt điện thoại. Vì giới hạn thực tế là bộ nhớ của máy, trên điện thoại nên ghép tổng dung lượng dưới khoảng 200 MB mỗi lần.

## Câu hỏi thường gặp

**Ghép có làm hỏng chữ ký số trong file không?** Có. Chữ ký số gắn với nội dung của đúng file được ký; khi trang được chép sang file mới, chữ ký không còn hiệu lực. Hãy ghép xong rồi mới ký số.

**Mục lục (bookmark) và liên kết trong file có còn không?** Nội dung trang được giữ nguyên. Mục lục riêng của từng file có thể không được gộp lại; hãy mở file kết quả để kiểm tra nếu bạn cần mục lục.

**Các trang khác khổ giấy có ghép được không?** Được. Mỗi trang giữ nguyên kích thước gốc, nên file kết quả có thể vừa có trang dọc vừa có trang ngang.
