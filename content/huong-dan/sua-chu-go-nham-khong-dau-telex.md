---
title: Gõ nhầm thành "Vieejt Nam"? Cách sửa không cần gõ lại
desc: Cách chuyển đoạn chữ lỡ gõ khi chưa bật Unikey (Vieejt Nam, Vie65t Nam) thành tiếng Việt có dấu mà không phải gõ lại, kèm bảng quy tắc gõ Telex và VNI.
tools: [telex-fix, case-converter, remove-accents, vn-encoding]
updated: 2026-11-15
---

Gõ xong cả đoạn mới nhìn lên màn hình và thấy "Tooi ddang lafm vieecj": bộ gõ chưa bật. Không cần xoá đi gõ lại. Mở [Sửa chữ gõ sai bộ gõ](tool:telex-fix), dán đoạn chữ vào, chọn kiểu gõ rồi sao chép kết quả đã có dấu. Văn bản được xử lý ngay trên trình duyệt.

## Các bước sửa

1. Dán đoạn chữ lỡ gõ vào ô.
2. Chọn kiểu gõ: Telex, VNI (số), hoặc để "Tự nhận (Telex + VNI)".
3. Chọn kiểu đặt dấu: kiểu cũ (hòa, thủy) hoặc kiểu mới (hoà, thuỷ).
4. Đọc lại kết quả rồi sao chép.

Ví dụ: "Tieesng Vieejt" thành "Tiếng Việt"; "Vie65t Nam" thành "Việt Nam".

## Quy tắc gõ Telex

| Gõ | Ra | Gõ | Ra |
|---|---|---|---|
| aa | â | s | dấu sắc |
| aw | ă | f | dấu huyền |
| ee | ê | r | dấu hỏi |
| oo | ô | x | dấu ngã |
| ow | ơ | j | dấu nặng |
| uw | ư | z | xoá dấu |
| dd | đ | | |

## Quy tắc gõ VNI

| Gõ | Ra | Gõ | Ra |
|---|---|---|---|
| 1 | dấu sắc | 6 | dấu mũ (â, ê, ô) |
| 2 | dấu huyền | 7 | dấu móc (ơ, ư) |
| 3 | dấu hỏi | 8 | dấu trăng (ă) |
| 4 | dấu ngã | 9 | đ |
| 5 | dấu nặng | 0 | xoá dấu |

## Từ tiếng Anh có bị sửa nhầm không?

Công cụ chỉ đổi khi kết quả là một âm tiết tiếng Việt hợp lệ, và bỏ qua các từ tiếng Anh thông dụng như this, was, is. Phần lớn từ tiếng Anh vì thế được giữ nguyên.

Tuy vậy, một số từ ngắn vẫn có thể bị hiểu nhầm, vì cùng một dãy phím vừa là từ tiếng Anh vừa là cách gõ Telex của một từ tiếng Việt. Văn bản lẫn nhiều tiếng Anh, tên riêng, mã sản phẩm, địa chỉ email cần được **đọc lại** sau khi chuyển.

Nếu văn bản có nhiều số (số điện thoại, số tiền), nên chọn kiểu gõ Telex thay vì "Tự nhận" để các chữ số không bị hiểu là dấu VNI.

## "hòa" hay "hoà"?

Cả hai cách đặt dấu đều đang được dùng.

- **Kiểu cũ:** đặt dấu vào giữa cụm nguyên âm theo thói quen thị giác: hòa, thủy, khỏe.
- **Kiểu mới:** đặt dấu vào âm chính: hoà, thuỷ, khoẻ.

Chọn một kiểu và dùng nhất quán trong cả văn bản. Bộ gõ của bạn cũng có tuỳ chọn tương ứng; đặt giống nhau để phần gõ thêm khớp với phần đã chuyển.

## Các lỗi gõ khác

| Lỗi | Cách sửa |
|---|---|
| Gõ cả đoạn khi đang bật Caps Lock | "Đảo hoa/thường" trong [Đổi chữ hoa/thường](tool:case-converter) |
| Văn bản hiện ký tự lạ kiểu "TiÕng ViÖt" | Đó là lỗi bảng mã, không phải lỗi gõ: dùng [Chuyển mã Unicode ↔ TCVN3 ↔ VNI](tool:vn-encoding) |
| Cần bản không dấu để đặt tên file, tên đăng nhập | [Bỏ dấu tiếng Việt](tool:remove-accents) |

## Tránh gõ nhầm lần sau

- **Nhìn biểu tượng bộ gõ** ở góc màn hình trước khi gõ: chữ V là đang bật tiếng Việt, chữ E là đang tắt.
- **Dùng phím tắt chuyển nhanh.** Unikey, EVKey mặc định dùng Ctrl + Shift hoặc Alt + Z.
- **Bật tính năng nhớ chế độ theo từng ứng dụng** nếu bộ gõ có, để phần mềm lập trình luôn tắt và phần mềm soạn thảo luôn bật.
- **Trên điện thoại,** kiểm tra bàn phím đang ở tiếng Việt Telex hay tiếng Anh bằng cách nhìn phím cách.

## Câu hỏi thường gặp

**Sửa được đoạn gõ lẫn cả Telex và VNI không?** Được, chọn "Tự nhận (Telex + VNI)".

**Chữ viết hoa có được giữ không?** Có. "Vieejt" thành "Việt", "VIEEJT" thành "VIỆT".

**Chuyển ngược từ có dấu thành kiểu gõ Telex được không?** Công cụ chỉ chuyển theo chiều từ chữ gõ nhầm sang chữ có dấu.
