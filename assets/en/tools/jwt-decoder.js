/* Tự sinh bởi scripts/build.js từ assets/tools/jwt-decoder.js và i18n/en/js/ — đừng sửa tay. */
/* Giải mã JWT: xem header, payload (tô màu), thời hạn exp/iat/nbf theo giờ Việt Nam;
   kiểm tra chữ ký HS256/384/512 bằng khoá bí mật, RS/PS/ES/EdDSA bằng khoá công khai (Web Crypto, không gửi đi đâu). */
import { h, copyText, icon } from "../core.js";
import { textTool } from "../frames/text.js";
import { decodeJwt, jwtTimes, verifyJwt } from "../lib/encode.js";
import { highlight } from "../lib/json-tools.js";
import { formatVN, relative } from "../lib/timestamp.js";

// mẫu: HS256, khoá bí mật "bbetools-bi-mat", hết hạn 01/01/2030
const SAMPLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJOVjAwMSIsIm5hbWUiOiJOZ3V54buFbiBWxINuIEFuIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYwNTAwMDAwLCJleHAiOjE4OTM0NTYwMDB9.mm81uBZSe7PXSPiDk6Z171BzLTXROx6QPylY4OTta98";
const CLAIMS = { iss: "Issuer", sub: "Subject (user)", aud: "Audience", exp: "Expires", nbf: "Not before", iat: "Issued at", jti: "Token ID", name: "Name", email: "Email", role: "Role", scope: "Scope" };

const block = (title, obj, extra) => {
  const json = JSON.stringify(obj, null, 2);
  return h("section", { class: "jwt-part" },
    h("div", { class: "jwt-head" }, h("p", { class: "opt-title", text: title }), extra,
      h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(json) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy")),
    h("pre", { class: "jwt-json mono", html: highlight(json) }));
};

textTool({
  mono: true,
  inputLabel: "JWT",
  outputLabel: "Content",
  placeholder: "Paste a JWT (eyJhbGciOi…), with or without “Bearer”",
  sample: (o) => { o.key = "bbetools-bi-mat"; return SAMPLE; },
  output: "custom",
  options: [
    { id: "key", type: "text", label: "Key to verify the signature", placeholder: "Secret (HS256) or a PEM/JWK public key (RS256, ES256…)", wide: true, mono: true, persist: false },
    { id: "b64", type: "check", label: "Secret is Base64-encoded", value: false }
  ],
  async transform(text, o) {
    if (!text.trim()) return { text: "" };
    const jwt = decodeJwt(text);
    let verify = null;
    if (o.key.trim()) { try { verify = { ok: await verifyJwt(jwt, o.key, { base64Secret: o.b64 }) }; } catch (e) { verify = { error: e.message }; } }
    return { text: JSON.stringify(jwt.payload, null, 2), jwt, verify };
  },
  render(out, r) {
    out.textContent = "";
    out.classList.remove("out");
    out.classList.add("jwt-out");
    if (!r.jwt) return;
    const { header, payload } = r.jwt;
    const now = Date.now(), t = jwtTimes(payload, now);
    // trạng thái
    const status = [];
    if (t.expired) status.push(h("p", { class: "alert err", html: icon("triangle-alert") + `<span>The token expired ${relative(t.exp.getTime(), now)}.</span>` }));
    else if (t.notYet) status.push(h("p", { class: "alert warn", html: icon("triangle-alert") + `<span>The token isn't valid yet (from ${formatVN(t.nbf.getTime())}).</span>` }));
    else if (t.exp) status.push(h("p", { class: "alert ok", html: icon("circle-check") + `<span>Valid, expires ${relative(t.exp.getTime(), now)}.</span>` }));
    if (r.verify) {
      if (r.verify.error) status.push(h("p", { class: "alert warn", html: icon("triangle-alert") + "<span></span>" }));
      else status.push(h("p", { class: "alert " + (r.verify.ok ? "ok" : "err"), html: icon(r.verify.ok ? "shield-check" : "triangle-alert") + `<span>${r.verify.ok ? "Valid signature: the token was issued by whoever holds this key and hasn't been altered." : "Signature does NOT match: wrong key, or the token was altered."}</span>` }));
      if (r.verify.error) status[status.length - 1].lastChild.textContent = r.verify.error;
    } else status.push(h("p", { class: "hint", text: `Algorithm ${header.alg || "?"}. Enter the key above to verify the signature.` }));
    // bảng thời gian và claim quen thuộc
    const rows = Object.entries(payload).filter(([k]) => CLAIMS[k]).map(([k, v]) => {
      const isTime = ["exp", "nbf", "iat"].includes(k) && typeof v === "number";
      return h("tr", null, h("th", { scope: "row", class: "l" }, h("code", { text: k }), " ", CLAIMS[k]),
        h("td", { class: "l wrap" }, isTime ? `${formatVN(v * 1000)} (${relative(v * 1000, now)})` : typeof v === "object" ? JSON.stringify(v) : String(v)));
    });
    out.append(...status,
      rows.length ? h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" }, h("tbody", null, rows))) : "",
      block("Header", header, h("span", { class: "badge", text: header.alg || "?" })),
      block("Payload", payload),
      h("p", { class: "hint", text: "A JWT is only Base64-encoded; anyone with the token can read the payload. Don't put passwords or sensitive data in a JWT." }));
  }
});
