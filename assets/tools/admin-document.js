/* Soạn văn bản hành chính theo Nghị định 30/2020/NĐ-CP: nhập cơ quan, số ký hiệu, trích yếu, nội dung, người ký, nơi nhận
   → xem trước như trang giấy và tải file Word (.docx) đúng thể thức (Times New Roman, khổ A4, lề, cỡ chữ từng thành phần).
   File Word được dựng ngay trên trình duyệt (tự viết XML, nén bằng JSZip); thông tin chỉ được nhớ trong trình duyệt này. */
import { h, icon, ROOT, save, store, toast, debounce, lib } from "../core.js";
import { formTool } from "../frames/form.js";
import { docModel, docxParts, pageLayout, kinhGuiLayout, DOTS } from "../lib/van-ban-hc.js";
import { slugify } from "../lib/van-ban.js";

const KEY = "admin-document:form";
const spec = await fetch(ROOT + "data/the-thuc-van-ban.json").then((r) => r.json());
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const typeOf = (v) => spec.types.find((t) => t.id === v.type) || spec.types[0];
const mau = (v) => typeOf(v).mau;
const isCV = (v) => mau(v) === "cv";
const hasKG = (v) => isCV(v) || !!typeOf(v).kinhGui;
const range = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => [String(a + i), a + i + " mm"]);
const sec = (title) => ({ id: "_" + title, type: "custom", url: false, render: () => ({ el: h("p", { class: "opt-title vb-sec", text: title }), get: () => "", set: () => {} }) });

