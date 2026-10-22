/* Đổi định dạng âm thanh: MP3, M4A, WAV, OGG (Opus); đọc thêm FLAC, AAC, WebM…; chọn chất lượng, mono/stereo, tần số lấy mẫu.
   Đọc và ghi theo luồng bằng Mediabunny (WebCodecs), nhiều file một lần. */
import { h, baseName, sampleFiles } from "../core.js";
import { fileTool } from "../frames/file.js";
import { mb, probe, audioInfo, AUDIO_OUT, audioKeyOf, bitrateSelect, convert, ensureAudioEncoder, progressReporter, resultPreview, webCodecsMissing } from "../media.js";

const FORMATS = ["mp3", "m4a", "wav", "ogg"];

fileTool({
  accept: ["audio"], multiple: true, noun: "file âm thanh",
  action: "Đổi định dạng",
  sample: () => sampleFiles("nhac-mau-2.m4a", "nhac-mau.mp3"),
  warm: () => mb(),
  async load(it) {
    const miss = webCodecsMissing(false);
    if (miss) throw Object.assign(new Error(miss), { userMsg: miss });
    const p = await probe(it.file);
    if (!p.audio) throw Object.assign(new Error("x"), { userMsg: `${it.name} không có tiếng.` });
    it.p = p; it.key = audioKeyOf(p);
    it.info = audioInfo(p);
  },
  options(el) {
    const fmt = h("div", { class: "opt-group" }, h("p", { class: "opt-title", id: "lbl-fmt", text: "Đổi sang" }),
      h("div", { class: "seg full", role: "radiogroup", "aria-labelledby": "lbl-fmt" }, FORMATS.map((k) => h("label", null, h("input", { type: "radio", name: "fmt", value: k, checked: k === "mp3" }), h("span", { text: AUDIO_OUT[k].label.replace(/ \(.*\)/, "") })))));
    const note = h("p", { class: "hint", "aria-live": "polite" });
    const sel = (id, label, choices) => h("label", { class: "field" }, h("span", { text: label }), h("select", { id }, choices.map(([v, l]) => h("option", { value: v, text: l }))));
    el.append(fmt, note, bitrateSelect("br", 192),
      sel("ch", "Kênh", [["", "Giữ như gốc"], ["2", "Stereo (2 kênh)"], ["1", "Mono (1 kênh, nhẹ hơn)"]]),
      sel("sr", "Tần số lấy mẫu", [["", "Giữ như gốc"], ["44100", "44,1 kHz (CD)"], ["48000", "48 kHz (video)"], ["22050", "22,05 kHz (giọng nói, nhẹ)"]]));
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
    ctx.status("Đang chuẩn bị…"); ctx.progress(-1);
    await ensureAudioEncoder(F.codec);
    if (!(await M.canEncodeAudio(F.codec))) { const e = new Error("x"); e.userMsg = `Trình duyệt này không tạo được file ${F.label}. Hãy chọn định dạng khác (MP3 luôn dùng được).`; throw e; }
    const list = items.filter((i) => i.p);
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const rep = progressReporter({ progress: (f) => ctx.progress((i + f) / list.length), status: ctx.status }, list.length > 1 ? `Đang chuyển file ${i + 1}/${list.length}…` : "Đang chuyển…");
      const sr = F.codec === "opus" ? 48000 : o.sr || undefined;
      const res = await convert({
        input: it.p.input, format: F.fmt(M), mime: F.mime, need: ["audio"], signal: ctx.signal, onProgress: rep, video: { discard: true },
        tags: o.fmt === "wav" ? {} : undefined,
        audio: { codec: F.codec, forceTranscode: true, ...(F.lossless ? {} : { quality: new M.Quality({ bitrate: o.br * 1000 }) }), ...(o.ch ? { numberOfChannels: o.ch } : {}), ...(sr ? { sampleRate: sr } : {}) }
      });
      const same = (/\.([a-z0-9]+)$/i.exec(it.name) || [])[1]?.toLowerCase() === F.ext;
      const name = baseName(it.name) + (same ? (F.lossless ? "-moi" : `-${o.br}kbps`) : "") + "." + F.ext;
      outs.push({ blob: res.blob, name, before: it.size, note: [F.label + (F.lossless ? "" : ` ${o.br} kbps`), ...res.warnings].join(" · "), extra: list.length === 1 ? resultPreview(res.blob) : null });
    }
    return outs;
  },
  summary: (outs) => (outs.length > 1 ? `Đã chuyển ${outs.length} file.` : null),
  doneTitle: (outs) => `Đã đổi sang ${outs[0].name.split(".").pop().toUpperCase()}!`
});
