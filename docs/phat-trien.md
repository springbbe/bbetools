# Tài liệu phát triển BbeTools

## Cấu trúc

```
tools.json                 REGISTRY – nguồn dữ liệu duy nhất: nhóm và công cụ (id, slug, tên, nhóm, mô tả,
                           từ khoá, icon, kiểu khung, loại file nhận, trạng thái, công cụ liên quan, cách dùng, FAQ)
data/                      dữ liệu dễ lỗi thời, mỗi file có "title", "updated", "source" (ngày cập nhật hiện trên trang)
assets/
  app.css                  giao diện chung (sáng/tối)
  core.js                  lõi: header, mega-menu/ngăn kéo, bảng lệnh (/ hoặc Ctrl/⌘+K), yêu thích ★, gần đây,
                           nhận file (chọn/kéo thả/dán), chuyển file giữa công cụ, tải thư viện theo nhu cầu
  frames/file.js           khung 1: file vào → file ra
  frames/text.js           khung 2: văn bản vào → văn bản ra
  frames/form.js           khung 3: form / máy tính (trạng thái trên URL)
  frames/interactive.js    khung 4: tương tác (camera, âm thanh, hẹn giờ…)
  pdf.js, image.js, qr.js  tiện ích dùng chung cho nhóm PDF, ảnh, QR
  calc.js                  tiện ích dùng chung cho công cụ tính toán: đọc data/*.json, định dạng tiền, bảng, thẻ số, tải CSV
  sheet.js                 tiện ích dùng chung cho nhóm Văn phòng: đọc Excel (SheetJS) / CSV (tự nhận bảng mã, dấu phân cách),
                           hiện ô kiểu Việt Nam (15.000.000; 15/01/2026), ghi .xlsx / .csv, bảng xem trước
  fonts.js                 font có dấu tiếng Việt để vẽ chữ lên canvas (tải khi cần)
  security.js              tiện ích dùng chung cho nhóm Bảo mật (thanh độ mạnh mật khẩu)
  devices.js               các phần kiểm tra thiết bị (camera, micro, loa, bàn phím, chuột, màn hình): dùng chung cho trang gộp
                           kiem-tra-thiet-bi và 6 trang riêng (mỗi trang một thiết bị, để có tiêu đề/FAQ riêng cho SEO)
  sticker.js               dùng chung cho nhóm Tải về (sticker, emoji, emote): Lottie/APNG/WEBP động → GIF, ảnh → PNG, tải nhiều luồng
                           (tự thử lại khi lỗi mạng), packView() là khung một bộ (chọn dạng file, cỡ, lọc theo tên, lưới, tải từng cái hoặc .zip)
  media.js                 tiện ích dùng chung cho nhóm Âm thanh & video: đọc thông tin file, chuyển đổi/cắt/nén (Mediabunny),
                           giải mã/mã hoá âm thanh, thanh chọn đoạn (dạng sóng hoặc dải ảnh), trình phát, xem trước kết quả
  pdf-pages.js             "bảng trang" PDF: pageTool() dựng trên khung file, mỗi trang một thẻ (chọn, xoay, xoá, đổi chỗ, xem trước)
  pdf-objects.js           đi qua đối tượng bên trong PDF (nội dung trang, form, pattern, ảnh), giải nén luồng, đọc hệ màu
  ai/matting.js            AI tách nền (MODNet) + nhận diện khuôn mặt (UltraFace) chạy bằng onnxruntime-web
  en/                      (sinh tự động) bản dịch tiếng Anh của các module JS và registry, xem mục Đa ngôn ngữ
  lib/*.js                 hàm thuần, có test: telegram, search, filetype, doc-so, am-lich, vietqr, json-tools, text-stats, page-ranges, pdf-geom, pdf-text, pdf-content, pdf-image, scan, image-geom, exif, image-data, ocr-text, tien-luong, tai-chinh, tien-dien, bhxh, con-giap, don-vi, chia-tien, ngay, suc-khoe, bieu-thuc, so-la-ma, phan-tram, dvhc, ma-tinh, van-ban, vn-encoding, telex, diff, encode, hash, uuid, color, co-so, cron, timestamp, csv,
                           fancy-text, lorem, http-status, minify, regex, css-gen, ma-vach, bang, tron-thu, hoa-don, chu-ky-email,
                           ngau-nhien, mat-khau (+ tu-mat-khau), ma-hoa, totp, checksum, bam-gio, mui-gio, checklist, media, tts,
                           anim, line, signal, noto-emoji, twitch, discord, youtube
  regex-run.js, regex-worker.js   chạy biểu thức chính quy trong Web Worker có giới hạn thời gian (không treo trang)
  tools/<id>.js            logic riêng của từng công cụ
  registry.js              (sinh tự động) bản rút gọn của tools.json cho trình duyệt
  icons.svg                sprite icon Lucide (ISC)
models/                    mô hình AI đặt trong repo (MODNet Apache-2.0, UltraFace MIT)
samples/                   file mẫu cho nút "Thử với file mẫu"
<slug>/index.html          (sinh tự động) trang từng công cụ: ghep-pdf/, nen-anh/, doc-so-thanh-chu/…
en/                        (sinh tự động) trang tiếng Anh: en/index.html, en/<id>/, en/category/<nhóm>/, en/about/
i18n/en/                   từ điển tiếng Anh: tools.json (nội dung registry), pages.json (khung trang), js/** (chuỗi trong JS)
nhom/<nhóm>/index.html     (sinh tự động) trang nhóm: nhom/pdf/, nhom/anh/…
index.html, 404.html, gioi-thieu/, sitemap.xml, robots.txt, manifest.webmanifest   (sinh tự động)
scripts/build.js           sinh mọi trang từ tools.json (mọi ngôn ngữ)
scripts/i18n.js            dịch module JS lúc build, đồ thị import, `extract` thêm khoá còn thiếu vào từ điển
scripts/serve.js           server chạy thử ở máy (tắt cache, phục vụ dưới /bbetools/ giống GitHub Pages)
scripts/check.js           kiểm tra registry, đường dẫn tương đối, thẻ SEO
scripts/icons.js           tạo assets/icons.svg từ Lucide
scripts/make-samples.js    tạo lại file mẫu (Chrome headless + sips trên macOS)
scripts/make-brand.js      tạo ảnh OG và icon ứng dụng
scripts/samples/           trang và script tạo từng nhóm file mẫu (media.js: nhạc, video qua Chrome headless + DevTools Protocol)
scripts/data-dvhc.js       tạo lại data/don-vi-hanh-chinh.json và data/ma-tinh.json từ bộ dữ liệu mở (cần mạng)
scripts/data-noto-emoji.js tạo lại data/noto-emoji.json (danh sách Noto Animated Emoji + tên tiếng Việt theo CLDR, cần mạng)
tests/                     test cho hàm thuần (node --test)
CLAUDE.md                  quy ước cho AI (Claude Code) khi sửa repo
.claude/launch.json        cấu hình chạy thử (preview) cho Claude Code
```

