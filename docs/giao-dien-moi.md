# Làm mới giao diện BbeTools ("Mực tím")

Tiến trình làm lại giao diện toàn site bằng skill Impeccable, chia thành nhiều giai đoạn để làm qua nhiều phiên. Cuối mỗi giai đoạn cập nhật bảng trạng thái và mục "Nhật ký" bên dưới.

## Hướng thiết kế

Lấy cảm hứng từ **tạp chí học trò Việt** (Hoa Học Trò, Mực Tím): giấy trắng, màu in tươi và tự tin, mỗi nhóm công cụ là một "chuyên mục" có màu riêng.

- **Màu thương hiệu:** tím mực học trò `#5B2EE0` (chế độ tối `#A48BFF`). Nền sáng ám tím rất nhạt; nền tối là tím mực đậm `#14111F`.
- **Vàng bút dạ quang** `#FFE14D`: chỉ dùng để tô cụm từ quan trọng (ví dụ "file không bao giờ rời khỏi máy bạn") và vòng focus trên nền tím.
- **12 màu chuyên mục** (trường `color` của nhóm trong `tools.json`): icon nhóm là "nhãn dán" có viền trắng; tiêu đề mỗi nhóm là một tab màu.
- **Chữ:** tiêu đề Bricolage Grotesque 800 (có đủ dấu tiếng Việt), thân bài Be Vietnam Pro.
- **Hình khối:** nút dạng viên thuốc, thẻ bo 16 px, bóng có độ lệch và ám tím.

Bản đầy đủ cho AI (hợp đồng thiết kế): `.impeccable/surfaces/index-html.md`. Bối cảnh sản phẩm: `PRODUCT.md`.

## Các giai đoạn

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 1 | Nền móng: bảng màu sáng/tối, font tiêu đề, nút, ô nhập, chip, focus, bôi chọn chữ, thanh cuộn; header, footer, logo; **trang chủ** | ✅ Xong |
| 2 | **Trang công cụ**: dải đầu trang theo màu nhóm, đường dẫn, dòng quyền riêng tư, ô thả file, khung ứng dụng, cách dùng/FAQ/công cụ liên quan; 4 khung (file, văn bản, form, tương tác), kết quả, thông báo, toast, hộp thoại | ⏳ Chưa làm |
| 3 | **Điều hướng và trang phụ**: menu "Tất cả công cụ" (máy tính) và ngăn kéo (điện thoại), bảng lệnh tìm kiếm, trang nhóm, Giới thiệu, 404; kiểm tra bản tiếng Anh | ⏳ Chưa làm |
| 4 | **Rà từng nhóm công cụ**: bảng trang PDF, so sánh ảnh, thanh cắt âm thanh/video, bảng và thẻ số của nhóm Tính toán, bảng Excel, QR, khung tải sticker, trang kiểm tra thiết bị. Chạy thử với file mẫu | ⏳ Chưa làm |
| 5 | **Hoàn thiện**: chuyển động có chủ đích, ảnh OG và icon ứng dụng theo màu mới (`scripts/make-brand.js`), rà soát tương phản/bàn phím/375 px, review cuối, viết `DESIGN.md` | ⏳ Chưa làm |

## Cách tiếp tục

Mở phiên Claude Code mới trong thư mục dự án và gõ prompt của giai đoạn tiếp theo:

- **GĐ 2:** `/impeccable Làm giai đoạn 2 trong docs/giao-dien-moi.md (trang công cụ). Giữ đúng hướng "Mực tím" đã ghi; xong thì cập nhật file, commit và push.`
- **GĐ 3:** `/impeccable Làm giai đoạn 3 trong docs/giao-dien-moi.md (điều hướng và trang phụ). Giữ đúng hướng "Mực tím"; xong thì cập nhật file, commit và push.`
- **GĐ 4:** `/impeccable Làm giai đoạn 4 trong docs/giao-dien-moi.md (rà từng nhóm công cụ). Nếu không đủ, làm một nửa số nhóm, ghi lại nhóm nào còn lại; xong thì cập nhật file, commit và push.`
- **GĐ 5:** `/impeccable Làm giai đoạn 5 trong docs/giao-dien-moi.md (hoàn thiện, review cuối, viết DESIGN.md). Xong thì cập nhật file, commit và push.`

## Nhật ký

### GĐ 1
- Thay toàn bộ biến màu trong `assets/app.css` (sáng và tối), thêm font tiêu đề Bricolage Grotesque.
- Nút dạng viên thuốc, ô nhập, chip, focus, bôi chọn chữ, thanh cuộn theo màu mới.
- Header sáng, logo mới màu tím mực có chấm vàng; footer.
- Trang chủ: khối tím mực tràn ngang chứa tiêu đề, câu dẫn tô dạ quang, ô tìm lớn; tiêu đề nhóm là tab màu chuyên mục; chip lọc nhóm có chấm màu; thẻ công cụ có icon "nhãn dán".
- Vì mọi trang dùng chung `app.css`, các trang công cụ đã đổi màu theo, nhưng bố cục riêng của chúng để GĐ 2.
- Đã thử ở 1280 px và 375 px, sáng và tối; console không lỗi; build, check, test đều qua.
- Việc để lại cho giai đoạn sau (từ `impeccable detect`): thanh tiến trình chạy vô hạn `.progress.indet` (GĐ 2); `.mega-head` sát mép dưới (GĐ 3); viền trái 4 px của trích dẫn trong `.md-preview` (GĐ 4). Nền ô vuông của `.compare` là để thấy vùng trong suốt, giữ lại.
