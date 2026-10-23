/* Tự sinh bởi scripts/build.js từ assets/tools/regex-tester.js và i18n/en/js/ — đừng sửa tay. */
/* Kiểm tra regex: tô sáng chỗ khớp, liệt kê nhóm bắt được, xem trước thay thế; chạy trong Web Worker có giới hạn thời gian */
import { h, esc, fmtNum } from "../core.js";
import { textTool } from "../frames/text.js";
import { splitLiteral } from "../lib/regex.js";
import { runRegexTask } from "../regex-run.js";

const CHEAT = [["\\d", "digit"], ["\\w", "letter, digit, _"], ["\\s", "whitespace"], [".", "any character"], ["[abc]", "a, b or c"], ["[^abc]", "not a, b, c"], ["^ $", "start / end"], ["\\b", "word boundary"],
  ["* + ?", "0+, 1+, 0–1 times"], ["{2,5}", "2 to 5 times"], ["(…)", "capturing group"], ["(?<ten>…)", "named group"], ["a|b", "a or b"], ["(?=…)", "followed by"], ["\\p{L}", "letter (including accented, needs the u flag)"]];

textTool({
  mono: true,
  inputLabel: "Test text",
  outputLabel: "Result",
  placeholder: "Paste text to test the expression…",
  sample: (o) => Object.assign(o, { pattern: "(?<dau>0\\d{2,3})[ .]?(\\d{3})[ .]?(\\d{3,4})\\b", g: true, u: true, rep: "$<dau>-$2-$3" }) &&
    "Call: (555) 123-4567 (John), 555.234.5678 or 5559876543.\nThe office line 020 7946 0958 doesn't match the US pattern.",
  options: [
    { id: "pattern", type: "text", label: "Expression", placeholder: "\\d+ or /\\d+/g", wide: true, mono: true, persist: false },
    { id: "g", type: "check", label: "g – find all", value: true },
    { id: "i", type: "check", label: "i – ignore case", value: false },
    { id: "m", type: "check", label: "m – ^ $ per line", value: false },
    { id: "s", type: "check", label: "s – . also matches newlines", value: false },
    { id: "u", type: "check", label: "u – Unicode", value: true },
    { id: "rep", type: "text", label: "Replace with (optional)", placeholder: "$1, $<ten>, $&", wide: true, mono: true, persist: false }
  ],
  output: "custom",
  async transform(text, o) {
    if (!o.pattern) return { text: "" };
    let { source, flags } = splitLiteral(o.pattern, "");
    if (flags) { for (const f of "gimsu") o[f] = flags.includes(f); }
    flags = [..."gimsu"].filter((f) => o[f]).join("") + (flags.includes("y") ? "y" : "");
    const r = await runRegexTask("match", [source, flags, text, o.rep || null]);
    return { text: r.replaced ?? r.matches.map((m) => m.text).join("\n"), r, flags, source };
  },
  render(out, res, text) {
    out.textContent = "";
    out.classList.remove("out");
    out.classList.add("rx-out");
    if (!res.r) { out.append(h("div", { class: "rx-cheat" }, h("p", { class: "opt-title", text: "Quick syntax reference" }), h("dl", null, CHEAT.map(([k, v]) => [h("dt", null, h("code", { text: k })), h("dd", { text: v })])))); return; }
    const { matches, truncated } = res.r;
    out.append(h("p", { class: "tx-info" }, h("b", { text: matches.length ? `${fmtNum(matches.length)}${truncated ? "+" : ""} ${(truncated ? "+" : "") == 1 ? "match" : "matches"}` : "No match" }), ` · /${res.source}/${res.flags}`));
    // tô sáng trên văn bản
    let html = "", last = 0;
    matches.slice(0, 3000).forEach((m, i) => {
      html += esc(text.slice(last, m.index)) + `<mark class="hit h${i % 2}" title="#${i + 1}">${esc(m.text) || "<span class=\"hit-empty\">∅</span>"}</mark>`;
      last = m.end;
    });
    html += esc(text.slice(last));
    out.append(h("div", { class: "rx-text mono", html }));
    if (res.r.replaced != null) out.append(h("p", { class: "opt-title", text: "After replacing" }), h("div", { class: "rx-text mono", text: res.r.replaced }));
    if (matches.length) {
      const groups = matches[0].groups.length;
      const head = ["#", "Position", "Match", ...matches[0].groups.map((g) => (g.name ? `<${g.name}>` : "$" + g.i))];
      const rows = matches.slice(0, 200).map((m, i) => [i + 1, m.index, m.text, ...m.groups.map((g) => (g.value == null ? "–" : g.value))]);
      out.append(h("p", { class: "opt-title", text: groups ? `Details and ${groups} capturing ${(groups) == 1 ? "group" : "groups"}` : "Details" }),
        h("div", { class: "tbl-wrap tall" }, h("table", { class: "tbl" }, h("thead", null, h("tr", null, head.map((x) => h("th", { scope: "col", class: "l", text: String(x) })))),
          h("tbody", null, rows.map((r) => h("tr", null, r.map((c) => h("td", { class: "l mono", text: String(c) }))))))));
    }
  }
});
