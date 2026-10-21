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
    const minus = h("button", { class: "ib sm", type: "button", "aria-label": "Giảm", html: icon("minus"), onclick: () => step(-1) });
    const plus = h("button", { class: "ib sm", type: "button", "aria-label": "Tăng", html: icon("plus"), onclick: () => step(1) });
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
    { id: "mode", type: "seg", label: "Kiểu", value: "random", choices: [["random", "Ngẫu nhiên"], ["words", "Cụm từ dễ nhớ"], ["pin", "Mã PIN"]] },
    Object.assign(range("len", "Độ dài (ký tự)", 4, 64, 16), { show: isRandom }),
    { id: "upper", type: "check", label: "Chữ hoa (A–Z)", value: true, show: isRandom },
    { id: "lower", type: "check", label: "Chữ thường (a–z)", value: true, show: isRandom },
    { id: "digits", type: "check", label: "Chữ số (0–9)", value: true, show: isRandom },
    { id: "symbols", type: "check", label: "Ký tự đặc biệt (!@#$…)", value: true, show: isRandom },
    { id: "amb", type: "check", label: "Bỏ ký tự dễ nhầm", hint: "Không dùng I, l, 1, O, 0, o và dấu nháy — dễ đọc khi phải gõ lại", show: isRandom },
    Object.assign(range("words", "Số từ", 3, 10, 6), { show: isWords }),
    { id: "sep", type: "select", label: "Nối các từ bằng", value: "-", show: isWords, choices: [["-", "Gạch ngang  (con-meo-bau-troi)"], [".", "Dấu chấm  (con.meo.bau.troi)"], ["_", "Gạch dưới  (con_meo_bau_troi)"], [" ", "Dấu cách  (con meo bau troi)"], ["", "Viết liền  (conmeobautroi)"]] },
    { id: "cap", type: "check", label: "Viết hoa chữ đầu mỗi từ", value: true, show: isWords },
    { id: "num", type: "check", label: "Thêm một chữ số", value: true, show: isWords },
    Object.assign(range("pin", "Số chữ số", 4, 12, 6), { show: (v) => v.mode === "pin" }),
    { id: "count", type: "select", label: "Số lượng", value: "1", choices: [["1", "1 mật khẩu"], ["5", "5 mật khẩu"], ["10", "10 mật khẩu"], ["20", "20 mật khẩu"], ["50", "50 mật khẩu"]] }
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
    const again = h("button", { class: "btn ghost sm", type: "button", onclick: () => api.update() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Tạo mới");
    if (n === 1) {
      const pw = list[0];
      out.append(
        h("div", { class: "pw-box" },
          h("output", { class: "pw-out", "aria-label": "Mật khẩu vừa tạo", text: pw }),
          h("div", { class: "row" },
            h("button", { class: "btn", type: "button", onclick: () => copyText(pw, "Đã sao chép mật khẩu") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép"),
            again)),
        hints ? h("p", { class: "hint pw-hint" }, "Gợi nhớ: ", h("b", { text: hints[0].join(" · ") })) : "");
    } else {
      const text = list.join("\n");
      out.append(
        h("div", { class: "fm-foot" },
          h("button", { class: "btn sm", type: "button", onclick: () => copyText(text, `Đã sao chép ${n} mật khẩu`) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép tất cả"), again,
          h("button", { class: "ib sm", type: "button", title: "Tải file .txt", "aria-label": "Tải file .txt", html: icon("download"), onclick: () => save(new Blob([text + "\n"], { type: "text/plain" }), "mat-khau.txt") })),
        h("ul", { class: "pw-list" }, list.map((p, i) => h("li", null, h("code", { text: p }), hints ? h("small", { class: "hint", text: hints[i].join(" · ") }) : "",
          h("button", { class: "ib sm", type: "button", "aria-label": "Sao chép mật khẩu " + (i + 1), title: "Sao chép", html: icon("copy"), onclick: () => copyText(p, "Đã sao chép mật khẩu") })))));
    }
    const fast = ATTACKS.find((a) => a.id === "offline-fast");
    out.append(strengthMeter(lv.level, lv.label),
      h("p", { class: "hint" }, `Độ bất định ${Math.round(bits)} bit. Máy tính mạnh đoán ${fast.rate.toLocaleString("vi-VN")} lần/giây cần ${durationVi(bitsToGuesses(bits) / fast.rate)} để dò ra.`),
      v.mode === "pin" ? h("p", { class: "hint", text: "Mã PIN chỉ an toàn khi hệ thống khoá sau vài lần nhập sai (thẻ ATM, điện thoại). Đừng dùng PIN làm mật khẩu tài khoản online." }) : "",
      v.mode === "words" ? h("p", { class: "hint", text: `Mỗi từ được chọn ngẫu nhiên từ ${wordList().length} từ tiếng Việt quen thuộc, nên cụm từ vừa dễ nhớ vừa khó đoán. Đừng tự sửa thành câu có nghĩa.` }) : "");
  }
});
