/* Tự sinh bởi scripts/build.js từ assets/ai/whisper-worker.js và i18n/en/js/ — đừng sửa tay. */
/* Web Worker chạy mô hình nhận dạng giọng nói Whisper bằng transformers.js (ONNX Runtime: WebGPU hoặc WebAssembly),
   để trang không bị đứng khi mô hình đang nghe. Âm thanh chỉ được xử lý trong worker này, không gửi đi đâu.
   Tin nhắn vào:  { type: "load", id, lib, model, revision, device, dtype }   → "progress"… rồi "ready"
                  { type: "run", id, audio: Float32Array 16 kHz, language }   → "result" { chunks, text }
   Lỗi trả về { type: "error", id, message }. Huỷ giữa chừng: trang gọi worker.terminate(). */
let T = null, asr = null, key = "";

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "load") {
      if (!T) {
        T = await import(m.lib);
        T.env.allowLocalModels = false;
        T.env.useBrowserCache = true; // mô hình lưu trong Cache Storage "transformers-cache" cho lần sau
      }
      const k = [m.model, m.revision, m.device, JSON.stringify(m.dtype)].join("|");
      if (k !== key) {
        if (asr) { try { await asr.dispose(); } catch (_) {} asr = null; key = ""; }
        asr = await T.pipeline("automatic-speech-recognition", m.model, {
          revision: m.revision, device: m.device, dtype: m.dtype,
          progress_callback: (p) => {
            if (p && p.status === "progress" && p.file) self.postMessage({ type: "progress", file: p.file, loaded: p.loaded || 0, total: p.total || 0 });
          }
        });
        key = k;
      }
      self.postMessage({ type: "ready", id: m.id });
    } else if (m.type === "run") {
      const opts = { task: "transcribe", return_timestamps: true };
      if (m.language) opts.language = m.language;
      const r = await asr(m.audio, opts);
      self.postMessage({ type: "result", id: m.id, text: r.text || "", chunks: (r.chunks || []).map((c) => ({ timestamp: c.timestamp, text: c.text })) });
    }
  } catch (err) {
    self.postMessage({ type: "error", id: m.id, message: String((err && err.message) || err) });
  }
};
