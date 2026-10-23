/* Tự sinh bởi scripts/build.js từ assets/tools/email-signature.js và i18n/en/js/ — đừng sửa tay. */
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
    toast("Signature copied. Paste it into your Gmail/Outlook signature box.");
  } catch (_) {
    // trình duyệt cũ: chọn vùng xem trước rồi sao chép (vẫn giữ định dạng)
    const sel = getSelection(), r = document.createRange();
    r.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(r);
    const ok = document.execCommand("copy");
    sel.removeAllRanges();
    toast(ok ? "Signature copied." : "Couldn't copy: select the preview and press Ctrl/⌘ + C.", ok ? {} : { type: "err" });
  }
}

const urlHint = "A public image link (https://…). Gmail and Outlook don't show directly uploaded images.";
const fields = [
  { id: "layout", type: "seg", label: "Layout", value: "left", choices: [["left", "Photo on the left"], ["top", "Photo on top"], ["line", "Compact, no photo"]] },
  { id: "color", type: "select", label: "Accent color", value: COLORS[0], choices: COLORS.map((c, i) => [c, ["Blue", "Green", "Red", "Terracotta", "Purple", "Teal", "Charcoal"][i]]) },
  { id: "font", type: "select", label: "Font", value: FONTS[0][0], choices: FONTS },
  { id: "name", label: "Full name", value: "", placeholder: "John Smith", attrs: { autocomplete: "name" } },
  { id: "title", label: "Job title", value: "", placeholder: "Sales Manager", attrs: { autocomplete: "organization-title" } },
  { id: "company", label: "Company", value: "", placeholder: "ABC Ltd.", attrs: { autocomplete: "organization" } },
  { id: "phone", label: "Phone", value: "", placeholder: "0901 234 567", attrs: { type: "tel", inputmode: "tel", autocomplete: "tel" } },
  { id: "phone2", label: "Hotline (optional)", value: "", attrs: { type: "tel", inputmode: "tel" } },
  { id: "email", label: "Email", value: "", placeholder: "an@congty.vn", attrs: { type: "email", inputmode: "email", autocomplete: "email" } },
  { id: "website", label: "Website", value: "", placeholder: "congty.vn", attrs: { inputmode: "url" } },
  { id: "address", label: "Address", value: "", attrs: { autocomplete: "street-address" } },
  { id: "photo", label: "Portrait photo (link)", value: "", placeholder: "https://…/anh.jpg", hint: urlHint, attrs: { inputmode: "url" }, show: (v) => v.layout !== "line" },
  { id: "logo", label: "Company logo (link)", value: "", placeholder: "https://…/logo.png", hint: urlHint, attrs: { inputmode: "url" } },
  ...SOCIALS.map(([k, label]) => ({ id: k, label: label + " (link, optional)", value: "", placeholder: k === "zalo" ? "zalo.me/0901234567" : k + ".com/…", attrs: { inputmode: "url" } })),
  { id: "note", type: "textarea", label: "Closing note (optional)", value: "", placeholder: "Example: This email and any attachments are intended only for the recipient…" }
];
const SAMPLE = { name: "John Smith", title: "Sales Manager", company: "BbeTools Sample Ltd.", phone: "0901 234 567", email: "an.nguyen@congty-mau.vn", website: "springbbe.github.io/bbetools", address: "1 Example Street, Springfield", facebook: "facebook.com/bbetools" };

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
      out.append(h("div", { class: "alert info", html: icon("info") + "<span>Enter your details to create a signature. Everything stays on your device and is only remembered in this browser.</span>" }),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => { for (const [k, x] of Object.entries(SAMPLE)) api.ctrls[k].set(x); api.update(); } }, "Fill in sample details"));
      return;
    }
    const data = { ...v, photo: v.layout === "line" ? "" : v.photo };
    last = { html: signatureHtml(data), text: signatureText(data) };
    const box = h("div", { class: "sg-box", html: last.html });
    out.append(
      h("div", { class: "sg-mail" }, h("div", { class: "sg-top" }, h("span"), h("span"), h("span")), h("div", { class: "sg-body" }, h("p", { class: "sg-msg", text: "Hi there," }), h("p", { class: "sg-msg", text: "…" }), box)),
      bad.length ? h("p", { class: "alert warn", html: icon("triangle-alert") + `<span>Invalid link skipped: ${bad.map((k) => fields.find((f) => f.id === k).label.replace(/ \(.*/, "")).join(", ")}.</span>` }) : "",
      h("div", { class: "row" },
        h("button", { class: "btn", type: "button", onclick: () => copyRich(box) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy signature"),
        h("button", { class: "btn ghost", type: "button", onclick: () => copyText(last.html, "HTML code copied") }, h("span", { html: icon("code"), style: { display: "contents" } }), "Copy HTML code"),
        h("button", { class: "btn ghost", type: "button", onclick: () => save(new Blob([`<!doctype html><meta charset="utf-8"><title>Email signature</title>${last.html}`], { type: "text/html" }), "email-signature.html") }, h("span", { html: icon("download"), style: { display: "contents" } }), "Download .html")),
      h("details", null, h("summary", { text: "How to paste into Gmail" }), h("ol", null,
        h("li", { text: "Click “Copy signature” above." }),
        h("li", { text: "Open Gmail → gear icon → See all settings → General tab → Signature → Create new." }),
        h("li", { text: "Press Ctrl/⌘ + V in the signature box, choose it as the default for new emails and replies, then click Save Changes at the bottom." }))),
      h("details", null, h("summary", { text: "How to paste into Outlook" }), h("ol", null,
        h("li", { text: "Outlook on the web / new Outlook: Settings → Accounts → Signatures → New signature, paste, then Save." }),
        h("li", { text: "Outlook for Windows (classic): File → Options → Mail → Signatures → New, paste into Edit signature." }),
        h("li", { text: "Outlook for Mac: Outlook → Settings → Signatures → +." }))),
      h("details", null, h("summary", { text: "Images and logo not showing?" }), h("p", { text: "Gmail and Outlook only show images with a public link (https://…), such as images on your company website. Images on Google Drive or Facebook are often blocked. If images still don't show, insert them directly in Gmail's signature editor after pasting." })));
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
