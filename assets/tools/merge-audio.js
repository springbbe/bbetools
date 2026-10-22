/* Ghép âm thanh: nối nhiều file (khác định dạng, khác tần số vẫn được) theo thứ tự đã sắp; nối liền, chèn khoảng lặng
   hoặc chồng mượt (crossfade); tuỳ chọn làm đều âm lượng. Mỗi file được giải mã rồi mã hoá dần vào file kết quả. */
import { h, baseName, sampleFiles, nextFrame } from "../core.js";
import { fileTool, seg, radioVal } from "../frames/file.js";
import { mb, probe, audioInfo, AUDIO_OUT, bitrateSelect, decodeAudio, audioWriter, resultPreview, webCodecsMissing } from "../media.js";
import { levels, normalizeGain, fmtDuration } from "../lib/media.js";

const FORMATS = ["mp3", "m4a", "wav", "ogg"];

// lấy đoạn [from, to) (mẫu) của AudioBuffer, đổi sang `ch` kênh
function slice(buf, from, to, ch) {
  const n = Math.max(0, to - from);
  const out = new AudioBuffer({ length: Math.max(1, n), numberOfChannels: ch, sampleRate: buf.sampleRate });
  for (let c = 0; c < ch; c++) out.copyToChannel(buf.getChannelData(Math.min(c, buf.numberOfChannels - 1)).subarray(from, to), c);
  return out;
}

