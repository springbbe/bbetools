---
title: Cách nén video để gửi qua Zalo, email không bị vỡ hình
desc: Cách giảm dung lượng video cho vừa giới hạn đính kèm 25 MB của Gmail hoặc gửi Zalo nhanh hơn, chọn độ phân giải, chuẩn nén và khi nào nên cắt ngắn trước.
tools: [compress-video, trim-video, video-to-gif]
updated: 2026-11-15
---

Video quay bằng điện thoại nặng khoảng 100–200 MB mỗi phút, trong khi Gmail chỉ cho đính kèm 25 MB. Để gửi được, mở [Nén video](tool:compress-video), chọn nén "Theo dung lượng", chọn mốc "25 MB · đính kèm Gmail" rồi bấm "Nén video". Video được nén ngay trên máy bạn, không tải lên máy chủ nào.

## Các bước

1. Chọn file video.
2. Ở mục "Nén theo", chọn "Theo chất lượng" (Cao, Cân bằng, Nhẹ nhất) hoặc "Theo dung lượng" rồi nhập số MB mong muốn.
3. Xem dòng dung lượng dự kiến ngay bên dưới.
4. Bấm "Nén video", xem lại rồi tải file MP4 về.

## Nén theo chất lượng hay theo dung lượng?

| Tình huống | Nên chọn |
|---|---|
| Nơi nhận có giới hạn cụ thể (đính kèm email, biểu mẫu nộp bài) | Theo dung lượng, nhập đúng số MB |
| Chỉ muốn file nhẹ hơn để gửi nhanh, đỡ tốn dung lượng | Theo chất lượng, mức "Cân bằng" |
| Lưu trữ lâu dài, còn muốn xem lại trên màn hình lớn | Theo chất lượng, mức "Cao" |
| Gửi xem nhanh trên điện thoại | Theo chất lượng, mức "Nhẹ nhất" |

## Dung lượng video phụ thuộc vào gì?

Dung lượng gần bằng **bitrate nhân với thời lượng**. Một video 3 phút muốn vừa 25 MB thì chỉ còn khoảng 1,1 Mbps cho cả hình và tiếng: đủ cho độ phân giải 720p với cảnh ít chuyển động, nhưng sẽ vỡ hình nếu giữ 4K.

Ba thứ quyết định hình có rõ ở một mức dung lượng cho trước:

- **Độ phân giải:** giảm từ 4K xuống 1080p hoặc 720p là cách hiệu quả nhất. Màn hình điện thoại hiếm khi cần hơn 1080p.
- **Số khung hình mỗi giây:** 30 là mức phổ biến; chọn "24 (nhẹ hơn)" khi cần ép dung lượng.
- **Chuẩn nén:** "H.264 (mở được mọi nơi)" an toàn nhất. "H.265 (nhỏ hơn)" chỉ hiện khi máy hỗ trợ, nhẹ hơn khoảng 30% ở cùng chất lượng nhưng máy và ứng dụng cũ có thể không mở được.

Mục "Độ phân giải" để "Tự động (khuyên dùng)" thì công cụ tự chọn mức hợp với dung lượng bạn nhập.

## Khi công cụ cảnh báo dung lượng quá thấp

Nếu số MB bạn nhập quá nhỏ so với độ dài video, công cụ báo hình sẽ bị mờ, vỡ. Lúc đó có ba cách:

1. Cắt lấy đúng đoạn cần gửi bằng [Cắt video](tool:trim-video). Cách cắt "Nhanh" chép nguyên hình và tiếng nên xong trong vài giây.
2. Chọn độ phân giải thấp hơn, ví dụ "360p (rất nhẹ)" cho video chỉ cần nghe rõ nội dung.
3. Bật "Bỏ tiếng" nếu video không cần âm thanh, hoặc giảm chất lượng tiếng ở mục "Âm thanh".

Đoạn rất ngắn để minh hoạ trong tin nhắn có thể đổi sang ảnh động bằng [Video sang GIF](tool:video-to-gif).

## Gửi qua Zalo, Messenger

Các ứng dụng nhắn tin thường tự nén lại video khi bạn gửi theo kiểu ảnh, video thông thường, nên người nhận thấy hình mờ hơn bản gốc. Tự nén trước xuống 720p hoặc 1080p giúp video tải lên nhanh, tốn ít dữ liệu di động, và bạn chủ động được chất lượng. Nếu cần người nhận có đúng file bạn gửi, hãy gửi dưới dạng file đính kèm.

## Nén mất bao lâu?

Công cụ dùng bộ mã hoá phần cứng của máy nên thường nhanh hơn thời lượng video; điện thoại đời cũ sẽ chậm hơn. Giữ trang mở trong lúc nén.

## Câu hỏi thường gặp

**Vì sao file nén xong không nhỏ hơn file gốc?** Video gốc đã được nén tốt, thường gặp ở video tải từ mạng. Hãy chọn độ phân giải thấp hơn hoặc mức "Nhẹ nhất".

**Nén có làm mất tiếng không?** Không. Tiếng được giữ ở dạng AAC; chỉ mất khi bạn bật "Bỏ tiếng".

**Video có bị tải lên mạng không?** Không. Việc nén chạy trong trình duyệt, file không rời khỏi máy bạn.
