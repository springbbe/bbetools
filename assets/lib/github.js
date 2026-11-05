/* Tải thư mục GitHub (hàm thuần): đọc link GitHub (thư mục, file, repo, raw), liệt kê nhánh/đường dẫn có thể (tên nhánh
   có thể chứa "/"), dựng URL API và raw, lọc cây file, nhận ra file Git LFS. Có test ở tests/tai-ve.test.js */

export const API = "https://api.github.com";
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
const NAME = /^[A-Za-z0-9_.-]+$/;

/**
 * Link GitHub → { owner, repo, kind: "root" | "tree" | "blob", segs: [phần sau tree/ hoặc blob/] }, null nếu không nhận ra.
 * Nhận: github.com/o/r, …/tree/<nhánh>/<đường dẫn>, …/blob/<nhánh>/<file>, raw.githubusercontent.com/o/r/<nhánh>/<file>, o/r
 */
export function parseGitHub(input) {
  let s = String(input == null ? "" : input).trim().replace(/[?#].*$/, "");
  if (!s) return null;
  if (/^[\w.-]+\/[\w.-]+\/?$/.test(s) && !/\.(com|io)\//i.test(s)) s = "https://github.com/" + s;
  if (!/^[a-z]+:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch (_) { return null; }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean).map((x) => { try { return decodeURIComponent(x); } catch (_) { return x; } });
  if (parts.length < 2) return null;
  const owner = parts[0], repo = parts[1].replace(/\.git$/i, "");
  if (!NAME.test(owner) || !NAME.test(repo)) return null;
  if (host === "raw.githubusercontent.com") {
    let rest = parts.slice(2);
    if (rest[0] === "refs" && (rest[1] === "heads" || rest[1] === "tags")) rest = rest.slice(2);
    return rest.length >= 2 ? { owner, repo, kind: "blob", segs: rest } : null;
  }
  if (host !== "github.com") return null;
  const k = parts[2];
  if (!k) return { owner, repo, kind: "root", segs: [] };
  if ((k === "tree" || k === "blob") && parts.length > 3) return { owner, repo, kind: k, segs: parts.slice(3) };
  return null;
}

/** Các cách tách { ref, path } từ segs (tên nhánh có thể có "/"): thử lần lượt, cách ngắn trước */
export function refCandidates(p) {
  if (p.kind === "root") return [{ ref: "HEAD", path: "" }];
  const out = [];
  const max = p.kind === "blob" ? p.segs.length - 1 : p.segs.length;
  for (let i = 1; i <= max; i++) out.push({ ref: p.segs.slice(0, i).join("/"), path: p.segs.slice(i).join("/") });
  return out;
}

export const contentsUrl = (o, r, path, ref) => `${API}/repos/${o}/${r}/contents/${enc(path)}${ref ? "?ref=" + encodeURIComponent(ref) : ""}`;
export const treeUrl = (o, r, sha) => `${API}/repos/${o}/${r}/git/trees/${encodeURIComponent(sha)}?recursive=1`;
export const blobUrl = (o, r, sha) => `${API}/repos/${o}/${r}/git/blobs/${sha}`;
export const rawUrl = (o, r, ref, path) => `https://raw.githubusercontent.com/${o}/${r}/${enc(ref)}/${enc(path)}`;
export const lfsUrl = (o, r, ref, path) => `https://media.githubusercontent.com/media/${o}/${r}/${enc(ref)}/${enc(path)}`;
export const parentOf = (path) => path.split("/").slice(0, -1).join("/");
export const baseOf = (path) => path.split("/").pop();

/** Cây file (kết quả git/trees?recursive=1) → { files: [{ path, size, sha }], skipped: số submodule/symlink } */
export function treeFiles(tree) {
  const files = [];
  let skipped = 0;
  for (const t of tree.tree || []) {
    if (t.type === "blob" && t.mode !== "120000") files.push({ path: t.path, size: t.size || 0, sha: t.sha });
    else if (t.type === "commit" || t.mode === "120000") skipped++;
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped, truncated: !!tree.truncated };
}

/** File con trỏ Git LFS (file thật nằm ở media.githubusercontent.com) */
export function isLfsPointer(bytes) {
  if (!bytes || bytes.length > 400) return false;
  return new TextDecoder().decode(bytes.slice(0, 50)).startsWith("version https://git-lfs.github.com/spec/");
}

/** Tên file .zip: repo-thư-mục.zip */
export function zipName(o, r, path) {
  const b = path ? baseOf(path) : "";
  return (b && b !== r ? `${r}-${b}` : r).replace(/[\\/:*?"<>|]+/g, "-") + ".zip";
}

/** Thông báo lỗi giới hạn lượt gọi API (header x-ratelimit-reset tính bằng giây) */
export function rateLimitMinutes(resetSec, nowMs = Date.now()) {
  return Math.max(1, Math.ceil((resetSec * 1000 - nowMs) / 60000));
}
