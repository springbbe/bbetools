/* Tự sinh bởi scripts/build.js từ assets/tools/password-generator.js và i18n/en/js/ — đừng sửa tay. */
/* Tạo mật khẩu mạnh: ngẫu nhiên theo bộ ký tự, cụm từ tiếng Việt dễ nhớ, hoặc mã PIN. Dùng crypto.getRandomValues, không lưu, không gửi đi. */
import { h, icon, copyText, save } from "../core.js";
import { formTool } from "../frames/form.js";
import { generatePassword, passwordBits, generatePassphrase, passphraseBits, generatePin, bitsLevel, durationVi, bitsToGuesses, ATTACKS, wordList } from "../lib/mat-khau.js";
import { strengthMeter } from "../security.js";

const range = (id, label, min, max, value) => ({
  id, type: "custom", value: String(value),
  render() {
    const out = h("output", { class: "pw-len", for: "f-" + id, text: value });
    const r = h("input", { id: "f-" + id, type: "range", min, max, value, "aria-label": label, oninput: () => { out.textContent = r.value; } });
    const minus = h("button", { class: "ib sm", type: "button", "aria-label": "Decrease", html: icon("minus"), onclick: () => step(-1) });
    const plus = h("button", { class: "ib sm", type: "button", "aria-label": "Increase", html: icon("plus"), onclick: () => step(1) });
    function step(d) { r.value = String(Math.max(min, Math.min(max, +r.value + d))); out.textContent = r.value; r.dispatchEvent(new Event("input", { bubbles: true })); }
    return {
      el: h("div", { class: "field" }, h("label", { for: "f-" + id, text: label }), h("div", { class: "pw-range" }, minus, r, plus, out)),
      get: () => r.value, set: (v) => { r.value = String(Math.max(min, Math.min(max, parseInt(v, 10) || value))); out.textContent = r.value; }
    };
  }
});

const isRandom = (v) => v.mode === "random", isWords = (v) => v.mode === "words";
formTool({
  share: false,
  fields: [
    { id: "mode", type: "seg", label: "Type", value: "random", choices: [["random", "Random"], ["words", "Memorable passphrase"], ["pin", "PIN"]] },
    Object.assign(range("len", "Length (characters)", 4, 64, 16), { show: isRandom }),
    { id: "upper", type: "check", label: "Uppercase (A–Z)", value: true, show: isRandom },
    { id: "lower", type: "check", label: "Lowercase (a–z)", value: true, show: isRandom },
    { id: "digits", type: "check", label: "Digits (0–9)", value: true, show: isRandom },
    { id: "symbols", type: "check", label: "Symbols (!@#$…)", value: true, show: isRandom },
    { id: "amb", type: "check", label: "Avoid look-alike characters", hint: "No I, l, 1, O, 0, o or quotes — easier to read when retyping", show: isRandom },
    Object.assign(range("words", "Words", 3, 10, 6), { show: isWords }),
    { id: "sep", type: "select", label: "Join words with", value: "-", show: isWords, choices: [["-", "Hyphen  (river-cloud-tiger)"], [".", "Dot  (river.cloud.tiger)"], ["_", "Underscore  (river_cloud_tiger)"], [" ", "Space  (river cloud tiger)"], ["", "No separator  (rivercloudtiger)"]] },
    { id: "cap", type: "check", label: "Capitalize each word", value: true, show: isWords },
    { id: "num", type: "check", label: "Add a digit", value: true, show: isWords },
    Object.assign(range("pin", "Number of digits", 4, 12, 6), { show: (v) => v.mode === "pin" }),
    { id: "count", type: "select", label: "Count", value: "1", choices: [["1", "1 password"], ["5", "5 passwords"], ["10", "10 passwords"], ["20", "20 passwords"], ["50", "50 passwords"]] }
  ],
  compute(v, out, api) {
    out.textContent = "";
    const n = +v.count || 1;
    let list, bits, hints = null;
    if (v.mode === "words") {
      const o = { words: +v.words, sep: v.sep, cap: v.cap, digit: v.num };
      const r = Array.from({ length: n }, () => generatePassphrase(o));
      list = r.map((x) => x.text); hints = r.map((x) => x.hint); bits = passphraseBits(o);
    } else if (v.mode === "pin") {
      list = Array.from({ length: n }, () => generatePin(+v.pin)); bits = +v.pin * Math.log2(10);
    } else {
      const o = { length: +v.len, upper: v.upper, lower: v.lower, digits: v.digits, symbols: v.symbols, noAmbiguous: v.amb };
      list = Array.from({ length: n }, () => generatePassword(o)); bits = passwordBits(o);
    }
    const lv = bitsLevel(bits);
    const again = h("button", { class: "btn ghost sm", type: "button", onclick: () => api.update() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Generate");
    if (n === 1) {
      const pw = list[0];
      out.append(
        h("div", { class: "pw-box" },
          h("output", { class: "pw-out", "aria-label": "Generated password", text: pw }),
          h("div", { class: "row" },
            h("button", { class: "btn", type: "button", onclick: () => copyText(pw, "Password copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy"),
            again)),
        hints ? h("p", { class: "hint pw-hint" }, "Hint: ", h("b", { text: hints[0].join(" · ") })) : "");
    } else {
      const text = list.join("\n");
      out.append(
        h("div", { class: "fm-foot" },
          h("button", { class: "btn sm", type: "button", onclick: () => copyText(text, `Copied ${n} passwords`) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy all"), again,
          h("button", { class: "ib sm", type: "button", title: "Download .txt file", "aria-label": "Download .txt file", html: icon("download"), onclick: () => save(new Blob([text + "\n"], { type: "text/plain" }), "passwords.txt") })),
        h("ul", { class: "pw-list" }, list.map((p, i) => h("li", null, h("code", { text: p }), hints ? h("small", { class: "hint", text: hints[i].join(" · ") }) : "",
          h("button", { class: "ib sm", type: "button", "aria-label": "Copy password " + (i + 1), title: "Copy", html: icon("copy"), onclick: () => copyText(p, "Password copied") })))));
    }
    const fast = ATTACKS.find((a) => a.id === "offline-fast");
    out.append(strengthMeter(lv.level, lv.label),
      h("p", { class: "hint" }, `Entropy ${Math.round(bits)} bits. A powerful computer guessing ${fast.rate.toLocaleString("en-US")} times per second needs ${durationVi(bitsToGuesses(bits) / fast.rate)} to find it.`),
      v.mode === "pin" ? h("p", { class: "hint", text: "A PIN is only safe when the system locks after a few wrong attempts (bank cards, phones). Don't use a PIN as an online account password." }) : "",
      v.mode === "words" ? h("p", { class: "hint", text: `Each word is picked at random from ${wordList().length} common English words, so the phrase is both memorable and hard to guess. Don't edit it into a meaningful sentence.` }) : "");
  }
});
