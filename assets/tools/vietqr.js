/* Tạo mã QR chuyển khoản VietQR (EMVCo/NAPAS) ngay trên máy, có ảnh thẻ QR để in hoặc gửi */
import { h, icon, ROOT, save, copyText, copyImage, toast, fmtNum } from "../core.js";
import { formTool } from "../frames/form.js";
import { buildVietQR, cleanMessage, cleanAccount } from "../lib/vietqr.js";
import { readNumber } from "../lib/doc-so.js";
import { stripAccents } from "../lib/search.js";
import { qrMatrix, drawQR, canvasBlob } from "../qr.js";

const data = await fetch(ROOT + "data/ngan-hang-vietqr.json").then((r) => r.json());
const POPULAR = ["970436", "970415", "970418", "970405", "970407", "970422", "970416", "970432", "970423", "970403", "970448", "970441"];
const byBin = Object.fromEntries(data.banks.map((b) => [b.bin, b]));
const label = (b) => `${b.short} (${b.code})${b.napas247 ? "" : " – có thể chưa hỗ trợ"}`;

function bankSelect() {
  const s = h("select", { id: "bank", required: true },
    h("option", { value: "", text: "— Chọn ngân hàng —" }),
    h("optgroup", { label: "Phổ biến" }, POPULAR.filter((b) => byBin[b]).map((b) => h("option", { value: b, text: label(byBin[b]) }))),
    h("optgroup", { label: "Tất cả ngân hàng (A→Z)" }, data.banks.slice().sort((a, b) => a.short.localeCompare(b.short, "vi")).map((b) => h("option", { value: b.bin, text: label(b) }))));
  const el = h("div", { class: "field" }, h("label", { for: "bank", text: "Ngân hàng nhận" }), s, h("small", { text: `${data.banks.length} ngân hàng, cập nhật ${data.updated.split("-").reverse().join("/")}` }));
  return { el, get: () => s.value, set: (v) => { s.value = byBin[v] ? v : ""; } };
}

let seq = 0;

formTool({
  fields: [
    { id: "bank", type: "custom", render: bankSelect, value: "" },
    { id: "acc", type: "text", label: "Số tài khoản", placeholder: "Ví dụ: 0011000597049", attrs: { inputmode: "text", maxlength: 24, autocapitalize: "characters", spellcheck: "false" } },
    { id: "name", type: "text", label: "Tên chủ tài khoản (tuỳ chọn)", placeholder: "NGUYEN VAN A", hint: "Chỉ in lên ảnh để người chuyển đối chiếu; ứng dụng ngân hàng sẽ tự hiện tên thật.", attrs: { autocapitalize: "characters", maxlength: 50 } },
    { id: "amount", type: "money", label: "Số tiền (tuỳ chọn)", placeholder: "Để trống: người chuyển tự nhập", suffix: "đ" },
    { id: "msg", type: "text", label: "Nội dung chuyển khoản (tuỳ chọn)", placeholder: "Ví dụ: Tien nha thang 10", attrs: { maxlength: 60 } },
    { id: "svc", type: "seg", label: "Loại", value: "account", choices: [["account", "Số tài khoản"], ["card", "Số thẻ"]] }
  ],
  async compute(v, out) {
    const my = ++seq;
    const bank = byBin[v.bank];
    const acc = cleanAccount(v.acc);
    if (!bank || !acc) {
      out.textContent = "";
      out.append(h("div", { class: "alert info", html: icon("info") + "<span>Chọn ngân hàng và nhập số tài khoản để tạo mã QR. Mã được tạo ngay trên máy bạn theo chuẩn VietQR của NAPAS — quét được bằng mọi ứng dụng ngân hàng.</span>" }));
      return;
    }
    let payload;
    try { payload = buildVietQR({ bin: bank.bin, account: acc, amount: v.amount, message: v.msg, service: v.svc }); }
    catch (e) { out.textContent = ""; out.append(h("p", { class: "alert err", text: e.message })); return; }
    const msg = cleanMessage(v.msg);
    const amount = Number(v.amount || 0);
    const name = stripAccents(v.name || "").toUpperCase().replace(/\s+/g, " ").trim();
    const card = await renderCard({ payload, bank, acc, name, amount, msg });
    if (my !== seq) return; // đã có lần nhập mới hơn
    out.textContent = "";
    const img = h("img", { src: card.toDataURL("image/png"), alt: `Mã QR chuyển khoản ${bank.short} ${acc}`, style: { width: "100%", maxWidth: "360px", display: "block", margin: "0 auto", borderRadius: "16px", boxShadow: "var(--shadow)" } });
    out.append(img);
    if (msg.length > 25) out.append(h("p", { class: "alert warn", html: icon("triangle-alert") + "<span>Nội dung dài hơn 25 ký tự; một số ngân hàng sẽ cắt bớt.</span>" }));
    if (v.msg && msg !== v.msg.trim()) out.append(h("p", { class: "hint", text: "Nội dung được chuyển thành không dấu: “" + msg + "”." }));
    if (!bank.napas247) out.append(h("p", { class: "alert warn", html: icon("triangle-alert") + "<span>Ngân hàng này có thể chưa hỗ trợ nhận tiền qua mã VietQR. Hãy thử quét trước khi gửi cho người khác.</span>" }));
    const fname = `vietqr-${bank.code}-${acc}${amount ? "-" + amount : ""}.png`.toLowerCase();
    out.append(h("div", { class: "row" },
      h("button", { class: "btn", type: "button", onclick: async () => save(await canvasBlob(card), fname) }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải ảnh QR"),
      h("button", { class: "btn ghost", type: "button", onclick: async () => copyImage(await canvasBlob(card)) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép ảnh"),
      navigator.share ? h("button", { class: "btn ghost", type: "button", onclick: async () => {
        const file = new File([await canvasBlob(card)], fname, { type: "image/png" });
        try { await navigator.share(navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], title: "Mã QR chuyển khoản" } : { url: location.href, title: "Mã QR chuyển khoản" }); } catch (_) {}
      } }, h("span", { html: icon("share-2"), style: { display: "contents" } }), "Chia sẻ") : null));
    out.append(h("details", null, h("summary", { text: "Xem chuỗi dữ liệu trong mã (EMVCo)" }),
      h("p", null, h("code", { text: payload, style: { wordBreak: "break-all" } })),
      h("p", null, h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(payload) }, "Sao chép chuỗi"))));
  }
});

