---
title: Cách trộn thư từ danh sách Excel và mẫu Word
desc: Hướng dẫn tạo hàng loạt giấy mời, thư, giấy chứng nhận từ danh sách Excel và mẫu Word ngay trên trình duyệt, cách viết trường, đặt tên file và in một lần.
tools: [mail-merge, merge-excel, vn-encoding]
updated: 2026-11-13
---

Trộn thư là lấy một mẫu văn bản và một danh sách, rồi tạo cho mỗi người trong danh sách một bản đã điền sẵn thông tin. Với [Trộn thư](tool:mail-merge), bạn chọn file Excel và file mẫu Word, kiểm tra các trường rồi bấm "Trộn thư"; danh sách không rời khỏi máy.

## Chuẩn bị danh sách

Danh sách là file Excel hoặc CSV, **dòng đầu tiên là tên cột**:

| Họ tên | Chức vụ | Đơn vị | Giờ họp |
|---|---|---|---|
| Nguyễn Văn An | Trưởng phòng | Phòng Kế toán | 8 giờ 30 |
| Trần Thị Bình | Chuyên viên | Phòng Nhân sự | 8 giờ 30 |

Vài lưu ý để khỏi lỗi:

- Mỗi người một dòng, không gộp ô, không để dòng trống ở giữa.
- Tên cột ngắn gọn, không trùng nhau.
- Ngày tháng, số tiền nên nhập sẵn đúng dạng muốn in ra (ví dụ "15/11/2026", "1.250.000 đồng"), vì nội dung ô được đưa nguyên vào văn bản.

## Chuẩn bị mẫu Word

Soạn văn bản như bình thường. Ở chỗ cần điền, gõ tên cột trong hai cặp ngoặc nhọn:

Ví dụ: **Kính mời ông/bà {{Họ tên}}, {{Chức vụ}} {{Đơn vị}}, tới dự họp vào lúc {{Giờ họp}}.**

- Tên trường phải trùng tên cột; không phân biệt chữ hoa, chữ thường, có dấu hay không dấu.
- Viết kiểu «Họ tên» cũng được, và trường Mail Merge tạo sẵn bằng Word cũng dùng được.
- Định dạng đặt cho trường (đậm, nghiêng, màu) được giữ nguyên ở bản kết quả.

Không có mẫu Word? Chọn "Gõ mẫu văn bản" và soạn ngay trong công cụ.

## Các bước trộn

1. Chọn cùng lúc file danh sách và file mẫu Word.
2. Kiểm tra trường nào đã khớp với cột; trường chưa khớp thường do gõ sai tên.
3. Chọn cột dùng để đặt tên file, ví dụ cột Họ tên.
4. Xem trước từng người.
5. Bấm "Trộn thư".

## Chọn kiểu kết quả

| Kết quả | Dùng khi |
|---|---|
| Mỗi người một file Word (tải về dạng .zip) | Gửi riêng cho từng người qua email |
| Một file Word gộp | In tất cả trong một lần |
| PDF | Mẫu gõ trực tiếp trong công cụ |

Với mẫu Word, công cụ xuất file .docx chứ không xuất thẳng PDF, vì trình duyệt không dựng lại được bố cục Word thành PDF một cách chính xác. Muốn có PDF, mở file gộp bằng Word hoặc Google Docs rồi lưu thành PDF.

## Dùng cho những việc gì?

- Giấy mời họp, thư mời sự kiện.
- Giấy khen, giấy chứng nhận hoàn thành khoá học.
- Thông báo học phí, thông báo công nợ cho từng khách hàng.
- Hợp đồng, phụ lục theo mẫu với thông tin từng nhân viên.
- Nhãn tên, thẻ đại biểu.

## Lỗi thường gặp

- **Trường không được thay.** Tên trong ngoặc khác tên cột, hoặc dòng tiêu đề của Excel không nằm ở dòng đầu.
- **Ngày tháng hiện thành một con số.** Excel lưu ngày dưới dạng số; hãy định dạng cột đó thành văn bản và nhập lại, hoặc thêm một cột ghi ngày bằng chữ.
- **Mất số 0 ở đầu** của số điện thoại, mã số. Định dạng cột thành văn bản trước khi nhập.
- **Chữ lỗi dấu** khi danh sách là file CSV xuất từ phần mềm khác. Lưu lại dưới dạng Excel, hoặc sửa bằng [Chuyển mã Unicode ↔ TCVN3 ↔ VNI](tool:vn-encoding).

Danh sách nằm ở nhiều file? Gộp trước bằng [Gộp nhiều file Excel](tool:merge-excel).

## Kiểm tra trước khi gửi

- Xem trước ít nhất ba người: người đầu, người cuối và người có tên dài nhất để xem có bị xuống dòng xấu không.
- Trộn thử với vài dòng trước khi chạy cả danh sách.
- Danh sách có thông tin cá nhân (số điện thoại, lương, công nợ): gửi đúng file cho đúng người, không gửi file gộp cho cả nhóm.
