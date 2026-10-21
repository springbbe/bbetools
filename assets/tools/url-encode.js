/* Mã hoá URL: percent-encoding / giải mã, và tách địa chỉ thành các phần + bảng tham số query */
import { h, copyText } from "../core.js";
import { textTool } from "../frames/text.js";
import { urlEncode, urlDecode, parseUrl } from "../lib/encode.js";
import { table } from "../calc.js";

textTool({
  mono: true,
  inputLabel: "Đầu vào",
  outputLabel: "Kết quả",
  placeholder: "Gõ văn bản/URL cần mã hoá, hoặc dán URL có %XX để giải mã…",
  sample: (o) => (o.mode === "encode" ? "Hà Nội & Sài Gòn: 100% miễn phí?" : "https://shop.vn/tim-kiem?q=%C3%A1o%20d%C3%A0i%20%C4%91%E1%BB%8F&gia=100000-500000&trang=2#ket-qua"),
  options: [
    { id: "mode", label: "Chiều", value: "decode", choices: [["encode", "Mã hoá"], ["decode", "Giải mã"]] },
    { id: "kind", label: "Kiểu", value: "component", choices: [["component", "Một tham số (encodeURIComponent)"], ["uri", "Cả URL (giữ : / ? & =)"], ["form", "Form (dấu cách → +)"]], show: (o) => o.mode === "encode" },
    { id: "plus", type: "check", label: "Đổi + thành dấu cách", value: true, show: (o) => o.mode === "decode" },
    { id: "lines", type: "check", label: "Xử lý từng dòng", value: false }
  ],
  swap: "mode",
  output: "custom",
  copyable: true,
  transform(text, o) {
    if (!text) return { text: "" };
    const one = (s) => (o.mode === "encode" ? urlEncode(s, o.kind) : urlDecode(s, { plus: o.plus }));
    const res = o.lines ? text.split("\n").map(one).join("\n") : one(text);
    return { text: res, url: o.mode === "decode" && !o.lines ? parseUrl(text.trim()) : null };
  },
  render(out, r) {
    out.textContent = "";
    out.classList.add("mono");
    if (!r.text) return;
    out.append(h("div", { class: "url-res", text: r.text }));
    const u = r.url;
    if (!u || !/^https?:|^ftp:/.test(u.protocol)) return;
    const parts = [["Giao thức", u.protocol.replace(":", "")], ["Tên miền", u.host], u.port ? ["Cổng", u.port] : null, u.username ? ["Người dùng", u.username] : null, ["Đường dẫn", u.path], u.hash ? ["Neo (#)", u.hash.slice(1)] : null].filter(Boolean);
    out.append(h("div", { class: "url-parts" },
      h("p", { class: "opt-title", text: "Các phần của URL" }),
      table(["Phần", "Giá trị"], parts.map(([k, v]) => [k, h("span", { class: "wrap", text: v })]), { cls: ["l", "l wrap"] }),
      u.params.length ? h("p", { class: "opt-title", text: `Tham số query (${u.params.length})` }) : null,
      u.params.length ? table(["Tên", "Giá trị (đã giải mã)", ""], u.params.map(([k, v]) => [k, h("span", { class: "wrap", text: v }), h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(v) }, "Chép")]), { cls: ["l", "l wrap", ""] }) : null));
  }
});
