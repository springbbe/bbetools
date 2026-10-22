/* Kiểm tra thiết bị trước khi họp online (trang gộp): camera, micro, loa, bàn phím, chuột, màn hình theo từng thẻ.
   Phần chi tiết của từng thiết bị nằm ở assets/devices.js, dùng chung với các trang riêng (Test webcam, Test micro…). */
import { h, icon, ROOT } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { camPane, micPane, spkPane, kbdPane, mousePane, scrPane } from "../devices.js";

// [khoá, nhãn, icon, phần, slug trang riêng]
const TABS = [["cam", "Camera", "camera", camPane, "kiem-tra-webcam"], ["mic", "Micro", "mic", micPane, "kiem-tra-micro"], ["spk", "Loa", "volume-2", spkPane, "kiem-tra-loa"],
  ["kbd", "Bàn phím", "keyboard", kbdPane, "kiem-tra-ban-phim"], ["mouse", "Chuột", "mouse", mousePane, "kiem-tra-chuot"], ["scr", "Màn hình", "monitor", scrPane, "kiem-tra-man-hinh"]];

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let tab = S.get("tab", "cam"), cleanup = null;
    if (!TABS.some((t) => t[0] === tab)) tab = "cam";
    const tabs = h("div", { class: "seg dt-tabs", role: "tablist", "aria-label": "Thiết bị cần kiểm tra" }, TABS.map(([k, l, ic]) =>
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
      more.append("Xem thêm kiểm tra chi tiết: ", h("a", { href: ROOT + t[4] + "/", text: "trang " + t[1].toLowerCase() + " riêng" }), ".");
    }
    window.addEventListener("pagehide", () => { if (cleanup) cleanup(); });
    show(tab);
  }
});
