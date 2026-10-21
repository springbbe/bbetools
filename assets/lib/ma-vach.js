/* Mã vạch một chiều (hàm thuần): EAN-13, EAN-8, UPC-A, ITF-14, Code 128, Code 39.
   encode(type, text) → { modules: "1010…" (1 = vạch, 0 = khoảng trắng, mỗi ký tự rộng 1 ô), guards: [chỉ số ô vạch dài],
   text: chuỗi đầy đủ (có số kiểm tra), hrt: [{ text, from, to }] vị trí chữ in dưới vạch (theo ô), quiet: [trái, phải] }
   Ném lỗi có userMsg khi nội dung không hợp lệ. */

const fail = (msg) => { const e = new Error(msg); e.userMsg = msg; throw e; };
const digitsOnly = (s) => /^\d+$/.test(s);

/* ---------- GS1: EAN-13, EAN-8, UPC-A, ITF-14 ---------- */
/** Số kiểm tra GS1 (mod 10, trọng số 3-1 tính từ phải sang) cho phần dữ liệu (không gồm số kiểm tra) */
export function gs1Check(data) {
  let s = 0;
  for (let i = data.length - 1, w = 3; i >= 0; i--, w = 4 - w) s += +data[i] * w;
  return String((10 - (s % 10)) % 10);
}
/** Chuẩn hoá chuỗi số GS1: thêm số kiểm tra nếu thiếu, báo lỗi nếu sai */
function gs1(text, len, name) {
  const s = String(text).replace(/[\s-]/g, "");
  if (!digitsOnly(s)) fail(`${name} chỉ gồm chữ số.`);
  if (s.length === len - 1) return s + gs1Check(s);
  if (s.length !== len) fail(`${name} cần ${len - 1} chữ số (tự thêm số kiểm tra) hoặc đủ ${len} chữ số.`);
  const c = gs1Check(s.slice(0, -1));
  if (c !== s.slice(-1)) fail(`Số kiểm tra cuối không đúng: với ${s.slice(0, -1)} số cuối phải là ${c}.`);
  return s;
}

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const R = L.map((p) => p.replace(/./g, (b) => (b === "0" ? "1" : "0")));
const G = R.map((p) => [...p].reverse().join(""));
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

function ean13(text) {
  const s = gs1(text, 13, "EAN-13");
  const par = PARITY[+s[0]];
  let m = "101";
  for (let i = 1; i <= 6; i++) m += (par[i - 1] === "L" ? L : G)[+s[i]];
  m += "01010";
  for (let i = 7; i <= 12; i++) m += R[+s[i]];
  m += "101";
  return { modules: m, text: s, guards: [...range(0, 3), ...range(45, 50), ...range(92, 95)], hrt: [{ text: s[0], from: -9, to: -1 }, { text: s.slice(1, 7), from: 3, to: 45 }, { text: s.slice(7), from: 50, to: 92 }], quiet: [11, 7] };
}
function ean8(text) {
  const s = gs1(text, 8, "EAN-8");
  let m = "101";
  for (let i = 0; i < 4; i++) m += L[+s[i]];
  m += "01010";
  for (let i = 4; i < 8; i++) m += R[+s[i]];
  m += "101";
  return { modules: m, text: s, guards: [...range(0, 3), ...range(31, 36), ...range(64, 67)], hrt: [{ text: s.slice(0, 4), from: 3, to: 31 }, { text: s.slice(4), from: 36, to: 64 }], quiet: [7, 7] };
}
function upca(text) {
  const s = gs1(text, 12, "UPC-A");
  const e = ean13("0" + s);
  // UPC-A: số đầu và số cuối in nhỏ bên ngoài, vạch của chúng kéo dài như vạch bảo vệ
  return { modules: e.modules, text: s, guards: [...range(0, 10), ...range(45, 50), ...range(85, 95)], hrt: [{ text: s[0], from: -9, to: -1, small: true }, { text: s.slice(1, 6), from: 10, to: 45 }, { text: s.slice(6, 11), from: 50, to: 85 }, { text: s[11], from: 96, to: 103, small: true }], quiet: [9, 9] };
}

