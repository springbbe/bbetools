/* Soạn văn bản hành chính theo Nghị định 30/2020/NĐ-CP (hàm thuần, chạy cả trong Node để test):
   số và ký hiệu, địa danh và ngày tháng, căn cứ, người ký, nơi nhận, đọc phần nội dung thành từng đoạn,
   ước lượng bề rộng chữ Times New Roman (để kẻ đường dưới Tiêu ngữ, tên cơ quan đúng độ dài),
   rồi dựng các phần XML của file Word (.docx). Thông số thể thức lấy từ data/the-thuc-van-ban.json. */

/* ---------- bề rộng chữ ---------- */
// bề rộng ký tự ASCII 32–126 của Times New Roman, đơn vị 1/1000 cỡ chữ (trùng với Liberation Serif, Tinos)
const W_REG = [250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444, 921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500, 333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541];
const W_BOLD = [250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500, 930, 722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778, 611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667, 333, 278, 333, 581, 500, 333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500, 556, 556, 444, 389, 333, 556, 500, 722, 500, 500, 444, 394, 220, 394, 520];
// chữ có dấu rộng bằng chữ gốc, trừ ơ, ư, Ư (có móc); vài dấu câu ngoài ASCII
const W_EXTRA = [{ "ơ": 529, "ư": 542, "Ư": 776, "–": 500, "—": 1000, "…": 1000, "“": 444, "”": 444, "‘": 333, "’": 333 },
  { "ơ": 554, "ư": 600, "Ư": 796, "–": 500, "—": 1000, "…": 1000, "“": 500, "”": 500, "‘": 333, "’": 333 }];

/** Bề rộng (pt) của một dòng chữ Times New Roman */
export function textWidth(s, size, bold = false) {
  const tbl = bold ? W_BOLD : W_REG, extra = W_EXTRA[bold ? 1 : 0];
  let w = 0;
  for (const ch of String(s ?? "")) {
    if (extra[ch]) { w += extra[ch]; continue; }
    const d = ch.normalize("NFD");
    let base = d[0];
    if (base === "đ") base = "d"; else if (base === "Đ") base = "D";
    if (d.includes("\u031B")) { const k = base === "o" ? "ơ" : base === "u" ? "ư" : base === "U" ? "Ư" : ""; if (k) { w += extra[k]; continue; } }
    const c = base.charCodeAt(0);
    w += c >= 32 && c < 127 ? tbl[c - 32] : 500;
  }
  return (w * size) / 1000;
}

/* ---------- các thành phần thể thức ---------- */
export const DOTS = "……";
const upper = (s) => String(s ?? "").toLocaleUpperCase("vi");
const clean = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[ \t]+/g, " ").trim();
/** Các dòng không rỗng (đã bỏ khoảng trắng thừa) */
export const lines = (s) => String(s ?? "").split(/\r?\n/).map(clean).filter(Boolean);
/** Dòng của danh sách: bỏ gạch đầu dòng và dấu câu ở cuối mà người dùng tự gõ */
export const listItems = (s) => lines(s).map((l) => l.replace(/^[-–•*+]\s*/, "").replace(/[\s;.,]+$/, "")).filter(Boolean);

/** Số văn bản: chữ số Ả Rập, nhỏ hơn 10 thêm số 0 phía trước ("5" → "05"); để trống để Văn thư điền khi đăng ký */
export function soVanBan(so) {
  const s = clean(so);
  return /^\d$/.test(s) ? "0" + s : s;
}
const abbrPart = (s) => clean(s).replace(/\s+/g, "");
/** Ký hiệu: văn bản có tên loại "QĐ-UBND"; công văn "UBND-VP" (tên cơ quan - đơn vị soạn thảo) */
export function kyHieu(abbr, coQuanVT, donViVT) {
  const parts = abbr ? [abbr, abbrPart(coQuanVT)] : [abbrPart(coQuanVT), abbrPart(donViVT)];
  return parts.filter(Boolean).join("-");
}
/** "Số: 05/QĐ-UBND"; không có số thì chừa chỗ trống "Số:      /QĐ-UBND" */
export function soKyHieu(so, kh) {
  const n = soVanBan(so);
  return "Số: " + (n || "     ") + "/" + (kh || "...");
}

