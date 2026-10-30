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
- **Trang công cụ:** dải đầu trang nhuộm nhạt màu nhóm, gạch màu nhóm 4 px ở mép trên; nhóm trong đường dẫn là nhãn đặc màu nhóm; câu quyền riêng tư tô dạ quang như trang chủ; khung ứng dụng đè lên mép dưới của dải. Bước "Cách dùng" đánh số trong ô vuông màu nhóm.

Hệ thống thiết kế (token, thành phần, nên/không nên): `DESIGN.md` ở gốc dự án (kèm `.impeccable/design.json`). Hợp đồng thiết kế: `.impeccable/surfaces/index-html.md`. Bối cảnh sản phẩm: `PRODUCT.md`.

## Các giai đoạn

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 1 | Nền móng: bảng màu sáng/tối, font tiêu đề, nút, ô nhập, chip, focus, bôi chọn chữ, thanh cuộn; header, footer, logo; **trang chủ** | ✅ Xong |
| 2 | **Trang công cụ**: dải đầu trang theo màu nhóm, đường dẫn, dòng quyền riêng tư, ô thả file, khung ứng dụng, cách dùng/FAQ/công cụ liên quan; 4 khung (file, văn bản, form, tương tác), kết quả, thông báo, toast, hộp thoại | ✅ Xong |
| 3 | **Điều hướng và trang phụ**: menu "Tất cả công cụ" (máy tính) và ngăn kéo (điện thoại), bảng lệnh tìm kiếm, trang nhóm, Giới thiệu, 404; kiểm tra bản tiếng Anh | ✅ Xong |
| 4 | **Rà từng nhóm công cụ**: bảng trang PDF, so sánh ảnh, thanh cắt âm thanh/video, bảng và thẻ số của nhóm Tính toán, bảng Excel, QR, khung tải sticker, trang kiểm tra thiết bị. Chạy thử với file mẫu | ✅ Xong |
| 5 | **Hoàn thiện**: chuyển động có chủ đích, ảnh OG và icon ứng dụng theo màu mới (`scripts/make-brand.js`), rà soát tương phản/bàn phím/375 px, review cuối, viết `DESIGN.md` | ✅ Xong |

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

### GĐ 2
- Mẫu trang công cụ (`scripts/build.js`): bọc trong `.tool-page` có `--c` = màu nhóm; dải `.tool-band` chứa đường dẫn, tên, mô tả, câu quyền riêng tư; khung ứng dụng đè lên mép dưới dải (`--ov`: 16 px điện thoại, 28 px máy tính). Biến `--band`, `--band-ink`, `--band-muted`, `--tab` tính từ màu nhóm bằng `color-mix`, có bản tối riêng. Đã đo tương phản đủ 12 màu: chữ trắng trên nhãn nhóm ≥ 6:1, chữ trong dải ≥ 6:1 (sáng và tối).
- Điện thoại: icon + tên + nút Ghim trên một hàng, mô tả trải hết chiều ngang.
- Câu quyền riêng tư: bỏ hộp xanh, thay bằng chữ tô dạ quang (`--hl`) kèm khiên xanh.
- Màn chọn file: chính khung ứng dụng là vùng thả (viền đứt nhuộm màu nhóm, dùng `:has()`), bỏ hộp lồng bên trong và ô vuông quanh icon tải lên.
- Thẻ số (`.stat`, dùng ở khung văn bản và nhóm Tính toán): thành cột số có gạch trên, không đóng hộp; ô nổi bật gạch màu thương hiệu.
- Cách dùng và FAQ xếp hai cột trên màn ≥ 1000 px; FAQ là một khối có vạch ngăn, dấu +/− vẽ bằng CSS. "Công cụ liên quan" có thêm link "Xem cả N công cụ" của nhóm.
- Toast nền nâu đất, nút hành động viền vàng; toast lỗi nền đỏ đậm cố định (trước đây chế độ tối chữ trắng trên đỏ nhạt khó đọc). Nền mờ sau hộp thoại và bảng lệnh ám nâu. `.result-big` dùng font tiêu đề.
- Đã thử bằng Chrome headless ở 1280 px và 375 px, sáng và tối, bản tiếng Anh: Ghép PDF (file mẫu → ghép → kết quả), Đếm từ, Tính lương gross/net, Thuế TNCN, VietQR, Test webcam, hộp thoại và toast lỗi; console không lỗi; build, check, test đều qua.
- Để lại cho GĐ 4 (từ `impeccable detect`): bảng `.tbl-wrap` trong khung form vẫn bị tính là thẻ lồng thẻ (Thuế TNCN); màn bắt đầu của Scan tài liệu; số tiền dài trong thẻ số ở khổ 375 px vẫn xuống dòng ("1.082.500 đ/tháng"); khung camera của Test webcam chưa căn giữa trong khung.

### GĐ 3
- Trang nhóm và Giới thiệu dùng chung dải đầu trang với trang công cụ (`.tool-page.band-page`, không có khung đè lên): trang nhóm nhuộm màu nhóm, Giới thiệu nhuộm vàng đất (`--c: #C8922A`, tiêu đề không có icon: `.tool-head.plain`).
- Menu "Tất cả công cụ" (máy tính): mỗi cột nhóm có gạch trên 2 px màu chuyên mục. Ngăn kéo (điện thoại): tiêu đề font Bricolage, nền mờ ám nâu.
- Bảng lệnh: ẩn nút xoá màu xanh mặc định của ô tìm (đã có nút đóng riêng); nền mờ ám nâu.
- Giới thiệu: đoạn văn giới hạn 58ch, chữ 16,5 px, dấu đầu dòng màu thương hiệu. 404: số "404" dùng font tiêu đề.
- Đã thử bằng Chrome headless ở 1280 px và 375 px, sáng và tối, bản tiếng Anh (trang chủ, trang nhóm, bảng lệnh); `impeccable detect` sạch trên trang nhóm, Giới thiệu, 404; build, check, test đều qua.

