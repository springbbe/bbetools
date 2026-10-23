/* Tự sinh bởi scripts/build.js từ assets/tools/password-strength.js và i18n/en/js/ — đừng sửa tay. */
/* Kiểm tra độ mạnh mật khẩu: zxcvbn-ts (từ điển mật khẩu phổ biến, tên, từ tiếng Anh, mẫu bàn phím, ngày tháng…) + từ điển tiếng Việt,
   ước tính thời gian dò ra ở 4 kịch bản tấn công. Mật khẩu chỉ nằm trong ô nhập, không lưu, không gửi đi. */
import { h, lib, passwordField } from "../core.js";
import { formTool } from "../frames/form.js";
import { durationVi, ATTACKS } from "../lib/mat-khau.js";
import { removeAccents } from "../lib/van-ban.js";
import { strengthMeter } from "../security.js";
import { kv, alert } from "../calc.js";

// mật khẩu, tên, từ hay gặp ở Việt Nam (xếp gần đúng theo độ phổ biến, viết không dấu)
const VI = ("matkhau anhyeuem emyeuanh yeuem yeuanh iloveyou vietnam hanoi saigon matkhau123 anhyeuem123 vietnam123 123456a a123456 aa123456 " +
  "toiyeuban yeuemnhieu yeuanhnhieu anhyeuemnhieu emyeuanhnhieu tinhyeu hanhphuc giadinh muonnam thienthan ngoisao matroi muaxuan muadong muathu muaha " +
  "conmeo concho cuncon beyeu chongyeu voyeu embe anhtrai chigai bame bome ongba matkhaumoi doimatkhau taikhoan dangnhap xinchao tambiet " +
  "nguyen tran le pham hoang huynh phan vu vo dang bui do ho ngo duong ly dinh trinh truong lam luong cao doan ha kieu ta quach mac thai " +
  "anh linh trang huong hung dung tuan minh nam hai long thao ngoc lan hoa phuong thu quang duc thanh hieu trung khanh huy viet tien son binh " +
  "an bao chi dat giang hanh hang hien hoai hong khoa kien lien loan my nga nhung oanh phuc quan quynh tam thang thuy toan tu uyen van vinh xuan yen " +
  "nhi vy hao phong cuong dao diep duy hau hue huyen khang khoi loc luan mai nhan nhat phat quoc tai thien thinh thong truc tung vu " +
  "danang haiphong cantho hue nhatrang dalat vungtau quangninh thanhhoa nghean namdinh thaibinh bacninh dongnai binhduong " +
  "manchester chelsea arsenal barcelona realmadrid messi ronaldo").split(" ");

const T = {
  warnings: {
    straightRow: "Keys next to each other on a keyboard row are very easy to guess.",
    keyPattern: "Short keyboard patterns are very easy to guess.",
    simpleRepeat: "Repeated characters like “aaa” are very easy to guess.",
    extendedRepeat: "Repeated groups like “abcabcabc” are very easy to guess.",
    sequences: "Sequences like “abc”, “123” are very easy to guess.",
    recentYears: "Recent years are very easy to guess.",
    dates: "Dates are very easy to guess.",
    topTen: "This is one of the most used passwords in the world.",
    topHundred: "This is a very commonly used password.",
    common: "This is a common password found in password-cracking lists.",
    similarToCommon: "This password is very similar to a common password.",
    wordByItself: "A single word is very easy to guess.",
    namesByThemselves: "A first or last name on its own is very easy to guess.",
    commonNames: "Common first and last names are very easy to guess.",
    userInputs: "Avoid using personal information.",
    pwned: "This password has been exposed in data breaches."
  },
  suggestions: {
    l33t: "Don't replace letters with predictable symbols like “@” for “a”, “0” for “o”.",
    reverseWords: "Don't spell a common word backwards.",
    allUppercase: "Capitalize some letters, not all of them.",
    capitalization: "Capitalize letters other than just the first.",
    dates: "Avoid your birthdays and anniversaries.",
    recentYears: "Avoid recent years.",
    associatedYears: "Avoid years that are meaningful to you.",
    sequences: "Avoid sequences of characters.",
    repeated: "Avoid repeated words and characters.",
    longerKeyboardPattern: "If you use a keyboard pattern, make it longer with several changes of direction.",
    anotherWord: "Add a few more uncommon words.",
    useWords: "Use several words together, but avoid familiar phrases.",
    noNeed: "You don't need symbols, digits or uppercase for a strong password — what matters is length.",
    pwned: "If you use this password anywhere, change it now."
  },
  timeEstimation: { ltSecond: "under 1 second", second: "{base} seconds", seconds: "{base} seconds", minute: "{base} minutes", minutes: "{base} minutes", hour: "{base} hours", hours: "{base} hours", day: "{base} days", days: "{base} days", month: "{base} months", months: "{base} months", year: "{base} years", years: "{base} years", centuries: "centuries" }
};
const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const DICT = { "passwords-common": "common password", "diceware-common": "common word", "commonWords-en": "English word", "wikipedia-en": "English word", "firstnames-en": "first name", "lastnames-en": "last name", vi: "Vietnamese word or name", userInputs: "personal information" };
function describe(m) {
  switch (m.pattern) {
    case "dictionary": return (m.reversed ? "reversed " : "") + (DICT[m.dictionaryName] || "dictionary") + (m.l33t ? " (letters replaced with symbols)" : "") + (m.rank ? ` — rank ${m.rank.toLocaleString("en-US")}` : "");
    case "spatial": return "adjacent keyboard keys";
    case "repeat": return "repetition";
    case "sequence": return "sequence";
    case "regex": return m.regexName === "recentYear" ? "recent year" : "predictable pattern";
    case "date": return "date";
    case "separator": return "separator";
    case "wordSequence": return "familiar word sequence";
    default: return "random characters";
  }
}

