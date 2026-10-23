/* Tự sinh bởi scripts/build.js từ assets/tools/team-picker.js và i18n/en/js/ — đừng sửa tay. */
/* Bốc thăm, chia đội: chia danh sách thành các đội đều nhau (chênh tối đa 1 người), rải trưởng nhóm mỗi đội một người,
   bốc thăm thứ tự, hoặc chọn ngẫu nhiên vài người. Ngẫu nhiên bằng crypto.getRandomValues, danh sách không đưa lên URL. */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseList, splitTeams, shuffle } from "../lib/ngau-nhien.js";
import { alert, csvButton } from "../calc.js";

const SAMPLE = "Alex\nBen\nChloe\nDan\nEmma\nFinn\nGrace\nHenry\nIvy\nJack\nKate\nLeo\nMia\nNoah";
const COLORS = ["#E5484D", "#0090FF", "#46A758", "#F76B15", "#8E4EC6", "#12A594", "#D6409F", "#AD7F58"];
const teamMode = (v) => v.mode === "teams" || v.mode === "size";

formTool({
  share: false,
  fields: [
    { id: "names", type: "textarea", label: "Names (one per line)", value: SAMPLE, url: false, attrs: { rows: 8, spellcheck: "false" } },
    { id: "mode", type: "seg", label: "Mode", value: "teams", choices: [["teams", "Split into teams"], ["size", "People per team"], ["order", "Order"], ["pick", "Pick a few people"]] },
    { id: "n", type: "number", label: "Teams", value: "3", attrs: { min: 1, max: 100, inputmode: "numeric" }, show: (v) => v.mode !== "order" },
    { id: "leaders", type: "textarea", label: "Leaders / seeds (optional)", hint: "One person per line; each team gets at most one person from this list", url: false, attrs: { rows: 2 }, show: teamMode },
    { id: "tnames", type: "text", label: "Team names (optional)", placeholder: "E.g. Red, Blue, Yellow", url: false, show: teamMode }
  ],
  init(api) {
    // nhãn ô số đổi theo cách bốc
    const lab = api.ctrls.n.el.querySelector("label");
    api.form.addEventListener("change", () => { lab.textContent = { teams: "Teams", size: "People per team", pick: "People to pick" }[api.get("mode")] || "Count"; });
    api.form.dispatchEvent(new Event("change"));
  },
  compute(v, out, api) {
    out.textContent = "";
    const leaders = parseList(v.leaders);
    const lset = new Set(leaders);
    const names = parseList(v.names).filter((x) => !lset.has(x));
    const n = Math.max(1, Math.min(100, parseInt(v.n, 10) || 1));
    if (names.length + leaders.length < 2) { out.append(alert("info", "Enter at least 2 names, one per line (or separated by commas).")); return; }
    const dup = names.length !== new Set(names).size;
    const again = h("button", { class: "btn sm", type: "button", onclick: () => api.update() }, h("span", { html: icon("shuffle"), style: { display: "contents" } }), "Draw again");
    let text = "", body, csv = null;
    if (v.mode === "order" || v.mode === "pick") {
      const all = shuffle([...leaders, ...names]);
      const list = v.mode === "pick" ? all.slice(0, Math.min(n, all.length)) : all;
      text = list.map((x, i) => `${i + 1}. ${x}`).join("\n");
      body = h("ol", { class: "tp-order" }, list.map((x) => h("li", { text: x })));
      csv = [["STT", "Name"], list.map((x, i) => [i + 1, x])];
      if (v.mode === "pick" && n >= all.length) out.append(alert("warn", `The list only has ${all.length} people; all were picked.`));
    } else {
      const teams = splitTeams(names, n, v.mode, { leaders });
      const tn = parseList(v.tnames);
      const label = (i) => tn[i] || "Team " + (i + 1);
      text = teams.map((t, i) => `${label(i)} (${t.length}): ${t.join(", ")}`).join("\n");
      body = h("div", { class: "tp-teams" }, teams.map((t, i) => h("section", { class: "tp-team", style: { "--c": COLORS[i % COLORS.length] } },
        h("h3", null, label(i), h("small", { text: ` · ${t.length} ${(t.length) == 1 ? "person" : "people"}` })),
        h("ol", null, t.map((x) => h("li", { class: lset.has(x) ? "lead" : null, text: x }))))));
      csv = [["Team", "Name"], teams.flatMap((t, i) => t.map((x) => [label(i), x]))];
      if (v.mode === "teams" && n > names.length + leaders.length) out.append(alert("warn", "More teams than people; each team has only 1 person."));
    }
    out.append(h("div", { class: "fm-foot" }, again,
      h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(text, "Result copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy"),
      csvButton("team-draw.csv", csv[0], csv[1], "Download CSV")), body,
      h("p", { class: "hint", text: `${names.length + leaders.length} people · drawn at ${new Date().toLocaleTimeString("en-US")}` }),
      dup ? alert("warn", "Some names are duplicated: if they're different people, add a surname or number to tell them apart.") : "");
  }
});

const css = document.createElement("style");
css.textContent = `.tp-teams{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));margin-top:12px}
.tp-team{border:1px solid var(--line);border-top:5px solid var(--c);border-radius:12px;padding:10px 14px}
.tp-team h3{margin:0 0 6px;font-size:17px;color:var(--c)}.tp-team small{color:var(--muted);font-weight:500;font-size:13px}
.tp-team ol{margin:0;padding-left:22px;display:grid;gap:2px}.tp-team li.lead{font-weight:700}.tp-team li.lead::after{content:" ★";color:var(--c)}
.tp-order{margin:12px 0 0;padding-left:30px;columns:2 180px;column-gap:24px}.tp-order li{padding:3px 0;font-size:16px;break-inside:avoid}`;
document.head.append(css);
