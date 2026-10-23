/* Tự sinh bởi scripts/build.js từ assets/tools/device-test.js và i18n/en/js/ — đừng sửa tay. */
/* Kiểm tra thiết bị trước khi họp online (trang gộp): camera, micro, loa, bàn phím, chuột, màn hình theo từng thẻ.
   Phần chi tiết của từng thiết bị nằm ở assets/devices.js, dùng chung với các trang riêng (Test webcam, Test micro…). */
import { h, icon, HOME } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { camPane, micPane, spkPane, kbdPane, mousePane, scrPane } from "../devices.js";

// [khoá, nhãn, icon, phần, slug trang riêng]
const TABS = [["cam", "Camera", "camera", camPane, "webcam-test"], ["mic", "Micro", "mic", micPane, "mic-test"], ["spk", "Speakers", "volume-2", spkPane, "speaker-test"],
  ["kbd", "Keyboard", "keyboard", kbdPane, "keyboard-test"], ["mouse", "Mouse", "mouse", mousePane, "mouse-test"], ["scr", "Screen", "monitor", scrPane, "screen-test"]];

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let tab = S.get("tab", "cam"), cleanup = null;
    if (!TABS.some((t) => t[0] === tab)) tab = "cam";
    const tabs = h("div", { class: "seg dt-tabs", role: "tablist", "aria-label": "Device to test" }, TABS.map(([k, l, ic]) =>
      h("label", null, h("input", { type: "radio", name: "dt-tab", value: k, checked: k === tab, onchange: () => show(k) }), h("span", { html: icon(ic) + l }))));
    const body = h("div", { class: "dt-body" });
    const more = h("p", { class: "hint dt-more" });
    el.append(h("div", { class: "dt" }, tabs, body, more));
    function show(k) {
      if (cleanup) { cleanup(); cleanup = null; }
      tab = k; S.set("tab", k);
      const t = TABS.find((x) => x[0] === k);
      body.textContent = "";
      const pane = h("div", { class: "dt-pane" });
      body.append(pane);
      cleanup = t[3](pane, ctx) || null;
      more.textContent = "";
      more.append("See the detailed test on ", h("a", { href: HOME + t[4] + "/", text: "the " + t[1].toLowerCase() + " test page" }), ".");
    }
    window.addEventListener("pagehide", () => { if (cleanup) cleanup(); });
    show(tab);
  }
});