## Đa ngôn ngữ (tiếng Việt + tiếng Anh)

- Tiếng Việt ở gốc site (`/bbetools/ghep-pdf/`), tiếng Anh dưới `/bbetools/en/` với slug là `id` công cụ (`/bbetools/en/merge-pdf/`), trang nhóm `en/category/<id>/`, giới thiệu `en/about/`. Mỗi trang có `hreflang` tới bản kia, nút đổi ngôn ngữ ở header; trang tiếng Việt gợi ý bản tiếng Anh (một lần) khi trình duyệt không dùng tiếng Việt.
- Công cụ chỉ dành cho người Việt (`"vnOnly": true` trong `tools.json`: cả nhóm Tiện ích Việt Nam, bỏ dấu, TCVN3/VNI, sửa Telex, Lorem tiếng Việt, VAT, hoá đơn) không có trang tiếng Anh; nhóm không còn công cụ nào thì ẩn.
- **Mã nguồn không đổi cách viết**: chuỗi tiếng Việt viết thẳng trong JS như cũ. `scripts/i18n.js` dùng acorn (`scripts/vendor/acorn.mjs`) đọc từng module mà trang tiếng Anh cần (đi theo `import`), thay mọi chuỗi và template literal có trong từ điển, ghi ra `assets/en/<cùng đường dẫn>` (import tương đối giữ nguyên nên các bản dịch nhập lẫn nhau; `assets/en/registry.js` do build sinh từ bản dịch registry).
- Từ điển: `i18n/en/js/<đường dẫn trong assets>.json` (`{ "chuỗi gốc": "bản dịch" }`), dùng chung `i18n/en/js/_shared.json` (vd. `"vi-VN": "en-US"`). Template: `${…}` thành `{0}`, `{1}` theo thứ tự, bản dịch được đổi chỗ; số nhiều `{0|file|files}`. `null` = chưa dịch; ghi lại y nguyên chuỗi gốc nếu cố ý giữ; `"@keep": true` giữ cả file (vd. `lib/doc-so`). Chuỗi không dấu (tên file tải về như `"-da-nen.pdf"`) chỉ dịch khi có trong từ điển.
- Nội dung trang: `i18n/en/tools.json` (`site`, `groups`, `tools.<id>`: name, desc, keywords, howto, faq, privacy; `data.<tên>`: title, source) và `i18n/en/pages.json` (câu của khung trang trong `build.js`, viết qua `tr("…")`).
- Quy trình: sửa JS → `node scripts/i18n.js extract` (thêm khoá thiếu với giá trị `null`, bỏ khoá thừa chưa dịch) → điền bản dịch → `node scripts/build.js`. `build.js` cảnh báo, `check.js` báo lỗi khi còn chuỗi, câu hoặc công cụ chưa dịch. `node scripts/build.js --missing` in các câu khung trang còn thiếu.
- Chỗ khác nhau về logic: `LANG`, `HOME` (trang chủ của ngôn ngữ hiện tại, dùng cho mọi link tới công cụ), `toolHref()` trong `core.js`; ví dụ ô tiền dùng dấu nhóm nghìn theo ngôn ngữ, Đổi timestamp/Giải thích cron lấy giờ máy làm mặc định ở trang tiếng Anh, Chia tiền nhóm ẩn nút VietQR. `lib/don-vi.js` tự chọn dấu thập phân theo `html lang`. Đừng viết cứng `ROOT + "slug-tieng-viet/"`: dùng `HOME + "slug/"` và thêm slug tiếng Anh vào từ điển của file.
- Trang 404 dùng chung: đường dẫn dưới `en/` nạp `assets/en/notfound.js`, module tự đổi chữ trên trang.
- Thêm ngôn ngữ mới: thêm vào `LANGS` trong `scripts/i18n.js`, tạo `i18n/<lang>/` (chép cấu trúc của `en`), chạy extract rồi dịch.

## Sinh trang và deploy

`node scripts/build.js` đọc `tools.json` rồi sinh trang chủ, trang nhóm, trang từng công cụ, 404, trang giới thiệu, sitemap, `assets/registry.js`. Chỉ công cụ `"status": "done"` (hoặc `"beta"`) mới có trang; công cụ `"todo"` bị ẩn.

Kết quả được commit thẳng vào repo và GitHub Pages phục vụ nhánh `main` nguyên trạng, **không dùng GitHub Actions**: deploy không cần bước build, trang chạy ở máy giống hệt trang trên mạng, và bớt một chỗ có thể hỏng. `node scripts/check.js` (gọi `build.js --check`) báo lỗi nếu quên sinh lại trang sau khi sửa `tools.json`.

