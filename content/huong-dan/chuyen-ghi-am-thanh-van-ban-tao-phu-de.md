---
title: Cách chuyển file ghi âm thành văn bản, tạo phụ đề SRT
desc: Cách chuyển file ghi âm cuộc họp, bài giảng, video thành văn bản tiếng Việt hoặc phụ đề .srt ngay trên máy, chọn mô hình nào và cách ghi âm để ít sai nhất.
tools: [speech-to-text, voice-recorder, video-to-mp3, trim-audio]
updated: 2026-11-15
---

Để chuyển file ghi âm cuộc họp hoặc bài giảng thành chữ, mở [Giọng nói thành văn bản, tạo phụ đề](tool:speech-to-text), chọn file, chọn ngôn ngữ nói trong file rồi bấm "Chuyển thành văn bản". Mô hình nhận dạng giọng nói Whisper chạy ngay trên máy bạn, nên nội dung cuộc họp không bị gửi đi đâu.

## Các bước

1. Chọn hoặc kéo thả file ghi âm (MP3, M4A, WAV…) hoặc file video.
2. Chọn mô hình: "Nhanh", "Chính xác" hoặc "Tốt nhất", và ngôn ngữ nói trong file.
3. Bấm "Chuyển thành văn bản". Lần đầu trình duyệt cần tải mô hình về.
4. Đọc lại, sao chép văn bản hoặc tải file .txt, .srt, .vtt.

## Chọn mô hình nào?

| Mô hình | Dung lượng tải lần đầu | Hợp với |
|---|---|---|
| Nhanh | Khoảng 80 MB | Điện thoại, thử nhanh; sai chính tả nhiều hơn |
| Chính xác | Khoảng 250 MB | Mọi trình duyệt trên máy tính |
| Tốt nhất | Khoảng 570 MB | Tiếng Việt đúng nhất; cần Chrome hoặc Edge có WebGPU |

Trên máy tính đời mới, mỗi phút ghi âm mất khoảng 15 giây với "Tốt nhất" hoặc "Nhanh", gần 1 phút với "Chính xác"; điện thoại chậm hơn vài lần. Hãy để tab mở cho tới khi xong.

Mô hình được lưu trong bộ nhớ của trình duyệt để lần sau không phải tải lại. Khi cần giải phóng dung lượng, bấm "Xoá mô hình" dưới phần chọn mô hình.

## Ghi âm thế nào để ít sai?

Chất lượng bản ghi quyết định phần lớn độ chính xác:

- Đặt điện thoại hoặc micro gần người nói, tránh để cạnh quạt, điều hoà, bàn phím.
- Trong cuộc họp, nhắc mọi người nói lần lượt; hai người nói chồng lên nhau là chỗ dễ sai nhất.
- Tắt nhạc nền. Đoạn chỉ có nhạc hoặc im lặng sẽ được bỏ qua.
- Chọn đúng ngôn ngữ nói trong file trước khi chạy.

Chưa có bản ghi thì dùng [Ghi âm](tool:voice-recorder), bật "Lọc ồn, khử tiếng vọng" khi ghi giọng nói rồi tải về M4A hoặc MP3.

## File quá dài hoặc là video nặng

Công cụ nhận thẳng file video. Nếu video nặng vài GB, tách riêng phần tiếng bằng [Video sang MP3](tool:video-to-mp3) trước sẽ nhẹ máy hơn. Chỉ cần một đoạn của buổi họp thì cắt bằng [Cắt âm thanh](tool:trim-audio) rồi mới chuyển thành chữ.

## Dùng file phụ đề .srt

File .srt gồm từng câu kèm thời điểm bắt đầu và kết thúc, dùng được ở hầu hết phần mềm:

- **YouTube:** Phụ đề → Thêm ngôn ngữ → Tải tệp lên.
- **VLC, MPC:** đặt file .srt cùng thư mục và cùng tên với video.
- **CapCut, Premiere:** nhập phụ đề từ file .srt rồi chỉnh kiểu chữ.

File .vtt dùng cho video nhúng trên trang web.

## Những chỗ cần đọc lại

Không công cụ nhận dạng nào đúng hoàn toàn. Trước khi gửi biên bản hoặc đăng phụ đề, hãy rà:

- Tên riêng, tên công ty, tên sản phẩm.
- Con số, ngày tháng, số tiền.
- Từ chuyên môn và từ tiếng Anh xen trong câu tiếng Việt.
- Đoạn nhiều người nói cùng lúc hoặc nói nhỏ.

## Câu hỏi thường gặp

**Có giới hạn độ dài file không?** Không có giới hạn cố định; file càng dài thì chạy càng lâu và càng tốn bộ nhớ. Với buổi họp vài giờ, nên chia thành từng phần.

**Có phân biệt được ai đang nói không?** Không. Kết quả là văn bản liền mạch theo thời gian; hãy tự thêm tên người nói khi soạn biên bản.

**Nội dung ghi âm có bị gửi lên mạng không?** Không. Chỉ có mô hình được tải về một lần; file của bạn được xử lý trong trình duyệt.
