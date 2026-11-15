---
title: Cách tách file Excel thành nhiều file, nhiều sheet theo cột
desc: Cách tách một bảng Excel thành nhiều sheet hoặc nhiều file theo giá trị của một cột như chi nhánh, phòng ban, lớp học, không cần công thức hay macro.
tools: [split-excel, merge-excel, excel-viewer, mail-merge]
updated: 2026-11-15
---

Bảng lương cả công ty cần gửi riêng cho từng phòng, danh sách đơn hàng cần chia theo chi nhánh, bảng điểm cần tách theo lớp. Lọc rồi chép dán từng phần sang file mới vừa lâu vừa dễ sót dòng. Mở [Tách Excel theo cột](tool:split-excel), chọn file, chọn cột để tách rồi bấm "Tách file". File được xử lý ngay trên trình duyệt, không tải lên đâu.

## Các bước tách

1. Chọn file Excel hoặc CSV.
2. Chọn sheet chứa dữ liệu.
3. Chọn cột để tách; công cụ tự gợi ý cột phù hợp. Danh sách các phần và số dòng của từng phần hiện ngay.
4. Chọn dạng kết quả: một file nhiều sheet, nhiều file Excel hoặc nhiều file CSV.
5. Bấm "Tách file" rồi tải về.

## Ví dụ

Bảng gốc có cột "Chi nhánh":

| Mã đơn | Khách hàng | Chi nhánh | Doanh thu |
|---|---|---|---|
| DH001 | Công ty An Phát | Hà Nội | 12.500.000 |
| DH002 | Cửa hàng Minh Tâm | Đà Nẵng | 4.200.000 |
| DH003 | Công ty Hoà Bình | Hà Nội | 8.900.000 |
| DH004 | Anh Tuấn | TP. Hồ Chí Minh | 2.150.000 |

Tách theo cột "Chi nhánh" cho ba phần: Hà Nội (2 dòng), Đà Nẵng (1 dòng), TP. Hồ Chí Minh (1 dòng). Mỗi phần giữ đủ dòng tiêu đề và mọi cột.

## Chọn dạng kết quả

| Dạng | Hợp khi |
|---|---|
| 1 file, nhiều sheet | Cần xem lại tất cả trong một file, mỗi phần một trang tính |
| Nhiều file Excel | Gửi riêng từng phần cho từng chi nhánh, phòng ban |
| Nhiều file CSV | Nhập vào phần mềm khác |

Khi gửi dữ liệu nhạy cảm như bảng lương, dùng "Nhiều file Excel" để mỗi nơi chỉ nhận phần của mình.

## Chuẩn bị bảng trước khi tách

- **Dòng đầu là tiêu đề.** Giữ bật "Dòng đầu là tiêu đề" để mỗi file, mỗi sheet đều có dòng tiêu đề và bộ lọc.
- **Không gộp ô trong cột dùng để tách.** Ô gộp chỉ có giá trị ở dòng đầu; các dòng dưới bị coi là trống. Bỏ gộp và điền đủ giá trị trước.
- **Bỏ dòng tổng cộng ở cuối bảng.** Dòng này không thuộc phần nào và sẽ rơi vào nhóm "Trống".
- **Một bảng trên một sheet.** Dòng trống xen giữa, bảng phụ bên cạnh dễ gây nhầm.

## Giá trị viết không thống nhất

"Hà Nội", "hà nội" và "Hà Nội " (thừa dấu cách) được gom chung một phần: công cụ bỏ khoảng trắng thừa và không phân biệt hoa thường. Ô trống gom vào phần "Trống".

Tuy nhiên, "Hà Nội" và "HN" vẫn là hai giá trị khác nhau. Nhìn danh sách các phần ở bước 3: nếu thấy nhiều phần hơn dự kiến, hãy sửa cho thống nhất trong file gốc rồi tách lại.

## Tách theo hai cột

Công cụ tách theo một cột mỗi lần. Muốn tách theo cả chi nhánh lẫn tháng, thêm một cột phụ trong Excel ghép hai giá trị, ví dụ công thức =C2&" - "&E2, rồi tách theo cột phụ đó.

## Công thức và định dạng

Kết quả chứa **giá trị** của các ô. Ô có công thức được ghi thành giá trị đã tính; màu nền, viền, độ rộng cột của bảng gốc không được giữ. Với báo cáo cần trình bày đẹp, hãy định dạng lại sau khi tách hoặc dán vào mẫu có sẵn.

## Việc liên quan

- Làm ngược lại, gộp nhiều file về một bảng: [Gộp nhiều file Excel](tool:merge-excel).
- Xem nhanh, lọc và tìm trong file mà không cần cài Excel: [Xem file Excel/CSV](tool:excel-viewer).
- Từ một bảng tạo ra nhiều thư, phiếu riêng cho từng dòng: [Trộn thư](tool:mail-merge).

## Câu hỏi thường gặp

**Tách được file bao nhiêu dòng?** Vài chục nghìn dòng chạy tốt trên máy tính thông thường. File rất lớn phụ thuộc bộ nhớ của máy; trên điện thoại nên dùng file nhỏ hơn.

**Tên file, tên sheet đặt theo gì?** Theo giá trị của cột dùng để tách, ví dụ "Hà Nội", "Đà Nẵng".

**File .xls cũ có dùng được không?** Được. Công cụ đọc .xlsx, .xls và CSV.
