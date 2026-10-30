---
name: BbeTools
description: Bộ công cụ tiện ích tiếng Việt chạy 100% trên trình duyệt, khoác màu vàng đất, mỗi nhóm là một chuyên mục có màu in riêng.
colors:
  brand: "#8A5A06"
  brand-hover: "#744A00"
  brand-ink: "#FFFFFF"
  brand-soft: "#FBF0D6"
  hero: "#D6A23A"
  hero-ink: "#2B1E08"
  hero-muted: "#4A3511"
  highlight: "#FFF4CC"
  highlight-ink: "#2B1E08"
  selection: "#FFDF85"
  footer: "#2A1E0A"
  footer-ink: "#F3E6C8"
  footer-muted: "#D9C49A"
  footer-accent: "#E6B655"
  bg: "#F6F4EF"
  surface: "#FFFFFF"
  surface-2: "#F0ECE3"
  ink: "#241C0E"
  muted: "#5F5A50"
  line: "#E6E0D3"
  line-2: "#D3CAB7"
  ok: "#17784C"
  ok-soft: "#E2F5EA"
  warn: "#8F5400"
  warn-soft: "#FFF3D1"
  err: "#C8232C"
  err-soft: "#FDEBEC"
  toast-err: "#9E1C24"
  star: "#E09B00"
  dark-bg: "#16130D"
  dark-surface: "#1F1B13"
  dark-surface-2: "#2A251B"
  dark-ink: "#F2ECDF"
  dark-muted: "#AFA796"
  dark-line: "#332D21"
  dark-brand: "#E6B655"
  dark-brand-hover: "#F0C670"
  dark-brand-ink: "#1F1606"
  dark-brand-soft: "#3A2E14"
  dark-hero: "#3A2A0E"
  dark-hero-ink: "#FFF3D6"
  dark-hero-muted: "#E8D3A8"
  category-pdf: "#E5484D"
  category-anh: "#8E4EC6"
  category-am-thanh-video: "#D6409F"
  category-van-ban: "#0D74CE"
  category-viet-nam: "#C27C0E"
  category-tinh-toan: "#E5701A"
  category-qr-ma-vach: "#475569"
  category-van-phong: "#18794E"
  category-lap-trinh: "#3E63DD"
  category-bao-mat: "#0E7C86"
  category-nang-suat: "#5C8A1C"
  category-tai-ve: "#0090FF"
  category-gioi-thieu: "#C8922A"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "clamp(36px, 6.2vw, 64px)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "clamp(28px, 4.6vw, 42px)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Bricolage Grotesque, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title-sm:
    fontFamily: "Bricolage Grotesque, Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  lead:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    lineHeight: 1.4
  card-name:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  stat:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Code, Roboto Mono, Menlo, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  xs: "7px"
  sm: "9px"
  md: "12px"
  tile: "13px"
  card: "16px"
  app: "18px"
  dialog: "20px"
  pill: "999px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  app-pad: "16px"
  app-pad-wide: "22px"
  overlap: "16px"
  overlap-wide: "28px"
  block: "36px"
  grid-gap: "12px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
    textColor: "{colors.brand-ink}"
  button-big:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    padding: "14px 30px"
    height: "54px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-soft:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.err-soft}"
    textColor: "{colors.err}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "46px"
  search-hero:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.hero-ink}"
    rounded: "{rounded.pill}"
    padding: "0 56px 0 54px"
    height: "60px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
    height: "38px"
  chip-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "14px 44px 14px 14px"
  app-frame:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.app}"
    padding: "{spacing.app-pad}"
  tile:
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.tile}"
    size: "42px"
  hero-band:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.hero-ink}"
    padding: "64px 0 60px"
  footer:
    backgroundColor: "{colors.footer}"
    textColor: "{colors.footer-ink}"
    padding: "52px 24px 12px"
  toast:
    backgroundColor: "{colors.footer}"
    textColor: "{colors.footer-ink}"
    rounded: "14px"
    padding: "12px 12px 12px 18px"
  toast-error:
    backgroundColor: "{colors.toast-err}"
    textColor: "{colors.brand-ink}"
    rounded: "14px"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "22px"
---

# Design System: BbeTools

## Overview

