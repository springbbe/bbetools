---
title: Cách nén PDF để nộp hồ sơ trực tuyến
desc: Cách giảm dung lượng PDF cho vừa giới hạn của trang nộp hồ sơ và cách xử lý khi nén rồi vẫn quá lớn. Làm ngay trên trình duyệt, file không rời khỏi máy.
tools: [compress-pdf, grayscale-pdf, split-pdf, remove-pages-pdf, image-to-pdf, scan-document]
updated: 2026-11-13
---

Khi trang nộp hồ sơ báo file quá dung lượng, cách nhanh nhất là mở [Nén PDF](tool:compress-pdf), giữ mức nén "Vừa" (mức khuyên dùng) rồi tải file mới về. File scan và file nhiều ảnh thường giảm rất mạnh; file chỉ có chữ thì giảm ít vì vốn đã gọn.

## Trước khi nén: xem giới hạn là bao nhiêu

Mỗi trang có giới hạn riêng và thường ghi ngay cạnh nút tải lên. Hãy ghi lại ba thông tin:

- Dung lượng tối đa mỗi file.
- Tổng dung lượng cả bộ hồ sơ, nếu có.
- Định dạng được nhận (chỉ PDF hay cả ảnh).

## Các bước nén

1. Mở [Nén PDF](tool:compress-pdf), chọn hoặc kéo thả một hay nhiều file.
2. Chọn mức nén: "Nhẹ", "Vừa" hoặc "Mạnh". Mức "Vừa" cho file nhỏ gọn mà ảnh vẫn rõ khi xem trên máy.
3. Bấm "Nén PDF", xem dung lượng giảm bao nhiêu rồi tải về.

Công cụ chỉ nén lại ảnh bên trong file. Chữ và hình vẽ vector giữ nguyên nên vẫn sắc nét và vẫn chọn, tìm kiếm được.

## Nén rồi vẫn quá lớn thì làm gì?

Thử lần lượt các cách sau, từ ít ảnh hưởng tới nhiều ảnh hưởng:

1. **Chọn mức nén "Mạnh".** Mở lại file sau khi nén để chắc con dấu và chữ ký vẫn đọc rõ.
2. **Bỏ trang thừa.** Trang trắng, trang bìa, trang chụp trùng: xoá bằng [Xoá trang PDF](tool:remove-pages-pdf).
3. **Chuyển sang đen trắng.** Giấy tờ chỉ có chữ không cần màu; dùng [PDF đen trắng](tool:grayscale-pdf). Không nên làm với trang có con dấu đỏ nếu nơi nhận cần thấy màu dấu.
4. **Tách thành nhiều file.** Nếu trang cho nộp nhiều file, chia theo từng loại giấy tờ bằng [Tách PDF](tool:split-pdf).
5. **Tạo lại file từ ảnh gốc.** Nếu PDF được ghép từ ảnh chụp điện thoại, làm lại bằng [Ảnh sang PDF](tool:image-to-pdf) với chất lượng "Nhẹ".

## Chụp giấy tờ sao cho file nhẹ ngay từ đầu

Ảnh chụp bằng điện thoại thường nặng vài MB mỗi tấm, ghép mười trang là vượt giới hạn. Dùng [Scan tài liệu bằng camera](tool:scan-document):

- Đặt giấy trên nền tối, đủ sáng, chụp thẳng từ trên xuống.
- Chọn bộ lọc "Đen trắng" cho văn bản chữ, "Màu" cho giấy có con dấu hoặc hình ảnh.
- Công cụ tự cắt theo mép giấy và làm trắng nền, nên file vừa nhẹ vừa dễ đọc.

## Vì sao nên nén ngay trên máy?

Hồ sơ thường chứa căn cước, hộ khẩu, hợp đồng, sao kê. Các công cụ ở đây chạy hoàn toàn trong trình duyệt: file không rời khỏi máy bạn, không có bản sao nào nằm trên máy chủ.

## Câu hỏi thường gặp

**Nén có làm mất chữ ký số không?** Có. Mọi thay đổi nội dung file sau khi ký số đều làm chữ ký mất hiệu lực. Hãy nén trước, ký sau.

**File có mật khẩu thì sao?** Cần mở khoá trước khi nén. Nếu bạn biết mật khẩu, công cụ sẽ hỏi khi mở file.
