/* Tạo mã QR: link, văn bản, WiFi, danh thiếp vCard, SMS, email, điện thoại; đổi màu, chèn logo, tải PNG/SVG */
import { h, icon, save, copyImage, toast } from "../core.js";
import { formTool } from "../frames/form.js";
import { qrMatrix, drawQR, qrSvg, canvasBlob } from "../qr.js";

const T = (types) => (v) => types.includes(v.type);
const escWifi = (s) => String(s || "").replace(/([\;,:"])/g, "\\$1");
let logo = null, seq = 0;

function logoField() {
  const input = h("input", { type: "file", accept: "image/*", id: "logo", class: "sr-only" });
  const name = h("span", { class: "hint", text: "Chưa có logo" });
  const clear = h("button", { class: "ib sm", type: "button", "aria-label": "Bỏ logo", html: icon("x"), hidden: true });
  input.addEventListener("change", async () => {
    const f = input.files[0];
    if (!f) return;
    try { logo = await createImageBitmap(f); name.textContent = f.name; clear.hidden = false; api.update(); }
    catch (_) { toast("Không đọc được ảnh logo", { type: "err" }); }
    input.value = "";
  });
  clear.addEventListener("click", () => { logo = null; name.textContent = "Chưa có logo"; clear.hidden = true; api.update(); });
  const el = h("div", { class: "field" }, h("span", { text: "Logo ở giữa (tuỳ chọn)" }),
    h("div", { class: "row" }, h("label", { class: "btn ghost sm", for: "logo", tabindex: "0", onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } } }, h("span", { html: icon("image"), style: { display: "contents" } }), "Chọn ảnh"), name, clear, input),
    h("small", { text: "Khi có logo, mã tự dùng mức sửa lỗi cao nhất để vẫn quét được." }));
  return { el, get: () => "", set: () => {} };
}

function payload(v) {
  switch (v.type) {
    case "url": { let u = v.url.trim(); if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u; return u; }
    case "text": return v.text;
    case "wifi": return v.ssid ? `WIFI:T:${v.enc === "nopass" ? "nopass" : v.enc};S:${escWifi(v.ssid)};${v.enc !== "nopass" ? "P:" + escWifi(v.pass) + ";" : ""}${v.hidden ? "H:true;" : ""};` : "";
    case "vcard": {
      if (!v.vname && !v.vphone) return "";
      const parts = v.vname.trim().split(/\s+/);
      const family = parts.length > 1 ? parts[0] : "", given = parts.length > 1 ? parts.slice(1).join(" ") : parts[0] || "";
      const L = ["BEGIN:VCARD", "VERSION:3.0", `N:${family};${given};;;`, `FN:${v.vname.trim()}`];
      if (v.vorg) L.push("ORG:" + v.vorg);
      if (v.vtitle) L.push("TITLE:" + v.vtitle);
      if (v.vphone) L.push("TEL;TYPE=CELL:" + v.vphone.replace(/[^\d+]/g, ""));
      if (v.vemail) L.push("EMAIL:" + v.vemail);
      if (v.vweb) L.push("URL:" + v.vweb);
      if (v.vaddr) L.push("ADR:;;" + v.vaddr.replace(/[;,]/g, (c) => "\\" + c) + ";;;;");
      L.push("END:VCARD");
      return L.join("\n");
    }
    case "sms": return v.phone ? `SMSTO:${v.phone.replace(/[^\d+]/g, "")}:${v.body}` : "";
    case "email": return v.to ? `mailto:${v.to}${v.subject || v.body ? "?" + new URLSearchParams(Object.entries({ subject: v.subject, body: v.body }).filter(([, x]) => x)).toString().replace(/\+/g, "%20") : ""}` : "";
    case "tel": return v.phone ? "tel:" + v.phone.replace(/[^\d+]/g, "") : "";
  }
  return "";
}

const api = formTool({
  fields: [
    { id: "type", type: "seg", label: "Loại nội dung", value: "url", full: false, choices: [["url", "Link"], ["text", "Văn bản"], ["wifi", "WiFi"], ["vcard", "Danh thiếp"], ["sms", "SMS"], ["email", "Email"], ["tel", "Điện thoại"]] },
    { id: "url", label: "Đường link", value: "", placeholder: "https://…", attrs: { inputmode: "url", type: "url" }, show: T(["url"]) },
    { id: "text", type: "textarea", label: "Văn bản", value: "", placeholder: "Nội dung bất kỳ", show: T(["text"]) },
    { id: "ssid", label: "Tên WiFi (SSID)", value: "", show: T(["wifi"]) },
    { id: "pass", label: "Mật khẩu WiFi", value: "", url: false, hint: "Không đưa vào link chia sẻ.", attrs: { autocomplete: "off" }, show: (v) => v.type === "wifi" && v.enc !== "nopass" },
    { id: "enc", type: "seg", label: "Bảo mật", value: "WPA", choices: [["WPA", "WPA/WPA2/WPA3"], ["WEP", "WEP"], ["nopass", "Không mật khẩu"]], show: T(["wifi"]) },
    { id: "hidden", type: "check", label: "Mạng ẩn (không phát tên)", value: false, show: T(["wifi"]) },
    { id: "vname", label: "Họ và tên", value: "", placeholder: "Nguyễn Văn An", show: T(["vcard"]) },
    { id: "vphone", label: "Điện thoại", value: "", attrs: { inputmode: "tel", type: "tel" }, show: T(["vcard"]) },
    { id: "vemail", label: "Email", value: "", attrs: { inputmode: "email", type: "email" }, show: T(["vcard"]) },
    { id: "vorg", label: "Công ty", value: "", show: T(["vcard"]) },
    { id: "vtitle", label: "Chức vụ", value: "", show: T(["vcard"]) },
    { id: "vweb", label: "Website", value: "", show: T(["vcard"]) },
    { id: "vaddr", label: "Địa chỉ", value: "", show: T(["vcard"]) },
    { id: "phone", label: "Số điện thoại", value: "", attrs: { inputmode: "tel", type: "tel" }, show: T(["sms", "tel"]) },
    { id: "body", type: "textarea", label: "Nội dung tin nhắn", value: "", show: T(["sms", "email"]) },
    { id: "to", label: "Gửi tới email", value: "", attrs: { inputmode: "email", type: "email" }, show: T(["email"]) },
    { id: "subject", label: "Tiêu đề", value: "", show: T(["email"]) },
    { id: "fg", type: "color", label: "Màu mã", value: "#000000" },
    { id: "bg", type: "color", label: "Màu nền", value: "#ffffff" },
    { id: "style", type: "seg", label: "Kiểu ô", value: "square", choices: [["square", "Vuông"], ["dots", "Chấm tròn"]] },
    { id: "ecc", type: "select", label: "Mức sửa lỗi", value: "M", choices: [["L", "Thấp (L) – mã thưa nhất"], ["M", "Vừa (M) – khuyên dùng"], ["Q", "Khá (Q)"], ["H", "Cao (H) – chịu bẩn, che tốt"]] },
    { id: "size", type: "select", label: "Kích thước ảnh tải về", value: "1024", choices: [["512", "512 px"], ["1024", "1024 px"], ["2048", "2048 px (in ấn)"]] },
    { id: "logo", type: "custom", render: logoField, url: false }
  ],
  async compute(v, out) {
    const my = ++seq;
    const text = payload(v);
    if (!text) { out.textContent = ""; out.append(h("div", { class: "alert info", html: icon("info") + "<span>Nhập nội dung để tạo mã QR. Mã tạo ngay trên máy bạn và dùng mãi mãi, không hết hạn.</span>" })); return; }
    const ecc = logo ? "H" : v.ecc;
    let m;
    try { m = await qrMatrix(text, ecc); } catch (e) { out.textContent = ""; out.append(h("p", { class: "alert err", text: e.userMsg || e.message })); return; }
    if (my !== seq) return;
    const opts = { fg: v.fg, bg: v.bg, style: v.style, logo, margin: 4 };
    const preview = drawQR(h("canvas"), m, { ...opts, px: 720 });
    preview.style.cssText = "width:100%;max-width:340px;display:block;margin:0 auto;border-radius:14px;box-shadow:var(--shadow)";
    preview.setAttribute("role", "img"); preview.setAttribute("aria-label", "Mã QR");
    const contrastWarn = luminance(v.fg) > luminance(v.bg) ? h("p", { class: "alert warn", html: icon("triangle-alert") + "<span>Màu mã sáng hơn màu nền — nhiều ứng dụng sẽ không quét được. Nên dùng mã tối trên nền sáng.</span>" }) : null;
    const big = () => drawQR(h("canvas"), m, { ...opts, px: +v.size });
    out.textContent = "";
    out.append(preview, contrastWarn || "",
      h("p", { class: "hint", style: { textAlign: "center" }, text: `${m.size}×${m.size} ô · ${new TextEncoder().encode(text).length} byte · sửa lỗi ${ecc}` }),
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "btn", type: "button", onclick: async () => save(await canvasBlob(big()), "ma-qr.png") }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải PNG"),
        h("button", { class: "btn ghost", type: "button", disabled: !!logo || v.style === "dots", title: logo || v.style === "dots" ? "SVG chỉ hỗ trợ kiểu ô vuông, không logo" : "", onclick: () => save(new Blob([qrSvg(m, opts)], { type: "image/svg+xml" }), "ma-qr.svg") }, "Tải SVG"),
        h("button", { class: "btn ghost", type: "button", onclick: async () => copyImage(await canvasBlob(big())) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép ảnh")));
    if (v.type === "wifi") out.append(h("p", { class: "hint", style: { textAlign: "center" }, text: "Mở camera điện thoại, quét mã để kết nối WiFi ngay." }));
  }
});

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