fileTool({
  accept: ["audio"], multiple: true, reorder: true, noun: "file âm thanh",
  action: "Ghép âm thanh",
  sample: () => sampleFiles("nhac-mau.mp3", "nhac-mau-2.m4a"),
  warm: () => mb(),
  async load(it) {
    const miss = webCodecsMissing(false);
    if (miss) throw Object.assign(new Error(miss), { userMsg: miss });
    const p = await probe(it.file);
    if (!p.audio) throw Object.assign(new Error("x"), { userMsg: `${it.name} không có tiếng.` });
    it.p = p;
    it.info = audioInfo(p);
  },
  options(el) {
    const secs = h("div", { class: "opt-group", hidden: true }, h("p", { class: "opt-title", id: "secs-t" }),
      h("div", { class: "range-row" }, h("input", { type: "range", id: "secs", min: 0.5, max: 10, step: 0.5, value: 2, "aria-labelledby": "secs-t" }), h("output", { id: "secs-v" })));
    el.append(seg("fmt", FORMATS.map((k) => [k, AUDIO_OUT[k].label.replace(/ \(.*\)/, "")]), "mp3", "Định dạng file ghép"), bitrateSelect("br", 192),
      seg("mode", [["join", "Nối liền"], ["gap", "Khoảng lặng"], ["xfade", "Chồng mượt"]], "join", "Cách nối"), secs,
      h("label", { class: "switch" }, h("input", { type: "checkbox", id: "norm" }), h("span", null, "Làm đều âm lượng", h("small", { text: "Bài nhỏ được tăng, bài to được giảm cho nghe đều nhau (không làm rè)." }))),
      h("p", { class: "hint", id: "total", "aria-live": "polite" }));
    const get = () => ({ fmt: radioVal(el, "fmt"), br: +el.querySelector("#br").value, mode: radioVal(el, "mode"), secs: +el.querySelector("#secs").value, norm: el.querySelector("#norm").checked });
    const upd = () => {
      const o = get();
      secs.hidden = o.mode === "join";
      el.querySelector("#secs-t").textContent = o.mode === "gap" ? "Khoảng lặng giữa các bài" : "Thời gian chồng mượt";
      el.querySelector("#secs-v").textContent = o.secs.toLocaleString("vi-VN") + " giây";
      el.querySelector("#br").closest(".field").hidden = !!AUDIO_OUT[o.fmt].lossless;
    };
    el.addEventListener("input", upd); el.addEventListener("change", upd); upd();
    return get;
  },
  onChange(ctx) {
    const t = document.getElementById("total"), list = ctx.items.filter((i) => i.p);
    if (!t) return;
    const o = ctx.opts;
    let total = list.reduce((s, i) => s + i.p.duration, 0);
    if (list.length > 1 && o.mode === "gap") total += o.secs * (list.length - 1);
    if (list.length > 1 && o.mode === "xfade") total -= o.secs * (list.length - 1);
    t.textContent = list.length ? `${list.length} file · tổng khoảng ${fmtDuration(Math.max(0, total))}.` : "";
  },
  ready: (items) => (items.filter((i) => i.p).length < 2 ? "Chọn ít nhất 2 file để ghép." : true),
  async run(items, o, ctx) {
    const list = items.filter((i) => i.p), F = AUDIO_OUT[o.fmt];
    const sr = F.codec === "opus" ? 48000 : 44100;
    const ch = Math.min(2, Math.max(...list.map((i) => i.p.audio.channels || 1)));
    ctx.status("Đang chuẩn bị…"); ctx.progress(-1);
    const w = await audioWriter(o.fmt, { bitrate: o.br, sampleRate: sr, channels: ch, tags: { title: list.map((i) => baseName(i.name)).join(" + ").slice(0, 120) } });
    let tail = null, total = 0;
    const abort = () => w.cancel();
    ctx.signal.addEventListener("abort", abort);
    try {
      for (let i = 0; i < list.length; i++) {
        ctx.check();
        ctx.status(`Đang đọc ${list[i].name} (${i + 1}/${list.length})…`);
        const buf = await decodeAudio(list[i].file, sr);
        ctx.check();
        if (o.norm) {
          const chs = []; for (let c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
          const g = normalizeGain(levels(chs));
          if (Math.abs(g - 1) > 0.01) for (const c of chs) for (let k = 0; k < c.length; k++) c[k] *= g;
        }
        let from = 0, to = buf.length;
        if (i > 0 && o.mode === "gap") { const n = Math.round(o.secs * sr); await w.add(new AudioBuffer({ length: n, numberOfChannels: ch, sampleRate: sr })); total += n; }
        if (i > 0 && o.mode === "xfade" && tail) {
          // trộn phần đuôi bài trước (nhỏ dần) với phần đầu bài này (to dần), đường cong giữ đều công suất
          const n = Math.min(tail.length, Math.floor(buf.length / 2));
          const mix = slice(tail, tail.length - n, tail.length, ch);
          if (tail.length > n) { await w.add(slice(tail, 0, tail.length - n, ch)); total += tail.length - n; }
          for (let c = 0; c < ch; c++) {
            const m = mix.getChannelData(c), b = buf.getChannelData(Math.min(c, buf.numberOfChannels - 1));
            for (let k = 0; k < n; k++) { const x = (k + 0.5) / n; m[k] = m[k] * Math.cos((x * Math.PI) / 2) + b[k] * Math.sin((x * Math.PI) / 2); }
          }
          await w.add(mix); total += n; from = n; tail = null;
        }
        if (o.mode === "xfade" && i < list.length - 1) {
          const n = Math.min(Math.round(o.secs * sr), Math.floor((to - from) / 2));
          tail = slice(buf, to - n, to, ch); to -= n;
        }
        const body = slice(buf, from, to, ch);
        await w.add(body, async (f) => { ctx.progress((i + f) / list.length); await nextFrame(); });
        total += to - from;
      }
      if (tail) { await w.add(tail); total += tail.length; }
      ctx.status("Đang hoàn tất…");
      const blob = await w.finish();
      const note = [`${list.length} file`, fmtDuration(total / sr), F.label + (F.lossless ? "" : ` ${o.br} kbps`), o.mode === "gap" ? `lặng ${o.secs.toLocaleString("vi-VN")} giây giữa các bài` : o.mode === "xfade" ? `chồng mượt ${o.secs.toLocaleString("vi-VN")} giây` : "", o.norm ? "đã làm đều âm lượng" : ""].filter(Boolean).join(" · ");
      return [{ blob, name: `${baseName(list[0].name)}-ghep-${list.length}-file.${F.ext}`, note, extra: resultPreview(blob) }];
    } finally { ctx.signal.removeEventListener("abort", abort); }
  },
  doneTitle: () => "Đã ghép xong!"
});
