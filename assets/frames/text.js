/* Khung 2: văn bản vào → văn bản ra. Hai ô, xử lý ngay khi gõ, nút dán / xoá / mẫu / sao chép / tải về.

   textTool({
     inputLabel, outputLabel, placeholder, sample: "văn bản mẫu", mono: false,
     options: [{ id, type: "select"|"check"|"text"|"password", label, choices: [[value, label]], value,
                 placeholder, wide, mono, persist: true (false: không lưu vào localStorage), show: (opts) => bool }],
     transform: (text, opts) => string | { text, error, html, node, info } | Promise<…>,   // info: dòng ghi chú trên ô kết quả
     output: "text" | "custom",            // custom: render(outEl, result) tự vẽ (vd. bảng thống kê)
     render: (outEl, result, text, opts) => {},
     download: { name: "ket-qua.txt", type: "text/plain" },   // name có thể là hàm (opts) => tên file
     single: false,                         // chỉ một ô nhập, kết quả hiện bên dưới
     swap: "mode",                          // id tuỳ chọn hai chiều (select 2 lựa chọn): nút "Đổi chiều" đưa kết quả lên ô nhập
     initial: () => "văn bản ban đầu khi ô trống",
     inputActions: [el], outputActions: [el]   // nút thêm vào đầu ô nhập / ô kết quả
   }) */
import { $, h, icon, store, copyText, save, debounce, TOOL_ID, toast } from "../core.js";

