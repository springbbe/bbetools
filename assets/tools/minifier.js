/* Nén JS/CSS/HTML: rút gọn JavaScript (Terser), CSS (CSSO), HTML (gom khoảng trắng, nén script/style bên trong), JSON */
import { lib, fmtSize } from "../core.js";
import { textTool } from "../frames/text.js";
import { detectLang, minifyHtml } from "../lib/minify.js";

const SAMPLES = {
  js: "// Tính tổng tiền giỏ hàng\nfunction tinhTongTien(gioHang, giamGia = 0) {\n  let tong = 0;\n  for (const sanPham of gioHang) {\n    tong += sanPham.gia * sanPham.soLuong;\n  }\n  // áp dụng mã giảm giá\n  const thanhTien = tong * (1 - giamGia / 100);\n  return Math.round(thanhTien);\n}\n\nconsole.log(tinhTongTien([{ gia: 150000, soLuong: 2 }, { gia: 99000, soLuong: 1 }], 10));\n",
  css: "/* Nút bấm chính */\n.nut-chinh {\n  display: inline-flex;\n  padding: 10px 16px;\n  background-color: #3e5bf2;\n  color: #ffffff;\n  border-radius: 12px;\n  margin: 0px 0px 0px 0px;\n}\n\n.nut-chinh:hover {\n  background-color: #2d48d6;\n}\n",
  html: "<!DOCTYPE html>\n<html lang=\"vi\">\n  <head>\n    <!-- Trang giới thiệu -->\n    <title>Xin chào</title>\n    <style>\n      body { font-family: sans-serif; margin: 0px; }\n    </style>\n  </head>\n  <body>\n    <h1>  Xin chào   các bạn  </h1>\n    <p>\n      Đây là trang mẫu.\n    </p>\n    <script>\n      const loiChao = \"Xin chào\";\n      console.log( loiChao );\n    </script>\n  </body>\n</html>\n"
};

async function minJs(src) {
  const T = await lib("terser");
  const r = await T.minify(src, { compress: { passes: 2 }, mangle: true, format: { comments: /^!|@license|@preserve/ } });
  return r.code;
}
async function minCss(src) {
  const c = await lib("csso");
  return c.minify(src).css;
}

textTool({
  mono: true,
  inputLabel: "Mã nguồn",
  outputLabel: "Đã rút gọn",
  placeholder: "Dán mã JavaScript, CSS hoặc HTML…",
  sample: (o) => SAMPLES[o.lang === "auto" || o.lang === "json" ? "js" : o.lang],
  options: [{ id: "lang", label: "Ngôn ngữ", value: "auto", choices: [["auto", "Tự nhận"], ["js", "JavaScript"], ["css", "CSS"], ["html", "HTML"], ["json", "JSON"]] }],
  download: { name: (o) => "da-nen." + (o.lang === "auto" ? "txt" : o.lang), type: "text/plain" },
  async transform(text, o) {
    if (!text.trim()) return { text: "" };
    const lang = o.lang === "auto" ? detectLang(text) : o.lang;
    let res;
    try {
      if (lang === "js") res = await minJs(text);
      else if (lang === "css") res = await minCss(text);
      else if (lang === "json") res = JSON.stringify(JSON.parse(text));
      else res = await minifyHtml(text, { minifyJs: minJs, minifyCss: minCss });
    } catch (e) {
      if (e.userMsg) throw e;
      const where = e.line ? ` (dòng ${e.line}, cột ${(e.col ?? 0) + 1})` : "";
      return { text: "", error: `Mã ${lang.toUpperCase()} có lỗi cú pháp${where}: ${e.message}` };
    }
    const a = new TextEncoder().encode(text).length, b = new TextEncoder().encode(res).length;
    return { text: res, info: `${lang.toUpperCase()}${o.lang === "auto" ? " (tự nhận)" : ""}: ${fmtSize(a)} → ${fmtSize(b)}, giảm ${a ? Math.round((1 - b / a) * 100) : 0}%` };
  }
});
