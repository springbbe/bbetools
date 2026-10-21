/* Mã trạng thái HTTP (RFC 9110 và các RFC liên quan) kèm giải thích tiếng Việt, và hàm tìm kiếm. */
import { fold } from "./search.js";

// [mã, cụm từ chuẩn, tên tiếng Việt, giải thích, mẹo xử lý (tuỳ chọn)]
const RAW = [
  [100, "Continue", "Tiếp tục", "Máy chủ đã nhận phần đầu yêu cầu, trình duyệt có thể gửi tiếp phần thân (thường đi với header Expect: 100-continue khi tải file lớn)."],
  [101, "Switching Protocols", "Chuyển giao thức", "Máy chủ đồng ý đổi giao thức theo yêu cầu, ví dụ nâng cấp từ HTTP lên WebSocket."],
  [102, "Processing", "Đang xử lý", "(WebDAV) Máy chủ đã nhận và đang xử lý yêu cầu, chưa có kết quả."],
  [103, "Early Hints", "Gợi ý sớm", "Máy chủ gửi trước vài header (thường là Link: preload) để trình duyệt tải sẵn CSS, font trong lúc chờ phản hồi chính."],
  [200, "OK", "Thành công", "Yêu cầu thành công. Với GET, phần thân chứa dữ liệu được yêu cầu."],
  [201, "Created", "Đã tạo", "Yêu cầu thành công và đã tạo tài nguyên mới (thường sau POST/PUT). Header Location chỉ tới tài nguyên vừa tạo."],
  [202, "Accepted", "Đã nhận, chưa xử lý xong", "Máy chủ đã nhận yêu cầu nhưng sẽ xử lý sau (hàng đợi, tác vụ nền). Kết quả cuối cùng chưa chắc thành công."],
  [203, "Non-Authoritative Information", "Thông tin không chính gốc", "Thành công nhưng dữ liệu đã bị proxy trung gian sửa đổi so với bản gốc."],
  [204, "No Content", "Không có nội dung", "Thành công và không có gì để trả về (hay gặp khi xoá, cập nhật qua API)."],
  [205, "Reset Content", "Đặt lại nội dung", "Thành công; trình duyệt nên xoá trắng form đang nhập."],
  [206, "Partial Content", "Một phần nội dung", "Trả về một đoạn của file theo header Range: dùng khi tua video, tải file tiếp tục."],
  [207, "Multi-Status", "Nhiều trạng thái", "(WebDAV) Phần thân chứa nhiều mã trạng thái cho nhiều thao tác."],
  [208, "Already Reported", "Đã báo trước đó", "(WebDAV) Các phần tử này đã được liệt kê trong phản hồi trước, không lặp lại."],
  [226, "IM Used", "Đã áp dụng biến đổi", "Máy chủ trả về kết quả sau khi áp dụng biến đổi (delta encoding) lên tài nguyên."],
  [300, "Multiple Choices", "Nhiều lựa chọn", "Tài nguyên có nhiều phiên bản, người dùng hoặc trình duyệt cần chọn một."],
  [301, "Moved Permanently", "Đã chuyển vĩnh viễn", "Địa chỉ đã đổi hẳn sang URL trong header Location. Công cụ tìm kiếm sẽ chuyển thứ hạng sang URL mới.", "Dùng khi đổi tên miền, đổi cấu trúc đường dẫn. Trình duyệt nhớ rất lâu, kiểm tra kỹ trước khi đặt."],
  [302, "Found", "Chuyển tạm thời", "Tạm thời chuyển sang URL khác; lần sau vẫn nên gọi URL cũ. Trình duyệt có thể đổi POST thành GET khi chuyển."],
  [303, "See Other", "Xem chỗ khác", "Kết quả nằm ở URL khác, phải lấy bằng GET (hay dùng sau khi gửi form để tránh gửi lại khi tải lại trang)."],
  [304, "Not Modified", "Không thay đổi", "Tài nguyên chưa đổi so với bản trình duyệt đang lưu (cache), không cần tải lại.", "Đây là bình thường, giúp trang tải nhanh hơn."],
  [305, "Use Proxy", "Dùng proxy", "Đã bỏ, không còn dùng vì lý do bảo mật."],
  [307, "Temporary Redirect", "Chuyển tạm thời (giữ phương thức)", "Giống 302 nhưng bắt buộc giữ nguyên phương thức và phần thân (POST vẫn là POST)."],
  [308, "Permanent Redirect", "Chuyển vĩnh viễn (giữ phương thức)", "Giống 301 nhưng bắt buộc giữ nguyên phương thức và phần thân."],
  [400, "Bad Request", "Yêu cầu sai", "Máy chủ không hiểu yêu cầu: sai cú pháp, JSON hỏng, thiếu tham số, dữ liệu không hợp lệ.", "Kiểm tra lại dữ liệu gửi đi, header Content-Type, kích thước cookie."],
  [401, "Unauthorized", "Chưa xác thực", "Cần đăng nhập hoặc gửi kèm thông tin xác thực (token, API key) hợp lệ.", "Kiểm tra header Authorization, token đã hết hạn chưa."],
  [402, "Payment Required", "Cần thanh toán", "Dành cho tương lai; một số dịch vụ dùng khi tài khoản hết hạn mức hoặc chưa trả phí."],
  [403, "Forbidden", "Bị cấm", "Máy chủ hiểu yêu cầu nhưng từ chối: đã đăng nhập nhưng không có quyền, hoặc bị chặn theo IP/quốc gia.", "Kiểm tra quyền tài khoản, quyền đọc file trên máy chủ, tường lửa/WAF."],
  [404, "Not Found", "Không tìm thấy", "Không có tài nguyên ở địa chỉ này: gõ sai đường dẫn, trang đã bị xoá hoặc đổi tên.", "Kiểm tra lại URL, chữ hoa/thường, đặt chuyển hướng 301 nếu trang đã đổi địa chỉ."],
  [405, "Method Not Allowed", "Phương thức không được phép", "Địa chỉ có tồn tại nhưng không nhận phương thức này (ví dụ gửi POST vào trang chỉ cho GET). Header Allow liệt kê các phương thức được phép."],
  [406, "Not Acceptable", "Không có định dạng phù hợp", "Máy chủ không có phiên bản nào khớp header Accept (định dạng, ngôn ngữ) mà trình duyệt yêu cầu."],
  [407, "Proxy Authentication Required", "Proxy cần xác thực", "Phải đăng nhập với proxy trước khi đi tiếp."],
  [408, "Request Timeout", "Hết thời gian chờ yêu cầu", "Máy khách gửi yêu cầu quá chậm, máy chủ đóng kết nối.", "Thường do mạng chập chờn; thử lại."],
  [409, "Conflict", "Xung đột", "Yêu cầu xung đột với trạng thái hiện tại: trùng dữ liệu, sửa cùng lúc, phiên bản cũ."],
  [410, "Gone", "Đã xoá vĩnh viễn", "Tài nguyên từng có nhưng đã bị xoá hẳn và sẽ không quay lại (rõ ràng hơn 404)."],
  [411, "Length Required", "Thiếu độ dài", "Máy chủ yêu cầu header Content-Length."],
  [412, "Precondition Failed", "Điều kiện không thoả", "Điều kiện trong header (If-Match, If-Unmodified-Since…) không đúng, thường do dữ liệu đã bị người khác sửa."],
  [413, "Content Too Large", "Dữ liệu quá lớn", "Phần thân yêu cầu (file tải lên) vượt giới hạn của máy chủ.", "Tăng client_max_body_size (nginx), upload_max_filesize (PHP) hoặc giảm dung lượng file."],
  [414, "URI Too Long", "Địa chỉ quá dài", "URL dài hơn mức máy chủ chấp nhận, thường do nhét quá nhiều dữ liệu vào query string.", "Chuyển dữ liệu sang phần thân của POST."],
  [415, "Unsupported Media Type", "Định dạng không hỗ trợ", "Máy chủ không nhận định dạng dữ liệu gửi lên.", "Kiểm tra header Content-Type (ví dụ application/json)."],
  [416, "Range Not Satisfiable", "Khoảng không hợp lệ", "Header Range yêu cầu đoạn nằm ngoài kích thước file."],
  [417, "Expectation Failed", "Không đáp ứng được Expect", "Máy chủ không đáp ứng được header Expect."],
  [418, "I'm a teapot", "Tôi là ấm trà", "Mã đùa từ RFC 2324 (giao thức điều khiển ấm pha cà phê). Một số trang dùng để từ chối bot."],
  [421, "Misdirected Request", "Gửi nhầm máy chủ", "Yêu cầu đến máy chủ không phục vụ tên miền này (hay gặp với HTTP/2 dùng chung kết nối)."],
  [422, "Unprocessable Content", "Không xử lý được nội dung", "Cú pháp đúng nhưng dữ liệu không hợp lệ về mặt nghiệp vụ (ví dụ email sai định dạng, thiếu trường bắt buộc).", "Xem phần thân phản hồi, API thường ghi rõ trường nào sai."],
  [423, "Locked", "Đang bị khoá", "(WebDAV) Tài nguyên đang bị khoá."],
  [424, "Failed Dependency", "Phụ thuộc bị lỗi", "(WebDAV) Thao tác thất bại vì thao tác nó phụ thuộc đã thất bại."],
  [425, "Too Early", "Quá sớm", "Máy chủ không muốn xử lý yêu cầu có thể bị phát lại (TLS early data)."],
  [426, "Upgrade Required", "Cần nâng cấp giao thức", "Phải chuyển sang giao thức khác (ghi trong header Upgrade) mới dùng được."],
  [428, "Precondition Required", "Cần điều kiện", "Máy chủ yêu cầu gửi kèm điều kiện (If-Match) để tránh ghi đè dữ liệu của người khác."],
  [429, "Too Many Requests", "Gửi quá nhiều yêu cầu", "Vượt giới hạn tốc độ (rate limit). Header Retry-After cho biết bao lâu nữa được gửi tiếp.", "Giảm tần suất gọi, chờ rồi thử lại (lùi dần thời gian chờ)."],
  [431, "Request Header Fields Too Large", "Header quá lớn", "Header yêu cầu quá lớn, thường do cookie phình to.", "Xoá cookie của trang rồi thử lại."],
  [451, "Unavailable For Legal Reasons", "Bị chặn vì lý do pháp lý", "Nội dung bị chặn theo yêu cầu pháp luật (lệnh toà án, chặn theo quốc gia)."],
  [500, "Internal Server Error", "Lỗi máy chủ", "Máy chủ gặp lỗi không xác định khi xử lý: lỗi code, lỗi cấu hình, ngoại lệ chưa bắt.", "Xem log của máy chủ (error log) để biết lỗi cụ thể."],
  [501, "Not Implemented", "Chưa hỗ trợ", "Máy chủ không hỗ trợ chức năng/phương thức cần để xử lý yêu cầu."],
  [502, "Bad Gateway", "Cổng nối lỗi", "Máy chủ trung gian (nginx, Cloudflare, load balancer) nhận phản hồi lỗi từ máy chủ phía sau.", "Kiểm tra ứng dụng phía sau (PHP-FPM, Node…) có đang chạy không, cổng có đúng không."],
  [503, "Service Unavailable", "Dịch vụ không sẵn sàng", "Máy chủ đang quá tải hoặc bảo trì, tạm thời không phục vụ được.", "Thử lại sau; quản trị viên kiểm tra tài nguyên CPU/RAM, số kết nối."],
  [504, "Gateway Timeout", "Cổng nối hết thời gian chờ", "Máy chủ trung gian chờ máy chủ phía sau quá lâu mà không có phản hồi.", "Tối ưu tác vụ chạy lâu, tăng thời gian chờ (proxy_read_timeout) hoặc chuyển sang xử lý nền."],
  [505, "HTTP Version Not Supported", "Không hỗ trợ phiên bản HTTP", "Máy chủ không hỗ trợ phiên bản HTTP của yêu cầu."],
  [506, "Variant Also Negotiates", "Lỗi cấu hình thương lượng", "Cấu hình thương lượng nội dung của máy chủ bị vòng lặp."],
  [507, "Insufficient Storage", "Hết dung lượng", "(WebDAV) Máy chủ không đủ chỗ lưu để hoàn tất yêu cầu."],
  [508, "Loop Detected", "Phát hiện vòng lặp", "(WebDAV) Máy chủ phát hiện vòng lặp vô hạn khi xử lý."],
  [510, "Not Extended", "Thiếu phần mở rộng", "Cần thêm phần mở rộng cho yêu cầu (đã lỗi thời)."],
  [511, "Network Authentication Required", "Cần đăng nhập mạng", "Phải đăng nhập vào mạng trước (trang đăng nhập Wi-Fi ở quán cà phê, khách sạn, sân bay)."],
  [520, "Web Server Returned an Unknown Error", "Lỗi không xác định (Cloudflare)", "Không chuẩn, riêng Cloudflare: máy chủ gốc trả phản hồi trống hoặc lạ."],
  [521, "Web Server Is Down", "Máy chủ gốc không chạy (Cloudflare)", "Không chuẩn, riêng Cloudflare: máy chủ gốc từ chối kết nối."],
  [522, "Connection Timed Out", "Hết thời gian kết nối (Cloudflare)", "Không chuẩn, riêng Cloudflare: không kết nối được tới máy chủ gốc."],
  [524, "A Timeout Occurred", "Hết thời gian chờ (Cloudflare)", "Không chuẩn, riêng Cloudflare: máy chủ gốc xử lý quá 100 giây."]
];