// mẫu hẹp/rộng của 5 phần tử cho số 0–9 (Interleaved 2 of 5, cũng là mẫu vạch của Code 39)
const NW5 = ["nnwwn", "wnnnw", "nwnnw", "wwnnn", "nnwnw", "wnwnn", "nwwnn", "nnnww", "wnnwn", "nwnwn"];
function itf14(text) {
  const s = gs1(text, 14, "ITF-14");
  const W = 3;
  const run = (bar, wide) => (bar ? "1" : "0").repeat(wide ? W : 1);
  let m = "1010"; // vạch mở đầu: hẹp-hẹp-hẹp-hẹp
  for (let i = 0; i < s.length; i += 2) {
    const a = NW5[+s[i]], b = NW5[+s[i + 1]];
    for (let k = 0; k < 5; k++) m += run(true, a[k] === "w") + run(false, b[k] === "w");
  }
  m += run(true, true) + "01"; // kết thúc: rộng-hẹp-hẹp
  return { modules: m, text: s, guards: [], hrt: [{ text: `${s[0]} ${s.slice(1, 3)} ${s.slice(3, 8)} ${s.slice(8, 13)} ${s[13]}`, from: 0, to: m.length }], quiet: [10 * W, 10 * W], bearer: true };
}

/* ---------- Code 39 ---------- */
export const C39_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
const C39 = (() => {
  const t = {};
  // 4 nhóm 10 ký tự: mẫu vạch lặp theo thứ tự 1…9,0, khoảng rộng nằm ở vị trí 2, 3, 4, 1
  const groups = [["1234567890", 1], ["ABCDEFGHIJ", 2], ["KLMNOPQRST", 3], ["UVWXYZ-. *", 0]];
  const barOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  for (const [chars, wideSpace] of groups) [...chars].forEach((ch, i) => {
    const bars = NW5[barOrder[i]], sp = ["n", "n", "n", "n"]; sp[wideSpace] = "w";
    t[ch] = bars[0] + sp[0] + bars[1] + sp[1] + bars[2] + sp[2] + bars[3] + sp[3] + bars[4];
  });
  // $ / + %: vạch đều hẹp, 3 khoảng rộng
  [["$", 3], ["/", 2], ["+", 1], ["%", 0]].forEach(([ch, narrow]) => { const sp = ["w", "w", "w", "w"]; sp[narrow] = "n"; t[ch] = "n" + sp[0] + "n" + sp[1] + "n" + sp[2] + "n" + sp[3] + "n"; });
  return t;
})();
export function code39Check(s) { return C39_CHARS[[...s].reduce((a, c) => a + C39_CHARS.indexOf(c), 0) % 43]; }
function code39(text, opts = {}) {
  const s = String(text).toUpperCase();
  if (!s) fail("Hãy nhập nội dung.");
  const bad = [...new Set([...s].filter((c) => !C39_CHARS.includes(c)))];
  if (bad.length) fail(`Code 39 chỉ nhận chữ in hoa không dấu A–Z, số 0–9 và các ký tự - . khoảng trắng $ / + %. Không nhận: ${bad.join(" ")}`);
  const full = s + (opts.check ? code39Check(s) : "");
  const W = 3;
  const enc = (ch) => [...C39[ch]].map((x, k) => (k % 2 ? "0" : "1").repeat(x === "w" ? W : 1)).join("");
  const m = ["*", ...full, "*"].map(enc).join("0");
  return { modules: m, text: full, guards: [], hrt: [{ text: full, from: 0, to: m.length }], quiet: [10, 10] };
}

/* ---------- Code 128 (tự chọn bảng A/B/C để mã ngắn nhất) ---------- */
export const C128 = ["212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112"];
const START = { A: 103, B: 104, C: 105 }, TO = { A: 101, B: 100, C: 99 }, STOP = 106;