## Thống kê truy cập

Google Analytics 4 (mã trong `site.gaId` của `tools.json`) được `scripts/build.js` chèn vào đầu `<head>` của mọi trang. Cấu hình chỉ gửi `location.origin + location.pathname` (bỏ `?…`, `#…`) vì các công cụ dạng form lưu số liệu người dùng nhập trên URL. `window.btReplaceState` giữ bản gốc của `history.replaceState` trước khi gtag.js tải, và `replaceUrl()` trong `core.js` dùng bản này để đổi URL mà GA không ghi thành lượt xem mới. Nên tắt thêm trong GA: Quản trị → Luồng dữ liệu → Đo lường nâng cao → Lượt xem trang → "Thay đổi trang dựa trên sự kiện lịch sử trình duyệt". Xoá `gaId` là bỏ hẳn GA.

## Đường dẫn

Site nằm dưới `/bbetools/` nên mọi đường dẫn trong HTML/JS/CSS đều **tương đối** (`../assets/…`). Ngoại lệ bắt buộc: `canonical`, Open Graph, JSON-LD và `sitemap.xml` dùng URL tuyệt đối lấy từ `site.baseUrl`. Riêng `404.html` (GitHub Pages trả về ở mọi độ sâu) tự đặt `<base href>` bằng một đoạn script nhỏ, rồi tự chuyển hướng các slug phụ (`aliases`, ví dụ `/gop-pdf` → `/ghep-pdf/`) và gợi ý công cụ gần đúng.

## Thư viện (ghim phiên bản, tải khi cần)

Khai báo trong bảng `LIBS` của `assets/core.js`, gọi bằng `lib("tên")` ngay trong công cụ cần đến.

| Thư viện | Dùng cho |
|---|---|
| `@cantoo/pdf-lib@2.11.1` | ghi, sửa PDF (có mã hoá AES) |
| `@pdf-lib/fontkit@1.1.1` + `@expo-google-fonts/be-vietnam-pro@0.4.1` (TTF thường và đậm) | nhúng font tiếng Việt vào PDF (`embedVnFont(doc, bold)`: điền form, trộn thư, hoá đơn), tắt chữ ghép fi/fl để sao chép chữ từ PDF ra đúng |
| `pdfjs-dist@4.10.38` (legacy) | đọc, vẽ trang PDF |
| `jszip@3.10.1` | tải nhiều file dạng .zip |
| `heic-to@1.6.5` | giải mã HEIC (libheif WebAssembly) |
| `@jsquash/jpeg@1.6.0`, `@jsquash/webp@1.5.0` | MozJPEG, WebP (khi trình duyệt không tự xuất WebP) |
| `upng-js@2.1.0` + `pako@2.1.0` | PNG giảm màu; giải mã APNG (sticker LINE, Signal) thành từng khung để đổi sang GIF |
| `qrcode-generator@2.0.4` | tạo QR |
| `zxing-wasm@3.1.5` | đọc QR, mã vạch (dự phòng khi trình duyệt không có BarcodeDetector) |
| `gifenc@1.0.3` | mã hoá ảnh động GIF (Tạo GIF, Video sang GIF, nhóm Tải về) |
| `lottie-web@5.13.0` (bản canvas) | vẽ sticker động Telegram (.tgs = Lottie nén gzip) và emoji Noto (lottie.json) để xem trước và đổi sang GIF |
| `tesseract.js@7.0.0` + `tesseract.js-core@7.0.0` + `@tesseract.js-data/vie`, `eng@1.0.0` | nhận dạng chữ (OCR), chạy WebAssembly trong Web Worker |
| `@jsquash/avif@2.1.1` | xuất AVIF (bản đơn luồng) khi trình duyệt không tự xuất được |
| `onnxruntime-web@1.30.0` | chạy mô hình AI (đơn luồng, không cần COOP/COEP) |
| `marked@18.1.0` + `dompurify@3.4.16` | Markdown sang HTML, lọc mã độc khi xem trước |
| `js-yaml@5.4.3` | JSON ↔ YAML |
| `sql-formatter@15.9.0` | định dạng SQL |
| `terser@5.51.2`, `csso@5.0.5` | nén JavaScript, CSS |
| `ua-parser-js@1.0.41` | phân tích User-Agent (bản 1.x, giấy phép MIT) |
| `@e965/xlsx@0.20.3` (SheetJS) | đọc .xlsx/.xls/.ods, ghi .xlsx (nhóm Văn phòng). Bản chính thức 0.20.3 chỉ có trên cdn.sheetjs.com; gói `@e965/xlsx` trên npm giống hệt từng byte (đã so SHA-256). Bản `xlsx@0.18.5` trên npm cũ và có lỗi bảo mật, đừng dùng |
| `hash-wasm@4.12.0` | MD5, SHA-1, SHA-256, SHA-512, CRC32 theo luồng (Tính checksum file: file vài GB không cần đọc hết vào bộ nhớ) |
| `@zxcvbn-ts/core@4.2.0` + `@zxcvbn-ts/language-common@4.1.3` + `@zxcvbn-ts/language-en@4.1.1` (qua `/+esm` của jsDelivr, đã đóng gói phụ thuộc) | ước lượng độ mạnh mật khẩu; thêm từ điển tiếng Việt và lời khuyên tiếng Việt trong `tools/password-strength.js` |
| `mediabunny@1.61.3` (MPL-2.0) | đọc/ghi MP4, MOV, WebM, MKV, MP3, WAV, OGG, AAC, FLAC bằng WebCodecs, theo luồng: chuyển đổi, cắt (chép nguyên hoặc mã hoá lại), nén, lấy khung hình (nhóm Âm thanh & video) |
| `@mediabunny/mp3-encoder@1.61.3`, `@mediabunny/aac-encoder@1.61.3` | mã hoá MP3 (LAME, trình duyệt không tự làm được) và AAC (khi trình duyệt thiếu, vd. Firefox) bằng WebAssembly. Hai gói nhập `"mediabunny"` theo tên trần: `LIBS` khai báo `rewrite: { mediabunny: "mediabunny" }` để `lib()` tải mã nguồn, thay tên đó bằng đúng URL đã ghim rồi nhập từ `blob:`, nhờ vậy encoder đăng ký vào đúng bản Mediabunny đang chạy |
| `@fontsource/be-vietnam-pro@5.3.0` | font chữ |
| `@fontsource/dancing-script`, `great-vibes`, `pacifico`, `roboto-slab` `@5.3.0` | font chữ ký "gõ tên" trong Ký PDF và font chữ của Chèn chữ lên ảnh (`assets/fonts.js`), tải bằng `FontFace` khi cần |

