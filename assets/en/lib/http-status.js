/* Tự sinh bởi scripts/build.js từ assets/lib/http-status.js và i18n/en/js/ — đừng sửa tay. */
/* Mã trạng thái HTTP (RFC 9110 và các RFC liên quan) kèm giải thích tiếng Việt, và hàm tìm kiếm. */
import { fold } from "./search.js";

// [mã, cụm từ chuẩn, tên tiếng Việt, giải thích, mẹo xử lý (tuỳ chọn)]
const RAW = [
  [100, "Continue", "Continue", "The server received the request headers; the client may send the body (usually with Expect: 100-continue when uploading large files)."],
  [101, "Switching Protocols", "Switching Protocols", "The server agrees to switch protocols as requested, e.g. upgrading from HTTP to WebSocket."],
  [102, "Processing", "Processing", "(WebDAV) The server has received the request and is processing it; no result yet."],
  [103, "Early Hints", "Early Hints", "The server sends a few headers early (usually Link: preload) so the browser can preload CSS and fonts while waiting for the main response."],
  [200, "OK", "OK", "The request succeeded. For GET, the body contains the requested data."],
  [201, "Created", "Created", "The request succeeded and a new resource was created (usually after POST/PUT). The Location header points to the new resource."],
  [202, "Accepted", "Accepted", "The server accepted the request but will process it later (queue, background job). The final outcome may still fail."],
  [203, "Non-Authoritative Information", "Non-Authoritative Information", "Success, but the data was modified by an intermediate proxy compared to the original."],
  [204, "No Content", "No Content", "Success with nothing to return (common for API deletes and updates)."],
  [205, "Reset Content", "Reset Content", "Success; the browser should clear the form being filled in."],
  [206, "Partial Content", "Partial Content", "Returns part of a file according to the Range header: used for video seeking and resumable downloads."],
  [207, "Multi-Status", "Multi-Status", "(WebDAV) The body contains multiple status codes for multiple operations."],
  [208, "Already Reported", "Already Reported", "(WebDAV) These members were already listed in a previous response and aren't repeated."],
  [226, "IM Used", "IM Used", "The server returns the result after applying instance manipulations (delta encoding) to the resource."],
  [300, "Multiple Choices", "Multiple Choices", "The resource has several versions; the user or browser needs to pick one."],
  [301, "Moved Permanently", "Moved Permanently", "The address has moved permanently to the URL in the Location header. Search engines transfer ranking to the new URL.", "Used when changing domains or URL structure. Browsers remember it for a long time, so check carefully before setting it."],
  [302, "Found", "Found", "Temporarily moved to another URL; keep using the old URL next time. Browsers may change POST to GET when redirecting."],
  [303, "See Other", "See Other", "The result is at another URL and must be fetched with GET (often used after a form submission to avoid resubmitting on reload)."],
  [304, "Not Modified", "Not Modified", "The resource hasn't changed since the browser's cached copy, so there's no need to download it again.", "This is normal and makes pages load faster."],
  [305, "Use Proxy", "Use Proxy", "Deprecated, no longer used for security reasons."],
  [307, "Temporary Redirect", "Temporary Redirect", "Like 302 but the method and body must be kept (POST stays POST)."],
  [308, "Permanent Redirect", "Permanent Redirect", "Like 301 but the method and body must be kept."],
  [400, "Bad Request", "Bad Request", "The server didn't understand the request: bad syntax, broken JSON, missing parameters, invalid data.", "Check the data sent, the Content-Type header and the cookie size."],
  [401, "Unauthorized", "Unauthorized", "You need to log in or send valid credentials (token, API key).", "Check the Authorization header and whether the token has expired."],
  [402, "Payment Required", "Payment Required", "Reserved for future use; some services use it when an account exceeds its quota or hasn't paid."],
  [403, "Forbidden", "Forbidden", "The server understood the request but refuses it: logged in without permission, or blocked by IP/country.", "Check account permissions, file read permissions on the server, firewall/WAF."],
  [404, "Not Found", "Not Found", "Nothing exists at this address: the path is mistyped, or the page was deleted or renamed.", "Check the URL and its letter case; set up a 301 redirect if the page moved."],
  [405, "Method Not Allowed", "Method Not Allowed", "The address exists but doesn't accept this method (e.g. POST to a GET-only page). The Allow header lists the allowed methods."],
  [406, "Not Acceptable", "Not Acceptable", "The server has no version matching the Accept headers (format, language) the browser asked for."],
  [407, "Proxy Authentication Required", "Proxy Authentication Required", "You must authenticate with the proxy before continuing."],
  [408, "Request Timeout", "Request Timeout", "The client sent the request too slowly, so the server closed the connection.", "Usually caused by a flaky network; try again."],
  [409, "Conflict", "Conflict", "The request conflicts with the current state: duplicate data, simultaneous edits, outdated version."],
  [410, "Gone", "Gone", "The resource existed but has been permanently removed and won't come back (more explicit than 404)."],
  [411, "Length Required", "Length Required", "The server requires a Content-Length header."],
  [412, "Precondition Failed", "Precondition Failed", "A condition in the headers (If-Match, If-Unmodified-Since…) isn't met, usually because someone else modified the data."],
  [413, "Content Too Large", "Content Too Large", "The request body (uploaded file) exceeds the server's limit.", "Increase client_max_body_size (nginx), upload_max_filesize (PHP) or reduce the file size."],
  [414, "URI Too Long", "URI Too Long", "The URL is longer than the server accepts, usually from stuffing too much data into the query string.", "Move the data into the POST body."],
  [415, "Unsupported Media Type", "Unsupported Media Type", "The server doesn't accept the format of the data sent.", "Check the Content-Type header (e.g. application/json)."],
  [416, "Range Not Satisfiable", "Range Not Satisfiable", "The Range header asks for a part beyond the file size."],
  [417, "Expectation Failed", "Expectation Failed", "The server can't meet the Expect header."],
  [418, "I'm a teapot", "I'm a teapot", "A joke code from RFC 2324 (Hyper Text Coffee Pot Control Protocol). Some sites use it to turn bots away."],
  [421, "Misdirected Request", "Misdirected Request", "The request reached a server that doesn't serve this domain (common with HTTP/2 connection reuse)."],
  [422, "Unprocessable Content", "Unprocessable Content", "The syntax is fine but the data is invalid for the business logic (e.g. malformed email, missing required field).", "Look at the response body; APIs usually say which field is wrong."],
  [423, "Locked", "Locked", "(WebDAV) The resource is locked."],
  [424, "Failed Dependency", "Failed Dependency", "(WebDAV) The operation failed because an operation it depended on failed."],
  [425, "Too Early", "Too Early", "The server is unwilling to process a request that might be replayed (TLS early data)."],
  [426, "Upgrade Required", "Upgrade Required", "You must switch to another protocol (given in the Upgrade header) to continue."],
  [428, "Precondition Required", "Precondition Required", "The server requires a condition (If-Match) to avoid overwriting someone else's changes."],
  [429, "Too Many Requests", "Too Many Requests", "Rate limit exceeded. The Retry-After header says how long to wait before sending more.", "Call less often, wait and retry (with exponential backoff)."],
  [431, "Request Header Fields Too Large", "Request Header Fields Too Large", "The request headers are too large, usually because cookies have grown too big.", "Clear the site's cookies and try again."],
  [451, "Unavailable For Legal Reasons", "Unavailable For Legal Reasons", "The content is blocked for legal reasons (court order, country blocking)."],
  [500, "Internal Server Error", "Internal Server Error", "The server hit an unspecified error while processing: code bug, misconfiguration, uncaught exception.", "Check the server error log for the exact error."],
  [501, "Not Implemented", "Not Implemented", "The server doesn't support the feature/method needed to handle the request."],
  [502, "Bad Gateway", "Bad Gateway", "An intermediate server (nginx, Cloudflare, load balancer) got an error response from the server behind it.", "Check whether the backend app (PHP-FPM, Node…) is running and the port is correct."],
  [503, "Service Unavailable", "Service Unavailable", "The server is overloaded or under maintenance and temporarily can't serve requests.", "Try again later; admins should check CPU/RAM and connection counts."],
  [504, "Gateway Timeout", "Gateway Timeout", "An intermediate server waited too long for the server behind it without a response.", "Optimize long-running tasks, raise the timeout (proxy_read_timeout) or move the work to a background job."],
  [505, "HTTP Version Not Supported", "HTTP Version Not Supported", "The server doesn't support the HTTP version of the request."],
  [506, "Variant Also Negotiates", "Variant Also Negotiates", "The server's content negotiation configuration has a loop."],
  [507, "Insufficient Storage", "Insufficient Storage", "(WebDAV) The server doesn't have enough storage to complete the request."],
  [508, "Loop Detected", "Loop Detected", "(WebDAV) The server detected an infinite loop while processing."],
  [510, "Not Extended", "Not Extended", "Further extensions to the request are required (obsolete)."],
  [511, "Network Authentication Required", "Network Authentication Required", "You must log in to the network first (Wi-Fi login page at cafés, hotels, airports)."],
  [520, "Web Server Returned an Unknown Error", "Unknown Error (Cloudflare)", "Non-standard, Cloudflare only: the origin server returned an empty or unexpected response."],
  [521, "Web Server Is Down", "Web Server Is Down (Cloudflare)", "Non-standard, Cloudflare only: the origin server refused the connection."],
  [522, "Connection Timed Out", "Connection Timed Out (Cloudflare)", "Non-standard, Cloudflare only: couldn't connect to the origin server."],
  [524, "A Timeout Occurred", "A Timeout Occurred (Cloudflare)", "Non-standard, Cloudflare only: the origin server took more than 100 seconds."]
];

export const CLASSES = {
  1: ["1xx", "Informational", "The request was received and processing continues."],
  2: ["2xx", "OK", "The request was received, understood and processed successfully."],
  3: ["3xx", "Redirection", "Further action (usually going to another address) is needed to complete it."],
  4: ["4xx", "Client error", "Something is wrong with the request: wrong address, missing permission, bad data…"],
  5: ["5xx", "Server error", "The request seems valid but the server couldn't process it."]
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
