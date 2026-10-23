/* Tự sinh bởi scripts/build.js từ assets/tools/convert-audio.js và i18n/en/js/ — đừng sửa tay. */
/* Đổi định dạng âm thanh: MP3, M4A, WAV, OGG (Opus); đọc thêm FLAC, AAC, WebM…; chọn chất lượng, mono/stereo, tần số lấy mẫu.
   Đọc và ghi theo luồng bằng Mediabunny (WebCodecs), nhiều file một lần. */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { mb, probe, audioInfo, AUDIO_OUT, audioKeyOf, bitrateSelect, convert, ensureAudioEncoder, progressReporter, resultPreview, webCodecsMissing } from "../media.js";

const FORMATS = ["mp3", "m4a", "wav", "ogg"];

fileTool({
  accept: ["audio"], multiple: true, noun: "audio files",
  action: "Convert format",
  sample: () => sampleFiles("nhac-mau-2.m4a", "nhac-mau.mp3"),
  warm: () => mb(),
  async load(it) {
    const miss = webCodecsMissing(false);
    if (miss) throw Object.assign(new Error(miss), { userMsg: miss });
    const p = await probe(it.file);
    if (!p.audio) throw Object.assign(new Error("x"), { userMsg: `${it.name} has no audio.` });
    it.p = p; it.key = audioKeyOf(p);
    it.info = audioInfo(p);
  },
  options(el) {
    const fmt = h("div", { class: "opt-group" }, h("p", { class: "opt-title", id: "lbl-fmt", text: "Convert to" }),
      h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": "lbl-fmt" }, FORMATS.map((k) => h("label", null, h("input", { type: "radio", name: "fmt", value: k, checked: k === "mp3" }), h("span", { text: AUDIO_OUT[k].label.replace(/ \(.*\)/, "") })))));
    const note = h("p", { class: "hint", "aria-live": "polite" });
    const sel = (id, label, choices) => h("label", { class: "field" }, h("span", { text: label }), h("select", { id }, choices.map(([v, l]) => h("option", { value: v, text: l }))));
    el.append(fmt, note, bitrateSelect("br", 192),
      sel("ch", "Channels", [["", "Same as original"], ["2", "Stereo (2 channels)"], ["1", "Mono (1 channel, smaller)"]]),
      sel("sr", "Sample rate", [["", "Same as original"], ["44100", "44,1 kHz (CD)"], ["48000", "48 kHz (video)"], ["22050", "22.05 kHz (voice, light)"]]));
    const get = () => ({ fmt: el.querySelector("input[name=fmt]:checked").value, br: +el.querySelector("#br").value, ch: +el.querySelector("#ch").value || 0, sr: +el.querySelector("#sr").value || 0 });
    const upd = () => {
      const o = get(), F = AUDIO_OUT[o.fmt];
      note.textContent = F.note[0].toUpperCase() + F.note.slice(1) + ".";
      el.querySelector("#br").closest(".field").hidden = !!F.lossless;
      // Opus luôn ghi ở 48 kHz
      el.querySelector("#sr").closest(".field").hidden = o.fmt === "ogg";
    };
    el.addEventListener("change", upd); upd();
    return get;
  },
  async run(items, o, ctx) {
    const M = await mb(), F = AUDIO_OUT[o.fmt], outs = [];
    ctx.status("Preparing…"); ctx.progress(-1);
    await ensureAudioEncoder(F.codec);
    if (!(await M.canEncodeAudio(F.codec))) { const e = new Error("x"); e.userMsg = `This browser can't create ${F.label} files. Choose another format (MP3 always works).`; throw e; }
    const list = items.filter((i) => i.p);
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const rep = progressReporter({ progress: (f) => ctx.progress((i + f) / list.length), status: ctx.status }, list.length > 1 ? `Converting file ${i + 1}/${list.length}…` : "Converting…");
      const sr = F.codec === "opus" ? 48000 : o.sr || undefined;
      const res = await convert({
        input: it.p.input, format: F.fmt(M), mime: F.mime, need: ["audio"], signal: ctx.signal, onProgress: rep, video: { discard: true },
        tags: o.fmt === "wav" ? {} : undefined,
        audio: { codec: F.codec, forceTranscode: true, ...(F.lossless ? {} : { quality: new M.Quality({ bitrate: o.br * 1000 }) }), ...(o.ch ? { numberOfChannels: o.ch } : {}), ...(sr ? { sampleRate: sr } : {}) }
      });
      const same = (/\.([a-z0-9]+)$/i.exec(it.name) || [])[1]?.toLowerCase() === F.ext;
      const name = baseName(it.name) + (same ? (F.lossless ? "-new" : `-${o.br}kbps`) : "") + "." + F.ext;
      outs.push({ blob: res.blob, name, before: it.size, note: [F.label + (F.lossless ? "" : ` ${o.br} kbps`), ...res.warnings].join(" · "), extra: list.length === 1 ? resultPreview(res.blob) : null });
    }
    return outs;
  },
  summary: (outs) => (outs.length > 1 ? `Converted ${outs.length} files.` : null),
  doneTitle: (outs) => `Converted to ${outs[0].name.split(".").pop().toUpperCase()}!`
});
