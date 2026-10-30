/* Bốc thăm, chia đội: chia danh sách thành các đội đều nhau (chênh tối đa 1 người), rải trưởng nhóm mỗi đội một người,
   bốc thăm thứ tự, hoặc chọn ngẫu nhiên vài người. Ngẫu nhiên bằng crypto.getRandomValues, danh sách không đưa lên URL. */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseList, splitTeams, shuffle } from "../lib/ngau-nhien.js";
import { alert, csvButton } from "../calc.js";

const SAMPLE = "An\nBình\nChi\nDũng\nGiang\nHà\nKhang\nLinh\nMinh\nNgọc\nPhúc\nQuân\nTâm\nUyên";
const COLORS = ["#E5484D", "#0090FF", "#46A758", "#F76B15", "#8E4EC6", "#12A594", "#D6409F", "#AD7F58"];
const teamMode = (v) => v.mode === "teams" || v.mode === "size";

formTool({
  share: false,
  fields: [
    { id: "names", type: "textarea", label: "Danh sách người (mỗi dòng một tên)", value: SAMPLE, url: false, attrs: { rows: 8, spellcheck: "false" } },
    { id: "mode", type: "seg", label: "Cách bốc", value: "teams", choices: [["teams", "Chia số đội"], ["size", "Số người/đội"], ["order", "Thứ tự"], ["pick", "Chọn vài người"]] },
    { id: "n", type: "number", label: "Số đội", value: "3", attrs: { min: 1, max: 100, inputmode: "numeric" }, show: (v) => v.mode !== "order" },
    { id: "leaders", type: "textarea", label: "Trưởng nhóm / hạt giống (tuỳ chọn)", hint: "Mỗi dòng một người; mỗi đội nhận nhiều nhất một người trong danh sách này", url: false, attrs: { rows: 2 }, show: teamMode },
    { id: "tnames", type: "text", label: "Tên các đội (tuỳ chọn)", placeholder: "VD: Đỏ, Xanh, Vàng", url: false, show: teamMode }
  ],
  init(api) {
    // nhãn ô số đổi theo cách bốc
    const lab = api.ctrls.n.el.querySelector("label");
    api.form.addEventListener("change", () => { lab.textContent = { teams: "Số đội", size: "Số người mỗi đội", pick: "Số người được chọn" }[api.get("mode")] || "Số"; });
    api.form.dispatchEvent(new Event("change"));
  },
  compute(v, out, api) {
    out.textContent = "";
    const leaders = parseList(v.leaders);
    const lset = new Set(leaders);
    const names = parseList(v.names).filter((x) => !lset.has(x));
    const n = Math.max(1, Math.min(100, parseInt(v.n, 10) || 1));
    if (names.length + leaders.length < 2) { out.append(alert("info", "Nhập ít nhất 2 tên, mỗi dòng một tên (hoặc ngăn bằng dấu phẩy).")); return; }
    const dup = names.length !== new Set(names).size;
    const again = h("button", { class: "btn sm", type: "button", onclick: () => api.update() }, h("span", { html: icon("shuffle"), style: { display: "contents" } }), "Bốc lại");
    let text = "", body, csv = null;
    if (v.mode === "order" || v.mode === "pick") {
      const all = shuffle([...leaders, ...names]);
      const list = v.mode === "pick" ? all.slice(0, Math.min(n, all.length)) : all;
      text = list.map((x, i) => `${i + 1}. ${x}`).join("\n");
      body = h("ol", { class: "tp-order" }, list.map((x) => h("li", { text: x })));
      csv = [["STT", "Tên"], list.map((x, i) => [i + 1, x])];
      if (v.mode === "pick" && n >= all.length) out.append(alert("warn", `Danh sách chỉ có ${all.length} người, đã chọn tất cả.`));
    } else {
      const teams = splitTeams(names, n, v.mode, { leaders });
      const tn = parseList(v.tnames);
      const label = (i) => tn[i] || "Đội " + (i + 1);
      text = teams.map((t, i) => `${label(i)} (${t.length}): ${t.join(", ")}`).join("\n");
      body = h("div", { class: "tp-teams" }, teams.map((t, i) => h("section", { class: "tp-team", style: { "--c": COLORS[i % COLORS.length] } },
        h("h2", null, label(i), h("small", { text: ` · ${t.length} người` })),
        h("ol", null, t.map((x) => h("li", { class: lset.has(x) ? "lead" : null, text: x }))))));
      csv = [["Đội", "Tên"], teams.flatMap((t, i) => t.map((x) => [label(i), x]))];
      if (v.mode === "teams" && n > names.length + leaders.length) out.append(alert("warn", "Số đội nhiều hơn số người, mỗi đội chỉ có 1 người."));
    }
    out.append(h("div", { class: "fm-foot" }, again,
      h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(text, "Đã sao chép kết quả") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Sao chép"),
      csvButton("boc-tham.csv", csv[0], csv[1], "Tải CSV")), body,
      h("p", { class: "hint", text: `${names.length + leaders.length} người · bốc lúc ${new Date().toLocaleTimeString("vi-VN")}` }),
      dup ? alert("warn", "Có tên bị trùng: nếu là hai người khác nhau, hãy thêm họ hoặc số để phân biệt.") : "");
  }
});

const css = document.createElement("style");
css.textContent = `.tp-teams{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));margin-top:12px}
.tp-team{border-top:4px solid var(--c);padding:10px 0 0}
.tp-team h2{margin:0 0 6px;font-size:19px;letter-spacing:-0.01em;color:var(--c)}.tp-team small{color:var(--muted);font-weight:500;font-size:13px}
.tp-team ol{margin:0;padding-left:22px;display:grid;gap:2px}.tp-team li.lead{font-weight:700}.tp-team li.lead::after{content:" ★";color:var(--c)}
.tp-order{margin:12px 0 0;padding-left:30px;columns:2 180px;column-gap:24px}.tp-order li{padding:3px 0;font-size:16px;break-inside:avoid}`;
document.head.append(css);
