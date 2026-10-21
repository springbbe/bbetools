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
    straightRow: "Các phím nằm liền nhau trên một hàng bàn phím rất dễ đoán.",
    keyPattern: "Kiểu gõ theo hình trên bàn phím ngắn rất dễ đoán.",
    simpleRepeat: "Ký tự lặp lại như “aaa” rất dễ đoán.",
    extendedRepeat: "Cụm lặp lại như “abcabcabc” rất dễ đoán.",
    sequences: "Dãy liên tiếp như “abc”, “123” rất dễ đoán.",
    recentYears: "Năm gần đây rất dễ đoán.",
    dates: "Ngày tháng rất dễ đoán.",
    topTen: "Đây là một trong những mật khẩu bị dùng nhiều nhất thế giới.",
    topHundred: "Đây là mật khẩu được dùng rất nhiều.",
    common: "Đây là mật khẩu phổ biến, có sẵn trong danh sách dò mật khẩu.",
    similarToCommon: "Mật khẩu này gần giống một mật khẩu phổ biến.",
    wordByItself: "Một từ đứng riêng rất dễ đoán.",
    namesByThemselves: "Chỉ có tên hoặc họ thì rất dễ đoán.",
    commonNames: "Họ, tên phổ biến rất dễ đoán.",
    userInputs: "Không nên dùng thông tin cá nhân.",
    pwned: "Mật khẩu này đã bị lộ trong các vụ rò rỉ dữ liệu."
  },
  suggestions: {
    l33t: "Đừng thay chữ bằng ký tự dễ đoán như “@” thay “a”, “0” thay “o”.",
    reverseWords: "Đừng viết ngược một từ thông dụng.",
    allUppercase: "Viết hoa một vài chữ, không phải tất cả.",
    capitalization: "Viết hoa cả những chữ khác ngoài chữ đầu.",
    dates: "Tránh ngày sinh, ngày kỷ niệm của bạn.",
    recentYears: "Tránh các năm gần đây.",
    associatedYears: "Tránh năm sinh, năm có ý nghĩa với bạn.",
    sequences: "Tránh các dãy ký tự liên tiếp.",
    repeated: "Tránh lặp lại từ và ký tự.",
    longerKeyboardPattern: "Nếu gõ theo hình bàn phím, hãy dùng hình dài hơn và đổi hướng nhiều lần.",
    anotherWord: "Thêm vài từ ít phổ biến nữa.",
    useWords: "Dùng nhiều từ ghép lại, nhưng tránh câu quen thuộc.",
    noNeed: "Không cần ký tự đặc biệt, số hay chữ hoa vẫn tạo được mật khẩu mạnh — quan trọng là đủ dài.",
    pwned: "Nếu đang dùng mật khẩu này ở đâu, hãy đổi ngay."
  },
  timeEstimation: { ltSecond: "dưới 1 giây", second: "{base} giây", seconds: "{base} giây", minute: "{base} phút", minutes: "{base} phút", hour: "{base} giờ", hours: "{base} giờ", day: "{base} ngày", days: "{base} ngày", month: "{base} tháng", months: "{base} tháng", year: "{base} năm", years: "{base} năm", centuries: "hàng thế kỷ" }
};
const LABELS = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Mạnh"];
const DICT = { "passwords-common": "mật khẩu phổ biến", "diceware-common": "từ thông dụng", "commonWords-en": "từ tiếng Anh", "wikipedia-en": "từ tiếng Anh", "firstnames-en": "tên riêng", "lastnames-en": "họ", vi: "từ, tên tiếng Việt", userInputs: "thông tin cá nhân" };
function describe(m) {
  switch (m.pattern) {
    case "dictionary": return (m.reversed ? "viết ngược của " : "") + (DICT[m.dictionaryName] || "từ điển") + (m.l33t ? " (thay chữ bằng ký hiệu)" : "") + (m.rank ? ` — xếp hạng ${m.rank.toLocaleString("vi-VN")}` : "");
    case "spatial": return "phím liền nhau trên bàn phím";
    case "repeat": return "lặp lại";
    case "sequence": return "dãy liên tiếp";
    case "regex": return m.regexName === "recentYear" ? "năm gần đây" : "mẫu dễ đoán";
    case "date": return "ngày tháng";
    case "separator": return "dấu ngăn cách";
    case "wordSequence": return "dãy từ quen thuộc";
    default: return "ký tự ngẫu nhiên";
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
      pw = passwordField({ id: "f-pw", placeholder: "Gõ mật khẩu cần kiểm tra", "aria-label": "Mật khẩu", autocomplete: "off" });
      pw.input.classList.add("mono");
      return { el: h("div", { class: "field" }, h("label", { for: "f-pw", text: "Mật khẩu" }), pw.el, h("small", { text: "Không lưu, không gửi đi. Vẫn nên thử một mật khẩu tương tự thay vì mật khẩu thật đang dùng." })), get: () => pw.input.value, set: (v) => { pw.input.value = v; } };
    }
  }],
  init(api) { load(api); setTimeout(() => pw.input.focus(), 50); },
  compute(v, out) {
    out.textContent = "";
    const p = v.pw;
    if (!engine) { out.append(h("p", { class: "hint" }, h("span", { class: "spinner sm" }), " Đang tải từ điển mật khẩu (khoảng 1 MB, chỉ lần đầu)…")); return; }
    if (!p) { out.append(h("p", { class: "hint", text: "Gõ mật khẩu để xem đánh giá. Kết quả cập nhật ngay khi gõ." })); return; }
    // tiếng Việt có dấu: kiểm tra cả bản bỏ dấu (người dùng hay gõ không dấu), lấy kết quả yếu hơn
    const r1 = engine.check(p), plain = removeAccents(p);
    const r = plain !== p ? [r1, engine.check(plain)].sort((a, b) => a.guessesLog10 - b.guessesLog10)[0] : r1;
    out.append(strengthMeter(r.score, LABELS[r.score]));
    const fb = r.feedback;
    if (fb.warning) out.append(alert(r.score < 3 ? "err" : "warn", fb.warning));
    else if (r.score >= 4) out.append(alert("ok", "Mật khẩu khó đoán. Hãy dùng riêng cho một tài khoản và lưu trong trình quản lý mật khẩu."));
    if (fb.suggestions && fb.suggestions.length) out.append(h("ul", { class: "pw-tips" }, fb.suggestions.map((s) => h("li", { text: s }))));
    const ids = { online: "onlineThrottlingXPerHour", "online-fast": "onlineNoThrottlingXPerSecond", "offline-slow": "offlineSlowHashingXPerSecond", "offline-fast": "offlineFastHashingXPerSecond" };
    out.append(h("p", { class: "opt-title", text: "Thời gian để dò ra" }),
      kv(ATTACKS.map((a) => [a.label + " (" + a.note + ")", durationVi(r.crackTimes[ids[a.id]].seconds)])));
    const chars = [/[a-z]/.test(plain) && "chữ thường", /[A-Z]/.test(plain) && "chữ hoa", /\d/.test(p) && "chữ số", /[^A-Za-z0-9\s]/.test(plain) && "ký hiệu", /\s/.test(p) && "dấu cách", plain !== p && "chữ có dấu"].filter(Boolean);
    out.append(h("p", { class: "opt-title", text: "Phân tích" }),
      h("p", { class: "hint", text: `${[...p].length} ký tự: ${chars.join(", ")}. Cần khoảng 10^${Math.round(r.guessesLog10)} lần đoán.` }),
      h("ul", { class: "pw-parts" }, r.sequence.map((m) => h("li", { class: m.pattern === "bruteforce" ? "good" : "bad" }, h("code", { text: m.token }), h("span", { text: describe(m) })))));
    if (plain !== p) out.append(h("p", { class: "hint", text: "Lưu ý: chữ có dấu có thể không gõ được trên một số thiết bị, và nhiều trang web tự bỏ dấu. Kết quả trên đã tính theo bản không dấu nếu nó yếu hơn." }));
  }
});

const css = document.createElement("style");
css.textContent = `.pw-tips{margin:10px 0 0;padding-left:20px;display:grid;gap:4px;font-size:14.5px}
.pw-parts{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.pw-parts li{display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;border-radius:10px;font-size:13.5px;background:var(--surface-2);border:1px solid var(--line)}
.pw-parts li.bad{border-color:color-mix(in srgb,var(--err) 40%,var(--line))}.pw-parts li.good{border-color:color-mix(in srgb,var(--ok) 40%,var(--line))}
.pw-parts code{font-weight:700;overflow-wrap:anywhere}.pw-parts span{color:var(--muted)}`;
document.head.append(css);
