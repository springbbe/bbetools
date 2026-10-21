/* Tính biểu thức cho máy tính khoa học (không dùng eval).
   Hỗ trợ: + − × ÷ * / ^ (luỹ thừa, kết hợp phải), % (phần trăm hậu tố), ! (giai thừa), ngoặc, nhân ngầm (2π, 3(4), 2sin30),
   hàm sin cos tan asin acos atan sinh cosh tanh ln log log2 sqrt √ cbrt ∛ abs exp, hằng π pi e, biến Ans.
   Dấu thập phân "." hoặc ","; dấu phân cách đối số không có (mọi hàm một đối số). */

const FUNCS = {
  sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, sinh: 1, cosh: 1, tanh: 1, ln: 1, log: 1, log2: 1, sqrt: 1, cbrt: 1, abs: 1, exp: 1
};
const ALIAS = { "√": "sqrt", "∛": "cbrt", "π": "pi", "×": "*", "÷": "/", "−": "-", "–": "-" };

export class CalcError extends Error {}

export function tokenize(src) {
  const s = String(src).replace(/\s+/g, "");
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.,]/.test(c)) {
      let j = i; while (j < s.length && /[0-9.,]/.test(s[j])) j++;
      let num = s.slice(i, j).replace(",", ".");
      if ((num.match(/\./g) || []).length > 1 || num === ".") throw new CalcError("Số không hợp lệ: " + s.slice(i, j));
      if (/^[eE][-+]?\d/.test(s.slice(j)) && !/^e[a-z]/i.test(s.slice(j))) { const m = /^[eE][-+]?\d+/.exec(s.slice(j)); num += m[0]; j += m[0].length; }
      out.push({ t: "num", v: parseFloat(num) }); i = j; continue;
    }
    if (ALIAS[c]) {
      const a = ALIAS[c];
      if (a === "pi") out.push({ t: "num", v: Math.PI, name: "π" });
      else if (FUNCS[a]) out.push({ t: "fn", v: a });
      else out.push({ t: "op", v: a });
      i++; continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i; while (j < s.length && /[a-zA-Z0-9]/.test(s[j])) j++;
      let w = s.slice(i, j).toLowerCase();
      // tách từ dính liền: "sinpi", "2pie"… lấy tên dài nhất khớp ở đầu
      const names = [...Object.keys(FUNCS), "pi", "e", "ans"].sort((a, b) => b.length - a.length);
      const hit = names.find((n) => w.startsWith(n));
      if (!hit) throw new CalcError("Không hiểu “" + s.slice(i, j) + "”");
      w = hit; j = i + hit.length;
      if (FUNCS[w]) out.push({ t: "fn", v: w });
      else if (w === "pi") out.push({ t: "num", v: Math.PI, name: "π" });
      else if (w === "e") out.push({ t: "num", v: Math.E, name: "e" });
      else out.push({ t: "ans" });
      i = j; continue;
    }
    if ("+-*/^%!()".includes(c)) { out.push({ t: c === "(" || c === ")" ? c : "op", v: c }); i++; continue; }
    throw new CalcError("Ký tự không hợp lệ: " + c);
  }
  return out;
}