## Thêm một công cụ mới

1. Thêm một mục vào `tools.json` (để `"status": "todo"` khi chưa làm xong). Các trường chính:
   - `id` (tiếng Anh, không đổi về sau, cũng là tên file `assets/tools/<id>.js`), `slug` (URL không dấu, phẳng, ngắn)
   - `name`, `group`, `desc`, `icon` (tên icon Lucide), `kind`: `file` | `text` | `form` | `interactive`
   - `keywords`: từ đồng nghĩa, có dấu hay không dấu đều được (tìm kiếm tự bỏ dấu)
   - `accept` (với công cụ nhận file): `pdf`, `image`, `heic`, `svg`, `audio`, `video`, `excel`, `csv`, `json`, `docx`, `text`, `any`
   - `output` (loại file kết quả), `multiple`, `related`, `aliases`, `data`, `howto`, `faq`, `popular`
2. Viết `assets/tools/<id>.js` dùng một trong 4 khung, ví dụ:
   ```js
   import { textTool } from "../frames/text.js";
   textTool({ transform: (text) => text.toUpperCase() });
   ```
3. Hàm tính toán thuần đặt ở `assets/lib/` và viết test trong `tests/`. Dữ liệu dễ lỗi thời đặt ở `data/<tên>.json` với `title`, `updated`, `source`, rồi khai báo trong trường `data` của công cụ.
4. Nếu dùng icon mới: chạy `node scripts/icons.js`. Thêm file mẫu vào `samples/` nếu công cụ nhận file.
5. Đổi `status` thành `done`, chạy build và kiểm tra (bên dưới), thử trong trình duyệt (cả khổ điện thoại và chế độ tối), commit.

## Công cụ PDF làm việc theo từng trang

Tách, xoá, sắp xếp, xoay trang, PDF sang ảnh… dùng chung `pageTool()` trong `assets/pdf-pages.js` (khung file ở chế độ `custom`). Công cụ chỉ khai báo phần riêng:

```js
import { pageTool, firstItem } from "../pdf-pages.js";
pageTool({
  action: "Xoá trang", sample: () => sampleFiles("so-tay-nhan-vien.pdf"),
  tick: "off", rangeProp: "off",            // dấu ✕ trên thẻ, Shift + bấm để chọn cả dãy
  click(p) { p.off = !p.off; },
  summary: (B) => "…", ready: (B) => true,
  async run(B, opts, ctx) { const doc = await B.build(B.pages.filter((p) => !p.off)); … }
});
```

Xem trước trên thẻ: khai báo `decorate(sheet, p, idx, B)` để thêm phần tử `.deco` (đơn vị `cqw` tính theo bề rộng trang), gọi `B.redecorate()` khi tuỳ chọn đổi. Toạ độ vẽ vào file tính bằng `assets/lib/pdf-geom.js` (`geom`, `place`, `toUser`) để đúng cả với trang có /Rotate.

`B.pages` là danh sách trang `{ it, n, rot, w, h, sel, off, blank }`; `B.build(list)` chép các trang (kèm góc xoay) sang PDF mới của pdf-lib; `B.rangeField(prop, …)` tạo ô "1-3, 5, 8-" đồng bộ hai chiều với lựa chọn trên bảng; `B.changed(structural)` gọi sau khi đổi trạng thái trang. Khoảng trang xử lý bằng `assets/lib/page-ranges.js` (có test).

## Âm thanh & video

Mọi công cụ dùng `assets/media.js` (Mediabunny + WebCodecs, không dùng ffmpeg.wasm): file được đọc dần từng phần nên video vài GB vẫn xử lý được, và mã hoá video dùng phần cứng của máy.

