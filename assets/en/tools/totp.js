/* Tự sinh bởi scripts/build.js từ assets/tools/totp.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo mã 2FA (TOTP, RFC 6238) từ khoá bí mật Base32 hoặc link otpauth:// (đọc được cả từ ảnh QR), như Google Authenticator.
   Khoá bí mật không lưu, không đưa lên URL. Có thể tạo khoá mới + mã QR để thử khi lập trình đăng nhập 2 bước. */
import { h, icon, lib, copyText, passwordField, toast } from "../core.js";
import { formTool } from "../frames/form.js";
import { base32Decode, base32Encode, groupSecret, totp, totpCounter, totpRemaining, parseOtpauth, buildOtpauth } from "../lib/totp.js";
import { qrMatrix, drawQR } from "../qr.js";
import { alert } from "../calc.js";

let sec, cur = null, els = null, api;

async function fromImage(file) {
  try {
    const z = await lib("zxing");
    const res = (await z.readBarcodes(file, { tryHarder: true, maxNumberOfSymbols: 4 })).filter((r) => r.text);
    const hit = res.find((r) => /^otpauth:/i.test(r.text));
    if (!hit) { toast(res.length ? "This QR code isn't a 2FA code (otpauth://)." : "No QR code found in the image.", { type: "err" }); return; }
    applyUri(hit.text);
    toast("Key read from the QR code");
  } catch (e) { toast(e.userMsg || "Couldn't read the image.", { type: "err" }); }
}
function applyUri(uri) {
  const p = parseOtpauth(uri);
  if (!p) return false;
  if (p.type === "hotp") toast("This is a HOTP (counter-based) code; this tool only supports time-based TOTP.", { type: "err" });
  sec.input.value = p.secret;
  api.ctrls.issuer.set(p.issuer); api.ctrls.account.set(p.account);
  api.ctrls.digits.set(String(p.digits)); api.ctrls.period.set(String(p.period)); api.ctrls.algo.set(p.algo);
  api.update();
  return true;
}

