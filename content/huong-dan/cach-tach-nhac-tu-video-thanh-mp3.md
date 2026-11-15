---
title: Cách tách nhạc, tách tiếng từ video thành file MP3
desc: Cách lấy phần âm thanh của video MP4, MOV thành file MP3 hoặc M4A, chỉ lấy một đoạn, chọn chất lượng phù hợp và khi nào nên giữ nguyên tiếng gốc.
tools: [video-to-mp3, trim-audio, convert-audio]
updated: 2026-11-15
---

Muốn lấy bài hát, bài giảng hoặc lời thoại trong một video ra file âm thanh, mở [Video sang MP3](tool:video-to-mp3), chọn video rồi bấm "Tách lấy âm thanh". Video được đọc dần từng phần trên máy bạn, nên file vài GB vẫn làm được và không phải tải lên đâu cả.

## Các bước

1. Chọn file video (MP4, MOV, WebM, MKV).
2. Chọn MP3 và chất lượng, hoặc M4A để giữ nguyên tiếng gốc.
3. Bật "Chỉ lấy một đoạn" nếu chỉ cần một phần.
4. Bấm "Tách lấy âm thanh", nghe thử rồi tải về.

## Chọn MP3, M4A hay WAV?

| Định dạng | Ưu điểm | Lưu ý |
|---|---|---|
| MP3 | Mở được trên mọi máy, mọi ứng dụng | Phải mã hoá lại nên mất thêm chút thời gian |
| M4A | Tiếng của phần lớn video MP4 được chép nguyên, rất nhanh, không giảm chất lượng | Một số máy nghe nhạc đời cũ không đọc |
| WAV | Không nén, hợp để đưa vào phần mềm dựng | Rất nặng, khoảng 10 MB mỗi phút |

Phần lớn video MP4 có tiếng dạng AAC. Chọn M4A thì không có bước mã hoá lại, nên đây là lựa chọn tốt nhất khi bạn chỉ cần nghe trên điện thoại hoặc máy tính đời mới.

## Chất lượng MP3 bao nhiêu là đủ?

- **Giọng nói, bài giảng, podcast:** 96–128 kbps là rõ.
- **Nhạc nghe hằng ngày:** 192 kbps.
- **Nhạc cần giữ chi tiết:** 320 kbps.

Chọn bitrate cao hơn chất lượng tiếng gốc không làm âm thanh hay hơn, chỉ làm file to hơn. Video quay bằng điện thoại hoặc tải từ mạng hiếm khi có tiếng tốt hơn mức 192 kbps.

## Chỉ lấy một đoạn

Bật "Chỉ lấy một đoạn" rồi nhập thời gian theo phút:giây, ví dụ 1:05. Bỏ trống ô "Đến" để lấy tới hết video.

Muốn chọn đoạn bằng mắt trên dạng sóng, thêm hiệu ứng tăng dần ở đầu và giảm dần ở cuối, hãy tách cả bài trước rồi mở [Cắt âm thanh](tool:trim-audio). Công cụ này cũng xuất được M4R làm nhạc chuông iPhone.

## Đã có file âm thanh nhưng sai định dạng

Nếu thiết bị của bạn không đọc được M4A hoặc OGG, đổi sang MP3 bằng [Đổi định dạng âm thanh](tool:convert-audio). Công cụ nhận nhiều file một lần, cho chọn chất lượng và chuyển sang mono để file bài giảng nhẹ đi.

## Lưu ý về bản quyền

Tách tiếng từ video do bạn quay hoặc được phép sử dụng thì không có gì phải lo. Nhạc và video của người khác thường có bản quyền: nghe cá nhân khác với đăng lại hay dùng trong video của bạn. Trước khi dùng một bản nhạc cho mục đích công khai, hãy kiểm tra giấy phép của nó.

## Câu hỏi thường gặp

**Video không có tiếng thì sao?** Công cụ sẽ báo video này không có tiếng; không có gì để tách.

**Tách xong tiếng có bị nhỏ đi không?** Không. Âm lượng giữ nguyên như trong video.

**Tách tiếng từ video trên điện thoại được không?** Được. Mở trang bằng trình duyệt trên điện thoại rồi chọn video trong thư viện.

**File có rời khỏi máy không?** Không. Mọi bước chạy trong trình duyệt.
