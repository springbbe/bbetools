/* Tự sinh bởi scripts/build.js từ assets/tools/quick-notes.js và i18n/en/js/ — đừng sửa tay. */
/* Ghi chú nhanh: nhiều ghi chú, tự lưu vào bộ nhớ trình duyệt (localStorage) của chính máy này, đồng bộ giữa các tab,
   tìm kiếm không dấu, tải về .txt / .zip, mở file .txt. Không gửi đi đâu. */
import { h, icon, store, save, zip, copyText, confirmDialog, debounce, toast, TOOL_ID } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { removeAccents, slugify } from "../lib/van-ban.js";

const KEY = "notes:" + TOOL_ID;
const fold = (s) => removeAccents(s).toLowerCase();
const titleOf = (t) => (t.split("\n").find((l) => l.trim()) || "").trim().slice(0, 80) || "Empty note";
const when = (ms) => { const d = new Date(ms), now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("en-US"); };
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

interactiveTool({
  mount(el, ctx) {
    let db = store.get(KEY, null);
    if (!db || !Array.isArray(db.notes) || !db.notes.length) {
      const n = { id: newId(), text: "", updated: Date.now() };
      db = { notes: [n], cur: n.id, size: 17, mono: false };
    }
    const cur = () => db.notes.find((n) => n.id === db.cur) || db.notes[0];

    const q = h("input", { class: "input", type: "search", placeholder: "Search notes…", "aria-label": "Search notes", oninput: drawList });
    const list = h("ul", { class: "qn-list", role: "listbox", "aria-label": "Note list" });
    const listBox = h("details", { class: "qn-side", open: matchMedia("(min-width: 800px)").matches },
      h("summary", { class: "qn-sum" }), q, list);
    const ta = h("textarea", { class: "qn-ta", "aria-label": "Note content", placeholder: "Type a note here… It's saved automatically on this device.", spellcheck: "true" });
    const status = h("span", { class: "hint qn-status", "aria-live": "polite" });
    const stat = h("span", { class: "hint" });
    const fileIn = h("input", { type: "file", accept: ".txt,.md,text/plain,text/markdown", multiple: true, hidden: true, onchange: openFiles });
    const btn = (ic, label, fn, cls = "ib") => h("button", { class: cls, type: "button", title: label, "aria-label": label, html: icon(ic), onclick: fn });
    const bar = h("div", { class: "qn-bar" },
      h("button", { class: "btn sm", type: "button", onclick: add }, h("span", { html: icon("plus"), style: { display: "contents" } }), "New note"),
      btn("copy", "Copy note", () => copyText(ta.value, "Note copied")),
      btn("download", "Download this note (.txt)", () => save(new Blob([ta.value], { type: "text/plain;charset=utf-8" }), (slugify(titleOf(ta.value), { max: 40 }) || "note") + ".txt")),
      btn("file-archive", "Download all (.zip)", downloadAll),
      btn("upload", "Open .txt file", () => fileIn.click()),
      btn("type", "Change font size", () => { db.size = db.size >= 21 ? 15 : db.size + 2; persist(); style(); }),
      btn("code", "Toggle monospace font", () => { db.mono = !db.mono; persist(); style(); }),
      btn("trash-2", "Delete this note", remove), fileIn);
    el.append(h("div", { class: "qn" }, listBox, h("div", { class: "qn-main" }, bar, ta, h("div", { class: "qn-foot" }, stat, status))));

    function persist() {
      if (!store.set(KEY, db)) { status.textContent = "⚠ Couldn't save: the browser storage is full or blocked. Download your notes."; status.classList.add("err"); return false; }
      status.classList.remove("err");
      return true;
    }
    const saveText = debounce(() => {
      const n = cur();
      if (n.text === ta.value) return;
      n.text = ta.value; n.updated = Date.now();
      if (persist()) status.textContent = "Saved at " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      drawList();
    }, 400);
    function style() { ta.style.fontSize = db.size + "px"; ta.classList.toggle("mono", !!db.mono); }
    function count() {
      const t = ta.value, words = (t.match(/[\p{L}\p{N}]+/gu) || []).length;
      stat.textContent = `${words.toLocaleString("en-US")} words · ${t.length.toLocaleString("en-US")} characters`;
    }
    function open(id) {
      const n = cur(); if (n.text !== ta.value) { n.text = ta.value; n.updated = Date.now(); }
      db.cur = id; persist();
      ta.value = cur().text; count(); drawList();
      status.textContent = "";
      if (!matchMedia("(min-width: 800px)").matches) listBox.open = false;
      ta.focus();
    }
    function add(_, text = "") {
      const n = { id: newId(), text, updated: Date.now() };
      db.notes.unshift(n);
      open(n.id);
    }
    async function remove() {
      const n = cur();
      if (n.text.trim() && !(await confirmDialog("Delete this note?", `“${titleOf(n.text)}” will be deleted from this device and can't be recovered.`, "Delete"))) return;
      db.notes = db.notes.filter((x) => x !== n);
      if (!db.notes.length) db.notes.push({ id: newId(), text: "", updated: Date.now() });
      db.cur = db.notes[0].id; persist();
      ta.value = cur().text; count(); drawList();
      toast("Note deleted");
    }
    async function downloadAll() {
      const notes = db.notes.filter((n) => n.text.trim());
      if (!notes.length) { toast("No notes with content yet."); return; }
      save(await zip(notes.map((n) => ({ name: (slugify(titleOf(n.text), { max: 40 }) || "note") + ".txt", blob: new Blob([n.text], { type: "text/plain" }) }))), "notes-bbetools.zip");
    }
    async function openFiles() {
      for (const f of fileIn.files) {
        if (f.size > 2 << 20) { toast(f.name + " is too large (max 2 MB).", { type: "err" }); continue; }
        add(null, await f.text());
      }
      fileIn.value = "";
    }
    function drawList() {
      const k = fold(q.value.trim());
      const notes = db.notes.slice().sort((a, b) => b.updated - a.updated);
      list.textContent = "";
      for (const n of notes) {
        if (k && !fold(n.text).includes(k)) continue;
        const text = n.id === db.cur ? ta.value : n.text;
        const li = h("li", { role: "option", tabindex: "0", "aria-selected": String(n.id === db.cur), class: n.id === db.cur ? "on" : null, onclick: () => open(n.id), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(n.id); } } },
          h("b", { text: titleOf(text) }), h("small", { text: when(n.updated) + " · " + text.length.toLocaleString("en-US") + " characters" }));
        list.append(li);
      }
      if (!list.children.length) list.append(h("li", { class: "empty", text: "No matching notes." }));
      listBox.querySelector("summary").textContent = `All notes (${db.notes.length})`;
    }
    ta.addEventListener("input", () => { status.textContent = "Typing…"; count(); saveText(); });
    // ghi chú sửa ở tab khác
    window.addEventListener("storage", (e) => {
      if (e.key !== "bt:" + KEY || !e.newValue) return;
      try { const nd = JSON.parse(e.newValue); const keepCur = db.cur; db = nd; if (db.notes.some((n) => n.id === keepCur)) db.cur = keepCur; ta.value = cur().text; count(); drawList(); style(); status.textContent = "Updated from another tab"; } catch (_) {}
    });
    window.addEventListener("beforeunload", () => { const n = cur(); if (n.text !== ta.value) { n.text = ta.value; n.updated = Date.now(); persist(); } });
    document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s" && !document.querySelector("dialog[open]")) { e.preventDefault(); saveText(); toast("Notes always save automatically on this device 🙂"); } });
    ta.value = cur().text; style(); count(); drawList();
    persist();
  }
});

