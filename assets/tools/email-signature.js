/* Tạo chữ ký email: HTML dạng bảng, CSS viết thẳng trong thẻ để Gmail, Outlook hiển thị đúng; sao chép dạng có định dạng
   để dán thẳng vào ô chữ ký, hoặc lấy mã HTML. Thông tin được nhớ trong trình duyệt của bạn. */
import { h, icon, toast, copyText, save, store } from "../core.js";
import { formTool } from "../frames/form.js";
import { signatureHtml, signatureText, SOCIALS, normUrl } from "../lib/chu-ky-email.js";

const KEY = "sig:email";
const FONTS = [["Arial, Helvetica, sans-serif", "Arial"], ["Tahoma, Geneva, sans-serif", "Tahoma"], ["Verdana, Geneva, sans-serif", "Verdana"], ["Georgia, 'Times New Roman', serif", "Georgia"], ["'Times New Roman', Times, serif", "Times New Roman"]];
const COLORS = ["#3E5BF2", "#18794E", "#C0392B", "#B45309", "#7C3AED", "#0F766E", "#1F2937"];

let last = { html: "", text: "" };

async function copyRich(node) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([last.html], { type: "text/html" }), "text/plain": new Blob([last.text], { type: "text/plain" }) })]);
    toast("Đã sao chép chữ ký. Dán vào ô chữ ký của Gmail/Outlook.");
  } catch (_) {
    // trình duyệt cũ: chọn vùng xem trước rồi sao chép (vẫn giữ định dạng)
    const sel = getSelection(), r = document.createRange();
    r.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(r);
    const ok = document.execCommand("copy");
    sel.removeAllRanges();
    toast(ok ? "Đã sao chép chữ ký." : "Không sao chép được: hãy bôi đen phần xem trước rồi nhấn Ctrl/⌘ + C.", ok ? {} : { type: "err" });
  }
}

const urlHint = "Đường link ảnh công khai (https://…). Gmail, Outlook không hiện ảnh tải lên trực tiếp.";
const fields = [
  { id: "layout", type: "seg", label: "Kiểu", value: "left", choices: [["left", "Ảnh bên trái"], ["top", "Ảnh ở trên"], ["line", "Gọn, không ảnh"]] },
  { id: "color", type: "select", label: "Màu nhấn", value: COLORS[0], choices: COLORS.map((c, i) => [c, ["Xanh dương", "Xanh lá", "Đỏ", "Cam đất", "Tím", "Xanh ngọc", "Than chì"][i]]) },
  { id: "font", type: "select", label: "Phông chữ", value: FONTS[0][0], choices: FONTS },
  { id: "name", label: "Họ và tên", value: "", placeholder: "Nguyễn Văn An", attrs: { autocomplete: "name" } },
  { id: "title", label: "Chức vụ", value: "", placeholder: "Trưởng phòng Kinh doanh", attrs: { autocomplete: "organization-title" } },
  { id: "company", label: "Công ty", value: "", placeholder: "Công ty TNHH ABC", attrs: { autocomplete: "organization" } },
  { id: "phone", label: "Điện thoại", value: "", placeholder: "0901 234 567", attrs: { type: "tel", inputmode: "tel", autocomplete: "tel" } },
  { id: "phone2", label: "Hotline (tuỳ chọn)", value: "", attrs: { type: "tel", inputmode: "tel" } },
  { id: "email", label: "Email", value: "", placeholder: "an@congty.vn", attrs: { type: "email", inputmode: "email", autocomplete: "email" } },
  { id: "website", label: "Website", value: "", placeholder: "congty.vn", attrs: { inputmode: "url" } },
  { id: "address", label: "Địa chỉ", value: "", attrs: { autocomplete: "street-address" } },
  { id: "photo", label: "Ảnh chân dung (link)", value: "", placeholder: "https://…/anh.jpg", hint: urlHint, attrs: { inputmode: "url" }, show: (v) => v.layout !== "line" },
  { id: "logo", label: "Logo công ty (link)", value: "", placeholder: "https://…/logo.png", hint: urlHint, attrs: { inputmode: "url" } },
  ...SOCIALS.map(([k, label]) => ({ id: k, label: label + " (link, tuỳ chọn)", value: "", placeholder: k === "zalo" ? "zalo.me/0901234567" : k + ".com/…", attrs: { inputmode: "url" } })),
  { id: "note", type: "textarea", label: "Lời nhắn cuối (tuỳ chọn)", value: "", placeholder: "Ví dụ: Email này và các tệp đính kèm chỉ dành cho người nhận…" }
];
const SAMPLE = { name: "Nguyễn Văn An", title: "Trưởng phòng Kinh doanh", company: "Công ty TNHH BbeTools Mẫu", phone: "0901 234 567", email: "an.nguyen@congty-mau.vn", website: "springbbe.github.io/bbetools", address: "Số 1 đường Giả Định, Hà Nội", facebook: "facebook.com/bbetools" };

