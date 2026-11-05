/* Tự sinh bởi scripts/build.js từ assets/tools/github-folder.js và i18n/en/js/ — đừng sửa tay. */
/* Tải thư mục GitHub: dán link một thư mục (hoặc file, hoặc cả repo) trên GitHub → liệt kê file qua API của GitHub
   (api.github.com, cho trang web gọi thẳng) → tải từng file từ raw.githubusercontent.com → nén .zip ngay trên máy.
   Không token: GitHub cho 60 lượt gọi API mỗi giờ (mỗi lần lấy danh sách tốn 1–3 lượt; tải file không tính).
   Có token (repo riêng tư): file tải qua API git/blobs vì raw.githubusercontent.com không nhận header Authorization. */
import { h, save, zip, fmtSize, passwordField, fmtNum } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseGitHub, refCandidates, contentsUrl, treeUrl, blobUrl, rawUrl, lfsUrl, treeFiles, isLfsPointer, zipName, rateLimitMinutes, parentOf, baseOf } from "../lib/github.js";
import { say, btnIcon, pool, userErr } from "../sticker.js";

const SAMPLE = "https://github.com/springbbe/bbetools/tree/main/samples";
const SHOW = 300;      // số dòng hiện trong danh sách file
const BIG = 500 * 2 ** 20;

const css = document.createElement("style");
css.textContent = `
.gh-form{display:flex;flex-direction:column;gap:14px}
.gh-form .btn{white-space:normal;text-align:center}
.gh-res{margin-top:18px;display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.gh-res h2{margin:0;font-size:19px;overflow-wrap:anywhere}
.gh-list{list-style:none;margin:0;padding:8px 10px;max-height:340px;overflow:auto;background:var(--surface-2);border-radius:10px;font-size:13px;line-height:1.7}
.gh-list li{display:flex;gap:10px;justify-content:space-between}
.gh-list li span:first-child{overflow-wrap:anywhere;min-width:0}
.gh-list li span:last-child{color:var(--muted);white-space:nowrap}
.gh-tok summary{cursor:pointer;font-weight:600;font-size:14.5px}
.gh-tok[open] summary{margin-bottom:10px}
`;
document.head.append(css);

