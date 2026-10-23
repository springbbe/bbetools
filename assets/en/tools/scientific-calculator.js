/* Tự sinh bởi scripts/build.js từ assets/tools/scientific-calculator.js và i18n/en/js/ — đừng sửa tay. */
/* Máy tính khoa học: bấm nút hoặc gõ phím, sin/cos/tan (độ/radian), log, luỹ thừa, giai thừa, %, Ans, lịch sử phép tính */
import { h, icon, copyText } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { evaluate, formatResult } from "../lib/bieu-thuc.js";

// [nhãn, chèn vào biểu thức, lớp, aria-label]
const KEYS = [
  ["sin", "sin(", "fn"], ["cos", "cos(", "fn"], ["tan", "tan(", "fn"], ["(", "(", "op"], [")", ")", "op"],
  ["asin", "asin(", "fn", "arcsin"], ["acos", "acos(", "fn", "arccos"], ["atan", "atan(", "fn", "arctan"], ["xʸ", "^", "op", "power"], ["√", "√(", "op", "square root"],
  ["ln", "ln(", "fn"], ["log", "log(", "fn", "base-10 logarithm"], ["x²", "^2", "op", "square"], ["n!", "!", "op", "factorial"], ["%", "%", "op", "percent"],
  ["7", "7", "num"], ["8", "8", "num"], ["9", "9", "num"], ["÷", "÷", "op", "divide"], ["AC", "AC", "clr", "clear all"],
  ["4", "4", "num"], ["5", "5", "num"], ["6", "6", "num"], ["×", "×", "op", "multiply"], ["⌫", "DEL", "clr", "delete one character"],
  ["1", "1", "num"], ["2", "2", "num"], ["3", "3", "num"], ["−", "-", "op", "subtract"], ["Ans", "Ans", "fn", "previous answer"],
  ["0", "0", "num"], [",", ",", "num", "decimal point"], ["π", "π", "fn", "pi"], ["+", "+", "op", "add"], ["=", "=", "eq", "equals"]
];

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let expr = "", ans = +S.get("ans", 0) || 0, deg = S.get("deg", true), justDone = false;
    let history = S.get("history", []);
    const exprIn = h("input", { class: "sc-expr", type: "text", inputmode: "none", autocomplete: "off", spellcheck: "false", "aria-label": "Expression", placeholder: "0" });
    const result = h("output", { class: "sc-res", "aria-live": "polite" });
    const degBtn = h("button", { class: "btn ghost sm", type: "button", onclick: () => { deg = !deg; S.set("deg", deg); draw(); } });
    const hist = h("ol", { class: "sc-hist", "aria-label": "Calculation history" });
    const pad = h("div", { class: "sc-pad" }, KEYS.map(([label, ins, cls, aria]) => h("button", { type: "button", class: "sc-k " + cls, "aria-label": aria || label, text: label, onclick: () => press(ins) })));
    el.append(h("div", { class: "sc" },
      h("div", { class: "sc-screen" }, h("div", { class: "sc-top" }, degBtn, h("button", { class: "ib sm", type: "button", title: "Copy result", "aria-label": "Copy result", html: icon("copy"), onclick: () => copyText(result.dataset.v || "0") })), exprIn, result),
      pad,
      h("p", { class: "hint", html: "Type directly on the keyboard: digits, <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> <kbd>^</kbd> <kbd>(</kbd> <kbd>)</kbd>, <kbd>Enter</kbd> to calculate, <kbd>Esc</kbd> to clear. You can also write <code>2sin30</code>, <code>200+10%</code>, <code>sqrt(2)</code>." })),
      h("div", { class: "sc-side" }, h("div", { class: "row", style: { justifyContent: "space-between" } }, h("p", { class: "opt-title", text: "History" }), h("button", { class: "btn ghost sm", type: "button", text: "Clear history", onclick: () => { history = []; S.set("history", history); drawHist(); } })), hist));

    function preview() {
      if (!expr.trim()) { result.textContent = ""; result.classList.remove("err"); return; }
      try { const v = evaluate(expr, { deg, ans }); result.textContent = "= " + formatResult(v); result.dataset.v = formatResult(v); result.classList.remove("err"); }
      catch (_) { result.textContent = ""; }
    }
    function draw() { exprIn.value = expr; degBtn.textContent = deg ? "Degrees (DEG)" : "Radian (RAD)"; degBtn.setAttribute("aria-label", "Angle unit: " + (deg ? "degrees" : "radian") + ". Click to change"); preview(); }
    function drawHist() {
      hist.textContent = "";
      if (!history.length) hist.append(h("li", { class: "hint", text: "No calculations yet." }));
      for (const x of history) hist.append(h("li", null, h("button", { type: "button", class: "sc-hrow", title: "Reuse this calculation", onclick: () => { expr = x.e; justDone = false; draw(); exprIn.focus(); } }, h("span", { class: "muted", text: x.e }), h("b", { text: "= " + x.r }))));
    }
    function equals() {
      if (!expr.trim()) return;
      try {
        const v = evaluate(expr, { deg, ans });
        const r = formatResult(v);
        history.unshift({ e: expr, r }); history = history.slice(0, 30); S.set("history", history); drawHist();
        ans = v; S.set("ans", v);
        expr = /Lỗi|∞/.test(r) ? "" : /e/.test(r) ? "Ans" : r; // số dạng 1,2e18 → dùng Ans để giữ đủ độ chính xác
        justDone = true;
        draw();
        result.textContent = "= " + r; result.dataset.v = r;
      } catch (e) { result.textContent = e.message || "Error"; result.classList.add("err"); }
    }
    function press(k) {
      if (k === "=") return equals();
      if (k === "AC") { expr = ""; justDone = false; return draw(); }
      if (k === "DEL") { expr = expr.replace(/(asin\($|acos\($|atan\($|sin\($|cos\($|tan\($|log\($|ln\($|√\($|Ans$|.)$/u, ""); justDone = false; return draw(); }
      // vừa bấm = mà gõ số mới → bắt đầu phép tính mới; gõ phép toán → tính tiếp trên kết quả
      if (justDone && /^[0-9,π(√]|^(sin|cos|tan|asin|acos|atan|ln|log)\(/.test(k)) expr = "";
      else if (!expr && /^[×÷+^!%]/.test(k)) expr = "Ans"; // bấm phép toán khi chưa có số: tính tiếp trên kết quả trước
      justDone = false;
      expr += k;
      draw();
    }
    exprIn.addEventListener("input", () => { expr = exprIn.value; justDone = false; preview(); });
    exprIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); }
      else if (e.key === "Escape") { e.preventDefault(); press("AC"); }
      else if (justDone && e.key.length === 1 && /[0-9.,a-zπ√(]/i.test(e.key) && exprIn.selectionStart === exprIn.value.length) { expr = ""; exprIn.value = ""; justDone = false; }
      else if (justDone && e.key.length === 1) justDone = false;
    });
    // gõ phím khi chưa bấm vào ô biểu thức
    document.addEventListener("keydown", (e) => {
      if (e.target === exprIn || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (/^[0-9+\-*/^().,%!]$/.test(e.key)) { e.preventDefault(); press(e.key === "*" ? "×" : e.key === "/" ? "÷" : e.key === "." ? "," : e.key); exprIn.focus(); }
      else if (e.key === "Enter") { e.preventDefault(); equals(); }
      else if (e.key === "Backspace") { e.preventDefault(); press("DEL"); }
      else if (e.key === "Escape") press("AC");
    });
    draw(); drawHist();
  }
});

const st = document.createElement("style");
st.textContent = `.ia{display:grid;gap:18px}@media(min-width:900px){.ia{grid-template-columns:minmax(0,1fr) 300px;align-items:start}}
.sc{display:flex;flex-direction:column;gap:12px;max-width:520px;width:100%;margin:0 auto}
.sc-screen{background:var(--surface-2);border:1px solid var(--line);border-radius:16px;padding:10px 14px 12px;display:flex;flex-direction:column;gap:2px}
.sc-top{display:flex;justify-content:space-between;align-items:center}
.sc-expr{border:0;background:transparent;font:500 22px/1.3 var(--mono);color:var(--ink);text-align:right;padding:4px 0;width:100%;outline:none}
.sc-res{display:block;min-height:40px;font:800 30px/1.3 var(--font);text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.sc-res.err{font-size:16px;color:var(--err);font-weight:600}
.sc-pad{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.sc-k{min-height:52px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:600 18px var(--font);cursor:pointer}
.sc-k:hover{border-color:var(--line-2)}.sc-k:active{transform:translateY(1px)}.sc-k.fn{font-size:15px;color:var(--muted)}.sc-k.op{background:var(--surface-2)}
.sc-k.clr{background:var(--err-soft);color:var(--err);border-color:transparent}.sc-k.eq{background:var(--brand);color:var(--brand-ink);border-color:var(--brand);font-size:22px}
.sc-k:focus-visible{outline:3px solid var(--brand);outline-offset:1px}
.sc-hist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:420px;overflow:auto}
.sc-hrow{width:100%;display:flex;flex-direction:column;align-items:flex-end;gap:2px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:500 14px var(--mono);cursor:pointer;text-align:right}
.sc-hrow b{font-family:var(--font);font-size:16px}`;
document.head.append(st);