/** Tính biểu thức. o: { deg: true (góc theo độ), ans: kết quả trước } */
export function evaluate(src, o = {}) {
  const toks = tokenize(src);
  if (!toks.length) throw new CalcError("Chưa có phép tính");
  let p = 0;
  const peek = () => toks[p];
  const isStart = (t) => t && (t.t === "num" || t.t === "fn" || t.t === "ans" || t.t === "(");
  const toRad = (x) => (o.deg ? (x * Math.PI) / 180 : x);
  const fromRad = (x) => (o.deg ? (x * 180) / Math.PI : x);
  const fix = (x) => (Math.abs(x) < 1e-15 ? 0 : +x.toPrecision(15)); // sin 30° = 0,5 chứ không 0,49999999999999994
  const F = {
    sin: (x) => fix(Math.sin(toRad(x))), cos: (x) => fix(Math.cos(toRad(x))),
    tan: (x) => { if (o.deg && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) throw new CalcError("tan không xác định tại " + x + "°"); return fix(Math.tan(toRad(x))); },
    asin: (x) => fromRad(Math.asin(x)), acos: (x) => fromRad(Math.acos(x)), atan: (x) => fromRad(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10, log2: Math.log2,
    sqrt: (x) => { if (x < 0) throw new CalcError("Không lấy căn bậc hai của số âm"); return Math.sqrt(x); },
    cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp
  };
  function fact(n) {
    if (n < 0 || !Number.isInteger(n)) throw new CalcError("Giai thừa chỉ dùng cho số nguyên không âm");
    if (n > 170) return Infinity;
    let r = 1; for (let k = 2; k <= n; k++) r *= k; return r;
  }
  // expr := term (("+"|"-") term)*
  function expr() {
    let v = term();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = toks[p++].v;
      const r = term();
      // a + b% → a + a·b/100 (như máy tính bỏ túi)
      const rv = r.pct ? v.v * r.v : r.v;
      v = { v: op === "+" ? v.v + rv : v.v - rv };
    }
    return v;
  }
  // term := unary (("*"|"/") unary | unary-ngầm)*
  function term() {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
        p++;
        const r = unary();
        if (t.v === "/" && r.v === 0) throw new CalcError("Không chia được cho 0");
        v = { v: t.v === "*" ? v.v * r.v : v.v / r.v };
      } else if (isStart(t)) {
        v = { v: v.v * unary().v };            // nhân ngầm: 2π, 3(4)
      } else break;
    }
    return v;
  }
  // unary := ("-"|"+") unary | power
  function unary() {
    const t = peek();
    if (t && t.t === "op" && (t.v === "-" || t.v === "+")) { p++; const r = unary(); return { v: t.v === "-" ? -r.v : r.v, pct: r.pct }; }
    return power();
  }
  // power := postfix ("^" unary)?
  function power() {
    const b = postfix();
    if (peek() && peek().t === "op" && peek().v === "^") { p++; const e = unary(); return { v: Math.pow(b.v, e.v) }; }
    return b;
  }
  // postfix := primary ("!" | "%")*
  function postfix() {
    let v = primary();
    while (peek() && peek().t === "op" && (peek().v === "!" || peek().v === "%")) {
      const op = toks[p++].v;
      v = op === "!" ? { v: fact(v.v) } : { v: v.v / 100, pct: true };
    }
    return v;
  }
  function primary() {
    const t = toks[p++];
    if (!t) throw new CalcError("Phép tính chưa xong");
    if (t.t === "num") return { v: t.v };
    if (t.t === "ans") return { v: +o.ans || 0 };
    if (t.t === "(") {
      const v = expr();
      if (peek() && peek().t === ")") p++;     // cho phép thiếu ngoặc đóng ở cuối
      else if (peek()) throw new CalcError("Thiếu ngoặc đóng");
      return { v: v.v };
    }
    if (t.t === "fn") {
      // sin30, sin(30), sin-30
      const arg = peek() && peek().t === "(" ? primary() : power();
      return { v: F[t.v](arg.v) };
    }
    throw new CalcError(t.v === ")" ? "Thừa ngoặc đóng" : "Thiếu số trước “" + ({ "*": "×", "/": "÷" }[t.v] || t.v) + "”");
  }
  const r = expr();
  if (p < toks.length) throw new CalcError(toks[p].t === ")" ? "Thừa ngoặc đóng" : "Phép tính không hợp lệ");
  const v = r.v;
  if (Number.isNaN(v)) throw new CalcError("Kết quả không xác định");
  return v;
}

/** Hiển thị kết quả: 12 chữ số có nghĩa, bỏ sai số dấu phẩy động (0,1 + 0,2 = 0,3) */
export function formatResult(x, decimal = ",") {
  if (!Number.isFinite(x)) return x > 0 ? "∞" : x < 0 ? "−∞" : "Lỗi";
  if (x === 0) return "0";
  const a = Math.abs(x);
  let s;
  if (a >= 1e15 || a < 1e-9) s = x.toExponential(11).replace(/\.?0+e/, "e").replace("e+", "e");
  else s = String(Number(x.toPrecision(12)));
  return s.replace(".", decimal);
}