/** Ngày ban hành: ngày < 10 và tháng 1, 2 có số 0 phía trước. iso trống → chừa chỗ điền tay. */
export function ngayThang(diaDanh, iso, year = new Date().getFullYear()) {
  const place = clean(diaDanh) || DOTS;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return `${place}, ngày     tháng     năm ${year}`;
  const mon = +m[2];
  return `${place}, ngày ${m[3]} tháng ${mon <= 2 ? "0" + mon : mon} năm ${m[1]}`;
}

/** Trích yếu công văn "V/v …" (bỏ chữ "V/v", "Về việc" nếu người dùng đã gõ) */
export function vv(trichYeu) {
  const s = clean(trichYeu).replace(/^(v\/v|về việc)[\s:.]*/i, "");
  return "V/v " + (s || DOTS);
}

/** Căn cứ: mỗi căn cứ một dòng, cuối dòng dấu chấm phẩy, dòng cuối dấu chấm. extra: "Theo đề nghị của …" */
export function canCu(text, deNghi) {
  const out = lines(text).map((l) => l.replace(/[\s;.,]+$/, ""));
  const dn = clean(deNghi).replace(/^theo đề nghị của\s*/i, "").replace(/[\s;.,]+$/, "");
  if (dn) out.push("Theo đề nghị của " + dn);
  return out.map((l, i) => l + (i === out.length - 1 ? "." : ";"));
}

/** "Kính gửi": một nơi → cùng dòng; nhiều nơi → mỗi nơi một dòng "- …;", dòng cuối "- ….". */
export function kinhGui(text) {
  const items = listItems(text);
  if (items.length <= 1) return { single: items[0] || "", items: [] };
  return { single: "", items: items.map((x, i) => "- " + x + (i === items.length - 1 ? "." : ";")) };
}

/** Nơi nhận: "- …;" từng dòng, dòng cuối "- Lưu: VT, <đơn vị soạn thảo, số bản lưu>, <ký hiệu người soạn thảo>." */
export function noiNhan(text, { nhuTren = false, luu = "", nguoiSoan = "" } = {}) {
  let items = listItems(text).filter((x) => !/^lưu\s*:/i.test(x));
  if (nhuTren && !items.some((x) => /^như trên$/i.test(x))) items.unshift("Như trên");
  const tail = ["VT", ...[luu, nguoiSoan].map((s) => clean(s).replace(/^VT\s*,?\s*/i, "").replace(/[\s;.,]+$/, ""))].filter(Boolean).join(", ");
  return [...items.map((x) => "- " + x + ";"), "- Lưu: " + tail + "."];
}

/** Quyền hạn, chức vụ người ký (in hoa). quyen: "" | TM. | KT. | TL. | TUQ. | Q.
    dau: tên tập thể (TM.) hoặc chức vụ người đứng đầu (KT., TL., TUQ.); chucVu: chức vụ của người ký */
export function nguoiKy(quyen, dau, chucVu) {
  const cv = upper(clean(chucVu)) || DOTS, d = upper(clean(dau)) || DOTS;
  if (!quyen) return [cv];
  if (quyen === "Q.") return ["Q. " + cv];
  return [quyen + " " + d, cv];
}

/** Kết thúc phần nội dung bằng "/." (như các mẫu ở Phụ lục III) */
export function ketThuc(s) {
  const t = String(s).replace(/\s+$/, "");
  if (!t || /\/\.$/.test(t)) return t;
  return /[.!?…]$/.test(t) ? t + "/." : t.replace(/[;:,]$/, "") + "./.";
}