**Creative North Star: "Tờ báo học trò màu vàng đất"**

BbeTools là bộ đồ nghề hằng ngày của người Việt, mặc sự tự tin màu sắc của tạp chí học trò (Hoa Học Trò, Mực Tím) nhưng khoác tông vàng đất ấm thay cho tím. Mỗi nhóm công cụ là một "chuyên mục" có màu in riêng: màu đó xuất hiện ở tab tiêu đề nhóm, chấm của chip lọc, ô icon, gạch trên cột menu, và nhuộm cả dải đầu trang công cụ. Phần còn lại là giấy kem sáng, chữ nâu đất, nền chân trang nâu đậm như bìa sau của tờ báo.

Bố cục gọn, thẳng hàng, mật độ vừa phải cho người đến từ Google trên điện thoại: một trang, một việc. Không có gì nghiêng, xoay hay xê dịch; lưới cố định, các ô cùng chiều cao. Chiều sâu đến từ khung ứng dụng nổi trên dải màu (đè lên mép dưới dải), không từ những lớp hộp lồng nhau. Câu cam kết quyền riêng tư được tô dạ quang như người đọc lấy bút đánh dấu: đó là điểm nhấn duy nhất có chuyển động khi mở trang.

Hệ thống từ chối mặc định "SaaS xám + một màu chàm" và lưới thẻ vô danh; từ chối bản nghiêng/xoay (người dùng thấy "xộc xệch"); từ chối tím làm màu chủ đạo.

**Key Characteristics:**
- Vàng đất đậm làm màu thương hiệu (nút, link, focus); khối vàng đất tràn ngang ở đầu trang chủ; chân trang nâu đất.
- 12 màu chuyên mục, mỗi nhóm một màu, dùng làm nhãn in đặc chứ không làm trang trí rải rác.
- Tiêu đề Bricolage Grotesque 800 nén chặt; thân bài Be Vietnam Pro đủ dấu tiếng Việt.
- Nút viên thuốc, thẻ bo 16 px, ô icon vuông bo tròn có viền trắng.
- Bóng ám nâu, có độ lệch xuống dưới; trong khung ứng dụng mọi thứ kẻ dòng chứ không đóng hộp.
- Sáng và tối đều là giao diện hạng nhất; ưu tiên khổ 375 px.

## Colors

Bảng màu đất ấm: giấy kem, chữ nâu, vàng đất làm giọng chính, nâu đậm khép trang, cộng 12 màu in chuyên mục.

### Primary
- **Vàng đất đậm** (brand): nút chính, link, viền focus 3 px, caret, accent-color của checkbox/range, gạch trên của ô số nổi bật, dấu đầu dòng trong bài viết. Tối đổi sang **vàng mật** (dark-brand) để giữ tương phản trên nền nâu đen; chữ trên nút tối chuyển sang nâu (dark-brand-ink).
- **Vàng đất hover** (brand-hover): nền nút chính khi rê chuột.
- **Kem vàng** (brand-soft): nền nút phụ "soft", dòng đang chọn trong bảng lệnh, hàng nổi bật của bảng, hộp gợi ý, alert thông tin.
- **Khối vàng đất** (hero): khối tràn ngang đầu trang chủ và nền ảnh OG. Chữ trên khối là **nâu đất** (hero-ink), câu dẫn là **nâu hổ phách** (hero-muted). Tối: khối thành **nâu cà phê** (dark-hero), chữ kem (dark-hero-ink).

### Secondary
- **Màu chuyên mục** (category-*): 12 màu lấy từ trường `color` của mỗi nhóm trong `tools.json`, cộng vàng đất nhạt (category-gioi-thieu) cho trang Giới thiệu. Một trang chỉ mang màu của một nhóm, truyền qua biến `--c`. Từ đó `color-mix` (oklab) sinh ra nền dải (`--c` 13% với kem, tối 17% với nâu đen), mép dải, chữ dải, chữ phụ dải, và nhãn đặc (`--tab`: `--c` 76% trộn đen; tab tiêu đề nhóm 82%). Đã đo: chữ trắng trên nhãn nhóm ≥ 6:1, chữ trong dải ≥ 6:1 ở cả sáng và tối.

