/* Tìm kiếm mờ, không phân biệt dấu, cho danh sách công cụ.
   Dùng chung cho trang chủ, bảng lệnh (Ctrl/⌘+K), trang 404 và script sinh trang. */

/** Bỏ dấu, chữ thường, gom khoảng trắng: "Ghép PDF!" → "ghep pdf" */
export function fold(s) {
  return String(s == null ? "" : s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

/** Bỏ dấu nhưng giữ hoa/thường và ký tự khác (dùng cho slug, tên file…) */
export function stripAccents(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

export function slugify(s) {
  return fold(s).replace(/%/g, "").trim().replace(/\s+/g, "-");
}

const words = (s) => (s ? s.split(" ").filter(Boolean) : []);

/** Khoảng cách Damerau–Levenshtein (bản OSA), dừng sớm khi vượt max */
export function editDistance(a, b, max = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let prev2 = null, prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    const t = prev2 || new Array(n + 1);
    prev2 = prev; prev = cur; cur = t;
  }
  return prev[n];
}

// Trọng số các trường khi chấm điểm
const W = { name: 10, slug: 7, kw: 6, alias: 5, group: 2, desc: 1 };

/** Chuẩn bị chỉ mục: mỗi công cụ một bản ghi đã bỏ dấu */
export function prepare(tools, groups = []) {
  const gname = Object.fromEntries(groups.map((g) => [g.id, g.name]));
  return tools.map((t) => {
    const fields = {
      name: fold(t.name),
      slug: fold((t.slug || "").replace(/-/g, " ")),
      kw: (t.keywords || []).map(fold),
      alias: (t.aliases || []).map((a) => fold(a.replace(/-/g, " "))),
      group: fold(gname[t.group] || ""),
      desc: fold(t.desc)
    };
    const vocab = new Map(); // từ → trọng số cao nhất mà nó xuất hiện
    const add = (text, w) => words(text).forEach((x) => { if ((vocab.get(x) || 0) < w) vocab.set(x, w); });
    add(fields.name, W.name); add(fields.slug, W.slug);
    fields.kw.forEach((k) => add(k, W.kw)); fields.alias.forEach((k) => add(k, W.alias));
    add(fields.group, W.group); add(fields.desc, W.desc);
    return { tool: t, fields, vocab, phrases: [fields.name, fields.slug, ...fields.kw, ...fields.alias] };
  });
}

function tokenScore(entry, tok) {
  let best = 0;
  for (const [w, weight] of entry.vocab) {
    let q = 0;
    if (w === tok) q = 1;
    else if (w.startsWith(tok)) q = tok.length >= 2 ? 0.75 : 0.4;
    else if (tok.length >= 3 && w.includes(tok)) q = 0.45;
    else if (tok.length >= 3 && w.length >= 3) {
      const max = tok.length >= 7 ? 2 : 1;
      const d = editDistance(tok, w, max);
      if (d <= max) q = d === 1 ? 0.5 : 0.3;
      else if (tok.length === w.length + 1 && tok.startsWith(w)) q = 0.3; // gõ thừa một ký tự: "heicc"
    }
    const s = q * weight;
    if (s > best) best = s;
  }
  return best;
}

/** Trả về danh sách công cụ khớp, sắp theo điểm giảm dần. Mọi từ trong câu tìm đều phải khớp (đúng, tiền tố hoặc gần đúng). */
export function search(index, query, limit = 50) {
  const q = fold(query);
  if (!q) return [];
  const toks = words(q);
  const out = [];
  for (const e of index) {
    let total = 0, ok = true;
    for (const tok of toks) {
      const s = tokenScore(e, tok);
      if (s <= 0) { ok = false; break; }
      total += s;
    }
    if (!ok) continue;
    // thưởng khi cả cụm khớp liền mạch
    if (e.fields.name === q) total += 30;
    else if (e.phrases.some((p) => p === q)) total += 20;
    else if (e.fields.name.startsWith(q)) total += 12;
    else if (e.phrases.some((p) => p.includes(q))) total += 8;
    if (e.tool.popular) total += 1;
    out.push({ tool: e.tool, score: total });
  }
  out.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name, "vi"));
  return out.slice(0, limit).map((r) => r.tool);
}
