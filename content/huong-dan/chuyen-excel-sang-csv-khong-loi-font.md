---
title: Chuyển Excel sang CSV không lỗi font tiếng Việt
desc: Vì sao file CSV mở bằng Excel bị lỗi chữ tiếng Việt, mất số 0 đầu số điện thoại, và cách chuyển Excel sang CSV UTF-8, CSV sang Excel cho đúng.
tools: [excel-csv, excel-viewer, vn-encoding, json-excel]
updated: 2026-11-15
---

File CSV mở bằng Excel hiện chữ kiểu "Nguyá»…n" thay vì "Nguyễn" là do thiếu ký hiệu BOM ở đầu file. Để có file CSV mở lên đúng tiếng Việt, dùng [Excel ↔ CSV](tool:excel-csv): chọn file Excel, để bật "Thêm BOM UTF-8" rồi bấm "Chuyển đổi". File được xử lý trên máy bạn, không tải lên máy chủ nào.

## Các bước

1. Chọn một hoặc nhiều file Excel (.xlsx, .xls, .ods) hoặc CSV.
2. Excel sang CSV: chọn lấy sheet nào và dấu phân cách. CSV sang Excel: bật "Nhận dạng số" nếu cần tính toán.
3. Bấm "Chuyển đổi".
4. Tải từng file hoặc tải tất cả dạng .zip.

## Vì sao CSV bị lỗi font?

CSV là file chữ thuần, không ghi kèm bảng mã. Khi mở, Excel phải đoán. Nếu file là UTF-8 nhưng không có BOM (ba byte đánh dấu ở đầu file), Excel đoán sai sang bảng mã cũ và chữ có dấu thành ký tự lạ.

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| "Nguyá»…n", "Ä‘á»“ng" | UTF-8 không có BOM | Chuyển lại với "Thêm BOM UTF-8" |
| Mọi thứ dồn vào một cột | Sai dấu phân cách | Đổi giữa dấu phẩy và chấm phẩy |
| 0912345678 thành 912345678 | Excel coi là số | Chuyển CSV sang Excel bằng công cụ, giữ dạng chữ |
| Số CCCD thành 1,23457E+11 | Số dài hơn 15 chữ số | Như trên |
| Chữ kiểu "NguyÔn V¨n" | Dữ liệu gõ bằng font TCVN3 cũ | Chuyển mã sang Unicode trước |

Trường hợp cuối cùng không phải lỗi của CSV: dữ liệu gốc dùng bảng mã cũ. Chuyển bằng [Chuyển mã Unicode ↔ TCVN3 ↔ VNI](tool:vn-encoding).

## Dấu phẩy hay chấm phẩy?

Tên là "comma-separated" nhưng dấu phân cách còn tuỳ cài đặt vùng của máy.

- **Máy đặt định dạng Việt Nam:** dấu phẩy là dấu thập phân, nên Excel dùng dấu chấm phẩy để tách cột. Chọn "Chấm phẩy ;" nếu file dành cho người mở bằng Excel trên máy như vậy.
- **Google Sheets, phần mềm kế toán, trang quản trị web, lập trình:** thường dùng dấu phẩy. Chọn "Dấu phẩy ,".

Nếu hệ thống nhận file có ghi rõ yêu cầu, làm theo yêu cầu đó. Khi dữ liệu tải lên một phần mềm khác chứ không mở bằng Excel, có thể tắt "Thêm BOM UTF-8" nếu phần mềm đó báo lỗi ở ô đầu tiên.

## File Excel có nhiều sheet

CSV chỉ chứa được một bảng. Ở mục "Lấy sheet", chọn "Chỉ sheet đầu" hoặc "Mọi sheet"; khi lấy mọi sheet, mỗi sheet thành một file CSV riêng.

CSV cũng không giữ được công thức, màu, độ rộng cột, ô gộp. Ô có công thức được ghi bằng giá trị đã tính. Hãy giữ file Excel gốc để sửa về sau.

## Chuyển CSV sang Excel không mất số 0

Mở thẳng CSV bằng Excel, cột số điện thoại mất số 0 đầu và số căn cước 12 chữ số bị làm tròn. Chuyển bằng công cụ thì:

- Bật "Nhận dạng số": ô toàn chữ số thành số để tính toán được.
- Số có 0 ở đầu (điện thoại, mã hàng) và số dài hơn 15 chữ số (CCCD, số tài khoản) vẫn giữ dạng chữ.
- Bật "Gộp các CSV vào một file Excel" để mỗi file CSV thành một sheet.

## Kiểm tra trước khi gửi hoặc tải lên

Mở file kết quả bằng [Xem file Excel/CSV](tool:excel-viewer) để xem nhanh mà không làm Excel tự đổi định dạng. Rà các điểm sau:

1. Chữ có dấu hiện đúng.
2. Số cột của mọi dòng bằng nhau.
3. Số điện thoại, mã số còn đủ số 0 đầu.
4. Ngày tháng đúng dạng hệ thống nhận yêu cầu, ví dụ 31/12/2026 hay 2026-12-31.
5. Ô có dấu phẩy hoặc xuống dòng bên trong không làm lệch cột.

## Cần định dạng khác?

Lập trình viên cần JSON thay vì CSV thì dùng [JSON ↔ Excel](tool:json-excel).

## Câu hỏi thường gặp

**Excel có sẵn "CSV UTF-8" khi lưu, sao còn cần công cụ?** Bản Excel mới có lựa chọn đó, nhưng chỉ lưu sheet đang mở, từng file một. Công cụ chuyển nhiều file, nhiều sheet một lần, cho chọn dấu phân cách và không cần cài Excel.

**File .xls đời cũ có chuyển được không?** Được, cùng với .xlsx và .ods.

**Dữ liệu khách hàng có bị gửi đi không?** Không. File được đọc và chuyển ngay trong trình duyệt.
