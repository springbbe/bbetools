/* Mã hoá văn bản bằng mật khẩu: AES-GCM 256 + PBKDF2-SHA256 (600.000 vòng), kết quả là chuỗi Base64 gửi được qua tin nhắn, email.
   Link giải mã để bản mã sau dấu # (trình duyệt không gửi phần này lên máy chủ). */
import { h, icon, copyText, replaceUrl, sleep, ROOT } from "../core.js";
import { textTool } from "../frames/text.js";
import { encryptText, decryptText, looksEncrypted } from "../lib/ma-hoa.js";

const SALT = crypto.getRandomValues(new Uint8Array(16)); // cố định trong phiên để gõ không phải dẫn xuất khoá lại; mỗi lần mã hoá vẫn có nonce mới
let tick = 0, api;

const linkBtn = h("button", { class: "btn ghost sm", type: "button", title: "Link mở trang này với bản mã điền sẵn; người nhận chỉ cần nhập mật khẩu", onclick: () => {
  const r = api.result;
  if (api.opts.mode !== "enc" || !r.text) return;
  copyText(new URL(ROOT + "ma-hoa-van-ban/", location.href).href.split("#")[0] + "#m=" + encodeURIComponent(r.text), "Đã sao chép link giải mã (không chứa mật khẩu)");
} }, h("span", { html: icon("link"), style: { display: "contents" } }), "Link giải mã");

api = textTool({
  inputLabel: "Văn bản",
  outputLabel: "Kết quả",
  placeholder: "Gõ tin nhắn cần mã hoá, hoặc dán bản mã cần giải mã…",
  sample: (o) => (o.mode === "dec" ? "" : "Mật khẩu wifi phòng họp: BbeTools@2026. Đừng chia sẻ ra ngoài nhé!"),
  mono: false,
  swap: "mode",
  options: [
    { id: "mode", label: "Chế độ", value: "enc", choices: [["enc", "Mã hoá"], ["dec", "Giải mã"]] },
    { id: "pw", type: "password", label: "Mật khẩu", placeholder: "Người nhận cần đúng mật khẩu này", wide: true, persist: false }
  ],
  outputActions: [linkBtn],
  async transform(text, o) {
    linkBtn.hidden = o.mode !== "enc";
    if (!text.trim()) return { text: "" };
    if (o.mode === "enc" && looksEncrypted(text)) {
      return { text: "", info: h("span", null, "Có vẻ đây là bản mã. ", h("button", { class: "linkish", type: "button", text: "Chuyển sang Giải mã", onclick: () => api.setOpt("mode", "dec") })) };
    }
    if (!o.pw) return { text: "", info: "Nhập mật khẩu ở trên để " + (o.mode === "enc" ? "mã hoá." : "giải mã.") };
    const my = ++tick;
    await sleep(250); // chờ gõ xong rồi mới dẫn xuất khoá (tốn khoảng nửa giây)
    if (my !== tick) return { text: "" };
    if (o.mode === "enc") {
      const s = await encryptText(text, o.pw, { salt: SALT });
      return { text: s, info: o.pw.length < 8 ? "Mật khẩu ngắn hơn 8 ký tự: người khác có thể dò ra nếu lấy được bản mã. Nên dùng mật khẩu dài hơn." : "Gửi bản mã này qua bất kỳ kênh nào; báo mật khẩu cho người nhận qua kênh khác." };
    }
    return { text: await decryptText(text, o.pw), info: "Đã giải mã và kiểm tra toàn vẹn: nội dung không bị sửa." };
  }
});

// mở từ link giải mã: #m=<bản mã>
function fromHash() {
  const m = /^#m=(.+)$/.exec(location.hash);
  if (!m) return;
  api.setOpt("mode", "dec");
  api.setText(decodeURIComponent(m[1]));
  replaceUrl(location.pathname + location.search);
  setTimeout(() => document.getElementById("tx-o-pw").focus(), 50);
}
fromHash();
window.addEventListener("hashchange", fromHash);
