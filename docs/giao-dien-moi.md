# Làm mới giao diện BbeTools ("Vàng đất")

Tiến trình làm lại giao diện toàn site bằng skill Impeccable, chia thành nhiều giai đoạn để làm qua nhiều phiên. Cuối mỗi giai đoạn cập nhật bảng trạng thái và mục "Nhật ký" bên dưới.

## Hướng thiết kế

Màu chủ đạo **vàng đất** (người dùng chọn, thay cho tím ở bản đầu). Mỗi nhóm công cụ vẫn là một "chuyên mục" có màu riêng. Bố cục **gọn, thẳng hàng**: không nghiêng, không xoay (người dùng thấy bản nghiêng "xộc xệch").

- **Khối đầu trang:** vàng đất `#D6A23A`, chữ nâu đất `#2B1E08` (tối: nền `#3A2A0E`, chữ kem `#FFF3D6`).
- **Màu thương hiệu** (nút, link, focus): vàng đất đậm `#8A5A06` (tối: `#E6B655`). Nền sáng `#F6F4EF`, nền tối `#16130D`.
- **Chân trang:** nâu đất `#2A1E0A`, chữ kem, điểm nhấn `#E6B655`.
- **Tô nổi** cụm "file không bao giờ rời khỏi máy bạn": nền vàng nhạt `#FFF4CC`; bôi chọn chữ màu `#FFDF85`.
- **12 màu chuyên mục** (trường `color` của nhóm trong `tools.json`): icon nhóm là ô vuông bo tròn có viền trắng; tiêu đề mỗi nhóm là một tab màu.
- **Chữ:** tiêu đề Bricolage Grotesque 800 (có đủ dấu tiếng Việt), thân bài Be Vietnam Pro.
- **Hình khối:** nút dạng viên thuốc, thẻ bo 16 px, bóng có độ lệch, ám nâu.

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

- **GĐ 2:** `/impeccable Làm giai đoạn 2 trong docs/giao-dien-moi.md (trang công cụ). Giữ đúng hướng "Vàng đất" đã ghi; xong thì cập nhật file, commit và push.`
- **GĐ 3:** `/impeccable Làm giai đoạn 3 trong docs/giao-dien-moi.md (điều hướng và trang phụ). Giữ đúng hướng "Vàng đất"; xong thì cập nhật file, commit và push.`
- **GĐ 4:** `/impeccable Làm giai đoạn 4 trong docs/giao-dien-moi.md (rà từng nhóm công cụ). Nếu không đủ, làm một nửa số nhóm, ghi lại nhóm nào còn lại; xong thì cập nhật file, commit và push.`
- **GĐ 5:** `/impeccable Làm giai đoạn 5 trong docs/giao-dien-moi.md (hoàn thiện, review cuối, viết DESIGN.md). Xong thì cập nhật file, commit và push.`

## Nhật ký

### GĐ 1
- Thay toàn bộ biến màu trong `assets/app.css` (sáng và tối), thêm font tiêu đề Bricolage Grotesque.
- Nút dạng viên thuốc, ô nhập, chip, focus, bôi chọn chữ, thanh cuộn theo màu mới.
- Header sáng, logo vàng đất có chấm vàng; footer nâu đất.
- Trang chủ: khối vàng đất tràn ngang chứa tiêu đề, câu dẫn có cụm được tô nổi, ô tìm lớn, lưới 12 nhãn nhóm (máy tính); tiêu đề nhóm là tab màu chuyên mục; chip lọc nhóm có chấm màu.
- Vì mọi trang dùng chung `app.css`, các trang công cụ đã đổi màu theo, nhưng bố cục riêng của chúng để GĐ 2.
- Đã thử ở 1280 px và 375 px, sáng và tối; console không lỗi; build, check, test đều qua.
- Đổi theo yêu cầu: màu chủ đạo từ tím sang **vàng đất**; khối đầu trang gọn lại (lưới nhãn nhóm 2 cột cùng chiều cao, bỏ mọi hiệu ứng nghiêng/xoay).
- Việc để lại cho giai đoạn sau (từ `impeccable detect`): thanh tiến trình chạy vô hạn `.progress.indet` (GĐ 2); `.mega-head` sát mép dưới (GĐ 3); viền trái 4 px của trích dẫn trong `.md-preview` (GĐ 4). Nền ô vuông của `.compare` là để thấy vùng trong suốt, giữ lại.
