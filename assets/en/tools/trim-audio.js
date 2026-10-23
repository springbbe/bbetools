/* Tự sinh bởi scripts/build.js từ assets/tools/trim-audio.js và i18n/en/js/ — đừng sửa tay. */
/* Cắt âm thanh: chọn đoạn trên dạng sóng (kéo tay nắm, phím mũi tên, nhập thời gian), nghe thử, tăng/giảm dần,
   xuất MP3, M4A, M4R (nhạc chuông iPhone), WAV, OGG. Giữ định dạng gốc và không có hiệu ứng → chép nguyên dữ liệu,
   không mã hoá lại nên không giảm chất lượng. */
import { h, icon, baseName, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { mb, probe, audioInfo, AUDIO_OUT, audioKeyOf, bitrateSelect, player, rangeEditor, waveform, convert, fadeProcess, ensureAudioEncoder, progressReporter, resultPreview, webCodecsMissing } from "../media.js";
import { fmtTime, fmtDuration } from "../lib/media.js";

let S = null;          // { it, p, key, pl, rg }
let area = null, hintEl = null, origOpt = null;
const FORMATS = ["mp3", "m4a", "m4r", "wav", "ogg"];
const tname = (t) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, "0")}s`;

fileTool({
  accept: ["audio"], multiple: false, noun: "audio files",
  action: "Trim audio",
  sample: () => sampleFiles("nhac-mau.mp3"),
  warm: () => mb(),
  custom: { mount(ctx) { area = h("div", { class: "md-work" }); ctx.workMain.append(area); } },
  options(el) {
    origOpt = h("option", { value: "orig", text: "Same as the original" });
    const fmt = h("select", { id: "fmt" }, origOpt, FORMATS.map((k) => h("option", { value: k, text: `${AUDIO_OUT[k].label} – ${AUDIO_OUT[k].note}` })));
    const slider = (id, label) => h("div", { class: "opt-group" }, h("p", { class: "opt-title", text: label }),
      h("div", { class: "range-row" }, h("input", { type: "range", id, min: 0, max: 10, step: 0.5, value: 0, "aria-label": label }), h("output", { id: id + "-v", text: "off" })));
    hintEl = h("p", { class: "hint", "aria-live": "polite" });
    el.append(h("label", { class: "field" }, h("span", { text: "Output format" }), fmt), bitrateSelect("br", 192),
      slider("fin", "Fade in at the start"), slider("fout", "Fade out at the end"), hintEl);
    const get = () => ({ fmt: fmt.value, br: +el.querySelector("#br").value, fin: +el.querySelector("#fin").value, fout: +el.querySelector("#fout").value });
    const upd = () => {
      const o = get();
      for (const k of ["fin", "fout"]) el.querySelector(`#${k}-v`).textContent = o[k] ? o[k].toLocaleString("en-US") + " sec" : "off";
      const key = o.fmt === "orig" ? (S && S.key) || "mp3" : o.fmt;
      const copy = o.fmt === "orig" && S && S.key && !o.fin && !o.fout;
      el.querySelector("#br").closest(".field").hidden = !!(AUDIO_OUT[key].lossless || copy);
      hintEl.textContent = copy ? "Original format and no effects: the data is copied as is, with no quality loss."
        : key === "m4r" ? "To put it on an iPhone: connect it to a computer, open Finder (Mac) or iTunes (Windows) and drag the .m4r file onto the iPhone. Ringtones can be up to 40 seconds."
        : AUDIO_OUT[key].lossless ? "WAV is uncompressed, so files are fairly large (about 10 MB per minute)." : "";
    };
    el.addEventListener("input", upd); el.addEventListener("change", upd); upd();
    return get;
  },
  async onAdd(items, ctx) {
    if (S) { S.pl.destroy(); S.rg.destroy(); S = null; }
    area.textContent = "";
    area.append(h("p", { class: "md-loading", html: "<span class=\"spinner sm\"></span> Reading file…" }));
    const it = items[0];
    try {
      const miss = webCodecsMissing(false);
      if (miss) throw Object.assign(new Error(miss), { userMsg: miss });
      const p = await probe(it.file);
      if (!p.audio) throw Object.assign(new Error("x"), { userMsg: "This file has no audio." });
      if (!p.audio.canDecode) throw Object.assign(new Error("x"), { userMsg: `This browser can't read ${p.audio.codec} audio. Try a recent Chrome or Edge.` });
      start(it, p, ctx);
    } catch (e) {
      console.error(e);
      area.textContent = "";
      area.append(h("p", { class: "alert err", text: e.userMsg || "Couldn't read this file." }));
      S = null; ctx.refresh();
    }
  },
  ready(items, o) {
    if (!S) return "Reading file…";
    const { start, end } = S.rg.get();
    if (end - start < 0.1) return "The selection is too short.";
    const key = o.fmt === "orig" ? S.key || "mp3" : o.fmt;
    if (key === "m4r" && end - start > 40.05) return `iPhone ringtones can be up to 40 seconds; the current selection is ${fmtDuration(end - start)}.`;
    return true;
  },
  async run(items, o, ctx) {
    const M = await mb();
    const { start, end } = S.rg.get(), len = end - start;
    const key = o.fmt === "orig" ? S.key || "mp3" : o.fmt, F = AUDIO_OUT[key];
    if (key === "m4r" && len > 40.05) { const e = new Error("x"); e.userMsg = "iPhone ringtones can be up to 40 seconds. Choose a shorter selection."; throw e; }
    ctx.status("Preparing…"); ctx.progress(-1);
    await ensureAudioEncoder(F.codec);
    const fade = o.fin > 0 || o.fout > 0;
    const common = { input: S.p.input, format: F.fmt(M), mime: F.mime, trim: { start, end }, need: ["audio"], video: { discard: true }, signal: ctx.signal, onProgress: progressReporter(ctx, "Trimming…"), tags: key === "wav" ? {} : undefined };
    let res = null, copied = false;
    if (o.fmt === "orig" && S.key && !fade) {
      try { res = await convert({ ...common, copy: { mode: "forced", shiftTolerance: 0.1 } }); copied = true; }
      catch (e) { if (e && e.cancelled) throw e; res = null; }
    }
    if (!res) {
      res = await convert({ ...common, copy: false,
        audio: { codec: F.codec, forceTranscode: true, ...(F.lossless ? {} : { quality: new M.Quality({ bitrate: o.br * 1000 }) }), ...(F.codec === "opus" ? { sampleRate: 48000 } : {}), ...(fade ? { process: await fadeProcess(len, o.fin, o.fout) } : {}) } });
    }
    const note = [`Segment ${fmtTime(start)} → ${fmtTime(end)} (${fmtDuration(len)})`,
      copied ? "original quality kept" : F.label + (F.lossless ? "" : ` ${o.br} kbps`),
      o.fin ? `fade in ${o.fin.toLocaleString("en-US")} sec` : "", o.fout ? `fade out ${o.fout.toLocaleString("en-US")} sec` : ""].filter(Boolean).join(" · ");
    return [{ blob: res.blob, name: `${baseName(S.it.name)}-${tname(start)}-${tname(end)}.${F.ext}`, note, extra: resultPreview(res.blob) }];
  },
  doneTitle: () => "Trimmed!"
});