### Tertiary
- **Dạ quang vàng** (highlight): nền tô nổi cụm "file không bao giờ rời khỏi máy bạn" ở trang chủ, chân trang và câu quyền riêng tư trên trang công cụ; chữ luôn là nâu đất (highlight-ink) ở cả hai chế độ.
- **Vàng bôi chọn** (selection): `::selection`.
- **Nâu bìa sau** (footer): nền chân trang và toast. Chữ kem (footer-ink), chữ phụ be (footer-muted), điểm nhấn vàng mật (footer-accent) cho chữ "Tools" trong logo, hover link, viền nút trong toast.

### Neutral
- **Giấy kem** (bg): nền trang. Tối: **nâu đen** (dark-bg).
- **Trắng giấy** (surface): thẻ, khung ứng dụng, ô nhập, header (92% trong suốt, blur). Tối: dark-surface.
- **Kem xám** (surface-2): nền nhóm nút chọn kiểu, thead bảng, `code`, `kbd`, hover của nút icon.
- **Nâu mực** (ink): chữ chính. **Nâu xám** (muted): chữ phụ, mô tả thẻ, gợi ý.
- **Viền cát** (line): viền thẻ, vạch ngăn. **Viền cát đậm** (line-2): viền ô nhập, nút ghost, gạch trên mặc định của ô số.
- **Trạng thái**: xanh lá (ok) cho khiên quyền riêng tư và thành công, nâu cam (warn) cho badge "Mới"/ghi chú, đỏ (err) cho lỗi; mỗi màu có bản nền nhạt *-soft. Sao yêu thích dùng vàng sao (star). Toast lỗi dùng đỏ đậm cố định (toast-err) ở cả hai chế độ.

### Named Rules
**The Một Chuyên Mục Một Màu Rule.** Màu chuyên mục là nhãn in, không phải trang trí: mỗi trang chỉ mang `--c` của đúng một nhóm, và mọi sắc độ của nó được sinh bằng `color-mix` từ `--c`, không viết cứng mã màu mới.

**The Vàng Đất Không Phải Tím Rule.** Màu thương hiệu là vàng đất đậm; tím chỉ còn là màu chuyên mục của nhóm Ảnh (category-anh), không bao giờ làm màu nút, link hay nền khối.

**The Dạ Quang Một Câu Rule.** Nền dạ quang chỉ dành cho cam kết "file không rời khỏi máy". Không dùng nó để nhấn từ khoá khác.

## Typography

**Display Font:** Bricolage Grotesque 800 (fallback Be Vietnam Pro, system-ui), chỉ tải đúng một độ đậm, có đủ dấu tiếng Việt.
**Body Font:** Be Vietnam Pro 400/600/700/800 (fallback system-ui, -apple-system, Segoe UI, Roboto), chỉ tải các dải ký tự cần dùng.
**Label/Mono Font:** ui-monospace, SF Mono, Cascadia Code, Roboto Mono (hệ thống, không tải về) cho mã, JSON, hash.

**Character:** Bricolage đậm, chặt chữ, có chút nghịch ngợm của tít báo học trò; Be Vietnam Pro tròn, rõ, sinh ra cho dấu tiếng Việt. Tít ồn ào, thân bài điềm đạm.

### Hierarchy
- **Display** (800, clamp 36–64 px, line-height 1.04, -0.035em): chỉ tiêu đề khối vàng đất trang chủ (tối đa 13ch) và ảnh OG.
- **Headline** (800, clamp 28–42 px, 1.2, -0.03em): tên công cụ / nhóm trong dải đầu trang; điện thoại 26 px. Trang thường dùng clamp 26–36 px.
- **Title** (800, 24 px, -0.025em): tiêu đề khối "Phổ biến", "Yêu thích"… Tab chuyên mục, h2 trong bài và tiêu đề kết quả dùng 21 px; tiêu đề vùng thả file và hộp thoại 22 px. Số kết quả lớn của khung form (`.result-big`) cũng dùng font tiêu đề.
- **Body** (400, 16 px, 1.55): chữ chung; ô nhập luôn 16 px để iOS không phóng to. Bài viết (Giới thiệu) 16,5 px / 1,65, tối đa 58ch. Câu dẫn 17 px (điện thoại 15,5 px).
- **Label** (600, 14,5 px): nhãn ô nhập, chip, nút chọn kiểu, tiêu đề nhóm tuỳ chọn (700). Gợi ý 13 px muted.
- **Stat** (800, 26 px, chữ số đều): số trong cột số liệu; mọi con số, tiền, thời gian dùng `font-variant-numeric: tabular-nums`.

