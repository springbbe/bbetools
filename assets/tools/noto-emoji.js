/* Tải emoji động: tìm trong danh sách Noto Animated Emoji (data/noto-emoji.json, tên tiếng Việt theo Unicode CLDR),
   tải file Google đã làm sẵn từ fonts.gstatic.com (GIF, WEBP động, PNG, SVG, Lottie; máy chủ cho trang web tải thẳng),
   hoặc tự vẽ Lottie thành GIF cỡ nhỏ hơn, nền tuỳ chọn ngay trên trình duyệt. */
import { h, ROOT, LANG, save, copyText, toast, debounce, replaceUrl, fmtSize } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { readList, filterList, fileUrl, fileName, FILES } from "../lib/noto-emoji.js";
import { say, btnIcon, fetchBlob, lottieData, lottieToGif } from "../sticker.js";

const HOST = "máy chủ Google Fonts (fonts.gstatic.com)";
const GROUPS = {
  "Smileys and emotions": "Mặt cười, cảm xúc", "People": "Con người", "Animals and nature": "Động vật, thiên nhiên",
  "Food and drink": "Đồ ăn, thức uống", "Travel and places": "Du lịch, địa điểm", "Activities and events": "Hoạt động, sự kiện",
  "Objects": "Đồ vật", "Symbols": "Biểu tượng", "Flags": "Cờ"
};
const css = document.createElement("style");
css.textContent = `
.ne-bar{display:grid;gap:10px;grid-template-columns:minmax(0,1fr) minmax(0,220px)}
@media (max-width:560px){.ne-bar{grid-template-columns:1fr}}
.ne-count{margin:10px 0 6px}
.ne-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:6px}
.ne-grid button{aspect-ratio:1;display:grid;place-items:center;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer}
.ne-grid button:hover,.ne-grid button:focus-visible{border-color:var(--brand)}
.ne-grid button[aria-pressed="true"]{border-color:var(--brand);box-shadow:0 0 0 2px var(--brand) inset}
.ne-grid img{width:100%;height:100%;object-fit:contain}
.ne-det{display:grid;gap:16px;grid-template-columns:180px minmax(0,1fr);align-items:start;padding:16px;margin:16px 0;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
@media (max-width:560px){.ne-det{grid-template-columns:1fr;justify-items:center;text-align:center}.ne-det .row{justify-content:center}}
.ne-pv{width:180px;aspect-ratio:1;display:grid;place-items:center;border-radius:14px;background:repeating-conic-gradient(var(--surface-2) 0 25%,transparent 0 50%) 0 0/16px 16px}
.ne-pv img{width:88%;height:88%;object-fit:contain}
.ne-det h2{margin:0 0 4px;font-size:20px}
.ne-meta{color:var(--muted);font-size:14px;margin:0 0 12px}
.ne-files{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
@media (max-width:560px){.ne-files{display:grid;grid-template-columns:1fr 1fr;width:100%}.ne-files .btn{white-space:normal}}
.ne-gif{display:flex;flex-wrap:wrap;gap:10px;align-items:end}
.ne-gif .field{min-width:130px}
.ne-empty{color:var(--muted);padding:20px 0;text-align:center}
`;
document.head.append(css);

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let list = [], groups = [], shown = [], sel = null, lottieCache = new Map();
    const nameOf = (e) => (LANG === "vi" ? e.vi || e.en : e.en || e.vi);

    const q = h("input", { id: "ne-q", class: "input", type: "search", autocomplete: "off", spellcheck: "false", placeholder: "Tìm: cười, tim, mèo, lửa… hoặc dán emoji", value: "" });
    const groupSel = h("select", { id: "ne-g", "aria-label": "Nhóm emoji" });
    const count = h("p", { class: "hint ne-count", "aria-live": "polite" });
    const grid = h("div", { class: "ne-grid", role: "list", "aria-label": "Danh sách emoji" });
    const status = h("div", { "aria-live": "polite" });
    const det = h("section", { class: "ne-det", hidden: true, "aria-label": "Emoji đang chọn" });
    el.append(
      h("div", { class: "ne-bar" },
        h("div", { class: "field" }, h("label", { for: "ne-q", text: "Tìm emoji" }), q),
        h("div", { class: "field" }, h("label", { for: "ne-g", text: "Nhóm" }), groupSel)),
      status, det, count, grid,
      h("p", { class: "hint" }, "Emoji động Noto của Google, phát hành theo giấy phép ",
        h("a", { href: "https://creativecommons.org/licenses/by/4.0/deed.vi", target: "_blank", rel: "noopener", text: "CC BY 4.0" }),
        ": dùng được cả cho mục đích thương mại, nhớ ghi nguồn “Noto Emoji, Google”."));

    /* --- danh sách --- */
    function render() {
      const g = +groupSel.value;
      shown = filterList(list, q.value, g);
      grid.textContent = "";
      const frag = document.createDocumentFragment();
      for (const e of shown) {
        const b = h("button", { type: "button", role: "listitem", title: nameOf(e), "aria-label": nameOf(e), "aria-pressed": sel === e ? "true" : "false", onclick: () => pick(e, true) },
          h("img", { src: fileUrl(e.cp, "svg"), alt: "", loading: "lazy", width: 40, height: 40, decoding: "async" }));
        e.btn = b;
        frag.append(b);
      }
      grid.append(frag);
      count.textContent = shown.length ? `${shown.length} emoji${q.value.trim() ? " khớp" : ""}. Bấm vào một emoji để xem bản động và tải về.` : "";
      if (!shown.length) grid.append(h("p", { class: "ne-empty", text: "Không tìm thấy emoji nào. Thử từ khác, bỏ dấu hoặc chọn nhóm “Tất cả”." }));
    }
    const rerender = debounce(render, 150);
    q.addEventListener("input", rerender);
    groupSel.addEventListener("change", render);

    /* --- emoji đang chọn --- */
    const sizeSel = h("select", { id: "ne-size" }, [[256, "256 px"], [160, "160 px"], [128, "128 px"], [96, "96 px"], [64, "64 px"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === +S.get("size", 128) })));
    sizeSel.addEventListener("change", () => S.set("size", +sizeSel.value));
    const bgSel = h("select", { id: "ne-bg" }, [["", "Trong suốt"], ["#ffffff", "Trắng"], ["#000000", "Đen"]].map(([v, l]) => h("option", { value: v, text: l, selected: v === S.get("bg", "") })));
    bgSel.addEventListener("change", () => S.set("bg", bgSel.value));

    function pick(e, scroll) {
      if (sel && sel.btn) sel.btn.setAttribute("aria-pressed", "false");
      sel = e;
      if (e.btn) e.btn.setAttribute("aria-pressed", "true");
      replaceUrl(location.pathname + "?e=" + e.cp);
      const nm = nameOf(e);
      const codes = e.cp.split("_").map((x) => "U+" + x.toUpperCase()).join(" ");
      const fileBtn = (kind) => h("button", { class: "btn sm", type: "button", onclick: (ev) => grab(e, kind, ev.currentTarget) }, btnIcon("download"), h("span", { text: FILES[kind].label }));
      const gifBtn = h("button", { class: "btn", type: "button", onclick: () => makeGif(e, gifBtn) }, btnIcon("sparkles"), h("span", { text: "Tạo GIF" }));
      det.textContent = "";
      det.append(
        h("div", { class: "ne-pv" }, h("img", { src: fileUrl(e.cp, "webp"), alt: nm, width: 160, height: 160 })),
        h("div", null,
          h("h2", null, h("span", { text: e.ch + " " }), h("span", { text: nm })),
          h("p", { class: "ne-meta", text: [codes, GROUPS[groups[e.group]] || groups[e.group], LANG === "vi" && e.en && e.en !== nm ? e.en : ""].filter(Boolean).join(" · ") }),
          h("div", { class: "ne-files" },
            fileBtn("gif"), fileBtn("webp"), fileBtn("png"), fileBtn("svg"), fileBtn("lottie"),
            h("button", { class: "btn sm ghost", type: "button", onclick: () => copyText(e.ch, "Đã sao chép " + e.ch) }, btnIcon("copy"), h("span", { text: "Sao chép emoji" }))),
          h("p", { class: "hint", text: "GIF của Google có cỡ 512 px (thường vài trăm KB). Cần GIF nhẹ hơn hoặc có nền màu thì tạo GIF ngay tại đây:" }),
          h("div", { class: "ne-gif" },
            h("div", { class: "field" }, h("label", { for: "ne-size", text: "Cỡ GIF" }), sizeSel),
            h("div", { class: "field" }, h("label", { for: "ne-bg", text: "Nền" }), bgSel),
            gifBtn)));
      det.hidden = false;
      say(status, "", "");
      if (scroll) det.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    async function busy(btn, fn) {
      btn.disabled = true;
      const sp = h("span", { class: "spinner sm" });
      btn.prepend(sp);
      try { await fn(); }
      catch (err) { toast(err.userMsg || "Không tải được file.", { type: "err" }); if (!err.userMsg) console.error(err); }
      finally { btn.disabled = false; sp.remove(); }
    }
    const grab = (e, kind, btn) => busy(btn, async () => {
      const blob = await fetchBlob(fileUrl(e.cp, kind), undefined, { host: HOST, notFound: "Google chưa có file này cho emoji đã chọn." });
      save(blob, fileName(e, kind, nameOf(e)));
    });
    const makeGif = (e, btn) => busy(btn, async () => {
      let data = lottieCache.get(e.cp);
      if (!data) { data = await lottieData(await fetchBlob(fileUrl(e.cp, "lottie"), undefined, { host: HOST })); lottieCache.set(e.cp, data); }
      const size = +sizeSel.value, bg = bgSel.value;
      const gif = await lottieToGif(data, { size, bg });
      save(gif, fileName(e, "gif", nameOf(e)).replace(/\.gif$/, `-${size}px.gif`));
      toast(`Đã tạo GIF ${size} px (${fmtSize(gif.size)})`);
    });

    /* --- nạp dữ liệu --- */
    say(status, "info", "Đang tải danh sách emoji…");
    fetch(ROOT + "data/noto-emoji.json").then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then((data) => {
      groups = data.groups;
      list = readList(data);
      groupSel.append(h("option", { value: -1, text: "Tất cả" }), ...groups.map((g, i) => h("option", { value: i, text: GROUPS[g] || g })));
      groupSel.value = "-1";
      say(status, "", "");
      render();
      const want = new URLSearchParams(location.search).get("e");
      const e = want && list.find((x) => x.cp === want.toLowerCase());
      if (e) pick(e, false);
    }).catch(() => say(status, "err", "Không tải được danh sách emoji. Hãy tải lại trang."));
  }
});