api = formTool({
  share: false,
  fields: [
    {
      id: "secret", type: "custom", url: false,
      render() {
        sec = passwordField({ id: "f-secret", placeholder: "E.g. JBSW Y3DP EHPK 3PXP or otpauth://…", "aria-label": "Secret key", autocomplete: "off", autocapitalize: "characters" });
        sec.input.classList.add("mono");
        sec.input.addEventListener("input", () => { if (/^otpauth:/i.test(sec.input.value.trim())) applyUri(sec.input.value.trim()); });
        const pick = h("input", { type: "file", accept: "image/*", hidden: true, onchange: () => { if (pick.files[0]) fromImage(pick.files[0]); pick.value = ""; } });
        return {
          el: h("div", { class: "field" }, h("label", { for: "f-secret", text: "Secret key (Base32) or otpauth:// link" }), sec.el,
            h("div", { class: "row", style: { gap: "8px" } },
              h("button", { class: "btn ghost sm", type: "button", onclick: () => pick.click() }, h("span", { html: icon("scan-line"), style: { display: "contents" } }), "Read from QR image"),
              h("button", { class: "btn ghost sm", type: "button", onclick: () => { sec.input.value = groupSecret(base32Encode(crypto.getRandomValues(new Uint8Array(20)))); if (sec.input.type === "password") sec.el.querySelector(".ib").click(); api.update(); } }, h("span", { html: icon("sparkles"), style: { display: "contents" } }), "Generate a new key"),
              pick),
            h("small", { text: "The key isn't saved or sent; closing the page discards it. Spaces and letter case don't matter." })),
          get: () => sec.input.value, set: (v) => { sec.input.value = v; }
        };
      }
    },
    { id: "issuer", type: "text", label: "Service name (optional)", placeholder: "VD: GitHub", url: false },
    { id: "account", type: "text", label: "Account (optional)", placeholder: "VD: ban@email.com", url: false },
    { id: "digits", type: "seg", label: "Digits", value: "6", choices: [["6", "6 digits"], ["8", "8 digits"]] },
    { id: "period", type: "select", label: "Period", value: "30", choices: [["30", "30 seconds (common)"], ["60", "60 seconds"]] },
    { id: "algo", type: "select", label: "Algorithm", value: "SHA1", choices: [["SHA1", "SHA-1 (common)"], ["SHA256", "SHA-256"], ["SHA512", "SHA-512"]] }
  ],
  init(a) { api = a; setInterval(tick, 500); document.addEventListener("visibilitychange", tick); },
  compute(v, out) {
    out.textContent = "";
    els = null; cur = null;
    const raw = v.secret.trim();
    if (!raw) { out.append(h("p", { class: "hint", text: "Paste the secret key the website shows when you turn on 2-step verification (usually under the QR code, “Can't scan the code?”), or read it from a photo of the QR code." })); return; }
    if (/^otpauth:/i.test(raw)) return;
    const key = base32Decode(raw);
    if (!key || key.length < 5) { out.append(alert("err", "Invalid key: only letters A–Z and digits 2–7 (Base32), usually 16 or 32 characters long.")); return; }
    cur = { key, o: { digits: +v.digits, period: +v.period, algo: v.algo }, counter: -1 };
    const code = h("output", { class: "otp-code", "aria-live": "polite", text: "······" });
    const bar = h("span");
    const left = h("span", { class: "otp-left" });
    const next = h("code");
    els = { code, bar, left, next };
    out.append(
      v.issuer || v.account ? h("p", { class: "otp-who", text: [v.issuer, v.account].filter(Boolean).join(" · ") }) : "",
      h("div", { class: "otp-box" }, code,
        h("button", { class: "btn", type: "button", onclick: () => cur && cur.now && copyText(cur.now, "Code copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy")),
      h("div", { class: "otp-bar", role: "presentation" }, bar),
      h("p", { class: "hint" }, left, " · Next code: ", next),
      key.length < 10 ? alert("warn", "The key is shorter than 80 bits — real services usually use 160-bit keys (32 Base32 characters).") : "",
      qrBlock(v));
    tick();
  }
});

function qrBlock(v) {
  const box = h("div", { class: "otp-qr", hidden: true });
  const btn = h("button", { class: "btn ghost sm", type: "button", onclick: async () => {
    if (!box.hidden) { box.hidden = true; return; }
    const uri = buildOtpauth({ secret: base32Encode(cur.key), issuer: v.issuer, account: v.account, digits: +v.digits, period: +v.period, algo: v.algo });
    const c = h("canvas", { "aria-label": "QR code containing the 2FA key" });
    drawQR(c, await qrMatrix(uri), { px: 220 });
    box.textContent = "";
    box.append(c, h("div", null, h("p", { class: "hint", text: "Scan with Google Authenticator, Microsoft Authenticator, Authy… to add the account to your phone." }),
      h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(uri, "otpauth link copied") }, h("span", { html: icon("link"), style: { display: "contents" } }), "Copy otpauth link"),
      h("p", { class: "hint", text: "Anyone with this QR code can generate your login codes — don't send screenshots of it to anyone." })));
    box.hidden = false;
  } }, h("span", { html: icon("scan-line"), style: { display: "contents" } }), "QR code to add to an authenticator app");
  return h("div", { style: { marginTop: "14px" } }, btn, box);
}

let busy = false;
async function tick() {
  if (!cur || !els || busy) return;
  const now = Date.now(), p = cur.o.period, c = totpCounter(now, p);
  const rem = totpRemaining(now, p);
  els.bar.style.width = (rem / p) * 100 + "%";
  els.bar.parentNode.classList.toggle("low", rem <= 5);
  els.left.textContent = `${Math.ceil(rem)} ${(Math.ceil(rem)) == 1 ? "second" : "seconds"} left`;
  if (c === cur.counter) return;
  busy = true;
  try {
    const mine = cur;
    const [a, b] = await Promise.all([totp(mine.key, now, mine.o), totp(mine.key, now + p * 1000, mine.o)]);
    if (mine !== cur) return;
    cur.counter = c; cur.now = a;
    const fmt = (s) => (s.length === 6 ? s.slice(0, 3) + " " + s.slice(3) : s.slice(0, 4) + " " + s.slice(4));
    els.code.textContent = fmt(a);
    els.next.textContent = fmt(b);
  } finally { busy = false; }
}

const css = document.createElement("style");
css.textContent = `.otp-who{font-weight:700;margin:0 0 8px}
.otp-box{display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
.otp-code{font:800 clamp(34px,11vw,52px)/1 var(--mono);letter-spacing:.04em;font-variant-numeric:tabular-nums}
.otp-bar{height:6px;border-radius:3px;background:var(--line);margin:10px 0 6px;overflow:hidden}.otp-bar span{display:block;height:100%;background:var(--ok);transition:width .5s linear}
.otp-bar.low span{background:var(--err)}
.otp-qr{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;margin-top:12px}.otp-qr canvas{width:220px;height:220px;border-radius:10px;border:1px solid var(--line)}.otp-qr>div{flex:1;min-width:200px}`;
document.head.append(css);