/* ---------- văn bản mẫu ---------- */
const ORG = { chuQuan: "", coQuan: "Ủy ban nhân dân\nxã An Bình", cqVT: "UBND", dvVT: "VP", diaDanh: "An Bình", quyen: "TM.", dau: "Ủy ban nhân dân", chucVu: "Chủ tịch", ten: "Nguyễn Văn An" };
const SAMPLES = {
  "cong-van": { quyen: "KT.", dau: "Chủ tịch", chucVu: "Phó Chủ tịch", ten: "Trần Thị Bình", trichYeu: "rà soát thể thức văn bản hành chính năm 2026", kinhGui: "Các phòng chuyên môn thuộc UBND xã\nCác thôn trên địa bàn xã",
    noiDung: "Thực hiện Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư, Ủy ban nhân dân xã đề nghị các đơn vị thực hiện một số nội dung sau:\n1. Rà soát các văn bản đã ban hành trong năm 2026, bảo đảm đúng thể thức và kỹ thuật trình bày.\n2. Báo cáo kết quả rà soát về Văn phòng HĐND và UBND xã trước ngày 30 tháng 11 năm 2026.\nĐề nghị các đơn vị quan tâm, phối hợp thực hiện.",
    noiNhan: "Chủ tịch UBND xã (để b/c)", diaChi: "Địa chỉ: thôn Đông, xã An Bình; Điện thoại: 0222 3 123 456\nThư điện tử: ubnd@anbinh.gov.vn" },
  "quyet-dinh": { quyen: "", chucVu: "Chủ tịch", trichYeu: "Về việc thành lập Tổ công tác chuyển đổi số xã An Bình", thamQuyen: "Chủ tịch Ủy ban nhân dân xã An Bình",
    canCu: "Căn cứ Luật Tổ chức chính quyền địa phương ngày 16 tháng 6 năm 2025\nCăn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư", deNghi: "Chánh Văn phòng HĐND và UBND xã",
    noiDung: "Điều 1. Thành lập Tổ công tác chuyển đổi số xã An Bình gồm các ông (bà) có tên sau:\n1. Ông Lê Văn Cường, Phó Chủ tịch UBND xã, Tổ trưởng.\n2. Bà Phạm Thị Dung, công chức Văn phòng - Thống kê, thành viên.\nĐiều 2. Tổ công tác có nhiệm vụ tham mưu cho Ủy ban nhân dân xã triển khai các nhiệm vụ chuyển đổi số trên địa bàn xã; tự giải thể sau khi hoàn thành nhiệm vụ.\nĐiều 3. Quyết định này có hiệu lực kể từ ngày ký. Chánh Văn phòng HĐND và UBND xã, các ông (bà) có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này.",
    noiNhan: "Như Điều 3\nThường trực Đảng ủy xã (để b/c)" },
  "to-trinh": { trichYeu: "Về việc đề nghị phê duyệt kế hoạch chuyển đổi số năm 2027", kinhGui: "Hội đồng nhân dân xã An Bình", canCu: "",
    noiDung: "Căn cứ tình hình thực tế tại địa phương, Ủy ban nhân dân xã kính trình Hội đồng nhân dân xã xem xét, phê duyệt Kế hoạch chuyển đổi số năm 2027 với các nội dung chính sau:\n1. Mục tiêu: 100% hồ sơ công việc được xử lý trên môi trường mạng.\n2. Kinh phí dự kiến: 350.000.000 đồng từ ngân sách xã.\nKính trình Hội đồng nhân dân xã xem xét, quyết định.",
    noiNhan: "Thường trực HĐND xã" },
  "thong-bao": { trichYeu: "Lịch tiếp công dân tháng 12 năm 2026",
    noiDung: "Ủy ban nhân dân xã An Bình thông báo lịch tiếp công dân định kỳ tháng 12 năm 2026 như sau:\n1. Thời gian: từ 07 giờ 30 phút đến 11 giờ 00 phút các ngày thứ Năm trong tháng.\n2. Địa điểm: Trụ sở tiếp công dân xã An Bình.\nỦy ban nhân dân xã thông báo để Nhân dân được biết.",
    noiNhan: "Các thôn trên địa bàn xã\nĐài truyền thanh xã" },
  "giay-moi": { trichYeu: "Họp triển khai kế hoạch chuyển đổi số năm 2027",
    noiDung: "Ủy ban nhân dân xã An Bình trân trọng kính mời: Trưởng các thôn trên địa bàn xã.\nTới dự: Hội nghị triển khai kế hoạch chuyển đổi số năm 2027.\nChủ trì: Đồng chí Nguyễn Văn An, Chủ tịch UBND xã.\nThời gian: 08 giờ 00 phút, ngày 15 tháng 12 năm 2026.\nĐịa điểm: Hội trường UBND xã An Bình.\nĐề nghị các đại biểu đến dự đúng thời gian.",
    noiNhan: "Như trên" },
  "giay-gioi-thieu": { quyen: "", chucVu: "Chủ tịch", trichYeu: "",
    noiDung: "Ủy ban nhân dân xã An Bình trân trọng giới thiệu:\nÔng: Lê Văn Cường\nChức vụ: Phó Chủ tịch UBND xã\nĐược cử đến: Sở Nội vụ\nVề việc: liên hệ công tác văn thư, lưu trữ.\nĐề nghị Quý cơ quan tạo điều kiện để ông có tên ở trên hoàn thành nhiệm vụ.\nGiấy này có giá trị đến hết ngày 31 tháng 12 năm 2026.",
    noiNhan: "Như trên" }
};
const GENERIC = { trichYeu: "Thực hiện nhiệm vụ chuyển đổi số năm 2027",
  noiDung: "I. MỤC ĐÍCH, YÊU CẦU\n1. Mục đích: nâng cao hiệu quả quản lý, điều hành.\n2. Yêu cầu: bảo đảm đúng tiến độ, tiết kiệm.\nII. NỘI DUNG THỰC HIỆN\n1. Số hóa hồ sơ, tài liệu lưu trữ của xã.\n2. Tổ chức tập huấn cho cán bộ, công chức.\nIII. TỔ CHỨC THỰC HIỆN\nCác đơn vị căn cứ nội dung trên để triển khai thực hiện.",
  noiNhan: "Các phòng chuyên môn thuộc UBND xã\nCác thôn trên địa bàn xã" };
const BLANK = { chuQuan: "", coQuan: "", cqVT: "", dvVT: "", so: "", diaDanh: "", trichYeu: "", thamQuyen: "", canCu: "", deNghi: "", kinhGui: "", noiDung: "", quyen: "", dau: "", chucVu: "", ten: "", noiNhan: "", nguoiSoan: "", diaChi: "" };

