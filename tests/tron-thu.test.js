import { test } from "node:test";
import assert from "node:assert/strict";
import { findFields, lookup, fillText, fillXml, xmlFields, xmlText, mergeFieldName, combineDocuments, wrapText, decodeXml, encodeXml } from "../assets/lib/tron-thu.js";

const head = ["Họ tên", "Chức vụ", "Ngày_sinh", "Ghi chú"];
const row = ["Nguyễn Văn An", "Trưởng phòng", "01/02/1990", ""];
const get = lookup(head, row);

test("trường trong văn bản", () => {
  assert.deepEqual(findFields("Kính gửi {{ Họ tên }}, «Chức vụ». {{ho ten}} {{Lạ}}"), ["Họ tên", "Chức vụ", "Lạ"]);
  assert.equal(get("ho ten"), "Nguyễn Văn An");
  assert.equal(get("Ngày sinh"), "01/02/1990");
  assert.equal(get("Ghi chú"), "");
  assert.equal(get("Không có"), undefined);
  assert.deepEqual(fillText("Kính gửi {{Họ tên}} ({{Chức vụ}}){{Ghi chú}} – {{Lạ}}", get), { text: "Kính gửi Nguyễn Văn An (Trưởng phòng) – {{Lạ}}", missing: ["Lạ"] });
});

test("mã MERGEFIELD", () => {
  assert.equal(mergeFieldName(' MERGEFIELD "Họ tên" \\* MERGEFORMAT '), "Họ tên");
  assert.equal(mergeFieldName(" MERGEFIELD Chuc_vu "), "Chuc_vu");
  assert.equal(mergeFieldName(" PAGE "), null);
});

const W = (body) => `<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${body}<w:sectPr><w:pgSz w:w="11906"/></w:sectPr></w:body></w:document>`;

test("điền trường bị Word cắt thành nhiều run", () => {
  const xml = W('<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kính gửi {{Họ </w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>tên</w:t></w:r><w:r><w:t xml:space="preserve">}}, chức vụ {{Chức vụ}}.</w:t></w:r></w:p><w:p><w:r><w:t>{{Họ</w:t></w:r></w:p><w:p><w:r><w:t>tên}}</w:t></w:r></w:p>');
  assert.deepEqual(xmlFields(xml), ["Họ tên", "Chức vụ"]);
  const r = fillXml(xml, get);
  assert.deepEqual(r.missing, []);
  assert.equal(xmlText(r.xml), "Kính gửi Nguyễn Văn An, chức vụ Trưởng phòng.\n{{Họ\ntên}}");
  // run đầu giữ định dạng in đậm, chứa cả giá trị
  assert.match(r.xml, /<w:b\/><\/w:rPr><w:t xml:space="preserve">Kính gửi Nguyễn Văn An<\/w:t>/);
});

test("giá trị có ký tự đặc biệt, xuống dòng", () => {
  const xml = W("<w:p><w:r><w:t>A {{X}} B &amp; C</w:t></w:r></w:p>");
  const r = fillXml(xml, (n) => (n === "X" ? 'Cty <TNHH> & "Con"\nDòng 2' : undefined));
  assert.match(r.xml, /A Cty &lt;TNHH&gt; &amp; &quot;Con&quot;<\/w:t><w:br\/><w:t xml:space="preserve">Dòng 2 B &amp; C/);
  assert.equal(xmlText(r.xml), 'A Cty <TNHH> & "Con"\nDòng 2 B & C');
  const miss = fillXml(xml, () => undefined);
  assert.equal(miss.xml, xml);
  assert.deepEqual(miss.missing, ["X"]);
});

test("điền MERGEFIELD dạng đơn giản và dạng phức", () => {
  const simple = '<w:p><w:fldSimple w:instr=" MERGEFIELD Họ_tên "><w:r><w:rPr><w:i/></w:rPr><w:t>«Họ_tên»</w:t></w:r></w:fldSimple></w:p>';
  const complex = '<w:p><w:r><w:t xml:space="preserve">Chức vụ: </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> MERGEFIELD </w:instrText></w:r><w:r><w:instrText>"Chức vụ"</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:u/></w:rPr><w:t>«Chức vụ»</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t>.</w:t></w:r></w:p>';
  const page = '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
  const xml = W(simple + complex + page);
  assert.deepEqual(xmlFields(xml), ["Họ_tên", "Chức vụ"]);
  const r = fillXml(xml, get);
  assert.equal(xmlText(r.xml), "Nguyễn Văn An\nChức vụ: Trưởng phòng.");
  assert.match(r.xml, /<w:r><w:rPr><w:i\/><\/w:rPr><w:t xml:space="preserve">Nguyễn Văn An<\/w:t><\/w:r>/);
  assert.match(r.xml, /<w:r><w:rPr><w:u\/><\/w:rPr><w:t xml:space="preserve">Trưởng phòng<\/w:t><\/w:r><w:r><w:t>\.<\/w:t>/);
  assert.match(r.xml, /PAGE/); // trường khác giữ nguyên
  assert.doesNotMatch(r.xml, /MERGEFIELD/);
});

test("gộp nhiều bản vào một file", () => {
  const a = W('<w:p><w:bookmarkStart w:id="0" w:name="x"/><w:r><w:t>Bản 1</w:t></w:r><w:bookmarkEnd w:id="0"/></w:p><w:p><w:r><w:drawing><wp:docPr id="7" name="Logo"/></w:drawing></w:r></w:p>');
  const b = a.replace("Bản 1", "Bản 2");
  const c = combineDocuments([a, b]);
  assert.equal(xmlText(c), "Bản 1\n\nBản 2");
  assert.equal((c.match(/<w:sectPr>/g) || []).length, 1);
  assert.equal((c.match(/<w:br w:type="page"\/>/g) || []).length, 1);
  assert.ok(c.endsWith("<w:sectPr><w:pgSz w:w=\"11906\"/></w:sectPr></w:body></w:document>"));
  assert.doesNotMatch(c, /bookmark/);
  assert.deepEqual([...c.matchAll(/docPr id="(\d+)"/g)].map((m) => m[1]), ["1", "2"]);
});

test("mã hoá XML, ngắt dòng", () => {
  assert.equal(decodeXml("&lt;a&gt; &amp;amp; &#273; &#x110;"), "<a> &amp; đ Đ");
  assert.equal(encodeXml("a\u0001<b>"), "a&lt;b&gt;");
  const m = (s) => s.length;
  assert.deepEqual(wrapText("một hai ba bốn năm", 7, m), ["một hai", "ba bốn", "năm"]);
  assert.deepEqual(wrapText("abcdefghij xy", 4, m), ["abcd", "efgh", "ij", "xy"]);
  assert.deepEqual(wrapText("", 10, m), [""]);
});