### Named Rules
**The Chỉ h1 h2 Rule.** Font tiêu đề chỉ cho h1, h2, logo chữ, số bước, số 404 và số kết quả lớn. h3 trở xuống, nút, nhãn, chữ phụ trong tiêu đề (`small`) luôn là Be Vietnam Pro.

**The Dấu Đủ Rule.** Mọi font phải có dải ký tự tiếng Việt; không thay bằng font hiển thị thiếu dấu, không dùng font hệ thống làm tít.

## Layout

Khung chứa tối đa 1200 px, lề 16 px (điện thoại) / 24 px (từ 720 px); trang hẹp 760 px. Điểm ngắt dùng nhất quán: 560, 600, 720, 900, 960, 1000 px. Header dính, cao 60 px.

- **Trang chủ:** khối vàng đất tràn ngang (đệm 40/36 px, từ 720 px là 64/60 px). Từ 960 px chia hai cột 1,15fr / 1fr: trái là tít, câu dẫn, ô tìm 60 px, dòng gợi ý thả file; phải là lưới 2 cột 12 nhãn nhóm cùng chiều cao (tối thiểu 62 px). Điện thoại: một cột, ẩn lưới nhãn. Dưới khối là dải chip lọc dính ngay dưới header, cuộn ngang.
- **Lưới thẻ:** `auto-fill, minmax(270px, 1fr)`, khe 12 px; dưới 600 px một cột, khe 8 px, mô tả còn một dòng.
- **Trang công cụ:** dải đầu trang nhuộm màu nhóm chứa đường dẫn, icon + tên + nút Ghim, mô tả (64ch), câu quyền riêng tư (72ch). Khung ứng dụng kéo lên đè mép dưới dải một khoảng `overlap` (16 px điện thoại, 28 px máy tính). Điện thoại: icon, tên, Ghim trên một hàng; mô tả trải hết chiều ngang.
- **Trang nhóm, Giới thiệu:** cùng dải đầu trang nhưng không có khung đè (đệm dưới 30 px).
- **Bên trong khung:** khung file chia cột chính + cột tuỳ chọn 360 px từ 900 px (cột tuỳ chọn ngăn bằng vạch trái); khung văn bản hai ô song song từ 900 px; khung form hai cột 1fr / 1,05fr, cột kết quả nền pha giấy kem và dính khi cuộn. Dưới 900 px, cụm nút hành động dính đáy màn hình.
- **Cách dùng + FAQ:** từ 1000 px xếp hai cột 5fr / 7fr, khe 56 px.
- **Nhịp:** khối cách nhau 36 px; đệm trong khung 16 px / 22 px; khoảng cách giữa các phần tử nhỏ 8–14 px. Chân trang cách nội dung 64 px, chia 2fr / 1,4fr / 1fr từ 720 px.

### Named Rules
**The Thẳng Hàng Rule.** Không nghiêng, không xoay, không xê dịch lệch trục. Lưới cố định cột, ô cùng hàng cùng chiều cao.

## Elevation & Depth

Hệ lai: phần lớn phẳng, viền mảnh màu cát; bóng chỉ xuất hiện để nâng đúng ba thứ: khung ứng dụng, thẻ khi rê/focus, và lớp phủ (menu, bảng lệnh, hộp thoại, toast). Bóng luôn ám nâu (rgba 60,40,8 / 45,30,6) và lệch xuống, không phải quầng sáng đều. Tối dùng bóng đen đậm hơn.

