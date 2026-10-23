/* Tự sinh bởi scripts/build.js từ assets/tools/speaker-test.js và i18n/en/js/ — đừng sửa tay. */
/* Test loa, tai nghe – trang riêng, dùng phần spkPane trong assets/devices.js */
import { interactiveTool } from "../frames/interactive.js";
import { mountPane, spkPane } from "../devices.js";

interactiveTool({ mount: (el, ctx) => mountPane(el, ctx, spkPane) });
