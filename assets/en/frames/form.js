/* Tự sinh bởi scripts/build.js từ assets/frames/form.js và i18n/en/js/ — đừng sửa tay. */
/* Khung 3: form / máy tính. Nhập số liệu → kết quả cập nhật ngay; trạng thái nằm trên URL (?a=1&b=2) để chia sẻ.

   formTool({
     fields: [{ id, type, label, value, hint, placeholder, choices: [[v, l]], url: true, show: (vals) => bool, attrs }],
       type: text | number | money | select | seg | date | textarea | check | color | custom
       custom: render(ctx) → { el, get(), set(v) }
     compute: (vals, out, ctx) => {},     // vẽ kết quả vào out
     share: true                          // nút "Sao chép link"
   }) */
import { $, h, icon, copyText, debounce, replaceUrl, LANG } from "../core.js";

const GROUP = LANG === "vi" ? "." : ","; // dấu nhóm nghìn của ô tiền

let uid = 0;
export function formTool(cfg) {
  const app = $("#app");
  app.textContent = "";
  const form = h("form", { class: "fm-form", novalidate: true, onsubmit: (e) => e.preventDefault() });
  const out = h("div", { class: "fm-out-in", "aria-live": "polite" });
  const outCol = h("div", { class: "fm-out" }, out);
  app.append(h("div", { class: "fm" }, form, outCol));
  // máy tính: kết quả ngắn hơn màn hình thì dính lại khi cuộn form dài, để luôn thấy kết quả
  if (window.ResizeObserver) {
    const fit = () => out.classList.toggle("stick", out.offsetHeight < window.innerHeight - 110 && form.offsetHeight > out.offsetHeight + 40);
    const ro = new ResizeObserver(fit); ro.observe(out); ro.observe(form);
    window.addEventListener("resize", fit);
  }
  const ctrls = {};
  const defaults = {};
  const params = new URLSearchParams(location.search);
  const api = { form, out, ctrls };

  for (const f of cfg.fields) {
    const id = "f-" + f.id + "-" + (++uid);
    let el, get, set;
    defaults[f.id] = f.value ?? (f.type === "check" ? false : "");
    if (f.type === "custom") {
      const c = f.render(api);
      el = c.el; get = c.get; set = c.set;
    } else if (f.type === "select") {
      const s = h("select", Object.assign({ id }, f.attrs), f.choices.map(([v, l]) => h("option", { value: v, text: l })));
      el = wrap(f, id, s); get = () => s.value; set = (v) => { s.value = v; if (s.selectedIndex < 0) s.selectedIndex = 0; };
    } else if (f.type === "seg") {
      const g = h("div", { class: "seg" + (f.full === false ? "" : " full"), role: "radiogroup", "aria-labelledby": id + "-l" }, f.choices.map(([v, l]) => h("label", null, h("input", { type: "radio", name: id, value: v }), h("span", { html: l }))));
      el = h("div", { class: "field" }, h("span", { id: id + "-l", text: f.label }), g, f.hint ? h("small", { html: f.hint }) : null);
      get = () => { const r = g.querySelector("input:checked"); return r ? r.value : ""; };
      set = (v) => { const r = g.querySelector(`input[value="${CSS.escape(String(v))}"]`) || g.querySelector("input"); r.checked = true; };
    } else if (f.type === "check") {
      const c = h("input", Object.assign({ id, type: "checkbox" }, f.attrs));
      el = h("label", { class: "switch" }, c, h("span", null, f.label, f.hint ? h("small", { html: f.hint }) : null));
      get = () => c.checked; set = (v) => { c.checked = v === true || v === "1" || v === "true"; };
    } else if (f.type === "textarea") {
      const t = h("textarea", Object.assign({ id, placeholder: f.placeholder || "", rows: 3 }, f.attrs));
      el = wrap(f, id, t); get = () => t.value; set = (v) => { t.value = v; };
    } else if (f.type === "money") {
      const i = h("input", Object.assign({ id, type: "text", inputmode: "numeric", autocomplete: "off", placeholder: f.placeholder || "" }, f.attrs));
      const fmt = (d) => (d ? d.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, GROUP) : "");
      i.addEventListener("input", () => {
        const atEnd = i.selectionStart === i.value.length;
        const digitsBefore = i.value.slice(0, i.selectionStart).replace(/\D/g, "").length;
        i.value = fmt(i.value.replace(/\D/g, "").slice(0, 15));
        if (!atEnd) { let k = 0, p = 0; while (p < i.value.length && k < digitsBefore) { if (/\d/.test(i.value[p])) k++; p++; } i.setSelectionRange(p, p); }
      });
      el = wrap(f, id, h("div", { class: "money" }, i, f.suffix ? h("span", { class: "suffix", text: f.suffix }) : null));
      get = () => i.value.replace(/\D/g, ""); set = (v) => { i.value = fmt(String(v || "").replace(/\D/g, "")); };
    } else {
      const i = h("input", Object.assign({ id, type: f.type || "text", placeholder: f.placeholder || "", autocomplete: "off" }, f.type === "number" ? { inputmode: "decimal" } : {}, f.attrs));
      el = wrap(f, id, i); get = () => i.value; set = (v) => { i.value = v; };
    }
    ctrls[f.id] = { f, el, get, set };
    form.append(el);
    const fromUrl = f.url !== false && params.has(f.id) ? params.get(f.id) : null;
    set(fromUrl != null ? fromUrl : defaults[f.id]);
  }
  function wrap(f, id, input) {
    return h("div", { class: "field" }, h("label", { for: id, text: f.label }), input, f.hint ? h("small", { html: f.hint }) : null);
  }

  const foot = h("div", { class: "fm-foot" },
    cfg.share !== false ? h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(location.href, "Link copied — whoever opens it will see exactly these numbers") }, h("span", { html: icon("link"), style: { display: "contents" } }), "Copy link") : null,
    h("button", { class: "btn ghost sm", type: "button", onclick: reset }, h("span", { html: icon("rotate-ccw"), style: { display: "contents" } }), "Reset"));
  form.append(foot);

  function values() { return Object.fromEntries(Object.entries(ctrls).map(([k, c]) => [k, c.get()])); }
  const syncUrl = debounce(() => {
    const p = new URLSearchParams();
    for (const [k, c] of Object.entries(ctrls)) {
      if (c.f.url === false) continue;
      const v = c.get();
      if (String(v) !== String(defaults[k]) && v !== "" && v != null) p.set(k, v === true ? "1" : v === false ? "0" : v);
    }
    const qs = p.toString();
    replaceUrl(location.pathname + (qs ? "?" + qs : "") + location.hash);
  }, 300);
  function update() {
    const v = values();
    for (const c of Object.values(ctrls)) if (c.f.show) c.el.hidden = !c.f.show(v);
    try { cfg.compute(v, out, api); }
    catch (e) { console.error(e); out.textContent = ""; out.append(h("p", { class: "alert err", text: e.userMsg || e.message })); }
    syncUrl();
  }
  function reset() { for (const [k, c] of Object.entries(ctrls)) c.set(defaults[k]); update(); }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  Object.assign(api, { values, update, set: (k, v) => { ctrls[k].set(v); update(); }, get: (k) => ctrls[k].get() });
  if (cfg.init) cfg.init(api);
  update();
  return api;
}
