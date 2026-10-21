/* Kiểm tra biểu thức chính quy (hàm thuần): dựng RegExp từ chuỗi người dùng nhập ("/abc/gi" hoặc "abc" + cờ),
   liệt kê kết quả khớp kèm nhóm bắt được, vị trí, và giải thích lỗi cú pháp bằng tiếng Việt. Chạy trong Web Worker
   (assets/regex-worker.js) để biểu thức lặp quá lâu không làm treo trang. */

/** "/a+b/gi" → { source: "a+b", flags: "gi" }; chuỗi thường giữ nguyên với cờ truyền vào */
export function splitLiteral(input, flags = "") {
  const m = /^\/([\s\S]+)\/([dgimsuvy]*)$/.exec(String(input ?? "").trim());
  return m ? { source: m[1], flags: m[2] } : { source: String(input ?? ""), flags };
}

const MSG = [
  [/Unterminated group|missing \)/i, "Thiếu dấu “)” đóng nhóm."],
  [/Unmatched '\)'|unmatched parentheses|Unmatched \)/i, "Thừa dấu “)”."],
  [/Unterminated character class|missing \]/i, "Thiếu dấu “]” đóng lớp ký tự."],
  [/Nothing to repeat/i, "Ký hiệu lặp (*, +, ?, {n}) đứng sau chỗ không có gì để lặp."],
  [/Invalid group/i, "Cú pháp nhóm không hợp lệ (kiểm tra (?…))."],
  [/Invalid flags|invalid regular expression flags/i, "Cờ không hợp lệ (chỉ dùng d, g, i, m, s, u, v, y, mỗi cờ một lần)."],
  [/Invalid escape|\\ at end of pattern/i, "Dấu “\\” đặt sai chỗ hoặc thoát ký tự không hợp lệ."],
  [/numbers out of order|Range out of order/i, "Khoảng bị ngược (ví dụ {5,2} hoặc [z-a])."],
  [/Invalid named capture|Duplicate capture group name/i, "Tên nhóm không hợp lệ hoặc bị trùng."],
  [/Lone quantifier|Incomplete quantifier/i, "Ký hiệu lặp {n,m} chưa đúng."]
];
export function explainError(e) {
  const m = String(e && e.message || e);
  const hit = MSG.find(([re]) => re.test(m));
  return hit ? hit[1] : "Biểu thức không hợp lệ: " + m.replace(/^Invalid regular expression: /, "");
}

/** Tên các nhóm bắt theo thứ tự xuất hiện (null nếu nhóm không đặt tên) */
export function groupNames(source) {
  const names = [];
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "\\") { i++; continue; }
    if (inClass) { if (c === "]") inClass = false; continue; }
    if (c === "[") { inClass = true; continue; }
    if (c !== "(") continue;
    if (source[i + 1] !== "?") names.push(null);
    else { const m = /^\(\?<([A-Za-z_$][\w$]*)>/.exec(source.slice(i)); if (m) names.push(m[1]); }
  }
  return names;
}

/** Chạy biểu thức trên văn bản. → { matches: [{ index, end, text, groups: [{ name, value, index }] }], groupNames, truncated } */
export function runRegex(source, flags, text, limit = 5000) {
  const re = new RegExp(source, flags.includes("d") ? flags : flags + "d");
  const matches = [];
  let truncated = false;
  const names = groupNames(source);
  const collect = (m) => {
    const groups = [];
    for (let i = 1; i < m.length; i++) groups.push({ i, name: names[i - 1] || null, value: m[i], index: m.indices[i] ? m.indices[i][0] : -1 });
    matches.push({ index: m.index, end: m.index + m[0].length, text: m[0], groups });
  };
  if (re.global || re.sticky) {
    let m;
    while ((m = re.exec(text))) {
      collect(m);
      if (m[0] === "") re.lastIndex += re.unicode || re.unicodeSets ? (text.codePointAt(m.index) > 0xffff ? 2 : 1) : 1;
      if (!re.global) break;
      if (matches.length >= limit) { truncated = true; break; }
    }
  } else {
    const m = re.exec(text);
    if (m) collect(m);
  }
  return { matches, truncated };
}

/** Thay thế bằng biểu thức (để xem trước) */
export function replaceRegex(source, flags, text, replacement) {
  return text.replace(new RegExp(source, flags), replacement);
}
