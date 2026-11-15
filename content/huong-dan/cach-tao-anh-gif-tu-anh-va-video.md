---
title: Cách tạo ảnh GIF từ video hoặc từ nhiều ảnh
desc: Cách làm ảnh động GIF từ một đoạn video hoặc từ nhiều ảnh ngay trên trình duyệt, và cách chọn kích thước, số khung hình để file GIF không quá nặng.
tools: [video-to-gif, gif-maker, trim-video, compress-video]
updated: 2026-11-15
---

Có hai đường để ra một ảnh GIF: cắt từ video, hoặc ghép từ nhiều ảnh tĩnh. Từ video, mở [Video sang GIF](tool:video-to-gif), chọn đoạn vài giây rồi bấm "Tạo GIF". Từ ảnh, mở [Tạo GIF từ ảnh](tool:gif-maker), chọn từ hai ảnh trở lên và chỉnh thời gian mỗi khung. Cả hai đều chạy trên máy bạn, video và ảnh không bị tải lên.

## Tạo GIF từ video

1. Chọn file video.
2. Kéo hai tay nắm trên dải ảnh để chọn đoạn cần lấy. Nên ngắn, vài giây.
3. Chọn bề rộng, số khung hình mỗi giây và tốc độ (0,5×, 1×, 1,5×, 2×).
4. Bấm "Tạo GIF" rồi tải về.

## Tạo GIF từ nhiều ảnh

1. Chọn, kéo thả hoặc dán từ 2 ảnh trở lên; kéo thả để đổi thứ tự khung hình.
2. Chỉnh thời gian mỗi khung, kích thước, có lặp lại hay không, có chạy xuôi rồi ngược hay không.
3. Xem trước chuyển động, bấm "Tạo GIF" rồi tải về.

Ảnh khác tỉ lệ thì chọn "Giữ trọn ảnh" (thấy đủ ảnh, phần trống tô màu nền) hoặc "Cắt cho đầy khung" (ảnh phủ kín, mép thừa bị cắt).

## Vì sao GIF nặng hơn cả video gốc?

GIF là định dạng từ năm 1987: mỗi khung chỉ có tối đa 256 màu và nén kém hơn video hiện đại rất nhiều. Một đoạn video 5 giây nặng 1 MB có thể thành GIF 10 MB.

Ba thứ quyết định dung lượng, theo mức ảnh hưởng:

| Yếu tố | Mức nên chọn | Ghi chú |
|---|---|---|
| Bề rộng | 320–480 px | Giảm một nửa bề rộng, dung lượng giảm khoảng bốn lần |
| Độ dài | 2–6 giây | Dung lượng tăng đều theo số giây |
| Số khung hình/giây | 8–10 | 15–20 mượt hơn nhưng nặng hơn nhiều; 5 thì giật |

Nếu vẫn nặng, chọn bảng màu "Nhẹ hơn".

## Mức cài đặt gợi ý

| Mục đích | Bề rộng | Khung hình/giây | Độ dài |
|---|---|---|---|
| Ảnh phản ứng gửi trong tin nhắn | 320 px | 10 | 2–3 giây |
| Minh hoạ thao tác trong tài liệu hướng dẫn | 480–640 px | 8–10 | 5–10 giây |
| Ảnh động trong email | 480 px | 8 | 3–5 giây |

## Màu trông khác ảnh gốc?

Do giới hạn 256 màu mỗi khung. Cảnh quay thật có nhiều vùng chuyển màu mượt (bầu trời, da người) sẽ hơi loang. Hình minh hoạ, chữ, ảnh chụp màn hình thì gần như giữ nguyên vì vốn ít màu.

## Có nên dùng GIF không?

GIF tự chạy ở mọi nơi, không cần bấm phát, dán được vào email, tài liệu, tin nhắn. Đó là lý do nó vẫn được dùng.

Nhưng nếu nơi đăng nhận video (mạng xã hội, website), một file MP4 ngắn sẽ nét hơn và nhẹ hơn nhiều lần. Khi đó hãy cắt đoạn cần bằng [Cắt video](tool:trim-video) và giảm dung lượng bằng [Nén video](tool:compress-video) thay vì chuyển sang GIF.

## Mẹo làm GIF đẹp

- **Chọn điểm đầu và điểm cuối giống nhau** để vòng lặp không bị giật.
- **Với GIF từ ảnh, dùng "chạy xuôi–ngược"** để chuyển động quay về điểm đầu một cách tự nhiên.
- **Giữ máy cố định khi quay.** Nền đứng yên giúp GIF nén tốt hơn hẳn so với cảnh rung lắc.
- **Tăng tốc 1,5× hoặc 2×** cho thao tác chậm; GIF vừa ngắn vừa nhẹ hơn.

## Câu hỏi thường gặp

**GIF có tiếng không?** Không. Định dạng GIF không chứa âm thanh.

**Làm GIF nền trong suốt được không?** GIF chỉ có trong suốt kiểu bật/tắt từng điểm ảnh, viền thường bị răng cưa. Nên dùng nền màu trùng với nơi sẽ đặt ảnh.

**Tạo GIF trên điện thoại được không?** Được. Hãy chọn đoạn ngắn và bề rộng nhỏ để chạy nhanh, đỡ tốn bộ nhớ.