async function renderCard({ payload, bank, acc, name, amount, msg }) {
  const m = await qrMatrix(payload, "M");
  const W = 720, pad = 48, qrPx = W - pad * 2;
  const lines = [];
  const c = document.createElement("canvas");
  const font = (w, s) => `${w} ${s}px "Be Vietnam Pro", system-ui, sans-serif`;
  try { await document.fonts.load(font(800, 30)); await document.fonts.load(font(600, 24)); } catch (_) {}
  const g0 = c.getContext("2d");
  // đo trước để tính chiều cao
  lines.push({ t: bank.short + " · " + bank.code, f: font(700, 28), color: "#3E5BF2" });
  lines.push({ t: acc.replace(/(\d{4})(?=\d)/g, "$1 "), f: font(800, 40), color: "#16181D" });
  if (name) lines.push({ t: name, f: font(600, 26), color: "#16181D" });
  if (amount) {
    lines.push({ t: fmtNum(amount) + " đ", f: font(800, 44), color: "#18794E", gap: 18 });
    const words = readNumber(String(amount), { unit: "đồng" });
    wrapText(g0, words, font(400, 22), W - pad * 2).forEach((t) => lines.push({ t, f: font(400, 22), color: "#5B6271" }));
  }
  if (msg) wrapText(g0, "Nội dung: " + msg, font(500, 24), W - pad * 2).forEach((t, i) => lines.push({ t, f: font(500, 24), color: "#16181D", gap: i ? 0 : 14 }));
  const lineH = (f) => +/(\d+)px/.exec(f)[1] * 1.35;
  const textH = lines.reduce((s, l) => s + lineH(l.f) + (l.gap || 0), 0);
  const H = pad + qrPx + 28 + textH + 64 + pad / 2;
  c.width = W; c.height = Math.round(H);
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  const q = document.createElement("canvas");
  drawQR(q, m, { px: qrPx, margin: 2 });
  g.drawImage(q, pad, pad);
  let y = pad + qrPx + 28;
  g.textAlign = "center"; g.textBaseline = "top";
  for (const l of lines) { y += l.gap || 0; g.font = l.f; g.fillStyle = l.color; g.fillText(l.t, W / 2, y); y += lineH(l.f); }
  g.font = font(500, 20); g.fillStyle = "#8A91A0";
  g.fillText("Quét bằng ứng dụng ngân hàng · VietQR · Napas 247", W / 2, H - pad / 2 - 34);
  return c;
}
function wrapText(g, text, font, max) {
  g.font = font;
  const words = text.split(" "), out = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
