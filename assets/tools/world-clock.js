/* Đồng hồ thế giới: giờ hiện tại ở các thành phố (tự tính giờ mùa hè), so với giờ Việt Nam, giờ làm việc / ban đêm;
   đổi một mốc giờ ở thành phố này sang các thành phố khác (hẹn họp online). Dữ liệu múi giờ lấy từ chính trình duyệt. */
import { h, icon } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { CITIES, VN, zoned, offsetMin, fromZoned, fmtOffset, vsVietnam, isDst, dayLabel, WEEKDAYS } from "../lib/mui-gio.js";
import { removeAccents } from "../lib/van-ban.js";

const fold = (s) => removeAccents(s).toLowerCase();
const DEFAULT = ["Hà Nội", "Tokyo", "Seoul", "Sydney", "London", "Paris", "New York", "Los Angeles"];
const pad = (n) => String(n).padStart(2, "0");
const LOCAL = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || VN; } catch (_) { return VN; } })();
// thành phố ngoài danh sách: lấy từ danh sách múi giờ của trình duyệt
const extraZones = () => { try { return Intl.supportedValuesOf("timeZone"); } catch (_) { return []; } };
const zoneCity = (z) => ({ name: z.split("/").pop().replace(/_/g, " "), country: z.split("/")[0], zone: z, kw: z });

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let picked = S.get("cities", null);
    if (!Array.isArray(picked) || !picked.length) picked = DEFAULT.map((n) => { const c = CITIES.find((x) => x.name === n); return { name: c.name, country: c.country, zone: c.zone }; });
    const conv = { on: false, zone: LOCAL, date: "", time: "" };

    const localBig = h("div", { class: "wc-now" });
    const grid = h("div", { class: "wc-grid" });
    const q = h("input", { class: "input", type: "search", placeholder: "Thêm thành phố: Tokyo, Paris, Mỹ…", "aria-label": "Tìm thành phố để thêm", autocomplete: "off", oninput: suggest, onkeydown: (e) => { if (e.key === "Enter") { e.preventDefault(); const b = sug.querySelector("button"); if (b) b.click(); } } });
    const sug = h("div", { class: "wc-sug", role: "listbox", "aria-label": "Gợi ý thành phố" });
    // đổi giờ
    const today = zoned(LOCAL, Date.now());
    const dIn = h("input", { type: "date", value: `${today.y}-${pad(today.mo)}-${pad(today.d)}`, "aria-label": "Ngày", oninput: tick });
    const tIn = h("input", { type: "time", value: `${pad(today.h)}:00`, step: 60, "aria-label": "Giờ", oninput: tick });
    const zSel = h("select", { "aria-label": "Tại thành phố", onchange: tick });
    const convOn = h("input", { type: "checkbox", onchange: () => { conv.on = convOn.checked; convBox.classList.toggle("on", conv.on); tick(); } });
    const convBox = h("div", { class: "wc-conv" },
      h("label", { class: "switch" }, convOn, h("span", null, "Đổi giờ", h("small", { text: "Chọn một mốc giờ ở một thành phố, xem giờ tương ứng ở các nơi khác" }))),
      h("div", { class: "wc-conv-in" }, h("label", { class: "field" }, h("span", { text: "Ngày" }), dIn), h("label", { class: "field" }, h("span", { text: "Giờ" }), tIn), h("label", { class: "field" }, h("span", { text: "Tại" }), zSel)));
    el.append(h("div", { class: "wc" }, localBig, convBox, grid, h("div", { class: "wc-add" }, q, sug),
      h("p", { class: "hint", text: "Giờ mùa hè (DST) được tính tự động theo dữ liệu múi giờ của trình duyệt. Ô màu xanh: giờ hành chính (8–17h, thứ hai–thứ sáu)." })));

    function save() { S.set("cities", picked); }
    function fillZones() {
      const cur = zSel.value || LOCAL;
      zSel.textContent = "";
      const seen = new Set();
      [{ name: "Giờ của máy bạn", zone: LOCAL }, ...picked].forEach((c) => { if (seen.has(c.name + c.zone)) return; seen.add(c.name + c.zone); zSel.append(h("option", { value: c.zone, text: c.name + " (" + fmtOffset(offsetMin(c.zone)) + ")" })); });
      zSel.value = [...zSel.options].some((o) => o.value === cur) ? cur : LOCAL;
    }
    function moment() {
      if (!conv.on) return Date.now();
      const [y, mo, d] = dIn.value.split("-").map(Number), [hh, mi] = tIn.value.split(":").map(Number);
      if (!y || hh == null || Number.isNaN(hh)) return Date.now();
      return fromZoned(zSel.value, y, mo, d, hh, mi || 0);
    }
    function card(c, i, t, ref) {
      const p = zoned(c.zone, t), off = offsetMin(c.zone, t);
      const night = p.h < 6 || p.h >= 18, work = p.wd >= 1 && p.wd <= 5 && p.h >= 8 && p.h < 17;
      return h("article", { class: "wc-card" + (night ? " night" : "") + (work ? " wc-work" : "") },
        h("div", { class: "wc-head" },
          h("div", { class: "wc-name" }, h("b", { text: c.name }), h("small", { text: c.country })),
          h("button", { class: "ib sm", type: "button", title: "Bỏ " + c.name, "aria-label": "Bỏ " + c.name, html: icon("x"), onclick: () => { picked.splice(i, 1); save(); fillZones(); tick(); } })),
        h("div", { class: "wc-time", text: `${pad(p.h)}:${pad(p.mi)}`, "aria-label": `${c.name}: ${p.h} giờ ${p.mi} phút` }, conv.on ? "" : h("small", { text: ":" + pad(p.s) })),
        h("div", { class: "wc-day" }, h("span", { class: "wc-ico", title: night ? "Ban đêm" : "Ban ngày", html: icon(night ? "moon" : "sun") }),
          dayLabel(p, ref) + (dayLabel(p, ref).startsWith("Thứ") || dayLabel(p, ref).startsWith("Chủ") ? "" : " · " + WEEKDAYS[p.wd] + ", " + p.d + "/" + p.mo)),
        h("div", { class: "wc-off" }, fmtOffset(off) + (isDst(c.zone, t) ? " · giờ mùa hè" : ""), h("br"), vsVietnam(c.zone, t)));
    }
    function tick() {
      const t = moment(), ref = zoned(LOCAL, t), now = zoned(LOCAL, Date.now());
      localBig.textContent = "";
      if (conv.on) localBig.append(h("small", { text: "Mốc đang xem" }), h("b", { text: `${pad(ref.h)}:${pad(ref.mi)}` }), h("span", { text: `${WEEKDAYS[ref.wd]}, ${ref.d}/${ref.mo}/${ref.y} · giờ máy bạn (${fmtOffset(offsetMin(LOCAL, t))})` }));
      else localBig.append(h("small", { text: "Giờ của bạn" }), h("b", null, `${pad(now.h)}:${pad(now.mi)}`, h("small", { text: ":" + pad(now.s) })), h("span", { text: `${WEEKDAYS[now.wd]}, ${now.d}/${now.mo}/${now.y} · ${/^Asia\/(Saigon|Ho_Chi_Minh)$/.test(LOCAL) ? "Việt Nam" : LOCAL.replace(/_/g, " ")} (${fmtOffset(offsetMin(LOCAL))})` }));
      grid.textContent = "";
      picked.forEach((c, i) => grid.append(card(c, i, t, ref)));
    }
    function suggest() {
      const k = fold(q.value.trim());
      sug.textContent = "";
      if (!k) return;
      const have = new Set(picked.map((c) => c.name + c.zone));
      const pool = [...CITIES, ...extraZones().filter((z) => !CITIES.some((c) => c.zone === z)).map(zoneCity)];
      const hits = pool.filter((c) => !have.has(c.name + c.zone) && fold(c.name + " " + c.country + " " + c.kw + " " + c.zone).includes(k)).slice(0, 8);
      if (!hits.length) { sug.append(h("p", { class: "hint", text: "Không tìm thấy. Thử tên tiếng Anh hoặc tên nước." })); return; }
      for (const c of hits) sug.append(h("button", { class: "chip", type: "button", role: "option", onclick: () => { picked.push({ name: c.name, country: c.country, zone: c.zone }); save(); q.value = ""; sug.textContent = ""; fillZones(); tick(); q.focus(); } },
        h("span", { html: icon("plus"), style: { display: "contents" } }), c.name, h("small", { text: c.country + " · " + fmtOffset(offsetMin(c.zone)) })));
    }
    fillZones();
    tick();
    setInterval(() => { if (!conv.on) tick(); }, 1000);
  }
});

