/* Hash MD5/SHA: tính MD5, SHA-1, SHA-256, SHA-384, SHA-512 (và HMAC) của văn bản UTF-8; đối chiếu với mã có sẵn */
import { h, icon, copyText } from "../core.js";
import { textTool } from "../frames/text.js";
import { ALGOS, digest, toHex, utf8 } from "../lib/hash.js";
import { bytesToBase64 } from "../lib/encode.js";

textTool({
  inputLabel: "Văn bản",
  outputLabel: "Mã băm",
  placeholder: "Gõ hoặc dán văn bản cần tính hash…",
  sample: "Xin chào BbeTools",
  output: "custom",
  options: [
    { id: "fmt", label: "Dạng", value: "hex", choices: [["hex", "hex thường"], ["HEX", "HEX hoa"], ["b64", "Base64"]] },
    { id: "key", type: "text", label: "Khoá HMAC (tuỳ chọn)", placeholder: "Để trống = hash thường", wide: true, persist: false },
    { id: "cmp", type: "text", label: "Đối chiếu với mã", placeholder: "Dán mã hash cần so khớp", wide: true, mono: true, persist: false }
  ],
  async transform(text, o) {
    const bytes = utf8(text), key = o.key ? utf8(o.key) : null;
    const res = await Promise.all(ALGOS.map(async (a) => {
      const d = await digest(a, bytes, key);
      return [a, o.fmt === "b64" ? bytesToBase64(d) : o.fmt === "HEX" ? toHex(d).toUpperCase() : toHex(d)];
    }));
    return { text: res.map(([a, v]) => `${a}: ${v}`).join("\n"), res, hmac: !!key, bytes: bytes.length };
  },
  render(out, r, text, o) {
    out.textContent = "";
    out.classList.remove("out");
    out.classList.add("hash-out");
    if (!r.res) return;
    const cmp = o.cmp.trim().toLowerCase().replace(/\s+/g, "");
    const hit = cmp && r.res.find(([, v]) => v.toLowerCase() === cmp);
    const list = h("div", { class: "hash-list" }, r.res.map(([a, v]) => h("div", { class: "hash-row" + (hit && hit[1] === v ? " match" : "") },
      h("span", { class: "hash-a", text: (r.hmac ? "HMAC-" : "") + a }),
      h("code", { class: "hash-v", text: v }),
      h("button", { class: "ib sm", type: "button", "aria-label": "Sao chép " + a, title: "Sao chép", html: icon("copy"), onclick: () => copyText(v, "Đã sao chép " + a) }))));
    out.append(h("p", { class: "hint", text: `${r.bytes.toLocaleString("vi-VN")} byte (UTF-8)${text ? "" : " – chuỗi rỗng"}` }), list);
    if (cmp) out.append(h("p", { class: "alert " + (hit ? "ok" : "err"), html: icon(hit ? "circle-check" : "triangle-alert") + `<span>${hit ? "Khớp với " + (r.hmac ? "HMAC-" : "") + hit[0] + "." : "Không khớp với thuật toán nào. Kiểm tra lại văn bản (kể cả dấu cách, xuống dòng cuối) hoặc khoá HMAC."}</span>` }));
    out.append(h("p", { class: "hint", text: "MD5 và SHA-1 đã bị phá về mặt bảo mật, chỉ nên dùng để kiểm tra dữ liệu không bị hỏng. Không dùng hash đơn thuần để lưu mật khẩu." }));
  }
});
