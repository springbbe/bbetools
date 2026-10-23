/* Tự sinh bởi scripts/build.js từ assets/tools/mouse-test.js và i18n/en/js/ — đừng sửa tay. */
/* Test chuột: các nút, nhấp đúp, tự nhấp đúp, con lăn, tần số báo – trang riêng, dùng phần mousePane trong assets/devices.js */
import { interactiveTool } from "../frames/interactive.js";
import { mountPane, mousePane } from "../devices.js";

interactiveTool({ mount: (el, ctx) => mountPane(el, ctx, mousePane) });
