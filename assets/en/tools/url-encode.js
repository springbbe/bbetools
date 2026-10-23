/* Tự sinh bởi scripts/build.js từ assets/tools/url-encode.js và i18n/en/js/ — đừng sửa tay. */
/* Mã hoá URL: percent-encoding / giải mã, và tách địa chỉ thành các phần + bảng tham số query */
import { h, copyText } from "../core.js";
import { textTool } from "../frames/text.js";
import { urlEncode, urlDecode, parseUrl } from "../lib/encode.js";
import { table } from "../calc.js";

textTool({
  mono: true,
  inputLabel: "Input",
  outputLabel: "Result",
  placeholder: "Type text/a URL to encode, or paste a URL with %XX to decode…",
  sample: (o) => (o.mode === "encode" ? "Café & crème: 100% free? Hà Nội" : "https://shop.vn/tim-kiem?q=%C3%A1o%20d%C3%A0i%20%C4%91%E1%BB%8F&gia=100000-500000&trang=2#ket-qua"),
  options: [
    { id: "mode", label: "Direction", value: "decode", choices: [["encode", "Encode"], ["decode", "Decode"]] },
    { id: "kind", label: "Mode", value: "component", choices: [["component", "One parameter (encodeURIComponent)"], ["uri", "Whole URL (keeps : / ? & =)"], ["form", "Form (space → +)"]], show: (o) => o.mode === "encode" },
    { id: "plus", type: "check", label: "Turn + into spaces", value: true, show: (o) => o.mode === "decode" },
    { id: "lines", type: "check", label: "Process each line separately", value: false }
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
    const parts = [["Protocol", u.protocol.replace(":", "")], ["Host", u.host], u.port ? ["Port", u.port] : null, u.username ? ["User", u.username] : null, ["Path", u.path], u.hash ? ["Fragment (#)", u.hash.slice(1)] : null].filter(Boolean);
    out.append(h("div", { class: "url-parts" },
      h("p", { class: "opt-title", text: "URL parts" }),
      table(["Part", "Value"], parts.map(([k, v]) => [k, h("span", { class: "wrap", text: v })]), { cls: ["l", "l wrap"] }),
      u.params.length ? h("p", { class: "opt-title", text: `Query parameters (${u.params.length})` }) : null,
      u.params.length ? table(["Name", "Value (decoded)", ""], u.params.map(([k, v]) => [k, h("span", { class: "wrap", text: v }), h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(v) }, "Copy")]), { cls: ["l", "l wrap", ""] }) : null));
  }
});
