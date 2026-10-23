/* Tự sinh bởi scripts/build.js từ assets/tools/mic-test.js và i18n/en/js/ — đừng sửa tay. */
/* Test micro – trang riêng, dùng phần micPane trong assets/devices.js */
import { interactiveTool } from "../frames/interactive.js";
import { mountPane, micPane } from "../devices.js";

interactiveTool({ mount: (el, ctx) => mountPane(el, ctx, micPane) });
