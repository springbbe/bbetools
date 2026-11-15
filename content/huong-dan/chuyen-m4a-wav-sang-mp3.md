---
title: Cách chuyển M4A, WAV sang MP3 và chọn bitrate phù hợp
desc: Cách đổi file ghi âm M4A của iPhone, file WAV, OGG sang MP3 ngay trên trình duyệt, chọn bitrate bao nhiêu là đủ và khi nào nên chuyển sang mono.
tools: [convert-audio, video-to-mp3, trim-audio, merge-audio]
updated: 2026-11-15
---

Ghi âm trên iPhone ra file .m4a, phần mềm thu âm ra .wav, tin nhắn thoại tải về là .ogg; trong khi loa kéo, đầu ô tô hay hệ thống nộp bài nhiều nơi chỉ nhận MP3. Mở [Đổi định dạng âm thanh](tool:convert-audio), chọn một hay nhiều file, chọn MP3 và chất lượng rồi bấm "Đổi định dạng". File được chuyển ngay trên máy bạn, không tải lên đâu.

## Các bước chuyển đổi

1. Chọn một hoặc nhiều file âm thanh.
2. Chọn định dạng cần đổi sang: MP3, WAV, M4A hoặc OGG.
3. Chọn chất lượng (bitrate); chọn mono nếu muốn file nhẹ hơn.
4. Bấm "Đổi định dạng" rồi tải từng file hoặc tải tất cả dạng .zip.

## Bốn định dạng khác nhau thế nào?

| Định dạng | Nén | Ưu điểm | Hạn chế |
|---|---|---|---|
| MP3 | Có mất chi tiết | Mở được trên mọi thiết bị | Cùng chất lượng thì file to hơn M4A, OGG |
| M4A (AAC) | Có mất chi tiết | Nhỏ hơn MP3 ở cùng chất lượng, hợp iPhone | Thiết bị cũ có thể không đọc |
| OGG (Opus) | Có mất chi tiết | Nhẹ nhất, rất tốt cho giọng nói | Ít phần mềm phổ thông hỗ trợ |
| WAV | Không nén | Giữ nguyên chất lượng, dễ chỉnh sửa | Rất nặng, khoảng 10 MB mỗi phút |

## Chọn bitrate bao nhiêu?

Bitrate là lượng dữ liệu cho mỗi giây âm thanh, tính bằng kbps. Bitrate cao thì chi tiết hơn và file to hơn.

| Nội dung | Bitrate MP3 gợi ý | Dung lượng mỗi phút |
|---|---|---|
| Ghi âm giọng nói, bài giảng | 64–96 kbps | khoảng 0,5–0,7 MB |
| Podcast, sách nói | 96–128 kbps | khoảng 0,7–1 MB |
| Nhạc nghe thông thường | 192 kbps | khoảng 1,4 MB |
| Nhạc chất lượng cao | 320 kbps | khoảng 2,4 MB |

Cách tính nhanh: dung lượng (MB) ≈ bitrate (kbps) × số phút × 0,0075. Một bản ghi 60 phút ở 96 kbps nặng khoảng 43 MB.

## Tăng bitrate có làm hay hơn không?

Không. File MP3 128 kbps đổi lên 320 kbps vẫn chỉ có chất lượng của 128 kbps, vì phần chi tiết đã bỏ đi khi nén lần đầu không lấy lại được. File chỉ to lên.

Quy tắc: chọn bitrate bằng hoặc thấp hơn file gốc. Luôn giữ bản gốc và chuyển từ bản gốc, tránh chuyển nối tiếp MP3 sang M4A rồi lại sang MP3.

## Mono hay stereo?

- **Mono** gộp hai kênh trái, phải thành một. Hợp với ghi âm giọng nói, bài giảng, phỏng vấn. File WAV nhẹ đi một nửa; với MP3, mono cho phép dùng bitrate thấp hơn mà vẫn rõ.
- **Stereo** giữ hiệu ứng trái – phải. Nên giữ cho nhạc.

Ghi âm bằng điện thoại thường chỉ có một micro, nên chuyển sang mono không mất gì.

## Tình huống thường gặp

- **Ghi âm iPhone (M4A) gửi cho người dùng máy khác:** đổi sang MP3, 96 kbps, mono.
- **File WAV thu âm quá nặng để gửi email:** đổi sang MP3 192 kbps; dung lượng giảm khoảng bảy lần.
- **Tin nhắn thoại .ogg không mở được trên máy tính:** đổi sang MP3.
- **Cần file cho phần mềm dựng phim, chỉnh nhạc:** đổi sang WAV để phần mềm xử lý nhanh và không mất thêm chất lượng.

## Lấy tiếng từ video

Nguồn là video (MP4, MOV) thì dùng [Video sang MP3](tool:video-to-mp3) để tách phần tiếng.

## Câu hỏi thường gặp

**Đổi nhiều file một lần được không?** Được. Chọn nhiều file, tất cả được đổi theo cùng cài đặt và tải về trong một file .zip.

**Chỉ cần một đoạn trong file dài?** Cắt trước bằng [Cắt âm thanh](tool:trim-audio) rồi chọn định dạng xuất ngay ở đó.

**Muốn gộp nhiều file thành một rồi đổi định dạng?** Dùng [Ghép âm thanh](tool:merge-audio); công cụ cho chọn định dạng của file kết quả.