/* ---------- xem trước như trang giấy (1 pt = 1 px, thu nhỏ cho vừa khung) ---------- */
const FONT = "'Times New Roman', Tinos, 'Liberation Serif', Times, serif";
function paper(m, o) {
  const L = pageLayout(o.margins), sz = m.sz, pt = (mm) => (mm * 72) / 25.4;
  const lh = 1.15 * o.line; // dòng đơn của Times New Roman ≈ 1,15 cỡ chữ
  const P = (text, s, st = {}) => h("div", { class: "vb-p", style: Object.assign({ fontSize: s + "px", lineHeight: (st.lh || 1.15) }, st.css) },
    Array.isArray(text) ? text.map((r) => (r.b || r.i ? h(r.b ? "b" : "i", { text: r.t, style: r.b && r.i ? { fontStyle: "italic" } : null }) : r.t)) : text);
  const rule = (w) => h("div", { class: "vb-rule", style: { width: Math.round(w) + "px" } });
  const c = { textAlign: "center" };
  const maxW = (ts, s) => Math.max(0, ...ts.map((t) => measure(t, s, true)));
  const coQuan = m.head.coQuan.length ? m.head.coQuan : [DOTS];
  const head = h("div", { class: "vb-head", style: { gridTemplateColumns: `${L.head[0]}px ${L.head[1]}px` } },
    h("div", null, ...m.head.chuQuan.map((t) => P(t, sz.coQuan, { css: c })), ...coQuan.map((t) => P([{ t, b: true }], sz.coQuan, { css: c })), rule(Math.min(L.head[0], maxW(coQuan, sz.coQuan)) * 0.4)),
    h("div", null, P([{ t: spec.quocHieu, b: true }], sz.quocHieu, { css: c }), P([{ t: spec.tieuNgu, b: true }], sz.tieuNgu, { css: c }), rule(measure(spec.tieuNgu, sz.tieuNgu, true))),
    h("div", null, P(m.head.so, sz.so, { css: { ...c, marginTop: "6px", whiteSpace: "pre-wrap" } }), m.head.vv ? P(m.head.vv, sz.vv, { css: { ...c, marginTop: "6px" } }) : ""),
    h("div", null, P([{ t: m.head.ngay, i: true }], sz.diaDanh, { css: { ...c, marginTop: "6px", whiteSpace: "pre-wrap" } })));
  const body = [];
  if (m.title) {
    body.push(P([{ t: m.title.tenLoai, b: true }], sz.tenLoai, { css: { ...c, marginTop: "18px" } }));
    if (m.title.trichYeu) body.push(P([{ t: m.title.trichYeu, b: true }], sz.trichYeu, { css: c }));
    body.push(rule(Math.min(L.width, measure(m.title.trichYeu || m.title.tenLoai, sz.trichYeu, true)) * 0.4));
  }
  m.body.forEach((b, i) => {
    if (b.kg) {
      const mt = (i === 0 ? 12 : 6) + "px";
      if (b.kg.single || !b.kg.items.length) body.push(P("Kính gửi: " + (b.kg.single || DOTS), b.size, { lh, css: { ...c, marginTop: mt, marginBottom: "6px" } }));
      else {
        const k = kinhGuiLayout(b.kg.items, b.size, L.width);
        body.push(P("Kính gửi:", b.size, { lh, css: { paddingLeft: k.left + "px", marginTop: mt } }));
        b.kg.items.forEach((t, j) => body.push(P(t, b.size, { lh, css: { paddingLeft: k.items + "px", marginBottom: j === b.kg.items.length - 1 ? "6px" : 0 } })));
      }
      return;
    }
    body.push(P(b.runs, sz.body, { lh, css: { textAlign: b.align === "center" ? "center" : "justify", textIndent: b.indent ? pt(o.indent) + "px" : 0, marginTop: Math.max(i === 0 && !m.title ? 12 : 0, b.before || 0) + "px", marginBottom: (b.after ?? spec.paraSpacing) + "px" } }));
  });
  const sign = h("div", { class: "vb-sign", style: { gridTemplateColumns: `${L.sign[0]}px ${L.sign[1]}px` } },
    h("div", null, P([{ t: "Nơi nhận:", b: true, i: true }], sz.noiNhanTieuDe), ...m.noiNhan.map((t) => P(t, sz.noiNhan))),
    h("div", null, ...m.sign.lines.map((t) => P([{ t, b: true }], sz.chucVu, { css: c })), P([{ t: m.sign.ten || DOTS, b: true }], sz.ten, { css: { ...c, marginTop: "72px" } })));
  const foot = m.diaChi.length ? h("div", { class: "vb-addr" }, ...m.diaChi.map((t) => P(t, sz.diaChi))) : "";
  return h("div", { class: "vb-page", style: { padding: `${pt(o.margins.top)}px ${pt(o.margins.right)}px ${pt(o.margins.bottom)}px ${pt(o.margins.left)}px`, fontFamily: FONT } },
    head, ...body, sign, foot);
}
// đo bằng canvas với đúng font đang hiện (máy không có Times New Roman thì đường kẻ khớp font thay thế)
const ctx2d = document.createElement("canvas").getContext("2d");
function measure(t, size, bold) { ctx2d.font = `${bold ? "bold " : ""}${size}px ${FONT}`; return ctx2d.measureText(t).width; }

