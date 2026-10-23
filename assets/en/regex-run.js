/* Tự sinh bởi scripts/build.js từ assets/regex-run.js và i18n/en/js/ — đừng sửa tay. */
/* Chạy biểu thức chính quy trong Web Worker (assets/regex-worker.js) có giới hạn thời gian:
   biểu thức lặp quá lâu (vd. (a+)+$) sẽ bị huỷ thay vì làm treo trang. Dùng chung cho Kiểm tra regex, Tìm và thay thế. */
let worker = null, seq = 0;
const pending = new Map();

function start() {
  worker = new Worker(new URL("./regex-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (e) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    clearTimeout(p.timer);
    if (e.data.error) { const err = new Error(e.data.error); err.userMsg = e.data.error; p.reject(err); } else p.resolve(e.data.result);
  };
}

/** op: "match" (source, flags, text, replacement?) | "replace" (text, find, replacement, opts) */
export function runRegexTask(op, args, timeout = 2500) {
  if (!worker) start();
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // huỷ worker đang kẹt, mọi yêu cầu đang chờ đều hỏng
      worker.terminate(); worker = null;
      const msg = `The expression ran longer than ${(timeout / 1000).toLocaleString("en-US")} seconds and was stopped (usually due to nested repetition like (a+)+ or (.*)*). Please fix the expression.`;
      for (const [, p] of pending) { clearTimeout(p.timer); const err = new Error(msg); err.userMsg = msg; p.reject(err); }
      pending.clear();
    }, timeout);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, op, args });
  });
}