interactiveTool({
  mount(el, ctx) {
    const S = ctx.store;
    let abort = null, found = null;

    const linkIn = h("input", { id: "gh-link", type: "url", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://github.com/owner/repo/tree/main/folder", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); list(); } });
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parseGitHub(linkIn.value)) list(); }, 0));
    const tok = passwordField({ id: "gh-token", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_… or ghp_…" });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => list() }, btnIcon("folder-down"), "List files");
    const status = h("div", { "aria-live": "polite" });
    const res = h("section", { class: "gh-res", hidden: true, "aria-label": "Result" });

    el.append(
      h("div", { class: "gh-form" },
        h("div", { class: "field" }, h("label", { for: "gh-link", text: "GitHub folder, file or repo link" }), linkIn,
          h("small", { text: "Open the folder on github.com and copy the link from the address bar. A file link (…/blob/…) or a whole repo works too." })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; list(); } }, "Try a sample link")),
        h("details", { class: "gh-tok" },
          h("summary", { text: "Private repo or hit the rate limit? Use a GitHub token" }),
          h("div", { class: "field" }, h("label", { for: "gh-token", text: "GitHub token (optional)" }), tok.el,
            h("small", { text: "Create one under GitHub → Settings → Developer settings → Fine-grained tokens; read-only Contents access is enough. The token is only sent to api.github.com and never stored; reloading the page clears it." })))),
      status, res);

    const token = () => tok.input.value.trim();

    /* --- gọi API --- */
    async function api(url, signal, accept) {
      const headers = { Accept: accept || "application/vnd.github+json" };
      if (token()) headers.Authorization = "Bearer " + token();
      let r;
      try { r = await fetch(url, { credentials: "omit", headers, signal }); }
      catch (e) { if (e.name === "AbortError") throw e; throw userErr("Couldn't reach GitHub (api.github.com). Check your connection and try again."); }
      if ((r.status === 403 || r.status === 429) && r.headers.get("x-ratelimit-remaining") === "0") {
        const m = rateLimitMinutes(+r.headers.get("x-ratelimit-reset") || 0);
        throw userErr(token() ? `This token has used up its GitHub API calls. Try again in about ${m} ${(m) == 1 ? "minute" : "minutes"}.`
          : `You've used the 60 API calls per hour GitHub allows without signing in. Try again in about ${m} ${(m) == 1 ? "minute" : "minutes"}, or use a GitHub token (section below the link box).`);
      }
      if (r.status === 401) throw userErr("The GitHub token is wrong or has expired.");
      return r;
    }
    async function json(url, signal) {
      const r = await api(url, signal);
      if (r.status === 404) return null;
      if (!r.ok) throw userErr(`GitHub returned HTTP error ${r.status}.`);
      return r.json();
    }

    /** Tìm nhánh + thư mục/file từ link → { owner, repo, ref, path, files, skipped, truncated, single } */
    async function resolve(p, signal) {
      for (const c of refCandidates(p)) {
        if (!c.path) {
          const tree = await json(treeUrl(p.owner, p.repo, c.ref), signal);
          if (tree) return { ...p, ...c, ...treeFiles(tree) };
          continue;
        }
        const list = await json(contentsUrl(p.owner, p.repo, parentOf(c.path), c.ref), signal);
        if (!list) continue;
        const item = Array.isArray(list) ? list.find((x) => x.name === baseOf(c.path)) : null;
        if (!item) continue;
        if (item.type === "file") return { ...p, ...c, files: [{ path: item.name, size: item.size, sha: item.sha }], skipped: 0, truncated: false, single: true };
        if (item.type === "dir") {
          const tree = await json(treeUrl(p.owner, p.repo, item.sha), signal);
          if (tree) return { ...p, ...c, ...treeFiles(tree) };
        }
        if (item.type === "submodule") throw userErr("This is a submodule (it points to another repo). Open the submodule's own repo and download from there.");
      }
      throw userErr("Couldn't find this repo, branch or folder. Check the link; private repos need a GitHub token with read access.");
    }

    async function list() {
      const p = parseGitHub(linkIn.value);
      if (!p) { say(status, "err", "Link not recognized. Paste a link like https://github.com/owner/repo/tree/main/folder"); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim().slice(0, 500));
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true; res.hidden = true; found = null;
      say(status, "info", "Listing files…");
      try {
        found = await resolve(p, ac.signal);
        if (ac.signal.aborted) return;
        say(status, "", "");
        render();
      } catch (e) {
        if (e.name !== "AbortError") { say(status, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) { abort = null; getBtn.disabled = false; } }
    }

    function render() {
      const f = found, total = f.files.reduce((a, x) => a + x.size, 0);
      res.textContent = "";
      const where = `${f.owner}/${f.repo}` + (f.path ? "/" + f.path : "");
      const ul = h("ul", { class: "gh-list", "aria-label": "Files" }, f.files.slice(0, SHOW).map((x) => h("li", null, h("span", { text: x.path }), h("span", { text: fmtSize(x.size) }))));
      if (f.files.length > SHOW) ul.append(h("li", null, h("span", { text: `… and ${fmtNum(f.files.length - SHOW)} more ${(fmtNum(f.files.length - SHOW)) == 1 ? "file" : "files"}` })));
      const dlStatus = h("div", { "aria-live": "polite" });
      const dlBtn = h("button", { class: "btn big", type: "button", onclick: () => download(dlBtn, dlStatus) }, btnIcon("download"),
        f.single ? `Download file (${fmtSize(total)})` : `Download ${fmtNum(f.files.length)} ${(fmtNum(f.files.length)) == 1 ? "file" : "files"} as .zip (${fmtSize(total)})`);
      dlBtn.disabled = !f.files.length;
      res.append(
        h("div", null, h("h2", { text: where }), h("p", { class: "hint", style: { margin: "4px 0 0" }, text: `Branch ${f.ref === "HEAD" ? "default" : f.ref} · ${fmtNum(f.files.length)} ${(fmtNum(f.files.length)) == 1 ? "file" : "files"} · ${fmtSize(total)}` })),
        f.files.length ? ul : h("p", { class: "hint", text: "The folder is empty." }));
      if (f.truncated) say(res.appendChild(h("div")), "err", "The folder is too large, so GitHub only returned part of the list. Open and download smaller subfolders one at a time.");
      if (f.skipped) res.append(h("p", { class: "hint", text: `Skipped ${f.skipped} ${(f.skipped) == 1 ? "submodule or symlink" : "submodules or symlinks"}: GitHub doesn't store them as regular files.` }));
      if (total > BIG) say(res.appendChild(h("div")), "info", "This folder is fairly large: the .zip is built in your browser's memory, so slower computers or phones may lag.");
      res.append(h("div", { class: "row" }, dlBtn), dlStatus);
      res.hidden = false;
      res.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    async function fetchFile(f, x, signal) {
      const full = f.single ? f.path : f.path ? f.path + "/" + x.path : x.path;
      let r;
      if (token()) r = await api(blobUrl(f.owner, f.repo, x.sha), signal, "application/vnd.github.raw+json");
      else {
        try { r = await fetch(rawUrl(f.owner, f.repo, f.ref, full), { credentials: "omit", signal }); }
        catch (e) { if (e.name === "AbortError") throw e; throw userErr("Couldn't reach GitHub (raw.githubusercontent.com). Check your connection and try again."); }
      }
      if (!r.ok) throw userErr(`Couldn't download ${full} (HTTP ${r.status}).`);
      let blob = await r.blob();
      // file Git LFS: thứ tải về chỉ là con trỏ, file thật nằm ở media.githubusercontent.com (repo công khai)
      if (blob.size < 400 && isLfsPointer(new Uint8Array(await blob.arrayBuffer()))) {
        try { const m = await fetch(lfsUrl(f.owner, f.repo, f.ref, full), { credentials: "omit", signal }); if (m.ok) blob = await m.blob(); }
        catch (e) { if (e.name === "AbortError") throw e; }
      }
      return blob;
    }

    async function download(btn, box) {
      if (abort) return;
      const f = found, ac = abort = new AbortController();
      btn.disabled = true;
      try {
        if (f.single) {
          say(box, "info", "Downloading…");
          save(await fetchFile(f, f.files[0], ac.signal), f.files[0].path);
          say(box, "ok", "Downloaded " + f.files[0].path);
          return;
        }
        const root = (f.path ? baseOf(f.path) : f.repo) + "/";
        const out = [];
        let done = 0, bytes = 0;
        say(box, "info", `Downloading 0/${f.files.length} files…`);
        await pool(f.files, 6, async (x) => {
          const blob = await fetchFile(f, x, ac.signal);
          out.push({ name: root + x.path, blob });
          bytes += blob.size;
          say(box, "info", `Downloading ${++done}/${f.files.length} files (${fmtSize(bytes)})…`);
        }, ac.signal);
        if (ac.signal.aborted) return;
        out.sort((a, b) => a.name.localeCompare(b.name));
        say(box, "info", "Creating the .zip…");
        const z = await zip(out);
        const name = zipName(f.owner, f.repo, f.path);
        save(z, name);
        say(box, "ok", `Created ${name}: ${out.length} ${(out.length) == 1 ? "file" : "files"} (${fmtSize(z.size)}).`);
      } catch (e) {
        if (e.name !== "AbortError") { say(box, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) abort = null; btn.disabled = false; }
    }
  }
});
