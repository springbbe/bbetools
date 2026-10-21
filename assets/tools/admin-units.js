/* Tra đơn vị hành chính mới sau sáp nhập 2025: xã/phường cũ → mới, xã/phường mới gồm những đơn vị cũ nào */
import { h, icon, copyText, debounce } from "../core.js";
import { formTool } from "../frames/form.js";
import { loadData, alert, note } from "../calc.js";
import { buildIndex, searchOld, searchNew } from "../lib/dvhc.js";

const D = await loadData("don-vi-hanh-chinh");
const I = buildIndex(D);
const provName = (p) => (p.type === "Thành phố" ? "Thành phố " : "Tỉnh ") + p.name;
const wardFull = (w) => `${w.type} ${w.name}, ${provName(w.provObj)}`;
const oldFull = (o) => [`${o.type} ${o.name}`, o.dist && `${o.dist.type} ${o.dist.name}`, o.prov && provName(o.prov)].filter(Boolean).join(", ");

const LIMIT = 20;
let shown = LIMIT;
let API = null;

formTool({
  fields: [
    { id: "q", type: "text", label: "Tên xã, phường (cũ hoặc mới)", value: "", placeholder: "Ví dụ: Bến Nghé, Quận 1 hoặc p5 q3 hcm", attrs: { autocomplete: "off", spellcheck: "false", maxlength: 120 },
      hint: "Gõ có dấu hay không dấu đều được; thêm tên quận/huyện, tỉnh cũ để thu hẹp kết quả." },
    { id: "p", type: "select", label: "Tỉnh, thành phố (mới)", value: "", choices: [["", "Tất cả 34 tỉnh, thành"], ...D.provinces.map(([c, n, t]) => [c, (t ? "TP. " : "") + n]).sort((a, b) => a[1].localeCompare(b[1], "vi"))] }
  ],
  init(api) {
    API = api;
    // gõ nhanh không bị giật: chỉ tính lại sau khi ngừng gõ một chút
    const inp = api.ctrls.q.el.querySelector("input");
    const later = debounce(() => api.update(), 180);
    inp.addEventListener("input", (e) => { e.stopPropagation(); shown = LIMIT; later(); });
  },
  compute(v, out) {
    out.textContent = "";
    const q = (v.q || "").trim();
    if (q.length < 2) {
      out.append(alert("info", `Từ 01/7/2025 cả nước còn ${D.counts.provinces} tỉnh, thành và ${D.counts.wards.toLocaleString("vi-VN")} xã, phường, đặc khu; bỏ cấp quận, huyện. Nhập tên xã, phường cũ để biết nay thuộc đơn vị nào, hoặc tên mới để xem gồm những đơn vị cũ nào.`));
      out.append(note(`Dữ liệu gồm ${D.counts.oldWards.toLocaleString("vi-VN")} xã, phường cũ của 63 tỉnh; ${D.counts.splitOldWards} đơn vị cũ bị chia cho nhiều xã mới.`));
      return;
    }
    const olds = searchOld(I, q, { prov: v.p, limit: 200 });
    const news = searchNew(I, q, { prov: v.p, limit: 50 });
    if (!olds.length && !news.length) { out.append(alert("warn", "Không tìm thấy. Thử bớt từ, bỏ chữ “phường/xã”, hoặc kiểm tra chính tả.")); return; }

    if (news.length) {
      out.append(h("p", { class: "opt-title", text: `Xã, phường mới khớp “${q}” (${news.length})` }));
      const list = h("div", { class: "dv-list" });
      for (const w of news.slice(0, 8)) {
        const main = w.origins.filter((x) => x.main), part = w.origins.filter((x) => !x.main);
        list.append(h("div", { class: "dv-item" },
          h("div", { class: "dv-head" }, h("b", { text: wardFull(w) }), copyBtn(wardFull(w))),
          h("small", { class: "muted", text: `Mã ${w.code}${w.postal ? " · mã bưu chính " + w.postal : ""}` }),
          w.origins.length ? h("p", { class: "dv-from" }, "Gồm: ", main.map((x) => `${x.old.type} ${x.old.name} (${x.old.dist ? x.old.dist.type + " " + x.old.dist.name : ""})`).join("; "),
            part.length ? h("span", { class: "muted", text: `; một phần của ${part.map((x) => `${x.old.type} ${x.old.name} (${x.old.dist ? x.old.dist.type + " " + x.old.dist.name : ""})`).join("; ")}` }) : null) : null));
      }
      out.append(list);
    }
    if (olds.length) {
      out.append(h("p", { class: "opt-title", text: `Xã, phường cũ (trước 01/7/2025) khớp “${q}” (${olds.length >= 200 ? "200+" : olds.length})` }));
      const list = h("div", { class: "dv-list" });
      for (const o of olds.slice(0, shown)) {
        const targets = o.to.map((c) => I.ward.get(c));
        list.append(h("div", { class: "dv-item" },
          h("div", { class: "muted small", text: oldFull(o) }),
          ...targets.map((w, i) => h("div", { class: "dv-head" }, h("span", { html: icon("arrow-right") }), h("b", { text: wardFull(w) }), i === 0 && o.split ? h("small", { class: "muted", text: "(phần lớn, có trụ sở cũ)" }) : i ? h("small", { class: "muted", text: "(một phần)" }) : null, copyBtn(wardFull(w)))),
          o.split ? h("small", { class: "warn-text", text: "Đơn vị này bị chia cho nhiều xã, phường mới: địa chỉ mới phụ thuộc vị trí nhà bạn." }) : null));
      }
      out.append(list);
      if (olds.length > shown) out.append(h("button", { class: "btn ghost sm", type: "button", text: `Xem thêm (${olds.length - shown} kết quả)`, onclick: () => { shown += 40; API.update(); } }));
    }
    out.append(note("Địa chỉ mới ghi theo dạng: số nhà, đường, xã/phường, tỉnh/thành phố (không còn quận, huyện). Với giấy tờ quan trọng, hãy đối chiếu thêm với Nghị quyết của Uỷ ban Thường vụ Quốc hội hoặc UBND xã, phường."));
  }
});

function copyBtn(text) {
  return h("button", { class: "ib sm", type: "button", title: "Sao chép", "aria-label": "Sao chép " + text, html: icon("copy"), onclick: () => copyText(text) });
}

const st = document.createElement("style");
st.textContent = `.dv-list{display:flex;flex-direction:column;gap:8px}.dv-item{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);display:flex;flex-direction:column;gap:4px}
.dv-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.dv-head .i{width:16px;height:16px;color:var(--brand)}.dv-head .ib{margin-left:auto}.dv-from{margin:0;font-size:14px}.warn-text{color:var(--warn);font-size:13px}`;
document.head.append(st);
