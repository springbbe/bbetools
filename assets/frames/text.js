/* Khung 2: văn bản vào → văn bản ra. Hai ô, xử lý ngay khi gõ, nút dán / xoá / mẫu / sao chép / tải về.

   textTool({
     inputLabel, outputLabel, placeholder, sample: "văn bản mẫu", mono: false,
     options: [{ id, type: "select"|"check", label, choices: [[value, label]], value }],   // lưu trong localStorage
     transform: (text, opts) => string | { text, error, html, node },
     output: "text" | "custom",            // custom: render(outEl, result) tự vẽ (vd. bảng thống kê)
     render: (outEl, result, text, opts) => {},
     download: { name: "ket-qua.txt", type: "text/plain" },
     single: false                          // chỉ một ô nhập, kết quả hiện bên dưới
   }) */
import { $, h, icon, store, copyText, save, debounce, TOOL_ID, toast } from "../core.js";

export function textTool(cfg) {
  const app = $("#app");
  app.textContent = "";
  const key = "tx:" + TOOL_ID;
  const saved = store.get(key, {});
  const opts = Object.assign({}, Object.fromEntries((cfg.options || []).map((o) => [o.id, o.value])), saved.opts || {});

  /* tuỳ chọn */
  let optBar = null;
  if (cfg.options && cfg.options.length) {
    optBar = h("div", { class: "tx-opts" });
    for (const o of cfg.options) {
      if (o.type === "check") {
        optBar.append(h("label", { class: "switch" }, h("input", { type: "checkbox", checked: !!opts[o.id], onchange: (e) => { opts[o.id] = e.target.checked; changed(); } }), h("span", { text: o.label })));
      } else {
        const sel = h("select", { "aria-label": o.label, onchange: (e) => { opts[o.id] = e.target.value; changed(); } }, o.choices.map(([v, l]) => h("option", { value: v, selected: String(v) === String(opts[o.id]), text: l })));
        optBar.append(h("label", { class: "field" }, h("span", { text: o.label }), sel));
      }
    }
  }

  /* ô nhập */
  const ta = h("textarea", { class: cfg.mono ? "mono" : null, placeholder: cfg.placeholder || "Gõ hoặc dán văn bản vào đây…", spellcheck: cfg.mono ? "false" : "true", "aria-label": cfg.inputLabel || "Văn bản đầu vào", autocapitalize: "off" });
  const inCount = h("span", { class: "cnt", "aria-hidden": "true" });
  const remember = h("input", { type: "checkbox", checked: !!saved.remember });
  const inPane = h("div", { class: "pane" },
    h("div", { class: "pane-head" },
      h("label", { class: "lbl", text: cfg.inputLabel || "Văn bản" }),
      inCount,
      navigator.clipboard && navigator.clipboard.readText ? h("button", { class: "btn ghost sm", type: "button", onclick: pasteIn, title: "Dán từ clipboard" }, h("span", { html: icon("clipboard-paste"), style: { display: "contents" } }), "Dán") : null,
      cfg.sample ? h("button", { class: "btn ghost sm", type: "button", onclick: () => { ta.value = cfg.sample; changed(); ta.focus(); } }, "Mẫu") : null,
      h("button", { class: "ib sm", type: "button", "aria-label": "Xoá hết", title: "Xoá hết", html: icon("trash-2"), onclick: () => { ta.value = ""; changed(); ta.focus(); } })),
    ta,
    h("label", { class: "switch", style: { padding: "0 16px 14px", fontSize: "13.5px" } }, remember, h("span", null, "Nhớ văn bản trên máy này", h("small", { text: "Lưu trong trình duyệt của bạn, không gửi đi đâu" }))));
  inPane.querySelector(".lbl").htmlFor = ta.id = "tx-in";

  /* ô kết quả */
  const out = h("div", { class: "out" + (cfg.mono ? " mono" : ""), "data-placeholder": cfg.outputPlaceholder || "Kết quả hiện ở đây…", "aria-live": "polite", tabindex: "0", role: "region", "aria-label": cfg.outputLabel || "Kết quả" });
  const errBox = h("div", { class: "tx-error alert err", hidden: true });
  let last = { text: "" };
  const outPane = h("div", { class: "pane" },
    h("div", { class: "pane-head" },
      h("span", { class: "lbl", text: cfg.outputLabel || "Kết quả" }),
      cfg.output !== "custom" || cfg.copyable ? h("button", { class: "btn sm", type: "button", onclick: () => last.text ? copyText(last.text) : toast("Chưa có kết quả để sao chép") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép") : null,
      cfg.download ? h("button", { class: "ib sm", type: "button", "aria-label": "Tải về file", title: "Tải về", html: icon("download"), onclick: () => last.text && save(new Blob([last.text], { type: (cfg.download.type || "text/plain") + ";charset=utf-8" }), cfg.download.name) }) : null),
    errBox, out);

  const panes = h("div", { class: "tx-panes" + (cfg.single ? "" : " two") }, inPane, outPane);
  app.append(...[optBar, panes].filter(Boolean));
  if (cfg.after) cfg.after(app);

  function compute() {
    const text = ta.value;
    inCount.textContent = text.length ? text.length.toLocaleString("vi-VN") + " ký tự" : "";
    let r;
    try { r = cfg.transform(text, opts); } catch (e) { r = { text: "", error: e.message }; }
    if (typeof r === "string") r = { text: r };
    last = r || { text: "" };
    errBox.hidden = !last.error;
    if (last.error) { errBox.innerHTML = icon("triangle-alert") + "<span></span>"; errBox.lastChild.textContent = last.error; }
    if (cfg.output === "custom") { cfg.render(out, last, text, opts); return; }
    if (last.node) { out.textContent = ""; out.append(last.node); }
    else if (last.html != null) out.innerHTML = last.html;
    else out.textContent = last.text || "";
  }
  const persist = debounce(() => store.set(key, { opts, remember: remember.checked, text: remember.checked ? ta.value.slice(0, 200000) : undefined }), 400);
  function changed() { compute(); persist(); }
  async function pasteIn() {
    try { ta.value = await navigator.clipboard.readText(); changed(); ta.focus(); }
    catch (_) { toast("Trình duyệt chưa cho đọc clipboard. Hãy bấm vào ô rồi nhấn Ctrl/⌘ + V."); ta.focus(); }
  }
  ta.addEventListener("input", changed);
  remember.addEventListener("change", persist);
  if (saved.remember && saved.text) ta.value = saved.text;
  const q = new URLSearchParams(location.search).get("text");
  if (q) ta.value = q;
  compute();
  return { ta, out, opts, compute };
}
