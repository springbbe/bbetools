/* Tự sinh bởi scripts/build.js từ assets/tools/checklist.js và i18n/en/js/ — đừng sửa tay. */
/* Checklist: nhiều danh sách việc, thêm nhanh (dán nhiều dòng = nhiều việc), đánh dấu xong, sửa, kéo thả hoặc ↑↓ để sắp xếp,
   lưu trong trình duyệt của máy này; sao chép / tải về dạng Markdown "- [x]". */
import { h, icon, store, save, copyText, confirmDialog, dialog, toast, IS_TOUCH, TOOL_ID } from "../core.js";
import { interactiveTool } from "../frames/interactive.js";
import { parseItems, toMarkdown, toPlain, move } from "../lib/checklist.js";
import { slugify } from "../lib/van-ban.js";

const KEY = "lists:" + TOOL_ID;
const TEMPLATES = {
  "Travel packing list": "Passport / ID card\nTickets, booking confirmations\nWallet, bank cards, cash\nPhone, charger, power bank\nClothes\nPajamas\nToothbrush, toothpaste\nSunscreen\nRegular medicines\nUmbrella / raincoat\nSunglasses, hat",
  "Spring cleaning": "Clean the windows\nWash curtains and bedding\nSort the closet, donate old clothes\nDust the shelves\nBuy flowers and plants\nStock up on snacks\nPay the bills\nPlan the week's meals",
  "Grocery shopping": "Vegetables\nMeat\nFish\nEggs\nRice\nMilk\nFruit",
  "Before submitting a report": "Spell check\nNumber the pages\nUpdate the table of contents\nCheck numbers and tables\nExport to PDF\nName the file correctly"
};
/** Hộp thoại nhập tên → chuỗi hoặc null */
const ask = (title, value) => dialog((close) => {
  const inp = h("input", { class: "input", type: "text", value, maxlength: 60, "aria-label": title });
  setTimeout(() => { inp.focus(); inp.select(); }, 30);
  return h("form", { class: "dlg-body", onsubmit: (e) => { e.preventDefault(); close(inp.value.trim() || null); } }, h("h2", { text: title }), inp,
    h("div", { class: "dlg-acts" }, h("button", { class: "btn ghost", type: "button", text: "Cancel", onclick: () => close(null) }), h("button", { class: "btn", type: "submit", text: "Save" })));
});
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