/** Thu nhỏ trang giấy 595 px cho vừa khung xem trước */
let real = false; // "Xem cỡ thật": không thu nhỏ, cuộn ngang trong khung
function fitPaper(wrap) {
  const page = wrap.firstElementChild;
  const fit = () => {
    const s = real ? 1 : Math.min(1, wrap.clientWidth / 595.28);
    wrap.classList.toggle("real", real && wrap.clientWidth < 595);
    page.style.transform = `scale(${s})`;
    wrap.style.height = Math.ceil(page.offsetHeight * s) + "px";
  };
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);
}

/* ---------- kiểm tra thường gặp ---------- */
function checks(v) {
  const t = typeOf(v), out = [];
  if (!v.coQuan.trim()) out.push("Chưa nhập tên cơ quan, tổ chức ban hành.");
  if (!v.cqVT.trim()) out.push("Chưa nhập chữ viết tắt tên cơ quan: ký hiệu văn bản đang thiếu.");
  if (isCV(v) && !v.dvVT.trim()) out.push("Công văn cần chữ viết tắt tên đơn vị soạn thảo trong ký hiệu (ví dụ UBND-VP).");
  if (!v.diaDanh.trim()) out.push("Chưa nhập địa danh (tên đơn vị hành chính nơi cơ quan đóng trụ sở).");
  if (t.trichYeu !== false && !v.trichYeu.trim()) out.push("Chưa nhập trích yếu nội dung.");
  if ((t.mau === "qd" || t.mau === "nq") && !v.thamQuyen.trim()) out.push("Chưa nhập thẩm quyền ban hành (ví dụ: CHỦ TỊCH ỦY BAN NHÂN DÂN XÃ …).");
  if (t.mau === "qd" && !v.canCu.trim()) out.push("Quyết định thường có các căn cứ ban hành.");
  if (isCV(v) && !v.kinhGui.trim()) out.push("Công văn cần ghi nơi nhận ở phần “Kính gửi”.");
  if (!v.noiDung.trim()) out.push("Chưa có nội dung văn bản.");
  if (!v.chucVu.trim() || !v.ten.trim()) out.push("Chưa nhập đủ chức vụ và họ tên người ký.");
  if (v.quyen && v.quyen !== "Q." && !v.dau.trim()) out.push(v.quyen === "TM." ? "Ký “TM.” cần tên tập thể hoặc cơ quan (ví dụ ỦY BAN NHÂN DÂN)." : `Ký “${v.quyen}” cần chức vụ của người đứng đầu (ví dụ GIÁM ĐỐC).`);
  if (/^(GS|PGS|TS|ThS|KS|BS|CN|LS)\.?\s/i.test(v.ten.trim())) out.push("Không ghi học hàm, học vị trước họ tên người ký (Phụ lục I, NĐ 30/2020).");
  return out;
}

