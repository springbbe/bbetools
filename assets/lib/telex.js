/* Sửa chữ gõ khi quên bật bộ gõ (hàm thuần): "Vieejt Nam" (Telex) hay "Vie65t Nam" (VNI) → "Việt Nam".
   Mỗi từ được "gõ lại" từng phím như Unikey; kết quả không phải âm tiết tiếng Việt hợp lệ thì giữ nguyên từ gốc
   (để không làm hỏng từ tiếng Anh, tên riêng, mã số…). */

const TONES = ["", "\u0301", "\u0300", "\u0309", "\u0303", "\u0323"]; // ngang, sắc, huyền, hỏi, ngã, nặng
const TELEX_TONE = { s: 1, f: 2, r: 3, x: 4, j: 5 };
const VOWELS = "aăâeêioôơuưy";
const isVowel = (c) => VOWELS.includes(c);

// vần (phần nguyên âm) hợp lệ, viết không thanh
const NUCLEI = new Set(("a ă â e ê i o ô ơ u ư y ai ao au ay âu ây eo êu ia iê iu oa oă oe oi ôi ơi oo ua uâ uê ui uô uơ uy ưa ưi ươ ưu " +
  "yê iêu oai oay oeo uây uôi ươi ươu uyê uya uyu yêu").split(" "));
const INITIAL = /^(ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x)?/;
const FINAL = /(ch|ng|nh|c|m|n|p|t)?$/;

/** Tách âm tiết (chữ thường, không thanh) → { ini, nuc, fin } hoặc null nếu không hợp lệ */
export function splitSyllable(s) {
  let ini = INITIAL.exec(s)[0];
  let rest = s.slice(ini.length);
  // "gi", "qu" + nguyên âm: i/u thuộc phụ âm đầu; "gi" đứng một mình ("gì") thì i là nguyên âm
  if (ini === "gi" && !rest.length) { ini = "g"; rest = "i"; }
  if (ini === "gi" && /^[^aăâeêoôơuưy]/.test(rest)) { ini = "g"; rest = "i" + rest; }
  const fin = FINAL.exec(rest)[0];
  const nuc = rest.slice(0, rest.length - fin.length);
  if (!nuc || !NUCLEI.has(nuc)) return null;
  if (fin && /^(ai|ao|au|ay|âu|ây|eo|êu|iu|oi|ôi|ơi|ui|ưi|ưu|iêu|oai|oay|oeo|uây|uôi|ươi|ươu|uyu|yêu|ia|ua|ưa|uya)$/.test(nuc)) return null;
  if (/^(c|ch|p|t)$/.test(fin) || fin === "") { /* thanh nào cũng được, kiểm tra riêng ở dưới */ }
  if ((ini === "k" || ini === "gh" || ini === "ngh") && !/^[eêiy]/.test(nuc)) return null;
  if (ini === "qu" && /^u/.test(nuc)) return null;
  return { ini, nuc, fin };
}

/** Vị trí nguyên âm mang thanh trong phần vần. style "old": hòa, thủy · "new": hoà, thuỷ */
export function tonePosition(nuc, fin, style = "old") {
  const chars = [...nuc];
  if (chars.length === 1) return 0;
  // nguyên âm có mũ/móc nhận thanh (ươ: đặt ở ơ)
  const special = chars.map((c, i) => ("ăâêôơư".includes(c) ? i : -1)).filter((i) => i >= 0);
  if (special.length) return special[special.length - 1];
  if (fin) return chars.length - 1;
  if (chars.length === 3) return 1;
  if (style === "new" && /^(oa|oe|uy)$/.test(nuc)) return 1;
  return 0;
}

const MARK = { a: { hat: "â", breve: "ă" }, e: { hat: "ê" }, o: { hat: "ô", horn: "ơ" }, u: { horn: "ư" } };

