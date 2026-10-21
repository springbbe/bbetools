/* Mã hoá HTML entity: < > & " ' → &lt; &gt;…, tuỳ chọn mã hoá cả ký tự có dấu; giải mã mọi entity (kể cả &hearts;, &#x1F600;) */
import { textTool } from "../frames/text.js";
import { encodeEntities, decodeEntities } from "../lib/encode.js";

// tên entity không có trong bảng: để trình duyệt tự giải (textarea không chạy mã nên an toàn)
const ta = document.createElement("textarea");
const browserDecode = (m) => { ta.innerHTML = m; return ta.value !== m ? ta.value : null; };

textTool({
  mono: true,
  inputLabel: "Đầu vào",
  outputLabel: "Kết quả",
  placeholder: "<p>Gõ HTML hoặc văn bản cần mã hoá…</p>",
  sample: (o) => (o.mode === "encode" ? '<a href="/tim-kiem?q=áo&size=M">Áo dài "đỏ" – giá 500.000đ</a>' : "&lt;p&gt;Gi&aacute; &amp; khuyến m&atilde;i: 50&#37; &hearts; &#x1F600;&lt;/p&gt;"),
  options: [
    { id: "mode", label: "Chiều", value: "encode", choices: [["encode", "Mã hoá"], ["decode", "Giải mã"]] },
    { id: "range", label: "Ký tự cần mã hoá", value: "basic", choices: [["basic", "Chỉ ký tự đặc biệt < > & \" '"], ["nonascii", "Thêm ký tự ngoài ASCII (có dấu, emoji)"], ["all", "Mọi ký tự trừ chữ, số"]], show: (o) => o.mode === "encode" },
    { id: "style", label: "Dạng", value: "named", choices: [["named", "Tên (&eacute;)"], ["dec", "Số thập phân (&#233;)"], ["hex", "Số hex (&#xE9;)"]], show: (o) => o.mode === "encode" }
  ],
  swap: "mode",
  download: { name: "ket-qua.txt" },
  transform(text, o) {
    if (o.mode === "encode") return encodeEntities(text, { mode: o.range, style: o.style });
    return decodeEntities(text, browserDecode);
  }
});