const css = document.createElement("style");
css.textContent = `.qn{display:grid;gap:14px}@media(min-width:800px){.qn{grid-template-columns:260px minmax(0,1fr);align-items:start}}
.qn-side{border:1px solid var(--line);border-radius:14px;padding:10px;display:grid;gap:8px}
.qn-side[open]{display:grid}.qn-sum{font-weight:700;cursor:pointer;padding:4px 2px}
@media(min-width:800px){.qn-sum{pointer-events:none;list-style:none}.qn-sum::-webkit-details-marker{display:none}}
.qn-side .input{margin:6px 0}
.qn-list{list-style:none;margin:0;padding:0;display:grid;gap:4px;max-height:60vh;overflow:auto}
.qn-list li{padding:8px 10px;border-radius:10px;cursor:pointer;display:grid;gap:2px;min-width:0}
.qn-list li:hover{background:var(--surface-2)}.qn-list li.on{background:var(--brand-soft)}
.qn-list li:focus-visible{outline:3px solid var(--brand);outline-offset:-3px}
.qn-list b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qn-list small{color:var(--muted);font-size:12.5px}
.qn-list li.empty{cursor:default;color:var(--muted);font-size:14px}
.qn-main{display:flex;flex-direction:column;gap:8px;min-width:0}
.qn-bar{display:flex;flex-wrap:wrap;align-items:center;gap:2px}.qn-bar .btn{margin-right:8px}
.qn-ta{width:100%;min-height:min(60vh,520px);resize:vertical;padding:14px 16px;border:1px solid var(--line-2);border-radius:14px;background:var(--surface);color:var(--ink);font:inherit;line-height:1.6}
.qn-ta.mono{font-family:var(--mono)}.qn-ta:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 25%,transparent)}
.qn-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px}.qn-status.err{color:var(--err)}`;
document.head.append(css);