export const CLASSES = {
  1: ["1xx", "Thông tin", "Yêu cầu đã nhận, đang tiếp tục xử lý."],
  2: ["2xx", "Thành công", "Yêu cầu đã được nhận, hiểu và xử lý thành công."],
  3: ["3xx", "Chuyển hướng", "Cần thêm bước (thường là đi tới địa chỉ khác) để hoàn tất."],
  4: ["4xx", "Lỗi phía người dùng", "Yêu cầu có vấn đề: sai địa chỉ, thiếu quyền, dữ liệu sai…"],
  5: ["5xx", "Lỗi phía máy chủ", "Yêu cầu có vẻ hợp lệ nhưng máy chủ không xử lý được."]
};

export const STATUSES = RAW.map(([code, phrase, vi, desc, tip]) => ({ code, phrase, vi, desc, tip: tip || "", cls: Math.floor(code / 100) }));

/** Tìm theo mã ("404", "4xx", "40"), tên tiếng Anh hoặc tiếng Việt (không cần dấu) */
export function searchStatus(q, cls) {
  let list = cls ? STATUSES.filter((s) => s.cls === +cls) : STATUSES;
  const s = String(q ?? "").trim();
  if (!s) return list;
  const m = /^([1-5])(?:xx|\d?x?)$/i.exec(s);
  if (/^\d{1,3}$/.test(s)) return list.filter((x) => String(x.code).startsWith(s));
  if (m) return list.filter((x) => String(x.code).startsWith(s.replace(/x/gi, "")));
  const terms = fold(s).split(" ").filter(Boolean);
  return list.filter((x) => { const hay = fold(`${x.code} ${x.phrase} ${x.vi} ${x.desc}`); return terms.every((t) => hay.includes(t)); });
}
