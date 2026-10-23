/* Tự sinh bởi scripts/build.js từ assets/tools/qr-generator.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo mã QR: link, văn bản, WiFi, danh thiếp vCard, SMS, email, điện thoại; đổi màu, chèn logo, tải PNG/SVG */
import { h, icon, save, copyImage, toast } from "../core.js";
import { formTool } from "../frames/form.js";
import { qrMatrix, drawQR, qrSvg, canvasBlob } from "../qr.js";

const T = (types) => (v) => types.includes(v.type);
const escWifi = (s) => String(s || "").replace(/([\;,:"])/g, "\\$1");
let logo = null, seq = 0;

function logoField() {
  const input = h("input", { type: "file", accept: "image/*", id: "logo", class: "sr-only" });
  const name = h("span", { class: "hint", text: "No logo yet" });
  const clear = h("button", { class: "ib sm", type: "button", "aria-label": "Remove logo", html: icon("x"), hidden: true });
  input.addEventListener("change", async () => {
    const f = input.files[0];
    if (!f) return;
    try { logo = await createImageBitmap(f); name.textContent = f.name; clear.hidden = false; api.update(); }
    catch (_) { toast("Couldn't read the logo image", { type: "err" }); }
    input.value = "";
  });
  clear.addEventListener("click", () => { logo = null; name.textContent = "No logo yet"; clear.hidden = true; api.update(); });
  const el = h("div", { class: "field" }, h("span", { text: "Logo in the center (optional)" }),
    h("div", { class: "row" }, h("label", { class: "btn ghost sm", for: "logo", tabindex: "0", onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } } }, h("span", { html: icon("image"), style: { display: "contents" } }), "Choose image"), name, clear, input),
    h("small", { text: "With a logo, the code automatically uses the highest error correction so it still scans." }));
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
    { id: "type", type: "seg", label: "Content type", value: "url", full: false, choices: [["url", "Link"], ["text", "Text"], ["wifi", "WiFi"], ["vcard", "Contact card"], ["sms", "SMS"], ["email", "Email"], ["tel", "Phone"]] },
    { id: "url", label: "Link", value: "", placeholder: "https://…", attrs: { inputmode: "url", type: "url" }, show: T(["url"]) },
    { id: "text", type: "textarea", label: "Text", value: "", placeholder: "Any content", show: T(["text"]) },
    { id: "ssid", label: "WiFi name (SSID)", value: "", show: T(["wifi"]) },
    { id: "pass", label: "WiFi password", value: "", url: false, hint: "Not included in the share link.", attrs: { autocomplete: "off" }, show: (v) => v.type === "wifi" && v.enc !== "nopass" },
    { id: "enc", type: "seg", label: "Security", value: "WPA", choices: [["WPA", "WPA/WPA2/WPA3"], ["WEP", "WEP"], ["nopass", "No password"]], show: T(["wifi"]) },
    { id: "hidden", type: "check", label: "Hidden network (no SSID broadcast)", value: false, show: T(["wifi"]) },
    { id: "vname", label: "Full name", value: "", placeholder: "John Smith", show: T(["vcard"]) },
    { id: "vphone", label: "Phone", value: "", attrs: { inputmode: "tel", type: "tel" }, show: T(["vcard"]) },
    { id: "vemail", label: "Email", value: "", attrs: { inputmode: "email", type: "email" }, show: T(["vcard"]) },
    { id: "vorg", label: "Company", value: "", show: T(["vcard"]) },
    { id: "vtitle", label: "Job title", value: "", show: T(["vcard"]) },
    { id: "vweb", label: "Website", value: "", show: T(["vcard"]) },
    { id: "vaddr", label: "Address", value: "", show: T(["vcard"]) },
    { id: "phone", label: "Phone number", value: "", attrs: { inputmode: "tel", type: "tel" }, show: T(["sms", "tel"]) },
    { id: "body", type: "textarea", label: "Message text", value: "", show: T(["sms", "email"]) },
    { id: "to", label: "Send to email", value: "", attrs: { inputmode: "email", type: "email" }, show: T(["email"]) },
    { id: "subject", label: "Subject", value: "", show: T(["email"]) },
    { id: "fg", type: "color", label: "Code color", value: "#000000" },
    { id: "bg", type: "color", label: "Background color", value: "#ffffff" },
    { id: "style", type: "seg", label: "Module style", value: "square", choices: [["square", "Square"], ["dots", "Dots"]] },
    { id: "ecc", type: "select", label: "Error correction", value: "M", choices: [["L", "Low (L) – sparsest code"], ["M", "Medium (M) – recommended"], ["Q", "Quartile (Q)"], ["H", "High (H) – tolerates dirt and covering"]] },
    { id: "size", type: "select", label: "Download image size", value: "1024", choices: [["512", "512 px"], ["1024", "1024 px"], ["2048", "2048 px (print)"]] },
    { id: "logo", type: "custom", render: logoField, url: false }
  ],
  async compute(v, out) {
    const my = ++seq;
    const text = payload(v);
    if (!text) { out.textContent = ""; out.append(h("div", { class: "alert info", html: icon("info") + "<span>Enter content to create a QR code. It's created on your device and works forever, it never expires.</span>" })); return; }
    const ecc = logo ? "H" : v.ecc;
    let m;
    try { m = await qrMatrix(text, ecc); } catch (e) { out.textContent = ""; out.append(h("p", { class: "alert err", text: e.userMsg || e.message })); return; }
    if (my !== seq) return;
    const opts = { fg: v.fg, bg: v.bg, style: v.style, logo, margin: 4 };
    const preview = drawQR(h("canvas"), m, { ...opts, px: 720 });
    preview.style.cssText = "width:100%;max-width:340px;display:block;margin:0 auto;border-radius:14px;box-shadow:var(--shadow)";
    preview.setAttribute("role", "img"); preview.setAttribute("aria-label", "QR code");
    const contrastWarn = luminance(v.fg) > luminance(v.bg) ? h("p", { class: "alert warn", html: icon("triangle-alert") + "<span>The code color is lighter than the background — many apps won't scan it. Use a dark code on a light background.</span>" }) : null;
    const big = () => drawQR(h("canvas"), m, { ...opts, px: +v.size });
    out.textContent = "";
    out.append(preview, contrastWarn || "",
      h("p", { class: "hint", style: { textAlign: "center" }, text: `${m.size}×${m.size} modules · ${new TextEncoder().encode(text).length} bytes · error correction ${ecc}` }),
      h("div", { class: "row", style: { justifyContent: "center" } },
        h("button", { class: "btn", type: "button", onclick: async () => save(await canvasBlob(big()), "qr-code.png") }, h("span", { html: icon("download"), style: { display: "contents" } }), "Download PNG"),
        h("button", { class: "btn ghost", type: "button", disabled: !!logo || v.style === "dots", title: logo || v.style === "dots" ? "SVG only supports square modules, no logo" : "", onclick: () => save(new Blob([qrSvg(m, opts)], { type: "image/svg+xml" }), "qr-code.svg") }, "Download SVG"),
        h("button", { class: "btn ghost", type: "button", onclick: async () => copyImage(await canvasBlob(big())) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy image")));
    if (v.type === "wifi") out.append(h("p", { class: "hint", style: { textAlign: "center" }, text: "Open your phone's camera and scan the code to join the WiFi right away." }));
  }
});

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