- `probe(file)` → `{ input, format, duration, tags, video: { track, codec, width, height, fps, bitrate, canDecode }, audio: {…} }`; `probeFor(file, "video" | "audio")` báo lỗi tiếng Việt khi thiếu WebCodecs, thiếu hình/tiếng hoặc không giải mã được (AVI, WMV, AMR… không đọc được).
- `convert({ input, format, mime, video, audio, trim, copy, need, signal, onProgress })` bọc `Conversion` của Mediabunny: huỷ theo `ctx.signal`, tiến trình kèm thời gian còn lại (`progressReporter`), lý do bỏ rãnh hình/tiếng thành câu tiếng Việt (`warnings`).
- Cắt không mã hoá lại: `copy: {}` (mặc định) giữ khớp thời gian bằng edit list nên trình phát bắt đầu đúng điểm đã chọn dù khung hình khoá ở trước đó; MP3 cần `copy: { mode: "forced", shiftTolerance: 0.1 }`. Cắt "chính xác" dùng `copy: false`.
- Bitrate truyền bằng `new Quality({ bitrate })`; `new Quality(số)` là mức chất lượng 0–1, không phải bitrate. Đặt cả `width` và `height` thì phải có `fit`.
- Tăng/giảm dần: `fadeProcess(len, in, out)` làm hàm `process` của Conversion (thời gian của mẫu tính từ đầu đoạn đã cắt).
- Ghép âm thanh giải mã từng file bằng Web Audio (`decodeAudio`, tự đổi tần số) rồi ghi dần bằng `audioWriter`.
- `rangeEditor({ duration, media, onChange })`: thanh chọn đoạn có hai tay nắm (kéo, phím mũi tên, Shift = 1 giây), kéo cả đoạn, ô nhập phút:giây, nút ghim vị trí đang phát, phát thử đoạn; nền là dạng sóng (`setPeaks(waveform(file))`) hoặc dải ảnh thu nhỏ (`setThumbs(thumbStrip(p))`).
- Ghi âm, quay màn hình dùng MediaRecorder; file WebM của MediaRecorder thiếu thời lượng (không tua được) nên được chép lại sang vỏ file chuẩn bằng `convert` (không mã hoá lại).
- Đọc văn bản dùng `speechSynthesis`, chia câu bằng `lib/tts.js`; ưu tiên giọng có sẵn trên máy và ghi rõ giọng "trực tuyến" (văn bản được gửi tới máy chủ của hãng).

## Bẫy kỹ thuật đã gặp

- PDF: font chuẩn của pdf-lib không có dấu tiếng Việt → `embedVnFont` (nhúng nguyên font, fontkit lỗi khi `subset`); pdf-lib ghi sai ToUnicode cho chữ ghép fi/fl nên đã tắt chữ ghép; `decodePDFRawStream` không bỏ Predictor PNG (`unPredict`); bản nén đổi tên lớp → dùng `instanceof`, không dùng `constructor.name`; PDF do Chrome in hay tách một chữ có dấu thành nhiều mảnh.
- Ảnh: SVG chỉ có viewBox không có kích thước tự nhiên (`svgWithSize`); thang chất lượng AVIF khắt khe hơn JPG (trừ 20); ở lucide-static 1.52 `flip-vertical-2` là lật trái–phải.
- Excel (SheetJS): ngày đọc ra là giờ UTC → định dạng bằng `getUTC*`; chép ô sang bảng khác phải bỏ công thức.
- Lỗi TDZ chỉ lộ ra khi trang mở lại với trạng thái đã lưu (vd. thẻ đang chọn): khung gọi `mount` ngay lúc `interactiveTool(...)` chạy, nên mọi hằng mà `mount` dùng phải khai báo trước lời gọi đó (hoặc để ở module riêng).
- Khung trang: công cụ `custom` có `onChange` gọi `ctx.refresh()` sẽ lặp vô hạn; `el.append(null)` chèn chữ "null"; `classList.toggle(tên, undefined)` đảo lớp; ô form tự đồng bộ lên URL → dữ liệu nhạy cảm đặt `url: false`, `share: false`.
- Regex JS: `\b` chỉ hiểu chữ ASCII ("giờ\b" không khớp) → dùng lookahead.
- Web Audio: `await audioContext.resume()` treo khi không có thao tác thật của người dùng → không `await`.
- Mediabunny: xem mục Âm thanh & video ở trên (Quality, fit, copy MP3).
- Chạy thử bằng Claude Code: khung Browser bị ẩn thì `setTimeout` giãn ra ~1 giây, `img.decode()`/pdf.js treo, camera/micro/quay màn hình bị chặn. Khi đó dùng Chrome headless qua DevTools Protocol (xem `scripts/samples/media.js`): camera giả chạy được; micro giả treo trên macOS → thay `getUserMedia` bằng luồng từ `OscillatorNode`; quay màn hình → thay `getDisplayMedia` bằng `canvas.captureStream()`. Kiểm tra file kết quả bằng cách đọc `blob:` rồi xem bằng `afinfo`, `qlmanage`, `pdfinfo`, `textutil`. Cổng 8080 có thể bị ứng dụng khác chiếm: dùng preview "bbetools-8791".
- Công cụ Write của Claude Code biến chuỗi thoát `\uXXXX` thành ký tự thật (BOM, dấu kết hợp vô hình): kiểm tra lại bằng grep.

## Chạy trên cloud

- Phiên cloud thường làm trên nhánh riêng rồi mở pull request; GitHub Pages chỉ lấy từ `main`.
- `scripts/make-samples.js` cần Google Chrome và `sips` (macOS). Môi trường cloud có Chromium + Playwright (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, module ở `/opt/node22/lib/node_modules/playwright`); thư viện CDN đi qua proxy: truyền `--proxy-server=$HTTPS_PROXY` khi khởi động Chrome (đừng dùng tuỳ chọn `proxy` của Playwright vì nó ép cả `localhost` qua proxy).
- Không có trình duyệt để chạy thử thì phải nói rõ là chưa thử.

## Kiểm tra trước khi commit

```bash
node scripts/build.js
```

```bash
node scripts/check.js
```

```bash
node --test tests/*.test.js
```

## Tải sticker Telegram

Bot API của Telegram trả header `access-control-allow-origin: *` cho cả `api.telegram.org/bot…/method` lẫn `api.telegram.org/file/bot…/path`, nên trình duyệt gọi thẳng được: `getStickerSet` → `getFile` từng sticker (4 luồng, tự chờ khi bị 429) → tải file. Cần token bot của chính người dùng (tạo bằng @BotFather); token chỉ gửi tới Telegram, không đưa lên URL, chỉ lưu localStorage khi người dùng bật "Nhớ token" (lưu ý: localStorage dùng chung cho mọi trang GitHub Pages của tài khoản). Không có token thì không thể lấy bộ sticker mà không cần máy chủ trung gian. Một số nhà mạng chặn Telegram: khi đó dùng mục "Từ file có sẵn" (đổi .tgs, .webm, .webp đã lưu). GIF: lấy mẫu 30 khung/giây, thời gian mỗi khung làm tròn tích luỹ theo 1/100 giây (`frameSchedule` trong `lib/telegram.js`), trong suốt 1 bit (`quantize(..., { format: "rgba4444", oneBitAlpha: true })`, `dispose: 2`). WEBM lấy khung bằng `<video>` + tua từng mốc.

