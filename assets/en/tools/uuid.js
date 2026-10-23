/* Tự sinh bởi scripts/build.js từ assets/tools/uuid.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo UUID v4 (ngẫu nhiên) và v7 (theo thời gian, sắp xếp được) hàng loạt bằng crypto.getRandomValues; đọc thông tin một UUID */
import { h, icon, copyText, save, LANG } from "../core.js";
import { formTool } from "../frames/form.js";
import { generate, formatUuid, inspectUuid } from "../lib/uuid.js";
import { kv, alert } from "../calc.js";
import { formatVN } from "../lib/timestamp.js";

const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
formTool({
  share: false,
  fields: [
    { id: "ver", type: "seg", label: "Version", value: "v4", choices: [["v4", "v4 – random"], ["v7", "v7 – time-ordered"]] },
    { id: "n", type: "number", label: "Count (1–10,000)", value: "5", attrs: { min: 1, max: 10000, inputmode: "numeric" } },
    { id: "upper", type: "check", label: "UPPERCASE" },
    { id: "hyphens", type: "check", label: "With hyphens", value: true },
    { id: "braces", type: "check", label: "Wrap in { }" },
    { id: "check", type: "text", label: "Inspect a UUID (optional)", placeholder: "Paste a UUID to see its version and creation time", url: false }
  ],
  compute(v, out, api) {
    out.textContent = "";
    const n = Math.max(1, Math.min(10000, parseInt(v.n, 10) || 1));
    const list = generate(n, v.ver, rnd).map((b) => formatUuid(b, { upper: v.upper, hyphens: v.hyphens, braces: v.braces }));
    const text = list.join("\n");
    out.append(
      h("div", { class: "fm-foot" },
        h("button", { class: "btn sm", type: "button", onclick: () => copyText(text, n > 1 ? `Copied ${n} ${(n) == 1 ? "UUID" : "UUIDs"}` : "Copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => api.update() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Generate"),
        h("button", { class: "ib sm", type: "button", "aria-label": "Download .txt file", title: "Download .txt file", html: icon("download"), onclick: () => save(new Blob([text + "\n"], { type: "text/plain" }), "uuid.txt") })),
      h("textarea", { class: "out-text", readonly: true, rows: Math.min(12, n + 1), "aria-label": "UUID list", value: text }));
    if (v.ver === "v7") out.append(h("p", { class: "hint", text: "UUID v7 starts with the creation time (milliseconds), so it sorts in creation order — good for database primary keys." }));
    if (v.check.trim()) {
      const r = inspectUuid(v.check);
      if (!r.ok) out.append(alert("err", "Not a valid UUID (needs 32 hex digits, 8-4-4-4-12 format)."));
      else out.append(h("p", { class: "opt-title", text: "UUID info" }), kv([
        ["Canonical form", r.canonical],
        ["Version", r.variant === "nil" ? "Nil (all zeros)" : r.variant === "max" ? "Max (all F)" : "v" + r.version + ({ 1: " (time + MAC)", 3: " (MD5 of name)", 4: " (random)", 5: " (SHA-1 of name)", 6: " (time, sortable)", 7: " (Unix time, sortable)", 8: " (custom)" }[r.version] || "")],
        r.variant !== "nil" && r.variant !== "max" ? ["Variant", r.variant] : null,
        r.time ? ["Creation time", LANG === "vi" ? formatVN(r.time.getTime(), 420, true) + " (Vietnam time)" : r.time.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC")] : null
      ]));
    }
  }
});
