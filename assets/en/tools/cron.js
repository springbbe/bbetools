/* Tự sinh bởi scripts/build.js từ assets/tools/cron.js và i18n/en/js/ — đừng sửa tay. */
/* Giải thích cron: diễn giải biểu thức cron bằng tiếng Việt, liệt kê 10 lần chạy tiếp theo theo giờ Việt Nam/UTC/giờ máy */
import { h, LANG } from "../core.js";
import { textTool } from "../frames/text.js";
import { parseCron, describe, nextRuns } from "../lib/cron.js";
import { formatVN, relative } from "../lib/timestamp.js";

const EXAMPLES = [["*/5 * * * *", "every 5 minutes"], ["0 9 * * 1-5", "9 AM on weekdays"], ["30 2 * * *", "2:30 AM every day"], ["0 0 1 * *", "midnight on the 1st of each month"], ["0 */6 * * *", "every 6 hours"], ["0 8 * * 1#1", "8 AM on the first Monday of the month"], ["@weekly", "weekly"]];
let tool;

tool = textTool({
  mono: true,
  single: true,
  inputLabel: "Cron expression",
  outputLabel: "Explanation",
  placeholder: "*/15 9-17 * * 1-5",
  sample: "*/15 9-17 * * 1-5",
  initial: () => "0 9 * * 1-5",
  options: [{ id: "tz", label: "Time zone", value: LANG === "vi" ? "vn" : "local", choices: [["vn", "Vietnam (UTC+7)"], ["utc", "UTC (common on servers)"], ["local", "This device's time"]] }],
  output: "custom",
  transform(text, o) {
    const line = text.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#")) || "";
    if (!line) return { text: "" };
    // dòng crontab có lệnh phía sau: lấy 5 trường đầu (6 nếu trường thứ 6 vẫn là cú pháp cron, tức có giây)
    const parts = line.split(/\s+/);
    const isField = (x) => x != null && /^([\d*?/,LW#-]|[A-Z]{3})+$/i.test(x);
    const n = line.startsWith("@") ? 1 : isField(parts[5]) ? 6 : 5;
    const c = parseCron(parts.slice(0, n).join(" "));
    const off = o.tz === "vn" ? 420 : o.tz === "utc" ? 0 : null;
    return { text: describe(c), c, runs: nextRuns(c, Date.now(), 10, off), off, cmd: parts.slice(n).join(" ") };
  },
  render(out, r) {
    out.textContent = "";
    out.classList.remove("out");
    out.classList.add("cron-out");
    if (!r.c) {
      out.append(h("p", { class: "opt-title", text: "Examples (click to try)" }), h("ul", { class: "chip-list sm-chips" }, EXAMPLES.map(([e, d]) => h("li", null, h("button", { class: "chip", type: "button", onclick: () => tool.setText(e), title: d }, h("code", { text: e }), h("small", { text: d }))))));
      return;
    }
    const F = ["second", "minute", "hour", "dom", "month", "dow"].filter((k) => k !== "second" || r.c.hasSeconds);
    const NAMES = { second: "Second", minute: "Minute", hour: "Hour", dom: "Day", month: "Month", dow: "Weekday" };
    out.append(
      h("p", { class: "result-big", text: r.text }),
      r.cmd ? h("p", { class: "hint" }, "Command: ", h("code", { text: r.cmd })) : "",
      h("div", { class: "cron-fields" }, F.map((k) => h("div", null, h("code", { text: r.c.fields[k].src }), h("small", { text: NAMES[k] })))),
      h("p", { class: "opt-title", text: "Next 10 runs" }),
      r.runs.length ? h("ol", { class: "cron-runs" }, r.runs.map((ms) => h("li", null, formatVN(ms, r.off ?? -new Date(ms).getTimezoneOffset()), h("small", { text: " · " + relative(ms, Date.now()) })))) : h("p", { class: "hint", text: "No runs in the next 5 years (e.g. February 30)." }),
      h("p", { class: "hint", text: "When both the Day and Weekday fields are set, cron runs on days matching either one (not both)." }));
  }
});