/** Gõ lại một từ (chỉ chữ cái ASCII và số). mode: "telex" | "vni" | "auto". Trả về null nếu không đổi được. */
export function typeWord(word, mode = "auto", style = "old") {
  if (mode === "auto") return typeWord(word, "telex", style) ?? typeWord(word, "vni", style);
  const out = [];      // { c (chữ thường không thanh), up }
  let tone = 0, used = false;
  const vowelIdx = () => out.map((x, i) => (isVowel(x.c) ? i : -1)).filter((i) => i >= 0);
  for (const raw of word) {
    const k = raw.toLowerCase(), up = raw !== k;
    const vs = vowelIdx();
    const push = () => out.push({ c: k, up });
    if (mode === "telex") {
      if (k in TELEX_TONE && vs.length) {
        if (tone === TELEX_TONE[k]) { tone = 0; push(); } else { tone = TELEX_TONE[k]; used = true; }
        continue;
      }
      if (k === "z" && vs.length && tone) { tone = 0; used = true; continue; }
      if (k === "d" && out.length && out[out.length - 1].c === "d" && out.length === 1) { out[0].c = "đ"; used = true; continue; }
      if ("aeo".includes(k) && vs.length) {
        const i = [...vs].reverse().find((j) => out[j].c === k || out[j].c === MARK[k].hat);
        if (i != null && i >= vs[0]) {
          if (out[i].c === MARK[k].hat) { out[i].c = k; push(); } else { out[i].c = MARK[k].hat; used = true; }
          continue;
        }
      }
      if (k === "w") {
        const s = out.map((x) => x.c).join("");
        const uo = s.lastIndexOf("uo");
        if (uo >= 0 && vs.includes(uo)) { out[uo].c = "ư"; out[uo + 1].c = "ơ"; used = true; continue; }
        const i = [...vs].reverse().find((j) => "aou".includes(out[j].c));
        if (i != null) { out[i].c = out[i].c === "a" ? "ă" : out[i].c === "o" ? "ơ" : "ư"; used = true; continue; }
        const j = [...vs].reverse().find((j) => "ăơư".includes(out[j].c));
        if (j != null) { out[j].c = out[j].c === "ă" ? "a" : out[j].c === "ơ" ? "o" : "u"; push(); continue; }
        if (!vs.length) { out.push({ c: "ư", up }); used = true; continue; }
      }
    } else {
      if (/[0-9]/.test(k)) {
        const n = +k;
        if (n >= 1 && n <= 5 && vs.length) { tone = n; used = true; continue; }
        if (n === 0 && vs.length && tone) { tone = 0; used = true; continue; }
        if (n === 9) { const i = out.findIndex((x) => x.c === "d"); if (i === 0) { out[0].c = "đ"; used = true; continue; } }
        if (n === 6 && vs.length) { const i = [...vs].reverse().find((j) => "aeo".includes(out[j].c)); if (i != null) { out[i].c = MARK[out[i].c].hat; used = true; continue; } }
        if (n === 7 && vs.length) {
          const s = out.map((x) => x.c).join(""), uo = s.lastIndexOf("uo");
          if (uo >= 0) { out[uo].c = "ư"; out[uo + 1].c = "ơ"; used = true; continue; }
          const i = [...vs].reverse().find((j) => "ou".includes(out[j].c)); if (i != null) { out[i].c = out[i].c === "o" ? "ơ" : "ư"; used = true; continue; }
        }
        if (n === 8 && vs.length) { const i = [...vs].reverse().find((j) => out[j].c === "a"); if (i != null) { out[i].c = "ă"; used = true; continue; } }
      }
    }
    push();
  }
  if (!used) return null;
  const plain = out.map((x) => x.c).join("");
  if (!/^[a-zđăâêôơư]+$/.test(plain)) return null;
  const syl = splitSyllable(plain);
  if (!syl) return null;
  // "ươ" không đứng cuối âm tiết: thuowr → thuở (như Unikey)
  if (syl.nuc === "ươ" && !syl.fin) { out[syl.ini.length].c = "u"; syl.nuc = "uơ"; }
  if (tone && /^(c|ch|p|t)$/.test(syl.fin) && tone !== 1 && tone !== 5) return null; // vần tắc chỉ có sắc/nặng
  if (tone) {
    const at = syl.ini.length + tonePosition(syl.nuc, syl.fin, style);
    out[at].c = (out[at].c + TONES[tone]).normalize("NFC");
  }
  return out.map((x) => (x.up ? x.c.toLocaleUpperCase("vi") : x.c)).join("");
}

// từ tiếng Anh hay gặp mà gõ kiểu Telex cũng ra âm tiết hợp lệ (this → thí, was → ứa…)
export const ENGLISH = new Set(("of as this his her or there if see now its how these most us is was has been must down own too last seem here " +
  "those turn room best per wow cow saw law raw ax ex ox ar er ur ir os vs sex tax fix mix box six max fax far for are ore were where").split(" "));

/** Sửa cả đoạn văn. o.keepEnglish: bỏ qua từ tiếng Anh thông dụng. Trả về { text, changed } */
export function fixTyping(text, { mode = "auto", style = "old", keepEnglish = true } = {}) {
  let changed = 0;
  const out = String(text ?? "").replace(/[A-Za-z][A-Za-z0-9]*/g, (w) => {
    if (keepEnglish && ENGLISH.has(w.toLowerCase())) return w;
    const r = typeWord(w, mode, style);
    if (r == null || r === w) return w;
    changed++;
    return r;
  });
  return { text: out, changed };
}