const api = formTool({
  fields,
  init(api) {
    // nhớ thông tin trên máy này (khi mở link chia sẻ thì dùng số liệu trên link)
    if (!location.search) { const s = store.get(KEY, null); if (s) for (const [k, v] of Object.entries(s)) if (api.ctrls[k]) api.ctrls[k].set(v); }
  },
  compute(v, out) {
    store.set(KEY, v);
    out.textContent = "";
    const bad = ["photo", "logo", "website", ...SOCIALS.map((s) => s[0])].filter((k) => v[k] && !normUrl(v[k]));
    if (!v.name && !v.email && !v.phone) {
      out.append(h("div", { class: "alert info", html: icon("info") + "<span>Nhập thông tin để tạo chữ ký. Mọi thứ nằm trên máy bạn, chỉ được nhớ trong trình duyệt này.</span>" }),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => { for (const [k, x] of Object.entries(SAMPLE)) api.ctrls[k].set(x); api.update(); } }, "Điền thông tin mẫu"));
      return;
    }
    const data = { ...v, photo: v.layout === "line" ? "" : v.photo };
    last = { html: signatureHtml(data), text: signatureText(data) };
    const box = h("div", { class: "sg-box", html: last.html });
    out.append(
      h("div", { class: "sg-mail" }, h("div", { class: "sg-top" }, h("span"), h("span"), h("span")), h("div", { class: "sg-body" }, h("p", { class: "sg-msg", text: "Chào anh/chị," }), h("p", { class: "sg-msg", text: "…" }), box)),
      bad.length ? h("p", { class: "alert warn", html: icon("triangle-alert") + `<span>Link chưa hợp lệ nên bị bỏ qua: ${bad.map((k) => fields.find((f) => f.id === k).label.replace(/ \(.*/, "")).join(", ")}.</span>` }) : "",
      h("div", { class: "row" },
        h("button", { class: "btn", type: "button", onclick: () => copyRich(box) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép chữ ký"),
        h("button", { class: "btn ghost", type: "button", onclick: () => copyText(last.html, "Đã sao chép mã HTML") }, h("span", { html: icon("code"), style: { display: "contents" } }), "Sao chép mã HTML"),
        h("button", { class: "btn ghost", type: "button", onclick: () => save(new Blob([`<!doctype html><meta charset="utf-8"><title>Chữ ký email</title>${last.html}`], { type: "text/html" }), "chu-ky-email.html") }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải .html")),
      h("details", null, h("summary", { text: "Cách dán vào Gmail" }), h("ol", null,
        h("li", { text: "Bấm “Sao chép chữ ký” ở trên." }),
        h("li", { text: "Mở Gmail → biểu tượng bánh răng → Xem tất cả chế độ cài đặt → thẻ Chung → mục Chữ ký → Tạo mới." }),
        h("li", { text: "Nhấn Ctrl/⌘ + V vào ô chữ ký, chọn chữ ký mặc định cho thư mới và thư trả lời, rồi bấm Lưu thay đổi ở cuối trang." }))),
      h("details", null, h("summary", { text: "Cách dán vào Outlook" }), h("ol", null,
        h("li", { text: "Outlook trên web / Outlook mới: Cài đặt → Tài khoản → Chữ ký → Chữ ký mới, dán vào rồi Lưu." }),
        h("li", { text: "Outlook trên Windows (bản cổ điển): File → Options → Mail → Signatures → New, dán vào ô Edit signature." }),
        h("li", { text: "Outlook trên Mac: Outlook → Settings → Signatures → +." }))),
      h("details", null, h("summary", { text: "Ảnh và logo không hiện?" }), h("p", { text: "Gmail và Outlook chỉ hiện ảnh có đường link công khai (https://…), ví dụ ảnh trên website công ty. Ảnh trên Google Drive, Facebook thường bị chặn. Nếu ảnh vẫn không hiện, hãy chèn ảnh trực tiếp trong trình soạn chữ ký của Gmail sau khi dán." })));
  }
});

const css = document.createElement("style");
css.textContent = `
.sg-mail{border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:var(--shadow);margin-bottom:12px}
.sg-top{display:flex;gap:6px;padding:10px 12px;background:var(--surface-2);border-bottom:1px solid var(--line)}
.sg-top span{width:10px;height:10px;border-radius:50%;background:var(--line-2,#ccc)}
.sg-body{background:#fff;color:#222;padding:16px;overflow-x:auto}
.sg-msg{margin:0 0 8px;font:14px Arial,sans-serif;color:#444}
.sg-box{margin-top:14px;padding-top:6px}
.sg-box a{text-decoration:none}
`;
document.head.append(css);
