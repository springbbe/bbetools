/* Tự sinh bởi scripts/build.js từ assets/tools/base-converter.js và i18n/en/js/ — đừng sửa tay. */
/* Đổi cơ số: nhị phân, bát phân, thập phân, thập lục phân, cơ số 2–36; số lớn tuỳ ý (BigInt); bù 2 cho số âm */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseInBase, toBase, group, twosComplement, bitLength } from "../lib/co-so.js";
import { alert } from "../calc.js";

const BASES = [["2", "Binary (2)"], ["8", "Octal (8)"], ["10", "Decimal (10)"], ["16", "Hexadecimal (16)"], ["36", "Base 36"], ["custom", "Other base…"]];
const row = (k, v, shown = v) => h("div", { class: "ts-row" }, h("span", { class: "ts-k", text: k }), h("code", { class: "ts-v", text: shown }),
  h("button", { class: "ib sm", type: "button", "aria-label": "Copy " + k, title: "Copy", html: icon("copy"), onclick: () => copyText(v) }));

formTool({
  fields: [
    { id: "n", type: "text", label: "Number to convert", value: "2026", attrs: { class: "mono", spellcheck: "false", autocapitalize: "off" }, hint: "You can type the prefixes 0b, 0o, 0x; spaces and _ are ignored." },
    { id: "from", type: "select", label: "Input base", value: "10", choices: BASES },
    { id: "fromN", type: "number", label: "Source base (2–36)", value: "3", attrs: { min: 2, max: 36 }, show: (v) => v.from === "custom" },
    { id: "to", type: "number", label: "Add a target base (2–36)", value: "", placeholder: "vd. 3, 5, 12, 32", attrs: { min: 2, max: 36 } },
    { id: "upper", type: "check", label: "Uppercase hex digits", value: true },
    { id: "bits", type: "select", label: "Negative numbers: two's complement with", value: "32", choices: [["8", "8 bit"], ["16", "16 bit"], ["32", "32 bit"], ["64", "64 bit"]] }
  ],
  compute(v, out) {
    out.textContent = "";
    const from = v.from === "custom" ? Math.max(2, Math.min(36, parseInt(v.fromN, 10) || 10)) : +v.from;
    let n;
    try { n = parseInBase(v.n, from); } catch (e) { out.append(alert(v.n.trim() ? "err" : "info", v.n.trim() ? e.message : "Enter an integer to convert.")); return; }
    const bin = toBase(n, 2), hex = toBase(n, 16, v.upper);
    out.append(h("div", { class: "ts-list" },
      row("Decimal (10)", toBase(n, 10), group(toBase(n, 10), 3, ".")),
      row("Hexadecimal (16)", hex, group(hex, 4)),
      row("Octal (8)", toBase(n, 8)),
      row("Binary (2)", bin, group(bin, 4)),
      row("Base 36", toBase(n, 36, v.upper)),
      v.to && +v.to >= 2 && +v.to <= 36 && ![2, 8, 10, 16, 36].includes(+v.to) ? row(`Base ${+v.to}`, toBase(n, +v.to, v.upper)) : null));
    const bits = bitLength(n);
    const facts = [`${bits.toLocaleString("en-US")} bit${n < 0n ? " (absolute value)" : ""}`];
    if (n >= 0n && n <= 0x10ffffn) facts.push(`Unicode character U+${toBase(n, 16, true).padStart(4, "0")}: “${String.fromCodePoint(Number(n))}”`);
    out.append(h("p", { class: "hint", text: facts.join(" · ") }));
    if (n < 0n) {
      const tc = twosComplement(n, +v.bits);
      out.append(h("p", { class: "opt-title", text: `Two's complement, ${v.bits} bits (how computers store negative numbers)` }),
        tc ? h("div", { class: "ts-list" }, row("Binary", tc, group(tc, 4)), row("Hex", toBase(parseInBase(tc, 2), 16, v.upper))) : alert("warn", `This number needs more than ${v.bits} bits.`));
    }
  }
});
