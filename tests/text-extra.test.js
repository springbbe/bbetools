import { test } from "node:test";
import assert from "node:assert/strict";
import { fancy, STYLES } from "../assets/lib/fancy-text.js";
import { lorem, rng } from "../assets/lib/lorem.js";
import { searchStatus, STATUSES } from "../assets/lib/http-status.js";
import { minifyHtml, compactSql, detectLang } from "../assets/lib/minify.js";
import { runRegex, splitLiteral, explainError, groupNames } from "../assets/lib/regex.js";
import { gradient, boxShadow, borderRadius, withAlpha } from "../assets/lib/css-gen.js";

test("chữ kiểu nghệ thuật", () => {
  assert.equal(fancy("Abc 1", "bold"), "𝐀𝐛𝐜 𝟏");
  assert.equal(fancy("hello", "italic"), "ℎ𝑒𝑙𝑙𝑜");
  assert.equal(fancy("BE", "script"), "ℬℰ");
  assert.equal(fancy("Việt", "bold").normalize("NFD").replace(/[̀-ͯ]/g, ""), "𝐕𝐢𝐞𝐭");
  assert.equal(fancy("đi", "bold"), "đ𝐢");
  assert.equal(fancy("ab", "upsideDown"), "qɐ");
  assert.equal(fancy("hi", "fullwidth"), "ｈｉ");
  assert.equal(fancy("ab", "strike"), "a̶b̶");
  for (const [s] of STYLES) assert.ok(fancy("Xin chào 2026", s).length > 0, s);
});

test("lorem tiếng Việt", () => {
  const p = lorem("p", 3, 42);
  assert.equal(p.length, 3);
  assert.deepEqual(lorem("p", 3, 42), p);
  assert.notDeepEqual(lorem("p", 3, 43), p);
  assert.match(p[0], /^\p{Lu}/u);
  assert.match(p[0], /[.!?]$/);
  assert.equal(lorem("w", 50, 1)[0].split(" ").length, 50);
  assert.ok(rng(1)() < 1);
});

test("mã trạng thái HTTP", () => {
  assert.equal(searchStatus("404")[0].vi, "Không tìm thấy");
  assert.ok(searchStatus("4xx").every((s) => s.cls === 4));
  assert.equal(searchStatus("khong tim thay")[0].code, 404);
  assert.ok(searchStatus("timeout").some((s) => s.code === 504));
  assert.ok(STATUSES.length > 60);
});

test("rút gọn HTML, SQL", async () => {
  const html = `<!DOCTYPE html>\n<html>\n  <head>\n    <!-- chú thích -->\n    <title>  Xin   chào </title>\n    <style>\n body { color: red; }\n</style>\n  </head>\n  <body>\n    <p class="a"   id = "b">Một   hai\n ba</p>\n    <pre>  giữ\n  nguyên </pre>\n    <script>\n  var  x = 1;\n</script>\n  </body>\n</html>`;
  const r = await minifyHtml(html, { minifyCss: (s) => s.replace(/\s+/g, "").replace(/;}/, "}"), minifyJs: (s) => s.trim().replace(/\s+/g, " ") });
  assert.equal(r, `<!DOCTYPE html><html><head><title>Xin chào</title><style>body{color:red}</style></head><body><p class="a" id="b">Một hai ba</p><pre>  giữ\n  nguyên </pre><script>var x = 1;</script></body></html>`);
  assert.equal(compactSql("SELECT  a ,b -- chú thích\nFROM t\nWHERE x = 'a  b' /* c */ AND y<>1"), "SELECT a, b FROM t WHERE x = 'a  b' AND y<>1");
  assert.equal(compactSql("select count( * ) from t where id in ( 1 , 2 );"), "select count(*) from t where id in(1, 2);");
  assert.equal(detectLang("<div>a</div>"), "html");
  assert.equal(detectLang(".a { color: red }"), "css");
  assert.equal(detectLang("const a = () => 1;"), "js");
  assert.equal(detectLang('{"a":1}'), "json");
});

test("regex", () => {
  assert.deepEqual(splitLiteral("/a+b/gi"), { source: "a+b", flags: "gi" });
  assert.deepEqual(splitLiteral("a/b", "g"), { source: "a/b", flags: "g" });
  const r = runRegex("(?<ngay>\\d{2})/(\\d{2})", "g", "Hạn 21/10 và 01/11");
  assert.equal(r.matches.length, 2);
  assert.deepEqual(r.matches[1].groups.map((g) => [g.name, g.value]), [["ngay", "01"], [null, "11"]]);
  assert.equal(r.matches[0].index, 4);
  assert.equal(runRegex("x*", "g", "ab").matches.length, 3);
  assert.equal(runRegex("a", "", "aaa").matches.length, 1);
  assert.deepEqual(groupNames("(a)(?:b)(?<c>d)[(]\\(e(?=f)"), [null, "c"]);
  let err; try { new RegExp("(a"); } catch (e) { err = e; }
  assert.equal(explainError(err), "Thiếu dấu “)” đóng nhóm.");
});

test("CSS gradient, shadow, radius", () => {
  assert.equal(gradient({ type: "linear", angle: 90, stops: [{ color: "#ff0000", pos: 0 }, { color: "#0000ff", pos: 100 }] }), "linear-gradient(90deg, #ff0000, #0000ff)");
  assert.equal(gradient({ type: "radial", stops: [{ color: "red", pos: 10 }, { color: "blue", pos: 100 }] }), "radial-gradient(circle, red 10%, blue)");
  assert.equal(gradient({ type: "conic", angle: 45, stops: [{ color: "red", pos: 0 }, { color: "blue", pos: 100 }] }), "conic-gradient(from 45deg, red, blue)");
  assert.equal(boxShadow([{ x: 0, y: 4, blur: 12, spread: 0, color: "#000000", alpha: 0.25 }]), "0px 4px 12px rgb(0 0 0 / 25%)");
  assert.equal(boxShadow([{ x: 1, y: 1, blur: 0, spread: 2, color: "#3E63DD", alpha: 1, inset: true }]), "inset 1px 1px 0px 2px #3e63dd");
  assert.equal(borderRadius([8, 8, 8, 8]), "8px");
  assert.equal(borderRadius([8, 0, 8, 0]), "8px 0");
  assert.equal(borderRadius([1, 2, 3, 4], "%"), "1% 2% 3% 4%");
  assert.equal(withAlpha("#ffffff", 0.5), "rgb(255 255 255 / 50%)");
});