### Shadow Vocabulary
- **Nổi nhẹ** (`--shadow`: `0 1px 2px rgba(60,40,8,.06), 0 6px 18px -6px rgba(60,40,8,.16)`): khung ứng dụng lúc nghỉ, thẻ khi rê chuột, ô đang chọn trong nút chọn kiểu.
- **Khung đè dải** (`0 2px 3px -1px var(--drop), 0 18px 40px -22px var(--drop)`, `--drop` = `rgba(60,40,8,.32)`): khung ứng dụng trên trang công cụ, nơi nó đè lên dải màu.
- **Lớp phủ** (`--shadow-lg`: `0 20px 48px -12px rgba(45,30,6,.34)`): mega menu, bảng lệnh, hộp thoại, lớp thả file.
- **Nổi trên khối vàng** (`0 12px 30px -14px rgba(45,30,6,.55)`): ô tìm trang chủ; nhãn nhóm dùng `0 6px 16px -10px` cùng màu.
- **Nhãn đặc** (`0 4px 12px -6px var(--drop)`): tab chuyên mục, ô số bước, viền 2 px màu nền quanh ô icon (`0 0 0 2px var(--surface), 0 3px 8px -3px var(--drop)`).
- **Nền mờ**: hộp thoại, bảng lệnh, ngăn kéo dùng `rgba(30,20,4,.5)` ám nâu.

### Named Rules
**The Một Lớp Nổi Rule.** Khung ứng dụng đã là một thẻ nổi. Bên trong nó không có thêm lớp hộp có bóng hay viền bốn phía; phân tầng bằng vạch kẻ.

## Shapes

Góc mềm, đều tay, tăng theo kích thước: 7 px cho nhãn nhóm trong đường dẫn và ô icon nhỏ nhất, 9–10 px cho nút icon và ô số bước, 12 px cho ô nhập, alert, bảng, mục FAQ lẻ, 13 px cho ô icon chuẩn, 16 px cho thẻ, 18 px cho khung ứng dụng và bảng lệnh, 20 px cho hộp thoại. Mọi nút hành động, chip, ô tìm, badge là viên thuốc (999 px).

- **Ô icon nhóm:** vuông bo tròn, nền màu chuyên mục, icon trắng, viền 2 px màu nền (trắng ở chế độ sáng). Bốn cỡ: 24, 30, 42, 56 px.
- **Gạch trên:** dấu hiệu cấu trúc lặp lại: dải đầu trang có gạch 4 px màu nhóm ở mép trên; cột mega menu gạch 2 px màu nhóm; cột số liệu gạch 2 px (nổi bật thì màu thương hiệu).
- **Viền đứt:** chỉ cho vùng thả file (2 px, màu nhóm 38% pha viền) và lớp phủ khi kéo file vào trang (3 px vàng đất).
- **Dấu +/−** của FAQ vẽ bằng hai gradient 12×2 px, không phải ký tự hay icon.

## Components

### Buttons
Viên thuốc chắc tay, dễ bấm cho người lớn tuổi.
- **Shape:** viên thuốc (999 px), cao tối thiểu 44 px; cỡ lớn 54 px, chữ 18 px; cỡ nhỏ 36 px, chữ 14 px.
- **Primary:** nền vàng đất đậm, chữ trắng, 700, 15,5 px, đệm 10/20 px, icon cách chữ 8 px.
- **Hover / Focus:** nền đậm hơn và bóng `0 6px 16px -8px var(--drop)`; nhấn xuống lún 1 px; focus là viền 3 px màu thương hiệu, cách 2 px. Vô hiệu: mờ 50%.
- **Ghost:** nền trắng, viền cát đậm; hover đổi viền và chữ sang vàng đất. **Soft:** nền kem vàng, chữ vàng đất. **Danger:** nền đỏ nhạt, chữ đỏ.
- **Nút icon:** ô 40 px (nhỏ 34 px), bo 10 px, nền trong suốt, hover nền kem xám.

### Chips
- **Style:** viên thuốc cao 38 px, nền trắng, viền cát, chữ 600 14,5 px; chip nhóm có chấm vuông 9 px màu chuyên mục ở đầu, số lượng là `small` muted.
- **State:** đang chọn thì nền là màu chuyên mục trộn 20% đen, chữ trắng, chấm trắng; chip "Tất cả" đang chọn dùng màu thương hiệu. Hover đổi viền sang màu nhóm 60%.