export function textTool(cfg) {
  const app = $("#app");
  app.textContent = "";
  const key = "tx:" + TOOL_ID;
  const saved = store.get(key, {});
  const optDefs = cfg.options || [];
  const savedOpts = Object.fromEntries(Object.entries(saved.opts || {}).filter(([k]) => { const o = optDefs.find((d) => d.id === k); return o && o.persist !== false; }));
  const opts = Object.assign({}, Object.fromEntries(optDefs.map((o) => [o.id, o.value ?? (o.type === "check" ? false : "")])), savedOpts);
  const optEls = {};

  /* tuỳ chọn */
  let optBar = null;
  if (optDefs.length) {
    optBar = h("div", { class: "tx-opts" });
    for (const o of optDefs) {
      let el;
      if (o.type === "check") {
        el = h("label", { class: "switch" }, h("input", { type: "checkbox", checked: !!opts[o.id], onchange: (e) => { opts[o.id] = e.target.checked; changed(); } }), h("span", { text: o.label }));
      } else if (o.type === "text" || o.type === "password") {
        const id = "tx-o-" + o.id;
        const inp = h("input", { id, type: o.type, value: opts[o.id], placeholder: o.placeholder || "", class: o.mono ? "mono" : null, autocomplete: o.type === "password" ? "new-password" : "off", autocapitalize: "off", spellcheck: "false", oninput: (e) => { opts[o.id] = e.target.value; changed(); } });
        el = h("label", { class: "field tx-text" + (o.wide ? " wide" : ""), for: id }, h("span", { text: o.label }), inp);
      } else {
        const sel = h("select", { "aria-label": o.label, onchange: (e) => { opts[o.id] = e.target.value; changed(); } }, o.choices.map(([v, l]) => h("option", { value: v, selected: String(v) === String(opts[o.id]), text: l })));
        el = h("label", { class: "field" }, h("span", { text: o.label }), sel);
      }
      optEls[o.id] = el;
      optBar.append(el);
    }
  }
  function syncOpts() {
    for (const o of optDefs) {
      const el = optEls[o.id], inp = el.querySelector("input, select");
      if (o.type === "check") inp.checked = !!opts[o.id]; else if (inp.value !== String(opts[o.id])) inp.value = opts[o.id];
      if (o.show) el.hidden = !o.show(opts);
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
      ...(cfg.inputActions || []),
      navigator.clipboard && navigator.clipboard.readText ? h("button", { class: "btn ghost sm", type: "button", onclick: pasteIn, title: "Dán từ clipboard" }, h("span", { html: icon("clipboard-paste"), style: { display: "contents" } }), "Dán") : null,
      cfg.sample ? h("button", { class: "btn ghost sm", type: "button", onclick: () => { ta.value = typeof cfg.sample === "function" ? cfg.sample(opts) : cfg.sample; changed(); ta.focus(); } }, "Mẫu") : null,
      h("button", { class: "ib sm", type: "button", "aria-label": "Xoá hết", title: "Xoá hết", html: icon("trash-2"), onclick: () => { ta.value = ""; changed(); ta.focus(); } })),
    ta,
    h("label", { class: "switch", style: { padding: "0 16px 14px", fontSize: "13.5px" } }, remember, h("span", null, "Nhớ văn bản trên máy này", h("small", { text: "Lưu trong trình duyệt của bạn, không gửi đi đâu" }))));
  inPane.querySelector(".lbl").htmlFor = ta.id = "tx-in";

  /* ô kết quả */
  const out = h("div", { class: "out" + (cfg.mono ? " mono" : ""), "data-placeholder": cfg.outputPlaceholder || "Kết quả hiện ở đây…", "aria-live": "polite", tabindex: "0", role: "region", "aria-label": cfg.outputLabel || "Kết quả" });
  const errBox = h("div", { class: "tx-error alert err", hidden: true });
  const info = h("p", { class: "tx-info", hidden: true });
  let last = { text: "" };
  const swapOpt = cfg.swap && optDefs.find((o) => o.id === cfg.swap);
  const outPane = h("div", { class: "pane" },
    h("div", { class: "pane-head" },
      h("span", { class: "lbl", text: cfg.outputLabel || "Kết quả" }),
      ...(cfg.outputActions || []),
      swapOpt ? h("button", { class: "btn ghost sm", type: "button", title: "Đưa kết quả lên ô nhập và đổi chiều", onclick: swap }, h("span", { html: icon("arrow-left-right"), style: { display: "contents" } }), "Đổi chiều") : null,
      cfg.output !== "custom" || cfg.copyable ? h("button", { class: "btn sm", type: "button", onclick: () => last.text ? copyText(last.text) : toast("Chưa có kết quả để sao chép") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép") : null,
      cfg.download ? h("button", { class: "ib sm", type: "button", "aria-label": "Tải về file", title: "Tải về", html: icon("download"), onclick: () => last.text && save(new Blob([last.text], { type: (cfg.download.type || "text/plain") + ";charset=utf-8" }), typeof cfg.download.name === "function" ? cfg.download.name(opts) : cfg.download.name) }) : null),
    info, errBox, out);

  const panes = h("div", { class: "tx-panes" + (cfg.single ? "" : " two") }, inPane, outPane);
  app.append(...[optBar, panes].filter(Boolean));
  if (cfg.after) cfg.after(app);

  let seq = 0;
  function show(r, text) {
    if (typeof r === "string") r = { text: r };
    last = r || { text: "" };
    errBox.hidden = !last.error;
    if (last.error) { errBox.innerHTML = icon("triangle-alert") + "<span></span>"; errBox.lastChild.textContent = last.error; }
    info.hidden = !last.info;
    if (last.info) { info.textContent = ""; info.append(last.info); }
    if (cfg.output === "custom") { cfg.render(out, last, text, opts); return; }
    if (last.node) { out.textContent = ""; out.append(last.node); }
    else if (last.html != null) out.innerHTML = last.html;
    else out.textContent = last.text || "";
  }
  function compute() {
    const text = ta.value;
    inCount.textContent = text.length ? text.length.toLocaleString("vi-VN") + " ký tự" : "";
    syncOpts();
    const my = ++seq;
    let r;
    try { r = cfg.transform(text, opts); } catch (e) { r = { text: "", error: e.userMsg || e.message }; }
    if (r && typeof r.then === "function") {
      outPane.classList.add("busy");
      r.then((v) => v, (e) => ({ text: "", error: e.userMsg || e.message })).then((v) => { if (my === seq) { outPane.classList.remove("busy"); show(v, text); } });
      return;
    }
    outPane.classList.remove("busy");
    show(r, text);
  }
  const persist = debounce(() => store.set(key, {
    opts: Object.fromEntries(Object.entries(opts).filter(([k]) => { const o = optDefs.find((d) => d.id === k); return o && o.persist !== false; })),
    remember: remember.checked, text: remember.checked ? ta.value.slice(0, 200000) : undefined
  }), 400);
  function changed() { compute(); persist(); }
  function swap() {
    const [a, b] = swapOpt.choices.map((c) => String(c[0]));
    if (last.text) ta.value = last.text;
    opts[swapOpt.id] = String(opts[swapOpt.id]) === a ? b : a;
    changed();
  }
  async function pasteIn() {
    try { ta.value = await navigator.clipboard.readText(); changed(); ta.focus(); }
    catch (_) { toast("Trình duyệt chưa cho đọc clipboard. Hãy bấm vào ô rồi nhấn Ctrl/⌘ + V."); ta.focus(); }
  }
  ta.addEventListener("input", changed);
  remember.addEventListener("change", persist);
  if (saved.remember && saved.text) ta.value = saved.text;
  const q = new URLSearchParams(location.search).get("text");
  if (q) ta.value = q;
  if (!ta.value && cfg.initial) ta.value = cfg.initial();
  compute();
  const api = { ta, out, opts, compute, info, setText(v) { ta.value = v; changed(); }, setOpt(id, v) { opts[id] = v; changed(); }, get result() { return last; } };
  return api;
}