const css = document.createElement("style");
css.textContent = `.wc{display:grid;gap:16px}
.wc-now{display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:6px 0}
.wc-now>small{color:var(--muted);font-weight:600}.wc-now>b{font:800 clamp(48px,14vw,76px)/1 var(--mono);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.wc-now>b small{font-size:.45em;color:var(--muted)}.wc-now>span{color:var(--muted);font-size:14px}
.wc-conv{border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;gap:10px}
.wc-conv-in{display:none;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.wc-conv.on .wc-conv-in{display:grid}
.wc-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(min(100%,128px),1fr))}
.wc-card{border:1px solid var(--line);border-radius:14px;padding:10px 12px;min-width:0;display:grid;gap:4px;background:var(--surface)}
.wc-card.wc-work{border-color:color-mix(in srgb,var(--ok) 45%,var(--line));background:color-mix(in srgb,var(--ok-soft) 55%,var(--surface))}
.wc-card.night{background:color-mix(in srgb,var(--surface-2) 70%,var(--surface))}
.wc-card{position:relative}.wc-head{padding-right:26px}.wc-head .ib{position:absolute;top:4px;right:4px;width:30px;height:30px}
.wc-name{min-width:0;display:grid}.wc-name b{overflow-wrap:anywhere;line-height:1.25}.wc-name small{color:var(--muted);font-size:12.5px}
.wc-ico{display:inline-flex;vertical-align:-3px;margin-right:4px;color:var(--warn)}.wc-ico .i{width:16px;height:16px}.wc-card.night .wc-ico{color:var(--brand)}
.wc-time{font:800 clamp(26px,8vw,36px)/1.1 var(--mono);font-variant-numeric:tabular-nums}.wc-time small{font-size:.5em;color:var(--muted)}
.wc-day{font-weight:600;font-size:14px}.wc-off{color:var(--muted);font-size:13px}
.wc-add{display:grid;gap:8px}.wc-sug{display:flex;flex-wrap:wrap;gap:6px}.wc-sug .chip{white-space:normal}`;
document.head.append(css);