## Giai đoạn 9 – Tải về (đang làm)

Nhóm `download` ("Tải về", `/nhom/tai-ve/`). Ngày 24/10/2026 xong 3 công cụ: Tải sticker LINE, Tải emoji động, Tải sticker Signal; Tải sticker Telegram đã chuyển từ nhóm Ảnh sang nhóm này (đường dẫn không đổi). Ngày 25/10/2026 xong thêm 3: Tải emote Twitch (7TV, FFZ), Tải emoji, sticker Discord, Tải ảnh thumbnail YouTube. Còn 5 công cụ `"status": "todo"`, nên làm tiếp theo thứ tự trong bảng: Google Fonts, thư mục GitHub, App Store, Bluesky, Mastodon. Mỗi lần thêm công cụ thì sửa `desc` của nhóm trong `tools.json` và `i18n/en/tools.json` (chỉ kể các công cụ đã có). Câu lệnh gợi ý: `Làm tiếp giai đoạn 9 của BbeTools theo CLAUDE.md` (hoặc `Làm công cụ Tải ảnh thumbnail YouTube của BbeTools theo CLAUDE.md`).

Đã làm (cách làm thực tế, khác kế hoạch ban đầu ở vài chỗ):

- Khung chung `assets/sticker.js`: `packView()` (tiêu đề bộ, chọn PNG + GIF hay định dạng gốc, cỡ GIF, nền, lưới thẻ, nút nghe âm thanh, tải từng cái hoặc .zip), `convertImage()` (ảnh tĩnh → PNG, APNG/WEBP động → GIF), `lottieToGif()`, `fetchBlob()`, `pool()`. APNG giải bằng UPNG (chạy mọi trình duyệt, đã ghép khung theo dispose/blend); WEBP động, GIF giải bằng `ImageDecoder` (Safari chưa có → báo lỗi, gợi ý tải định dạng gốc). Thời gian khung GIF làm tròn tích luỹ (`gifDelays` trong `lib/anim.js`). Tải sticker Telegram dùng chung phần đổi định dạng này, giao diện vẫn riêng.
- LINE: không dùng file zip mà tải từng sticker (xem trước dần, có tiến độ): `…/stickershop/v1/product/<id>/iphone/productInfo.meta` (bản `LINEStorePC` có danh sách sticker rỗng), rồi `…/stickershop/v1/sticker/<sid>/iPhone/sticker@2x.png` (tĩnh), `sticker_animation@2x.png` (động), `sticker_popup.png` (popup), `sticker_sound.m4a` (âm thanh). Loại bộ theo `stickerResourceType`: STATIC, ANIMATION, SOUND, ANIMATION_SOUND, POPUP, POPUP_SOUND, NAME_TEXT, PER_STICKER_TEXT (bộ chữ tuỳ chỉnh: chỉ có hình gốc). Emoji: `…/sticonshop/v1/product/<id>/iphone/meta.json` (`orders`, `altTexts`, `sticonResourceType: "ANIMATION"`), file `…/sticonshop/v1/sticon/<id>/iPhone/<001>.png` và `<001>_animation.png`; meta emoji không có tên bộ. Bộ mẫu: 11537 (miễn phí, động); để thử: 17647 (động + âm thanh), 7171 (popup + âm thanh), emoji 68df6dd180f1ba31c4b1c608 (động).
- Emoji động: danh sách 881 emoji ở `data/noto-emoji.json` (sinh bằng `scripts/data-noto-emoji.js` từ `googlefonts.github.io/noto-emoji-animation/data/api.json`, tên và từ khoá tiếng Việt lấy từ chú giải CLDR qua jsDelivr; trang tiếng Anh dùng tên tiếng Anh từ thẻ `:tag:`). File: `512.gif`, `512.webp`, `512.png`, `emoji.svg`, `lottie.json`; GIF cỡ nhỏ tự vẽ từ Lottie. Giấy phép CC BY 4.0 (ghi trên trang). Chọn emoji thì URL thành `?e=<mã>` để chia sẻ được.
- `packView()` có thêm tuỳ chọn: `word` (sticker/emoji/emote trong câu chữ), `bg: false`, `sizeAll`, `sizeLabel`, `search` (ô lọc theo tên, "Tải tất cả" chỉ tải phần đang hiện), `parallel` (tải cả bộ nhiều luồng, giữ thứ tự), `preview(it, pv)` (tự vẽ xem trước, vd. Lottie); phần tử có `src` (link ảnh) thì xem trước bằng link, chỉ tải file khi bấm tải. `fetchBlob()` tự thử lại 2 lần khi lỗi mạng (CDN 7TV hay báo `ERR_QUIC_PROTOCOL_ERROR` khi tải nhiều file); khi dò mà 404 không kèm CORS thì truyền `retries: 0`.
- Signal: link → `pack_id`, `pack_key` (phần sau `#`, không gửi tới máy chủ nào); `manifest.proto` và `full/<id>` tải từ `cdn-ca.signal.org` (`cdn.signal.org` dùng chứng chỉ riêng của Signal, trình duyệt không tin), giải mã bằng Web Crypto (`lib/signal.js`, test dùng manifest thật của bộ "Bandit the Cat"). Sticker động là APNG hoặc WEBP động. Danh sách bộ công khai để tìm bộ thử: `api.signalstickers.org/v1/packs/`.
- Emote Twitch (`lib/twitch.js`): tên kênh → FFZ `/v1/room/<tên>` (có `room.twitch_id`); kênh không có phòng FFZ thì tra mã số qua `api.ivr.fi/v2/twitch/user?login=` (CORS `*`, ghi trong `privacy`). 7TV: `/v3/users/twitch/<id>` → `emote_set` (bộ có thể tới 1000 emote, ~2,5 MB JSON); cũng nhận link `7tv.app/users/<ULID>` (lấy `connections[].emote_set_id`) và `7tv.app/emote-sets/<ULID>`. File có sẵn ở cả hai nguồn nên không đổi định dạng trên máy: 7TV `host.url` + `{1-4}x.webp`, `.gif` (động), `.png` (tĩnh); FFZ `urls` (PNG, cỡ 1, 2, 4) và `animated` (WEBP, thêm `.gif` để lấy GIF). Xem trước bằng link ảnh cỡ 2x, có ô lọc. **BetterTTV bỏ**: API có CORS nhưng `cdn.betterttv.net` không trả header CORS (kiểm tra 25/10/2026). Kênh mẫu: `lirik` (7TV + FFZ có emote động).
- Discord (`lib/discord.js`): emoji `cdn.discordapp.com/emojis/<id>.{webp,png,gif}?size=4096` (4096 = cỡ gốc; WEBP thêm `quality=lossless&animated=true`); xem trước, định dạng gốc dùng WEBP, "PNG + GIF" lấy thẳng PNG/GIF của Discord (nhanh, chạy cả Safari), chỉ tự đổi khi chọn nền. Sticker: PNG/APNG `media.discordapp.net/stickers/<id>.png`, GIF `….gif`, Lottie `cdn.discordapp.com/stickers/<id>.json`; mã trần thì thử emoji trước rồi dò lần lượt PNG, Lottie, GIF. 404 của emoji và sticker .json **không kèm CORS** nên trình duyệt chỉ thấy lỗi mạng (câu báo lỗi phải nói cả hai khả năng). Liệt kê emoji của server cần đăng nhập (`/guilds/<id>/preview` trả 401, invite không kèm emoji) → chỉ nhận từng cái; 14 bộ sticker chính thức lấy ở `discord.com/api/v10/sticker-packs` (không cần đăng nhập), ảnh bìa `cdn.discordapp.com/app-assets/710982414301790216/store/<banner_asset_id>.png`. Sticker Lottie xem trước bằng một khung tĩnh (đỡ tốn máy), đổi GIF bằng `lottieToGif`. Mẫu: emoji động `idk` (1512891956789776404), sticker Cheerful Choco (APNG), Wumpus Beyond (Lottie).
- Thumbnail YouTube (`lib/youtube.js`): `i.ytimg.com/vi/<id>/<tên>.jpg` có CORS `*` (bản `vi_webp/` thì không → không dùng; WEBP tự xuất bằng canvas). Cỡ không có trả 404 kèm ảnh xám 120×90 → kiểm tra `r.ok`. HD thử `maxresdefault` rồi `hq720`; khung tự chụp 1–3 thử `maxresN`, `sdN`, `hqN`. Ảnh SD, HQ, nhỏ là 4:3: `letterbox()` tìm viền đen (cả viền dọc của Shorts) để cắt. Tên video qua `youtube.com/oembed` (CORS theo origin). Nhận nhiều link một lúc (tối đa 50), "Cắt ảnh" chuyển ảnh sang công cụ Cắt ảnh bằng `sendTo`.

