/* Phân tích User-Agent: trình duyệt, nhân, hệ điều hành, thiết bị (ua-parser-js); với chính máy này có thêm
   thông tin chính xác hơn từ User-Agent Client Hints (Chrome, Edge) và màn hình. */
import { h, lib } from "../core.js";
import { textTool } from "../frames/text.js";
import { kv } from "../calc.js";

const TYPE = { mobile: "Điện thoại", tablet: "Máy tính bảng", smarttv: "TV thông minh", console: "Máy chơi game", wearable: "Thiết bị đeo", embedded: "Thiết bị nhúng", xr: "Kính thực tế ảo" };
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
  inputLabel: "Chuỗi User-Agent",
  outputLabel: "Thông tin",
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
    const ver = (x) => [x.name, x.version].filter(Boolean).join(" ") || "Không rõ";
    let osName = ver(os);
    // Windows 11 vẫn báo "Windows NT 10.0": Client Hints mới phân biệt được
    if (res.ch && /Windows/.test(os.name) && parseInt(res.ch.platformVersion, 10) >= 13) osName = "Windows 11";
    // macOS cũng "đóng băng" ở 10.15.7 trong chuỗi User-Agent
    if (res.ch && /Mac/.test(os.name) && res.ch.platformVersion) osName = "macOS " + res.ch.platformVersion;
    const devType = device.type ? TYPE[device.type] || device.type : bot ? "Bot / trình thu thập" : "Máy tính";
    out.append(h("div", { class: "stats flush" },
      h("div", { class: "stat hl" }, h("b", { text: ver(browser) }), h("span", { text: "Trình duyệt" })),
      h("div", { class: "stat" }, h("b", { text: osName }), h("span", { text: "Hệ điều hành" })),
      h("div", { class: "stat" }, h("b", { text: devType }), h("span", { text: "Loại thiết bị" }))));
    out.append(kv([
      ["Nhân trình duyệt", ver(engine)],
      device.vendor || device.model ? ["Thiết bị", [device.vendor, device.model].filter(Boolean).join(" ")] : null,
      cpu.architecture ? ["Kiến trúc CPU", cpu.architecture] : null,
      inApp ? ["Mở trong ứng dụng", inApp.replace(/FBAN|FBAV/, "Facebook").replace("musical_ly", "TikTok").replace("MicroMessenger", "WeChat")] : null,
      bot ? ["Ghi chú", "Đây là bot của công cụ tìm kiếm/mạng xã hội"] : null
    ]));
    if (res.mine) {
      const c = res.ch;
      out.append(h("p", { class: "opt-title", text: "Máy bạn đang dùng" }), kv([
        c && c.fullVersionList ? ["Phiên bản đầy đủ", c.fullVersionList.filter((b) => !/Not.?A.?Brand/i.test(b.brand)).map((b) => b.brand + " " + b.version).join(", ")] : null,
        c && c.platformVersion ? ["Phiên bản hệ điều hành", c.platformVersion] : null,
        c && c.model ? ["Model", c.model] : null,
        c && c.architecture ? ["Kiến trúc", c.architecture + (c.bitness ? ` ${c.bitness}-bit` : "")] : null,
        ["Màn hình", `${screen.width} × ${screen.height} (tỉ lệ điểm ảnh ${devicePixelRatio})`],
        ["Cửa sổ trình duyệt", `${innerWidth} × ${innerHeight}`],
        ["Ngôn ngữ", navigator.languages ? navigator.languages.join(", ") : navigator.language],
        ["Múi giờ", Intl.DateTimeFormat().resolvedOptions().timeZone],
        ["Cảm ứng", navigator.maxTouchPoints > 0 ? `Có (${navigator.maxTouchPoints} điểm)` : "Không"]
      ]), h("p", { class: "hint", text: "Thông tin này chỉ đọc trên máy bạn, không gửi đi đâu." }));
    }
  }
});