### GĐ 4
- Quét `impeccable detect` cả 155 trang công cụ (máy chủ thử, 1280 px). Lỗi chính "thẻ lồng thẻ" ở 33 công cụ: bên trong khung ứng dụng, bảng `.tbl-wrap`, mục mở rộng `details`, danh sách `.ts-list`, thẻ mã HTTP, hộp mật khẩu, khoản chi (Chia tiền nhóm), thẻ đội (Bốc thăm) chuyển sang kẻ dòng/gạch trên thay vì đóng hộp; màn bắt đầu của Scan tài liệu bỏ viền đứt (khung đã là một thẻ).
- Nhóm Tính toán: thẻ số ít nhất 180 px một cột (hết cắt "1.002.083.414 đ"), điện thoại 2 cột; Thuế TNCN đưa "/tháng" vào nhãn. Cột kết quả dính lại khi cuộn nếu ngắn hơn màn hình mà form dài hơn (`.fm-out-in.stick`, `assets/frames/form.js`).
- Nút chọn kiểu (`.seg`): ô rộng theo chữ, chữ không xuống dòng giữa nhãn; cột tuỳ chọn khung file rộng 360 px (vừa "Giữ định dạng · JPG · WebP · PNG").
- Ô chọn màu bỏ khung trắng mặc định quanh mẫu màu. Trích dẫn Markdown: bỏ viền trái 4 px, thay bằng nền nhạt bo góc.
- Tương phản: số đếm ngược Tết (nền đỏ đậm hơn, chữ không trong suốt), nhãn pha Pomodoro ở chế độ tối, chữ mờ trong hoá đơn. Cấp tiêu đề: tên đội (Bốc thăm) và tiêu đề hoá đơn từ h3 lên h2.
- Chữ lẻ ở dòng cuối: `text-wrap: pretty` cho cả `li`, `small`, `summary`, `.hint`.
- Đã chụp thử với file mẫu: Sắp xếp trang PDF, Nén ảnh, Cắt âm thanh, Cắt video, Xem Excel, Tải sticker LINE, Markdown, Làm ảnh thẻ, Lãi vay, QR, Kiểm tra bàn phím, Thuế TNCN, Chia tiền, Bốc thăm, HTTP, Pomodoro, Đếm ngược Tết; 1280 px và 375 px, sáng và tối.
- Để lại có chủ ý: nền ô vuông ở Đổi mã màu và vùng so sánh ảnh (để thấy độ trong suốt); tờ hoá đơn xem trước (là trang giấy thật); thẻ thành phố của Đồng hồ thế giới; vùng thử chuột viền đứt; khung ghi âm.

### GĐ 5
- Chuyển động: một khoảnh khắc duy nhất, nét dạ quang quét qua cam kết quyền riêng tư (trang chủ, trang công cụ, Giới thiệu) khi mở trang, 1 giây, ease-out; chỉ ở giao diện sáng (ở nền tối chữ nâu sẽ khó đọc trước khi nét tô chạy tới); tắt khi người dùng chọn giảm chuyển động.
- Ảnh OG (`scripts/brand/og.html` → `assets/og.png`): nền vàng đất, logo, tiêu đề Bricolage, cụm quyền riêng tư tô dạ quang kèm khiên (bỏ emoji 🔒), 6 nhãn nhóm màu chuyên mục. Icon ứng dụng 512/180 px nền vàng đất đậm `#8A5A06`. Tạo lại: `node scripts/make-brand.js`.
- Review cuối (tác tử `impeccable-finish-reviewer`) trên ảnh chụp 1280/375, sáng/tối. Đã sửa: tiêu đề trang chủ không tách "tiện / ích"; trang 404 có dải đầu trang; Giới thiệu có câu quyền riêng tư tô dạ quang; gợi ý ô tìm ngắn lại cho vừa điện thoại; dải chip lọc mờ dần ở mép phải để thấy cuộn được; tên công cụ trong thẻ xuống dòng đẹp hơn (`text-wrap: pretty`); bỏ dòng "Nhận: PDF" lặp dưới vùng thả; thanh công cụ khung văn bản vừa một hàng ở 375 px; cụm tô dạ quang ở chân trang không bị tách chữ; tiêu đề trang chủ tiếng Anh không còn tràn sang lưới nhãn nhóm.
- Rà soát: bàn phím (Tab đi đúng thứ tự, mọi phần tử có viền focus 3 px), `impeccable detect` ở 1280 px và 390 px trên trang chủ, Giới thiệu, 404, trang công cụ, bản tiếng Anh: sạch.
- `DESIGN.md` (tác tử `impeccable-documenter`) ghi token màu, chữ, bo góc, thành phần và quy tắc nên/không nên từ mã đã chạy.
- Chưa làm, để người dùng quyết: đưa dải chip lọc nhóm lên ngay dưới khối đầu trang (trên "Phổ biến") và rút gọn "Phổ biến" (review đề xuất, nhưng đổi bố cục trang chủ đã chốt ở GĐ 1).
- Còn sót từ trước (ghi trong `DESIGN.md`): màu tô cú pháp code còn tím/xanh (`--code-key`, `--code-lit`), xám lạnh ở số trang PDF, vài hàng còn đóng hộp trong khung (`.fancy-row`, `.hash-row`, `.cron-fields`, `.pw-list`), nhãn viết hoa giãn chữ trong bảng lệnh (`.pal-sec`).
