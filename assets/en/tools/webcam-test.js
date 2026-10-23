/* Tự sinh bởi scripts/build.js từ assets/tools/webcam-test.js và i18n/en/js/ — đừng sửa tay. */
/* Test webcam – trang riêng, dùng phần camPane trong assets/devices.js */
import { interactiveTool } from "../frames/interactive.js";
import { mountPane, camPane } from "../devices.js";

interactiveTool({ mount: (el, ctx) => mountPane(el, ctx, camPane) });
