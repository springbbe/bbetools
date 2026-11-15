---
title: Cách chuyển PDF màu sang đen trắng để in tiết kiệm mực
desc: Cách chuyển file PDF màu sang thang xám trước khi in để đỡ tốn mực màu, cắt bỏ lề thừa cho chữ to hơn, và các mẹo in tài liệu tiết kiệm.
tools: [grayscale-pdf, crop-pdf, compress-pdf, extract-pages-pdf]
updated: 2026-11-15
---

Slide bài giảng nền xanh, báo cáo đầy biểu đồ màu: in nguyên bản tốn mực màu, mà ra tiệm in thì trang màu đắt gấp nhiều lần trang đen trắng. Mở [PDF đen trắng](tool:grayscale-pdf), chọn một hay nhiều file rồi bấm "Chuyển đen trắng". File được xử lý ngay trên trình duyệt, không tải lên đâu.

## Các bước chuyển

1. Chọn hoặc kéo thả một hay nhiều file PDF.
2. Bấm "Chuyển đen trắng".
3. Tải từng file hoặc tải cả bộ dạng .zip.

Chữ không bị biến thành ảnh: công cụ đổi màu ngay trong nội dung trang nên chữ vẫn sắc nét, vẫn bôi đen và tìm kiếm được.

## Sao không chọn "in đen trắng" trong hộp thoại in?

Chọn trong hộp thoại in cũng được, nếu bạn tự in. Chuyển sẵn file sang thang xám có lợi khi:

- **Mang ra tiệm in.** File đã là đen trắng thì không thể bị in nhầm và tính tiền trang màu.
- **Gửi cho người khác in.** Bạn không phải dặn dò về cài đặt máy in.
- **Muốn xem trước kết quả.** Hai màu khác nhau trên màn hình có thể ra cùng một mức xám khi in; nhìn file thang xám là thấy ngay chỗ nào khó phân biệt.
- **Máy in vẫn dùng mực màu để pha màu đen** khi nhận file màu; file thang xám giúp máy chỉ dùng hộp mực đen ở nhiều dòng máy.

## Thang xám khác đen trắng thuần

| | Thang xám | Đen trắng thuần (1 bit) |
|---|---|---|
| Số mức | 256 mức từ đen đến trắng | Chỉ có đen hoặc trắng |
| Ảnh, biểu đồ | Vẫn thấy rõ chi tiết | Mất chi tiết, bệt |
| Chữ | Sắc nét | Sắc nét |

Công cụ chuyển sang **thang xám**, là cách đúng cho tài liệu có hình và biểu đồ.

## Kiểm tra sau khi chuyển

- **Biểu đồ phân biệt bằng màu:** đường đỏ và đường xanh lá có thể ra hai mức xám gần giống nhau. Nếu là tài liệu của bạn, hãy dùng thêm kiểu nét (liền, đứt) hoặc nhãn trực tiếp trên biểu đồ.
- **Chữ màu nhạt trên nền màu:** chữ vàng trên nền xanh có thể khó đọc khi thành xám.
- **Chỗ còn màu:** một số thành phần hiếm gặp chưa đổi được; công cụ báo số lượng sau khi chuyển.

## Cắt lề để chữ to hơn

Tài liệu scan hoặc slide thường có lề rất rộng. Cắt bớt lề thì khi in vừa khổ giấy, nội dung được phóng to hơn. Dùng [Cắt lề PDF](tool:crop-pdf):

1. Chọn "Tự bỏ lề trắng"; có thể chừa lại vài mm.
2. Bật "Cắt đều các trang" để các trang cùng khổ giữ cùng kích thước.
3. Khi in, chọn "Vừa khổ giấy" (Fit) trong hộp thoại in.

Lưu ý cắt lề chỉ ẩn phần bên ngoài khung chứ không xoá hẳn nội dung ở đó.

## Mẹo in tiết kiệm

| Cách | Tiết kiệm |
|---|---|
| In hai mặt | Một nửa số giấy |
| In 2 trang trên 1 mặt giấy | Một nửa giấy và mực; hợp với slide |
| In 4 hoặc 6 slide trên 1 mặt | Slide ít chữ vẫn đọc được |
| Chế độ nháp (Draft, Eco) | Bớt mực, chữ nhạt hơn |
| Chỉ in những trang cần | Bỏ trang bìa, mục lục, phụ lục |
| Slide nền tối: đổi sang bản nền trắng trước khi xuất PDF | Nền tối tốn mực nhất |

Để chỉ in một số trang, tách chúng ra bằng [Trích xuất trang PDF](tool:extract-pages-pdf) rồi mang file gọn đi in.

## Slide nền tối

Chuyển thang xám không biến nền đen thành trắng: nền xanh đậm sẽ thành xám đậm và vẫn tốn mực. Nếu có file gốc, trong PowerPoint chọn in kiểu "Pure Black and White" hoặc "Grayscale", hoặc đổi mẫu thiết kế sang nền sáng rồi xuất lại PDF.

## Câu hỏi thường gặp

**File có nhẹ đi không?** Thường nhẹ hơn một chút vì ảnh một kênh màu nhỏ hơn ảnh ba kênh. Muốn giảm mạnh dung lượng, dùng [Nén PDF](tool:compress-pdf).

**Chuyển ngược lại thành màu được không?** Không. Thông tin màu đã mất; hãy giữ file gốc.

**Chuyển nhiều file cùng lúc được không?** Được. Chọn nhiều file, mỗi file ra một bản thang xám.