### Cards / Containers
- **Thẻ công cụ:** bo 16 px, nền trắng, viền cát, ô icon 42 px + tên (700, 16 px) + mô tả hai dòng (muted, 14 px). Hover/focus: viền chuyển màu nhóm 55%, bóng nổi nhẹ, nhấc 2 px, ô icon phóng 1,06. Nút sao ẩn đến khi rê chuột (trên thiết bị có chuột).
- **Khung ứng dụng:** bo 18 px, nền trắng, viền cát, bóng nổi nhẹ (trên trang công cụ là bóng đè dải), cao tối thiểu 220 px; đệm 16 / 22 px.
- **Hộp gợi ý:** nền kem vàng, viền vàng đất 30%, bo 16 px.

### Inputs / Fields
- **Style:** cao 46 px, đệm 10/14 px, bo 12 px, viền cát đậm, nền trắng, chữ 16 px; nhãn 600 14,5 px phía trên, khe 6 px. Select tự vẽ mũi tên bằng gradient.
- **Focus:** viền vàng đất + vòng 3 px vàng đất 25%. Hover: viền pha 45% màu thương hiệu.
- **Error / Disabled:** viền và chữ lỗi màu đỏ (13,5 px). Nút chọn kiểu (segmented) là hàng ô trên nền kem xám, ô đang chọn nổi trắng có bóng.
- **Ô tìm trang chủ:** viên thuốc trắng 60 px trên khối vàng, icon kính lúp vàng đất, chữ 18 px, phím tắt `/`; focus là hai vòng 3 px (màu khối rồi màu chữ khối).

### Navigation
- **Header:** dính, nền trắng 92% + blur, vạch dưới; logo chữ Bricolage 21 px ("Tools" màu thương hiệu), nút "Tất cả công cụ", ô tìm dạng viên thuốc 280 px kèm `kbd`, chuyển ngôn ngữ, chuyển giao diện. Điện thoại: nút menu lên đầu, ô tìm thu thành nút icon.
- **Mega menu (máy tính):** lưới cột `minmax(210px, 1fr)`, mỗi cột nhóm có gạch trên 2 px màu chuyên mục, link muted 14,5 px, hover/đang ở trang thì vàng đất. **Ngăn kéo (điện thoại):** trượt từ trái, rộng tối đa 360 px, tiêu đề Bricolage, mỗi nhóm ngăn bằng vạch dưới, nền phủ ám nâu.
- **Đường dẫn:** 14 px muted, ngăn bằng "›"; trong dải trang công cụ, tên nhóm là nhãn đặc màu `--tab`, chữ trắng 700, bo 7 px.
- **Bảng lệnh (Ctrl/⌘+K):** hộp 640 px bo 18 px, ô tìm 60 px, dòng chọn nền kem vàng; điện thoại toàn màn hình.

### Dải đầu trang chuyên mục
Nét chữ ký của hệ thống. Nền `--band` (màu nhóm pha kem), gạch trên 4 px màu nhóm, vạch dưới `--band-edge`; chữ `--band-ink`, chữ phụ `--band-muted`; focus trong dải dùng màu chữ dải. Có bản tối riêng.

### Tab chuyên mục
Tiêu đề mỗi nhóm trên trang chủ là một nhãn đặc: nền màu nhóm trộn 18% đen, chữ trắng Bricolage 21 px, icon trắng, đệm 7/16/7/12 px, bo 12 px, bóng nhãn đặc. Số công cụ đứng ngoài nhãn, Be Vietnam Pro muted.

### Câu quyền riêng tư
Khiên xanh 21 px bên trái, chữ 600 15 px; phần câu cam kết nằm trên nền dạ quang bo 5 px (`box-decoration-break: clone` để mỗi dòng có nền riêng). Đây là **khoảnh khắc chuyển động duy nhất**: nét dạ quang quét từ trái sang (`background-size` 0 → 100%, 1 s, `cubic-bezier(.16,1,.3,1)`, trễ 0,3 s) khi mở trang, chỉ ở giao diện sáng, tắt khi người dùng chọn giảm chuyển động. Cụm tô nổi trong câu dẫn trang chủ chạy cùng hiệu ứng.

### Vùng thả file
Chính khung ứng dụng là vùng thả: viền đứt 2 px nhuộm màu nhóm, nền pha 3% màu nhóm, hover đậm viền lên 62%. Icon tải lên 44 px nét 1,75 màu nhóm, không có ô vuông bao; tiêu đề 22 px, định dạng nhận 12,5 px giãn chữ nhẹ.

