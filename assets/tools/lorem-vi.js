/* Lorem ipsum tiếng Việt: tạo đoạn văn, câu hoặc số từ mẫu có dấu để dàn trang, thử font */
import { h, icon, copyText, save } from "../core.js";
import { formTool } from "../frames/form.js";
import { lorem } from "../lib/lorem.js";

let seed = 1 + Math.floor(Math.random() * 1e6);
formTool({
  share: false,
  fields: [
    { id: "kind", type: "seg", label: "Tạo theo", value: "p", choices: [["p", "Đoạn văn"], ["s", "Câu"], ["w", "Từ"]] },
    { id: "n", type: "number", label: "Số lượng", value: "3", attrs: { min: 1, max: 5000, inputmode: "numeric" } },
    { id: "html", type: "check", label: "Bọc thẻ HTML <p>", value: false }
  ],
  compute(v, out, api) {
    out.textContent = "";
    const n = Math.max(1, Math.min(v.kind === "w" ? 5000 : v.kind === "s" ? 500 : 100, parseInt(v.n, 10) || 1));
    const paras = lorem(v.kind, n, seed);
    const text = v.html ? paras.map((p) => `<p>${p}</p>`).join("\n") : paras.join("\n\n");
    const words = paras.join(" ").split(/\s+/).length;
    out.append(
      h("div", { class: "fm-foot" },
        h("button", { class: "btn sm", type: "button", onclick: () => copyText(text) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép"),
        h("button", { class: "btn ghost sm", type: "button", onclick: () => { seed = 1 + Math.floor(Math.random() * 1e6); api.update(); } }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Tạo đoạn khác"),
        h("button", { class: "ib sm", type: "button", "aria-label": "Tải file .txt", title: "Tải file .txt", html: icon("download"), onclick: () => save(new Blob([text], { type: "text/plain;charset=utf-8" }), "van-ban-mau.txt") })),
      h("p", { class: "hint", text: `${words.toLocaleString("vi-VN")} từ · ${text.length.toLocaleString("vi-VN")} ký tự` }),
      v.html ? h("pre", { class: "lorem-out mono", text }) : h("div", { class: "lorem-out" }, paras.map((p) => h("p", { text: p }))));
  }
});
