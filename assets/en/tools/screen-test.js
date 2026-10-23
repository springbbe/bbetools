/* Tự sinh bởi scripts/build.js từ assets/tools/screen-test.js và i18n/en/js/ — đừng sửa tay. */
/* Kiểm tra màn hình: điểm chết, hở sáng, dải màu, thông số – trang riêng, dùng phần scrPane trong assets/devices.js */
import { interactiveTool } from "../frames/interactive.js";
import { mountPane, scrPane } from "../devices.js";

interactiveTool({ mount: (el, ctx) => mountPane(el, ctx, scrPane) });
