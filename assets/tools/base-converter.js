/* Đổi cơ số: nhị phân, bát phân, thập phân, thập lục phân, cơ số 2–36; số lớn tuỳ ý (BigInt); bù 2 cho số âm */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseInBase, toBase, group, twosComplement, bitLength } from "../lib/co-so.js";
import { alert } from "../calc.js";

const BASES = [["2", "Nhị phân (2)"], ["8", "Bát phân (8)"], ["10", "Thập phân (10)"], ["16", "Thập lục phân (16)"], ["36", "Cơ số 36"], ["custom", "Cơ số khác…"]];
const row = (k, v, shown = v) => h("div", { class: "ts-row" }, h("span", { class: "ts-k", text: k }), h("code", { class: "ts-v", text: shown }),
  h("button", { class: "ib sm", type: "button", "aria-label": "Sao chép " + k, title: "Sao chép", html: icon("copy"), onclick: () => copyText(v) }));

formTool({
  fields: [
    { id: "n", type: "text", label: "Số cần đổi", value: "2026", attrs: { class: "mono", spellcheck: "false", autocapitalize: "off" }, hint: "Có thể gõ tiền tố 0b, 0o, 0x; dấu cách và _ được bỏ qua." },
    { id: "from", type: "select", label: "Đang ở hệ", value: "10", choices: BASES },
    { id: "fromN", type: "number", label: "Cơ số nguồn (2–36)", value: "3", attrs: { min: 2, max: 36 }, show: (v) => v.from === "custom" },
    { id: "to", type: "number", label: "Thêm một cơ số đích (2–36)", value: "", placeholder: "vd. 3, 5, 12, 32", attrs: { min: 2, max: 36 } },
    { id: "upper", type: "check", label: "Chữ số hex viết HOA", value: true },
    { id: "bits", type: "select", label: "Số âm: biểu diễn bù 2 với", value: "32", choices: [["8", "8 bit"], ["16", "16 bit"], ["32", "32 bit"], ["64", "64 bit"]] }
  ],
  compute(v, out) {
    out.textContent = "";
    const from = v.from === "custom" ? Math.max(2, Math.min(36, parseInt(v.fromN, 10) || 10)) : +v.from;
    let n;
    try { n = parseInBase(v.n, from); } catch (e) { out.append(alert(v.n.trim() ? "err" : "info", v.n.trim() ? e.message : "Nhập một số nguyên để đổi.")); return; }
    const bin = toBase(n, 2), hex = toBase(n, 16, v.upper);
    out.append(h("div", { class: "ts-list" },
      row("Thập phân (10)", toBase(n, 10), group(toBase(n, 10), 3, ".")),
      row("Thập lục phân (16)", hex, group(hex, 4)),
      row("Bát phân (8)", toBase(n, 8)),
      row("Nhị phân (2)", bin, group(bin, 4)),
      row("Cơ số 36", toBase(n, 36, v.upper)),
      v.to && +v.to >= 2 && +v.to <= 36 && ![2, 8, 10, 16, 36].includes(+v.to) ? row(`Cơ số ${+v.to}`, toBase(n, +v.to, v.upper)) : null));
    const bits = bitLength(n);
    const facts = [`${bits.toLocaleString("vi-VN")} bit${n < 0n ? " (giá trị tuyệt đối)" : ""}`];
    if (n >= 0n && n <= 0x10ffffn) facts.push(`ký tự Unicode U+${toBase(n, 16, true).padStart(4, "0")}: “${String.fromCodePoint(Number(n))}”`);
    out.append(h("p", { class: "hint", text: facts.join(" · ") }));
    if (n < 0n) {
      const tc = twosComplement(n, +v.bits);
      out.append(h("p", { class: "opt-title", text: `Bù 2, ${v.bits} bit (cách máy tính lưu số âm)` }),
        tc ? h("div", { class: "ts-list" }, row("Nhị phân", tc, group(tc, 4)), row("Hex", toBase(parseInBase(tc, 2), 16, v.upper))) : alert("warn", `Số này cần nhiều hơn ${v.bits} bit.`));
    }
  }
});
