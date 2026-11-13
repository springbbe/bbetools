---
title: Sửa lỗi font chữ tiếng Việt khi mở file cũ (TCVN3, VNI)
desc: Văn bản cũ hiện thành "ViÖt Nam", "Vieät Nam" hay "Viá»‡t Nam"? Cách nhận biết bảng mã TCVN3, VNI, UTF-8 lỗi và chuyển sang Unicode để máy nào cũng đọc.
tools: [vn-encoding]
updated: 2026-11-13
---

Chữ tiếng Việt hiện thành ký tự lạ là do văn bản được gõ bằng bảng mã cũ (TCVN3 hoặc VNI) trong khi máy bạn không có font tương ứng. Cách sửa: dán đoạn chữ lỗi vào [Chuyển mã Unicode ↔ TCVN3 ↔ VNI](tool:vn-encoding), để công cụ tự nhận bảng mã rồi sao chép chữ Unicode đã sửa về lại file.

## Nhận biết ba kiểu lỗi thường gặp

| Chữ hiện ra | Chữ đúng | Nguyên nhân |
|---|---|---|
| ViÖt Nam | Việt Nam | Văn bản gõ bảng mã TCVN3 (font .VnTime, .VnArial…) |
| Vieät Nam | Việt Nam | Văn bản gõ bảng mã VNI (font VNI-Times, VNI-Helve…) |
| Viá»‡t Nam | Việt Nam | Chữ Unicode (UTF-8) bị phần mềm đọc nhầm bảng mã |

Một cách kiểm tra nhanh trong Word: bấm vào đoạn chữ lỗi và xem tên font. Tên bắt đầu bằng ".Vn" là TCVN3, bắt đầu bằng "VNI-" là VNI.

## Vì sao có chuyện này?

Trước khi Unicode trở thành chuẩn chung, mỗi bộ gõ tiếng Việt dùng một bảng mã riêng và chỉ hiển thị đúng với font đi kèm. Tài liệu cũ của cơ quan, trường học, bản vẽ kỹ thuật vẫn còn rất nhiều file như vậy. Máy tính và điện thoại đời mới không cài sẵn các font đó nên chữ hiện sai.

Chuyển sang Unicode là sửa tận gốc: file đọc được trên mọi máy mà không cần cài thêm font.

## Các bước sửa

1. Sao chép đoạn chữ bị lỗi trong Word, Excel hoặc bất kỳ đâu.
2. Dán vào [Chuyển mã Unicode ↔ TCVN3 ↔ VNI](tool:vn-encoding). Để "Tự nhận" hoặc chọn đúng bảng mã nguồn; bảng mã đích để Unicode.
3. Sao chép kết quả, dán lại vào file gốc.
4. Bôi chọn đoạn vừa dán và đổi sang font Unicode như Times New Roman hoặc Arial.

Bước 4 hay bị quên: nếu vẫn để font .VnTime thì chữ Unicode đúng lại hiện sai.

## Chữ in hoa bị thành chữ thường

Trong TCVN3, chữ hoa có dấu dùng một font riêng, tên kết thúc bằng chữ H (ví dụ .VnTimeH). Công cụ tự đoán theo các chữ xung quanh; nếu cả đoạn được gõ bằng font chữ hoa, chọn "In hoa hết (.VnTimeH)".

## Mở file CSV bằng Excel bị lỗi dấu

Kiểu lỗi "Viá»‡t Nam" hay gặp khi mở file CSV xuất từ phần mềm kế toán, trang quản lý bán hàng. Có hai cách:

- Sửa nhanh phần chữ đã lỗi: chọn nguồn "UTF-8 bị lỗi" trong công cụ.
- Mở file cho đúng ngay từ đầu: trong Excel dùng **Dữ liệu** → **Từ văn bản/CSV** và chọn bảng mã UTF-8, thay vì bấm đúp vào file.

## Cần gửi file cho nơi còn dùng font cũ?

Công cụ chuyển được cả chiều ngược lại, từ Unicode sang TCVN3 hoặc VNI. Chọn bảng mã đích tương ứng rồi đặt đúng font cũ cho đoạn chữ sau khi dán.

## Câu hỏi thường gặp

**Văn bản tôi dán có bị gửi đi đâu không?** Không. Việc chuyển mã chạy ngay trong trình duyệt.

**Chuyển cả file Word một lần được không?** Công cụ làm việc với đoạn chữ bạn dán vào. Với file dài, bôi chọn toàn bộ nội dung (Ctrl + A), sao chép, chuyển mã rồi dán lại; định dạng đậm, nghiêng cần đặt lại sau khi dán.
