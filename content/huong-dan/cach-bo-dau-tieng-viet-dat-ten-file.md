---
title: Cách bỏ dấu tiếng Việt hàng loạt, viết tên không dấu
desc: Cách chuyển văn bản tiếng Việt có dấu thành không dấu chỉ với một lần dán; cách viết tên không dấu trên vé máy bay, thẻ ngân hàng, tên file, đường dẫn web.
tools: [remove-accents, slugify, case-converter, vn-encoding]
updated: 2026-11-15
---

Điền tên lên vé máy bay, đặt tên file gửi đối tác nước ngoài, tạo tên đăng nhập, soạn tin nhắn SMS cho khách: nhiều chỗ vẫn chỉ nhận chữ không dấu. Mở [Bỏ dấu tiếng Việt](tool:remove-accents), dán văn bản vào ô, kết quả không dấu hiện ngay để sao chép hoặc tải về. Văn bản được xử lý trên trình duyệt.

## Các bước

1. Dán văn bản có dấu vào ô.
2. Bật "Giữ chữ đ/Đ" nếu muốn giữ nguyên chữ đ.
3. Bật "Chuyển thành chữ thường" nếu cần.
4. Sao chép hoặc tải kết quả.

## Bảng chuyển đổi

| Có dấu | Không dấu |
|---|---|
| a, à, á, ả, ã, ạ, ă, ằ, ắ, ẳ, ẵ, ặ, â, ầ, ấ, ẩ, ẫ, ậ | a |
| e, è, é, ẻ, ẽ, ẹ, ê, ề, ế, ể, ễ, ệ | e |
| i, ì, í, ỉ, ĩ, ị | i |
| o, ò, ó, ỏ, õ, ọ, ô, ồ, ố, ổ, ỗ, ộ, ơ, ờ, ớ, ở, ỡ, ợ | o |
| u, ù, ú, ủ, ũ, ụ, ư, ừ, ứ, ử, ữ, ự | u |
| y, ỳ, ý, ỷ, ỹ, ỵ | y |
| đ | d |

Ví dụ: "Nguyễn Thị Hương Giang" thành "Nguyen Thi Huong Giang".

## Viết tên không dấu trên giấy tờ

**Vé máy bay.** Tên trên vé viết không dấu, chữ in hoa, và phải khớp với giấy tờ tuỳ thân. Với chuyến quốc tế, lấy đúng theo dòng tên không dấu trên hộ chiếu. Sai một ký tự cũng có thể phải làm thủ tục đổi tên; hãy dò lại trước khi thanh toán.

**Thẻ ngân hàng.** Tên in trên thẻ là tên không dấu, in hoa, thường do ngân hàng tự chuyển từ tên trên giấy tờ. Khi thanh toán trực tuyến, nhập đúng như in trên thẻ.

**Biểu mẫu nước ngoài.** Tách họ và tên theo đúng ô: Family name (họ), Middle name (tên đệm), Given name hoặc First name (tên). Người Việt hay điền ngược; hãy làm theo cách ghi trên hộ chiếu.

Để đổi cả đoạn sang chữ in hoa, dùng [Đổi chữ hoa/thường](tool:case-converter).

## Đặt tên file

Tên file có dấu ngày nay hiển thị đúng trên hầu hết máy tính, nhưng vẫn hay lỗi khi nén rồi giải nén trên hệ điều hành khác, tải lên một số hệ thống nộp hồ sơ, hoặc đính kèm email qua phần mềm cũ.

Quy tắc an toàn:

- Không dấu, chữ thường.
- Dùng gạch nối thay cho dấu cách.
- Không dùng các ký tự / \ : * ? " < > |
- Ngày tháng viết theo thứ tự năm-tháng-ngày để file tự xếp đúng thời gian.

Ví dụ: "Báo cáo tài chính quý 3 năm 2026.pdf" nên đặt là "bao-cao-tai-chinh-quy-3-2026.pdf".

## Đường dẫn web (slug)

Đường dẫn bài viết nên không dấu, chữ thường, nối bằng gạch ngang: tiêu đề "Hướng dẫn cài đặt máy in" thành "huong-dan-cai-dat-may-in". Dùng [Tạo slug](tool:slugify) để chuyển nhiều tiêu đề một lần, chọn ký tự nối và giới hạn độ dài mà không cắt đôi từ.

## Tin nhắn SMS

Một tin SMS không dấu chứa 160 ký tự; có dấu chỉ còn 70 ký tự vì phải dùng bảng mã khác. Tin nhắn chăm sóc khách hàng vì thế thường viết không dấu để không bị tách thành nhiều tin và tính thêm cước.

## Cẩn thận: bỏ dấu là mất nghĩa

Nhiều từ khác nhau trở thành một khi bỏ dấu:

| Không dấu | Có thể là |
|---|---|
| ma | ma, má, mà, mả, mã, mạ |
| ban | bạn, bán, bàn, ban, bản |
| Dung | Dung, Dũng, Đúng |
| Hoa | Hoa, Hoà, Hoá, Hoả |

Vì vậy:

- **Giữ bản có dấu** làm bản gốc; bản không dấu chỉ để dùng ở nơi bắt buộc.
- **Đọc lại tin nhắn không dấu** trước khi gửi; có những câu thành nghĩa khác hẳn, kể cả nghĩa không hay.
- **Không khôi phục tự động được.** Từ bản không dấu, máy chỉ đoán được dấu dựa vào ngữ cảnh và vẫn sai với tên riêng.

## Giữ chữ đ khi nào?

Mặc định "đ" thành "d". Bật "Giữ chữ đ/Đ" khi bạn chỉ muốn bỏ thanh điệu và dấu mũ nhưng hệ thống nhận được chữ đ, hoặc khi cần phân biệt "Đào" với "Dao" trong danh sách tên.

## Văn bản dán vào ra ký tự lạ?

Nếu chữ gốc đã hiện sai kiểu "TiÕng ViÖt", đó là lỗi bảng mã cũ (TCVN3, VNI), không phải chữ có dấu thông thường. Chuyển về Unicode trước bằng [Chuyển mã Unicode ↔ TCVN3 ↔ VNI](tool:vn-encoding) rồi mới bỏ dấu.

## Câu hỏi thường gặp

**Bỏ dấu cả danh sách vài nghìn dòng được không?** Được. Dán cả danh sách, mỗi dòng được chuyển và giữ nguyên thứ tự.

**Chữ gõ kiểu tổ hợp (dấu tách rời) có bỏ được không?** Có. Công cụ chuẩn hoá Unicode trước nên cả chữ dựng sẵn lẫn tổ hợp đều xử lý được.

**Số, dấu câu, chữ tiếng Anh có bị đổi không?** Không. Chỉ các chữ cái tiếng Việt có dấu được chuyển.