/** Chữ đậm **…**, nghiêng *…* trong một dòng → [{ t, b, i }] */
export function inline(s, base = {}) {
  const out = [];
  let last = 0;
  for (const m of String(s).matchAll(/\*\*(.+?)\*\*|\*(?!\s)(.+?)\*/g)) {
    if (m.index > last) out.push({ ...base, t: s.slice(last, m.index) });
    out.push(m[1] != null ? { ...base, t: m[1], b: true } : { ...base, t: m[2], i: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ ...base, t: s.slice(last) });
  return out.filter((r) => r.t);
}
const isUpperLine = (s) => /\p{L}/u.test(s) && s === upper(s) && s.replace(/[^\p{L}]/gu, "").length >= 3;
const endsSentence = (s) => /[.;:!?…]["”)]*$/.test(s);

/** Phần nội dung → các đoạn { runs, align: "both" | "center", indent, keep }.
    Nhận ra: "Phần I", "Chương II", "Mục 1", "Tiểu mục 1" (canh giữa, đậm; dòng in hoa ngay sau là tiêu đề);
    "Điều 1." (đậm phần "Điều 1."; cả dòng nếu là tiêu đề, không kết thúc bằng dấu câu); dòng in hoa "I. …" (đậm). */
export function parseBody(text, { end = true } = {}) {
  const src = lines(text);
  if (end && src.length) src[src.length - 1] = ketThuc(src[src.length - 1]);
  const out = [];
  let title = false; // dòng trước là "Chương …" → dòng in hoa này là tiêu đề
  for (const l of src) {
    if (/^(Phần|Chương|Mục|Tiểu mục)\s+([IVXLCDM]+|\d+)\.?$/u.test(l)) { out.push({ runs: inline(l, { b: true }), align: "center", keep: true }); title = true; continue; }
    if (title && isUpperLine(l)) { out.push({ runs: inline(l, { b: true }), align: "center", keep: true }); title = false; continue; }
    title = false;
    const d = /^(Điều\s+\d+[a-zđ]?\.)(\s*)(.*)$/u.exec(l);
    if (d) {
      const head = !d[3] || (!endsSentence(d[3]) && d[3].length <= 120);
      out.push({ runs: head ? inline(l, { b: true }) : [{ t: d[1], b: true }, ...inline(d[2] + d[3])], align: "both", indent: true, keep: head });
      continue;
    }
    if (isUpperLine(l)) { out.push({ runs: inline(l, { b: true }), align: "both", indent: true, keep: true }); continue; }
    out.push({ runs: inline(l), align: "both", indent: true });
  }
  return out;
}

/** Vị trí khối "Kính gửi" nhiều nơi: các gạch đầu dòng thẳng hàng dưới dấu hai chấm, cả khối canh giữa vùng chữ.
    → { left (pt, lề trái dòng "Kính gửi:"), items (pt, lề trái các dòng "- …") } */
export function kinhGuiLayout(items, size, width) {
  const lab = textWidth("Kính gửi", size), colon = textWidth(":", size), sp = textWidth(" ", size);
  const widest = Math.max(0, ...items.map((x) => textWidth(x, size)));
  const left = Math.max(0, Math.min(width * 0.3, (width - lab - colon - sp - widest) / 2));
  return { left, items: left + lab };
}

/* ---------- mô hình văn bản (dùng chung cho xem trước và file Word) ---------- */
/** v: giá trị form; spec: data/the-thuc-van-ban.json → mô hình đủ để vẽ */
export function docModel(v, spec) {
  const type = spec.types.find((t) => t.id === v.type) || spec.types[0];
  const sz = spec.sizes[v.size] || spec.sizes["14"];
  const isCV = type.mau === "cv";
  const kh = kyHieu(type.abbr, v.cqVT, v.dvVT);
  const kg = isCV || type.kinhGui ? kinhGui(v.kinhGui) : { single: "", items: [] };
  const hasKG = !!(kg.single || kg.items.length);
  const body = [];
  const p = (runs, o = {}) => body.push({ runs, align: "both", indent: true, ...o });
  if (type.mau === "qd" || type.mau === "nq") {
    p([{ t: upper(clean(v.thamQuyen)) || DOTS, b: true }], { align: "center", indent: false, before: 6, after: 6, keep: true });
  }
  if (hasKG) body.push({ kg, size: sz.kinhGui });
  for (const l of canCu(v.canCu, type.mau === "qd" ? v.deNghi : "")) p([{ t: l, i: true }]);
  if (type.mau === "qd" || type.mau === "nq") p([{ t: type.mau === "qd" ? "QUYẾT ĐỊNH:" : "QUYẾT NGHỊ:", b: true }], { align: "center", indent: false, before: 6, after: 6, keep: true });
  const content = parseBody(v.noiDung, { end: v.ket !== false });
  body.push(...(content.length ? content : [{ runs: [{ t: DOTS }], align: "both", indent: true }]));
  return {
    type, sz, isCV,
    head: {
      chuQuan: lines(v.chuQuan).map(upper),
      coQuan: lines(v.coQuan).map(upper),
      so: soKyHieu(v.so, kh),
      vv: isCV ? vv(v.trichYeu) : "",
      ngay: ngayThang(v.diaDanh, v.ngay)
    },
    title: isCV ? null : { tenLoai: upper(type.name), trichYeu: type.trichYeu === false ? "" : clean(v.trichYeu) },
    body,
    sign: { lines: nguoiKy(v.quyen, v.dau, v.chucVu), ten: clean(v.ten) },
    noiNhan: noiNhan(v.noiNhan, { nhuTren: hasKG, luu: v.luu, nguoiSoan: v.nguoiSoan }),
    diaChi: isCV ? lines(v.diaChi) : []
  };
}

/* ---------- file Word (.docx) ---------- */
const esc = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const tw = (pt) => Math.round(pt * 20);           // pt → twip
const mmPt = (mm) => (mm * 72) / 25.4;
const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function run(r, size) {
  const pr = (r.b ? "<w:b/><w:bCs/>" : "") + (r.i ? "<w:i/><w:iCs/>" : "") + `<w:sz w:val="${Math.round(size * 2)}"/><w:szCs w:val="${Math.round(size * 2)}"/>`;
  return `<w:r><w:rPr>${pr}</w:rPr><w:t xml:space="preserve">${esc(r.t)}</w:t></w:r>`;
}
/** Một đoạn văn. o: { runs, size, align, left, right, first (pt), before, after (pt), line (bội số), exact (pt), keep, top (đường kẻ phía trên) } */
function para(o) {
  const size = o.size || 14;
  let pr = "";
  if (o.keep) pr += "<w:keepNext/>";
  if (o.top) pr += `<w:pBdr><w:top w:val="single" w:sz="6" w:space="${o.top === "tight" ? 0 : 1}" w:color="000000"/></w:pBdr>`;
  const line = o.exact ? `w:line="${tw(o.exact)}" w:lineRule="exact"` : `w:line="${Math.round(240 * (o.line || 1))}" w:lineRule="auto"`;
  pr += `<w:spacing w:before="${tw(o.before || 0)}" w:after="${tw(o.after || 0)}" ${line}/>`;
  if (o.left || o.right || o.first) pr += `<w:ind w:left="${tw(o.left || 0)}" w:right="${tw(o.right || 0)}"${o.first ? ` w:firstLine="${tw(o.first)}"` : ""}/>`;
  pr += `<w:jc w:val="${o.align || "left"}"/>`;
  pr += `<w:rPr><w:sz w:val="${Math.round(size * 2)}"/><w:szCs w:val="${Math.round(size * 2)}"/></w:rPr>`;
  return `<w:p><w:pPr>${pr}</w:pPr>${(o.runs || []).map((r) => run(r, size)).join("")}</w:p>`;
}
/** Đường kẻ ngang nét liền dài len (pt), canh giữa trong ô rộng width: đoạn trống cao 1 pt có viền trên */
const rule = (len, width) => {
  const side = Math.max(0, (width - len) / 2);
  return para({ runs: [], size: 1, exact: 1, left: side, right: side, top: "tight", align: "center" });
};
function table(cols, cells) {
  const total = cols.reduce((a, b) => a + b, 0);
  const none = ["top", "left", "bottom", "right", "insideH", "insideV"].map((k) => `<w:${k} w:val="nil"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${tw(total)}" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblBorders>${none}</w:tblBorders><w:tblLayout w:type="fixed"/>`
    + '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>'
    + `<w:tblGrid>${cols.map((c) => `<w:gridCol w:w="${tw(c)}"/>`).join("")}</w:tblGrid>`
    + cells.map((row) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${row.map((xml, i) => `<w:tc><w:tcPr><w:tcW w:w="${tw(cols[i])}" w:type="dxa"/></w:tcPr>${xml || para({ size: 2 })}</w:tc>`).join("")}</w:tr>`).join("")
    + "</w:tbl>";
}

/** Bố cục trang (pt) từ lề (mm): vùng chữ, hai cột phần đầu, hai cột phần ký */
export function pageLayout(mg) {
  const width = mmPt(210 - mg.left - mg.right);
  const right = Math.min(mmPt(100), width - mmPt(50)); // cột phải đủ rộng cho Quốc hiệu cỡ 13 (≈ 96 mm)
  return { width, head: [width - right, right], sign: [width * 0.45, width * 0.55] };
}

/** Các phần XML của file .docx: { "đường dẫn trong zip": nội dung }.
    o: { margins: { top, bottom, left, right } (mm), line (bội số dòng), indent (mm), title } */
export function docxParts(m, spec, o) {
  const sz = m.sz, L = pageLayout(o.margins), first = mmPt(o.indent), lineM = o.line || 1;
  const gap = spec.paraSpacing;
  const [cl, cr] = L.head;
  const lineOf = (texts, size, bold) => Math.max(0, ...texts.map((t) => textWidth(t, size, bold)));
  // phần đầu: ô 2, 3, 5b bên trái; ô 1, 4 bên phải
  const left1 = m.head.chuQuan.map((t) => para({ runs: [{ t }], size: sz.coQuan, align: "center" }))
    .concat((m.head.coQuan.length ? m.head.coQuan : [DOTS]).map((t) => para({ runs: [{ t, b: true }], size: sz.coQuan, align: "center" })))
    .concat(rule(Math.min(cl, lineOf(m.head.coQuan.length ? m.head.coQuan : [DOTS], sz.coQuan, true)) * 0.4, cl)).join("");
  const right1 = para({ runs: [{ t: spec.quocHieu, b: true }], size: sz.quocHieu, align: "center" })
    + para({ runs: [{ t: spec.tieuNgu, b: true }], size: sz.tieuNgu, align: "center" })
    + rule(Math.min(cr, textWidth(spec.tieuNgu, sz.tieuNgu, true)), cr);
  const left2 = para({ runs: [{ t: m.head.so }], size: sz.so, align: "center", before: 6 })
    + (m.head.vv ? para({ runs: [{ t: m.head.vv }], size: sz.vv, align: "center", before: 6 }) : "");
  const right2 = para({ runs: [{ t: m.head.ngay, i: true }], size: sz.diaDanh, align: "center", before: 6 });
  let body = table(L.head, [[left1, right1], [left2, right2]]);
  // tên loại, trích yếu (ô 5a)
  if (m.title) {
    body += para({ runs: [{ t: m.title.tenLoai, b: true }], size: sz.tenLoai, align: "center", before: 18, keep: true });
    if (m.title.trichYeu) body += para({ runs: [{ t: m.title.trichYeu, b: true }], size: sz.trichYeu, align: "center", keep: true });
    body += rule(Math.min(L.width, textWidth(m.title.trichYeu || m.title.tenLoai, sz.trichYeu, true)) * 0.4, L.width);
  }
  // nội dung (ô 6)
  m.body.forEach((b, i) => {
    if (b.kg) {
      const s = b.size, before = i === 0 ? 12 : 6;
      if (b.kg.single || !b.kg.items.length) body += para({ runs: [{ t: "Kính gửi: " + (b.kg.single || DOTS) }], size: s, align: "center", before, after: gap, line: lineM });
      else {
        const k = kinhGuiLayout(b.kg.items, s, L.width);
        body += para({ runs: [{ t: "Kính gửi:" }], size: s, left: k.left, before, keep: true, line: lineM });
        b.kg.items.forEach((t, j) => { body += para({ runs: [{ t }], size: s, left: k.items, after: j === b.kg.items.length - 1 ? gap : 0, line: lineM, keep: true }); });
      }
      return;
    }
    const top = i === 0 && !m.title ? 12 : 0;
    body += para({ runs: b.runs, size: sz.body, align: b.align, first: b.indent ? first : 0, before: Math.max(top, b.before || 0), after: b.after ?? gap, line: lineM, keep: b.keep });
  });
  // nơi nhận (ô 9b) và người ký (ô 7a, 7b, 7c)
  const nn = para({ runs: [{ t: "Nơi nhận:", b: true, i: true }], size: sz.noiNhanTieuDe })
    + m.noiNhan.map((t) => para({ runs: [{ t }], size: sz.noiNhan })).join("");
  const sg = m.sign.lines.map((t) => para({ runs: [{ t, b: true }], size: sz.chucVu, align: "center" })).join("")
    + para({ runs: [{ t: m.sign.ten || DOTS, b: true }], size: sz.ten, align: "center", before: 72 });
  body += para({ size: 6, exact: 6 }) + table(L.sign, [[nn, sg]]) + para({ size: 2, exact: 1 }); // Word cần một đoạn sau bảng cuối
  // số trang: giữa lề trên, không hiện ở trang đầu; địa chỉ cơ quan (ô 13) ở cuối trang đầu
  const hdr = `${XML}<w:hdr ${W_NS}>${para({ size: sz.trang, align: "center", runs: [] }).replace("</w:p>", `<w:fldSimple w:instr=" PAGE "><w:r><w:rPr><w:sz w:val="${sz.trang * 2}"/></w:rPr><w:t>2</w:t></w:r></w:fldSimple></w:p>`)}</w:hdr>`;
  const empty = (tag) => `${XML}<w:${tag} ${W_NS}>${para({ size: 2 })}</w:${tag}>`;
  const ftr1 = m.diaChi.length
    ? `${XML}<w:ftr ${W_NS}>${m.diaChi.map((t, i) => para({ runs: [{ t }], size: sz.diaChi, top: i === 0 })).join("")}</w:ftr>`
    : empty("ftr");
  const twMm = (mm) => Math.round((mm * 1440) / 25.4);
  const mg = o.margins;
  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rIdH1"/><w:headerReference w:type="first" r:id="rIdH2"/><w:footerReference w:type="default" r:id="rIdF1"/><w:footerReference w:type="first" r:id="rIdF2"/>`
    + `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${twMm(mg.top)}" w:right="${twMm(mg.right)}" w:bottom="${twMm(mg.bottom)}" w:left="${twMm(mg.left)}" w:header="${twMm(Math.max(8, mg.top / 2))}" w:footer="${twMm(Math.max(8, mg.bottom / 2))}" w:gutter="0"/>`
    + '<w:cols w:space="720"/><w:titlePg/><w:docGrid w:linePitch="360"/></w:sectPr>';
  const doc = `${XML}<w:document ${W_NS}><w:body>${body}${sect}</w:body></w:document>`;
  const font = esc(spec.font);
  const styles = `${XML}<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}" w:cs="${font}"/><w:color w:val="000000"/><w:sz w:val="${sz.body * 2}"/><w:szCs w:val="${sz.body * 2}"/><w:lang w:val="vi-VN" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    + '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>'
    + '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
    + "</w:styles>";
  const settings = `${XML}<w:settings ${W_NS}><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat><w:themeFontLang w:val="vi-VN"/></w:settings>`;
  const rel = (id, type, target) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  const RELS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
  const ov = (part, type) => `<Override PartName="${part}" ContentType="${type}"/>`;
  const WM = "application/vnd.openxmlformats-officedocument.wordprocessingml.";
  return {
    "[Content_Types].xml": `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
      + ov("/word/document.xml", WM + "document.main+xml") + ov("/word/styles.xml", WM + "styles+xml") + ov("/word/settings.xml", WM + "settings+xml")
      + ov("/word/header1.xml", WM + "header+xml") + ov("/word/header2.xml", WM + "header+xml") + ov("/word/footer1.xml", WM + "footer+xml") + ov("/word/footer2.xml", WM + "footer+xml")
      + ov("/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml") + ov("/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml") + "</Types>",
    "_rels/.rels": `${XML}<Relationships ${RELS}>${rel("rId1", "officeDocument", "word/document.xml")}<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>${rel("rId3", "extended-properties", "docProps/app.xml")}</Relationships>`,
    "word/_rels/document.xml.rels": `${XML}<Relationships ${RELS}>${rel("rIdS", "styles", "styles.xml")}${rel("rIdT", "settings", "settings.xml")}${rel("rIdH1", "header", "header1.xml")}${rel("rIdH2", "header", "header2.xml")}${rel("rIdF1", "footer", "footer1.xml")}${rel("rIdF2", "footer", "footer2.xml")}</Relationships>`,
    "word/document.xml": doc,
    "word/styles.xml": styles,
    "word/settings.xml": settings,
    "word/header1.xml": hdr,
    "word/header2.xml": empty("hdr"),
    "word/footer1.xml": empty("ftr"),
    "word/footer2.xml": ftr1,
    "docProps/core.xml": `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(o.title || "")}</dc:title><dc:language>vi-VN</dc:language></cp:coreProperties>`,
    "docProps/app.xml": `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>BbeTools</Application></Properties>`
  };
}
