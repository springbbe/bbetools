/* Giải thích cron: diễn giải biểu thức cron bằng tiếng Việt, liệt kê 10 lần chạy tiếp theo theo giờ Việt Nam/UTC/giờ máy */
import { h, LANG } from "../core.js";
import { textTool } from "../frames/text.js";
import { parseCron, describe, nextRuns } from "../lib/cron.js";
import { formatVN, relative } from "../lib/timestamp.js";

const EXAMPLES = [["*/5 * * * *", "mỗi 5 phút"], ["0 9 * * 1-5", "9 giờ sáng các ngày làm việc"], ["30 2 * * *", "2:30 sáng mỗi ngày"], ["0 0 1 * *", "nửa đêm ngày 1 hằng tháng"], ["0 */6 * * *", "mỗi 6 giờ"], ["0 8 * * 1#1", "8 giờ thứ Hai đầu tiên của tháng"], ["@weekly", "hằng tuần"]];
let tool;

tool = textTool({
  mono: true,
  single: true,
  inputLabel: "Biểu thức cron",
  outputLabel: "Diễn giải",
  placeholder: "*/15 9-17 * * 1-5",
  sample: "*/15 9-17 * * 1-5",
  initial: () => "0 9 * * 1-5",
  options: [{ id: "tz", label: "Múi giờ", value: LANG === "vi" ? "vn" : "local", choices: [["vn", "Việt Nam (UTC+7)"], ["utc", "UTC (máy chủ thường dùng)"], ["local", "Giờ của máy này"]] }],
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
      out.append(h("p", { class: "opt-title", text: "Ví dụ (bấm để thử)" }), h("ul", { class: "chip-list sm-chips" }, EXAMPLES.map(([e, d]) => h("li", null, h("button", { class: "chip", type: "button", onclick: () => tool.setText(e), title: d }, h("code", { text: e }), h("small", { text: d }))))));
      return;
    }
    const F = ["second", "minute", "hour", "dom", "month", "dow"].filter((k) => k !== "second" || r.c.hasSeconds);
    const NAMES = { second: "Giây", minute: "Phút", hour: "Giờ", dom: "Ngày", month: "Tháng", dow: "Thứ" };
    out.append(
      h("p", { class: "result-big", text: r.text }),
      r.cmd ? h("p", { class: "hint" }, "Lệnh chạy: ", h("code", { text: r.cmd })) : "",
      h("div", { class: "cron-fields" }, F.map((k) => h("div", null, h("code", { text: r.c.fields[k].src }), h("small", { text: NAMES[k] })))),
      h("p", { class: "opt-title", text: "10 lần chạy tiếp theo" }),
      r.runs.length ? h("ol", { class: "cron-runs" }, r.runs.map((ms) => h("li", null, formatVN(ms, r.off ?? -new Date(ms).getTimezoneOffset()), h("small", { text: " · " + relative(ms, Date.now()) })))) : h("p", { class: "hint", text: "Không có lần chạy nào trong 5 năm tới (ví dụ ngày 30/2)." }),
      h("p", { class: "hint", text: "Khi cả ô Ngày và ô Thứ cùng được đặt, cron chạy vào ngày khớp một trong hai (không phải cả hai)." }));
  }
});