Cùng ý tưởng với Tải sticker Telegram: chỉ làm được khi nguồn trả header CORS cho trang web gọi thẳng. Ngày 24/10/2026 đã kiểm tra bằng `curl -H "Origin: https://springbbe.github.io"`, mọi nguồn dưới đây đều trả `access-control-allow-origin` (`*` hoặc đúng origin). Kiểm tra lại trước khi làm.

| Công cụ (`id`) | Nguồn | Ghi chú |
|---|---|---|
| ✅ Tải sticker LINE (`line-stickers`) | xem mục "Đã làm" ở trên | |
| ✅ Tải emoji động (`noto-emoji`) | xem mục "Đã làm" ở trên | |
| ✅ Tải sticker Signal (`signal-stickers`) | xem mục "Đã làm" ở trên | |
| ✅ Tải emote Twitch (7TV, FFZ) (`twitch-emotes`) | xem mục "Đã làm" ở trên | BetterTTV đã bỏ (CDN ảnh không có CORS) |
| ✅ Tải emoji, sticker Discord (`discord-emoji`) | xem mục "Đã làm" ở trên | |
| ✅ Tải ảnh thumbnail YouTube (`youtube-thumbnail`) | xem mục "Đã làm" ở trên | |
| Tải font Google Fonts (`google-fonts`) | `fonts.googleapis.com/css2?family=…` (CSS), file ở `fonts.gstatic.com` | Danh sách font: dùng gói npm metadata (vd. `@fontsource`) hoặc file `data/` tự chụp, không dùng Google Fonts Developer API (cần khoá). User-Agent khác nhau cho ra WOFF2 hay TTF: trình duyệt không đổi được UA, cần thử xem cách lấy TTF (có thể chỉ hỗ trợ WOFF2, hoặc lấy TTF từ jsDelivr `gh/google/fonts`) |
| Tải thư mục GitHub (`github-folder`) | `api.github.com/repos/<o>/<r>/git/trees/<ref>?recursive=1`, `raw.githubusercontent.com/…` | Không token: 60 lần gọi API/giờ (raw không tính). Cho dán token cá nhân tuỳ chọn (như Telegram). `codeload.github.com` (zip cả repo) không cho CORS → không dùng |
| Tải icon, ảnh chụp app App Store (`app-store-assets`) | `itunes.apple.com/lookup?id=<id>&country=vn`, ảnh ở `is1-ssl.mzstatic.com` | Đổi cỡ icon bằng cách sửa đuôi `…/512x512bb.png` thành `1024x1024bb.png` |
| Tải ảnh, video Bluesky (`bluesky-media`) | `public.api.bsky.app/xrpc/app.bsky.feed.getPostThread`, ảnh `cdn.bsky.app`, video HLS `video.bsky.app/watch/<did>/<cid>/playlist.m3u8` | Video: tải các đoạn HLS rồi ghép sang MP4 (mp4box.js hoặc ffmpeg.wasm đơn luồng). Đổi link `bsky.app/profile/<handle>/post/<rkey>` ra `at://` qua `resolveHandle` |
| Tải ảnh, video Mastodon (`mastodon-media`) | `<máy chủ>/api/v1/statuses/<id>` | API chuẩn có CORS `*`, nhưng nơi lưu file (S3, CDN) là tuỳ từng máy chủ: máy chủ nào không cho CORS thì chỉ hiện link mở file |

