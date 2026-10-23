/* Tự sinh bởi scripts/build.js từ assets/tools/text-encrypt.js và i18n/en/js/ — đừng sửa tay. */
/* Mã hoá văn bản bằng mật khẩu: AES-GCM 256 + PBKDF2-SHA256 (600.000 vòng), kết quả là chuỗi Base64 gửi được qua tin nhắn, email.
   Link giải mã để bản mã sau dấu # (trình duyệt không gửi phần này lên máy chủ). */
import { h, icon, copyText, replaceUrl, sleep, HOME } from "../core.js";
import { textTool } from "../frames/text.js";
import { encryptText, decryptText, looksEncrypted } from "../lib/ma-hoa.js";

const SALT = crypto.getRandomValues(new Uint8Array(16)); // cố định trong phiên để gõ không phải dẫn xuất khoá lại; mỗi lần mã hoá vẫn có nonce mới
let tick = 0, api;

const linkBtn = h("button", { class: "btn ghost sm", type: "button", title: "A link that opens this page with the ciphertext filled in; the recipient only needs to enter the password", onclick: () => {
  const r = api.result;
  if (api.opts.mode !== "enc" || !r.text) return;
  copyText(new URL(HOME + "text-encrypt/", location.href).href.split("#")[0] + "#m=" + encodeURIComponent(r.text), "Decryption link copied (it doesn't contain the password)");
} }, h("span", { html: icon("link"), style: { display: "contents" } }), "Decryption link");

api = textTool({
  inputLabel: "Text",
  outputLabel: "Result",
  placeholder: "Type a message to encrypt, or paste ciphertext to decrypt…",
  sample: (o) => (o.mode === "dec" ? "" : "Meeting room WiFi password: BbeTools@2026. Don't share it outside!"),
  mono: false,
  swap: "mode",
  options: [
    { id: "mode", label: "Mode", value: "enc", choices: [["enc", "Encrypt"], ["dec", "Decrypt"]] },
    { id: "pw", type: "password", label: "Password", placeholder: "The recipient needs exactly this password", wide: true, persist: false }
  ],
  outputActions: [linkBtn],
  async transform(text, o) {
    linkBtn.hidden = o.mode !== "enc";
    if (!text.trim()) return { text: "" };
    if (o.mode === "enc" && looksEncrypted(text)) {
      return { text: "", info: h("span", null, "This looks like ciphertext. ", h("button", { class: "linkish", type: "button", text: "Switch to Decrypt", onclick: () => api.setOpt("mode", "dec") })) };
    }
    if (!o.pw) return { text: "", info: "Enter the password above to " + (o.mode === "enc" ? "encrypt." : "decrypt.") };
    const my = ++tick;
    await sleep(250); // chờ gõ xong rồi mới dẫn xuất khoá (tốn khoảng nửa giây)
    if (my !== tick) return { text: "" };
    if (o.mode === "enc") {
      const s = await encryptText(text, o.pw, { salt: SALT });
      return { text: s, info: o.pw.length < 8 ? "The password is shorter than 8 characters: someone could brute-force it if they get the ciphertext. Use a longer password." : "Send this ciphertext through any channel; give the recipient the password through a different channel." };
    }
    return { text: await decryptText(text, o.pw), info: "Decrypted and integrity-checked: the content hasn't been altered." };
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