### Bước và FAQ
- **Cách dùng:** danh sách đánh số, số trong ô vuông 30 px bo 9 px nền `--tab`, chữ trắng Bricolage 800 15 px.
- **FAQ:** một khối liền, các mục chồng viền (−1 px), chỉ bo góc ngoài 14 px; dấu +/− vẽ bằng CSS, mở ra thì thành − màu thương hiệu.

### Số liệu và bảng trong khung
- **Cột số:** gạch trên 2 px cát đậm, số 800 26 px chữ số đều, nhãn muted 13,5 px; ô nổi bật gạch và số màu thương hiệu. Không đóng hộp.
- **Bảng, mục mở rộng, danh sách giá trị:** trong khung chỉ kẻ dòng trên/dưới, bỏ bo góc và nền riêng.

### Toast và hộp thoại
- **Toast:** nền nâu bìa sau, chữ kem, bo 14 px, nút hành động viên thuốc viền vàng mật; hiện lên bằng trượt 14 px + phóng 0,98 → 1 trong 0,32 s. Toast lỗi nền đỏ đậm cố định, chữ trắng.
- **Hộp thoại:** bo 20 px, rộng 480 px (rộng 720 px), đệm 22 px, bóng lớp phủ, nền mờ ám nâu.

## Do's and Don'ts

### Do:
- **Do** dùng vàng đất đậm (brand) cho mọi nút chính, link và focus; dùng khối vàng đất (hero) chỉ cho khối đầu trang chủ và ảnh OG.
- **Do** truyền màu nhóm qua `--c` và sinh mọi sắc độ bằng `color-mix` (nền dải, chữ dải, nhãn `--tab`), kiểm tra lại tương phản ≥ 4,5:1 ở cả sáng và tối khi thêm nhóm mới.
- **Do** giữ bố cục gọn, thẳng hàng: lưới cố định, ô cùng hàng cùng chiều cao, mọi icon cùng cỡ và cùng đường chân.
- **Do** để khung ứng dụng là thẻ duy nhất trên trang công cụ; bên trong nó dùng vạch kẻ (bảng, mục mở rộng, danh sách) và cột số có gạch trên.
- **Do** dùng icon Lucide từ `assets/icons.svg`, nét 2 px, 20 px mặc định, màu theo chữ (`currentColor`).
- **Do** giữ câu "file không rời khỏi máy bạn" trên nền dạ quang ở mọi nơi người dùng đưa file vào.
- **Do** dùng bóng ám nâu lệch xuống theo đúng bộ trong Elevation & Depth; tối dùng bản bóng đen.
- **Do** dùng chữ số đều (`tabular-nums`) cho tiền, số đếm, thời gian.

### Don't:
- **Don't** đưa tím (hay chàm SaaS) trở lại làm màu chủ đạo; tím chỉ còn là màu chuyên mục của nhóm Ảnh.
- **Don't** nghiêng, xoay hay xê dịch lệch trục bất kỳ khối, thẻ, nhãn nào (người dùng đã bỏ bản nghiêng vì "xộc xệch").
- **Don't** lồng thẻ có viền bốn phía hoặc có bóng bên trong khung ứng dụng; không bọc vùng thả file bằng hộp thứ hai.
- **Don't** dùng viền màu một bên (side-stripe) làm điểm nhấn cho thẻ, alert hay trích dẫn; dùng nền nhạt hoặc gạch trên.
- **Don't** dùng emoji hay ký tự làm icon; chỉ icon Lucide dạng SVG.
- **Don't** thêm chuyển động khi mở trang ngoài nét dạ quang quét qua câu quyền riêng tư (và chỉ ở giao diện sáng). Chuyển trạng thái (hover, nhấn, toast hiện lên, thanh tiến trình) vẫn được, ngắn dưới 0,35 s.
- **Don't** dùng nền dạ quang để nhấn chữ khác ngoài cam kết quyền riêng tư.
- **Don't** đặt nhãn nhỏ viết hoa giãn chữ (eyebrow/kicker) phía trên tiêu đề, và không dùng font hệ thống hay font thiếu dấu tiếng Việt cho tít.