interactiveTool({
  mount(el, ctx) {
    let db = store.get(KEY, null);
    if (!db || !Array.isArray(db.lists) || !db.lists.length) {
      const l = { id: newId(), name: "To-do", items: [] };
      db = { lists: [l], cur: l.id, hideDone: false };
    }
    const L = () => db.lists.find((l) => l.id === db.cur) || db.lists[0];
    const persist = () => { if (!store.set(KEY, db)) toast("Couldn't save: the browser storage is full or blocked.", { type: "err" }); };

    const sel = h("select", { class: "select", "aria-label": "Choose a list", onchange: () => { if (sel.value === "+") { newList(); return; } db.cur = sel.value; persist(); draw(); } });
    const input = h("input", { class: "input", type: "text", placeholder: "Add a task… (Enter to add, pasting several lines = several tasks)", "aria-label": "New task", enterkeyhint: "done", maxlength: 500 });
    const prog = h("div", { class: "meter cl-meter", role: "progressbar", "aria-valuemin": "0" }, h("span", { style: { "--c": "var(--ok)" } }));
    const progTxt = h("span", { class: "hint" });
    const ul = h("ul", { class: "cl-list", "aria-label": "Task list" });
    const empty = h("p", { class: "hint cl-empty" });
    const hide = h("input", { type: "checkbox", checked: !!db.hideDone, onchange: () => { db.hideDone = hide.checked; persist(); draw(); } });
    const tpl = h("select", { class: "select cl-tpl", "aria-label": "Add from template", onchange: () => { if (tpl.value) addMany(parseItems(TEMPLATES[tpl.value])); tpl.value = ""; } },
      h("option", { value: "", text: "Add from template…" }), Object.keys(TEMPLATES).map((k) => h("option", { value: k, text: k })));
    const ib = (ic, label, fn) => h("button", { class: "ib", type: "button", title: label, "aria-label": label, html: icon(ic), onclick: fn });
    el.append(h("div", { class: "cl" },
      h("div", { class: "cl-top" }, sel, ib("pencil", "Rename list", rename), ib("trash-2", "Delete this list", removeList)),
      h("form", { class: "cl-add", onsubmit: (e) => { e.preventDefault(); addFromInput(); } }, input, h("button", { class: "btn", type: "submit" }, h("span", { html: icon("plus"), style: { display: "contents" } }), "Add")),
      h("div", { class: "cl-prog" }, prog, progTxt),
      ul, empty,
      h("div", { class: "cl-tools" },
        h("label", { class: "switch" }, hide, h("span", { text: "Hide completed" })),
        h("div", { class: "row", style: { gap: "6px" } },
          tpl,
          h("button", { class: "btn ghost sm", type: "button", onclick: uncheckAll }, h("span", { html: icon("rotate-ccw"), style: { display: "contents" } }), "Uncheck all"),
          h("button", { class: "btn ghost sm", type: "button", onclick: clearDone }, h("span", { html: icon("trash-2"), style: { display: "contents" } }), "Delete completed"),
          h("button", { class: "btn ghost sm", type: "button", onclick: () => copyText(toPlain(L().items, L().name), "List copied") }, h("span", { html: icon("copy"), style: { display: "contents" } }), "Copy"),
          h("button", { class: "ib sm", type: "button", title: "Download (.md)", "aria-label": "Download the list (.md)", html: icon("download"), onclick: () => save(new Blob([toMarkdown(L().items, L().name)], { type: "text/markdown;charset=utf-8" }), (slugify(L().name) || "checklist") + ".md") }))),
      h("p", { class: "hint", text: IS_TOUCH ? "Tap the text to edit. Use ↑↓ to reorder." : "Double-click the text to edit, drag and drop or use ↑↓ to reorder. Lists are saved in this device's browser." })));

    function addFromInput() {
      const items = parseItems(input.value);
      if (!items.length) return;
      addMany(items);
      input.value = "";
      input.focus();
    }
    function addMany(items) { L().items.push(...items.map((i) => ({ id: newId(), text: i.text, done: i.done }))); persist(); draw(); }
    input.addEventListener("paste", (e) => {
      const t = (e.clipboardData || window.clipboardData).getData("text");
      if (t && t.includes("\n")) { e.preventDefault(); addMany(parseItems(t)); toast(`Added ${parseItems(t).length} ${(parseItems(t).length) == 1 ? "task" : "tasks"}`); }
    });
    async function newList() {
      const name = await ask("New list name", "List " + (db.lists.length + 1));
      if (!name) { sel.value = db.cur; return; }
      const l = { id: newId(), name: name.slice(0, 60), items: [] };
      db.lists.push(l); db.cur = l.id; persist(); draw(); input.focus();
    }
    async function rename() { const name = await ask("Rename list", L().name); if (name) { L().name = name.slice(0, 60); persist(); draw(); } }
    async function removeList() {
      const l = L();
      if (l.items.length && !(await confirmDialog("Delete list “" + l.name + "”?", `${l.items.length} ${(l.items.length) == 1 ? "task" : "tasks"} in the list will be deleted from this device.`, "Delete"))) return;
      db.lists = db.lists.filter((x) => x !== l);
      if (!db.lists.length) db.lists.push({ id: newId(), name: "To-do", items: [] });
      db.cur = db.lists[0].id; persist(); draw();
    }
    function uncheckAll() { L().items.forEach((i) => { i.done = false; }); persist(); draw(); }
    async function clearDone() {
      const n = L().items.filter((i) => i.done).length;
      if (!n) { toast("No completed tasks yet."); return; }
      if (!(await confirmDialog(`Delete ${n} completed ${(n) == 1 ? "task" : "tasks"}?`, "", "Delete"))) return;
      L().items = L().items.filter((i) => !i.done); persist(); draw();
    }
    function moveItem(from, to, focusSel) {
      L().items = move(L().items, from, to); persist(); draw();
      const b = ul.children[Math.max(0, Math.min(to, ul.children.length - 1))];
      if (b && focusSel) { const x = b.querySelector(focusSel); if (x && !x.disabled) x.focus(); }
    }
    function edit(li, it) {
      const inp = h("input", { class: "input cl-edit", type: "text", value: it.text, "aria-label": "Edit task", maxlength: 500 });
      let fin = false;
      const done = (ok) => { if (fin) return; fin = true; if (ok && inp.value.trim()) { it.text = inp.value.trim(); persist(); } draw(); };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(true); else if (e.key === "Escape") done(false); });
      inp.addEventListener("blur", () => done(true));
      li.querySelector(".cl-text").replaceWith(inp);
      inp.focus(); inp.select();
    }
    let dragFrom = -1;
    function draw() {
      const l = L();
      sel.textContent = "";
      db.lists.forEach((x) => sel.append(h("option", { value: x.id, selected: x.id === l.id, text: `${x.name} (${x.items.filter((i) => i.done).length}/${x.items.length})` })));
      sel.append(h("option", { value: "+", text: "＋ New list…" }));
      const total = l.items.length, done = l.items.filter((i) => i.done).length;
      prog.firstChild.style.width = (total ? (done / total) * 100 : 0) + "%";
      prog.setAttribute("aria-valuemax", String(total)); prog.setAttribute("aria-valuenow", String(done));
      prog.setAttribute("aria-label", `Done ${done}/${total} tasks`);
      progTxt.textContent = total ? (done === total ? `🎉 All ${total} tasks done!` : `Done ${done}/${total}`) : "";
      ul.textContent = "";
      l.items.forEach((it, idx) => {
        if (db.hideDone && it.done) return;
        const cb = h("input", { type: "checkbox", checked: it.done, "aria-label": (it.done ? "Uncheck: " : "Mark done: ") + it.text, onchange: () => { it.done = cb.checked; persist(); draw(); const x = ul.querySelector(`[data-id="${it.id}"] input[type=checkbox]`); if (x) x.focus(); } });
        const text = h("span", { class: "cl-text", text: it.text, ondblclick: () => edit(li, it), onclick: () => { if (IS_TOUCH) edit(li, it); } });
        const li = h("li", { class: "cl-item" + (it.done ? " done" : ""), "data-id": it.id },
          !IS_TOUCH ? h("span", { class: "grip", html: icon("grip-vertical"), "aria-hidden": "true" }) : null,
          h("label", { class: "cl-cb" }, cb), text,
          h("span", { class: "cl-acts" },
            h("button", { class: "ib sm", type: "button", "data-up": "", disabled: idx === 0, "aria-label": "Move up: " + it.text, title: "Up", html: icon("arrow-up"), onclick: () => moveItem(idx, idx - 1, "[data-up]") }),
            h("button", { class: "ib sm", type: "button", "data-down": "", disabled: idx === total - 1, "aria-label": "Move down: " + it.text, title: "Down", html: icon("arrow-down"), onclick: () => moveItem(idx, idx + 1, "[data-down]") }),
            h("button", { class: "ib sm", type: "button", "aria-label": "Edit: " + it.text, title: "Edit", html: icon("pencil"), onclick: () => edit(li, it) }),
            h("button", { class: "ib sm", type: "button", "aria-label": "Delete: " + it.text, title: "Delete", html: icon("x"), onclick: () => { L().items.splice(idx, 1); persist(); draw(); } })));
        if (!IS_TOUCH) {
          li.draggable = true;
          li.addEventListener("dragstart", (e) => { dragFrom = idx; li.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", it.text); } catch (_) {} });
          li.addEventListener("dragend", () => { dragFrom = -1; li.classList.remove("dragging"); });
          li.addEventListener("dragover", (e) => { if (dragFrom < 0) return; e.preventDefault(); e.stopPropagation(); li.classList.add("drop-target"); });
          li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
          li.addEventListener("drop", (e) => { if (dragFrom < 0) return; e.preventDefault(); e.stopPropagation(); const f = dragFrom; dragFrom = -1; moveItem(f, idx); });
        }
        ul.append(li);
      });
      empty.hidden = !!ul.children.length;
      empty.textContent = total ? "All tasks are done and hidden." : "No tasks yet. Type in the box above and press Enter, or pick a template below.";
    }
    window.addEventListener("storage", (e) => { if (e.key === "bt:" + KEY && e.newValue) { try { const keep = db.cur; db = JSON.parse(e.newValue); if (db.lists.some((l) => l.id === keep)) db.cur = keep; draw(); } catch (_) {} } });
    draw();
    void ctx;
  }
});

