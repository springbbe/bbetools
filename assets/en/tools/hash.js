/* Tự sinh bởi scripts/build.js từ assets/tools/hash.js và i18n/en/js/ — đừng sửa tay. */
/* Hash MD5/SHA: tính MD5, SHA-1, SHA-256, SHA-384, SHA-512 (và HMAC) của văn bản UTF-8; đối chiếu với mã có sẵn */
import { h, icon, copyText } from "../core.js";
import { textTool } from "../frames/text.js";
import { ALGOS, digest, toHex, utf8 } from "../lib/hash.js";
import { bytesToBase64 } from "../lib/encode.js";

textTool({
  inputLabel: "Text",
  outputLabel: "Hash",
  placeholder: "Type or paste the text to hash…",
  sample: "Hello BbeTools",
  output: "custom",
  options: [
    { id: "fmt", label: "Format", value: "hex", choices: [["hex", "lowercase hex"], ["HEX", "uppercase HEX"], ["b64", "Base64"]] },
    { id: "key", type: "text", label: "HMAC key (optional)", placeholder: "Leave empty = plain hash", wide: true, persist: false },
    { id: "cmp", type: "text", label: "Compare with", placeholder: "Paste the hash to match", wide: true, mono: true, persist: false }
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
      h("button", { class: "ib sm", type: "button", "aria-label": "Copy " + a, title: "Copy", html: icon("copy"), onclick: () => copyText(v, "Copied " + a) }))));
    out.append(h("p", { class: "hint", text: `${r.bytes.toLocaleString("en-US")} byte (UTF-8)${text ? "" : " – empty string"}` }), list);
    if (cmp) out.append(h("p", { class: "alert " + (hit ? "ok" : "err"), html: icon(hit ? "circle-check" : "triangle-alert") + `<span>${hit ? "Matches " + (r.hmac ? "HMAC-" : "") + hit[0] + "." : "Doesn't match any algorithm. Check the text (including spaces and trailing newlines) or the HMAC key."}</span>` }));
    out.append(h("p", { class: "hint", text: "MD5 and SHA-1 are cryptographically broken; only use them to check data integrity. Don't use plain hashes to store passwords." }));
  }
});