Quy trình riêng cho giai đoạn này:

1. Mỗi công cụ có ghi chú bản quyền như Tải sticker Telegram (sticker, emoji, thumbnail thuộc tác giả; chỉ dùng cá nhân hoặc khi được phép).
2. Hàm thuần (đọc link, dựng URL, giải mã Signal, đọc protobuf/m3u8, lịch khung GIF) ở `assets/lib/` có test. Test không gọi mạng; nếu cần thì lưu sẵn phản hồi mẫu trong `tests/`.
3. Nguồn nào lúc làm không còn CORS thì bỏ công cụ đó, không dựng máy chủ trung gian.
4. Công cụ hiện danh sách bộ sticker dùng `packView()` của `assets/sticker.js`; nguồn trả từng file lẻ thì tải bằng `pool()` (6 luồng) để xem trước dần.

Đã xét và bỏ (không có CORS, cần khoá bí mật hoặc trái điều khoản): emote BetterTTV (CDN ảnh không có CORS), danh sách emoji server Discord (cần đăng nhập), video YouTube, TikTok, Facebook, Instagram; Reddit (403), X/Twitter (CORS chỉ cho platform.twitter.com); sticker Zalo (không có API công khai); Giphy, Tenor, Imgur (cần khoá API); emoji Slack (cần token, CDN không CORS); tải cả repo GitHub qua codeload.

## Định dạng file mã hoá của BbeTools (.bbe)

"Mã hoá/giải mã file" và "Mã hoá văn bản" dùng chung `assets/lib/ma-hoa.js` (Web Crypto, chạy cả trong Node để test): AES-GCM 256, khoá dẫn xuất bằng PBKDF2-HMAC-SHA256 600.000 vòng, salt 16 byte. Phần đầu 38 byte: `BBENC` + phiên bản `0x01`, mã thuật toán dẫn xuất khoá, số vòng, salt, tiền tố nonce 7 byte, cỡ khối (1 MiB). Sau đó là các khối mã, mỗi khối có thẻ xác thực 16 byte; nonce = tiền tố ‖ số thứ tự khối ‖ cờ khối cuối (kiểu STREAM) và phần đầu là dữ liệu xác thực bổ sung, nên đổi thứ tự, cắt bớt hay sửa một byte đều bị phát hiện. Bản rõ bắt đầu bằng độ dài + JSON `{ name, type }` của file gốc. Văn bản mã hoá là cả gói trên viết bằng Base64 (bắt đầu bằng `QkJFTkMB`). Muốn đổi định dạng thì tăng số phiên bản và giữ khả năng giải mã bản cũ.

## Ghi chú dữ liệu

- Danh sách ngân hàng VietQR (`data/ngan-hang-vietqr.json`) chụp từ danh sách công khai của VietQR; chuỗi VietQR do BbeTools tạo đã được đối chiếu khớp từng ký tự với mã của img.vietqr.io (xem `tests/vietqr.test.js`).
- Âm lịch theo thuật toán của Hồ Ngọc Đức, múi giờ UTC+7.
- Thuế TNCN, BHXH, lương tối thiểu vùng, giá điện, ngày lễ: mỗi file trong `data/` ghi văn bản gốc trong `source`; công cụ đọc số liệu từ file, không viết cứng trong mã. Đổi mức (ví dụ lương cơ sở mới) chỉ cần sửa file JSON, cập nhật `updated` rồi chạy test.
- Danh sách emoji động (`data/noto-emoji.json`): Google thêm emoji động theo từng đợt; chạy lại `node scripts/data-noto-emoji.js` khi có đợt mới (đổi số phiên bản CLDR trong script khi Unicode ra bản mới).
- Mỗi năm cần xem lại: hệ số trượt giá BHXH (đầu năm), lương cơ sở và lương tối thiểu vùng (thường đổi 1/1 hoặc 1/7), giá điện EVN, thời hạn giảm VAT 8% (`gia-dien.json`, hiện tới 31/12/2026), lịch nghỉ lễ, biểu thuế TNCN.
- Đơn vị hành chính sau sáp nhập (`data/don-vi-hanh-chinh.json`, ~570 KB, chỉ tải trên trang Tra đơn vị hành chính mới): lấy từ [DiaChiMoi](https://github.com/mahiepit/DiaChiMoi) (MIT), gộp danh mục hành chính của Cục Thống kê (qua thanglequoc/vietnamese-provinces-database, MIT) và bảng chuyển xã cũ → mới (tranngocminhhieu/vietnamadminunits, MIT). Chạy lại `node scripts/data-dvhc.js` sau khi đổi commit ghim trong script.
