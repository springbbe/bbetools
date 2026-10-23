/* Tự sinh bởi scripts/build.js từ assets/tools/keyboard-test.js và i18n/en/js/ — đừng sửa tay. */
/* Test bàn phím: bố cục Windows/Mac, laptop/bàn phím rời, có/không bàn phím số, giữ nhiều phím cùng lúc, phím dội, lịch sử phím – trang riêng, dùng phần kbdPane trong assets/devices.js */
import { interactiveTool } from "../frames/interactive.js";
import { mountPane, kbdPane } from "../devices.js";

interactiveTool({ mount: (el, ctx) => mountPane(el, ctx, kbdPane, { full: true }) });
