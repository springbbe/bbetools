/* Web Worker chạy biểu thức chính quy cho Kiểm tra regex và Tìm và thay thế: trang chính đặt giờ chờ,
   quá hạn thì huỷ worker (biểu thức lặp quá lâu không làm treo trang). */
import { runRegex, replaceRegex, explainError } from "./lib/regex.js";
import { findReplace } from "./lib/van-ban.js";

self.onmessage = (e) => {
  const { id, op, args } = e.data;
  try {
    let result;
    if (op === "match") {
      const [source, flags, text, replacement] = args;
      result = runRegex(source, flags, text);
      if (replacement != null) result.replaced = replaceRegex(source, flags, text, replacement);
    } else if (op === "replace") {
      result = findReplace(...args);
    }
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: err instanceof SyntaxError ? explainError(err) : err.message });
  }
};
