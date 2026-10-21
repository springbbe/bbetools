/* Kiểm tra regex: tô sáng chỗ khớp, liệt kê nhóm bắt được, xem trước thay thế; chạy trong Web Worker có giới hạn thời gian */
import { h, esc, fmtNum } from "../core.js";
import { textTool } from "../frames/text.js";
import { splitLiteral } from "../lib/regex.js";
import { runRegexTask } from "../regex-run.js";

const CHEAT = [["\\d", "chữ số"], ["\\w", "chữ, số, _"], ["\\s", "khoảng trắng"], [".", "ký tự bất kỳ"], ["[abc]", "a, b hoặc c"], ["[^abc]", "trừ a, b, c"], ["^ $", "đầu / cuối"], ["\\b", "ranh giới từ"],
  ["* + ?", "0+, 1+, 0–1 lần"], ["{2,5}", "2 đến 5 lần"], ["(…)", "nhóm bắt"], ["(?<ten>…)", "nhóm có tên"], ["a|b", "a hoặc b"], ["(?=…)", "theo sau là"], ["\\p{L}", "chữ cái (cả có dấu, cần cờ u)"]];

textTool({
  mono: true,
  inputLabel: "Văn bản thử",
  outputLabel: "Kết quả",
  placeholder: "Dán văn bản để thử biểu thức…",
  sample: (o) => Object.assign(o, { pattern: "(?<dau>0\\d{2,3})[ .]?(\\d{3})[ .]?(\\d{3,4})\\b", g: true, u: true, rep: "$<dau>-$2-$3" }) &&
    "Liên hệ: 0901 234 567 (anh An), 091.234.5678 hoặc 0987654321.\nSố máy bàn 028 3822 1234 không khớp mẫu di động.",
  options: [
    { id: "pattern", type: "text", label: "Biểu thức", placeholder: "\\d+ hoặc /\\d+/g", wide: true, mono: true, persist: false },
    { id: "g", type: "check", label: "g – tìm tất cả", value: true },
    { id: "i", type: "check", label: "i – không phân biệt hoa/thường", value: false },
    { id: "m", type: "check", label: "m – ^ $ theo từng dòng", value: false },
    { id: "s", type: "check", label: "s – dấu . khớp cả xuống dòng", value: false },
    { id: "u", type: "check", label: "u – Unicode", value: true },
    { id: "rep", type: "text", label: "Thay bằng (tuỳ chọn)", placeholder: "$1, $<ten>, $&", wide: true, mono: true, persist: false }
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
    if (!res.r) { out.append(h("div", { class: "rx-cheat" }, h("p", { class: "opt-title", text: "Nhắc nhanh cú pháp" }), h("dl", null, CHEAT.map(([k, v]) => [h("dt", null, h("code", { text: k })), h("dd", { text: v })])))); return; }
    const { matches, truncated } = res.r;
    out.append(h("p", { class: "tx-info" }, h("b", { text: matches.length ? `${fmtNum(matches.length)}${truncated ? "+" : ""} chỗ khớp` : "Không khớp" }), ` · /${res.source}/${res.flags}`));
    // tô sáng trên văn bản
    let html = "", last = 0;
    matches.slice(0, 3000).forEach((m, i) => {
      html += esc(text.slice(last, m.index)) + `<mark class="hit h${i % 2}" title="#${i + 1}">${esc(m.text) || "<span class=\"hit-empty\">∅</span>"}</mark>`;
      last = m.end;
    });
    html += esc(text.slice(last));
    out.append(h("div", { class: "rx-text mono", html }));
    if (res.r.replaced != null) out.append(h("p", { class: "opt-title", text: "Sau khi thay" }), h("div", { class: "rx-text mono", text: res.r.replaced }));
    if (matches.length) {
      const groups = matches[0].groups.length;
      const head = ["#", "Vị trí", "Khớp", ...matches[0].groups.map((g) => (g.name ? `<${g.name}>` : "$" + g.i))];
      const rows = matches.slice(0, 200).map((m, i) => [i + 1, m.index, m.text, ...m.groups.map((g) => (g.value == null ? "–" : g.value))]);
      out.append(h("p", { class: "opt-title", text: groups ? `Chi tiết và ${groups} nhóm bắt` : "Chi tiết" }),
        h("div", { class: "tbl-wrap tall" }, h("table", { class: "tbl" }, h("thead", null, h("tr", null, head.map((x) => h("th", { scope: "col", class: "l", text: String(x) })))),
          h("tbody", null, rows.map((r) => h("tr", null, r.map((c) => h("td", { class: "l mono", text: String(c) }))))))));
    }
  }
});
