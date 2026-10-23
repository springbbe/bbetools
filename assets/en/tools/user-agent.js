/* Tự sinh bởi scripts/build.js từ assets/tools/user-agent.js và i18n/en/js/ — đừng sửa tay. */
/* Phân tích User-Agent: trình duyệt, nhân, hệ điều hành, thiết bị (ua-parser-js); với chính máy này có thêm
   thông tin chính xác hơn từ User-Agent Client Hints (Chrome, Edge) và màn hình. */
import { h, lib } from "../core.js";
import { textTool } from "../frames/text.js";
import { kv } from "../calc.js";

const TYPE = { mobile: "Phone", tablet: "Tablet", smarttv: "Smart TV", console: "Game console", wearable: "Wearable", embedded: "Embedded device", xr: "VR headset" };
const SAMPLES = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  "Mozilla/5.0 (Linux; Android 14; 22101320G Build/UKQ1.231003.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/139.0.7258.143 Mobile Safari/537.36 Zalo android/12100714 ZaloTheme/light ZaloLanguage/vi",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
];
let k = 0;

async function hints() {
  const d = navigator.userAgentData;
  if (!d || !d.getHighEntropyValues) return null;
  try { return await d.getHighEntropyValues(["platformVersion", "architecture", "bitness", "model", "fullVersionList"]); } catch (_) { return null; }
}

textTool({
  mono: true,
  single: true,
  inputLabel: "User-Agent string",
  outputLabel: "Info",
  placeholder: "Mozilla/5.0 (…)",
  initial: () => navigator.userAgent,
  sample: () => SAMPLES[k++ % SAMPLES.length],
  output: "custom",
  async transform(text) {
    const s = text.trim();
    if (!s) return { text: "" };
    const UAParser = await lib("uaParser");
    const r = new UAParser(s).getResult();
    const mine = s === navigator.userAgent;
    return { text: s, r, mine, ch: mine ? await hints() : null };
  },
  render(out, res) {
    out.textContent = "";
    out.classList.remove("out");
    out.classList.add("ua-out");
    if (!res.r) return;
    const { browser, engine, os, device, cpu } = res.r;
    const bot = /bot|crawler|spider|slurp|facebookexternalhit|zalo.*bot/i.test(res.text);
    const inApp = (/(Zalo|FBAN|FBAV|Instagram|Line|TikTok|musical_ly|MicroMessenger)\b/i.exec(res.text) || [])[1];
    const ver = (x) => [x.name, x.version].filter(Boolean).join(" ") || "Unknown";
    let osName = ver(os);
    // Windows 11 vẫn báo "Windows NT 10.0": Client Hints mới phân biệt được
    if (res.ch && /Windows/.test(os.name) && parseInt(res.ch.platformVersion, 10) >= 13) osName = "Windows 11";
    // macOS cũng "đóng băng" ở 10.15.7 trong chuỗi User-Agent
    if (res.ch && /Mac/.test(os.name) && res.ch.platformVersion) osName = "macOS " + res.ch.platformVersion;
    const devType = device.type ? TYPE[device.type] || device.type : bot ? "Bot / crawler" : "Desktop";
    out.append(h("div", { class: "stats flush" },
      h("div", { class: "stat hl" }, h("b", { text: ver(browser) }), h("span", { text: "Browser" })),
      h("div", { class: "stat" }, h("b", { text: osName }), h("span", { text: "Operating system" })),
      h("div", { class: "stat" }, h("b", { text: devType }), h("span", { text: "Device type" }))));
    out.append(kv([
      ["Browser engine", ver(engine)],
      device.vendor || device.model ? ["Device", [device.vendor, device.model].filter(Boolean).join(" ")] : null,
      cpu.architecture ? ["CPU architecture", cpu.architecture] : null,
      inApp ? ["Opened inside app", inApp.replace(/FBAN|FBAV/, "Facebook").replace("musical_ly", "TikTok").replace("MicroMessenger", "WeChat")] : null,
      bot ? ["Note", "This is a search engine / social network bot"] : null
    ]));
    if (res.mine) {
      const c = res.ch;
      out.append(h("p", { class: "opt-title", text: "Your device" }), kv([
        c && c.fullVersionList ? ["Full version", c.fullVersionList.filter((b) => !/Not.?A.?Brand/i.test(b.brand)).map((b) => b.brand + " " + b.version).join(", ")] : null,
        c && c.platformVersion ? ["OS version", c.platformVersion] : null,
        c && c.model ? ["Model", c.model] : null,
        c && c.architecture ? ["Architecture", c.architecture + (c.bitness ? ` ${c.bitness}-bit` : "")] : null,
        ["Screen", `${screen.width} × ${screen.height} (pixel ratio ${devicePixelRatio})`],
        ["Browser window", `${innerWidth} × ${innerHeight}`],
        ["Language", navigator.languages ? navigator.languages.join(", ") : navigator.language],
        ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone],
        ["Touch", navigator.maxTouchPoints > 0 ? `Yes (${navigator.maxTouchPoints} points)` : "No"]
      ]), h("p", { class: "hint", text: "This info is only read on your device, never sent anywhere." }));
    }
  }
});