/* ---------- form ---------- */
const opts = (v) => ({ margins: { top: +v.mTop, bottom: +v.mBottom, left: +v.mLeft, right: +v.mRight }, line: +v.line, indent: +v.indent });
const saveLocal = debounce((v) => store.set(KEY, v), 400);
let last = null; // { v, m } của lần vẽ gần nhất, để tải về
async function download() {
  if (!last) return;
  const { v, m } = last;
  const o = opts(v);
  const parts = docxParts(m, spec, { ...o, title: m.title ? [m.title.tenLoai, m.title.trichYeu].filter(Boolean).join(" ") : m.head.vv });
  const JSZip = await lib("jszip");
  const z = new JSZip();
  for (const [name, data] of Object.entries(parts)) z.file(name, data, { createFolders: false }); // không ghi mục thư mục rỗng
  const blob = await z.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const name = [slugify(typeOf(v).name), slugify(v.trichYeu, { max: 50 })].filter(Boolean).join("-");
  save(blob, name + ".docx");
}

const api = formTool({
  share: false,
  fields: [
    { id: "type", type: "select", label: "Loại văn bản", value: "cong-van", choices: spec.types.map((t) => [t.id, t.name + (t.abbr ? ` (${t.abbr})` : "")]) },
    sec("Cơ quan ban hành"),
    { id: "chuQuan", type: "textarea", label: "Cơ quan, tổ chức chủ quản trực tiếp (nếu có)", placeholder: "UBND TỈNH BẮC NINH", hint: "Được viết tắt cụm từ thông dụng (UBND, HĐND). Bỏ trống nếu không có.", attrs: { rows: 1 } },
    { id: "coQuan", type: "textarea", label: "Tên cơ quan, tổ chức ban hành", placeholder: "SỞ NỘI VỤ", hint: "Tên chính thức, đầy đủ; tự in hoa. Xuống dòng để chia thành nhiều dòng.", attrs: { rows: 2 } },
    { id: "cqVT", label: "Chữ viết tắt tên cơ quan (trong ký hiệu)", placeholder: "SNV", attrs: { autocapitalize: "characters", spellcheck: "false" } },
    { id: "dvVT", label: "Chữ viết tắt đơn vị soạn thảo", placeholder: "VP", hint: "Dùng trong ký hiệu công văn (SNV-VP) và dòng “Lưu: VT, VP.” ở nơi nhận.", attrs: { autocapitalize: "characters", spellcheck: "false" } },
    sec("Số, ngày ban hành"),
    { id: "so", label: "Số văn bản", placeholder: "Để trống", hint: "Để trống để Văn thư cấp số khi đăng ký; số nhỏ hơn 10 tự thêm số 0.", attrs: { inputmode: "numeric" } },
    { id: "diaDanh", label: "Địa danh", placeholder: "Bắc Ninh", hint: "Cơ quan trung ương: tên tỉnh, thành phố nơi đóng trụ sở. Cơ quan địa phương: tên đơn vị hành chính nơi đóng trụ sở." },
    { id: "ngay", type: "date", label: "Ngày ban hành", value: today(), hint: "Xoá trống để chừa chỗ điền tay khi ký." },
    sec("Nội dung"),
    { id: "trichYeu", type: "textarea", label: "Trích yếu nội dung", placeholder: "Về việc …", hint: "Công văn: in sau chữ “V/v” dưới số, ký hiệu.", attrs: { rows: 2 }, show: (v) => typeOf(v).trichYeu !== false },
    { id: "thamQuyen", label: "Thẩm quyền ban hành", placeholder: "Chủ tịch Ủy ban nhân dân xã An Bình", hint: "Chức vụ người đứng đầu; hoặc tên tập thể, cơ quan nếu thẩm quyền thuộc tập thể. Tự in hoa.", show: (v) => mau(v) === "qd" || mau(v) === "nq" },
    { id: "kinhGui", type: "textarea", label: "Kính gửi (mỗi nơi một dòng)", placeholder: "Bộ Nội vụ", hint: "Một nơi: in cùng dòng với “Kính gửi:”. Nhiều nơi: mỗi nơi một dòng có gạch đầu dòng, tự thêm dấu ; và dấu . cuối.", attrs: { rows: 2 }, show: hasKG },
    { id: "canCu", type: "textarea", label: "Căn cứ ban hành (mỗi căn cứ một dòng)", placeholder: "Căn cứ Luật Tổ chức chính quyền địa phương ngày 16 tháng 6 năm 2025", hint: "In nghiêng; tự thêm dấu ; cuối mỗi dòng và dấu . ở dòng cuối.", attrs: { rows: 3 }, show: (v) => !isCV(v) },
    { id: "deNghi", label: "Theo đề nghị của", placeholder: "Chánh Văn phòng", show: (v) => mau(v) === "qd" },
    { id: "noiDung", type: "textarea", label: "Nội dung văn bản", placeholder: "Mỗi đoạn một dòng.", hint: "Mỗi dòng là một đoạn (lùi đầu dòng, canh đều hai lề). “Chương I”, “Mục 1” + dòng in hoa: tiêu đề canh giữa. “Điều 1.” tự in đậm. Viết **chữ đậm**, *chữ nghiêng*.", attrs: { rows: 10 } },
    { id: "ket", type: "check", label: "Kết thúc nội dung bằng dấu “/.”", value: true },
    sec("Người ký"),
    { id: "quyen", type: "select", label: "Quyền hạn ký", value: "", choices: spec.quyenHan },
    { id: "dau", label: "Tập thể (TM.) hoặc chức vụ người đứng đầu (KT., TL., TUQ.)", placeholder: "Ủy ban nhân dân / Giám đốc", show: (v) => v.quyen && v.quyen !== "Q." },
    { id: "chucVu", label: "Chức vụ của người ký", placeholder: "Phó Giám đốc" },
    { id: "ten", label: "Họ và tên người ký", placeholder: "Nguyễn Văn An", hint: "Không ghi học hàm, học vị trước họ tên." },
    sec("Nơi nhận"),
    { id: "noiNhan", type: "textarea", label: "Nơi nhận (mỗi nơi một dòng)", placeholder: "Như Điều 3\nSở Tài chính", hint: "“Như trên” (khi có Kính gửi) và dòng “Lưu: VT, …” được thêm tự động.", attrs: { rows: 3 } },
    { id: "nguoiSoan", label: "Ký hiệu người soạn thảo, số bản phát hành (tuỳ chọn)", placeholder: "NVA(05)", hint: "In cuối dòng “Lưu”." },
    { id: "diaChi", type: "textarea", label: "Địa chỉ, điện thoại, thư điện tử của cơ quan (tuỳ chọn)", hint: "In ở cuối trang đầu, dưới đường kẻ ngang.", attrs: { rows: 2 }, show: isCV },
    sec("Trình bày"),
    { id: "size", type: "seg", label: "Cỡ chữ", value: "14", choices: [["14", "14 (Quốc hiệu 13)"], ["13", "13 (Quốc hiệu 12)"]], hint: spec.sizesNote },
    { id: "line", type: "select", label: "Giãn dòng", value: "1.15", choices: [["1", "Dòng đơn"], ["1.15", "1,15"], ["1.3", "1,3"], ["1.5", "1,5 (tối đa)"]] },
    { id: "indent", type: "seg", label: "Lùi đầu dòng", value: "12.7", choices: [["10", "1 cm"], ["12.7", "1,27 cm"]] },
    { id: "mTop", type: "select", label: "Lề trên", value: "20", choices: range(spec.margins.top) },
    { id: "mBottom", type: "select", label: "Lề dưới", value: "20", choices: range(spec.margins.bottom) },
    { id: "mLeft", type: "select", label: "Lề trái", value: "30", choices: range(spec.margins.left) },
    { id: "mRight", type: "select", label: "Lề phải", value: "15", choices: range(spec.margins.right) }
  ].map((f) => ({ ...f, url: false })),
  init(api) {
    const s = store.get(KEY, null);
    if (s) for (const [k, v] of Object.entries(s)) if (api.ctrls[k] && k !== "ngay") api.ctrls[k].set(v);
  },
  compute(v, out) {
    saveLocal(v);
    const m = docModel({ ...v, luu: v.dvVT }, spec);
    last = { v, m };
    out.textContent = "";
    const warn = checks(v);
    const wrap = h("div", { class: "vb-wrap" }, paper(m, opts(v)));
    out.append(
      h("div", { class: "row vb-acts" },
        h("button", { class: "btn", type: "button", onclick: async (e) => {
          const b = e.currentTarget; b.disabled = true;
          try { await download(); } catch (err) { console.error(err); toast("Không tạo được file Word. Hãy kiểm tra kết nối mạng rồi thử lại.", { type: "err" }); }
          b.disabled = false;
        } }, h("span", { html: icon("download"), style: { display: "contents" } }), "Tải file Word (.docx)"),
        h("button", { class: "btn ghost", type: "button", title: "Điền nội dung mẫu cho loại văn bản đang chọn", onclick: fillSample }, h("span", { html: icon("wand-sparkles"), style: { display: "contents" } }), "Điền mẫu"),
        h("button", { class: "btn ghost vb-zoom", type: "button", "aria-pressed": String(real), onclick: () => { real = !real; api.update(); } }, h("span", { html: icon(real ? "zoom-out" : "zoom-in"), style: { display: "contents" } }), real ? "Thu nhỏ" : "Xem cỡ thật")),
      warn.length ? h("details", { class: "vb-warn" }, h("summary", { text: `Cần xem lại (${warn.length})` }), h("ul", null, warn.map((t) => h("li", { text: t })))) : "",
      wrap,
      h("p", { class: "hint", text: "Xem trước gần đúng: ngắt trang, số trang (từ trang 2, giữa lề trên) do Word sắp xếp. File dùng phông Times New Roman, khổ A4; mở bằng Microsoft Word, LibreOffice, WPS hoặc Google Tài liệu để sửa tiếp, ký số." }));
    requestIdle(() => fitPaper(wrap));
  }
});
function requestIdle(fn) { setTimeout(fn, 0); }
function fillSample() {
  const id = api.get("type");
  const s = { ...BLANK, ...ORG, ...(SAMPLES[id] || GENERIC) };
  for (const [k, x] of Object.entries(s)) if (api.ctrls[k]) api.ctrls[k].set(x);
  api.update();
  toast("Đã điền nội dung mẫu cho " + typeOf({ type: id }).name.toLowerCase());
}

