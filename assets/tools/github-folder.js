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

    const linkIn = h("input", { id: "gh-link", type: "url", inputmode: "url", autocomplete: "off", spellcheck: "false", placeholder: "https://github.com/chủ-repo/tên-repo/tree/main/thư-mục", value: S.get("link", "") });
    linkIn.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); list(); } });
    linkIn.addEventListener("paste", () => setTimeout(() => { if (parseGitHub(linkIn.value)) list(); }, 0));
    const tok = passwordField({ id: "gh-token", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_… hoặc ghp_…" });
    const getBtn = h("button", { class: "btn big", type: "button", onclick: () => list() }, btnIcon("folder-down"), "Lấy danh sách file");
    const status = h("div", { "aria-live": "polite" });
    const res = h("section", { class: "gh-res", hidden: true, "aria-label": "Kết quả" });

    el.append(
      h("div", { class: "gh-form" },
        h("div", { class: "field" }, h("label", { for: "gh-link", text: "Link thư mục, file hoặc repo GitHub" }), linkIn,
          h("small", { text: "Mở thư mục trên github.com rồi sao chép link trên thanh địa chỉ. Link một file (…/blob/…) hay cả repo cũng được." })),
        h("div", { class: "row" }, getBtn,
          h("button", { class: "btn ghost", type: "button", onclick: () => { linkIn.value = SAMPLE; list(); } }, "Thử với link mẫu")),
        h("details", { class: "gh-tok" },
          h("summary", { text: "Repo riêng tư hoặc bị giới hạn lượt? Dùng token GitHub" }),
          h("div", { class: "field" }, h("label", { for: "gh-token", text: "Token GitHub (tuỳ chọn)" }), tok.el,
            h("small", { text: "Tạo ở GitHub → Settings → Developer settings → Fine-grained tokens, chỉ cần quyền đọc Contents. Token chỉ gửi tới api.github.com, không lưu lại; tải lại trang là mất." })))),
      status, res);

    const token = () => tok.input.value.trim();

    /* --- gọi API --- */
    async function api(url, signal, accept) {
      const headers = { Accept: accept || "application/vnd.github+json" };
      if (token()) headers.Authorization = "Bearer " + token();
      let r;
      try { r = await fetch(url, { credentials: "omit", headers, signal }); }
      catch (e) { if (e.name === "AbortError") throw e; throw userErr("Không kết nối được tới GitHub (api.github.com). Hãy kiểm tra mạng rồi thử lại."); }
      if ((r.status === 403 || r.status === 429) && r.headers.get("x-ratelimit-remaining") === "0") {
        const m = rateLimitMinutes(+r.headers.get("x-ratelimit-reset") || 0);
        throw userErr(token() ? `Token đã hết lượt gọi API của GitHub. Thử lại sau khoảng ${m} phút.`
          : `Đã hết 60 lượt gọi API mỗi giờ mà GitHub cho khi không đăng nhập. Thử lại sau khoảng ${m} phút, hoặc dùng token GitHub (mục bên dưới ô link).`);
      }
      if (r.status === 401) throw userErr("Token GitHub không đúng hoặc đã hết hạn.");
      return r;
    }
    async function json(url, signal) {
      const r = await api(url, signal);
      if (r.status === 404) return null;
      if (!r.ok) throw userErr(`GitHub báo lỗi HTTP ${r.status}.`);
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
        if (item.type === "submodule") throw userErr("Đây là submodule (trỏ sang repo khác). Hãy mở link repo gốc của submodule rồi tải từ đó.");
      }
      throw userErr("Không tìm thấy repo, nhánh hoặc thư mục này. Kiểm tra lại link; repo riêng tư thì cần token GitHub có quyền đọc.");
    }

    async function list() {
      const p = parseGitHub(linkIn.value);
      if (!p) { say(status, "err", "Chưa nhận ra link. Dán link dạng https://github.com/chủ-repo/tên-repo/tree/main/thư-mục"); linkIn.focus(); return; }
      S.set("link", linkIn.value.trim().slice(0, 500));
      if (abort) abort.abort();
      const ac = abort = new AbortController();
      getBtn.disabled = true; res.hidden = true; found = null;
      say(status, "info", "Đang lấy danh sách file…");
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
      const ul = h("ul", { class: "gh-list", "aria-label": "Các file" }, f.files.slice(0, SHOW).map((x) => h("li", null, h("span", { text: x.path }), h("span", { text: fmtSize(x.size) }))));
      if (f.files.length > SHOW) ul.append(h("li", null, h("span", { text: `… và ${fmtNum(f.files.length - SHOW)} file khác` })));
      const dlStatus = h("div", { "aria-live": "polite" });
      const dlBtn = h("button", { class: "btn big", type: "button", onclick: () => download(dlBtn, dlStatus) }, btnIcon("download"),
        f.single ? `Tải file (${fmtSize(total)})` : `Tải ${fmtNum(f.files.length)} file dạng .zip (${fmtSize(total)})`);
      dlBtn.disabled = !f.files.length;
      res.append(
        h("div", null, h("h2", { text: where }), h("p", { class: "hint", style: { margin: "4px 0 0" }, text: `Nhánh ${f.ref === "HEAD" ? "mặc định" : f.ref} · ${fmtNum(f.files.length)} file · ${fmtSize(total)}` })),
        f.files.length ? ul : h("p", { class: "hint", text: "Thư mục trống." }));
      if (f.truncated) say(res.appendChild(h("div")), "err", "Thư mục quá lớn nên GitHub chỉ trả một phần danh sách. Hãy mở và tải từng thư mục con nhỏ hơn.");
      if (f.skipped) res.append(h("p", { class: "hint", text: `Bỏ qua ${f.skipped} submodule hoặc liên kết tắt (symlink): GitHub không lưu chúng như file thường.` }));
      if (total > BIG) say(res.appendChild(h("div")), "info", "Thư mục khá lớn: file .zip được tạo trong bộ nhớ của trình duyệt, máy yếu hoặc điện thoại có thể bị chậm.");
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
        catch (e) { if (e.name === "AbortError") throw e; throw userErr("Không kết nối được tới GitHub (raw.githubusercontent.com). Hãy kiểm tra mạng rồi thử lại."); }
      }
      if (!r.ok) throw userErr(`Không tải được ${full} (HTTP ${r.status}).`);
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
          say(box, "info", "Đang tải…");
          save(await fetchFile(f, f.files[0], ac.signal), f.files[0].path);
          say(box, "ok", "Đã tải " + f.files[0].path);
          return;
        }
        const root = (f.path ? baseOf(f.path) : f.repo) + "/";
        const out = [];
        let done = 0, bytes = 0;
        say(box, "info", `Đang tải 0/${f.files.length} file…`);
        await pool(f.files, 6, async (x) => {
          const blob = await fetchFile(f, x, ac.signal);
          out.push({ name: root + x.path, blob });
          bytes += blob.size;
          say(box, "info", `Đang tải ${++done}/${f.files.length} file (${fmtSize(bytes)})…`);
        }, ac.signal);
        if (ac.signal.aborted) return;
        out.sort((a, b) => a.name.localeCompare(b.name));
        say(box, "info", "Đang nén .zip…");
        const z = await zip(out);
        const name = zipName(f.owner, f.repo, f.path);
        save(z, name);
        say(box, "ok", `Đã tạo ${name}: ${out.length} file (${fmtSize(z.size)}).`);
      } catch (e) {
        if (e.name !== "AbortError") { say(box, "err", e.userMsg || e.message); if (!e.userMsg) console.error(e); }
      } finally { if (abort === ac) abort = null; btn.disabled = false; }
    }
  }
});
