# Kế hoạch ra mắt sản phẩm

**Cập nhật:** 30/10/2026 · *Nhóm sản phẩm*

Tài liệu mẫu để thử công cụ **Markdown sang HTML** của BbeTools. Nội dung là dữ liệu giả.

## Mục tiêu quý 4

1. Ra mắt bản thử nghiệm cho 500 người dùng đầu tiên
2. Thu thập ý kiến qua ~~email~~ biểu mẫu trong ứng dụng
3. Sửa hết lỗi nghiêm trọng trước ngày 15/12

## Việc cần làm

- [x] Hoàn thiện thiết kế giao diện
- [x] Viết tài liệu hướng dẫn sử dụng
- [ ] Kiểm thử trên điện thoại Android và iPhone
- [ ] Chuẩn bị bài đăng giới thiệu

## Ngân sách

| Hạng mục | Dự kiến | Đã chi | Còn lại |
|---|---:|---:|---:|
| Thiết kế | 40 tr | 38 tr | 2 tr |
| Lập trình | 120 tr | 95 tr | 25 tr |
| Quảng bá | 60 tr | 12 tr | 48 tr |
| **Tổng** | **220 tr** | **145 tr** | **75 tr** |

## Ghi chú kỹ thuật

> Mọi tính năng xử lý file đều chạy ngay trên trình duyệt, không gửi dữ liệu lên máy chủ.

Lệnh build và kiểm tra:

```bash
node scripts/build.js && node scripts/check.js
```

Cấu hình mẫu:

```json
{ "phienBan": "1.0.0-beta", "nguoiDungToiDa": 500 }
```

---

Câu hỏi gửi về `nhom-san-pham@example.com` hoặc xem thêm tại [BbeTools](https://springbbe.github.io/bbetools/).
