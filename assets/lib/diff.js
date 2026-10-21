/* So sánh văn bản (hàm thuần): thuật toán Myers trên dãy token (dòng, từ hoặc ký tự).
   Kết quả là danh sách đoạn { op: "=" | "-" | "+", items: [token…] }. */

/** Tách token. by: "line" | "word" | "char" */
export function tokenize(text, by) {
  text = String(text ?? "");
  if (!text) return [];
  if (by === "line") { const l = text.split(/(?<=\n)/); return l; }
  if (by === "word") return text.match(/[\p{L}\p{N}\p{M}_]+|\s+|[^\p{L}\p{N}\p{M}_\s]/gu) || [];
  return [...text];
}

/** Myers O(ND). eq(a, b) so sánh hai token. maxD: quá số bước này thì coi phần giữa là thay hết. */
export function diffSeq(a, b, eq = (x, y) => x === y, maxD = 2500) {
  let s = 0;
  while (s < a.length && s < b.length && eq(a[s], b[s])) s++;
  let ea = a.length, eb = b.length;
  while (ea > s && eb > s && eq(a[ea - 1], b[eb - 1])) { ea--; eb--; }
  const A = a.slice(s, ea), B = b.slice(s, eb);
  const mid = myers(A, B, eq, maxD);
  const out = [];
  const push = (op, items) => {
    if (!items.length) return;
    const last = out[out.length - 1];
    if (last && last.op === op) last.items.push(...items); else out.push({ op, items: [...items] });
  };
  push("=", a.slice(0, s));
  for (const p of mid) push(p.op, p.items);
  push("=", a.slice(ea));
  return out;
}

function myers(A, B, eq, maxD) {
  const N = A.length, M = B.length;
  if (!N) return M ? [{ op: "+", items: B }] : [];
  if (!M) return [{ op: "-", items: A }];
  const max = N + M, off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace = [];
  let found = false;
  for (let d = 0; d <= Math.min(max, maxD); d++) {
    // chỉ giữ cửa sổ k ∈ [-d-1, d+1] để tiết kiệm bộ nhớ
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < N && y < M && eq(A[x], B[y])) { x++; y++; }
      v[off + k] = x;
      if (x >= N && y >= M) { found = true; break; }
    }
    if (found) break;
  }
  if (!found) return [{ op: "-", items: A }, { op: "+", items: B }];
  // lần ngược
  const ops = [];
  let x = N, y = M;
  for (let d = trace.length - 1; d >= 0; d--) {
    const w = trace[d], at = (k) => w[k + d + 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = d === 0 ? 0 : at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push(["=", A[x - 1]]); x--; y--; }
    if (d > 0) { if (x === prevX) ops.push(["+", B[y - 1]]); else ops.push(["-", A[x - 1]]); }
    x = prevX; y = prevY;
  }
  ops.reverse();
  const out = [];
  for (const [op, it] of ops) {
    const last = out[out.length - 1];
    if (last && last.op === op) last.items.push(it); else out.push({ op, items: [it] });
  }
  // gom "-" trước "+" trong mỗi vùng thay đổi
  const res = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i].op === "=") { res.push(out[i]); continue; }
    const del = [], ins = [];
    while (i < out.length && out[i].op !== "=") { (out[i].op === "-" ? del : ins).push(...out[i].items); i++; }
    i--;
    if (del.length) res.push({ op: "-", items: del });
    if (ins.length) res.push({ op: "+", items: ins });
  }
  return res;
}

/** Chuẩn hoá token để so sánh: bỏ qua hoa/thường, khoảng trắng */
export function normalizer({ ignoreCase, ignoreSpace } = {}) {
  return (t) => {
    let s = t;
    if (ignoreSpace) s = s.replace(/\s+/g, " ").trim();
    if (ignoreCase) s = s.toLocaleLowerCase("vi");
    return s;
  };
}

/** So sánh hai văn bản. o: { by, ignoreCase, ignoreSpace } → { parts, added, removed } (đếm theo token) */
export function diffText(a, b, o = {}) {
  const by = o.by || "line";
  const ta = tokenize(a, by), tb = tokenize(b, by);
  const norm = normalizer(o);
  // dòng: so sánh không tính ký tự xuống dòng cuối
  const key = by === "line" ? (t) => norm(t.replace(/\r?\n$/, "")) : norm;
  const ka = ta.map(key), kb = tb.map(key);
  const idx = diffSeq(ka.map((_, i) => i), kb.map((_, i) => i), (i, j) => ka[i] === kb[j]);
  let ia = 0, ib = 0, added = 0, removed = 0;
  const parts = idx.map((p) => {
    if (p.op === "=") { const items = tb.slice(ib, ib + p.items.length); const left = ta.slice(ia, ia + p.items.length); ia += p.items.length; ib += p.items.length; return { op: "=", items: left, right: items }; }
    if (p.op === "-") { const items = ta.slice(ia, ia + p.items.length); ia += p.items.length; removed += items.filter((t) => by !== "word" || /\S/.test(t)).length; return { op: "-", items }; }
    const items = tb.slice(ib, ib + p.items.length); ib += p.items.length; added += items.filter((t) => by !== "word" || /\S/.test(t)).length; return { op: "+", items };
  });
  return { parts, added, removed };
}