function start(it, p, ctx) {
  const key = audioKeyOf(p);
  const pl = player(it.file);
  area.textContent = "";
  const D = p.duration;
  const rg = rangeEditor({ duration: D, media: pl.el, start: 0, end: D, onChange: () => ctx.refresh() });
  area.append(h("div", { class: "row", style: { justifyContent: "space-between" } }, h("p", { class: "md-meta" }, h("b", { text: it.name }), h("span", { text: audioInfo(p) })),
    h("button", { class: "btn ghost sm", type: "button", onclick: () => ctx.pick() }, h("span", { html: icon("refresh-cw"), style: { display: "contents" } }), "Choose another file")), pl.el, rg.el,
    h("p", { class: "hint", html: `Drag the two handles or enter times (min:sec, e.g. <b>1:05.5</b>). Select a handle and use ← → to adjust by 0.1 second (hold Shift: 1 second).` }));
  S = { it, p, key, pl, rg };
  origOpt.textContent = key ? `Same as the original (${AUDIO_OUT[key].label})` : "Same as the original (will save as MP3)";
  ctx.optsEl.dispatchEvent(new Event("change"));
  waveform(it.file).then((pk) => { if (S && S.rg === rg) rg.setPeaks(pk); }).catch((e) => console.warn("waveform", e));
  ctx.refresh();
}