/** Chuỗi → dãy giá trị Code 128 (gồm ký tự bắt đầu và số kiểm tra, chưa có STOP) */
export function code128Values(text) {
  const s = String(text);
  if (!s) fail("Hãy nhập nội dung.");
  const bad = [...new Set([...s].filter((c) => c.charCodeAt(0) > 127))];
  if (bad.length) fail(`Code 128 chỉ nhận ký tự ASCII (chữ không dấu, số, ký hiệu). Không nhận: ${bad.join(" ")}`);
  const isD = (i) => i < s.length && s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57;
  const digitRun = (i) => { let j = i; while (isD(j)) j++; return j - i; };
  const ctrl = (i) => s.charCodeAt(i) < 32;
  const valIn = (set, c) => (set === "A" ? (c < 32 ? c + 64 : c - 32) : c - 32);
  const fits = (set, c) => (set === "A" ? c < 96 : c >= 32);
  const n = s.length, vals = [];
  const run0 = digitRun(0);
  let set = run0 >= 4 || (run0 === n && n % 2 === 0) ? "C" : ctrl(0) ? "A" : "B";
  vals.push(START[set]);
  let i = 0;
  while (i < n) {
    if (set === "C") {
      if (digitRun(i) >= 2) { vals.push(+s.substr(i, 2)); i += 2; continue; }
      set = ctrl(i) ? "A" : "B";
      vals.push(TO[set]);
      continue;
    }
    // dãy số đủ dài (≥ 4 ở cuối chuỗi, ≥ 6 ở giữa) thì sang bảng C; dãy lẻ mã một số ở bảng hiện tại trước
    const run = digitRun(i);
    if ((run >= 4 && i + run === n) || run >= 6) {
      if (run % 2) { vals.push(valIn(set, s.charCodeAt(i))); i++; }
      set = "C"; vals.push(TO.C);
      continue;
    }
    const c = s.charCodeAt(i);
    if (!fits(set, c)) {
      const other = set === "A" ? "B" : "A";
      // chỉ một ký tự lệch bảng: dùng SHIFT (98) thay vì đổi hẳn bảng
      if (i + 1 < n && fits(set, s.charCodeAt(i + 1))) { vals.push(98, valIn(other, c)); i++; continue; }
      set = other; vals.push(TO[set]);
      continue;
    }
    vals.push(valIn(set, c)); i++;
  }
  let sum = vals[0];
  for (let k = 1; k < vals.length; k++) sum += vals[k] * k;
  vals.push(sum % 103);
  return vals;
}
function code128(text) {
  const vals = code128Values(text);
  let m = "";
  for (const v of [...vals, STOP]) [...C128[v]].forEach((w, k) => { m += (k % 2 ? "0" : "1").repeat(+w); });
  const shown = String(text).replace(/[\x00-\x1f\x7f]/g, "·");
  return { modules: m, text: String(text), guards: [], hrt: [{ text: shown, from: 0, to: m.length }], quiet: [10, 10] };
}

export const TYPES = {
  ean13: { name: "EAN-13", enc: ean13, hint: "12 hoặc 13 chữ số. Mã sản phẩm bán lẻ ở Việt Nam bắt đầu bằng 893." },
  ean8: { name: "EAN-8", enc: ean8, hint: "7 hoặc 8 chữ số, cho sản phẩm nhỏ." },
  upca: { name: "UPC-A", enc: upca, hint: "11 hoặc 12 chữ số (Mỹ, Canada)." },
  code128: { name: "Code 128", enc: code128, hint: "Chữ không dấu, số, ký hiệu. Dùng cho mã nội bộ, vận đơn, kho hàng." },
  code39: { name: "Code 39", enc: code39, hint: "Chữ in hoa không dấu, số và - . $ / + % khoảng trắng." },
  itf14: { name: "ITF-14", enc: itf14, hint: "13 hoặc 14 chữ số, in trên thùng carton." }
};

