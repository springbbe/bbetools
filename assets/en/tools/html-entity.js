/* Tự sinh bởi scripts/build.js từ assets/tools/html-entity.js và i18n/en/js/ — đừng sửa tay. */
/* Mã hoá HTML entity: < > & " ' → &lt; &gt;…, tuỳ chọn mã hoá cả ký tự có dấu; giải mã mọi entity (kể cả &hearts;, &#x1F600;) */
import { textTool } from "../frames/text.js";
import { encodeEntities, decodeEntities } from "../lib/encode.js";

// tên entity không có trong bảng: để trình duyệt tự giải (textarea không chạy mã nên an toàn)
const ta = document.createElement("textarea");
const browserDecode = (m) => { ta.innerHTML = m; return ta.value !== m ? ta.value : null; };

textTool({
  mono: true,
  inputLabel: "Input",
  outputLabel: "Result",
  placeholder: "<p>Type HTML or text to encode…</p>",
  sample: (o) => (o.mode === "encode" ? "<a href=\"/search?q=café&size=M\">Crème brûlée \"special\" – $5.00</a>" : "&lt;p&gt;Caf&eacute; &amp; cr&egrave;me: 50&#37; off &hearts; &#x1F600;&lt;/p&gt;"),
  options: [
    { id: "mode", label: "Direction", value: "encode", choices: [["encode", "Encode"], ["decode", "Decode"]] },
    { id: "range", label: "Characters to encode", value: "basic", choices: [["basic", "Only special characters < > & \\\" '"], ["nonascii", "Also non-ASCII characters (accents, emoji)"], ["all", "Every character except letters and digits"]], show: (o) => o.mode === "encode" },
    { id: "style", label: "Format", value: "named", choices: [["named", "Named (&eacute;)"], ["dec", "Decimal (&#233;)"], ["hex", "Hex (&#xE9;)"]], show: (o) => o.mode === "encode" }
  ],
  swap: "mode",
  download: { name: "result.txt" },
  transform(text, o) {
    if (o.mode === "encode") return encodeEntities(text, { mode: o.range, style: o.style });
    return decodeEntities(text, browserDecode);
  }
});
