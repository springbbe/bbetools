/* Chuyển mã Unicode ↔ TCVN3 ↔ VNI: sửa chữ lỗi font .VnTime, VNI-Times, chữ UTF-8 bị đọc sai ("Viá»‡t") */
import { h } from "../core.js";
import { textTool } from "../frames/text.js";
import { fromUnicode, toUnicode, detect, ENCODINGS } from "../lib/vn-encoding.js";

const FROM = [["auto", "Tự nhận"], ["tcvn3", "TCVN3 (ABC) – .VnTime"], ["vni", "VNI – VNI-Times"], ["mojibake", "UTF-8 bị lỗi (Viá»‡t)"], ["nfd", "Unicode tổ hợp"], ["unicode", "Unicode"]];
const TO = [["unicode", "Unicode (chuẩn)"], ["tcvn3", "TCVN3 (ABC) – .VnTime"], ["vni", "VNI – VNI-Times"], ["nfd", "Unicode tổ hợp"]];

textTool({
  inputLabel: "Văn bản lỗi font / cần chuyển mã",
  outputLabel: "Kết quả",
  placeholder: "Dán chữ bị lỗi font, ví dụ: Céng hoµ x· héi chñ nghÜa ViÖt Nam",
  sample: "Céng hoµ x· héi chñ nghÜa ViÖt Nam\n§éc lËp - Tù do - H¹nh phóc\n\nQUYÕT §ÞNH\nVÒ viÖc ban hµnh quy chÕ lµm viÖc cña c¬ quan",
  options: [
    { id: "from", label: "Từ bảng mã", value: "auto", choices: FROM },
    { id: "to", label: "Sang", value: "unicode", choices: TO },
    { id: "upper", label: "Chữ có dấu (TCVN3)", value: "auto", choices: [["auto", "Tự đoán hoa/thường"], ["lower", "Luôn chữ thường"], ["upper", "In hoa hết (.VnTimeH)"]], show: (o) => o.from === "tcvn3" || o.from === "auto" }
  ],
  download: { name: "chuyen-ma.txt" },
  transform(text, o) {
    if (!text) return { text: "" };
    const from = o.from === "auto" ? detect(text) : o.from;
    const uni = toUnicode(text, from, { upper: o.upper });
    const res = fromUnicode(uni, o.to);
    const info = [
      o.from === "auto" ? h("span", null, "Nhận ra: ", h("b", { text: ENCODINGS[from] })) : null,
      from === o.to || (from === "unicode" && o.to === "unicode") ? h("span", { text: " · Văn bản đã ở bảng mã đích, không cần đổi." }) : null,
      o.to === "tcvn3" ? h("span", { text: " · Kết quả TCVN3 cần mở bằng font .VnTime (chữ hoa có dấu cần font .VnTimeH) mới đọc được." }) : null,
      o.to === "vni" ? h("span", { text: " · Kết quả VNI cần mở bằng font VNI-Times mới đọc được." }) : null
    ].filter(Boolean);
    return { text: res, info: info.length ? h("span", null, ...info) : null };
  }
});