export function encode(type, text, opts) {
  const t = TYPES[type];
  if (!t) fail("Không có loại mã " + type);
  if (!String(text ?? "").trim()) fail("Hãy nhập nội dung.");
  return t.enc(String(text).trim(), opts);
}

/** Gộp các ô vạch liền nhau thành dải: [{ x, w, long }] */
export function bars(code) {
  const out = [], g = new Set(code.guards);
  const m = code.modules;
  for (let i = 0; i < m.length; i++) {
    if (m[i] !== "1") continue;
    let j = i;
    while (j < m.length && m[j] === "1" && g.has(j) === g.has(i)) j++;
    out.push({ x: i, w: j - i, long: g.has(i) });
    i = j - 1;
  }
  return out;
}

const escXml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** Bố cục chung cho SVG và canvas. o: { module (px mỗi ô), height (px vạch), text: bool, fontSize, margin (ô) } */
export function layout(code, o = {}) {
  const mod = o.module || 2, hgt = o.height || 80, showText = o.text !== false;
  const fs = o.fontSize || Math.max(10, Math.round(mod * 9));
  const hrtOut = code.hrt.filter((p) => p.from < 0 || p.to > code.modules.length);
  const qL = Math.max(code.quiet[0], o.margin ?? 0, showText && hrtOut.some((p) => p.from < 0) ? 10 : 0);
  const qR = Math.max(code.quiet[1], o.margin ?? 0, showText && hrtOut.some((p) => p.to > code.modules.length) ? 10 : 0);
  const bearer = code.bearer ? Math.max(2, Math.round(mod * 2)) : 0;
  const hasGuards = code.guards.length > 0;
  const textH = showText ? Math.round(fs * 1.25) : 0;
  const top = Math.round(mod * 4) + bearer;
  const width = (qL + code.modules.length + qR) * mod;
  const height = top + hgt + (hasGuards ? 0 : textH ? Math.round(fs * 0.3) : 0) + textH + bearer + Math.round(mod * 4);
  return { mod, hgt, fs, qL, width, height, top, bearer, textH, hasGuards, showText };
}

/** Chuỗi SVG của mã vạch */
export function toSvg(code, o = {}) {
  const L = layout(code, o), fg = o.fg || "#000", bg = o.bg || "#fff";
  const ext = L.hasGuards ? Math.round(L.fs * 0.55) : 0;
  let r = "";
  for (const b of bars(code)) r += `<rect x="${(L.qL + b.x) * L.mod}" y="${L.top}" width="${b.w * L.mod}" height="${L.hgt + (b.long ? ext : 0)}"/>`;
  if (L.bearer) {
    const x0 = (L.qL - code.quiet[0] / 2) * L.mod, x1 = (L.qL + code.modules.length + code.quiet[1] / 2) * L.mod;
    r += `<rect x="${x0}" y="${L.top - L.bearer}" width="${x1 - x0}" height="${L.bearer}"/><rect x="${x0}" y="${L.top + L.hgt}" width="${x1 - x0}" height="${L.bearer}"/>`;
  }
  let t = "";
  if (L.showText) {
    const y = L.top + L.hgt + L.bearer + (L.hasGuards ? Math.round(L.fs * 0.9) : Math.round(L.fs * 1.1));
    for (const p of code.hrt) {
      const cx = (L.qL + (p.from + p.to) / 2) * L.mod;
      const fs = p.small ? Math.round(L.fs * 0.8) : L.fs;
      t += `<text x="${cx}" y="${y}" font-size="${fs}" text-anchor="middle">${escXml(p.text)}</text>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.width}" height="${L.height}" viewBox="0 0 ${L.width} ${L.height}">` +
    (bg === "transparent" ? "" : `<rect width="100%" height="100%" fill="${escXml(bg)}"/>`) +
    `<g fill="${escXml(fg)}" shape-rendering="crispEdges">${r}</g>` +
    (t ? `<g fill="${escXml(fg)}" font-family="'OCR-B','Consolas','Menlo','DejaVu Sans Mono',monospace">${t}</g>` : "") + "</svg>";
}
