---
title: Checksum là gì? Cách kiểm tra file tải về bằng SHA-256
desc: Checksum (MD5, SHA-256) dùng để biết file tải về có nguyên vẹn không. Cách tính mã của file trên trình duyệt và đối chiếu với mã nhà phát hành công bố.
tools: [checksum, hash, file-encrypt]
updated: 2026-11-15
---

Bên cạnh nút tải bộ cài Windows, Ubuntu hay một phần mềm mã nguồn mở thường có một dãy ký tự dài ghi "SHA-256". Đó là checksum: dấu vân tay của file. Mở [Tính checksum file](tool:checksum), chọn file vừa tải, dán dãy mã từ trang tải về vào ô đối chiếu rồi bấm "Tính checksum"; kết quả báo Khớp hoặc Không khớp. File được đọc ngay trên máy, không tải lên đâu, kể cả file vài GB.

## Checksum là gì?

Checksum là một dãy ký tự có độ dài cố định, tính ra từ toàn bộ nội dung file bằng một thuật toán băm. Nó có hai tính chất quan trọng:

- **Cùng nội dung thì cùng mã.** Ai tính, tính ở đâu cũng ra đúng một kết quả.
- **Khác một byte là khác hẳn.** Đổi một ký tự trong file vài GB, mã ra hoàn toàn khác.

Nhờ vậy, so mã của file bạn tải với mã nhà phát hành công bố là đủ để biết hai file có giống hệt nhau không.

## Khi nào cần kiểm tra?

- **Bộ cài hệ điều hành** (file ISO): một lỗi nhỏ khi tải có thể khiến cài đặt hỏng giữa chừng.
- **Phần mềm tải từ trang phụ** (mirror) thay vì trang chính của nhà phát hành.
- **Firmware** cho bộ phát WiFi, bo mạch chủ, máy ảnh: nạp file hỏng có thể làm hỏng thiết bị.
- **File lớn chép qua USB, ổ cứng ngoài, mạng nội bộ:** kiểm tra bản sao có giống bản gốc.
- **Gửi file quan trọng cho đối tác:** gửi kèm mã để họ tự kiểm tra.

## Các bước kiểm tra

1. Chọn file cần kiểm tra.
2. Chọn thuật toán trùng với loại mã trên trang tải về (SHA-256, SHA-1, MD5, SHA-512, CRC32).
3. Dán mã của nhà phát hành vào ô đối chiếu. Hoặc thả kèm file .sha256, .md5 tải cùng, công cụ tự đọc mã trong đó.
4. Bấm "Tính checksum" và xem kết quả.

Không cần so từng ký tự bằng mắt; công cụ báo Khớp hay Không khớp.

## Chọn thuật toán nào?

| Thuật toán | Độ dài mã | Tình trạng |
|---|---|---|
| CRC32 | 8 ký tự | Chỉ phát hiện lỗi truyền tải, không có tính bảo mật |
| MD5 | 32 ký tự | Đã bị phá về mặt bảo mật; chỉ còn dùng để phát hiện lỗi khi tải |
| SHA-1 | 40 ký tự | Đã bị phá; không nên dùng để chống giả mạo |
| SHA-256 | 64 ký tự | Tiêu chuẩn hiện nay |
| SHA-512 | 128 ký tự | An toàn, mã dài hơn |

Quy tắc: dùng thuật toán mà trang tải về cung cấp. Nếu có nhiều lựa chọn, ưu tiên SHA-256.

"Bị phá" nghĩa là người ta có thể cố ý tạo ra hai file khác nhau có cùng mã MD5 hoặc SHA-1. Với lỗi ngẫu nhiên khi tải, MD5 vẫn phát hiện tốt; với kẻ tấn công cố tình tráo file thì không đủ.

## Mã không khớp thì sao?

1. **Kiểm tra lại thuật toán.** So mã SHA-256 với mã MD5 thì chắc chắn không khớp.
2. **Kiểm tra đúng phiên bản.** Mỗi phiên bản, mỗi bản 64-bit hay ARM có mã riêng.
3. **Tải lại file.** Lỗi mạng, tải dở là nguyên nhân phổ biến nhất.
4. **Vẫn không khớp:** không mở, không cài file đó. Tải từ trang chính thức của nhà phát hành.

## Giới hạn của checksum

Checksum chỉ chứng minh file của bạn giống file mà **người công bố mã** nói tới. Nếu cả file lẫn mã nằm trên cùng một trang đã bị chiếm quyền, kẻ tấn công sửa được cả hai.

Vì thế:

- Lấy mã từ **trang chính thức** qua kết nối https, không lấy từ diễn đàn hay trang chia sẻ lại.
- Với phần mềm quan trọng, nhà phát hành thường ký số cả file mã (chữ ký GPG) hoặc ký số bộ cài. Chữ ký số xác nhận được **ai** phát hành, điều mà checksum đơn thuần không làm được.
- Checksum khớp không có nghĩa file không chứa mã độc; nó chỉ nghĩa là file đúng như bản nhà phát hành đưa ra.

## Tính bằng lệnh có sẵn trên máy

| Hệ điều hành | Lệnh |
|---|---|
| Windows (PowerShell) | Get-FileHash tên-file -Algorithm SHA256 |
| macOS | shasum -a 256 tên-file |
| Linux | sha256sum tên-file |

Kết quả giống hệt công cụ trên trình duyệt; chọn cách nào tiện hơn.

## Hash của văn bản

Checksum của file và hash của một đoạn chữ dùng cùng thuật toán. Cần tính MD5, SHA-256 hoặc HMAC của một chuỗi văn bản, dùng [Hash MD5/SHA](tool:hash).

Lưu ý hash không phải mã hoá: không giải ngược được và không dùng để giữ bí mật nội dung. Muốn khoá file bằng mật khẩu, dùng [Mã hoá/giải mã file](tool:file-encrypt).

## Câu hỏi thường gặp

**Chữ hoa, chữ thường trong mã có quan trọng không?** Không. "A3F1" và "a3f1" là một.

**File vài GB có tính được trên trình duyệt không?** Được. File được đọc từng phần nên không cần nạp cả file vào bộ nhớ.

**Đổi tên file có làm đổi mã không?** Không. Mã chỉ phụ thuộc nội dung, không phụ thuộc tên hay ngày tạo.