const css = document.createElement("style");
css.textContent = `.cl{display:grid;gap:12px;max-width:760px;margin:0 auto}
.cl-top{display:flex;gap:6px;align-items:center}.cl-top .select{flex:1;min-width:0;font-weight:700}
.cl-add{display:flex;gap:8px}.cl-add .input{flex:1;min-width:0}
.cl-prog{display:flex;align-items:center;gap:12px}.cl-meter{flex:1;height:8px}
.cl-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.cl-list:empty{display:none}
.cl-item{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 10px;border-top:1px solid var(--line);background:var(--surface)}
.cl-item:first-child{border-top:0}.cl-item.dragging{opacity:.4}.cl-item.drop-target{box-shadow:inset 0 3px 0 var(--brand)}
.cl-item .grip{color:var(--muted);cursor:grab;display:flex}.cl-item .grip .i{width:16px;height:16px}
.cl-cb{display:flex;padding:6px}.cl-cb input{width:22px;height:22px;accent-color:var(--ok);cursor:pointer;margin:0}
.cl-text{flex:1;min-width:0;overflow-wrap:anywhere;font-size:16px;padding:6px 0;cursor:text}
.cl-item.done .cl-text{text-decoration:line-through;color:var(--muted)}
.cl-acts{display:flex;opacity:.55}.cl-item:hover .cl-acts,.cl-item:focus-within .cl-acts{opacity:1}
@media(hover:none){.cl-acts{opacity:1}.cl-acts [data-up],.cl-acts [data-down]{width:30px}}
.cl-edit{flex:1;min-width:0}
.cl-tools{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}
.cl-tpl{width:auto;min-height:36px;padding-top:4px;padding-bottom:4px;font-size:14px}
.cl-empty{text-align:center;padding:18px;border:1px dashed var(--line-2);border-radius:14px;margin:0}`;
document.head.append(css);
