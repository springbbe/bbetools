/* Tự sinh bởi scripts/build.js từ assets/tools/timestamp.js và i18n/en/js/ — đừng sửa tay. */
/* Đổi timestamp: Unix timestamp (giây, mili giây, micro, nano giây) ↔ ngày giờ Việt Nam (UTC+7), UTC, giờ máy; đồng hồ timestamp hiện tại */
import { h, icon, copyText, LANG } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseInput, formatVN, isoAt, relative, dayOfYear, offsetText } from "../lib/timestamp.js";
import { alert } from "../calc.js";

const localOff = (ms) => -new Date(ms).getTimezoneOffset();
const UNIT = { s: "seconds", ms: "milliseconds", us: "microseconds", ns: "nanoseconds", date: "date/time" };
const copyRow = (label, value, hl) => h("div", { class: "ts-row" + (hl ? " hl" : "") },
  h("span", { class: "ts-k", text: label }), h("code", { class: "ts-v", text: value }),
  h("button", { class: "ib sm", type: "button", "aria-label": "Copy " + label, title: "Copy", html: icon("copy"), onclick: () => copyText(value) }));

const nowBox = h("div", { class: "ts-now" });
function tickNow() {
  const ms = Date.now();
  nowBox.textContent = "";
  nowBox.append(h("span", { text: "Now" }), h("b", { text: String(Math.floor(ms / 1000)) }),
    h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(String(Math.floor(ms / 1000))) }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy"),
    h("small", { text: formatVN(ms, LANG === "vi" ? 420 : localOff(ms)) }));
}
setInterval(() => { if (!document.hidden) tickNow(); }, 1000);
tickNow();

formTool({
  fields: [
    { id: "q", type: "text", label: "Timestamp or date/time", placeholder: "1767225600 · 21/10/2026 14:30 · 2026-10-21T07:30:00Z", hint: "Leave empty = the current time. A 10-digit number is seconds, 13 digits is milliseconds." },
    { id: "tz", type: "select", label: "Input date/time time zone", value: LANG === "vi" ? "vn" : "local", choices: [["vn", "Vietnam (UTC+7)"], ["utc", "UTC (Coordinated Universal Time)"], ["local", "This device's time"]] }
  ],
  init(api) { api.form.prepend(nowBox); },
  compute(v, out) {
    out.textContent = "";
    const off = v.tz === "vn" ? 420 : v.tz === "utc" ? 0 : localOff(Date.now());
    const p = v.q.trim() ? parseInput(v.q, off) : { ms: Date.now(), unit: "now" };
    if (p.error) { out.append(alert("err", p.error)); return; }
    const ms = p.ms;
    if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) { out.append(alert("err", "The time is outside the range JavaScript can handle.")); return; }
    const lo = localOff(ms), mo = LANG === "vi" ? 420 : lo, d = dayOfYear(ms, mo); // trang tiếng Việt lấy giờ Việt Nam làm chính, ngôn ngữ khác lấy giờ máy
    out.append(
      h("p", { class: "result-big", text: formatVN(ms, mo) }),
      h("p", { class: "hint", text: `${LANG === "vi" ? "Vietnam time (UTC+7)" : `This device's time (UTC${offsetText(lo)})`} · ${relative(ms, Date.now())}` + (p.unit !== "now" ? ` · read as ${UNIT[p.unit]}` : "") }),
      h("div", { class: "ts-list" },
        copyRow("Unix (seconds)", String(Math.floor(ms / 1000)), true),
        copyRow("Unix (milliseconds)", String(ms)),
        copyRow("ISO 8601 (UTC)", isoAt(ms, 0)),
        LANG === "vi" ? copyRow("ISO 8601 (Vietnam time)", isoAt(ms, 420)) : copyRow(`ISO 8601 (UTC${offsetText(lo)})`, isoAt(ms, lo)),
        copyRow("UTC time", formatVN(ms, 0)),
        lo !== mo ? copyRow(`This device's time (UTC${offsetText(lo)})`, formatVN(ms, lo)) : null,
        copyRow("RFC 2822 (email, HTTP)", new Date(ms).toUTCString()),
        copyRow("Day of year / ISO week", `Day ${d.doy}, week ${d.week}`)));
  }
});
