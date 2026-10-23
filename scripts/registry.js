/* Đọc và kiểm tra tools.json. Dùng chung cho build.js, check.js và test. */
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KIND_EXT } from "../assets/lib/filetype.js";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const KINDS = ["file", "text", "form", "interactive"];
export const STATUSES = ["done", "beta", "todo"];
export const ACCEPT_KINDS = [...Object.keys(KIND_EXT), "any"];
export const RESERVED = ["assets", "data", "nhom", "samples", "scripts", "tests", "models", "gioi-thieu", "node_modules", "404", "i18n", "en"];

export async function loadRegistry() {
  return JSON.parse(await readFile(ROOT + "tools.json", "utf8"));
}

export const isLive = (t) => t.status === "done" || t.status === "beta";

/** Trả về danh sách lỗi (chuỗi). Rỗng = hợp lệ. */
export function validate(reg) {
  const errs = [];
  const err = (m) => errs.push(m);
  if (!reg.site || !/^https:\/\/.+\/$/.test(reg.site.baseUrl || "")) err("site.baseUrl phải là URL https kết thúc bằng /");
  const gids = new Set();
  for (const g of reg.groups) {
    if (gids.has(g.id)) err("Trùng id nhóm: " + g.id);
    gids.add(g.id);
    for (const k of ["id", "slug", "name", "icon", "color", "desc"]) if (!g[k]) err(`Nhóm ${g.id}: thiếu ${k}`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug || "")) err(`Nhóm ${g.id}: slug không hợp lệ`);
    if (!Number.isInteger(g.phase) || g.phase < 2) err(`Nhóm ${g.id}: cần "phase" (số giai đoạn, từ 2 trở đi)`);
  }
  const ids = new Set(), urls = new Map();
  const sprite = existsSync(ROOT + "assets/icons.svg") ? readFileSync(ROOT + "assets/icons.svg", "utf8") : "";
  for (const t of reg.tools) {
    const where = "Công cụ " + (t.id || "?");
    for (const k of ["id", "slug", "name", "group", "icon", "kind", "desc", "status"]) if (!t[k]) err(`${where}: thiếu ${k}`);
    if (ids.has(t.id)) err("Trùng id: " + t.id);
    ids.add(t.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id || "")) err(`${where}: id chỉ gồm a-z, 0-9 và dấu -`);
    for (const s of [t.slug, ...(t.aliases || [])]) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || "")) err(`${where}: slug/alias "${s}" phải không dấu, chữ thường, nối bằng -`);
      if (RESERVED.includes(s)) err(`${where}: slug/alias "${s}" trùng thư mục hệ thống`);
      if (urls.has(s)) err(`${where}: slug/alias "${s}" đã dùng cho ${urls.get(s)}`);
      urls.set(s, t.id);
    }
    if (!gids.has(t.group)) err(`${where}: nhóm "${t.group}" không tồn tại`);
    if (!KINDS.includes(t.kind)) err(`${where}: kind phải là ${KINDS.join("/")}`);
    if (!STATUSES.includes(t.status)) err(`${where}: status phải là ${STATUSES.join("/")}`);
    if (t.vnOnly != null && typeof t.vnOnly !== "boolean") err(`${where}: vnOnly phải là true/false`);
    if (!Array.isArray(t.keywords) || !t.keywords.length) err(`${where}: cần ít nhất một từ khoá`);
    if (t.kind === "file" && !(t.accept && t.accept.length)) err(`${where}: công cụ kiểu file cần "accept"`);
    for (const a of t.accept || []) if (!ACCEPT_KINDS.includes(a)) err(`${where}: accept "${a}" không hợp lệ (${ACCEPT_KINDS.join(", ")})`);
    if (sprite && !sprite.includes(`id="${t.icon}"`)) err(`${where}: icon "${t.icon}" chưa có trong assets/icons.svg (chạy node scripts/icons.js)`);
    if (isLive(t)) {
      if (!existsSync(ROOT + `assets/tools/${t.id}.js`)) err(`${where}: đã "${t.status}" nhưng thiếu assets/tools/${t.id}.js`);
      for (const d of t.data || []) if (!existsSync(ROOT + `data/${d}.json`)) err(`${where}: thiếu data/${d}.json`);
    }
  }
  for (const t of reg.tools) for (const r of t.related || []) if (!ids.has(r)) err(`Công cụ ${t.id}: related "${r}" không tồn tại`);
  return errs;
}
