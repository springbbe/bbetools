/* Sửa chữ gõ sai bộ gõ: "Vieejt Nam" → "Việt Nam" (quên bật Unikey/EVKey khi gõ Telex hoặc VNI) */
import { fmtNum } from "../core.js";
import { textTool } from "../frames/text.js";
import { fixTyping } from "../lib/telex.js";

textTool({
  inputLabel: "Chữ gõ khi chưa bật bộ gõ",
  outputLabel: "Tiếng Việt có dấu",
  placeholder: "Ví dụ: Tooi ddang hocj tieesng Vieejt",
  sample: "Kinhs guwir quys khachs,\nCoong ty chungs tooi xin traan trongj thoong baos lichj nghir Teets Nguyeen ddans nawm 2027.\nNhaan vieen se4 trowr laji lafm vieejc tuwf ngayf 22/02/2027.",
  options: [
    { id: "mode", label: "Kiểu gõ", value: "auto", choices: [["auto", "Tự nhận (Telex + VNI)"], ["telex", "Telex"], ["vni", "VNI (số)"]] },
    { id: "style", label: "Đặt dấu", value: "old", choices: [["old", "Kiểu cũ: hòa, thủy"], ["new", "Kiểu mới: hoà, thuỷ"]] },
    { id: "keepEnglish", type: "check", label: "Giữ nguyên từ tiếng Anh thông dụng (this, was, is…)", value: true }
  ],
  download: { name: "da-sua-dau.txt" },
  transform(text, o) {
    if (!text) return { text: "" };
    const r = fixTyping(text, o);
    return { text: r.text, info: r.changed ? `Đã sửa ${fmtNum(r.changed)} từ. Từ không ra âm tiết tiếng Việt hợp lệ được giữ nguyên.` : "Không có từ nào cần sửa." };
  }
});