let engine = null, loading = null;
function load(api) {
  if (!loading) loading = Promise.all([lib("zxcvbn"), lib("zxcvbnCommon"), lib("zxcvbnEn")]).then(([core, common, en]) => {
    engine = new core.ZxcvbnFactory({
      dictionary: { ...common.dictionary, ...en.dictionary, vi: VI },
      graphs: common.adjacencyGraphs,
      translations: T,
      useLevenshteinDistance: true
    });
    api.update();
  }).catch((e) => { loading = null; api.out.textContent = ""; api.out.append(alert("err", e.userMsg || e.message)); });
  return loading;
}

let pw;
formTool({
  share: false,
  fields: [{
    id: "pw", type: "custom", url: false,
    render() {
      pw = passwordField({ id: "f-pw", placeholder: "Type the password to check", "aria-label": "Password", autocomplete: "off" });
      pw.input.classList.add("mono");
      return { el: h("div", { class: "field" }, h("label", { for: "f-pw", text: "Password" }), pw.el, h("small", { text: "Not saved, not sent. It's still wise to test a similar password instead of the real one you use." })), get: () => pw.input.value, set: (v) => { pw.input.value = v; } };
    }
  }],
  init(api) { load(api); setTimeout(() => pw.input.focus(), 50); },
  compute(v, out) {
    out.textContent = "";
    const p = v.pw;
    if (!engine) { out.append(h("p", { class: "hint" }, h("span", { class: "spinner sm" }), " Loading the password dictionary (about 1 MB, first time only)…")); return; }
    if (!p) { out.append(h("p", { class: "hint", text: "Type a password to see the assessment. Results update as you type." })); return; }
    // tiếng Việt có dấu: kiểm tra cả bản bỏ dấu (người dùng hay gõ không dấu), lấy kết quả yếu hơn
    const r1 = engine.check(p), plain = removeAccents(p);
    const r = plain !== p ? [r1, engine.check(plain)].sort((a, b) => a.guessesLog10 - b.guessesLog10)[0] : r1;
    out.append(strengthMeter(r.score, LABELS[r.score]));
    const fb = r.feedback;
    if (fb.warning) out.append(alert(r.score < 3 ? "err" : "warn", fb.warning));
    else if (r.score >= 4) out.append(alert("ok", "This password is hard to guess. Use it for just one account and keep it in a password manager."));
    if (fb.suggestions && fb.suggestions.length) out.append(h("ul", { class: "pw-tips" }, fb.suggestions.map((s) => h("li", { text: s }))));
    const ids = { online: "onlineThrottlingXPerHour", "online-fast": "onlineNoThrottlingXPerSecond", "offline-slow": "offlineSlowHashingXPerSecond", "offline-fast": "offlineFastHashingXPerSecond" };
    out.append(h("p", { class: "opt-title", text: "Time to crack" }),
      kv(ATTACKS.map((a) => [a.label + " (" + a.note + ")", durationVi(r.crackTimes[ids[a.id]].seconds)])));
    const chars = [/[a-z]/.test(plain) && "lowercase", /[A-Z]/.test(plain) && "uppercase", /\d/.test(p) && "digits", /[^A-Za-z0-9\s]/.test(plain) && "symbols", /\s/.test(p) && "spaces", plain !== p && "accented letters"].filter(Boolean);
    out.append(h("p", { class: "opt-title", text: "Analysis" }),
      h("p", { class: "hint", text: `${[...p].length} characters: ${chars.join(", ")}. About 10^${Math.round(r.guessesLog10)} guesses needed.` }),
      h("ul", { class: "pw-parts" }, r.sequence.map((m) => h("li", { class: m.pattern === "bruteforce" ? "good" : "bad" }, h("code", { text: m.token }), h("span", { text: describe(m) })))));
    if (plain !== p) out.append(h("p", { class: "hint", text: "Note: accented letters may not be typeable on some devices, and many websites strip accents. The result above uses the unaccented version if it's weaker." }));
  }
});

const css = document.createElement("style");
css.textContent = `.pw-tips{margin:10px 0 0;padding-left:20px;display:grid;gap:4px;font-size:14.5px}
.pw-parts{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.pw-parts li{display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;border-radius:10px;font-size:13.5px;background:var(--surface-2);border:1px solid var(--line)}
.pw-parts li.bad{border-color:color-mix(in srgb,var(--err) 40%,var(--line))}.pw-parts li.good{border-color:color-mix(in srgb,var(--ok) 40%,var(--line))}
.pw-parts code{font-weight:700;overflow-wrap:anywhere}.pw-parts span{color:var(--muted)}`;
document.head.append(css);
