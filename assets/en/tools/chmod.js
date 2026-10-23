/* Tự sinh bởi scripts/build.js từ assets/tools/chmod.js và i18n/en/js/ — đừng sửa tay. */
/* Tính chmod: bảng tích quyền đọc/ghi/chạy cho chủ sở hữu, nhóm, người khác ↔ số (755) ↔ rwxr-xr-x; setuid, setgid, sticky */
import { h, icon, copyText } from "../core.js";
import { formTool } from "../frames/form.js";
import { parseMode, modeToBits, bitsToMode, modeToSymbolic, modeToOctal } from "../lib/co-so.js";
import { alert } from "../calc.js";

const WHO = [["owner", "Owner (u)"], ["group", "Group (g)"], ["other", "Others (o)"]];
const PERM = [["r", "Read"], ["w", "Write"], ["x", "Execute"]];
const PRESETS = [["644", "Regular file"], ["755", "Folder, script"], ["600", "Secret file (SSH key)"], ["700", "Private folder"], ["775", "Group-editable"], ["777", "World-writable (avoid)"]];

const grid = {
  id: "grid", type: "custom", url: false, render(api) {
    const boxes = {};
    const tbl = h("table", { class: "chmod-grid" },
      h("thead", null, h("tr", null, h("th", { scope: "col" }, ""), PERM.map(([, l]) => h("th", { scope: "col", text: l })))),
      h("tbody", null, WHO.map(([w, l]) => h("tr", null, h("th", { scope: "row", text: l }), PERM.map(([p, pl]) => h("td", null, boxes[w + p] = h("input", { type: "checkbox", "aria-label": `${l}: ${pl}` })))))));
    const sp = {};
    const special = h("div", { class: "chmod-sp" }, [["setuid", "setuid (run as owner)"], ["setgid", "setgid (inherit group)"], ["sticky", "sticky (only owner can delete)"]].map(([k, l]) => h("label", { class: "switch" }, sp[k] = h("input", { type: "checkbox" }), h("span", { text: l }))));
    const el = h("div", { class: "field" }, h("span", { text: "Permission table" }), tbl, special);
    // tích ô → cập nhật ô số (chặn sự kiện "input" để khung không vẽ lại bảng bằng giá trị cũ trước khi kịp đổi)
    el.addEventListener("input", (e) => {
      e.stopPropagation();
      const b = Object.fromEntries(WHO.map(([w]) => [w, Object.fromEntries(PERM.map(([p]) => [p, boxes[w + p].checked]))]));
      Object.assign(b, { setuid: sp.setuid.checked, setgid: sp.setgid.checked, sticky: sp.sticky.checked });
      api.ctrls.mode.set(modeToOctal(bitsToMode(b)));
      api.update();
    });
    return { el, get: () => "", set(v) {
      if (v === "" || v == null) return;
      const b = modeToBits(v);
      for (const [w] of WHO) for (const [p] of PERM) boxes[w + p].checked = b[w][p];
      for (const k of ["setuid", "setgid", "sticky"]) sp[k].checked = b[k];
    } };
  }
};

formTool({
  fields: [
    { id: "mode", type: "text", label: "Permissions (numeric or symbolic)", value: "755", attrs: { class: "mono", spellcheck: "false", autocapitalize: "off" }, hint: "Accepts 755, 0644, rwxr-xr-x, -rw-r--r--, u=rwx,g=rx,o=r" },
    grid,
    { id: "file", type: "text", label: "File / folder name (to build the command)", value: "", placeholder: "vd. deploy.sh" }
  ],
  compute(v, out, api) {
    out.textContent = "";
    let m;
    try { m = parseMode(v.mode); } catch (e) { out.append(alert("err", e.message)); return; }
    api.ctrls.grid.set(m);
    const oct = modeToOctal(m), sym = modeToSymbolic(m), b = modeToBits(m);
    const target = v.file.trim() || "ten-file";
    const cmd = `chmod ${oct} ${/\s/.test(target) ? `"${target}"` : target}`;
    const say = (x) => [x.r && "read", x.w && "write", x.x && "execute"].filter(Boolean).join(", ") || "no permissions";
    out.append(
      h("div", { class: "stats flush" },
        h("div", { class: "stat hl" }, h("b", { class: "mono", text: oct }), h("span", { text: "Numeric" })),
        h("div", { class: "stat" }, h("b", { class: "mono", text: sym }), h("span", { text: "Symbolic (ls -l)" }))),
      h("div", { class: "ts-row hl" }, h("span", { class: "ts-k", text: "Command" }), h("code", { class: "ts-v", text: cmd }),
        h("button", { class: "ib sm", type: "button", "aria-label": "Copy command", title: "Copy", html: icon("copy"), onclick: () => copyText(cmd) })),
      h("ul", { class: "chmod-say" },
        h("li", null, h("b", { text: "Owner: " }), say(b.owner)),
        h("li", null, h("b", { text: "Group: " }), say(b.group)),
        h("li", null, h("b", { text: "Others: " }), say(b.other))),
      b.other.w ? h("p", { class: "alert warn", html: icon("triangle-alert") + "<span>Every user on the machine can write to this file. Only use it when really necessary.</span>" }) : "",
      h("p", { class: "opt-title", text: "Common permissions" }),
      h("ul", { class: "chip-list sm-chips" }, PRESETS.map(([p, l]) => h("li", null, h("button", { class: "chip", type: "button", "aria-current": p === oct ? "true" : "false", onclick: () => api.set("mode", p) }, h("code", { text: p }), h("small", { text: l }))))));
  }
});