const css = document.createElement("style");
css.textContent = `
.vb-sec{margin:10px 0 -4px;padding-top:12px;border-top:1px solid var(--line)}
.vb-acts{gap:8px}
.vb-warn{border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:var(--warn-soft);color:var(--warn);font-size:14px}
.vb-warn summary{cursor:pointer;font-weight:600}
.vb-warn ul{margin:8px 0 0;padding-left:20px;color:var(--ink)}
.vb-warn li+li{margin-top:4px}
.vb-wrap{position:relative;overflow:hidden;border-radius:6px;box-shadow:var(--shadow);background:#fff}
.vb-wrap.real{overflow-x:auto}
@media (min-width:900px){.vb-zoom{display:none}}
.vb-page{width:595.28px;min-height:841.89px;box-sizing:border-box;background:#fff;color:#000;transform-origin:0 0;position:absolute;left:0;top:0}
.vb-p{margin:0;overflow-wrap:anywhere}
.vb-p b,.vb-p i{font:inherit}.vb-p b{font-weight:700}.vb-p i{font-style:italic}
.vb-head,.vb-sign{display:grid;align-items:start}
.vb-head>div:nth-child(n+3){align-self:start}
.vb-rule{border-top:.75px solid #000;margin:3px auto 0}
.vb-sign{margin-top:6px}
.vb-addr{margin-top:28px;border-top:.75px solid #000;padding-top:2px}
`;
document.head.append(css);
