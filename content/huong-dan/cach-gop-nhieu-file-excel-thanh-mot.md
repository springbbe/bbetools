---
title: Cách gộp nhiều file Excel thành một và tách lại theo cột
desc: Hướng dẫn gộp nhiều file hoặc nhiều sheet Excel, CSV thành một bảng, tự ghép đúng cột cùng tên, và tách một bảng thành nhiều file theo chi nhánh.
tools: [merge-excel, split-excel]
updated: 2026-11-13
---

Để gộp báo cáo của nhiều chi nhánh thành một bảng, mở [Gộp nhiều file Excel](tool:merge-excel), chọn các file, chọn "Nối thành một bảng" rồi bấm "Gộp file". Các cột cùng tên được ghép chung dù thứ tự cột ở mỗi file khác nhau, và dữ liệu không rời khỏi máy bạn.

## Hai kiểu gộp

| Kiểu | Kết quả | Dùng khi |
|---|---|---|
| Nối thành một bảng | Mọi dòng dồn về một sheet, thêm cột Nguồn | Các file cùng cấu trúc, cần tổng hợp, lọc, tạo PivotTable |
| Mỗi sheet giữ riêng | Một file, mỗi file gốc thành một sheet | Các bảng khác cấu trúc, chỉ cần gom về một nơi |

Cột "Nguồn" cho biết mỗi dòng đến từ file nào, rất tiện khi cần lọc theo chi nhánh hoặc truy lại số liệu sai.

## Các bước gộp

1. Chọn các file Excel hoặc CSV cần gộp; kéo thả để đổi thứ tự.
2. Chọn kiểu gộp.
3. Bấm "Gộp file", xem trước kết quả.
4. Tải file Excel hoặc CSV.

## Cột được ghép thế nào?

Khi bật "Dòng đầu là tiêu đề", cột được ghép theo **tên**, không theo vị trí:

- Không phân biệt chữ hoa, chữ thường, có dấu hay không dấu.
- Thứ tự cột ở mỗi file khác nhau vẫn ghép đúng.
- Cột chỉ có ở một file được thêm vào cuối; các dòng của file khác để trống ở cột đó.

Vì vậy "Doanh thu" và "doanh thu" là một cột, nhưng "Doanh thu" và "DT" là hai cột khác nhau.

## Chuẩn bị file để gộp sạch

- Dòng tiêu đề nằm ở dòng đầu tiên; bỏ các dòng tên công ty, tên báo cáo phía trên.
- Thống nhất tên cột giữa các file. Cách bền nhất là phát một file mẫu cho mọi người điền.
- Bỏ dòng tổng cộng ở cuối mỗi file, nếu không tổng sẽ bị cộng hai lần.
- Không gộp ô (merge cells) trong vùng dữ liệu.

## Công thức có được giữ không?

Ô công thức được chép thành **giá trị đã tính**. Sau khi gộp, vị trí ô thay đổi nên giữ công thức sẽ cho kết quả sai. Cần tính toán thêm thì viết công thức mới trên bảng đã gộp.

## Chiều ngược lại: tách một bảng thành nhiều file

Có bảng tổng và cần gửi cho mỗi chi nhánh phần của họ? Dùng [Tách Excel theo cột](tool:split-excel):

1. Chọn file Excel hoặc CSV.
2. Chọn sheet và cột để tách, ví dụ cột Chi nhánh. Danh sách các phần và số dòng hiện ngay.
3. Chọn kết quả: một file nhiều sheet, nhiều file Excel hoặc nhiều file CSV.
4. Bấm "Tách file".

Giá trị viết hoa thường khác nhau hoặc thừa khoảng trắng ("Hà Nội", "hà nội ") được gom chung một phần; ô trống gom vào phần "Trống". Mỗi phần đều có dòng tiêu đề.

## Một quy trình tổng hợp hằng tháng

1. Phát file mẫu có sẵn dòng tiêu đề cho các đơn vị.
2. Nhận file về, đặt tên theo đơn vị (tên file sẽ thành giá trị ở cột Nguồn).
3. Gộp bằng kiểu "Nối thành một bảng".
4. Tổng hợp, kiểm tra trên bảng đã gộp.
5. Khi cần gửi lại số liệu đã soát cho từng đơn vị, tách theo cột Nguồn.

## Vì sao không làm trên dịch vụ trực tuyến thông thường?

Bảng lương, công nợ, danh sách khách hàng là dữ liệu không nên tải lên máy chủ bên ngoài. Hai công cụ này đọc và ghi file ngay trong trình duyệt, không cần cài phần mềm và không cần macro.

## Câu hỏi thường gặp

**Gộp chung file Excel và file CSV được không?** Được, có thể chọn lẫn file Excel và CSV trong một lần gộp.

**File rất lớn có gộp được không?** Giới hạn là bộ nhớ của máy. Với bảng hàng trăm nghìn dòng, nên làm trên máy tính thay vì điện thoại.

**Định dạng màu, kẻ khung có giữ không?** Công cụ tập trung vào dữ liệu; định dạng trình bày của file gốc có thể không được giữ. Hãy định dạng lại trên bảng kết quả nếu cần.
